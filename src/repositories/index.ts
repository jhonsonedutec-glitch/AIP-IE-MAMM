import {
  IPrestamoRepository,
  IDocenteRepository,
} from './interfaces';

// Importación de repositorios reales de Fase 1, Fase 2 y Fase 3
import { configuracionRepository } from './firestore/FirestoreConfiguracionRepository';
import { ambienteRepository } from './firestore/FirestoreAmbienteRepository';
import { categoriaRepository } from './firestore/FirestoreCategoriaRepository';
import { usuarioRepository } from './firestore/FirestoreUsuarioRepository';
import { auditoriaRepository } from './firestore/FirestoreAuditoriaRepository';
import { bienRepository } from './firestore/FirestoreBienRepository';
import { movimientoRepository } from './firestore/FirestoreMovimientoRepository';
import { mantenimientoRepository } from './firestore/FirestoreMantenimientoRepository';

/**
 * Implementación esqueleto para los módulos de Fases 4 a 6.
 * En cada fase subsiguiente se reemplazarán por adaptadores desacoplados de Firestore.
 */
class PrestamoRepositoryEsqueleto implements IPrestamoRepository {
  async listarActivos() { return []; }
  async listarHistorial() { return []; }
  async obtenerPorId() { return null; }
  async registrarSalida() { return ''; }
  async registrarDevolucion() {}
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
  bienRepository,
  movimientoRepository,
  mantenimientoRepository,
};

export const prestamoRepository: IPrestamoRepository = new PrestamoRepositoryEsqueleto();
export const docenteRepository: IDocenteRepository = new DocenteRepositoryEsqueleto();

export * from './interfaces';
