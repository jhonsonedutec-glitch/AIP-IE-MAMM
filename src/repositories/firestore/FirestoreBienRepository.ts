import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  writeBatch,
} from 'firebase/firestore';
import { db, auth } from '@/config/firebase';
import { BienPatrimonial } from '@/types';
import { IBienRepository, OperadorInfo } from '../interfaces';
import { auditoriaRepository } from './FirestoreAuditoriaRepository';
import { categoriaRepository } from './FirestoreCategoriaRepository';

/**
 * Elimina recursivamente o a nivel superficial cualquier clave con valor `undefined`,
 * evitando errores de "Unsupported field value: undefined" en Firestore.
 */
function limpiarUndefined<T extends Record<string, any>>(obj: T): T {
  const limpio: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      limpio[key] = value;
    }
  }
  return limpio as T;
}

export class FirestoreBienRepository implements IBienRepository {
  private colRef = collection(db, 'bienes');

  /**
   * Lista todos los bienes registrados en la colección
   */
  async listar(): Promise<BienPatrimonial[]> {
    const q = query(this.colRef, orderBy('fecha_registro', 'desc'));
    const snap = await getDocs(q);
    return snap.docs.map((d) => this.mapDocToBien(d.id, d.data()));
  }

  async listarTodos(): Promise<BienPatrimonial[]> {
    return this.listar();
  }

  async obtenerPorId(id: string): Promise<BienPatrimonial | null> {
    const snap = await getDoc(doc(this.colRef, id));
    if (!snap.exists()) return null;
    return this.mapDocToBien(snap.id, snap.data());
  }

  async buscarPorCodigo(codigo: string): Promise<BienPatrimonial | null> {
    const cleanCodigo = codigo.trim();
    if (!cleanCodigo) return null;

    // Buscar primero por código patrimonial
    const qPatrimonial = query(this.colRef, where('codigo_patrimonial', '==', cleanCodigo));
    const snapPatrimonial = await getDocs(qPatrimonial);
    if (!snapPatrimonial.empty) {
      const d = snapPatrimonial.docs[0];
      return this.mapDocToBien(d.id, d.data());
    }

    // Buscar por etiqueta interna / QR
    const qEtiqueta = query(this.colRef, where('etiqueta_interna', '==', cleanCodigo));
    const snapEtiqueta = await getDocs(qEtiqueta);
    if (!snapEtiqueta.empty) {
      const d = snapEtiqueta.docs[0];
      return this.mapDocToBien(d.id, d.data());
    }

    return null;
  }

  async obtenerPorCodigo(codigo: string): Promise<BienPatrimonial | null> {
    return this.buscarPorCodigo(codigo);
  }

  /**
   * Genera una etiqueta interna correlativa única si no fue proporcionada (ej. LAP-001)
   */
  private async generarEtiquetaInterna(categoriaId: string): Promise<string> {
    const categoria = await categoriaRepository.obtenerPorId(categoriaId);
    const prefijo = (categoria?.prefijo_etiqueta || 'EQ').toUpperCase().trim();

    // Consultar bienes de la misma categoría para calcular el correlativo
    const q = query(this.colRef, where('categoria_id', '==', categoriaId));
    const snap = await getDocs(q);
    const total = snap.size + 1;
    const correlativo = String(total).padStart(3, '0');
    return `${prefijo}-${correlativo}`;
  }

  /**
   * Valida unicidad de código patrimonial y serie entre bienes activos
   */
  private async validarUnicidad(
    codigoPatrimonial: string,
    serie: string,
    ignorarId?: string
  ): Promise<void> {
    const cleanCod = codigoPatrimonial.trim();
    const cleanSerie = serie.trim().toUpperCase();

    // 1. Validar Código Patrimonial (si no es S/C ni vacío)
    if (cleanCod && cleanCod.toUpperCase() !== 'S/C') {
      const qCod = query(this.colRef, where('codigo_patrimonial', '==', cleanCod));
      const snapCod = await getDocs(qCod);
      const duplicado = snapCod.docs.find((d) => d.id !== ignorarId);
      if (duplicado) {
        const data = duplicado.data();
        if (data.estado_operativo !== 'DE_BAJA') {
          throw new Error(
            `Ya existe un bien activo registrado con el código patrimonial "${cleanCod}" (${data.denominacion || 'Equipo'}).`
          );
        }
      }
    }

    // 2. Validar Número de Serie (si no es S/N, S/S ni vacío)
    if (cleanSerie && cleanSerie !== 'S/N' && cleanSerie !== 'S/S' && cleanSerie !== 'SIN SERIE') {
      const qSerie = query(this.colRef, where('serie', '==', cleanSerie));
      const snapSerie = await getDocs(qSerie);
      const duplicado = snapSerie.docs.find((d) => d.id !== ignorarId);
      if (duplicado) {
        const data = duplicado.data();
        if (data.estado_operativo !== 'DE_BAJA') {
          throw new Error(
            `Ya existe un bien activo registrado con el número de serie "${cleanSerie}" (${data.denominacion || 'Equipo'}).`
          );
        }
      }
    }
  }

  async crear(
    bien: Omit<BienPatrimonial, 'id' | 'fecha_registro' | 'actualizado_en'>,
    operador?: OperadorInfo
  ): Promise<string> {
    await this.validarUnicidad(bien.codigo_patrimonial, bien.serie);

    // Asignar etiqueta interna si está vacía
    let etiqueta = bien.etiqueta_interna?.trim();
    if (!etiqueta) {
      etiqueta = await this.generarEtiquetaInterna(bien.categoria_id);
    }

    // Código QR por defecto es la etiqueta interna
    const codigoQr = bien.codigo_qr?.trim() || etiqueta;

    const nuevoDocRef = doc(this.colRef);
    const rawData = {
      ...bien,
      etiqueta_interna: etiqueta,
      codigo_qr: codigoQr,
      codigo_patrimonial: bien.codigo_patrimonial.trim(),
      serie: bien.serie.trim(),
      denominacion: bien.denominacion.trim(),
      marca: bien.marca.trim(),
      modelo: bien.modelo.trim(),
      color: bien.color.trim(),
      estacion_grupo: bien.estacion_grupo?.trim() || '',
      ubicacion_detalle: bien.ubicacion_detalle?.trim() || '',
      observacion: bien.observacion?.trim() || '',
      total_prestamos: 0,
      fecha_registro: serverTimestamp(),
      actualizado_en: serverTimestamp(),
    };

    const dataToSave = limpiarUndefined(rawData);
    await setDoc(nuevoDocRef, dataToSave);

    // Registro de auditoría
    const operId = operador?.uid || auth.currentUser?.uid || '';
    const operEmail = operador?.email || auth.currentUser?.email || '';

    await auditoriaRepository.registrar({
      usuario_id: operId,
      usuario_email: operEmail,
      accion: 'CREATE',
      coleccion: 'bienes',
      documento_id: nuevoDocRef.id,
      detalle: `Alta de bien: ${dataToSave.denominacion} [Patr: ${dataToSave.codigo_patrimonial || 'S/C'}, Etq: ${etiqueta}]`,
    });

    return nuevoDocRef.id;
  }

  async actualizar(
    id: string,
    cambios: Partial<BienPatrimonial>,
    operador?: OperadorInfo
  ): Promise<void> {
    if (cambios.codigo_patrimonial || cambios.serie) {
      const actual = await this.obtenerPorId(id);
      if (actual) {
        const cod = cambios.codigo_patrimonial ?? actual.codigo_patrimonial;
        const ser = cambios.serie ?? actual.serie;
        await this.validarUnicidad(cod, ser, id);
      }
    }

    const docTarget = doc(this.colRef, id);
    const rawUpdate: Record<string, any> = {
      ...cambios,
      actualizado_en: serverTimestamp(),
    };
    if (cambios.estacion_grupo !== undefined) {
      rawUpdate.estacion_grupo = cambios.estacion_grupo?.trim() || '';
    }
    if (cambios.ubicacion_detalle !== undefined) {
      rawUpdate.ubicacion_detalle = cambios.ubicacion_detalle?.trim() || '';
    }
    if (cambios.observacion !== undefined) {
      rawUpdate.observacion = cambios.observacion?.trim() || '';
    }

    const dataToUpdate = limpiarUndefined(rawUpdate);
    await updateDoc(docTarget, dataToUpdate);

    const operId = operador?.uid || auth.currentUser?.uid || '';
    const operEmail = operador?.email || auth.currentUser?.email || '';

    await auditoriaRepository.registrar({
      usuario_id: operId,
      usuario_email: operEmail,
      accion: 'UPDATE',
      coleccion: 'bienes',
      documento_id: id,
      detalle: `Actualización patrimonial del bien ID ${id}`,
    });
  }

  async darDeBaja(
    id: string,
    motivo: string,
    operador?: OperadorInfo
  ): Promise<void> {
    const docTarget = doc(this.colRef, id);
    const bienActual = await this.obtenerPorId(id);

    await updateDoc(docTarget, {
      estado_operativo: 'DE_BAJA',
      motivo_baja: motivo.trim(),
      fecha_baja: serverTimestamp(),
      actualizado_en: serverTimestamp(),
    });

    const operId = operador?.uid || auth.currentUser?.uid || '';
    const operEmail = operador?.email || auth.currentUser?.email || '';

    await auditoriaRepository.registrar({
      usuario_id: operId,
      usuario_email: operEmail,
      accion: 'BAJA',
      coleccion: 'bienes',
      documento_id: id,
      detalle: `Baja lógica de bien ${bienActual?.codigo_patrimonial || id} (${bienActual?.denominacion || 'Equipo'}). Motivo: ${motivo.trim()}`,
    });
  }

  async bajaLogica(id: string, motivo: string, operador?: OperadorInfo): Promise<void> {
    return this.darDeBaja(id, motivo, operador);
  }

  /**
   * Inserción masiva de bienes usando writeBatch en bloques de máximo 400 documentos
   */
  async importarLote(
    bienes: Array<Omit<BienPatrimonial, 'id' | 'fecha_registro' | 'actualizado_en'>>,
    operador?: OperadorInfo
  ): Promise<{ insertados: number; omitidos: number; fallidos: number }> {
    if (bienes.length === 0) {
      return { insertados: 0, omitidos: 0, fallidos: 0 };
    }

    const CHUNK_SIZE = 400; // Respetar holgadamente el límite de 500 ops de Firestore
    let insertados = 0;
    let fallidos = 0;

    for (let i = 0; i < bienes.length; i += CHUNK_SIZE) {
      const chunk = bienes.slice(i, i + CHUNK_SIZE);
      const batch = writeBatch(db);

      for (const item of chunk) {
        try {
          const docRef = doc(this.colRef);
          const rawItem = {
            ...item,
            codigo_patrimonial: item.codigo_patrimonial?.trim() || 'S/C',
            serie: item.serie?.trim() || 'S/N',
            denominacion: item.denominacion?.trim() || 'EQUIPO',
            marca: item.marca?.trim() || 'GENÉRICO',
            modelo: item.modelo?.trim() || 'S/M',
            color: item.color?.trim() || '',
            estacion_grupo: item.estacion_grupo?.trim() || '',
            ubicacion_detalle: item.ubicacion_detalle?.trim() || '',
            observacion: item.observacion?.trim() || '',
            etiqueta_interna: item.etiqueta_interna?.trim() || '',
            codigo_qr: item.codigo_qr?.trim() || item.etiqueta_interna?.trim() || '',
            total_prestamos: 0,
            fecha_registro: serverTimestamp(),
            actualizado_en: serverTimestamp(),
          };
          const dataToSave = limpiarUndefined(rawItem);
          batch.set(docRef, dataToSave);
          insertados++;
        } catch {
          fallidos++;
        }
      }

      await batch.commit();
    }

    // Registro consolidado de auditoría para toda la importación
    const operId = operador?.uid || auth.currentUser?.uid || '';
    const operEmail = operador?.email || auth.currentUser?.email || '';

    await auditoriaRepository.registrar({
      usuario_id: operId,
      usuario_email: operEmail,
      accion: 'IMPORT',
      coleccion: 'bienes',
      documento_id: 'lote',
      detalle: `Importación masiva completada: ${insertados} bienes insertados, ${fallidos} errores.`,
    });

    return { insertados, omitidos: 0, fallidos };
  }

  private mapDocToBien(id: string, data: any): BienPatrimonial {
    return {
      id,
      codigo_patrimonial: data.codigo_patrimonial || 'S/C',
      tipo_codigo: data.tipo_codigo || 'S/C',
      denominacion: data.denominacion || '',
      categoria_id: data.categoria_id || '',
      marca: data.marca || '',
      modelo: data.modelo || '',
      color: data.color || '',
      serie: data.serie || '',
      estado_conservacion: data.estado_conservacion || 'B',
      estado_operativo: data.estado_operativo || 'OPERATIVO',
      ambiente_id: data.ambiente_id || '',
      ubicacion_detalle: data.ubicacion_detalle || undefined,
      estacion_grupo: data.estacion_grupo || undefined,
      etiqueta_interna: data.etiqueta_interna || '',
      observacion: data.observacion || '',
      bloque_id: data.bloque_id || undefined,
      codigo_qr: data.codigo_qr || data.etiqueta_interna || '',
      total_prestamos: Number(data.total_prestamos || 0),
      motivo_baja: data.motivo_baja || undefined,
      fecha_baja: data.fecha_baja?.toDate ? data.fecha_baja.toDate().toISOString() : data.fecha_baja,
      fecha_registro: data.fecha_registro?.toDate
        ? data.fecha_registro.toDate().toISOString()
        : data.fecha_registro || new Date().toISOString(),
      actualizado_en: data.actualizado_en?.toDate
        ? data.actualizado_en.toDate().toISOString()
        : data.actualizado_en || new Date().toISOString(),
    };
  }
}

export const bienRepository = new FirestoreBienRepository();
