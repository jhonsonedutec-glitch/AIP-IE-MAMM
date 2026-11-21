import React from 'react';
import {
  CheckCircle2,
  Database,
  Layers,
  Server,
  ShieldAlert,
  Wifi,
  WifiOff,
  FolderTree,
  FileCheck,
} from 'lucide-react';
import { useOnlineStatus } from '@/hooks';

export const VerificationPage: React.FC = () => {
  const isOnline = useOnlineStatus();

  const checks = [
    {
      title: 'Vite + React 18 + TypeScript + Tailwind CSS',
      desc: 'Compilación estricta y estilos responsivos configurados correctamente.',
      icon: CheckCircle2,
      status: 'Operativo',
    },
    {
      title: 'Cloud Firestore con Persistencia Offline Nativa',
      desc: 'persistentLocalCache y persistentMultipleTabManager habilitados para cortes de red escolar.',
      icon: Database,
      status: 'Inicializado',
    },
    {
      title: 'Capa de Repositorios Desacoplados',
      desc: 'src/repositories/ preparado para traspaso Opción B e integración futura con servidor escolar HP.',
      icon: Server,
      status: 'Desacoplado',
    },
    {
      title: 'Contratos TypeScript Estrictos (Anexo 01)',
      desc: 'Modelos para Bienes, Préstamos, Ambientes, Docentes, Áreas y Mantenimientos.',
      icon: FileCheck,
      status: 'Tipado Ficha v1.0',
    },
    {
      title: 'Estructura Modular según Ficha Técnica',
      desc: 'Carpetas para auth, dashboard, inventario, distribucion, prestamos, mantenimiento, reportes y configuracion.',
      icon: FolderTree,
      status: 'Estructurado',
    },
    {
      title: 'Seguridad y Protección de Secretos',
      desc: '.gitignore estricto (.env, llaves, excels de inventario real) y firestore.rules restrictivo.',
      icon: ShieldAlert,
      status: 'Protegido',
    },
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Banner Principal */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-emerald-950 text-white rounded-2xl p-6 sm:p-8 shadow-md border border-slate-700">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center space-x-2 px-3 py-1 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-full text-xs font-semibold mb-3">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span>Fase 0 Concluida con Éxito</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
              SIGI-AIP MAMM - Entorno Base Operativo
            </h1>
            <p className="text-slate-300 text-sm sm:text-base mt-2 max-w-2xl leading-relaxed">
              Cimientos arquitectónicos desplegados para la I.E. Emblemática Manuel Antonio
              Mesones Muro (Bagua). Arquitectura desacoplada lista para Fases 1 a 7.
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/10 flex flex-col items-center justify-center min-w-[200px]">
            <span className="text-xs text-slate-300 font-medium">Estado de Conectividad</span>
            <div className="flex items-center mt-2 space-x-2">
              {isOnline ? (
                <>
                  <Wifi className="w-5 h-5 text-emerald-400 animate-bounce" />
                  <span className="font-bold text-emerald-300 text-base">En línea</span>
                </>
              ) : (
                <>
                  <WifiOff className="w-5 h-5 text-amber-400" />
                  <span className="font-bold text-amber-300 text-base">Sin conexión</span>
                </>
              )}
            </div>
            <span className="text-[11px] text-slate-400 mt-1">
              {isOnline ? 'Conexión a internet detectada' : 'Modo offline local activo'}
            </span>
          </div>
        </div>
      </div>

      {/* Tarjetas de Verificación Técnica */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {checks.map((check, idx) => {
          const Icon = check.icon;
          return (
            <div
              key={idx}
              className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="p-2.5 bg-emerald-50 text-emerald-700 rounded-lg">
                    <Icon className="w-5 h-5" />
                  </div>
                  <span className="text-[11px] font-semibold text-emerald-800 bg-emerald-100/80 px-2.5 py-0.5 rounded-full">
                    {check.status}
                  </span>
                </div>
                <h3 className="font-semibold text-slate-800 text-sm">{check.title}</h3>
                <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">{check.desc}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Panel Informativo de Arquitectura Híbrida */}
      <div className="bg-slate-100 rounded-xl p-5 border border-slate-200 flex items-start space-x-4">
        <div className="p-2 bg-slate-800 text-white rounded-lg mt-0.5">
          <Layers className="w-5 h-5" />
        </div>
        <div className="text-xs text-slate-600 leading-relaxed">
          <p className="font-semibold text-slate-800 text-sm mb-1">
            Garantía de Traspaso Limpio (Opción B) y Servidor Escolar
          </p>
          <p>
            Ningún componente de la interfaz de usuario importa directamente el SDK de Firestore.
            Todas las operaciones se canalizan a través de <code className="text-emerald-700 bg-emerald-50 px-1 py-0.5 rounded">src/repositories/</code>.
            Esto garantiza que el proyecto podrá migrar de cuenta de Firebase sin modificar código y,
            a futuro, consumir el servidor local <strong>HP ProLiant ML110 G7</strong> del colegio cuando
            se habilite la Fase Híbrida B.
          </p>
        </div>
      </div>
    </div>
  );
};
