import {
  collection,
  addDoc,
  getDocs,
  query,
  orderBy,
  limit,
  serverTimestamp,
} from 'firebase/firestore';
import { db, auth } from '@/config/firebase';
import { AuditoriaLog } from '@/types';
import { IAuditoriaRepository } from '../interfaces';

export class FirestoreAuditoriaRepository implements IAuditoriaRepository {
  private colRef = collection(db, 'auditoria_logs');

  async registrar(log: Omit<AuditoriaLog, 'id' | 'fecha'>): Promise<string> {
    const usuarioActual = auth.currentUser;
    const docData = {
      usuario_id: log.usuario_id || usuarioActual?.uid || 'SISTEMA',
      usuario_email: log.usuario_email || usuarioActual?.email || 'sistema@aip.edu.pe',
      accion: log.accion,
      coleccion: log.coleccion,
      documento_id: log.documento_id,
      detalle: log.detalle,
      fecha: serverTimestamp(),
    };

    const docAdded = await addDoc(this.colRef, docData);
    return docAdded.id;
  }

  async listar(limiteRegistros = 50): Promise<AuditoriaLog[]> {
    const q = query(this.colRef, orderBy('fecha', 'desc'), limit(limiteRegistros));
    const snap = await getDocs(q);
    return snap.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        usuario_id: data.usuario_id || '',
        usuario_email: data.usuario_email || '',
        accion: data.accion,
        coleccion: data.coleccion || '',
        documento_id: data.documento_id || '',
        detalle: data.detalle || '',
        fecha: data.fecha?.toDate ? data.fecha.toDate().toISOString() : data.fecha || new Date().toISOString(),
      };
    });
  }
}

export const auditoriaRepository = new FirestoreAuditoriaRepository();
