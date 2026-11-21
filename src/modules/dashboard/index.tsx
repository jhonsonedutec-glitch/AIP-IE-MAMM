import React from 'react';

export const DashboardModule: React.FC = () => {
  return (
    <div className="space-y-4">
      <div className="border-b border-slate-200 pb-4">
        <h1 className="text-2xl font-bold text-slate-800">Panel Principal y Analítica TIC</h1>
        <p className="text-sm text-slate-500">Métricas pedagógicas y estado operativo del inventario</p>
      </div>
      <div className="p-8 text-center bg-white rounded-xl border border-slate-200 shadow-sm">
        <p className="text-slate-600 font-medium">Módulo previsto para Fase 5.</p>
        <p className="text-xs text-slate-400 mt-1">Estructura base lista para integración con Recharts y Cloud Firestore.</p>
      </div>
    </div>
  );
};
