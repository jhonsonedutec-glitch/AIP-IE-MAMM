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
import { CategoriaEquipo } from '@/types';
import { ICategoriaRepository } from '../interfaces';
import { auditoriaRepository } from './FirestoreAuditoriaRepository';

export const CATEGORIAS_BASE: Omit<CategoriaEquipo, 'id'>[] = [
  { nombre: 'PCs de Mesa', prefijo_etiqueta: 'PC', activo: true },
  { nombre: 'Laptops', prefijo_etiqueta: 'LAP', activo: true },
  { nombre: 'Proyectores', prefijo_etiqueta: 'PROY', activo: true },
  { nombre: 'Otros', prefijo_etiqueta: 'EQ', activo: true },
];

export class FirestoreCategoriaRepository implements ICategoriaRepository {
  private colRef = collection(db, 'categorias_equipo');

  async listar(): Promise<CategoriaEquipo[]> {
    const q = query(this.colRef, orderBy('nombre', 'asc'));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({
      id: d.id,
      nombre: d.data().nombre || '',
      prefijo_etiqueta: d.data().prefijo_etiqueta || '',
      activo: d.data().activo !== false,
    }));
  }

  async obtenerPorId(id: string): Promise<CategoriaEquipo | null> {
    const snap = await getDoc(doc(this.colRef, id));
    if (!snap.exists()) return null;
    return {
      id: snap.id,
      nombre: snap.data().nombre || '',
      prefijo_etiqueta: snap.data().prefijo_etiqueta || '',
      activo: snap.data().activo !== false,
    };
  }

  async crear(categoria: Omit<CategoriaEquipo, 'id'>): Promise<string> {
    const docAdded = await addDoc(this.colRef, categoria);
    await auditoriaRepository.registrar({
      usuario_id: '',
      usuario_email: '',
      accion: 'CREATE',
      coleccion: 'categorias_equipo',
      documento_id: docAdded.id,
      detalle: `Creación de categoría: ${categoria.nombre}`,
    });
    return docAdded.id;
  }

  async actualizar(id: string, categoria: Partial<CategoriaEquipo>): Promise<void> {
    await updateDoc(doc(this.colRef, id), categoria);
    await auditoriaRepository.registrar({
      usuario_id: '',
      usuario_email: '',
      accion: 'UPDATE',
      coleccion: 'categorias_equipo',
      documento_id: id,
      detalle: `Actualización de categoría ID ${id}`,
    });
  }

  async cambiarEstado(id: string, activo: boolean): Promise<void> {
    await this.actualizar(id, { activo });
  }

  async inicializarCategoriasBase(): Promise<void> {
    const existentes = await this.listar();
    const nombresExistentes = new Set(existentes.map((c) => c.nombre.trim().toLowerCase()));

    for (const base of CATEGORIAS_BASE) {
      if (!nombresExistentes.has(base.nombre.trim().toLowerCase())) {
        await this.crear(base);
      }
    }
  }
}

export const categoriaRepository = new FirestoreCategoriaRepository();
