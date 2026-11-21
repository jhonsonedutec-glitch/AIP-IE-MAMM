import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { InstitucionConfig, UsuarioPerfil } from '@/types';
import { IConfiguracionRepository } from '../interfaces';
import { auditoriaRepository } from './FirestoreAuditoriaRepository';

export const INSTITUCION_PREDETERMINADA: InstitucionConfig = {
  nombre_ie: 'I.E. Emblemática Manuel Antonio Mesones Muro',
  ugel: 'UGEL Bagua',
  dre: 'DRE Amazonas',
  nivel: 'Secundaria',
  lugar: 'Bagua',
  distrito: 'Bagua',
  anexo_default: '01',
  tipo_inventario: 'MAQUINAS Y EQUIPOS',
  responsable_nombre: 'Responsable del AIP',
  responsable_dni: '',
  responsable_celular: '',
  responsable_correo: '',
  logo_url: '',
};

export class FirestoreConfiguracionRepository implements IConfiguracionRepository {
  private docRef = doc(db, 'configuracion', 'institucion');

  async obtenerInstitucion(): Promise<InstitucionConfig | null> {
    const snap = await getDoc(this.docRef);
    if (!snap.exists()) {
      return null;
    }
    return snap.data() as InstitucionConfig;
  }

  async guardarInstitucion(config: InstitucionConfig): Promise<void> {
    await setDoc(this.docRef, config, { merge: true });
    await auditoriaRepository.registrar({
      usuario_id: '',
      usuario_email: '',
      accion: 'UPDATE',
      coleccion: 'configuracion',
      documento_id: 'institucion',
      detalle: `Actualización de cabecera institucional (${config.nombre_ie})`,
    });
  }

  async cargarValoresPredeterminados(): Promise<InstitucionConfig> {
    await this.guardarInstitucion(INSTITUCION_PREDETERMINADA);
    return INSTITUCION_PREDETERMINADA;
  }

  async obtenerUsuario(uid: string): Promise<UsuarioPerfil | null> {
    const userDocRef = doc(db, 'usuarios', uid);
    const snap = await getDoc(userDocRef);
    if (!snap.exists()) {
      return null;
    }
    const data = snap.data();
    return {
      uid: snap.id,
      nombres: data.nombres || '',
      email: data.email || '',
      rol: data.rol || 'DIRECCION',
      activo: data.activo !== false,
      creado_en: data.creado_en?.toDate ? data.creado_en.toDate().toISOString() : data.creado_en || '',
      ultimo_acceso: data.ultimo_acceso || data.ultimoAcceso || undefined,
      ultimoAcceso: data.ultimoAcceso || data.ultimo_acceso || undefined,
    };
  }
}

export const configuracionRepository = new FirestoreConfiguracionRepository();
