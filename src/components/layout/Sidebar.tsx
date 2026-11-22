import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Box,
  ArrowLeftRight,
  QrCode,
  Wrench,
  FileSpreadsheet,
  Settings,
  Wifi,
  WifiOff,
  LogOut,
  UserCheck,
} from 'lucide-react';
import { useOnlineStatus, useAuth } from '@/hooks';

interface NavItem {
  name: string;
  to: string;
  icon: React.ComponentType<{ className?: string }>;
  adminOnly?: boolean;
}

const navItems: NavItem[] = [
  { name: 'Dashboard', to: '/dashboard', icon: LayoutDashboard },
  { name: 'Inventario', to: '/inventario', icon: Box },
  { name: 'Distribución', to: '/distribucion', icon: ArrowLeftRight },
  { name: 'Préstamos QR', to: '/prestamos', icon: QrCode },
  { name: 'Mantenimiento', to: '/mantenimiento', icon: Wrench },
  { name: 'Reportes y Backups', to: '/reportes', icon: FileSpreadsheet },
  { name: 'Configuración', to: '/configuracion', icon: Settings, adminOnly: true },
];

export const Sidebar: React.FC = () => {
  const isOnline = useOnlineStatus();
  const { perfil, logout } = useAuth();

  // Filtrar módulos según RBAC: ocultar Configuración si no es ADMIN
  const visibleItems = navItems.filter((item) => {
    if (item.adminOnly) {
      return perfil?.rol === 'ADMIN';
    }
    return true;
  });

  return (
    <aside className="no-print w-64 bg-slate-900 text-slate-200 flex flex-col border-r border-slate-800 shrink-0 select-none">
      {/* Encabezado Institucional */}
      <div className="p-5 border-b border-slate-800">
        <div className="flex items-center space-x-3">
          <div className="w-11 h-11 bg-white p-1 rounded-xl shadow-sm shrink-0 flex items-center justify-center">
            <img
              src="/logo-mamm.jpg"
              alt="Insignia MAMM"
              className="w-full h-full object-contain"
            />
          </div>
          <div className="min-w-0">
            <h1 className="font-bold text-base leading-tight tracking-wide text-white truncate">
              SIGI-AIP MAMM
            </h1>
            <p className="text-xs text-slate-400 truncate">I.E. M. A. Mesones Muro</p>
          </div>
        </div>
        <div className="mt-3 text-[11px] font-medium text-emerald-400 bg-emerald-950/60 border border-emerald-800/60 px-2 py-0.5 rounded flex items-center justify-between">
          <span>Nivel Secundaria - Bagua</span>
          <span className="text-[10px] text-slate-300">
            {perfil?.rol === 'ADMIN' ? 'Admin AIP' : 'Dirección'}
          </span>
        </div>
      </div>

      {/* Navegación por Módulos */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        <div className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
          Módulos Principales
        </div>
        {visibleItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`
              }
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span>{item.name}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* Perfil del Usuario y Cerrar Sesión */}
      <div className="p-3 border-t border-slate-800 bg-slate-950/60">
        <div className="flex items-center justify-between px-2 py-2 mb-2 rounded-lg bg-slate-900 border border-slate-800">
          <div className="flex items-center space-x-2.5 overflow-hidden">
            <div className="w-7 h-7 rounded-full bg-emerald-600/30 border border-emerald-500/50 flex items-center justify-center text-emerald-400 shrink-0">
              <UserCheck className="w-3.5 h-3.5" />
            </div>
            <div className="truncate">
              <p className="text-xs font-semibold text-white truncate">
                {perfil?.nombres || perfil?.email || 'Usuario'}
              </p>
              <p className="text-[10px] text-emerald-400 font-medium">
                {perfil?.rol === 'ADMIN' ? 'Administrador AIP' : 'Equipo Directivo'}
              </p>
            </div>
          </div>
          <button
            onClick={() => logout()}
            title="Cerrar Sesión"
            className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-950/30 rounded-md transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>

        {/* Indicador de Red */}
        <div className="flex items-center justify-between text-xs px-2 py-1">
          <span className="text-slate-400 text-[11px]">Conexión:</span>
          {isOnline ? (
            <span className="inline-flex items-center text-emerald-400 text-[11px] font-semibold">
              <Wifi className="w-3 h-3 mr-1 text-emerald-400" />
              En línea
            </span>
          ) : (
            <span className="inline-flex items-center text-amber-400 text-[11px] font-semibold">
              <WifiOff className="w-3 h-3 mr-1 text-amber-400" />
              Sin conexión
            </span>
          )}
        </div>
      </div>
    </aside>
  );
};
