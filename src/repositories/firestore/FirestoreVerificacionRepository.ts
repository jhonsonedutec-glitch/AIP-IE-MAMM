import {
  collection,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  writeBatch,
} from 'firebase/firestore';
import { db, auth } from '@/config/firebase';
import { VerificacionInventario } from '@/types';
import { IVerificacionRepository, OperadorInfo } from '../interfaces';
import { auditoriaRepository } from './FirestoreAuditoriaRepository';

function limpiarUndefined<T extends Record<string, any>>(obj: T): T {
  const limpio: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      limpio[key] = value;
    }
  }
  return limpio as T;
}

export class FirestoreVerificacionRepository implements IVerificacionRepository {
  private colRef = collection(db, 'verificaciones_inventario');

  /**
   * Lista todas las actas de verificación física ordenadas de más reciente a más antigua
   * Ordenamiento en memoria para no requerir índices compuestos en Firestore.
   */
  async listar(): Promise<VerificacionInventario[]> {
    const snap = await getDocs(this.colRef);
    const lista = snap.docs.map((d) => this.mapDocToVerificacion(d.id, d.data()));

    return lista.sort((a, b) => {
      const timeA = new Date(a.fecha_cierre || a.fecha_inicio).getTime() || 0;
      const timeB = new Date(b.fecha_cierre || b.fecha_inicio).getTime() || 0;
      return timeB - timeA;
    });
  }

  /**
   * Obtiene una verificación específica por su ID de documento
   */
  async obtenerPorId(id: string): Promise<VerificacionInventario | null> {
    const docSnap = await getDoc(doc(this.colRef, id));
    if (!docSnap.exists()) return null;
    return this.mapDocToVerificacion(docSnap.id, docSnap.data());
  }

  /**
   * Registra una nueva verificación física inmutable con código correlativo
   */
  async registrarVerificacion(
    datos: Omit<VerificacionInventario, 'id' | 'codigo_acta'>,
    operador?: OperadorInfo
  ): Promise<{ id: string; codigo_acta: string }> {
    const hoyStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const rand = Math.floor(1000 + Math.random() * 9000);
    const codigoActa = `VER-${hoyStr}-${rand}`;

    const nuevoDocRef = doc(this.colRef);
    const docData: Record<string, any> = {
      ...datos,
      codigo_acta: codigoActa,
      creado_en: serverTimestamp(),
    };

    const batch = writeBatch(db);
    batch.set(nuevoDocRef, limpiarUndefined(docData));
    await batch.commit();

    const operId = operador?.uid || auth.currentUser?.uid || datos.operador_uid || '';
    const operEmail = operador?.email || auth.currentUser?.email || datos.operador_nombre || '';

    await auditoriaRepository.registrar({
      usuario_id: operId,
      usuario_email: operEmail,
      accion: 'CREATE',
      coleccion: 'verificaciones_inventario',
      documento_id: nuevoDocRef.id,
      detalle: `Toma de inventario y verificación física finalizada: Acta ${codigoActa} | Alcance: ${datos.alcance_ambiente_nombre} | Conformidad: ${datos.porcentaje_conformidad}% (${datos.total_conformes}/${datos.total_esperados} equipos) | Faltantes: ${datos.total_faltantes} | Fuera de ubicación: ${datos.total_fuera_ubicacion}`,
    });

    return { id: nuevoDocRef.id, codigo_acta: codigoActa };
  }

  private mapDocToVerificacion(id: string, data: any): VerificacionInventario {
    const parseFechaStr = (f: any): string => {
      if (!f) return '';
      if (typeof f === 'string') return f;
      if (f.toDate && typeof f.toDate === 'function') {
        return f.toDate().toISOString();
      }
      return '';
    };

    return {
      id,
      codigo_acta: data.codigo_acta || `VER-${id.slice(0, 8)}`,
      fecha_inicio: parseFechaStr(data.fecha_inicio) || data.fecha_inicio || '',
      fecha_cierre: parseFechaStr(data.fecha_cierre) || data.fecha_cierre || '',
      alcance_ambiente_id: data.alcance_ambiente_id || 'TODOS',
      alcance_ambiente_nombre: data.alcance_ambiente_nombre || 'Todos los Ambientes',
      filtro_categoria: data.filtro_categoria || undefined,
      filtro_lote: data.filtro_lote || undefined,
      operador_uid: data.operador_uid || '',
      operador_nombre: data.operador_nombre || '',
      total_esperados: Number(data.total_esperados) || 0,
      total_conformes: Number(data.total_conformes) || 0,
      total_ausentes_justificados: Number(data.total_ausentes_justificados) || 0,
      total_faltantes: Number(data.total_faltantes) || 0,
      total_fuera_ubicacion: Number(data.total_fuera_ubicacion) || 0,
      total_desconocidos: Number(data.total_desconocidos) || 0,
      porcentaje_conformidad: Number(data.porcentaje_conformidad) || 0,
      observaciones_generales: data.observaciones_generales || '',
      items: Array.isArray(data.items) ? data.items : [],
    };
  }
}

export const verificacionRepository = new FirestoreVerificacionRepository();
