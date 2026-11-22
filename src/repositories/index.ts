// Importación de repositorios reales de Fase 1, Fase 2, Fase 3 y Fase 4
import { configuracionRepository } from './firestore/FirestoreConfiguracionRepository';
import { ambienteRepository } from './firestore/FirestoreAmbienteRepository';
import { categoriaRepository } from './firestore/FirestoreCategoriaRepository';
import { usuarioRepository } from './firestore/FirestoreUsuarioRepository';
import { auditoriaRepository } from './firestore/FirestoreAuditoriaRepository';
import { bienRepository } from './firestore/FirestoreBienRepository';
import { movimientoRepository } from './firestore/FirestoreMovimientoRepository';
import { mantenimientoRepository } from './firestore/FirestoreMantenimientoRepository';
import { prestamoRepository } from './firestore/FirestorePrestamoRepository';
import { docenteRepository } from './firestore/FirestoreDocenteRepository';
import { areaCurricularRepository } from './firestore/FirestoreAreaCurricularRepository';
import { bloqueRepository } from './firestore/FirestoreBloqueRepository';
import { verificacionRepository } from './firestore/FirestoreVerificacionRepository';

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
  prestamoRepository,
  docenteRepository,
  areaCurricularRepository,
  bloqueRepository,
  verificacionRepository,
};

export * from './interfaces';
