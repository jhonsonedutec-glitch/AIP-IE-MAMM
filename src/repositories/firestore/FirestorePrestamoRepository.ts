import {
  collection,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  writeBatch,
  increment,
} from 'firebase/firestore';
import { db, auth } from '@/config/firebase';
import { Prestamo, BienPatrimonial } from '@/types';
import { IPrestamoRepository, OperadorInfo } from '../interfaces';
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

export class FirestorePrestamoRepository implements IPrestamoRepository {
  private colRef = collection(db, 'prestamos');
  private bienesColRef = collection(db, 'bienes');

  /**
   * Lista todos los préstamos ordenados cronológicamente por fecha de salida descendente
   */
  async listar(): Promise<Prestamo[]> {
    const snap = await getDocs(this.colRef);
    const lista = snap.docs.map((d) => this.mapDocToPrestamo(d.id, d.data()));
    return lista.sort((a, b) => {
      const timeA = new Date(a.fecha_salida).getTime();
      const timeB = new Date(b.fecha_salida).getTime();
      return timeB - timeA;
    });
  }

  async listarActivos(): Promise<Prestamo[]> {
    const todos = await this.listar();
    return todos.filter((p) => p.estado === 'ACTIVO');
  }

  async listarHistorial(limite?: number): Promise<Prestamo[]> {
    const todos = await this.listar();
    const devueltos = todos.filter((p) => p.estado !== 'ACTIVO');
    return limite ? devueltos.slice(0, limite) : devueltos;
  }

  async listarPorBien(bienId: string): Promise<Prestamo[]> {
    const todos = await this.listar();
    return todos.filter((p) => p.bienes_ids && p.bienes_ids.includes(bienId));
  }

  async obtenerPorId(id: string): Promise<Prestamo | null> {
    const snap = await getDoc(doc(this.colRef, id));
    if (!snap.exists()) return null;
    return this.mapDocToPrestamo(snap.id, snap.data());
  }

  /**
   * Registra una salida / préstamo atómico verificando que todos los equipos estén OPERATIVOS
   */
  async registrarPrestamo(
    datos: Omit<Prestamo, 'id'>,
    usuarioOperador?: OperadorInfo
  ): Promise<string> {
    // Deduplicación estricta de IDs de equipos para garantizar consistencia y evitar colisiones en writeBatch
    const bienesIdsUnicos = Array.from(new Set(datos.bienes_ids || []));

    if (bienesIdsUnicos.length === 0) {
      throw new Error('Debe incluir al menos un equipo en la solicitud de préstamo.');
    }
    if (!datos.docente_id || !datos.docente_nombre) {
      throw new Error('Debe seleccionar el docente responsable del préstamo.');
    }
    if (!datos.area_id || !datos.area_nombre) {
      throw new Error('Debe indicar el área curricular o asignatura pedagógica.');
    }
    if (!datos.grado_seccion.trim()) {
      throw new Error('Debe especificar el grado y sección atendidos (ej. 3° "A").');
    }

    // 1. Verificar el estado de cada bien en tiempo real
    const bienesConsultados = await Promise.all(
      bienesIdsUnicos.map((id) => bienRepository.obtenerPorId(id))
    );

    const noDisponibles: string[] = [];
    bienesConsultados.forEach((b, idx) => {
      const reqId = bienesIdsUnicos[idx];
      if (!b) {
        noDisponibles.push(`ID ${reqId} (No existe)`);
      } else if (b.estado_operativo !== 'OPERATIVO') {
        noDisponibles.push(
          `${b.denominacion} [${b.codigo_patrimonial}] (Estado actual: ${b.estado_operativo})`
        );
      }
    });

    if (noDisponibles.length > 0) {
      throw new Error(
        `Los siguientes equipos no están disponibles para préstamo: \n- ${noDisponibles.join('\n- ')}`
      );
    }

    const operId = usuarioOperador?.uid || auth.currentUser?.uid || 'SISTEMA';
    const operEmail = usuarioOperador?.email || auth.currentUser?.email || '';

    const batch = writeBatch(db);
    const prestamoDocRef = doc(this.colRef);

    const prestamoData = limpiarUndefined({
      tipo: datos.tipo || (bienesIdsUnicos.length > 1 ? 'BLOQUE' : 'INDIVIDUAL'),
      bloque_id: datos.bloque_id || null,
      docente_id: datos.docente_id,
      docente_nombre: datos.docente_nombre.trim(),
      area_id: datos.area_id,
      area_nombre: datos.area_nombre.trim(),
      grado_seccion: datos.grado_seccion.trim(),
      ambiente_uso: datos.ambiente_uso.trim() || 'Aula de Clases',
      bienes_ids: bienesIdsUnicos,
      cantidad_equipos: bienesIdsUnicos.length,
      accesorios_entregados: datos.accesorios_entregados?.trim() || '',
      fecha_salida: datos.fecha_salida ? new Date(datos.fecha_salida) : serverTimestamp(),
      fecha_devolucion_estimada: datos.fecha_devolucion_estimada
        ? new Date(datos.fecha_devolucion_estimada)
        : '',
      fecha_devolucion_real: null,
      estado: 'ACTIVO',
      observacion_retorno: '',
      usuario_entrega_id: operId,
      usuario_recepcion_id: '',
      creado_en: serverTimestamp(),
      actualizado_en: serverTimestamp(),
    });

    // 2. Crear documento de préstamo
    batch.set(prestamoDocRef, prestamoData);

    // 3. Actualizar estado operativo de cada bien a PRESTADO e incrementar total_prestamos
    bienesIdsUnicos.forEach((bienId) => {
      const bienDocRef = doc(this.bienesColRef, bienId);
      batch.update(bienDocRef, {
        estado_operativo: 'PRESTADO',
        total_prestamos: increment(1),
        actualizado_en: serverTimestamp(),
      });
    });

    await batch.commit();

    // 4. Auditoría
    await auditoriaRepository.registrar({
      usuario_id: operId,
      usuario_email: operEmail,
      accion: 'PRESTAMO',
      coleccion: 'prestamos',
      documento_id: prestamoDocRef.id,
      detalle: `Préstamo de ${datos.bienes_ids.length} equipo(s) al docente ${datos.docente_nombre} (${datos.area_nombre} - ${datos.grado_seccion})`,
    });

    return prestamoDocRef.id;
  }

  /**
   * Registra la devolución de los equipos y actualiza su estado operativo
   */
  async registrarDevolucion(
    prestamoId: string,
    cierre: {
      fechaReal?: string | Date;
      estado: 'DEVUELTO' | 'CON_INCIDENCIA';
      observacion?: string;
      equiposRetorno?: Array<{
        bien_id: string;
        estadoOperativo: BienPatrimonial['estado_operativo'];
        estadoConservacion?: BienPatrimonial['estado_conservacion'];
        observacionIncidencia?: string;
      }>;
    },
    usuarioOperador?: OperadorInfo
  ): Promise<void> {
    const prestamoSnap = await getDoc(doc(this.colRef, prestamoId));
    if (!prestamoSnap.exists()) {
      throw new Error(`El registro de préstamo ID ${prestamoId} no existe.`);
    }

    const prestamoData = prestamoSnap.data() as Prestamo;
    if (prestamoData.estado !== 'ACTIVO') {
      throw new Error('Este préstamo ya fue devuelto previamente.');
    }

    const operId = usuarioOperador?.uid || auth.currentUser?.uid || 'SISTEMA';
    const operEmail = usuarioOperador?.email || auth.currentUser?.email || '';

    const batch = writeBatch(db);
    const prestamoDocRef = doc(this.colRef, prestamoId);

    // 1. Actualizar préstamo a DEVUELTO o CON_INCIDENCIA
    batch.update(prestamoDocRef, {
      estado: cierre.estado || 'DEVUELTO',
      fecha_devolucion_real: cierre.fechaReal ? new Date(cierre.fechaReal) : serverTimestamp(),
      observacion_retorno: cierre.observacion?.trim() || '',
      usuario_recepcion_id: operId,
      actualizado_en: serverTimestamp(),
    });

    // 2. Actualizar el estado operativo y de conservación de cada equipo deduplicando IDs
    if (cierre.equiposRetorno && cierre.equiposRetorno.length > 0) {
      const vistos = new Set<string>();
      cierre.equiposRetorno.forEach((eq) => {
        if (!eq.bien_id || vistos.has(eq.bien_id)) return;
        vistos.add(eq.bien_id);

        const bienDocRef = doc(this.bienesColRef, eq.bien_id);
        const updates: Record<string, any> = {
          estado_operativo: eq.estadoOperativo || 'OPERATIVO',
          actualizado_en: serverTimestamp(),
        };
        if (eq.estadoConservacion) {
          updates.estado_conservacion = eq.estadoConservacion;
        }
        batch.update(bienDocRef, updates);
      });
    } else {
      // Si no se especifica individualmente, todos retornan OPERATIVOS sin duplicados
      const idsUnicos = Array.from(new Set(prestamoData.bienes_ids || []));
      idsUnicos.forEach((bienId) => {
        const bienDocRef = doc(this.bienesColRef, bienId);
        batch.update(bienDocRef, {
          estado_operativo: 'OPERATIVO',
          actualizado_en: serverTimestamp(),
        });
      });
    }

    await batch.commit();

    // 3. Auditoría
    await auditoriaRepository.registrar({
      usuario_id: operId,
      usuario_email: operEmail,
      accion: 'DEVOLUCION',
      coleccion: 'prestamos',
      documento_id: prestamoId,
      detalle: `Devolución de préstamo ID ${prestamoId} (${cierre.estado}). ${cierre.observacion ? `Obs: ${cierre.observacion}` : ''}`,
    });
  }

  async registrarSalida(prestamo: Omit<Prestamo, 'id'>): Promise<string> {
    return this.registrarPrestamo(prestamo);
  }

  private mapDocToPrestamo(id: string, data: any): Prestamo {
    return {
      id,
      tipo: data.tipo || 'INDIVIDUAL',
      bloque_id: data.bloque_id || null,
      docente_id: data.docente_id || '',
      docente_nombre: data.docente_nombre || '',
      area_id: data.area_id || '',
      area_nombre: data.area_nombre || '',
      grado_seccion: data.grado_seccion || '',
      ambiente_uso: data.ambiente_uso || '',
      bienes_ids: Array.isArray(data.bienes_ids) ? data.bienes_ids : [],
      cantidad_equipos: Number(data.cantidad_equipos || 0),
      accesorios_entregados: data.accesorios_entregados || '',
      fecha_salida: data.fecha_salida?.toDate
        ? data.fecha_salida.toDate().toISOString()
        : data.fecha_salida || new Date().toISOString(),
      fecha_devolucion_estimada: data.fecha_devolucion_estimada?.toDate
        ? data.fecha_devolucion_estimada.toDate().toISOString()
        : data.fecha_devolucion_estimada || '',
      fecha_devolucion_real: data.fecha_devolucion_real?.toDate
        ? data.fecha_devolucion_real.toDate().toISOString()
        : data.fecha_devolucion_real || null,
      estado: data.estado || 'ACTIVO',
      observacion_retorno: data.observacion_retorno || '',
      usuario_entrega_id: data.usuario_entrega_id || '',
      usuario_recepcion_id: data.usuario_recepcion_id || '',
    };
  }
}

export const prestamoRepository = new FirestorePrestamoRepository();
