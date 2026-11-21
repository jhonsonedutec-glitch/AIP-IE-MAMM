import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { db, auth } from '@/config/firebase';
import { BloqueEquipos } from '@/types';
import { IBloqueRepository, OperadorInfo } from '../interfaces';
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

export class FirestoreBloqueRepository implements IBloqueRepository {
  private colRef = collection(db, 'bloques_equipos');

  async listar(): Promise<BloqueEquipos[]> {
    const snap = await getDocs(this.colRef);
    const lista = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<BloqueEquipos, 'id'>) }));
    return lista.sort((a, b) => a.nombre.localeCompare(b.nombre));
  }

  async listarActivos(): Promise<BloqueEquipos[]> {
    const todos = await this.listar();
    return todos.filter((b) => b.activo !== false);
  }

  async obtenerPorId(id: string): Promise<BloqueEquipos | null> {
    const snap = await getDoc(doc(this.colRef, id));
    if (!snap.exists()) return null;
    return { id: snap.id, ...(snap.data() as Omit<BloqueEquipos, 'id'>) };
  }

  async crear(
    bloque: Omit<BloqueEquipos, 'id'>,
    usuarioOperador?: OperadorInfo
  ): Promise<string> {
    const cleanNombre = bloque.nombre.trim();
    if (!cleanNombre) {
      throw new Error('El nombre del bloque de equipos es obligatorio.');
    }

    const docRef = doc(this.colRef);
    const qrLote = bloque.codigo_qr_lote?.trim() || `BLOQUE-${Date.now().toString().slice(-6)}`;

    const dataToSave = limpiarUndefined({
      nombre: cleanNombre,
      descripcion: bloque.descripcion?.trim() || '',
      codigo_qr_lote: qrLote,
      bienes_ids: Array.isArray(bloque.bienes_ids) ? bloque.bienes_ids : [],
      activo: bloque.activo !== undefined ? bloque.activo : true,
      creado_en: serverTimestamp(),
      actualizado_en: serverTimestamp(),
    });

    await setDoc(docRef, dataToSave);

    const operId = usuarioOperador?.uid || auth.currentUser?.uid || 'SISTEMA';
    const operEmail = usuarioOperador?.email || auth.currentUser?.email || '';

    await auditoriaRepository.registrar({
      usuario_id: operId,
      usuario_email: operEmail,
      accion: 'CREATE',
      coleccion: 'bloques_equipos',
      documento_id: docRef.id,
      detalle: `Creación de bloque de equipos: ${cleanNombre} con ${dataToSave.bienes_ids.length} equipo(s)`,
    });

    return docRef.id;
  }

  async actualizar(
    id: string,
    cambios: Partial<BloqueEquipos>,
    usuarioOperador?: OperadorInfo
  ): Promise<void> {
    const docTarget = doc(this.colRef, id);
    const dataToUpdate = limpiarUndefined({
      ...cambios,
      ...(cambios.nombre ? { nombre: cambios.nombre.trim() } : {}),
      ...(cambios.descripcion !== undefined ? { descripcion: cambios.descripcion.trim() } : {}),
      actualizado_en: serverTimestamp(),
    });

    await updateDoc(docTarget, dataToUpdate);

    const operId = usuarioOperador?.uid || auth.currentUser?.uid || 'SISTEMA';
    const operEmail = usuarioOperador?.email || auth.currentUser?.email || '';

    await auditoriaRepository.registrar({
      usuario_id: operId,
      usuario_email: operEmail,
      accion: 'UPDATE',
      coleccion: 'bloques_equipos',
      documento_id: id,
      detalle: `Actualización del bloque de equipos ID ${id}`,
    });
  }

  async desactivar(id: string, usuarioOperador?: OperadorInfo): Promise<void> {
    await this.actualizar(id, { activo: false }, usuarioOperador);
  }
}

export const bloqueRepository = new FirestoreBloqueRepository();
