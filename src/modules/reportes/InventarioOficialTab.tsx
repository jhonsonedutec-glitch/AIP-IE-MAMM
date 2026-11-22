import React, { useState, useMemo } from 'react';
import * as XLSX from 'xlsx';
import {
  FileSpreadsheet,
  Printer,
  Filter,
  RotateCcw,
  Box,
} from 'lucide-react';
import {
  BienPatrimonial,
  Ambiente,
  CategoriaEquipo,
  InstitucionConfig,
  compararEtiquetasNatural,
} from '@/types';
import { Anexo01PrintModal } from './Anexo01PrintModal';

interface InventarioOficialTabProps {
  bienes: BienPatrimonial[];
  ambientes: Ambiente[];
  categorias: CategoriaEquipo[];
  config: InstitucionConfig | null;
}

export const InventarioOficialTab: React.FC<InventarioOficialTabProps> = ({
  bienes,
  ambientes,
  categorias,
  config,
}) => {
  // Filtros
  const [filtroAmbiente, setFiltroAmbiente] = useState('');
  const [filtroCategoria, setFiltroCategoria] = useState('');
  const [filtroLote, setFiltroLote] = useState('');
  const [filtroConservacion, setFiltroConservacion] = useState('');
  const [filtroOperativo, setFiltroOperativo] = useState('');
  const [incluirBajas, setIncluirBajas] = useState(false);

  // Modal de impresión
  const [modalPrintOpen, setModalPrintOpen] = useState(false);

  // Lotes únicos disponibles
  const lotesDisponibles = useMemo(() => {
    const set = new Set<string>();
    bienes.forEach((b) => {
      if (b.lote_etiqueta?.trim()) set.add(b.lote_etiqueta.trim());
    });
    return Array.from(set).sort();
  }, [bienes]);

  // Bienes filtrados y ordenados naturalmente
  const bienesFiltrados = useMemo(() => {
    return bienes
      .filter((b) => {
        // Excluir bajas a menos que se indique explícitamente
        if (!incluirBajas && b.estado_operativo === 'DE_BAJA') return false;

        if (filtroAmbiente && b.ambiente_id !== filtroAmbiente) return false;
        if (filtroCategoria && b.categoria_id !== filtroCategoria) return false;

        if (filtroLote === '__SIN_LOTE__') {
          if (b.lote_etiqueta?.trim()) return false;
        } else if (filtroLote && b.lote_etiqueta?.trim() !== filtroLote) {
          return false;
        }

        if (filtroConservacion && b.estado_conservacion !== filtroConservacion) return false;
        if (filtroOperativo && b.estado_operativo !== filtroOperativo) return false;

        return true;
      })
      .sort((a, b) => compararEtiquetasNatural(a.etiqueta_interna, b.etiqueta_interna));
  }, [
    bienes,
    filtroAmbiente,
    filtroCategoria,
    filtroLote,
    filtroConservacion,
    filtroOperativo,
    incluirBajas,
  ]);

  const limpiarFiltros = () => {
    setFiltroAmbiente('');
    setFiltroCategoria('');
    setFiltroLote('');
    setFiltroConservacion('');
    setFiltroOperativo('');
    setIncluirBajas(false);
  };

  const getNombreAmbiente = (ambienteId?: string, detalle?: string) => {
    const amb = ambientes.find((a) => a.id === ambienteId);
    const nom = amb?.nombre || 'No asignado';
    if (detalle && detalle.trim() && nom.toLowerCase().includes('otro')) {
      return `${nom} (${detalle.trim()})`;
    }
    return nom;
  };

  const getNombreCategoria = (catId?: string) => {
    return categorias.find((c) => c.id === catId)?.nombre || 'General';
  };

  // Exportar Excel Oficial Anexo 01
  const handleExportarExcel = () => {
    const dre = (config?.dre || 'AMAZONAS').toUpperCase().replace(/^DRE\s+/i, '');
    const ugel = (config?.ugel || 'BAGUA').toUpperCase().replace(/^UGEL\s+/i, '');
    const nombreIe = config?.nombre_ie || 'MANUEL ANTONIO MESONES MURO';
    const nivel = config?.nivel || 'SECUNDARIA';
    const lugar = config?.lugar || 'BAGUA';
    const distrito = config?.distrito || 'BAGUA';
    const responsable = config?.responsable_nombre || 'RESPONSABLE AIP';
    const dni = config?.responsable_dni || '';
    const fechaEmision = `${new Date().toLocaleDateString('es-PE')} ${new Date().toLocaleTimeString('es-PE')}`;

    // Filas de Cabecera Oficial Anexo 01
    const aoa: any[][] = [
      ['GOBIERNO REGIONAL DE AMAZONAS'],
      [`DIRECCIÓN REGIONAL DE EDUCACIÓN - DRE ${dre} | UGEL ${ugel}`],
      [`INSTITUCIÓN EDUCATIVA: "${nombreIe}" | NIVEL: ${nivel}`],
      [`LUGAR: ${lugar} - DISTRITO: ${distrito}`],
      ['INVENTARIO FÍSICO DE MÁQUINAS Y EQUIPOS - FORMATO ANEXO 01 OFICIAL'],
      [`RESPONSABLE AIP: ${responsable} ${dni ? `(DNI: ${dni})` : ''}`],
      [`FECHA Y HORA DE EMISIÓN: ${fechaEmision}`],
      [`TOTAL DE ÍTEMS REPORTADOS: ${bienesFiltrados.length}`],
      [], // Fila vacía separadora
      [
        'N°',
        'Código Patrimonial',
        'Tipo de Código',
        'Etiqueta QR',
        'Denominación',
        'Categoría',
        'Marca',
        'Modelo',
        'N° Serie',
        'Color',
        'Lote',
        'Est. Cons.',
        'Estado Operativo',
        'Ubicación / Ambiente',
        'Observaciones',
      ],
    ];

    // Filas de datos
    bienesFiltrados.forEach((b, index) => {
      const tipoCod = b.codigo_patrimonial
        ? b.codigo_patrimonial.length === 12
          ? 'SBN'
          : 'PATRIMONIAL'
        : 'INTERNO';

      aoa.push([
        index + 1,
        b.codigo_patrimonial || 'S/C',
        tipoCod,
        b.etiqueta_interna || 'S/E',
        b.denominacion,
        getNombreCategoria(b.categoria_id),
        b.marca || '—',
        b.modelo || '—',
        b.serie || 'S/N',
        b.color || '—',
        b.lote_etiqueta || '—',
        b.estado_conservacion,
        b.estado_operativo,
        getNombreAmbiente(b.ambiente_id, b.ubicacion_detalle),
        b.observacion || '—',
      ]);
    });

    const worksheet = XLSX.utils.aoa_to_sheet(aoa);

    // Ajustar anchos de columnas (!cols) para lectura cómoda
    worksheet['!cols'] = [
      { wch: 6 }, // N°
      { wch: 18 }, // Cód. Pat
      { wch: 14 }, // Tipo Cód
      { wch: 16 }, // Etiqueta QR
      { wch: 32 }, // Denominación
      { wch: 18 }, // Categoría
      { wch: 16 }, // Marca
      { wch: 16 }, // Modelo
      { wch: 18 }, // N° Serie
      { wch: 12 }, // Color
      { wch: 16 }, // Lote
      { wch: 10 }, // Est. Cons.
      { wch: 18 }, // Estado Operativo
      { wch: 25 }, // Ubicación
      { wch: 35 }, // Observaciones
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Anexo 01');

    const fechaArchivo = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    XLSX.writeFile(workbook, `Anexo_01_Inventario_MAMM_${fechaArchivo}.xlsx`);
  };

  return (
    <div className="space-y-6">
      {/* Contenedor de Filtros Previos */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 flex-wrap gap-2">
          <div className="flex items-center space-x-2">
            <Filter className="w-4 h-4 text-emerald-600" />
            <h3 className="font-bold text-sm text-slate-800">
              Filtros para Emisión del Formato Anexo 01
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

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-xs">
          {/* Ambiente */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">Ambiente</label>
            <select
              value={filtroAmbiente}
              onChange={(e) => setFiltroAmbiente(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-700"
            >
              <option value="">Todos los ambientes</option>
              {ambientes.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.nombre}
                </option>
              ))}
            </select>
          </div>

          {/* Categoría */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">Categoría</label>
            <select
              value={filtroCategoria}
              onChange={(e) => setFiltroCategoria(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-700"
            >
              <option value="">Todas las categorías</option>
              {categorias.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre}
                </option>
              ))}
            </select>
          </div>

          {/* Lote / Color */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">Lote / Color</label>
            <select
              value={filtroLote}
              onChange={(e) => setFiltroLote(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-700"
            >
              <option value="">Todos los lotes</option>
              <option value="__SIN_LOTE__">(Sin lote asignado)</option>
              {lotesDisponibles.map((lote) => (
                <option key={lote} value={lote}>
                  {lote}
                </option>
              ))}
            </select>
          </div>

          {/* Conservación */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
              Conservación
            </label>
            <select
              value={filtroConservacion}
              onChange={(e) => setFiltroConservacion(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-700"
            >
              <option value="">Cualquier estado</option>
              <option value="N">Nuevo (N)</option>
              <option value="B">Bueno (B)</option>
              <option value="R">Regular (R)</option>
              <option value="M">Malo (M)</option>
            </select>
          </div>

          {/* Estado Operativo */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
              Estado Operativo
            </label>
            <select
              value={filtroOperativo}
              onChange={(e) => setFiltroOperativo(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-700"
            >
              <option value="">Todos los estados</option>
              <option value="OPERATIVO">OPERATIVO</option>
              <option value="EN_MANTENIMIENTO">EN MANTENIMIENTO</option>
              <option value="PRESTADO">PRESTADO</option>
              <option value="DE_BAJA">DE BAJA</option>
            </select>
          </div>
        </div>

        {/* Checkbox de Bajas y Botones de Emisión */}
        <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-t border-slate-100">
          <label className="inline-flex items-center space-x-2 text-xs font-semibold text-slate-700 cursor-pointer">
            <input
              type="checkbox"
              checked={incluirBajas}
              onChange={(e) => setIncluirBajas(e.target.checked)}
              className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
            />
            <span>Incluir bienes dados de baja en el reporte</span>
          </label>

          {/* Botones de Exportación */}
          <div className="flex items-center space-x-3">
            <button
              type="button"
              onClick={handleExportarExcel}
              className="inline-flex items-center space-x-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Exportar Excel Oficial (.xlsx)</span>
            </button>

            <button
              type="button"
              onClick={() => setModalPrintOpen(true)}
              className="inline-flex items-center space-x-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              <Printer className="w-4 h-4 text-emerald-400" />
              <span>Imprimir / PDF Oficial</span>
            </button>
          </div>
        </div>
      </div>

      {/* Indicador en vivo y Previsualización de la Tabla */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 px-6 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Box className="w-4 h-4 text-slate-600" />
            <h4 className="font-bold text-xs text-slate-800">
              Registros que entrarán al Reporte Oficial
            </h4>
          </div>
          <span className="text-xs font-bold text-emerald-800 bg-emerald-100 px-3 py-1 rounded-full border border-emerald-200">
            {bienesFiltrados.length} bien(es) seleccionados
          </span>
        </div>

        <div className="overflow-x-auto max-h-[460px]">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="bg-slate-100 text-slate-600 font-semibold uppercase tracking-wider text-[11px] sticky top-0 z-10 border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-3 w-12 text-center">N°</th>
                <th className="py-2.5 px-3">Etiqueta QR</th>
                <th className="py-2.5 px-3">Cód. Patrimonial</th>
                <th className="py-2.5 px-3">Denominación</th>
                <th className="py-2.5 px-3">Marca / Modelo</th>
                <th className="py-2.5 px-3">N° Serie</th>
                <th className="py-2.5 px-3">Lote</th>
                <th className="py-2.5 px-3 text-center">Cons.</th>
                <th className="py-2.5 px-3">Estado Op.</th>
                <th className="py-2.5 px-3">Ubicación</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {bienesFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={10} className="p-12 text-center text-slate-400">
                    No hay bienes que coincidan con los criterios seleccionados.
                  </td>
                </tr>
              ) : (
                bienesFiltrados.map((b, idx) => (
                  <tr
                    key={b.id}
                    className={`hover:bg-slate-50 transition-colors ${
                      b.estado_operativo === 'DE_BAJA' ? 'opacity-60 bg-rose-50/30' : ''
                    }`}
                  >
                    <td className="py-2 px-3 text-center text-slate-400 font-mono text-[11px]">
                      {idx + 1}
                    </td>
                    <td className="py-2 px-3 font-mono font-bold text-slate-800 text-[11px]">
                      {b.etiqueta_interna || 'S/E'}
                    </td>
                    <td className="py-2 px-3 font-mono text-slate-700">
                      {b.codigo_patrimonial || 'S/C'}
                    </td>
                    <td className="py-2 px-3 font-medium text-slate-900 truncate max-w-[220px]">
                      {b.denominacion}
                    </td>
                    <td className="py-2 px-3 text-slate-600 truncate max-w-[150px]">
                      {b.marca} {b.modelo ? `— ${b.modelo}` : ''}
                    </td>
                    <td className="py-2 px-3 font-mono text-slate-600 text-[11px]">
                      {b.serie || 'S/N'}
                    </td>
                    <td className="py-2 px-3">
                      {b.lote_etiqueta ? (
                        <span
                          className="px-2 py-0.5 rounded text-[10px] font-bold text-white inline-block shadow-2xs"
                          style={{ backgroundColor: b.lote_color || '#475569' }}
                        >
                          {b.lote_etiqueta}
                        </span>
                      ) : (
                        <span className="text-slate-400 text-[11px]">—</span>
                      )}
                    </td>
                    <td className="py-2 px-3 text-center font-bold">
                      <span
                        className={`inline-block w-5 h-5 leading-5 rounded text-center text-[10px] ${
                          b.estado_conservacion === 'B'
                            ? 'bg-emerald-100 text-emerald-800'
                            : b.estado_conservacion === 'R'
                            ? 'bg-amber-100 text-amber-800'
                            : b.estado_conservacion === 'M'
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}
                      >
                        {b.estado_conservacion}
                      </span>
                    </td>
                    <td className="py-2 px-3">
                      <span className="text-[11px] font-medium text-slate-700">
                        {b.estado_operativo}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-slate-600 truncate max-w-[150px]">
                      {getNombreAmbiente(b.ambiente_id, b.ubicacion_detalle)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de Impresión / Guardado PDF */}
      <Anexo01PrintModal
        isOpen={modalPrintOpen}
        onClose={() => setModalPrintOpen(false)}
        bienes={bienesFiltrados}
        ambientes={ambientes}
        categorias={categorias}
        config={config}
      />
    </div>
  );
};
