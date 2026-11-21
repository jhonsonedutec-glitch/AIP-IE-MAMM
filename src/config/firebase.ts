import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  Firestore,
  getFirestore
} from 'firebase/firestore';

/**
 * Validación estricta de credenciales de Firebase.
 * Se leen exclusivamente desde import.meta.env según la Ficha Técnica.
 */
const requiredEnvVars = [
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_AUTH_DOMAIN',
  'VITE_FIREBASE_PROJECT_ID',
  'VITE_FIREBASE_STORAGE_BUCKET',
  'VITE_FIREBASE_MESSAGING_SENDER_ID',
  'VITE_FIREBASE_APP_ID',
] as const;

const missingVars = requiredEnvVars.filter((envKey) => !import.meta.env[envKey]);

if (missingVars.length > 0) {
  const message = `[SIGI-AIP MAMM] Error de Configuración: Faltan las siguientes variables en su archivo de entorno: ${missingVars.join(
    ', '
  )}. Por favor configure su archivo .env basándose en .env.example.`;
  console.error(message);
}

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || '',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || '',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '',
};

// Inicialización de la aplicación Firebase (Singleton)
export const app: FirebaseApp =
  getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Servicio de Autenticación
export const auth: Auth = getAuth(app);

// Inicialización de Cloud Firestore con persistencia offline nativa multi-pestaña
// Diseñado para soportar cortes frecuentes de conectividad en el entorno escolar
let firestoreInstance: Firestore;
try {
  firestoreInstance = initializeFirestore(app, {
    localCache: persistentLocalCache({
      tabManager: persistentMultipleTabManager(),
    }),
  });
} catch {
  // En caso de reinicializaciones en desarrollo o HMR, recuperar instancia existente
  firestoreInstance = getFirestore(app);
}

export const db: Firestore = firestoreInstance;
