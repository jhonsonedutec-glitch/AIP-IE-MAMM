import React, { useState, useMemo } from 'react';
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
import { generarExcelProfesional, ColumnaReporteExcel } from '@/utils/excelProfesional';

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
  const [exportando, setExportando] = useState<string | null>(null);

  // 1. Exportar Excel Préstamos QR con ExcelJS profesional
  const handleExportarPrestamos = async () => {
    setExportando('prestamos');
    try {
      const columnas: ColumnaReporteExcel[] = [
        { header: 'N°', key: 'index', width: 6, align: 'center' },
        { header: 'Código Préstamo', key: 'id', width: 18, isTextFormat: true },
        { header: 'Tipo', key: 'tipo', width: 12, align: 'center' },
        { header: 'Docente Solicitante', key: 'docente_nombre', width: 28 },
        { header: 'Área Curricular', key: 'area_nombre', width: 22 },
        { header: 'Grado y Sección', key: 'grado_seccion', width: 16, align: 'center' },
        { header: 'Ambiente de Uso', key: 'ambiente_uso', width: 20 },
        { header: 'Equipos', key: 'cantidad_equipos', width: 10, align: 'center' },
        { header: 'Accesorios Entregados', key: 'accesorios_entregados', width: 22 },
        { header: 'Fecha y Hora Salida', key: 'fecha_salida', width: 20 },
        { header: 'Fecha Estimada Retorno', key: 'fecha_devolucion_estimada', width: 20 },
        { header: 'Fecha Real Retorno', key: 'fecha_devolucion_real', width: 20 },
        { header: 'Estado', key: 'estado', width: 16, isEstado: true, align: 'center' },
        { header: 'Observación de Retorno', key: 'observacion_retorno', width: 32 },
      ];

      const datos = prestamosFiltrados.map((p, idx) => ({
        index: idx + 1,
        id: p.id,
        tipo: p.tipo,
        docente_nombre: p.docente_nombre,
        area_nombre: p.area_nombre,
        grado_seccion: p.grado_seccion,
        ambiente_uso: p.ambiente_uso,
        cantidad_equipos: p.cantidad_equipos || p.bienes_ids?.length || 0,
        accesorios_entregados: p.accesorios_entregados || 'Ninguno',
        fecha_salida: p.fecha_salida ? new Date(p.fecha_salida).toLocaleString('es-PE') : '—',
        fecha_devolucion_estimada: p.fecha_devolucion_estimada
          ? new Date(p.fecha_devolucion_estimada).toLocaleString('es-PE')
          : '—',
        fecha_devolucion_real: p.fecha_devolucion_real
          ? new Date(p.fecha_devolucion_real).toLocaleString('es-PE')
          : '—',
        estado: p.estado,
        observacion_retorno: p.observacion_retorno || '—',
      }));

      await generarExcelProfesional({
        tituloReporte: 'REPORTE OFICIAL DE USO PEDAGÓGICO Y PRÉSTAMOS QR EN AULA',
        nombreHoja: 'Préstamos QR',
        nombreArchivo: `Reporte_Prestamos_QR_MAMM_${fechaArchivo}.xlsx`,
        config,
        columnas,
        datos,
        incluirFirmas: true,
        orientacion: 'landscape',
      });
    } catch (err) {
      console.error('Error al exportar préstamos:', err);
    } finally {
      setExportando(null);
    }
  };

  // 2. Exportar Excel Mantenimiento y Soporte con ExcelJS profesional
  const handleExportarMantenimientos = async () => {
    setExportando('mantenimientos');
    try {
      const columnas: ColumnaReporteExcel[] = [
        { header: 'N°', key: 'index', width: 6, align: 'center' },
        { header: 'Etiqueta QR', key: 'etiqueta_interna', width: 14, isTextFormat: true },
        { header: 'Código Patrimonial', key: 'codigo_patrimonial', width: 18, isTextFormat: true },
        { header: 'Denominación del Bien', key: 'denominacion', width: 30 },
        { header: 'Marca / Modelo', key: 'marca_modelo', width: 22 },
        { header: 'N° Serie', key: 'serie', width: 18, isTextFormat: true },
        { header: 'Tipo Mantenimiento', key: 'tipo', width: 18, align: 'center' },
        { header: 'Fecha Ingreso', key: 'fecha_inicio', width: 16 },
        { header: 'Fecha Cierre', key: 'fecha_fin', width: 16 },
        { header: 'Técnico Responsable', key: 'tecnico', width: 22 },
        { header: 'Diagnóstico / Falla', key: 'descripcion_falla', width: 32 },
        { header: 'Trabajo Realizado', key: 'trabajo_realizado', width: 32 },
        { header: 'Repuestos', key: 'repuestos', width: 20 },
        { header: 'Cons. Resultante', key: 'estado_conservacion_resultante', width: 14, align: 'center' },
        { header: 'Estado Operativo', key: 'estado_operativo_resultante', width: 16, isEstado: true, align: 'center' },
        { header: 'Estado Servicio', key: 'estado_cierre', width: 14, isEstado: true, align: 'center' },
      ];

      const datos = mantenimientosFiltrados.map((m, idx) => ({
        index: idx + 1,
        etiqueta_interna: m.etiqueta_interna || 'S/E',
        codigo_patrimonial: m.codigo_patrimonial || 'S/C',
        denominacion: m.denominacion || 'Bien tecnológico',
        marca_modelo: `${m.marca || ''} ${m.modelo ? `— ${m.modelo}` : ''}`.trim() || '—',
        serie: m.serie || 'S/N',
        tipo: m.tipo,
        fecha_inicio: m.fecha_inicio ? new Date(m.fecha_inicio).toLocaleDateString('es-PE') : '—',
        fecha_fin: m.fecha_fin ? new Date(m.fecha_fin).toLocaleDateString('es-PE') : '—',
        tecnico: m.tecnico || 'No asignado',
        descripcion_falla: m.descripcion_falla || '—',
        trabajo_realizado: m.trabajo_realizado || '—',
        repuestos: m.repuestos || 'Ninguno',
        estado_conservacion_resultante: m.estado_conservacion_resultante || '—',
        estado_operativo_resultante: m.estado_operativo_resultante || '—',
        estado_cierre: m.cerrado ? 'CERRADO' : 'EN TALLER',
      }));

      await generarExcelProfesional({
        tituloReporte: 'REPORTE OFICIAL DE SERVICIOS TÉCNICOS Y MANTENIMIENTO TIC',
        nombreHoja: 'Mantenimientos',
        nombreArchivo: `Reporte_Mantenimientos_MAMM_${fechaArchivo}.xlsx`,
        config,
        columnas,
        datos,
        incluirFirmas: true,
        orientacion: 'landscape',
      });
    } catch (err) {
      console.error('Error al exportar mantenimientos:', err);
    } finally {
      setExportando(null);
    }
  };

  // 3. Exportar Excel Traslados con ExcelJS profesional
  const handleExportarMovimientos = async () => {
    setExportando('movimientos');
    try {
      const columnas: ColumnaReporteExcel[] = [
        { header: 'N°', key: 'index', width: 6, align: 'center' },
        { header: 'ID / Acta de Traslado', key: 'lote_acta', width: 22, isTextFormat: true },
        { header: 'Fecha y Hora', key: 'fecha_movimiento', width: 20 },
        { header: 'Etiqueta QR', key: 'etiqueta_interna', width: 14, isTextFormat: true },
        { header: 'Código Patrimonial', key: 'codigo_patrimonial', width: 18, isTextFormat: true },
        { header: 'Denominación del Bien', key: 'denominacion', width: 30 },
        { header: 'Ambiente Origen', key: 'ambiente_origen', width: 22 },
        { header: 'Ambiente Destino', key: 'ambiente_destino', width: 24 },
        { header: 'Motivo del Traslado', key: 'motivo', width: 30 },
        { header: 'Responsable Entrega', key: 'responsable_entrega', width: 22 },
        { header: 'Responsable Recepción', key: 'responsable_recepcion', width: 22 },
        { header: 'Operador del Sistema', key: 'usuario_email', width: 24 },
      ];

      const datos = movimientosFiltrados.map((mov, idx) => ({
        index: idx + 1,
        lote_acta: mov.lote_id || `ACTA-${mov.id.slice(0, 8).toUpperCase()}`,
        fecha_movimiento: mov.fecha_movimiento
          ? new Date(mov.fecha_movimiento).toLocaleString('es-PE')
          : '—',
        etiqueta_interna: mov.etiqueta_interna || 'S/E',
        codigo_patrimonial: mov.codigo_patrimonial || 'S/C',
        denominacion: mov.denominacion || 'Bien tecnológico',
        ambiente_origen: getNombreAmbiente(mov.ambiente_origen_id),
        ambiente_destino: mov.ubicacion_detalle_destino
          ? `${getNombreAmbiente(mov.ambiente_destino_id)} (${mov.ubicacion_detalle_destino})`
          : getNombreAmbiente(mov.ambiente_destino_id),
        motivo: mov.motivo || '—',
        responsable_entrega: mov.responsable_entrega || '—',
        responsable_recepcion: mov.responsable_recepcion || '—',
        usuario_email: mov.usuario_email || '—',
      }));

      await generarExcelProfesional({
        tituloReporte: 'REPORTE OFICIAL DE TRASLADOS Y DISTRIBUCIÓN FÍSICA DE BIENES',
        nombreHoja: 'Traslados',
        nombreArchivo: `Reporte_Traslados_MAMM_${fechaArchivo}.xlsx`,
        config,
        columnas,
        datos,
        incluirFirmas: true,
        orientacion: 'landscape',
      });
    } catch (err) {
      console.error('Error al exportar traslados:', err);
    } finally {
      setExportando(null);
    }
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
            disabled={exportando !== null}
            onClick={handleExportarPrestamos}
            className="w-full py-2.5 px-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold rounded-xl text-xs transition-colors flex items-center justify-center space-x-1.5 cursor-pointer shadow-xs"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>{exportando === 'prestamos' ? 'Generando Excel...' : 'Descargar Excel Préstamos (.xlsx)'}</span>
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
            disabled={exportando !== null}
            onClick={handleExportarMantenimientos}
            className="w-full py-2.5 px-3 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-bold rounded-xl text-xs transition-colors flex items-center justify-center space-x-1.5 cursor-pointer shadow-xs"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>{exportando === 'mantenimientos' ? 'Generando Excel...' : 'Descargar Excel Mantenimiento (.xlsx)'}</span>
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
            disabled={exportando !== null}
            onClick={handleExportarMovimientos}
            className="w-full py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold rounded-xl text-xs transition-colors flex items-center justify-center space-x-1.5 cursor-pointer shadow-xs"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>{exportando === 'movimientos' ? 'Generando Excel...' : 'Descargar Excel Traslados (.xlsx)'}</span>
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
