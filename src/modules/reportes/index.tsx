import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  FileSpreadsheet,
  BookOpen,
  Database,
  ShieldAlert,
  RotateCcw,
} from 'lucide-react';
import {
  BienPatrimonial,
  Ambiente,
  CategoriaEquipo,
  InstitucionConfig,
  Prestamo,
  MantenimientoRegistro,
  MovimientoBien,
  Docente,
  AreaCurricular,
  AuditoriaLog,
} from '@/types';
import {
  bienRepository,
  ambienteRepository,
  categoriaRepository,
  configuracionRepository,
  prestamoRepository,
  mantenimientoRepository,
  movimientoRepository,
  docenteRepository,
  areaCurricularRepository,
  auditoriaRepository,
} from '@/repositories';
import { useAuth } from '@/hooks';
import { InventarioOficialTab } from './InventarioOficialTab';
import { ReportesOperativosTab } from './ReportesOperativosTab';
import { RespaldosTab } from './RespaldosTab';
import { AuditoriaLogsTab } from './AuditoriaLogsTab';

type TabTipo = 'INVENTARIO' | 'OPERATIVOS' | 'BACKUPS' | 'AUDITORIA';

export const ReportesModule: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { perfil } = useAuth();
  const esAdmin = perfil?.rol === 'ADMIN';

  // Leer pestaña inicial desde URL si existe
  const paramTab = searchParams.get('tab')?.toUpperCase();
  const tabInicial: TabTipo =
    paramTab === 'AUDITORIA'
      ? 'AUDITORIA'
      : paramTab === 'OPERATIVOS'
      ? 'OPERATIVOS'
      : paramTab === 'BACKUPS' && esAdmin
      ? 'BACKUPS'
      : 'INVENTARIO';

  const [activeTab, setActiveTab] = useState<TabTipo>(tabInicial);

  const [loading, setLoading] = useState(true);
  const [loadingLogs, setLoadingLogs] = useState(false);

  // Estados de datos
  const [config, setConfig] = useState<InstitucionConfig | null>(null);
  const [bienes, setBienes] = useState<BienPatrimonial[]>([]);
  const [ambientes, setAmbientes] = useState<Ambiente[]>([]);
  const [categorias, setCategorias] = useState<CategoriaEquipo[]>([]);
  const [prestamos, setPrestamos] = useState<Prestamo[]>([]);
  const [mantenimientos, setMantenimientos] = useState<MantenimientoRegistro[]>([]);
  const [movimientos, setMovimientos] = useState<MovimientoBien[]>([]);
  const [docentes, setDocentes] = useState<Docente[]>([]);
  const [areas, setAreas] = useState<AreaCurricular[]>([]);
  const [auditoriaLogs, setAuditoriaLogs] = useState<AuditoriaLog[]>([]);

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    setLoading(true);
    try {
      const [
        confData,
        bienesData,
        ambData,
        catData,
        prestData,
        mantData,
        movData,
        docData,
        areasData,
        logsData,
      ] = await Promise.all([
        configuracionRepository.obtenerInstitucion(),
        bienRepository.listar(),
        ambienteRepository.listar(),
        categoriaRepository.listar(),
        prestamoRepository.listar(),
        mantenimientoRepository.listar(),
        movimientoRepository.listar(),
        docenteRepository.listar(),
        areaCurricularRepository.listar(),
        auditoriaRepository.listar(500),
      ]);

      setConfig(confData);
      setBienes(bienesData);
      setAmbientes(ambData);
      setCategorias(catData);
      setPrestamos(prestData);
      setMantenimientos(mantData);
      setMovimientos(movData);
      setDocentes(docData);
      setAreas(areasData);
      setAuditoriaLogs(logsData);
    } catch (err) {
      console.error('Error al cargar datos de reportes:', err);
    } finally {
      setLoading(false);
    }
  };

  const recargarAuditoria = async () => {
    setLoadingLogs(true);
    try {
      const logs = await auditoriaRepository.listar(500);
      setAuditoriaLogs(logs);
    } catch (err) {
      console.error('Error al recargar auditoría:', err);
    } finally {
      setLoadingLogs(false);
    }
  };

  const handleCambiarTab = (tab: TabTipo) => {
    setActiveTab(tab);
    setSearchParams({ tab: tab.toLowerCase() });
  };

  return (
    <div className="space-y-6">
      {/* Cabecera Principal */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center space-x-2.5">
            <h1 className="text-2xl font-bold text-slate-800 tracking-tight">
              Reportes Oficiales, Auditoría y Respaldos
            </h1>
            <span className="px-2.5 py-0.5 text-[11px] font-bold rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
              {perfil?.rol === 'ADMIN' ? 'Control Total Admin' : 'Supervisión Directiva'}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Generación del Formato Anexo 01 (Excel/PDF), analítica pedagógica, respaldos institucionales y registro inmutable de operaciones.
          </p>
        </div>

        <div className="flex items-center space-x-2 shrink-0">
          <button
            type="button"
            onClick={cargarDatos}
            disabled={loading}
            className="inline-flex items-center space-x-1.5 px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg border border-slate-300 shadow-2xs transition-colors cursor-pointer"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Actualizar datos</span>
          </button>
        </div>
      </div>

      {/* Pestañas de Navegación del Módulo */}
      <div className="flex items-center space-x-2 border-b border-slate-200 overflow-x-auto text-xs font-semibold select-none pb-0.5">
        {/* Pestaña 1: Inventario Oficial */}
        <button
          type="button"
          onClick={() => handleCambiarTab('INVENTARIO')}
          className={`flex items-center space-x-2 px-4 py-3 border-b-2 transition-colors cursor-pointer whitespace-nowrap ${
            activeTab === 'INVENTARIO'
              ? 'border-emerald-600 text-emerald-700 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
          }`}
        >
          <FileSpreadsheet className="w-4 h-4" />
          <span>Inventario Oficial (Anexo 01)</span>
        </button>

        {/* Pestaña 2: Reportes Operativos */}
        <button
          type="button"
          onClick={() => handleCambiarTab('OPERATIVOS')}
          className={`flex items-center space-x-2 px-4 py-3 border-b-2 transition-colors cursor-pointer whitespace-nowrap ${
            activeTab === 'OPERATIVOS'
              ? 'border-emerald-600 text-emerald-700 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>Reportes Operativos y Pedagógicos</span>
        </button>

        {/* Pestaña 3: Respaldos Institucionales (Solo ADMIN) */}
        {esAdmin && (
          <button
            type="button"
            onClick={() => handleCambiarTab('BACKUPS')}
            className={`flex items-center space-x-2 px-4 py-3 border-b-2 transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === 'BACKUPS'
                ? 'border-emerald-600 text-emerald-700 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
            }`}
          >
            <Database className="w-4 h-4" />
            <span>Respaldos Institucionales (Backups)</span>
          </button>
        )}

        {/* Pestaña 4: Auditoría Inmutable */}
        <button
          type="button"
          onClick={() => handleCambiarTab('AUDITORIA')}
          className={`flex items-center space-x-2 px-4 py-3 border-b-2 transition-colors cursor-pointer whitespace-nowrap ${
            activeTab === 'AUDITORIA'
              ? 'border-emerald-600 text-emerald-700 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
          }`}
        >
          <ShieldAlert className="w-4 h-4" />
          <span>Registro de Auditoría Inmutable</span>
        </button>
      </div>

      {/* Contenido de la Pestaña Activa */}
      {loading ? (
        <div className="p-16 text-center text-slate-500 text-xs">
          <span className="w-8 h-8 inline-block border-3 border-emerald-600/30 border-t-emerald-600 rounded-full animate-spin mb-3" />
          <p className="font-semibold text-slate-700">Cargando datos del módulo de reportes...</p>
        </div>
      ) : (
        <div>
          {activeTab === 'INVENTARIO' && (
            <InventarioOficialTab
              bienes={bienes}
              ambientes={ambientes}
              categorias={categorias}
              config={config}
            />
          )}

          {activeTab === 'OPERATIVOS' && (
            <ReportesOperativosTab
              prestamos={prestamos}
              mantenimientos={mantenimientos}
              movimientos={movimientos}
              docentes={docentes}
              areas={areas}
              bienes={bienes}
              ambientes={ambientes}
              config={config}
            />
          )}

          {activeTab === 'BACKUPS' && esAdmin && <RespaldosTab config={config} />}

          {activeTab === 'AUDITORIA' && (
            <AuditoriaLogsTab
              logs={auditoriaLogs}
              loading={loadingLogs}
              onRefresh={recargarAuditoria}
              config={config}
            />
          )}
        </div>
      )}
    </div>
  );
};
