import {
  IBienRepository,
  IPrestamoRepository,
  IMantenimientoRepository,
  IMovimientoRepository,
  IDocenteRepository,
} from './interfaces';

// Importación de repositorios reales de Fase 1
import { configuracionRepository } from './firestore/FirestoreConfiguracionRepository';
import { ambienteRepository } from './firestore/FirestoreAmbienteRepository';
import { categoriaRepository } from './firestore/FirestoreCategoriaRepository';
import { usuarioRepository } from './firestore/FirestoreUsuarioRepository';
import { auditoriaRepository } from './firestore/FirestoreAuditoriaRepository';

/**
 * Implementación esqueleto para los módulos de Fases 2 a 6.
 * En cada fase subsiguiente se reemplazarán por adaptadores desacoplados de Firestore.
 */
class BienRepositoryEsqueleto implements IBienRepository {
  async listarTodos() { return []; }
  async obtenerPorId() { return null; }
  async obtenerPorCodigo() { return null; }
  async crear() { return ''; }
  async actualizar() {}
  async bajaLogica() {}
}

class PrestamoRepositoryEsqueleto implements IPrestamoRepository {
  async listarActivos() { return []; }
  async listarHistorial() { return []; }
  async obtenerPorId() { return null; }
  async registrarSalida() { return ''; }
  async registrarDevolucion() {}
}

class MantenimientoRepositoryEsqueleto implements IMantenimientoRepository {
  async listar() { return []; }
  async registrar() { return ''; }
  async cerrar() {}
}

class MovimientoRepositoryEsqueleto implements IMovimientoRepository {
  async listarPorBien() { return []; }
  async registrarTraslado() { return ''; }
}

class DocenteRepositoryEsqueleto implements IDocenteRepository {
  async listarDocentes() { return []; }
  async listarAreas() { return []; }
}

// Exportación de instancias desacopladas
export {
  configuracionRepository,
  ambienteRepository,
  categoriaRepository,
  usuarioRepository,
  auditoriaRepository,
};

export const bienRepository: IBienRepository = new BienRepositoryEsqueleto();
export const prestamoRepository: IPrestamoRepository = new PrestamoRepositoryEsqueleto();
export const mantenimientoRepository: IMantenimientoRepository = new MantenimientoRepositoryEsqueleto();
export const movimientoRepository: IMovimientoRepository = new MovimientoRepositoryEsqueleto();
export const docenteRepository: IDocenteRepository = new DocenteRepositoryEsqueleto();

export * from './interfaces';
