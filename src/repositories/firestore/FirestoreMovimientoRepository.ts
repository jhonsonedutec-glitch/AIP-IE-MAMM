import {
  collection,
  doc,
  getDocs,
  query,
  where,
  orderBy,
  serverTimestamp,
  writeBatch,
} from 'firebase/firestore';
import { db, auth } from '@/config/firebase';
import { MovimientoBien } from '@/types';
import { IMovimientoRepository, OperadorInfo } from '../interfaces';
import { bienRepository } from './FirestoreBienRepository';
import { auditoriaRepository } from './FirestoreAuditoriaRepository';
import { ambienteRepository } from './FirestoreAmbienteRepository';

function limpiarUndefined<T extends Record<string, any>>(obj: T): T {
  const limpio: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      limpio[key] = value;
    }
  }
  return limpio as T;
}

export class FirestoreMovimientoRepository implements IMovimientoRepository {
  private colRef = collection(db, 'movimientos');
  private bienesColRef = collection(db, 'bienes');

  /**
   * Lista todos los movimientos históricos ordenados por fecha descendente
   */
  async listar(): Promise<MovimientoBien[]> {
    const q = query(this.colRef, orderBy('fecha_movimiento', 'desc'));
    const snap = await getDocs(q);
    return snap.docs.map((d) => this.mapDocToMovimiento(d.id, d.data()));
  }

  /**
   * Lista los movimientos asociados a un bien patrimonial específico
   */
  async listarPorBien(bienId: string): Promise<MovimientoBien[]> {
    const q = query(this.colRef, where('bien_id', '==', bienId));
    const snap = await getDocs(q);
    const movimientos = snap.docs.map((d) => this.mapDocToMovimiento(d.id, d.data()));
    // Ordenar en memoria por fecha descendente para evitar requerir índice compuesto
    return movimientos.sort((a, b) => {
      const timeA = new Date(a.fecha_movimiento).getTime();
      const timeB = new Date(b.fecha_movimiento).getTime();
      return timeB - timeA;
    });
  }

  /**
   * Registra un traslado individual de forma atómica con writeBatch
   */
  async registrarTraslado(
    movimiento: Omit<MovimientoBien, 'id' | 'fecha_movimiento'>,
    usuarioOperador?: OperadorInfo
  ): Promise<string> {
    const bien = await bienRepository.obtenerPorId(movimiento.bien_id);
    if (!bien) {
      throw new Error(`El bien con ID ${movimiento.bien_id} no fue encontrado.`);
    }

    if (bien.estado_operativo === 'DE_BAJA') {
      throw new Error('No se puede trasladar un bien que ha sido dado de baja.');
    }

    // Validar si el destino es idéntico al origen (salvo cambio de detalle en Otros)
    const ambienteDestino = await ambienteRepository.obtenerPorId(movimiento.ambiente_destino_id);
    const esDestinoOtros = ambienteDestino?.nombre.trim().toLowerCase() === 'otros';

    if (bien.ambiente_id === movimiento.ambiente_destino_id) {
      if (!esDestinoOtros) {
        throw new Error('El bien ya se encuentra ubicado en el ambiente de destino seleccionado.');
      } else if (
        (bien.ubicacion_detalle || '').trim().toUpperCase() ===
        (movimiento.ubicacion_detalle_destino || '').trim().toUpperCase()
      ) {
        throw new Error('El bien ya se encuentra en este ambiente con la misma especificación.');
      }
    }

    const operId = usuarioOperador?.uid || auth.currentUser?.uid || 'SISTEMA';
    const operEmail = usuarioOperador?.email || auth.currentUser?.email || '';

    const batch = writeBatch(db);
    const movDocRef = doc(this.colRef);
    const bienDocRef = doc(this.bienesColRef, bien.id);

    const movData = limpiarUndefined({
      bien_id: bien.id,
      codigo_patrimonial: bien.codigo_patrimonial,
      etiqueta_interna: bien.etiqueta_interna || '',
      denominacion: bien.denominacion || '',
      marca: bien.marca || '',
      modelo: bien.modelo || '',
      serie: bien.serie || '',
      estado_conservacion: bien.estado_conservacion,
      ambiente_origen_id: bien.ambiente_id,
      ambiente_destino_id: movimiento.ambiente_destino_id,
      ubicacion_detalle_destino: esDestinoOtros ? (movimiento.ubicacion_detalle_destino?.trim() || '') : '',
      responsable_entrega: movimiento.responsable_entrega?.trim() || operEmail || 'Responsable AIP',
      responsable_recepcion: movimiento.responsable_recepcion.trim(),
      motivo: movimiento.motivo.trim(),
      usuario_id: operId,
      usuario_email: operEmail,
      lote_id: movimiento.lote_id || '',
      fecha_movimiento: serverTimestamp(),
    });

    // 1) Crear registro inmutable en movimientos
    batch.set(movDocRef, movData);

    // 2) Actualizar ubicación en el bien patrimonial
    batch.update(bienDocRef, {
      ambiente_id: movimiento.ambiente_destino_id,
      ubicacion_detalle: esDestinoOtros ? (movimiento.ubicacion_detalle_destino?.trim() || '') : '',
      actualizado_en: serverTimestamp(),
    });

    await batch.commit();

    // 3) Registrar evento de auditoría
    await auditoriaRepository.registrar({
      usuario_id: operId,
      usuario_email: operEmail,
      accion: 'CREATE',
      coleccion: 'movimientos',
      documento_id: movDocRef.id,
      detalle: `Traslado de bien ${bien.codigo_patrimonial} (${bien.denominacion}) de ambiente ${bien.ambiente_id} a ${movimiento.ambiente_destino_id}. Motivo: ${movimiento.motivo}`,
    });

    return movDocRef.id;
  }

  /**
   * Registra traslados en bloque (traslado masivo) de forma atómica con writeBatch
   */
  async registrarTrasladoMasivo(
    bienIds: string[],
    ambienteDestinoId: string,
    ubicacionDetalleDestino: string,
    motivo: string,
    responsableReceptor: string,
    responsableEntrega?: string,
    usuarioOperador?: OperadorInfo
  ): Promise<{ loteId: string; totalMovimientos: number }> {
    if (bienIds.length === 0) {
      throw new Error('Debe seleccionar al menos un bien para realizar el traslado.');
    }

    const ambienteDestino = await ambienteRepository.obtenerPorId(ambienteDestinoId);
    if (!ambienteDestino) {
      throw new Error('El ambiente de destino seleccionado no existe.');
    }
    const esDestinoOtros = ambienteDestino.nombre.trim().toLowerCase() === 'otros';

    if (esDestinoOtros && !ubicacionDetalleDestino.trim()) {
      throw new Error('Al trasladar al ambiente Otros, debe especificar la ubicación detallada.');
    }

    // Generar un identificador único de acta de traslado (ej. TRAS-202611-1234)
    const fechaPrefix = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const loteId = `ACTA-${fechaPrefix}-${randomSuffix}`;

    const operId = usuarioOperador?.uid || auth.currentUser?.uid || 'SISTEMA';
    const operEmail = usuarioOperador?.email || auth.currentUser?.email || '';

    // Cargar todos los bienes seleccionados
    const bienes = await Promise.all(bienIds.map((id) => bienRepository.obtenerPorId(id)));
    const bienesValidos = bienes.filter((b): b is NonNullable<typeof b> => b !== null);

    if (bienesValidos.length === 0) {
      throw new Error('Ninguno de los bienes seleccionados es válido.');
    }

    // Validar que ninguno esté dado de baja
    const dadosDeBaja = bienesValidos.filter((b) => b.estado_operativo === 'DE_BAJA');
    if (dadosDeBaja.length > 0) {
      throw new Error(
        `No se pueden trasladar bienes dados de baja (${dadosDeBaja.map((b) => b.codigo_patrimonial).join(', ')}).`
      );
    }

    // Procesar en chunks de máximo 200 documentos (cada bien genera 2 ops: set + update = 400 ops)
    const CHUNK_SIZE = 200;
    for (let i = 0; i < bienesValidos.length; i += CHUNK_SIZE) {
      const chunk = bienesValidos.slice(i, i + CHUNK_SIZE);
      const batch = writeBatch(db);

      for (const bien of chunk) {
        const movDocRef = doc(this.colRef);
        const bienDocRef = doc(this.bienesColRef, bien.id);

        const movData = limpiarUndefined({
          bien_id: bien.id,
          codigo_patrimonial: bien.codigo_patrimonial,
          etiqueta_interna: bien.etiqueta_interna || '',
          denominacion: bien.denominacion || '',
          marca: bien.marca || '',
          modelo: bien.modelo || '',
          serie: bien.serie || '',
          estado_conservacion: bien.estado_conservacion,
          ambiente_origen_id: bien.ambiente_id,
          ambiente_destino_id: ambienteDestinoId,
          ubicacion_detalle_destino: esDestinoOtros ? ubicacionDetalleDestino.trim() : '',
          responsable_entrega: responsableEntrega?.trim() || operEmail || 'Responsable AIP',
          responsable_recepcion: responsableReceptor.trim(),
          motivo: motivo.trim(),
          usuario_id: operId,
          usuario_email: operEmail,
          lote_id: loteId,
          fecha_movimiento: serverTimestamp(),
        });

        batch.set(movDocRef, movData);

        batch.update(bienDocRef, {
          ambiente_id: ambienteDestinoId,
          ubicacion_detalle: esDestinoOtros ? ubicacionDetalleDestino.trim() : '',
          actualizado_en: serverTimestamp(),
        });
      }

      await batch.commit();
    }

    // Auditoría consolidada
    await auditoriaRepository.registrar({
      usuario_id: operId,
      usuario_email: operEmail,
      accion: 'CREATE',
      coleccion: 'movimientos',
      documento_id: loteId,
      detalle: `Traslado masivo de ${bienesValidos.length} bienes al ambiente ${ambienteDestino.nombre} (Acta: ${loteId}). Motivo: ${motivo.trim()}`,
    });

    return { loteId, totalMovimientos: bienesValidos.length };
  }

  private mapDocToMovimiento(id: string, data: any): MovimientoBien {
    return {
      id,
      bien_id: data.bien_id || '',
      codigo_patrimonial: data.codigo_patrimonial || 'S/C',
      etiqueta_interna: data.etiqueta_interna || '',
      denominacion: data.denominacion || '',
      marca: data.marca || '',
      modelo: data.modelo || '',
      serie: data.serie || '',
      estado_conservacion: data.estado_conservacion || 'B',
      ambiente_origen_id: data.ambiente_origen_id || '',
      ambiente_destino_id: data.ambiente_destino_id || '',
      ubicacion_detalle_destino: data.ubicacion_detalle_destino || '',
      responsable_entrega: data.responsable_entrega || '',
      responsable_recepcion: data.responsable_recepcion || '',
      motivo: data.motivo || '',
      usuario_id: data.usuario_id || '',
      usuario_email: data.usuario_email || '',
      lote_id: data.lote_id || undefined,
      fecha_movimiento: data.fecha_movimiento?.toDate
        ? data.fecha_movimiento.toDate().toISOString()
        : data.fecha_movimiento || new Date().toISOString(),
    };
  }
}

export const movimientoRepository = new FirestoreMovimientoRepository();
