import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  serverTimestamp,
  query,
  orderBy,
} from 'firebase/firestore';
import { initializeApp, deleteApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { db, auth, firebaseConfig } from '@/config/firebase';
import { UsuarioPerfil, RolUsuario } from '@/types';
import { IUsuarioRepository } from '../interfaces';
import { auditoriaRepository } from './FirestoreAuditoriaRepository';

export class FirestoreUsuarioRepository implements IUsuarioRepository {
  private colRef = collection(db, 'usuarios');

  async obtenerPorId(uid: string): Promise<UsuarioPerfil | null> {
    const snap = await getDoc(doc(this.colRef, uid));
    if (!snap.exists()) return null;
    const d = snap.data();
    return {
      uid: snap.id,
      nombres: d.nombres || '',
      email: d.email || '',
      rol: d.rol || 'DIRECCION',
      activo: d.activo !== false,
      creado_en: d.creado_en?.toDate ? d.creado_en.toDate().toISOString() : d.creado_en || '',
      ultimo_acceso: d.ultimo_acceso || d.ultimoAcceso || undefined,
      ultimoAcceso: d.ultimoAcceso || d.ultimo_acceso || undefined,
    };
  }

  async listar(): Promise<UsuarioPerfil[]> {
    const q = query(this.colRef, orderBy('nombres', 'asc'));
    const snap = await getDocs(q);
    return snap.docs.map((d) => {
      const data = d.data();
      return {
        uid: d.id,
        nombres: data.nombres || '',
        email: data.email || '',
        rol: data.rol || 'DIRECCION',
        activo: data.activo !== false,
        creado_en: data.creado_en?.toDate ? data.creado_en.toDate().toISOString() : data.creado_en || '',
        ultimo_acceso: data.ultimo_acceso || data.ultimoAcceso || undefined,
        ultimoAcceso: data.ultimoAcceso || data.ultimo_acceso || undefined,
      };
    });
  }

  /**
   * Creación de usuarios en Plan Spark de Firebase sin cerrar la sesión del ADMIN actual.
   * Inicializa una aplicación secundaria efímera y la elimina inmediatamente en el bloque finally.
   */
  async crearUsuario(datos: {
    nombres: string;
    email: string;
    password: string;
    rol: RolUsuario;
  }): Promise<string> {
    const appName = `secondary-user-creation-${Date.now()}`;
    const secondaryApp = initializeApp(firebaseConfig, appName);
    const secondaryAuth = getAuth(secondaryApp);

    try {
      const cred = await createUserWithEmailAndPassword(
        secondaryAuth,
        datos.email.trim(),
        datos.password
      );
      const newUid = cred.user.uid;

      // Guardar el documento de perfil con la instancia principal autenticada como ADMIN
      await setDoc(doc(this.colRef, newUid), {
        uid: newUid,
        nombres: datos.nombres.trim(),
        email: datos.email.trim().toLowerCase(),
        rol: datos.rol,
        activo: true,
        creado_en: serverTimestamp(),
      });

      await auditoriaRepository.registrar({
        usuario_id: auth.currentUser?.uid || '',
        usuario_email: auth.currentUser?.email || '',
        accion: 'USER_CHANGE',
        coleccion: 'usuarios',
        documento_id: newUid,
        detalle: `Creación de usuario institucional: ${datos.email} (${datos.nombres}) con rol ${datos.rol}`,
      });

      return newUid;
    } finally {
      try {
        await signOut(secondaryAuth);
      } catch {
        // Ignorar si ya no hay sesión
      }
      try {
        await deleteApp(secondaryApp);
      } catch {
        // Ignorar si la app ya fue liberada
      }
    }
  }

  async actualizarRol(uid: string, nuevoRol: RolUsuario): Promise<void> {
    await updateDoc(doc(this.colRef, uid), { rol: nuevoRol });
    await auditoriaRepository.registrar({
      usuario_id: auth.currentUser?.uid || '',
      usuario_email: auth.currentUser?.email || '',
      accion: 'USER_CHANGE',
      coleccion: 'usuarios',
      documento_id: uid,
      detalle: `Modificación de rol a '${nuevoRol}' para el usuario ID ${uid}`,
    });
  }

  async cambiarEstadoActivo(uid: string, activo: boolean): Promise<void> {
    await updateDoc(doc(this.colRef, uid), { activo });
    await auditoriaRepository.registrar({
      usuario_id: auth.currentUser?.uid || '',
      usuario_email: auth.currentUser?.email || '',
      accion: 'USER_CHANGE',
      coleccion: 'usuarios',
      documento_id: uid,
      detalle: `Cambio de estado activo a ${activo} para el usuario ID ${uid}`,
    });
  }

  async actualizarUltimoAcceso(uid: string): Promise<void> {
    try {
      await updateDoc(doc(this.colRef, uid), {
        ultimoAcceso: serverTimestamp(),
      });
    } catch (error) {
      console.warn('[UsuarioRepository] No se pudo actualizar ultimoAcceso:', error);
    }
  }
}

export const usuarioRepository = new FirestoreUsuarioRepository();
