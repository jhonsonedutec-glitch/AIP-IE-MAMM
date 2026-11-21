import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  query,
  orderBy,
} from 'firebase/firestore';
import { db } from '@/config/firebase';
import { Ambiente } from '@/types';
import { IAmbienteRepository } from '../interfaces';
import { auditoriaRepository } from './FirestoreAuditoriaRepository';

export const AMBIENTES_BASE: Omit<Ambiente, 'id'>[] = [
  { nombre: 'AIP 1', encargado: 'Responsable AIP 1', descripcion: 'Aula de Innovación Pedagógica 1', activo: true },
  { nombre: 'AIP 2', encargado: 'Responsable AIP 2', descripcion: 'Aula de Innovación Pedagógica 2', activo: true },
  { nombre: 'Secretaría de Dirección', encargado: 'Secretaría General', descripcion: 'Oficina de Dirección', activo: true },
  { nombre: 'Secretaría Subdirección', encargado: 'Subdirección Pedagógica', descripcion: 'Oficina de Subdirección', activo: true },
  { nombre: 'Psicología', encargado: 'Psicólogo Escolar', descripcion: 'Consultorio de Psicología Escolar', activo: true },
  { nombre: 'TOE', encargado: 'Coordinador(a) TOE', descripcion: 'Tutoría y Orientación Educativa', activo: true },
  { nombre: 'Otros', encargado: 'General', descripcion: 'Otros ambientes institucionales', activo: true },
];

export class FirestoreAmbienteRepository implements IAmbienteRepository {
  private colRef = collection(db, 'ambientes');

  async listar(): Promise<Ambiente[]> {
    const q = query(this.colRef, orderBy('nombre', 'asc'));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({
      id: d.id,
      nombre: d.data().nombre || '',
      encargado: d.data().encargado || '',
      descripcion: d.data().descripcion || '',
      activo: d.data().activo !== false,
    }));
  }

  async obtenerPorId(id: string): Promise<Ambiente | null> {
    const snap = await getDoc(doc(this.colRef, id));
    if (!snap.exists()) return null;
    return {
      id: snap.id,
      nombre: snap.data().nombre || '',
      encargado: snap.data().encargado || '',
      descripcion: snap.data().descripcion || '',
      activo: snap.data().activo !== false,
    };
  }

  async crear(ambiente: Omit<Ambiente, 'id'>): Promise<string> {
    const docAdded = await addDoc(this.colRef, ambiente);
    await auditoriaRepository.registrar({
      usuario_id: '',
      usuario_email: '',
      accion: 'CREATE',
      coleccion: 'ambientes',
      documento_id: docAdded.id,
      detalle: `Creación de ambiente: ${ambiente.nombre}`,
    });
    return docAdded.id;
  }

  async actualizar(id: string, ambiente: Partial<Ambiente>): Promise<void> {
    await updateDoc(doc(this.colRef, id), ambiente);
    await auditoriaRepository.registrar({
      usuario_id: '',
      usuario_email: '',
      accion: 'UPDATE',
      coleccion: 'ambientes',
      documento_id: id,
      detalle: `Actualización de ambiente ID ${id}`,
    });
  }

  async cambiarEstado(id: string, activo: boolean): Promise<void> {
    await this.actualizar(id, { activo });
  }

  async inicializarAmbientesBase(): Promise<void> {
    const existentes = await this.listar();
    const nombresExistentes = new Set(existentes.map((a) => a.nombre.trim().toLowerCase()));

    for (const base of AMBIENTES_BASE) {
      if (!nombresExistentes.has(base.nombre.trim().toLowerCase())) {
        await this.crear(base);
      }
    }
  }
}

export const ambienteRepository = new FirestoreAmbienteRepository();
