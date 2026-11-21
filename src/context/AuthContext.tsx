import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  User,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
} from 'firebase/auth';
import { auth } from '@/config/firebase';
import { UsuarioPerfil } from '@/types';
import { usuarioRepository } from '@/repositories';

export interface AuthContextType {
  user: User | null;
  perfil: UsuarioPerfil | null;
  loading: boolean;
  error: string | null;
  login: (email: string, pass: string) => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function traducirErrorAuth(codigo: string): string {
  switch (codigo) {
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return 'Correo o contraseña incorrectos. Verifique sus credenciales.';
    case 'auth/invalid-email':
      return 'El formato del correo electrónico ingresado no es válido.';
    case 'auth/user-disabled':
      return 'La cuenta de usuario ha sido deshabilitada por administración.';
    case 'auth/too-many-requests':
      return 'Acceso temporalmente bloqueado por múltiples intentos fallidos. Espere un momento.';
    case 'auth/network-request-failed':
      return 'Error de red. Verifique la conexión a internet de la institución.';
    default:
      return 'Ocurrió un error al autenticar. Intente nuevamente.';
  }
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [perfil, setPerfil] = useState<UsuarioPerfil | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setLoading(true);
      if (firebaseUser) {
        try {
          const userPerfil = await usuarioRepository.obtenerPorId(firebaseUser.uid);

          if (!userPerfil) {
            await signOut(auth);
            setUser(null);
            setPerfil(null);
            setError(
              'Acceso denegado: Su cuenta no está registrada en el padrón del sistema SIGI-AIP MAMM.'
            );
            setLoading(false);
            return;
          }

          if (userPerfil.activo === false) {
            await signOut(auth);
            setUser(null);
            setPerfil(null);
            setError(
              'Acceso denegado: Su cuenta institucional ha sido desactivada. Consulte con el DAIP o Dirección.'
            );
            setLoading(false);
            return;
          }

          // Usuario verificado y activo
          setUser(firebaseUser);
          setPerfil(userPerfil);
          setError(null);

          // Actualizar último acceso de forma asíncrona
          usuarioRepository.actualizarUltimoAcceso(firebaseUser.uid).catch(() => {});
        } catch (err: any) {
          console.error('[AuthContext] Error al leer perfil de usuario:', err);
          setError('Error al cargar perfil de usuario. Verifique permisos o conexión.');
          setUser(null);
          setPerfil(null);
        }
      } else {
        setUser(null);
        setPerfil(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const login = async (email: string, pass: string) => {
    setError(null);
    try {
      await signInWithEmailAndPassword(auth, email.trim(), pass);
    } catch (err: any) {
      const msg = traducirErrorAuth(err.code || '');
      setError(msg);
      throw new Error(msg);
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
    } finally {
      setUser(null);
      setPerfil(null);
      setError(null);
    }
  };

  const resetPassword = async (email: string) => {
    try {
      await sendPasswordResetEmail(auth, email.trim());
    } catch (err: any) {
      const msg = traducirErrorAuth(err.code || '');
      throw new Error(msg);
    }
  };

  const clearError = () => setError(null);

  return (
    <AuthContext.Provider
      value={{
        user,
        perfil,
        loading,
        error,
        login,
        logout,
        resetPassword,
        clearError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe ser utilizado dentro de un AuthProvider');
  }
  return context;
};
