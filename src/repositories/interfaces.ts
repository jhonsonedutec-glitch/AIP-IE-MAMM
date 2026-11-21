import {
  BienPatrimonial,
  Prestamo,
  Ambiente,
  CategoriaEquipo,
  MantenimientoRegistro,
  MovimientoBien,
  Docente,
  AreaCurricular,
  BloqueEquipos,
  InstitucionConfig,
  UsuarioPerfil,
  AuditoriaLog,
  RolUsuario,
} from '@/types';

export interface IUsuarioRepository {
  obtenerPorId(uid: string): Promise<UsuarioPerfil | null>;
  listar(): Promise<UsuarioPerfil[]>;
  crearUsuario(datos: {
    nombres: string;
    email: string;
    password: string;
    rol: RolUsuario;
  }): Promise<string>;
  actualizarRol(uid: string, nuevoRol: RolUsuario): Promise<void>;
  cambiarEstadoActivo(uid: string, activo: boolean): Promise<void>;
  actualizarUltimoAcceso(uid: string): Promise<void>;
}

export interface IAuditoriaRepository {
  registrar(log: Omit<AuditoriaLog, 'id' | 'fecha'>): Promise<string>;
  listar(limite?: number): Promise<AuditoriaLog[]>;
}

export interface IAmbienteRepository {
  listar(): Promise<Ambiente[]>;
  obtenerPorId(id: string): Promise<Ambiente | null>;
  crear(ambiente: Omit<Ambiente, 'id'>): Promise<string>;
  actualizar(id: string, ambiente: Partial<Ambiente>): Promise<void>;
  cambiarEstado(id: string, activo: boolean): Promise<void>;
  inicializarAmbientesBase(): Promise<void>;
}

export interface ICategoriaRepository {
  listar(): Promise<CategoriaEquipo[]>;
  obtenerPorId(id: string): Promise<CategoriaEquipo | null>;
  crear(categoria: Omit<CategoriaEquipo, 'id'>): Promise<string>;
  actualizar(id: string, categoria: Partial<CategoriaEquipo>): Promise<void>;
  cambiarEstado(id: string, activo: boolean): Promise<void>;
  inicializarCategoriasBase(): Promise<void>;
}

export interface IConfiguracionRepository {
  obtenerInstitucion(): Promise<InstitucionConfig | null>;
  guardarInstitucion(config: InstitucionConfig): Promise<void>;
  cargarValoresPredeterminados(): Promise<InstitucionConfig>;
  obtenerUsuario(uid: string): Promise<UsuarioPerfil | null>;
}

export interface OperadorInfo {
  uid?: string;
  email?: string;
}

export interface IBienRepository {
  listar(): Promise<BienPatrimonial[]>;
  listarTodos(): Promise<BienPatrimonial[]>;
  obtenerPorId(id: string): Promise<BienPatrimonial | null>;
  buscarPorCodigo(codigo: string): Promise<BienPatrimonial | null>;
  obtenerPorCodigo(codigo: string): Promise<BienPatrimonial | null>;
  crear(
    bien: Omit<BienPatrimonial, 'id' | 'fecha_registro' | 'actualizado_en'>,
    usuarioOperador?: OperadorInfo
  ): Promise<string>;
  actualizar(
    id: string,
    cambios: Partial<BienPatrimonial>,
    usuarioOperador?: OperadorInfo
  ): Promise<void>;
  darDeBaja(
    id: string,
    motivo: string,
    usuarioOperador?: OperadorInfo
  ): Promise<void>;
  bajaLogica(
    id: string,
    motivo: string,
    usuarioOperador?: OperadorInfo
  ): Promise<void>;
  importarLote(
    bienes: Array<Omit<BienPatrimonial, 'id' | 'fecha_registro' | 'actualizado_en'>>,
    usuarioOperador?: OperadorInfo
  ): Promise<{ insertados: number; omitidos: number; fallidos: number }>;
}

export interface IPrestamoRepository {
  listar(): Promise<Prestamo[]>;
  listarActivos(): Promise<Prestamo[]>;
  listarHistorial(limite?: number): Promise<Prestamo[]>;
  listarPorBien(bienId: string): Promise<Prestamo[]>;
  obtenerPorId(id: string): Promise<Prestamo | null>;
  registrarPrestamo(
    prestamo: Omit<Prestamo, 'id'>,
    usuarioOperador?: OperadorInfo
  ): Promise<string>;
  registrarDevolucion(
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
  ): Promise<void>;
  registrarSalida?(prestamo: Omit<Prestamo, 'id'>): Promise<string>;
}

export interface IMantenimientoRepository {
  listar(): Promise<MantenimientoRegistro[]>;
  listarPorBien(bienId: string): Promise<MantenimientoRegistro[]>;
  abrirMantenimiento(
    datos: {
      bienId: string;
      tipo: 'PREVENTIVO' | 'CORRECTIVO';
      descripcionFalla: string;
      tecnico: string;
      fechaInicio?: string | Date;
    },
    usuarioOperador?: OperadorInfo
  ): Promise<string>;
  cerrarMantenimiento(
    mantenimientoId: string,
    cierre: {
      fechaFin?: string | Date;
      trabajoRealizado: string;
      repuestos: string;
      estadoConservacionResultante: BienPatrimonial['estado_conservacion'];
      estadoOperativoResultante: BienPatrimonial['estado_operativo'];
    },
    usuarioOperador?: OperadorInfo
  ): Promise<void>;
  registrar?(registro: Omit<MantenimientoRegistro, 'id'>): Promise<string>;
  cerrar?(
    id: string,
    fechaFin: string | Date,
    trabajoRealizado: string,
    repuestos: string,
    estadoConservacion: BienPatrimonial['estado_conservacion']
  ): Promise<void>;
}

export interface IMovimientoRepository {
  listar(): Promise<MovimientoBien[]>;
  listarPorBien(bienId: string): Promise<MovimientoBien[]>;
  registrarTraslado(
    movimiento: Omit<MovimientoBien, 'id' | 'fecha_movimiento'>,
    usuarioOperador?: OperadorInfo
  ): Promise<string>;
  registrarTrasladoMasivo(
    bienIds: string[],
    ambienteDestinoId: string,
    ubicacionDetalleDestino: string,
    motivo: string,
    responsableReceptor: string,
    responsableEntrega?: string,
    usuarioOperador?: OperadorInfo
  ): Promise<{ loteId: string; totalMovimientos: number }>;
}

export interface IDocenteRepository {
  listar(): Promise<Docente[]>;
  listarActivos(): Promise<Docente[]>;
  listarDocentes(): Promise<Docente[]>;
  obtenerPorId(id: string): Promise<Docente | null>;
  obtenerPorDni(dni: string): Promise<Docente | null>;
  crear(docente: Omit<Docente, 'id'>, usuarioOperador?: OperadorInfo): Promise<string>;
  actualizar(id: string, cambios: Partial<Docente>, usuarioOperador?: OperadorInfo): Promise<void>;
  desactivar(id: string, usuarioOperador?: OperadorInfo): Promise<void>;
  listarAreas?(): Promise<AreaCurricular[]>;
}

export interface IAreaCurricularRepository {
  listar(): Promise<AreaCurricular[]>;
  listarActivas(): Promise<AreaCurricular[]>;
  obtenerPorId(id: string): Promise<AreaCurricular | null>;
  crear(area: Omit<AreaCurricular, 'id'>, usuarioOperador?: OperadorInfo): Promise<string>;
  actualizar(id: string, cambios: Partial<AreaCurricular>, usuarioOperador?: OperadorInfo): Promise<void>;
  desactivar(id: string, usuarioOperador?: OperadorInfo): Promise<void>;
  inicializarAreasBase(usuarioOperador?: OperadorInfo): Promise<number>;
}

export interface IBloqueRepository {
  listar(): Promise<BloqueEquipos[]>;
  listarActivos(): Promise<BloqueEquipos[]>;
  obtenerPorId(id: string): Promise<BloqueEquipos | null>;
  crear(bloque: Omit<BloqueEquipos, 'id'>, usuarioOperador?: OperadorInfo): Promise<string>;
  actualizar(id: string, cambios: Partial<BloqueEquipos>, usuarioOperador?: OperadorInfo): Promise<void>;
  desactivar(id: string, usuarioOperador?: OperadorInfo): Promise<void>;
}
