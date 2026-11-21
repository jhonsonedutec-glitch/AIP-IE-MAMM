import {
  BienPatrimonial,
  Prestamo,
  Ambiente,
  CategoriaEquipo,
  MantenimientoRegistro,
  MovimientoBien,
  Docente,
  AreaCurricular,
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
  listarActivos(): Promise<Prestamo[]>;
  listarHistorial(limite?: number): Promise<Prestamo[]>;
  obtenerPorId(id: string): Promise<Prestamo | null>;
  registrarSalida(prestamo: Omit<Prestamo, 'id'>): Promise<string>;
  registrarDevolucion(
    id: string,
    fechaReal: string | Date,
    estado: 'DEVUELTO' | 'CON_INCIDENCIA',
    observacion?: string,
    usuarioRecepcionId?: string
  ): Promise<void>;
}

export interface IMantenimientoRepository {
  listar(): Promise<MantenimientoRegistro[]>;
  registrar(registro: Omit<MantenimientoRegistro, 'id'>): Promise<string>;
  cerrar(
    id: string,
    fechaFin: string | Date,
    trabajoRealizado: string,
    repuestos: string,
    estadoConservacion: BienPatrimonial['estado_conservacion']
  ): Promise<void>;
}

export interface IMovimientoRepository {
  listarPorBien(bienId: string): Promise<MovimientoBien[]>;
  registrarTraslado(movimiento: Omit<MovimientoBien, 'id'>): Promise<string>;
}

export interface IDocenteRepository {
  listarDocentes(): Promise<Docente[]>;
  listarAreas(): Promise<AreaCurricular[]>;
}
