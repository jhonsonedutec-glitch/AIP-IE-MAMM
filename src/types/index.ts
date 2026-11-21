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
  codigo_qr: string;
  total_prestamos: number;
  motivo_baja?: string;
  fecha_baja?: string | Date;
  fecha_registro: string | Date;
  actualizado_en: string | Date;
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
