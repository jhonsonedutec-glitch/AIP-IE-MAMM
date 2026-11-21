import React from 'react';
import { ShieldCheck, LogOut } from 'lucide-react';
import { useAuth } from '@/hooks';

export const Header: React.FC = () => {
  const { perfil, logout } = useAuth();

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-4 sm:px-6 flex items-center justify-between shrink-0 shadow-xs gap-3">
      <div className="flex items-center space-x-3 min-w-0 flex-1">
        <img
          src="/logo-mamm.jpg"
          alt="Insignia MAMM"
          className="w-7 h-7 object-contain shrink-0 rounded-sm bg-white p-0.5 shadow-2xs border border-slate-200"
        />
        <div className="min-w-0 truncate">
          <span className="font-semibold text-slate-800 text-sm truncate whitespace-nowrap inline-block max-w-[220px] sm:max-w-none">
            I.E. Emblemática Manuel Antonio Mesones Muro
          </span>
          <span className="hidden md:inline text-xs text-slate-500 ml-2 border-l border-slate-300 pl-2 whitespace-nowrap">
            UGEL Bagua – DRE Amazonas
          </span>
        </div>
      </div>

      <div className="flex items-center space-x-4">
        <div className="hidden sm:flex items-center space-x-2 text-xs bg-slate-100 text-slate-700 px-3 py-1.5 rounded-full border border-slate-200">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span className="font-medium">
            Rol: <strong className="text-slate-900">{perfil?.rol || 'No asignado'}</strong>
          </span>
        </div>

        <div className="text-right">
          <p className="text-xs font-semibold text-slate-800">
            {perfil?.nombres || perfil?.email || 'Usuario'}
          </p>
          <p className="text-[10px] text-slate-500">{perfil?.email}</p>
        </div>

        <button
          onClick={() => logout()}
          className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-rose-700 hover:bg-rose-50 border border-slate-200 hover:border-rose-200 rounded-lg transition-colors"
          title="Cerrar Sesión Institucional"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span className="hidden md:inline">Salir</span>
        </button>
      </div>
    </header>
  );
};
