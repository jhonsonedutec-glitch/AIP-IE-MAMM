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
import { AreaCurricular } from '@/types';
import { IAreaCurricularRepository, OperadorInfo } from '../interfaces';
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

export const AREAS_CURRICULARES_EBR = [
  'Matemática',
  'Comunicación',
  'Ciencia y Tecnología',
  'Ciencias Sociales',
  'Desarrollo Personal, Ciudadanía y Cívica (DPCC)',
  'Educación para el Trabajo (EPT)',
  'Inglés',
  'Arte y Cultura',
  'Educación Física',
  'Educación Religiosa',
  'Tutoría y Orientación Educativa',
];

export class FirestoreAreaCurricularRepository implements IAreaCurricularRepository {
  private colRef = collection(db, 'areas_curriculares');

  async listar(): Promise<AreaCurricular[]> {
    const snap = await getDocs(this.colRef);
    const lista = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<AreaCurricular, 'id'>) }));
    return lista.sort((a, b) => a.nombre.localeCompare(b.nombre));
  }

  async listarActivas(): Promise<AreaCurricular[]> {
    const todas = await this.listar();
    return todas.filter((a) => a.activo !== false);
  }

  async obtenerPorId(id: string): Promise<AreaCurricular | null> {
    const snap = await getDoc(doc(this.colRef, id));
    if (!snap.exists()) return null;
    return { id: snap.id, ...(snap.data() as Omit<AreaCurricular, 'id'>) };
  }

  async crear(
    area: Omit<AreaCurricular, 'id'>,
    usuarioOperador?: OperadorInfo
  ): Promise<string> {
    const cleanNombre = area.nombre.trim();
    if (!cleanNombre) {
      throw new Error('El nombre del área curricular es obligatorio.');
    }

    const docRef = doc(this.colRef);
    const dataToSave = limpiarUndefined({
      nombre: cleanNombre,
      activo: area.activo !== undefined ? area.activo : true,
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
      coleccion: 'areas_curriculares',
      documento_id: docRef.id,
      detalle: `Alta de área curricular: ${cleanNombre}`,
    });

    return docRef.id;
  }

  async actualizar(
    id: string,
    cambios: Partial<AreaCurricular>,
    usuarioOperador?: OperadorInfo
  ): Promise<void> {
    const docTarget = doc(this.colRef, id);
    const dataToUpdate = limpiarUndefined({
      ...cambios,
      ...(cambios.nombre ? { nombre: cambios.nombre.trim() } : {}),
      actualizado_en: serverTimestamp(),
    });

    await updateDoc(docTarget, dataToUpdate);

    const operId = usuarioOperador?.uid || auth.currentUser?.uid || 'SISTEMA';
    const operEmail = usuarioOperador?.email || auth.currentUser?.email || '';

    await auditoriaRepository.registrar({
      usuario_id: operId,
      usuario_email: operEmail,
      accion: 'UPDATE',
      coleccion: 'areas_curriculares',
      documento_id: id,
      detalle: `Actualización de área curricular ID ${id}`,
    });
  }

  async desactivar(id: string, usuarioOperador?: OperadorInfo): Promise<void> {
    await this.actualizar(id, { activo: false }, usuarioOperador);
  }

  /**
   * Inicializa las 11 áreas oficiales de Secundaria EBR Perú si aún no existen
   */
  async inicializarAreasBase(usuarioOperador?: OperadorInfo): Promise<number> {
    const existentes = await this.listar();
    const nombresExistentes = existentes.map((e) => e.nombre.toLowerCase().trim());
    let insertadas = 0;

    for (const area of AREAS_CURRICULARES_EBR) {
      if (!nombresExistentes.includes(area.toLowerCase().trim())) {
        await this.crear({ nombre: area, activo: true }, usuarioOperador);
        insertadas++;
      }
    }

    return insertadas;
  }
}

export const areaCurricularRepository = new FirestoreAreaCurricularRepository();
