import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from '@/context/AuthContext';
import { Login, ProtectedRoute } from '@/modules/auth';
import { Layout } from '@/components/layout';
import { VerificationPage } from '@/components/VerificationPage';
import { DashboardModule } from '@/modules/dashboard';
import { InventarioModule } from '@/modules/inventario';
import { DistribucionModule } from '@/modules/distribucion';
import { PrestamosModule } from '@/modules/prestamos';
import { MantenimientoModule } from '@/modules/mantenimiento';
import { ReportesModule } from '@/modules/reportes';
import { ConfiguracionModule } from '@/modules/configuracion';

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
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
      </BrowserRouter>
    </AuthProvider>
  );
};

export default App;
