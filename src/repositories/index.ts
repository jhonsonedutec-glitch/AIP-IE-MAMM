import {
  IBienRepository,
  IPrestamoRepository,
  IAmbienteRepository,
  ICategoriaRepository,
  IMantenimientoRepository,
  IMovimientoRepository,
  IDocenteRepository,
  IConfiguracionRepository,
} from './interfaces';

/**
 * Implementación esqueleto base para Firestore.
 * En las Fases 1-6 se implementarán los métodos con llamadas desacopladas.
 * Esta capa garantiza que si la institución migra a un servidor local (Fase Híbrida B),
 * solo se sustituirá este adaptador sin tocar vistas ni componentes de negocio.
 */

class BienRepositoryFirebase implements IBienRepository {
  async listarTodos() {
    return [];
  }
  async obtenerPorId() {
    return null;
  }
  async obtenerPorCodigo() {
    return null;
  }
  async crear() {
    return '';
  }
  async actualizar() {}
  async bajaLogica() {}
}

class PrestamoRepositoryFirebase implements IPrestamoRepository {
  async listarActivos() {
    return [];
  }
  async listarHistorial() {
    return [];
  }
  async obtenerPorId() {
    return null;
  }
  async registrarSalida() {
    return '';
  }
  async registrarDevolucion() {}
}

class AmbienteRepositoryFirebase implements IAmbienteRepository {
  async listar() {
    return [];
  }
  async obtenerPorId() {
    return null;
  }
  async crear() {
    return '';
  }
  async actualizar() {}
}

class CategoriaRepositoryFirebase implements ICategoriaRepository {
  async listar() {
    return [];
  }
  async crear() {
    return '';
  }
}

class MantenimientoRepositoryFirebase implements IMantenimientoRepository {
  async listar() {
    return [];
  }
  async registrar() {
    return '';
  }
  async cerrar() {}
}

class MovimientoRepositoryFirebase implements IMovimientoRepository {
  async listarPorBien() {
    return [];
  }
  async registrarTraslado() {
    return '';
  }
}

class DocenteRepositoryFirebase implements IDocenteRepository {
  async listarDocentes() {
    return [];
  }
  async listarAreas() {
    return [];
  }
}

class ConfiguracionRepositoryFirebase implements IConfiguracionRepository {
  async obtenerInstitucion() {
    return null;
  }
  async actualizarInstitucion() {}
  async obtenerUsuario() {
    return null;
  }
}

// Instancias exportadas como Singletons desacoplados
export const bienRepository: IBienRepository = new BienRepositoryFirebase();
export const prestamoRepository: IPrestamoRepository = new PrestamoRepositoryFirebase();
export const ambienteRepository: IAmbienteRepository = new AmbienteRepositoryFirebase();
export const categoriaRepository: ICategoriaRepository = new CategoriaRepositoryFirebase();
export const mantenimientoRepository: IMantenimientoRepository = new MantenimientoRepositoryFirebase();
export const movimientoRepository: IMovimientoRepository = new MovimientoRepositoryFirebase();
export const docenteRepository: IDocenteRepository = new DocenteRepositoryFirebase();
export const configuracionRepository: IConfiguracionRepository = new ConfiguracionRepositoryFirebase();

export * from './interfaces';
