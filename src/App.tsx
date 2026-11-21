import React, { Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from '@/context/AuthContext';
import { Login, ProtectedRoute } from '@/modules/auth';
import { Layout } from '@/components/layout';
import { VerificationPage } from '@/components/VerificationPage';

// Carga diferida (Code Splitting) de vistas de módulos
const DashboardModule = React.lazy(() =>
  import('@/modules/dashboard').then((m) => ({ default: m.DashboardModule }))
);
const InventarioModule = React.lazy(() =>
  import('@/modules/inventario').then((m) => ({ default: m.InventarioModule }))
);
const DistribucionModule = React.lazy(() =>
  import('@/modules/distribucion').then((m) => ({ default: m.DistribucionModule }))
);
const PrestamosModule = React.lazy(() =>
  import('@/modules/prestamos').then((m) => ({ default: m.PrestamosModule }))
);
const MantenimientoModule = React.lazy(() =>
  import('@/modules/mantenimiento').then((m) => ({ default: m.MantenimientoModule }))
);
const ReportesModule = React.lazy(() =>
  import('@/modules/reportes').then((m) => ({ default: m.ReportesModule }))
);
const ConfiguracionModule = React.lazy(() =>
  import('@/modules/configuracion').then((m) => ({ default: m.ConfiguracionModule }))
);

const ModuloLoading: React.FC = () => (
  <div className="flex flex-col items-center justify-center p-12 min-h-[300px] space-y-3">
    <div className="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin" />
    <p className="text-xs font-semibold text-slate-500">Cargando módulo institucional...</p>
  </div>
);

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Suspense fallback={<ModuloLoading />}>
          <Routes>
            {/* Ruta Pública: Inicio de Sesión */}
            <Route path="/login" element={<Login />} />

            {/* Rutas Protegidas: Requieren Sesión Activa */}
            <Route element={<ProtectedRoute />}>
              <Route path="/" element={<Layout />}>
                <Route index element={<VerificationPage />} />
                <Route path="dashboard" element={<DashboardModule />} />
                <Route path="inventario" element={<InventarioModule />} />
                <Route path="distribucion" element={<DistribucionModule />} />
                <Route path="prestamos" element={<PrestamosModule />} />
                <Route path="mantenimiento" element={<MantenimientoModule />} />
                <Route path="reportes" element={<ReportesModule />} />
                <Route path="configuracion" element={<ConfiguracionModule />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Route>
            </Route>
          </Routes>
        </Suspense>
      </BrowserRouter>
    </AuthProvider>
  );
};

export default App;
