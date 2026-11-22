import React, { useState, useMemo } from 'react';
import {
  Search,
  RotateCcw,
  FileSpreadsheet,
  ChevronLeft,
  ChevronRight,
  Lock,
} from 'lucide-react';
import { AuditoriaLog, InstitucionConfig } from '@/types';
import { generarExcelProfesional, ColumnaReporteExcel } from '@/utils/excelProfesional';

interface AuditoriaLogsTabProps {
  logs: AuditoriaLog[];
  loading: boolean;
  onRefresh: () => Promise<void>;
  config?: InstitucionConfig | null;
}

const ITEMS_POR_PAGINA = 20;

const COLORES_ACCION: Record<string, { bg: string; text: string; border: string }> = {
  CREATE: { bg: 'bg-emerald-100', text: 'text-emerald-800', border: 'border-emerald-300' },
  UPDATE: { bg: 'bg-blue-100', text: 'text-blue-800', border: 'border-blue-300' },
  TRASLADO: { bg: 'bg-teal-100', text: 'text-teal-800', border: 'border-teal-300' },
  BAJA: { bg: 'bg-rose-100', text: 'text-rose-800', border: 'border-rose-300' },
  IMPORT: { bg: 'bg-purple-100', text: 'text-purple-800', border: 'border-purple-300' },
  BACKUP_RESTORE: { bg: 'bg-indigo-100', text: 'text-indigo-800', border: 'border-indigo-300' },
  USER_CHANGE: { bg: 'bg-amber-100', text: 'text-amber-800', border: 'border-amber-300' },
  PRESTAMO: { bg: 'bg-violet-100', text: 'text-violet-800', border: 'border-violet-300' },
  DEVOLUCION: { bg: 'bg-cyan-100', text: 'text-cyan-800', border: 'border-cyan-300' },
};

export const AuditoriaLogsTab: React.FC<AuditoriaLogsTabProps> = ({
  logs,
  loading,
  onRefresh,
  config,
}) => {
  const [busqueda, setBusqueda] = useState('');
  const [filtroColeccion, setFiltroColeccion] = useState('');
  const [filtroAccion, setFiltroAccion] = useState('');
  const [filtroUsuario, setFiltroUsuario] = useState('');
  const [paginaActual, setPaginaActual] = useState(1);
  const [exportando, setExportando] = useState(false);

  // Extraer opciones únicas para filtros
  const coleccionesDisponibles = useMemo(() => {
    const set = new Set<string>();
    logs.forEach((l) => {
      if (l.coleccion) set.add(l.coleccion);
    });
    return Array.from(set).sort();
  }, [logs]);

  const accionesDisponibles = useMemo(() => {
    const set = new Set<string>();
    logs.forEach((l) => {
      if (l.accion) set.add(l.accion);
    });
    return Array.from(set).sort();
  }, [logs]);

  const usuariosDisponibles = useMemo(() => {
    const set = new Set<string>();
    logs.forEach((l) => {
      if (l.usuario_email) set.add(l.usuario_email);
    });
    return Array.from(set).sort();
  }, [logs]);

  // Filtrado reactivo
  const logsFiltrados = useMemo(() => {
    return logs.filter((log) => {
      if (filtroColeccion && log.coleccion !== filtroColeccion) return false;
      if (filtroAccion && log.accion !== filtroAccion) return false;
      if (filtroUsuario && log.usuario_email !== filtroUsuario) return false;

      if (busqueda.trim()) {
        const q = busqueda.toLowerCase().trim();
        const texto = `${log.detalle || ''} ${log.usuario_email || ''} ${log.documento_id || ''} ${
          log.coleccion || ''
        }`.toLowerCase();
        if (!texto.includes(q)) return false;
      }

      return true;
    });
  }, [logs, filtroColeccion, filtroAccion, filtroUsuario, busqueda]);

  // Paginación
  const totalPaginas = Math.ceil(logsFiltrados.length / ITEMS_POR_PAGINA) || 1;
  const logsPaginados = useMemo(() => {
    const inicio = (paginaActual - 1) * ITEMS_POR_PAGINA;
    return logsFiltrados.slice(inicio, inicio + ITEMS_POR_PAGINA);
  }, [logsFiltrados, paginaActual]);

  const limpiarFiltros = () => {
    setBusqueda('');
    setFiltroColeccion('');
    setFiltroAccion('');
    setFiltroUsuario('');
    setPaginaActual(1);
  };

  // Exportar logs filtrados a Excel Profesional con ExcelJS
  const handleExportarExcel = async () => {
    try {
      setExportando(true);
      const columnas: ColumnaReporteExcel[] = [
        { header: 'N°', key: 'index', width: 6, align: 'center' },
        { header: 'ID Evento', key: 'id', width: 22, isTextFormat: true },
        { header: 'Fecha y Hora', key: 'fecha', width: 22 },
        { header: 'Acción', key: 'accion', width: 16, align: 'center', isEstado: true },
        { header: 'Colección / Módulo', key: 'coleccion', width: 20 },
        { header: 'ID Documento', key: 'documento_id', width: 22, isTextFormat: true },
        { header: 'Operador (Email)', key: 'usuario_email', width: 28 },
        { header: 'ID Usuario', key: 'usuario_id', width: 24, isTextFormat: true },
        { header: 'Detalle de la Operación', key: 'detalle', width: 45 },
      ];

      const datos = logsFiltrados.map((l, idx) => ({
        index: idx + 1,
        id: l.id,
        fecha: l.fecha ? new Date(l.fecha).toLocaleString('es-PE') : '—',
        accion: l.accion,
        coleccion: l.coleccion,
        documento_id: l.documento_id || '—',
        usuario_email: l.usuario_email || '—',
        usuario_id: l.usuario_id || '—',
        detalle: l.detalle || '—',
      }));

      const fechaArchivo = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      await generarExcelProfesional({
        tituloReporte: 'REGISTRO DE AUDITORÍA INMUTABLE Y TRAZABILIDAD INSTITUCIONAL',
        subtitulo: `Total de eventos exportados: ${datos.length} registros`,
        nombreHoja: 'Auditoría',
        nombreArchivo: `Auditoria_Logs_MAMM_${fechaArchivo}.xlsx`,
        config,
        columnas,
        datos,
        incluirFirmas: false,
        orientacion: 'landscape',
      });
    } catch (err) {
      console.error('Error al exportar auditoría a Excel:', err);
    } finally {
      setExportando(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Barra de Búsqueda y Filtros */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 flex-wrap gap-2">
          <div className="flex items-center space-x-2">
            <Lock className="w-4 h-4 text-slate-700" />
            <h3 className="font-bold text-sm text-slate-800">
              Filtros del Registro de Auditoría Inmutable
            </h3>
          </div>
          <div className="flex items-center space-x-3">
            <button
              type="button"
              onClick={onRefresh}
              className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold flex items-center space-x-1 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Recargar eventos</span>
            </button>
            <button
              type="button"
              onClick={limpiarFiltros}
              className="text-xs text-slate-500 hover:text-slate-800 flex items-center space-x-1 cursor-pointer"
            >
              <span>Limpiar filtros</span>
            </button>
          </div>
        </div>

        {/* Buscador de texto */}
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            value={busqueda}
            onChange={(e) => {
              setBusqueda(e.target.value);
              setPaginaActual(1);
            }}
            placeholder="Buscar por detalle de la operación, correo de usuario o ID de documento..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-500 text-xs text-slate-800"
          />
        </div>

        {/* Filtros por Selects */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
              Módulo / Colección
            </label>
            <select
              value={filtroColeccion}
              onChange={(e) => {
                setFiltroColeccion(e.target.value);
                setPaginaActual(1);
              }}
              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500 text-slate-700"
            >
              <option value="">Todas las colecciones</option>
              {coleccionesDisponibles.map((col) => (
                <option key={col} value={col}>
                  {col}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">Acción</label>
            <select
              value={filtroAccion}
              onChange={(e) => {
                setFiltroAccion(e.target.value);
                setPaginaActual(1);
              }}
              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500 text-slate-700"
            >
              <option value="">Todas las acciones</option>
              {accionesDisponibles.map((acc) => (
                <option key={acc} value={acc}>
                  {acc}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
              Usuario / Operador
            </label>
            <select
              value={filtroUsuario}
              onChange={(e) => {
                setFiltroUsuario(e.target.value);
                setPaginaActual(1);
              }}
              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500 text-slate-700"
            >
              <option value="">Todos los usuarios</option>
              {usuariosDisponibles.map((usr) => (
                <option key={usr} value={usr}>
                  {usr}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Botón de Exportación */}
        <div className="pt-2 flex items-center justify-between border-t border-slate-100 flex-wrap gap-2">
          <span className="text-xs text-slate-500">
            Mostrando <strong>{logsFiltrados.length}</strong> eventos de auditoría (orden descendente
            por fecha).
          </span>

          <button
            type="button"
            onClick={handleExportarExcel}
            disabled={exportando || logsFiltrados.length === 0}
            className="inline-flex items-center space-x-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            <span>{exportando ? 'Generando Excel...' : 'Exportar Auditoría a Excel (.xlsx)'}</span>
          </button>
        </div>
      </div>

      {/* Tabla Paginada de Auditoría */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-500 text-xs">
            <span className="w-6 h-6 inline-block border-2 border-slate-600/30 border-t-slate-600 rounded-full animate-spin mb-2" />
            <p>Cargando registros inmutables de auditoría...</p>
          </div>
        ) : logsFiltrados.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs">
            No se encontraron eventos de auditoría con los criterios seleccionados.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-slate-100 text-slate-600 font-semibold uppercase tracking-wider text-[11px] border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3 w-12 text-center">N°</th>
                  <th className="py-2.5 px-3 w-36">Fecha y Hora</th>
                  <th className="py-2.5 px-3 w-28">Acción</th>
                  <th className="py-2.5 px-3 w-28">Colección</th>
                  <th className="py-2.5 px-3 w-48">Operador</th>
                  <th className="py-2.5 px-3">Detalle de la Operación</th>
                  <th className="py-2.5 px-3 w-28 font-mono text-[10px]">Doc ID</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {logsPaginados.map((log, idx) => {
                  const numItem = (paginaActual - 1) * ITEMS_POR_PAGINA + idx + 1;
                  const fechaStr = log.fecha
                    ? new Date(log.fecha).toLocaleString('es-PE', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                      })
                    : 'Reciente';

                  const colorBadge = COLORES_ACCION[log.accion] || {
                    bg: 'bg-slate-100',
                    text: 'text-slate-800',
                    border: 'border-slate-300',
                  };

                  return (
                    <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-2 px-3 text-center text-slate-400 font-mono text-[11px]">
                        {numItem}
                      </td>
                      <td className="py-2 px-3 text-slate-600 font-mono text-[11px] whitespace-nowrap">
                        {fechaStr}
                      </td>
                      <td className="py-2 px-3">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${colorBadge.bg} ${colorBadge.text} ${colorBadge.border}`}
                        >
                          {log.accion}
                        </span>
                      </td>
                      <td className="py-2 px-3 font-semibold text-slate-700">{log.coleccion}</td>
                      <td className="py-2 px-3 text-slate-800 truncate max-w-[180px]">
                        {log.usuario_email || 'Sistema'}
                      </td>
                      <td className="py-2 px-3 text-slate-700 leading-snug">{log.detalle}</td>
                      <td className="py-2 px-3 font-mono text-[10px] text-slate-400 truncate max-w-[110px]" title={log.documento_id}>
                        {log.documento_id || '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Paginación */}
        {logsFiltrados.length > ITEMS_POR_PAGINA && (
          <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs">
            <span className="text-slate-500">
              Página <strong>{paginaActual}</strong> de <strong>{totalPaginas}</strong>
            </span>
            <div className="flex items-center space-x-2">
              <button
                type="button"
                disabled={paginaActual <= 1}
                onClick={() => setPaginaActual((p) => Math.max(1, p - 1))}
                className="p-1.5 rounded-lg border border-slate-300 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 transition-colors cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                disabled={paginaActual >= totalPaginas}
                onClick={() => setPaginaActual((p) => Math.min(totalPaginas, p + 1))}
                className="p-1.5 rounded-lg border border-slate-300 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 transition-colors cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
