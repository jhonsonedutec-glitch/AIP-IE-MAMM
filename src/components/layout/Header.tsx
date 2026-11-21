import React from 'react';
import { School, ShieldCheck } from 'lucide-react';

export const Header: React.FC = () => {
  return (
    <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between shrink-0 shadow-sm">
      <div className="flex items-center space-x-3">
        <School className="w-5 h-5 text-slate-500" />
        <div>
          <span className="font-semibold text-slate-800 text-sm">
            I.E. Emblemática Manuel Antonio Mesones Muro
          </span>
          <span className="text-xs text-slate-500 ml-2 border-l border-slate-300 pl-2">
            UGEL Bagua – DRE Amazonas
          </span>
        </div>
      </div>

      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-2 text-xs text-slate-600 bg-slate-100 px-3 py-1.5 rounded-full">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span className="font-medium">Arquitectura Base: Opción B</span>
        </div>
        <div className="text-right">
          <p className="text-xs font-semibold text-slate-800">Admin AIP (Fase 0)</p>
          <p className="text-[10px] text-slate-500">Sesión Local de Verificación</p>
        </div>
      </div>
    </header>
  );
};
