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
  GraduationCap,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { useOnlineStatus } from '@/hooks';

interface NavItem {
  name: string;
  to: string;
  icon: React.ComponentType<{ className?: string }>;
}

const navItems: NavItem[] = [
  { name: 'Dashboard', to: '/dashboard', icon: LayoutDashboard },
  { name: 'Inventario', to: '/inventario', icon: Box },
  { name: 'Distribución', to: '/distribucion', icon: ArrowLeftRight },
  { name: 'Préstamos QR', to: '/prestamos', icon: QrCode },
  { name: 'Mantenimiento', to: '/mantenimiento', icon: Wrench },
  { name: 'Reportes y Backups', to: '/reportes', icon: FileSpreadsheet },
  { name: 'Configuración', to: '/configuracion', icon: Settings },
];

export const Sidebar: React.FC = () => {
  const isOnline = useOnlineStatus();

  return (
    <aside className="w-64 bg-slate-900 text-slate-200 flex flex-col border-r border-slate-800 shrink-0 select-none">
      {/* Encabezado Institucional */}
      <div className="p-5 border-b border-slate-800">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-emerald-600 rounded-lg text-white shadow-md">
            <GraduationCap className="w-6 h-6" />
          </div>
          <div>
            <h1 className="font-bold text-base leading-tight tracking-wide text-white">
              SIGI-AIP MAMM
            </h1>
            <p className="text-xs text-slate-400">I.E. M. A. Mesones Muro</p>
          </div>
        </div>
        <div className="mt-3 text-[11px] font-medium text-emerald-400 bg-emerald-950/60 border border-emerald-800/60 px-2 py-0.5 rounded flex items-center justify-between">
          <span>Nivel Secundaria - Bagua</span>
          <span className="text-[10px] text-slate-400">Fase 0</span>
        </div>
      </div>

      {/* Navegación por Módulos */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        <div className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
          Módulos Principales
        </div>
        {navItems.map((item) => {
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

      {/* Indicador de Estado de Conexión Online / Offline */}
      <div className="p-4 border-t border-slate-800 bg-slate-950/40">
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-400 font-medium">Estado Red:</span>
          {isOnline ? (
            <span className="inline-flex items-center text-emerald-400 font-semibold bg-emerald-950/60 px-2 py-1 rounded-full border border-emerald-800/80">
              <Wifi className="w-3.5 h-3.5 mr-1.5 animate-pulse text-emerald-400" />
              En línea
            </span>
          ) : (
            <span className="inline-flex items-center text-amber-400 font-semibold bg-amber-950/60 px-2 py-1 rounded-full border border-amber-800/80">
              <WifiOff className="w-3.5 h-3.5 mr-1.5 text-amber-400" />
              Modo sin conexión
            </span>
          )}
        </div>
        <p className="text-[10px] text-slate-500 mt-2 text-center">
          Persistencia offline nativa activa
        </p>
      </div>
    </aside>
  );
};
