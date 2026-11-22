import React, { useState, useMemo } from 'react';
import * as XLSX from 'xlsx';
import {
  FileSpreadsheet,
  Printer,
  Filter,
  RotateCcw,
  BookOpen,
  Wrench,
  ArrowLeftRight,
} from 'lucide-react';
import {
  Prestamo,
  MantenimientoRegistro,
  MovimientoBien,
  Docente,
  AreaCurricular,
  BienPatrimonial,
  Ambiente,
  InstitucionConfig,
} from '@/types';
import { ResumenEjecutivoPrintModal } from './ResumenEjecutivoPrintModal';

interface ReportesOperativosTabProps {
  prestamos: Prestamo[];
  mantenimientos: MantenimientoRegistro[];
  movimientos: MovimientoBien[];
  docentes: Docente[];
  areas: AreaCurricular[];
  bienes: BienPatrimonial[];
  ambientes: Ambiente[];
  config: InstitucionConfig | null;
}

export const ReportesOperativosTab: React.FC<ReportesOperativosTabProps> = ({
  prestamos,
  mantenimientos,
  movimientos,
  docentes,
  areas,
  bienes,
  ambientes,
  config,
}) => {
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');
  const [filtroDocente, setFiltroDocente] = useState('');
  const [filtroArea, setFiltroArea] = useState('');

  // Modal Resumen Ejecutivo
  const [modalResumenOpen, setModalResumenOpen] = useState(false);

  const limpiarFiltros = () => {
    setFechaDesde('');
    setFechaHasta('');
    setFiltroDocente('');
    setFiltroArea('');
  };

  const getNombreAmbiente = (ambienteId?: string) => {
    return ambientes.find((a) => a.id === ambienteId)?.nombre || 'No asignado';
  };

  // 1. Filtrado de Préstamos
  const prestamosFiltrados = useMemo(() => {
    return prestamos.filter((p) => {
      if (filtroDocente && p.docente_id !== filtroDocente) return false;
      if (filtroArea && p.area_id !== filtroArea) return false;

      if (fechaDesde) {
        const fSalida = new Date(p.fecha_salida).getTime();
        const fMin = new Date(fechaDesde + 'T00:00:00').getTime();
        if (fSalida < fMin) return false;
      }

      if (fechaHasta) {
        const fSalida = new Date(p.fecha_salida).getTime();
        const fMax = new Date(fechaHasta + 'T23:59:59').getTime();
        if (fSalida > fMax) return false;
      }

      return true;
    });
  }, [prestamos, filtroDocente, filtroArea, fechaDesde, fechaHasta]);

  // 2. Filtrado de Mantenimientos
  const mantenimientosFiltrados = useMemo(() => {
    return mantenimientos.filter((m) => {
      if (fechaDesde) {
        const fInicio = new Date(m.fecha_inicio).getTime();
        const fMin = new Date(fechaDesde + 'T00:00:00').getTime();
        if (fInicio < fMin) return false;
      }
      if (fechaHasta) {
        const fInicio = new Date(m.fecha_inicio).getTime();
        const fMax = new Date(fechaHasta + 'T23:59:59').getTime();
        if (fInicio > fMax) return false;
      }
      return true;
    });
  }, [mantenimientos, fechaDesde, fechaHasta]);

  // 3. Filtrado de Movimientos / Traslados
  const movimientosFiltrados = useMemo(() => {
    return movimientos.filter((mov) => {
      if (fechaDesde) {
        const fMov = new Date(mov.fecha_movimiento).getTime();
        const fMin = new Date(fechaDesde + 'T00:00:00').getTime();
        if (fMov < fMin) return false;
      }
      if (fechaHasta) {
        const fMov = new Date(mov.fecha_movimiento).getTime();
        const fMax = new Date(fechaHasta + 'T23:59:59').getTime();
        if (fMov > fMax) return false;
      }
      return true;
    });
  }, [movimientos, fechaDesde, fechaHasta]);

  const fechaArchivo = new Date().toISOString().slice(0, 10).replace(/-/g, '');

  // Exportar Excel Préstamos QR
  const handleExportarPrestamos = () => {
    const data = prestamosFiltrados.map((p, idx) => {
      const fSalida = p.fecha_salida ? new Date(p.fecha_salida).toLocaleString('es-PE') : '—';
      const fDevEst = p.fecha_devolucion_estimada
        ? new Date(p.fecha_devolucion_estimada).toLocaleString('es-PE')
        : '—';
      const fDevReal = p.fecha_devolucion_real
        ? new Date(p.fecha_devolucion_real).toLocaleString('es-PE')
        : '—';

      return {
        'N°': idx + 1,
        'Código Préstamo': p.id,
        Tipo: p.tipo,
        'Docente Solicitante': p.docente_nombre,
        'Área Curricular': p.area_nombre,
        'Grado y Sección': p.grado_seccion,
        'Aula / Ambiente de Uso': p.ambiente_uso,
        'Cantidad Equipos': p.cantidad_equipos || p.bienes_ids?.length || 0,
        'Accesorios Entregados': p.accesorios_entregados || 'Ninguno',
        'Fecha Salida': fSalida,
        'Fecha Devolución Estimada': fDevEst,
        'Fecha Devolución Real': fDevReal,
        Estado: p.estado,
        'Observación / Retorno': p.observacion_retorno || '—',
      };
    });

    const ws = XLSX.utils.json_to_sheet(data);
    ws['!cols'] = [
      { wch: 6 },
      { wch: 22 },
      { wch: 14 },
      { wch: 26 },
      { wch: 22 },
      { wch: 16 },
      { wch: 20 },
      { wch: 16 },
      { wch: 22 },
      { wch: 20 },
      { wch: 24 },
      { wch: 22 },
      { wch: 16 },
      { wch: 30 },
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Préstamos QR');
    XLSX.writeFile(wb, `Reporte_Prestamos_QR_MAMM_${fechaArchivo}.xlsx`);
  };

  // Exportar Excel Mantenimiento
  const handleExportarMantenimientos = () => {
    const data = mantenimientosFiltrados.map((m, idx) => {
      const fIni = m.fecha_inicio ? new Date(m.fecha_inicio).toLocaleDateString('es-PE') : '—';
      const fFin = m.fecha_fin ? new Date(m.fecha_fin).toLocaleDateString('es-PE') : '—';

      return {
        'N°': idx + 1,
        'ID Mantenimiento': m.id,
        'Etiqueta QR': m.etiqueta_interna || 'S/E',
        'Código Patrimonial': m.codigo_patrimonial || 'S/C',
        Denominación: m.denominacion || 'Bien tecnológico',
        'Marca / Modelo': `${m.marca || ''} ${m.modelo ? `— ${m.modelo}` : ''}`.trim() || '—',
        'N° Serie': m.serie || 'S/N',
        Tipo: m.tipo,
        'Fecha Ingreso': fIni,
        'Fecha Cierre': fFin,
        'Técnico Responsable': m.tecnico || 'No asignado',
        'Descripción de Falla': m.descripcion_falla || '—',
        'Trabajo Realizado': m.trabajo_realizado || '—',
        'Repuestos Utilizados': m.repuestos || 'Ninguno',
        'Conservación Resultante': m.estado_conservacion_resultante || '—',
        'Estado Operativo Resultante': m.estado_operativo_resultante || '—',
        'Estado Cierre': m.cerrado ? 'CERRADO' : 'EN TALLER',
      };
    });

    const ws = XLSX.utils.json_to_sheet(data);
    ws['!cols'] = [
      { wch: 6 },
      { wch: 20 },
      { wch: 16 },
      { wch: 18 },
      { wch: 28 },
      { wch: 20 },
      { wch: 18 },
      { wch: 16 },
      { wch: 16 },
      { wch: 16 },
      { wch: 22 },
      { wch: 30 },
      { wch: 30 },
      { wch: 22 },
      { wch: 22 },
      { wch: 24 },
      { wch: 16 },
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Mantenimientos');
    XLSX.writeFile(wb, `Reporte_Mantenimientos_MAMM_${fechaArchivo}.xlsx`);
  };

  // Exportar Excel Traslados
  const handleExportarMovimientos = () => {
    const data = movimientosFiltrados.map((mov, idx) => {
      const fMov = mov.fecha_movimiento
        ? new Date(mov.fecha_movimiento).toLocaleString('es-PE')
        : '—';

      return {
        'N°': idx + 1,
        'ID Traslado': mov.id,
        'Lote Traslado': mov.lote_id || '—',
        'Fecha Movimiento': fMov,
        'Etiqueta QR': mov.etiqueta_interna || 'S/E',
        'Código Patrimonial': mov.codigo_patrimonial || 'S/C',
        Denominación: mov.denominacion || 'Bien tecnológico',
        'Ambiente Origen': getNombreAmbiente(mov.ambiente_origen_id),
        'Ambiente Destino': getNombreAmbiente(mov.ambiente_destino_id),
        'Detalle Destino': mov.ubicacion_detalle_destino || '—',
        'Motivo de Traslado': mov.motivo || '—',
        'Responsable Entrega': mov.responsable_entrega || '—',
        'Responsable Recepción': mov.responsable_recepcion || '—',
        'Operador del Sistema': mov.usuario_email || '—',
      };
    });

    const ws = XLSX.utils.json_to_sheet(data);
    ws['!cols'] = [
      { wch: 6 },
      { wch: 20 },
      { wch: 16 },
      { wch: 20 },
      { wch: 16 },
      { wch: 18 },
      { wch: 26 },
      { wch: 22 },
      { wch: 22 },
      { wch: 22 },
      { wch: 30 },
      { wch: 22 },
      { wch: 22 },
      { wch: 24 },
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Traslados');
    XLSX.writeFile(wb, `Reporte_Traslados_MAMM_${fechaArchivo}.xlsx`);
  };

  return (
    <div className="space-y-6">
      {/* Barra de Filtros */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 flex-wrap gap-2">
          <div className="flex items-center space-x-2">
            <Filter className="w-4 h-4 text-indigo-600" />
            <h3 className="font-bold text-sm text-slate-800">
              Filtros para Reportes Operativos y Pedagógicos
            </h3>
          </div>
          <button
            type="button"
            onClick={limpiarFiltros}
            className="text-xs text-slate-500 hover:text-slate-800 flex items-center space-x-1 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Restablecer filtros</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
              Fecha Desde
            </label>
            <input
              type="date"
              value={fechaDesde}
              onChange={(e) => setFechaDesde(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-700"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
              Fecha Hasta
            </label>
            <input
              type="date"
              value={fechaHasta}
              onChange={(e) => setFechaHasta(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-700"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
              Docente (Opcional)
            </label>
            <select
              value={filtroDocente}
              onChange={(e) => setFiltroDocente(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-700"
            >
              <option value="">Todos los docentes</option>
              {docentes.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.nombres_apellidos}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
              Área Curricular (Opcional)
            </label>
            <select
              value={filtroArea}
              onChange={(e) => setFiltroArea(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-700"
            >
              <option value="">Todas las áreas</option>
              {areas.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.nombre}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Botón Resumen Ejecutivo Imprimible */}
        <div className="pt-3 border-t border-slate-100 flex items-center justify-between flex-wrap gap-3">
          <span className="text-xs text-slate-500">
            Exporta reportes analíticos para Dirección, UGEL o respalda la trazabilidad de operaciones.
          </span>
          <button
            type="button"
            onClick={() => setModalResumenOpen(true)}
            className="inline-flex items-center space-x-1.5 px-4 py-2 bg-indigo-900 hover:bg-indigo-800 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
          >
            <Printer className="w-4 h-4 text-indigo-300" />
            <span>Resumen Ejecutivo Pedagógico Imprimible (PDF A4)</span>
          </button>
        </div>
      </div>

      {/* 3 Tarjetas de Exportación Directa Excel */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Tarjeta 1: Préstamos QR */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl">
                <BookOpen className="w-5 h-5" />
              </div>
              <span className="text-xs font-bold text-indigo-700 bg-indigo-100/80 px-2.5 py-0.5 rounded-full">
                {prestamosFiltrados.length} registros
              </span>
            </div>
            <h3 className="font-bold text-sm text-slate-900">Uso Pedagógico y Préstamos QR</h3>
            <p className="text-xs text-slate-500">
              Historial de sesiones en aula, docentes solicitantes, áreas curriculares y control de retorno.
            </p>
          </div>

          <button
            type="button"
            onClick={handleExportarPrestamos}
            className="w-full py-2.5 px-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs transition-colors flex items-center justify-center space-x-1.5 cursor-pointer shadow-xs"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Descargar Excel Préstamos (.xlsx)</span>
          </button>
        </div>

        {/* Tarjeta 2: Mantenimiento y Soporte */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="p-2.5 bg-amber-50 text-amber-600 rounded-xl">
                <Wrench className="w-5 h-5" />
              </div>
              <span className="text-xs font-bold text-amber-700 bg-amber-100/80 px-2.5 py-0.5 rounded-full">
                {mantenimientosFiltrados.length} registros
              </span>
            </div>
            <h3 className="font-bold text-sm text-slate-900">Mantenimiento y Soporte Técnico</h3>
            <p className="text-xs text-slate-500">
              Servicios preventivos y correctivos, diagnósticos, trabajos realizados, repuestos y técnicos.
            </p>
          </div>

          <button
            type="button"
            onClick={handleExportarMantenimientos}
            className="w-full py-2.5 px-3 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl text-xs transition-colors flex items-center justify-center space-x-1.5 cursor-pointer shadow-xs"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Descargar Excel Mantenimiento (.xlsx)</span>
          </button>
        </div>

        {/* Tarjeta 3: Traslados y Distribución */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl">
                <ArrowLeftRight className="w-5 h-5" />
              </div>
              <span className="text-xs font-bold text-emerald-700 bg-emerald-100/80 px-2.5 py-0.5 rounded-full">
                {movimientosFiltrados.length} registros
              </span>
            </div>
            <h3 className="font-bold text-sm text-slate-900">Traslados y Distribución Física</h3>
            <p className="text-xs text-slate-500">
              Trazabilidad inmutable de actas de traslado, movimientos entre aulas/oficinas y responsables.
            </p>
          </div>

          <button
            type="button"
            onClick={handleExportarMovimientos}
            className="w-full py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition-colors flex items-center justify-center space-x-1.5 cursor-pointer shadow-xs"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Descargar Excel Traslados (.xlsx)</span>
          </button>
        </div>
      </div>

      {/* Modal Resumen Ejecutivo */}
      <ResumenEjecutivoPrintModal
        isOpen={modalResumenOpen}
        onClose={() => setModalResumenOpen(false)}
        bienes={bienes}
        prestamos={prestamosFiltrados}
        mantenimientos={mantenimientosFiltrados}
        config={config}
        fechaDesde={fechaDesde}
        fechaHasta={fechaHasta}
      />
    </div>
  );
};
