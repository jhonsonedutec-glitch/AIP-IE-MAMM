import React from 'react';
import { Link } from 'react-router-dom';
import {
  Database,
  Layers,
  Server,
  ShieldCheck,
  Wifi,
  WifiOff,
  FileCheck,
  Settings,
  Lock,
} from 'lucide-react';
import { useOnlineStatus, useAuth } from '@/hooks';

export const VerificationPage: React.FC = () => {
  const isOnline = useOnlineStatus();
  const { perfil } = useAuth();

  const checks = [
    {
      title: 'Seguridad en Servidor (firestore.rules)',
      desc: 'Matriz RBAC activa para ADMIN y DIRECCION con default-deny y auditoría inmutable.',
      icon: ShieldCheck,
      status: 'RBAC Activo',
    },
    {
      title: 'Autenticación Institucional y useAuth',
      desc: 'onAuthStateChanged, validación de estado activo y actualización de último acceso.',
      icon: Lock,
      status: 'Operativo',
    },
    {
      title: 'Módulo de Configuración Institucional',
      desc: 'Pestañas A (Cabecera Anexo 01), B (Usuarios y Roles Spark) y C (Catálogos Dinámicos).',
      icon: Settings,
      status: 'Fase 1 Lista',
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
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Banner Principal */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-emerald-950 text-white rounded-2xl p-6 sm:p-8 shadow-md border border-slate-700">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center space-x-2 px-3 py-1 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-full text-xs font-semibold mb-3">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span>Fase 1: Seguridad, RBAC y Configuración Concluida</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
              SIGI-AIP MAMM - Entorno Base Operativo
            </h1>
            <p className="text-slate-300 text-sm sm:text-base mt-2 max-w-2xl leading-relaxed">
              Autenticación segura, control de acceso por roles (RBAC) y módulo de configuración
              desplegados para la I.E. Emblemática Manuel Antonio Mesones Muro (Bagua).
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

      {/* Acceso Rápido a Configuración si es ADMIN */}
      {perfil?.rol === 'ADMIN' && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-emerald-600 text-white rounded-lg">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-emerald-900">Módulo de Configuración Listo</h4>
              <p className="text-xs text-emerald-700">
                Configure la cabecera Anexo 01, cree usuarios con la instancia secundaria y gestione ambientes/categorías.
              </p>
            </div>
          </div>
          <Link
            to="/configuracion"
            className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors shrink-0 text-center"
          >
            Abrir Configuración
          </Link>
        </div>
      )}

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
            Toda la comunicación de datos en la Fase 1 pasa exclusivamente a través de los adaptadores en{' '}
            <code className="text-emerald-700 bg-emerald-50 px-1 py-0.5 rounded font-mono">
              src/repositories/
            </code>
            . Ninguna vista ni formulario invoca directamente las funciones de consulta de Cloud Firestore.
          </p>
        </div>
      </div>
    </div>
  );
};
