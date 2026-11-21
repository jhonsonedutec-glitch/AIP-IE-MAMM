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
} from '@/types';

export interface IBienRepository {
  listarTodos(): Promise<BienPatrimonial[]>;
  obtenerPorId(id: string): Promise<BienPatrimonial | null>;
  obtenerPorCodigo(codigo: string): Promise<BienPatrimonial | null>;
  crear(bien: Omit<BienPatrimonial, 'id' | 'fecha_registro' | 'actualizado_en'>): Promise<string>;
  actualizar(id: string, bien: Partial<BienPatrimonial>): Promise<void>;
  bajaLogica(id: string, motivo: string): Promise<void>;
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

export interface IAmbienteRepository {
  listar(): Promise<Ambiente[]>;
  obtenerPorId(id: string): Promise<Ambiente | null>;
  crear(ambiente: Omit<Ambiente, 'id'>): Promise<string>;
  actualizar(id: string, ambiente: Partial<Ambiente>): Promise<void>;
}

export interface ICategoriaRepository {
  listar(): Promise<CategoriaEquipo[]>;
  crear(categoria: Omit<CategoriaEquipo, 'id'>): Promise<string>;
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

export interface IConfiguracionRepository {
  obtenerInstitucion(): Promise<InstitucionConfig | null>;
  actualizarInstitucion(config: Partial<InstitucionConfig>): Promise<void>;
  obtenerUsuario(uid: string): Promise<UsuarioPerfil | null>;
}
