import React, { useState } from 'react';
import { Settings, Building2, Users, FolderTree } from 'lucide-react';
import { RoleGuard } from '@/modules/auth/RoleGuard';
import { PestanaInstitucion } from './PestanaInstitucion';
import { PestanaUsuarios } from './PestanaUsuarios';
import { PestanaCatalogos } from './PestanaCatalogos';

type TabType = 'institucion' | 'usuarios' | 'catalogos';

export const ConfiguracionModule: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('institucion');

  return (
    <RoleGuard allowedRoles={['ADMIN']}>
      <div className="space-y-6 max-w-6xl mx-auto">
        {/* Cabecera del Módulo */}
        <div className="border-b border-slate-200 pb-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-emerald-100 text-emerald-800 rounded-lg">
              <Settings className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-800">
                Configuración Institucional
              </h1>
              <p className="text-xs sm:text-sm text-slate-500">
                Parámetros del Anexo 01, administración de roles RBAC y catálogos maestros del AIP.
              </p>
            </div>
          </div>

          {/* Navegación por Pestañas */}
          <div className="flex space-x-1 sm:space-x-2 mt-6 border-b border-slate-200 -mb-4 overflow-x-auto">
            <button
              onClick={() => setActiveTab('institucion')}
              className={`flex items-center space-x-2 py-3 px-4 text-xs sm:text-sm font-semibold border-b-2 transition-colors whitespace-nowrap ${
                activeTab === 'institucion'
                  ? 'border-emerald-600 text-emerald-700 bg-emerald-50/50 rounded-t-lg'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Building2 className="w-4 h-4" />
              <span>Pestaña A: Datos Institucionales</span>
            </button>

            <button
              onClick={() => setActiveTab('usuarios')}
              className={`flex items-center space-x-2 py-3 px-4 text-xs sm:text-sm font-semibold border-b-2 transition-colors whitespace-nowrap ${
                activeTab === 'usuarios'
                  ? 'border-emerald-600 text-emerald-700 bg-emerald-50/50 rounded-t-lg'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>Pestaña B: Gestión de Usuarios y Roles</span>
            </button>

            <button
              onClick={() => setActiveTab('catalogos')}
              className={`flex items-center space-x-2 py-3 px-4 text-xs sm:text-sm font-semibold border-b-2 transition-colors whitespace-nowrap ${
                activeTab === 'catalogos'
                  ? 'border-emerald-600 text-emerald-700 bg-emerald-50/50 rounded-t-lg'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <FolderTree className="w-4 h-4" />
              <span>Pestaña C: Catálogos Dinámicos</span>
            </button>
          </div>
        </div>

        {/* Contenido de la Pestaña Activa */}
        <div className="pt-2">
          {activeTab === 'institucion' && <PestanaInstitucion />}
          {activeTab === 'usuarios' && <PestanaUsuarios />}
          {activeTab === 'catalogos' && <PestanaCatalogos />}
        </div>
      </div>
    </RoleGuard>
  );
};
