import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
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
    <BrowserRouter>
      <Routes>
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
      </Routes>
    </BrowserRouter>
  );
};

export default App;
