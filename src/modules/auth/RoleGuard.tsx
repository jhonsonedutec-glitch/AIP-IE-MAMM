import React from 'react';
import { ShieldAlert } from 'lucide-react';
import { useAuth } from '@/hooks';
import { RolUsuario } from '@/types';

interface RoleGuardProps {
  allowedRoles: RolUsuario[];
  children: React.ReactNode;
}

export const RoleGuard: React.FC<RoleGuardProps> = ({ allowedRoles, children }) => {
  const { perfil, loading } = useAuth();

  if (loading) {
    return (
      <div className="p-8 text-center text-slate-500 text-xs">
        Verificando permisos de acceso...
      </div>
    );
  }

  if (!perfil || !allowedRoles.includes(perfil.rol)) {
    return (
      <div className="max-w-2xl mx-auto my-12 p-8 bg-white rounded-2xl border border-amber-200 shadow-sm text-center">
        <div className="w-12 h-12 mx-auto bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center mb-4">
          <ShieldAlert className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-bold text-slate-800">Acceso Restringido por Rol</h2>
        <p className="text-xs text-slate-600 mt-2 max-w-md mx-auto leading-relaxed">
          Su rol actual (<span className="font-semibold text-slate-800">{perfil?.rol || 'Sin Rol'}</span>) no cuenta con permisos suficientes para acceder a este módulo. Esta sección está reservada exclusivamente para roles:{' '}
          <span className="font-semibold text-emerald-700">{allowedRoles.join(', ')}</span>.
        </p>
      </div>
    );
  }

  return <>{children}</>;
};
