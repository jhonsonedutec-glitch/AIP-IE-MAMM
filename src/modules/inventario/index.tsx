import React from 'react';

export const InventarioModule: React.FC = () => {
  return (
    <div className="space-y-4">
      <div className="border-b border-slate-200 pb-4">
        <h1 className="text-2xl font-bold text-slate-800">Inventario Tecnológico</h1>
        <p className="text-sm text-slate-500">Control patrimonial compatible con Formato Oficial Anexo 01</p>
      </div>
      <div className="p-8 text-center bg-white rounded-xl border border-slate-200 shadow-sm">
        <p className="text-slate-600 font-medium">Módulo previsto para Fase 2.</p>
      </div>
    </div>
  );
};
