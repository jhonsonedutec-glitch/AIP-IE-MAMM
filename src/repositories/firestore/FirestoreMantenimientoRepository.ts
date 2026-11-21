import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  serverTimestamp,
  writeBatch,
} from 'firebase/firestore';
import { db, auth } from '@/config/firebase';
import { MantenimientoRegistro, BienPatrimonial } from '@/types';
import { IMantenimientoRepository, OperadorInfo } from '../interfaces';
import { bienRepository } from './FirestoreBienRepository';
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

export class FirestoreMantenimientoRepository implements IMantenimientoRepository {
  private colRef = collection(db, 'mantenimientos');
  private bienesColRef = collection(db, 'bienes');

  /**
   * Lista todos los registros de mantenimiento ordenados por fecha de inicio descendente
   */
  async listar(): Promise<MantenimientoRegistro[]> {
    const q = query(this.colRef, orderBy('fecha_inicio', 'desc'));
    const snap = await getDocs(q);
    return snap.docs.map((d) => this.mapDocToMantenimiento(d.id, d.data()));
  }

  /**
   * Lista los registros de mantenimiento vinculados a un bien específico
   */
  async listarPorBien(bienId: string): Promise<MantenimientoRegistro[]> {
    const q = query(this.colRef, where('bien_id', '==', bienId));
    const snap = await getDocs(q);
    const mantenimientos = snap.docs.map((d) => this.mapDocToMantenimiento(d.id, d.data()));
    return mantenimientos.sort((a, b) => {
      const timeA = new Date(a.fecha_inicio).getTime();
      const timeB = new Date(b.fecha_inicio).getTime();
      return timeB - timeA;
    });
  }

  /**
   * Abre una orden de mantenimiento preventivo o correctivo de forma atómica
   */
  async abrirMantenimiento(
    datos: {
      bienId: string;
      tipo: 'PREVENTIVO' | 'CORRECTIVO';
      descripcionFalla: string;
      tecnico: string;
      fechaInicio?: string | Date;
    },
    usuarioOperador?: OperadorInfo
  ): Promise<string> {
    const bien = await bienRepository.obtenerPorId(datos.bienId);
    if (!bien) {
      throw new Error(`El bien con ID ${datos.bienId} no existe en el inventario.`);
    }

    if (bien.estado_operativo === 'DE_BAJA') {
      throw new Error('No se puede enviar a mantenimiento un equipo dado de baja.');
    }

    if (bien.estado_operativo === 'EN_MANTENIMIENTO') {
      throw new Error(
        `El bien "${bien.denominacion}" [${bien.codigo_patrimonial}] ya cuenta con una orden de soporte abierta.`
      );
    }

    const operId = usuarioOperador?.uid || auth.currentUser?.uid || 'SISTEMA';
    const operEmail = usuarioOperador?.email || auth.currentUser?.email || '';

    const batch = writeBatch(db);
    const mantDocRef = doc(this.colRef);
    const bienDocRef = doc(this.bienesColRef, bien.id);

    const docData = limpiarUndefined({
      bien_id: bien.id,
      codigo_patrimonial: bien.codigo_patrimonial,
      etiqueta_interna: bien.etiqueta_interna || '',
      denominacion: bien.denominacion || '',
      marca: bien.marca || '',
      modelo: bien.modelo || '',
      serie: bien.serie || '',
      tipo: datos.tipo,
      descripcion_falla: datos.descripcionFalla.trim(),
      trabajo_realizado: '',
      repuestos: '',
      tecnico: datos.tecnico.trim(),
      fecha_inicio: datos.fechaInicio ? new Date(datos.fechaInicio) : serverTimestamp(),
      estado_conservacion_inicial: bien.estado_conservacion,
      estado_conservacion_resultante: bien.estado_conservacion,
      estado_operativo_resultante: 'EN_MANTENIMIENTO',
      cerrado: false,
      creado_en: serverTimestamp(),
      actualizado_en: serverTimestamp(),
    });

    // 1) Crear registro en mantenimientos
    batch.set(mantDocRef, docData);

    // 2) Actualizar estado operativo del bien a EN_MANTENIMIENTO
    batch.update(bienDocRef, {
      estado_operativo: 'EN_MANTENIMIENTO',
      actualizado_en: serverTimestamp(),
    });

    await batch.commit();

    // 3) Auditoría
    await auditoriaRepository.registrar({
      usuario_id: operId,
      usuario_email: operEmail,
      accion: 'CREATE',
      coleccion: 'mantenimientos',
      documento_id: mantDocRef.id,
      detalle: `Apertura de mantenimiento ${datos.tipo} para bien ${bien.codigo_patrimonial} (${bien.denominacion}). Técnico: ${datos.tecnico}`,
    });

    return mantDocRef.id;
  }

  /**
   * Finaliza y cierra una atención técnica de mantenimiento de forma atómica
   */
  async cerrarMantenimiento(
    mantenimientoId: string,
    cierre: {
      fechaFin?: string | Date;
      trabajoRealizado: string;
      repuestos: string;
      estadoConservacionResultante: BienPatrimonial['estado_conservacion'];
      estadoOperativoResultante: BienPatrimonial['estado_operativo'];
    },
    usuarioOperador?: OperadorInfo
  ): Promise<void> {
    const mantDocRef = doc(this.colRef, mantenimientoId);
    const mantSnap = await getDoc(mantDocRef);
    if (!mantSnap.exists()) {
      throw new Error(`La orden de mantenimiento con ID ${mantenimientoId} no existe.`);
    }

    const mantData = mantSnap.data();
    if (mantData.cerrado) {
      throw new Error('Esta atención de mantenimiento ya se encuentra finalizada y cerrada.');
    }

    const bienDocRef = doc(this.bienesColRef, mantData.bien_id);
    const operId = usuarioOperador?.uid || auth.currentUser?.uid || 'SISTEMA';
    const operEmail = usuarioOperador?.email || auth.currentUser?.email || '';

    const batch = writeBatch(db);

    // 1) Actualizar orden de mantenimiento a FINALIZADO
    batch.update(mantDocRef, {
      cerrado: true,
      fecha_fin: cierre.fechaFin ? new Date(cierre.fechaFin) : serverTimestamp(),
      trabajo_realizado: cierre.trabajoRealizado.trim(),
      repuestos: cierre.repuestos.trim(),
      estado_conservacion_resultante: cierre.estadoConservacionResultante,
      estado_operativo_resultante: cierre.estadoOperativoResultante,
      actualizado_en: serverTimestamp(),
    });

    // 2) Actualizar el bien con el nuevo estado operativo y de conservación
    batch.update(bienDocRef, {
      estado_operativo: cierre.estadoOperativoResultante,
      estado_conservacion: cierre.estadoConservacionResultante,
      actualizado_en: serverTimestamp(),
    });

    await batch.commit();

    // 3) Auditoría
    await auditoriaRepository.registrar({
      usuario_id: operId,
      usuario_email: operEmail,
      accion: 'UPDATE',
      coleccion: 'mantenimientos',
      documento_id: mantenimientoId,
      detalle: `Cierre de mantenimiento ${mantenimientoId} para bien ${mantData.codigo_patrimonial}. Estado resultante: ${cierre.estadoOperativoResultante} [${cierre.estadoConservacionResultante}]`,
    });
  }

  // Métodos retrocompatibles
  async registrar(registro: Omit<MantenimientoRegistro, 'id'>): Promise<string> {
    return this.abrirMantenimiento({
      bienId: registro.bien_id,
      tipo: registro.tipo,
      descripcionFalla: registro.descripcion_falla,
      tecnico: registro.tecnico,
      fechaInicio: registro.fecha_inicio,
    });
  }

  async cerrar(
    id: string,
    fechaFin: string | Date,
    trabajoRealizado: string,
    repuestos: string,
    estadoConservacion: BienPatrimonial['estado_conservacion']
  ): Promise<void> {
    return this.cerrarMantenimiento(id, {
      fechaFin,
      trabajoRealizado,
      repuestos,
      estadoConservacionResultante: estadoConservacion,
      estadoOperativoResultante: 'OPERATIVO',
    });
  }

  private mapDocToMantenimiento(id: string, data: any): MantenimientoRegistro {
    return {
      id,
      bien_id: data.bien_id || '',
      codigo_patrimonial: data.codigo_patrimonial || 'S/C',
      etiqueta_interna: data.etiqueta_interna || '',
      denominacion: data.denominacion || '',
      marca: data.marca || '',
      modelo: data.modelo || '',
      serie: data.serie || '',
      tipo: data.tipo || 'PREVENTIVO',
      descripcion_falla: data.descripcion_falla || '',
      trabajo_realizado: data.trabajo_realizado || '',
      repuestos: data.repuestos || '',
      tecnico: data.tecnico || '',
      fecha_inicio: data.fecha_inicio?.toDate
        ? data.fecha_inicio.toDate().toISOString()
        : data.fecha_inicio || new Date().toISOString(),
      fecha_fin: data.fecha_fin?.toDate
        ? data.fecha_fin.toDate().toISOString()
        : data.fecha_fin || undefined,
      estado_conservacion_inicial: data.estado_conservacion_inicial || undefined,
      estado_conservacion_resultante: data.estado_conservacion_resultante || 'B',
      estado_operativo_resultante: data.estado_operativo_resultante || undefined,
      cerrado: Boolean(data.cerrado),
    };
  }
}

export const mantenimientoRepository = new FirestoreMantenimientoRepository();
