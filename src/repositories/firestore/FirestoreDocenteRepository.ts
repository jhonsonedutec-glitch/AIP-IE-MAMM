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
import { Docente } from '@/types';
import { IDocenteRepository, OperadorInfo } from '../interfaces';
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

export class FirestoreDocenteRepository implements IDocenteRepository {
  private colRef = collection(db, 'docentes');

  async listar(): Promise<Docente[]> {
    const snap = await getDocs(this.colRef);
    const lista = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Docente, 'id'>) }));
    return lista.sort((a, b) => a.nombres_apellidos.localeCompare(b.nombres_apellidos));
  }

  async listarActivos(): Promise<Docente[]> {
    const todos = await this.listar();
    return todos.filter((d) => d.activo !== false);
  }

  async listarDocentes(): Promise<Docente[]> {
    return this.listarActivos();
  }

  async obtenerPorId(id: string): Promise<Docente | null> {
    const snap = await getDoc(doc(this.colRef, id));
    if (!snap.exists()) return null;
    return { id: snap.id, ...(snap.data() as Omit<Docente, 'id'>) };
  }

  async obtenerPorDni(dni: string): Promise<Docente | null> {
    const cleanDni = dni.trim();
    if (!cleanDni) return null;
    const todos = await this.listar();
    return todos.find((d) => d.dni.trim() === cleanDni && d.activo !== false) || null;
  }

  async crear(docente: Omit<Docente, 'id'>, usuarioOperador?: OperadorInfo): Promise<string> {
    const cleanDni = docente.dni.trim();
    if (cleanDni) {
      const duplicado = await this.obtenerPorDni(cleanDni);
      if (duplicado) {
        throw new Error(`Ya existe un docente activo con el DNI ${cleanDni} (${duplicado.nombres_apellidos}).`);
      }
    }

    const docRef = doc(this.colRef);
    const nombreCompleto = docente.nombres_apellidos
      ? docente.nombres_apellidos.trim().toUpperCase()
      : `${docente.apellidos || ''}, ${docente.nombres || ''}`.trim().toUpperCase();

    const dataToSave = limpiarUndefined({
      dni: cleanDni,
      nombres_apellidos: nombreCompleto,
      nombres: docente.nombres?.trim() || '',
      apellidos: docente.apellidos?.trim() || '',
      especialidad: docente.especialidad?.trim() || '',
      area_principal_id: docente.area_principal_id || '',
      celular: (docente.celular || docente.telefono || '').trim(),
      telefono: (docente.telefono || docente.celular || '').trim(),
      email: docente.email?.trim() || '',
      activo: docente.activo !== undefined ? docente.activo : true,
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
      coleccion: 'docentes',
      documento_id: docRef.id,
      detalle: `Alta de docente: ${dataToSave.nombres_apellidos} (DNI: ${cleanDni || 'S/DNI'})`,
    });

    return docRef.id;
  }

  async actualizar(
    id: string,
    cambios: Partial<Docente>,
    usuarioOperador?: OperadorInfo
  ): Promise<void> {
    if (cambios.dni) {
      const cleanDni = cambios.dni.trim();
      const todos = await this.listar();
      const duplicado = todos.find((d) => d.id !== id && d.dni.trim() === cleanDni && d.activo !== false);
      if (duplicado) {
        throw new Error(`Ya existe otro docente activo con el DNI ${cleanDni} (${duplicado.nombres_apellidos}).`);
      }
    }

    const docTarget = doc(this.colRef, id);
    const nombreCompleto =
      cambios.nombres_apellidos ||
      (cambios.nombres && cambios.apellidos
        ? `${cambios.apellidos}, ${cambios.nombres}`.trim().toUpperCase()
        : undefined);

    const dataToUpdate = limpiarUndefined({
      ...cambios,
      ...(cambios.dni ? { dni: cambios.dni.trim() } : {}),
      ...(nombreCompleto ? { nombres_apellidos: nombreCompleto } : {}),
      ...(cambios.telefono ? { celular: cambios.telefono, telefono: cambios.telefono } : {}),
      actualizado_en: serverTimestamp(),
    });

    await updateDoc(docTarget, dataToUpdate);

    const operId = usuarioOperador?.uid || auth.currentUser?.uid || 'SISTEMA';
    const operEmail = usuarioOperador?.email || auth.currentUser?.email || '';

    await auditoriaRepository.registrar({
      usuario_id: operId,
      usuario_email: operEmail,
      accion: 'UPDATE',
      coleccion: 'docentes',
      documento_id: id,
      detalle: `Actualización de datos del docente ID ${id}`,
    });
  }

  async desactivar(id: string, usuarioOperador?: OperadorInfo): Promise<void> {
    await this.actualizar(id, { activo: false }, usuarioOperador);
  }
}

export const docenteRepository = new FirestoreDocenteRepository();
