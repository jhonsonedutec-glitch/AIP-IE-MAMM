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
import { BienPatrimonial, normalizarCodigoPatrimonial, normalizarSerie } from '@/types';
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
   * Obtiene el prefijo de etiqueta asignado a una categoría o inferido de la denominación.
   */
  private resolverPrefijo(
    categoria?: { prefijo_etiqueta?: string; nombre?: string } | null,
    denominacion?: string
  ): string {
    if (categoria?.prefijo_etiqueta?.trim()) {
      return categoria.prefijo_etiqueta.trim().toUpperCase();
    }
    const texto = `${categoria?.nombre || ''} ${denominacion || ''}`.toUpperCase();
    if (texto.includes('LAPTOP') || texto.includes('PORTATIL') || texto.includes('PORTÁTIL')) return 'LAP';
    if (texto.includes('PROYECTOR') || texto.includes('ECRAN')) return 'PROY';
    if (
      texto.includes('PC') ||
      texto.includes('COMPUTADORA') ||
      texto.includes('COMPUTO') ||
      texto.includes('CÓMPUTO') ||
      texto.includes('ESCRITORIO')
    ) {
      return 'PC';
    }
    if (texto.includes('ROBOTICA') || texto.includes('ROBÓTICA') || texto.includes('LEGO') || texto.includes('WEDO')) {
      return 'ROB';
    }
    return 'EQ';
  }

  /**
   * Calcula el mapa del correlativo numérico máximo actualmente usado para cada prefijo.
   */
  private async calcularMaximosPorPrefijo(): Promise<Map<string, number>> {
    const snap = await getDocs(this.colRef);
    const maximos = new Map<string, number>();

    for (const d of snap.docs) {
      const data = d.data();
      const etq = (data.etiqueta_interna || '').trim().toUpperCase();
      if (!etq || etq === 'S/E' || etq === 'SIN ETIQUETA' || etq === 'S/C') continue;

      const match = etq.match(/^([A-Z0-9]+)[-_]?(\d+)$/i);
      if (match) {
        const pref = match[1].toUpperCase();
        const num = parseInt(match[2], 10);
        if (!isNaN(num)) {
          maximos.set(pref, Math.max(maximos.get(pref) || 0, num));
        }
      }
    }

    return maximos;
  }

  /**
   * Genera una etiqueta interna correlativa única si no fue proporcionada (ej. LAP-001)
   */
  private async generarEtiquetaInterna(categoriaId: string, denominacion?: string): Promise<string> {
    const categoria = await categoriaRepository.obtenerPorId(categoriaId);
    const prefijo = this.resolverPrefijo(categoria, denominacion);
    const maximos = await this.calcularMaximosPorPrefijo();
    const siguienteNum = (maximos.get(prefijo) || 0) + 1;
    return `${prefijo}-${String(siguienteNum).padStart(3, '0')}`;
  }

  /**
   * Valida unicidad estricta de código patrimonial y serie entre bienes activos usando normalización
   */
  private async validarUnicidad(
    codigoPatrimonial: string,
    serie: string,
    ignorarId?: string
  ): Promise<void> {
    const normCod = normalizarCodigoPatrimonial(codigoPatrimonial);
    const normSerie = normalizarSerie(serie);

    if (!normCod && !normSerie) return;

    const snap = await getDocs(this.colRef);
    for (const d of snap.docs) {
      if (d.id === ignorarId) continue;
      const data = d.data();
      if (data.estado_operativo === 'DE_BAJA') continue;

      if (normCod) {
        const itemCodNorm = normalizarCodigoPatrimonial(data.codigo_patrimonial);
        if (itemCodNorm && itemCodNorm === normCod) {
          throw new Error(
            `Ya existe un bien activo registrado con el código patrimonial "${codigoPatrimonial}" (Coincide con "${data.codigo_patrimonial}" en [${data.etiqueta_interna || 'S/E'}] ${data.denominacion || 'Equipo'}).`
          );
        }
      }

      if (normSerie) {
        const itemSerieNorm = normalizarSerie(data.serie);
        if (itemSerieNorm && itemSerieNorm === normSerie) {
          throw new Error(
            `Ya existe un bien activo registrado con el número de serie "${serie}" (Coincide con "${data.serie}" en [${data.etiqueta_interna || 'S/E'}] ${data.denominacion || 'Equipo'}).`
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

    // Asignar etiqueta interna si está vacía o es S/E
    let etiqueta = bien.etiqueta_interna?.trim();
    if (!etiqueta || etiqueta.toUpperCase() === 'S/E' || etiqueta.toUpperCase() === 'SIN ETIQUETA') {
      etiqueta = await this.generarEtiquetaInterna(bien.categoria_id, bien.denominacion);
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
      lote_etiqueta: bien.lote_etiqueta?.trim() || '',
      lote_color: bien.lote_color?.trim() || '',
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
    if (cambios.lote_etiqueta !== undefined) {
      rawUpdate.lote_etiqueta = cambios.lote_etiqueta?.trim() || '';
    }
    if (cambios.lote_color !== undefined) {
      rawUpdate.lote_color = cambios.lote_color?.trim() || '';
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
   * Inserción masiva de bienes usando writeBatch en bloques de máximo 400 documentos,
   * garantizando que todo bien sin etiqueta o con "S/E" reciba automáticamente un código correlativo (ej. LAP-001).
   */
  async importarLote(
    bienes: Array<Omit<BienPatrimonial, 'id' | 'fecha_registro' | 'actualizado_en'>>,
    operador?: OperadorInfo
  ): Promise<{ insertados: number; omitidos: number; fallidos: number }> {
    if (bienes.length === 0) {
      return { insertados: 0, omitidos: 0, fallidos: 0 };
    }

    const [todasCategorias, maximos, snapExistentes] = await Promise.all([
      categoriaRepository.listar(),
      this.calcularMaximosPorPrefijo(),
      getDocs(this.colRef),
    ]);

    const catMap = new Map<string, { prefijo_etiqueta?: string; nombre?: string }>();
    todasCategorias.forEach((c) => catMap.set(c.id, c));

    // Cargar códigos y series activos existentes normalizados para blindaje anti-duplicados
    const codigosExistentes = new Set<string>();
    const seriesExistentes = new Set<string>();

    for (const d of snapExistentes.docs) {
      const data = d.data();
      if (data.estado_operativo !== 'DE_BAJA') {
        const cNorm = normalizarCodigoPatrimonial(data.codigo_patrimonial);
        const sNorm = normalizarSerie(data.serie);
        if (cNorm) codigosExistentes.add(cNorm);
        if (sNorm) seriesExistentes.add(sNorm);
      }
    }

    const CHUNK_SIZE = 400; // Respetar holgadamente el límite de 500 ops de Firestore
    let insertados = 0;
    let omitidos = 0;
    let fallidos = 0;

    for (let i = 0; i < bienes.length; i += CHUNK_SIZE) {
      const chunk = bienes.slice(i, i + CHUNK_SIZE);
      const batch = writeBatch(db);

      for (const item of chunk) {
        try {
          // Validar duplicado por código patrimonial o serie normalizados
          const cNorm = normalizarCodigoPatrimonial(item.codigo_patrimonial);
          const sNorm = normalizarSerie(item.serie);

          const esDuplicado =
            (Boolean(cNorm) && codigosExistentes.has(cNorm)) ||
            (Boolean(sNorm) && seriesExistentes.has(sNorm));

          if (esDuplicado) {
            omitidos++;
            continue;
          }

          if (cNorm) codigosExistentes.add(cNorm);
          if (sNorm) seriesExistentes.add(sNorm);

          const docRef = doc(this.colRef);

          // Resolver etiqueta interna automática si no se ingresó o es S/E
          let etq = item.etiqueta_interna?.trim() || '';
          const esFaltante =
            !etq ||
            etq.toUpperCase() === 'S/E' ||
            etq.toUpperCase() === 'SIN ETIQUETA' ||
            etq.toUpperCase() === 'S/C';

          if (esFaltante) {
            const cat = item.categoria_id ? catMap.get(item.categoria_id) : undefined;
            const prefijo = this.resolverPrefijo(cat, item.denominacion);
            const siguienteNum = (maximos.get(prefijo) || 0) + 1;
            maximos.set(prefijo, siguienteNum);
            etq = `${prefijo}-${String(siguienteNum).padStart(3, '0')}`;
          } else {
            const match = etq.match(/^([A-Z0-9]+)[-_]?(\d+)$/i);
            if (match) {
              const pref = match[1].toUpperCase();
              const num = parseInt(match[2], 10);
              if (!isNaN(num)) {
                maximos.set(pref, Math.max(maximos.get(pref) || 0, num));
              }
            }
          }

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
            lote_etiqueta: item.lote_etiqueta?.trim() || '',
            lote_color: item.lote_color?.trim() || '',
            etiqueta_interna: etq,
            codigo_qr:
              item.codigo_qr?.trim() && item.codigo_qr !== 'S/E' && item.codigo_qr !== 'S/C'
                ? item.codigo_qr.trim()
                : etq,
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
      detalle: `Importación masiva completada: ${insertados} bienes insertados, ${omitidos} omitidos por duplicidad, ${fallidos} errores.`,
    });

    return { insertados, omitidos, fallidos };
  }

  /**
   * Regulariza y asigna etiquetas QR correlativas (ej. LAP-XXX) a todos los bienes activos
   * que actualmente carecen de etiqueta o tienen "S/E" en Firestore.
   */
  async asignarEtiquetasFaltantes(
    operador?: OperadorInfo
  ): Promise<{ actualizados: number; asignadas: Array<{ id: string; etiqueta_interna: string }> }> {
    const [todasCategorias, snap] = await Promise.all([
      categoriaRepository.listar(),
      getDocs(this.colRef),
    ]);

    const catMap = new Map<string, { prefijo_etiqueta?: string; nombre?: string }>();
    todasCategorias.forEach((c) => catMap.set(c.id, c));

    // 1. Calcular número máximo actual por prefijo considerando bienes con etiqueta válida
    const maximos = new Map<string, number>();
    const bienesSinEtiqueta: Array<{ id: string; data: any }> = [];

    for (const d of snap.docs) {
      const data = d.data();
      const etq = (data.etiqueta_interna || '').trim();
      const esFaltante =
        !etq ||
        etq.toUpperCase() === 'S/E' ||
        etq.toUpperCase() === 'SIN ETIQUETA' ||
        etq.toUpperCase() === 'S/C';

      if (esFaltante) {
        if (data.estado_operativo !== 'DE_BAJA') {
          bienesSinEtiqueta.push({ id: d.id, data });
        }
      } else {
        const match = etq.match(/^([A-Z0-9]+)[-_]?(\d+)$/i);
        if (match) {
          const pref = match[1].toUpperCase();
          const num = parseInt(match[2], 10);
          if (!isNaN(num)) {
            maximos.set(pref, Math.max(maximos.get(pref) || 0, num));
          }
        }
      }
    }

    if (bienesSinEtiqueta.length === 0) {
      return { actualizados: 0, asignadas: [] };
    }

    // Ordenar bienes faltantes por fecha de registro o denominación para asignar correlativos ordenados
    bienesSinEtiqueta.sort((a, b) => {
      const fechaA = a.data.fecha_registro?.toDate?.()?.getTime() || 0;
      const fechaB = b.data.fecha_registro?.toDate?.()?.getTime() || 0;
      if (fechaA !== fechaB) return fechaA - fechaB;
      return (a.data.denominacion || '').localeCompare(b.data.denominacion || '');
    });

    const asignadas: Array<{ id: string; etiqueta_interna: string }> = [];
    const CHUNK_SIZE = 400;

    for (let i = 0; i < bienesSinEtiqueta.length; i += CHUNK_SIZE) {
      const chunk = bienesSinEtiqueta.slice(i, i + CHUNK_SIZE);
      const batch = writeBatch(db);

      for (const item of chunk) {
        const cat = item.data.categoria_id ? catMap.get(item.data.categoria_id) : undefined;
        const prefijo = this.resolverPrefijo(cat, item.data.denominacion);
        const siguienteNum = (maximos.get(prefijo) || 0) + 1;
        maximos.set(prefijo, siguienteNum);

        const nuevaEtiqueta = `${prefijo}-${String(siguienteNum).padStart(3, '0')}`;
        const ref = doc(this.colRef, item.id);

        batch.update(ref, {
          etiqueta_interna: nuevaEtiqueta,
          codigo_qr:
            item.data.codigo_qr && item.data.codigo_qr !== 'S/E' && item.data.codigo_qr !== 'S/C'
              ? item.data.codigo_qr
              : nuevaEtiqueta,
          actualizado_en: serverTimestamp(),
        });

        asignadas.push({ id: item.id, etiqueta_interna: nuevaEtiqueta });
      }

      await batch.commit();
    }

    // Registro de auditoría
    const operId = operador?.uid || auth.currentUser?.uid || '';
    const operEmail = operador?.email || auth.currentUser?.email || '';

    await auditoriaRepository.registrar({
      usuario_id: operId,
      usuario_email: operEmail,
      accion: 'UPDATE',
      coleccion: 'bienes',
      documento_id: 'regularizar_etiquetas',
      detalle: `Autogeneración y asignación de etiquetas QR correlativas a ${asignadas.length} equipos sin código (S/E).`,
    });

    return { actualizados: asignadas.length, asignadas };
  }

  /**
   * Actualización masiva de lote y color a un conjunto de bienes seleccionados
   */
  async asignarLoteMasivo(
    bienesIds: string[],
    loteEtiqueta: string,
    loteColor: string,
    operador?: OperadorInfo
  ): Promise<void> {
    if (bienesIds.length === 0) return;

    const cleanEtiqueta = loteEtiqueta.trim().toUpperCase();
    const cleanColor = loteColor.trim();
    const CHUNK_SIZE = 400;

    for (let i = 0; i < bienesIds.length; i += CHUNK_SIZE) {
      const chunk = bienesIds.slice(i, i + CHUNK_SIZE);
      const batch = writeBatch(db);

      for (const id of chunk) {
        const docRef = doc(this.colRef, id);
        batch.update(docRef, {
          lote_etiqueta: cleanEtiqueta,
          lote_color: cleanColor,
          actualizado_en: serverTimestamp(),
        });
      }

      await batch.commit();
    }

    const operId = operador?.uid || auth.currentUser?.uid || '';
    const operEmail = operador?.email || auth.currentUser?.email || '';

    await auditoriaRepository.registrar({
      usuario_id: operId,
      usuario_email: operEmail,
      accion: 'UPDATE',
      coleccion: 'bienes',
      documento_id: 'lote_masivo',
      detalle: `Asignación masiva de lote "${cleanEtiqueta || 'Sin Lote'}" (${cleanColor}) a ${bienesIds.length} equipos.`,
    });
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
      lote_etiqueta: data.lote_etiqueta || undefined,
      lote_color: data.lote_color || undefined,
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
