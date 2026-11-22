/**
 * SIGI-AIP MAMM - Contratos TypeScript del Sistema
 * Definidos según la Ficha Técnica de Arquitectura v1.0
 */

export type RolUsuario = 'ADMIN' | 'DIRECCION';

export type EstadoConservacion = 'N' | 'B' | 'R' | 'M'; // N: Nuevo, B: Bueno, R: Regular, M: Malo

export type EstadoOperativo = 'OPERATIVO' | 'EN_MANTENIMIENTO' | 'PRESTADO' | 'DE_BAJA';

export interface InstitucionConfig {
  nombre_ie: string;
  ugel: string;
  dre: string;
  nivel: string;
  lugar: string;
  distrito: string;
  anexo_default: string; // '01'
  tipo_inventario: string; // 'MAQUINAS Y EQUIPOS'
  responsable_nombre: string;
  responsable_dni: string;
  responsable_celular: string;
  responsable_correo: string;
  logo_url?: string;
}

export interface UsuarioPerfil {
  uid: string;
  nombres: string;
  email: string;
  rol: RolUsuario;
  activo: boolean;
  creado_en: string | Date;
  ultimo_acceso?: string | Date;
  ultimoAcceso?: string | Date;
}

export interface Ambiente {
  id: string;
  nombre: string;
  encargado: string;
  descripcion: string;
  activo: boolean;
  permite_prestamo?: boolean;
}

export function esAmbientePrestable(ambiente?: Ambiente | null): boolean {
  if (!ambiente) return false;
  if (typeof ambiente.permite_prestamo === 'boolean') {
    return ambiente.permite_prestamo;
  }
  return /aip/i.test(ambiente.nombre || '');
}

export interface CategoriaEquipo {
  id: string;
  nombre: string;
  prefijo_etiqueta: string;
  activo: boolean;
}

export interface BienPatrimonial {
  id: string;
  codigo_patrimonial: string;
  tipo_codigo: 'S/C' | 'CIC';
  denominacion: string;
  categoria_id: string;
  marca: string;
  modelo: string;
  color: string;
  serie: string;
  numero_serie?: string;
  activo?: boolean;
  estado_conservacion: EstadoConservacion;
  estado_operativo: EstadoOperativo;
  ambiente_id: string;
  ubicacion_detalle?: string;
  estacion_grupo?: string;
  etiqueta_interna?: string;
  observacion?: string;
  bloque_id?: string;
  lote_etiqueta?: string;
  lote_color?: string;
  codigo_qr: string;
  total_prestamos: number;
  motivo_baja?: string;
  fecha_baja?: string | Date;
  fecha_registro: string | Date;
  actualizado_en: string | Date;
}

export interface ColorLoteOpcion {
  nombre: string;
  color: string;
}

export const COLORES_LOTE_PREDEFINIDOS: ColorLoteOpcion[] = [
  { nombre: 'LOTE NARANJA', color: '#EA580C' },
  { nombre: 'LOTE VERDE', color: '#16A34A' },
  { nombre: 'LOTE AZUL', color: '#2563EB' },
  { nombre: 'LOTE AMARILLO', color: '#CA8A04' },
  { nombre: 'LOTE ROJO', color: '#DC2626' },
  { nombre: 'LOTE MORADO', color: '#7C3AED' },
];

export function deducirColorLote(nombreLote?: string): string {
  if (!nombreLote) return '#64748B';
  const upper = nombreLote.toUpperCase().trim();
  const match = COLORES_LOTE_PREDEFINIDOS.find(
    (item) => upper.includes(item.nombre) || upper.includes(item.nombre.replace('LOTE ', ''))
  );
  if (match) return match.color;
  if (upper.includes('CELESTE') || upper.includes('CYAN')) return '#06B6D4';
  if (upper.includes('ROSA') || upper.includes('PINK')) return '#EC4899';
  if (upper.includes('GRIS') || upper.includes('PLOMO')) return '#64748B';
  if (upper.includes('NEGRO')) return '#0F172A';
  if (upper.includes('BLANCO')) return '#94A3B8';
  return '#6366F1';
}

export function detectarLoteAutomatico(
  observaciones?: string,
  loteExplicito?: string,
  colorExplicito?: string,
  lotePorDefecto?: string
): { lote_etiqueta: string; lote_color: string } {
  // 1. Si existe lote explícito
  if (loteExplicito && loteExplicito.trim()) {
    const etq = loteExplicito.trim().toUpperCase();
    const color = colorExplicito && colorExplicito.trim() ? colorExplicito.trim() : deducirColorLote(etq);
    return { lote_etiqueta: etq, lote_color: color };
  }

  // 2. Si no viene lote explícito, analizar el texto de observaciones
  if (observaciones && observaciones.trim()) {
    const obsUpper = observaciones.toUpperCase();
    // Detección de VERDE y variante OCR YERDE (ej. LAPTOP 4 VERDE, LAPTOP 5 YERDE)
    if (obsUpper.includes('VERDE') || obsUpper.includes('YERDE')) {
      return { lote_etiqueta: 'LOTE VERDE', lote_color: '#16A34A' };
    }
    if (obsUpper.includes('NARANJA')) {
      return { lote_etiqueta: 'LOTE NARANJA', lote_color: '#EA580C' };
    }
    if (obsUpper.includes('AZUL')) {
      return { lote_etiqueta: 'LOTE AZUL', lote_color: '#2563EB' };
    }
    if (obsUpper.includes('AMARILLO')) {
      return { lote_etiqueta: 'LOTE AMARILLO', lote_color: '#CA8A04' };
    }
    if (obsUpper.includes('ROJO')) {
      return { lote_etiqueta: 'LOTE ROJO', lote_color: '#DC2626' };
    }
    if (obsUpper.includes('MORADO') || obsUpper.includes('VIOLETA')) {
      return { lote_etiqueta: 'LOTE MORADO', lote_color: '#7C3AED' };
    }
  }

  // 3. Fallback a lote por defecto si fue especificado
  if (lotePorDefecto && lotePorDefecto.trim()) {
    const etq = lotePorDefecto.trim().toUpperCase();
    return { lote_etiqueta: etq, lote_color: deducirColorLote(etq) };
  }

  return { lote_etiqueta: '', lote_color: '' };
}

export function compararEtiquetasNatural(a?: string, b?: string): number {
  return (a || '').localeCompare(b || '', undefined, { numeric: true, sensitivity: 'base' });
}

export interface MovimientoBien {
  id: string;
  bien_id: string;
  codigo_patrimonial: string;
  etiqueta_interna?: string;
  denominacion?: string;
  marca?: string;
  modelo?: string;
  serie?: string;
  estado_conservacion?: EstadoConservacion;
  ambiente_origen_id: string;
  ambiente_destino_id: string;
  ubicacion_detalle_destino?: string;
  responsable_entrega?: string;
  responsable_recepcion: string;
  motivo: string;
  usuario_id: string;
  usuario_email?: string;
  fecha_movimiento: string | Date;
  lote_id?: string;
}

export interface MantenimientoRegistro {
  id: string;
  bien_id: string;
  codigo_patrimonial: string;
  etiqueta_interna?: string;
  denominacion?: string;
  marca?: string;
  modelo?: string;
  serie?: string;
  tipo: 'PREVENTIVO' | 'CORRECTIVO';
  descripcion_falla: string;
  trabajo_realizado: string;
  repuestos: string;
  tecnico: string;
  fecha_inicio: string | Date;
  fecha_fin?: string | Date;
  estado_conservacion_inicial?: EstadoConservacion;
  estado_conservacion_resultante: EstadoConservacion;
  estado_operativo_resultante?: EstadoOperativo;
  cerrado: boolean;
}

export interface Docente {
  id: string;
  dni: string;
  nombres_apellidos: string;
  nombres?: string;
  apellidos?: string;
  especialidad?: string;
  area_principal_id?: string;
  celular?: string;
  telefono?: string;
  email?: string;
  activo: boolean;
}

export type BloqueEquipo = BloqueEquipos;
export type Bien = BienPatrimonial;
export type EstadoOperativoBien = EstadoOperativo;
export type EstadoConservacionBien = EstadoConservacion;
export type ConfiguracionSistema = InstitucionConfig;

export interface AreaCurricular {
  id: string;
  nombre: string;
  activo: boolean;
}

export interface BloqueEquipos {
  id: string;
  nombre: string;
  descripcion: string;
  codigo_qr_lote?: string;
  bienes_ids: string[];
  activo: boolean;
}

export interface Prestamo {
  id: string;
  tipo: 'INDIVIDUAL' | 'BLOQUE';
  bloque_id?: string | null;
  docente_id: string;
  docente_nombre: string;
  area_id: string;
  area_nombre: string;
  grado_seccion: string;
  ambiente_uso: string;
  bienes_ids: string[];
  cantidad_equipos: number;
  accesorios_entregados: string;
  fecha_salida: string | Date;
  fecha_devolucion_estimada: string | Date;
  fecha_devolucion_real?: string | Date | null;
  estado: 'ACTIVO' | 'DEVUELTO' | 'CON_INCIDENCIA';
  observacion_retorno?: string;
  usuario_entrega_id: string;
  usuario_recepcion_id?: string;
}

export interface PrestamoDetalle {
  bien_id: string;
  codigo_patrimonial: string;
  etiqueta_interna?: string;
  denominacion: string;
  cargador_entregado: boolean;
  estado_salida: EstadoConservacion;
  estado_retorno?: EstadoConservacion;
  incidencia?: string;
}

export interface AuditoriaLog {
  id: string;
  usuario_id: string;
  usuario_email: string;
  accion:
    | 'CREATE'
    | 'UPDATE'
    | 'TRASLADO'
    | 'BAJA'
    | 'IMPORT'
    | 'BACKUP_RESTORE'
    | 'USER_CHANGE'
    | 'PRESTAMO'
    | 'DEVOLUCION';
  coleccion: string;
  documento_id: string;
  detalle: string;
  fecha: string | Date;
}

export interface GrupoDuplicado {
  id: string;
  tipo: 'CODIGO_PATRIMONIAL' | 'SERIE' | 'AMBOS';
  clave: string;
  bienes: BienPatrimonial[];
}

/**
 * Normaliza un código patrimonial para comparaciones y validación estricta de unicidad.
 * Elimina espacios, guiones, puntos y prefijos no canónicos como 'C' antes de un código numérico (ej. 'C740805007042' -> '740805007042').
 * Retorna "" si es vacío o "S/C".
 */
export function normalizarCodigoPatrimonial(valor?: string): string {
  if (!valor) return '';
  const clean = valor.trim().toUpperCase();
  if (
    clean === 'S/C' ||
    clean === 'SC' ||
    clean === 'SIN CODIGO' ||
    clean === 'SIN CÓDIGO' ||
    clean === 'SIN_CODIGO' ||
    clean === 'NO' ||
    clean === 'NINGUNO' ||
    clean === '—' ||
    clean === '-'
  ) {
    return '';
  }

  // Quitar espacios internos, guiones, barras y puntos
  let res = clean.replace(/[\s\-_/.]/g, '');

  // Si tiene un prefijo accidental 'C' antes de un código numérico largo (ej. C740805007042 -> 740805007042)
  if (/^C\d{8,}$/i.test(res)) {
    res = res.substring(1);
  }

  return res.length >= 3 ? res : '';
}

/**
 * Normaliza un número de serie para comparaciones y validación estricta de unicidad.
 * Convierte a mayúsculas, elimina espacios internos, guiones, símbolos y sufijos aislados (ej. "PF4DMKGN E" y "PF4DMKGN" -> "PF4DMKGN").
 * Retorna "" si es vacío o "S/N".
 */
export function normalizarSerie(valor?: string): string {
  if (!valor) return '';
  const clean = valor.trim().toUpperCase();
  if (
    clean === 'S/N' ||
    clean === 'SN' ||
    clean === 'S/S' ||
    clean === 'SS' ||
    clean === 'SIN SERIE' ||
    clean === 'SIN_SERIE' ||
    clean === 'NO' ||
    clean === 'NINGUNO' ||
    clean === '—' ||
    clean === '-'
  ) {
    return '';
  }

  // Manejo de sufijos aislados como "PF4DMKGN E" -> "PF4DMKGN"
  const partes = clean.split(/\s+/);
  let base = clean;
  if (partes.length === 2 && partes[0].length >= 6 && partes[1].length <= 2) {
    base = partes[0];
  } else if (partes.length > 2 && partes[0].length >= 6) {
    const tokensExtra = partes.slice(1).join('');
    if (tokensExtra.length <= 2) {
      base = partes[0];
    }
  }

  // Eliminar espacios, guiones, barras, puntos y símbolos
  const res = base.replace(/[\s\-_/.]/g, '').replace(/[^A-Z0-9]/g, '');

  if (res === 'SN' || res === 'SS' || res === 'SINSERIE') {
    return '';
  }

  return res.length >= 3 ? res : '';
}
