import React, { useState, useEffect, useMemo } from 'react';
import QRCode from 'qrcode';
import {
  Printer,
  QrCode,
  CheckSquare,
  Square,
  Search,
  Filter,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import { Bien, Ambiente, CategoriaEquipo, esAmbientePrestable } from '@/types';

interface GeneradorEtiquetasQRProps {
  bienes: Bien[];
  ambientes: Ambiente[];
  categorias: CategoriaEquipo[];
}

export const GeneradorEtiquetasQR: React.FC<GeneradorEtiquetasQRProps> = ({
  bienes,
  ambientes,
  categorias,
}) => {
  const [tipoStockFiltro, setTipoStockFiltro] = useState<'TODOS' | 'AIP' | 'DISTRIBUIDOS'>('TODOS');
  const [ambienteFiltro, setAmbienteFiltro] = useState<string>('TODOS');
  const [categoriaFiltro, setCategoriaFiltro] = useState<string>('TODAS');
  const [busqueda, setBusqueda] = useState<string>('');
  const [seleccionados, setSeleccionados] = useState<Set<string>>(new Set());
  const [qrDataUrls, setQrDataUrls] = useState<Record<string, string>>({});
  const [generandoQRs, setGenerandoQRs] = useState(false);

  // Filtrar bienes activos
  const bienesFiltrados = useMemo(() => {
    return bienes.filter((bien) => {
      if (bien.activo === false) return false;
      if (bien.estado_operativo === 'DE_BAJA') return false;

      // Filtro por tipo de stock (Todos, Solo Stock AIP, Solo Distribuidos)
      const amb = ambientes.find((a) => a.id === bien.ambiente_id);
      const esAIP = esAmbientePrestable(amb);

      if (tipoStockFiltro === 'AIP' && !esAIP) return false;
      if (tipoStockFiltro === 'DISTRIBUIDOS' && esAIP) return false;

      if (ambienteFiltro !== 'TODOS' && bien.ambiente_id !== ambienteFiltro) {
        return false;
      }
      if (categoriaFiltro !== 'TODAS' && bien.categoria_id !== categoriaFiltro) {
        return false;
      }
      if (busqueda.trim()) {
        const query = busqueda.toLowerCase().trim();
        const coincide =
          (bien.etiqueta_interna && bien.etiqueta_interna.toLowerCase().includes(query)) ||
          bien.denominacion.toLowerCase().includes(query) ||
          (bien.codigo_patrimonial && bien.codigo_patrimonial.toLowerCase().includes(query)) ||
          (bien.serie && bien.serie.toLowerCase().includes(query)) ||
          (bien.numero_serie && bien.numero_serie.toLowerCase().includes(query)) ||
          bien.marca.toLowerCase().includes(query);
        if (!coincide) return false;
      }
      return true;
    });
  }, [bienes, ambientes, tipoStockFiltro, ambienteFiltro, categoriaFiltro, busqueda]);

  // Manejar selección
  const toggleSeleccion = (id: string) => {
    setSeleccionados((prev) => {
      const nuevo = new Set(prev);
      if (nuevo.has(id)) {
        nuevo.delete(id);
      } else {
        nuevo.add(id);
      }
      return nuevo;
    });
  };

  const seleccionarTodosFiltrados = () => {
    const nuevo = new Set(seleccionados);
    bienesFiltrados.forEach((b) => nuevo.add(b.id));
    setSeleccionados(nuevo);
  };

  const deseleccionarTodos = () => {
    setSeleccionados(new Set());
  };

  // Bienes elegidos para imprimir
  const bienesParaImprimir = useMemo(() => {
    return bienes.filter((b) => seleccionados.has(b.id));
  }, [bienes, seleccionados]);

  // Generar QRs con qrcode.toDataURL para los seleccionados
  useEffect(() => {
    let cancelado = false;

    const generarQRs = async () => {
      if (bienesParaImprimir.length === 0) return;
      setGenerandoQRs(true);

      const nuevosUrls: Record<string, string> = { ...qrDataUrls };
      for (const bien of bienesParaImprimir) {
        if (!nuevosUrls[bien.id]) {
          try {
            // El QR contiene la etiqueta interna (ej. LAP-001) para escaneo rápido
            const textoQR = bien.etiqueta_interna || bien.codigo_patrimonial || bien.id;
            const url = await QRCode.toDataURL(textoQR, {
              width: 160,
              margin: 1,
              errorCorrectionLevel: 'M',
              color: {
                dark: '#0f172a',
                light: '#ffffff',
              },
            });
            nuevosUrls[bien.id] = url;
          } catch (e) {
            console.error('Error generando QR para bien:', bien.id, e);
          }
        }
      }

      if (!cancelado) {
        setQrDataUrls(nuevosUrls);
        setGenerandoQRs(false);
      }
    };

    generarQRs();

    return () => {
      cancelado = true;
    };
  }, [bienesParaImprimir]);

  const handleImprimir = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Estilos para impresión de etiquetas A4 */}
      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 8mm;
          }
          body {
            margin: 0;
            padding: 0;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .no-print {
            display: none !important;
          }
          .print-label-grid {
            display: grid !important;
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
            gap: 5mm !important;
            width: 100% !important;
          }
          .label-card {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            border: 1.5px dashed #94a3b8 !important;
            background: #ffffff !important;
            padding: 3mm 4mm !important;
          }
          .label-card-distribuido {
            border: 2px solid #b45309 !important;
            border-top: 4.5px solid #d97706 !important;
            background: #fffbeb !important;
          }
        }
      `}</style>

      {/* Panel de Filtros y Configuración (No se imprime) */}
      <div className="no-print bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800">
                Generador de Rótulos y Etiquetas QR
              </h2>
              <p className="text-xs text-slate-500">
                Selecciona los equipos para imprimir sus etiquetas de identificación física
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleImprimir}
              disabled={seleccionados.size === 0 || generandoQRs}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-semibold text-xs rounded-xl shadow transition-colors flex items-center space-x-2"
            >
              <Printer className="w-4 h-4" />
              <span>
                {generandoQRs
                  ? 'Generando QRs...'
                  : `Imprimir ${seleccionados.size} Etiquetas`}
              </span>
            </button>
          </div>
        </div>

        {/* Filtros */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-100">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar por etiqueta, serie, código..."
              className="w-full text-xs pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="flex items-center space-x-2">
            <Filter className="w-4 h-4 text-slate-400 flex-shrink-0" />
            <select
              value={ambienteFiltro}
              onChange={(e) => setAmbienteFiltro(e.target.value)}
              className="w-full text-xs px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-700"
            >
              <option value="TODOS">Todos los Ambientes ({ambientes.length})</option>
              {ambientes.map((amb) => (
                <option key={amb.id} value={amb.id}>
                  {amb.nombre}
                </option>
              ))}
            </select>
          </div>

          <div>
            <select
              value={categoriaFiltro}
              onChange={(e) => setCategoriaFiltro(e.target.value)}
              className="w-full text-xs px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-700"
            >
              <option value="TODAS">Todas las Categorías ({categorias.length})</option>
              {categorias.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.nombre} ({cat.prefijo_etiqueta})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Pastillas de filtro rápido por tipo de stock */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100">
          <span className="text-xs font-semibold text-slate-500 mr-1">Filtrar por tipo:</span>
          <button
            type="button"
            onClick={() => setTipoStockFiltro('TODOS')}
            className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors ${
              tipoStockFiltro === 'TODOS'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Todos ({bienes.filter(b => b.activo !== false && b.estado_operativo !== 'DE_BAJA').length})
          </button>
          <button
            type="button"
            onClick={() => setTipoStockFiltro('AIP')}
            className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors flex items-center space-x-1.5 ${
              tipoStockFiltro === 'AIP'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
            }`}
          >
            <span>Solo Stock AIP (Préstamos)</span>
          </button>
          <button
            type="button"
            onClick={() => setTipoStockFiltro('DISTRIBUIDOS')}
            className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors flex items-center space-x-1.5 ${
              tipoStockFiltro === 'DISTRIBUIDOS'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200'
            }`}
          >
            <span>Solo Distribuidos (Oficinas)</span>
          </button>
        </div>

        {/* Barra de Selección Masiva */}
        <div className="flex items-center justify-between text-xs pt-1">
          <div className="flex items-center space-x-3">
            <button
              onClick={seleccionarTodosFiltrados}
              className="text-indigo-600 hover:text-indigo-800 font-medium flex items-center space-x-1.5"
            >
              <CheckSquare className="w-4 h-4" />
              <span>Seleccionar todos los filtrados ({bienesFiltrados.length})</span>
            </button>
            <span className="text-slate-300">|</span>
            <button
              onClick={deseleccionarTodos}
              className="text-slate-600 hover:text-slate-800 font-medium flex items-center space-x-1.5"
            >
              <Square className="w-4 h-4" />
              <span>Deseleccionar todos</span>
            </button>
          </div>

          <div className="font-semibold text-slate-700">
            {seleccionados.size} de {bienesFiltrados.length} equipos seleccionados
          </div>
        </div>
      </div>

      {/* Lista de selección rápida tipo checklist (No se imprime) */}
      <div className="no-print bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
        <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">
          Lista de Equipos Disponibles para Etiquetado
        </h3>
        {bienesFiltrados.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-xs">
            No hay equipos que coincidan con los filtros seleccionados.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 max-h-56 overflow-y-auto p-1">
            {bienesFiltrados.map((bien) => {
              const isSelected = seleccionados.has(bien.id);
              const amb = ambientes.find((a) => a.id === bien.ambiente_id);
              const esAIP = esAmbientePrestable(amb);
              const nombreAmbiente =
                amb?.nombre.trim().toLowerCase() === 'otros' && bien.ubicacion_detalle
                  ? `Otros — ${bien.ubicacion_detalle}`
                  : amb?.nombre || 'Oficina';

              return (
                <div
                  key={bien.id}
                  onClick={() => toggleSeleccion(bien.id)}
                  className={`p-2.5 rounded-xl border text-xs cursor-pointer transition-all flex items-center space-x-2.5 ${
                    isSelected
                      ? !esAIP
                        ? 'bg-amber-50 border-amber-400 text-amber-950 shadow-sm'
                        : 'bg-indigo-50/70 border-indigo-400 text-indigo-900 shadow-sm'
                      : !esAIP
                      ? 'bg-amber-50/40 border-amber-300 hover:border-amber-400 text-amber-900'
                      : 'bg-white border-slate-200 hover:border-slate-300 text-slate-700'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => {}}
                    className={`w-4 h-4 rounded cursor-pointer ${
                      !esAIP
                        ? 'text-amber-600 focus:ring-amber-500'
                        : 'text-indigo-600 focus:ring-indigo-500'
                    }`}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-1.5">
                      <span className="font-mono font-bold text-slate-900">
                        {bien.etiqueta_interna}
                      </span>
                      <span className="text-[10px] text-slate-500 truncate">
                        &bull; {bien.denominacion}
                      </span>
                    </div>
                    <div className="flex items-center space-x-1.5 mt-0.5">
                      {!esAIP ? (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-300 truncate">
                          DISTRIBUIDO: {nombreAmbiente}
                        </span>
                      ) : (
                        <span className="text-[9px] font-medium px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                          {amb?.nombre || 'AIP'}
                        </span>
                      )}
                      {bien.estado_operativo === 'PRESTADO' && (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 border border-blue-200">
                          En préstamo
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-slate-500 truncate mt-0.5">
                      Cód: {bien.codigo_patrimonial || 'S/C'} &bull; {bien.marca} {bien.modelo}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* VISTA PREVIA / HOJA IMPRIMIBLE DE ETIQUETAS */}
      <div className="space-y-3">
        <div className="no-print flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-800 flex items-center space-x-2">
            <Sparkles className="w-4 h-4 text-indigo-600" />
            <span>Vista Previa de Impresión ({bienesParaImprimir.length} etiquetas)</span>
          </h3>
          <span className="text-xs text-slate-500">
            Diseño optimizado para recorte y pegado en equipos
          </span>
        </div>

        {bienesParaImprimir.length === 0 ? (
          <div className="no-print p-12 text-center bg-white rounded-2xl border border-dashed border-slate-300">
            <QrCode className="w-12 h-12 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-medium text-slate-600">
              Ninguna etiqueta seleccionada para imprimir
            </p>
            <p className="text-xs text-slate-400 mt-1">
              Marca las casillas arriba para generar y visualizar los rótulos.
            </p>
          </div>
        ) : (
          <div className="print-label-grid grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4">
            {bienesParaImprimir.map((bien) => {
              const qrUrl = qrDataUrls[bien.id];
              const amb = ambientes.find((a) => a.id === bien.ambiente_id);
              const esAIP = esAmbientePrestable(amb);
              const nombreAmbiente =
                amb?.nombre.trim().toLowerCase() === 'otros' && bien.ubicacion_detalle
                  ? `Otros — ${bien.ubicacion_detalle}`
                  : amb?.nombre || 'Oficina';

              return (
                <div
                  key={bien.id}
                  className={`label-card bg-white border-2 border-dashed rounded-xl p-3 flex flex-col justify-between shadow-sm relative overflow-hidden ${
                    !esAIP
                      ? 'label-card-distribuido border-amber-400 border-t-4 border-t-amber-500 bg-amber-50/20'
                      : 'border-slate-300'
                  }`}
                  style={{ minHeight: '135px' }}
                >
                  {/* Cabecera miniatura de la etiqueta */}
                  <div className="flex items-center justify-between border-b border-slate-200 pb-1.5 mb-2">
                    <div className="flex items-center space-x-2">
                      <img
                        src="/logo-mamm.jpg"
                        alt="Logo"
                        className="w-5 h-5 object-contain flex-shrink-0"
                      />
                      <span className="text-[10px] font-black uppercase tracking-wider text-slate-800">
                        I.E.E. MANUEL ANTONIO MESONES MURO
                      </span>
                    </div>
                    {!esAIP ? (
                      <span className="text-[9px] font-extrabold text-amber-900 bg-amber-100 px-2 py-0.5 rounded border border-amber-400 uppercase tracking-tight">
                        ASIGNADO: {nombreAmbiente}
                      </span>
                    ) : (
                      <span className="text-[9px] font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-200 uppercase">
                        {amb?.nombre || 'AIP BAGUA'}
                      </span>
                    )}
                  </div>

                  {/* Cuerpo: QR + Datos del equipo */}
                  <div className="flex items-center space-x-3">
                    {/* Código QR */}
                    <div className="flex-shrink-0 bg-white p-1 border border-slate-200 rounded-lg flex items-center justify-center">
                      {qrUrl ? (
                        <img
                          src={qrUrl}
                          alt={`QR ${bien.etiqueta_interna}`}
                          className="w-20 h-20 object-contain"
                        />
                      ) : (
                        <div className="w-20 h-20 flex items-center justify-center text-slate-400">
                          <RefreshCw className="w-5 h-5 animate-spin" />
                        </div>
                      )}
                    </div>

                    {/* Información destacada */}
                    <div className="flex-1 min-w-0 space-y-1">
                      <div>
                        <span className="text-[9px] text-slate-400 font-semibold block uppercase leading-none">
                          {!esAIP ? 'Etiqueta Patrimonial' : 'Etiqueta Interna AIP'}
                        </span>
                        <span className="text-xl font-extrabold text-slate-900 font-mono tracking-tight block">
                          {bien.etiqueta_interna}
                        </span>
                      </div>

                      <div className="space-y-0.5 text-[10px] text-slate-600">
                        <p className="truncate">
                          <b className="text-slate-800">Cód. Pat:</b>{' '}
                          <span className="font-mono">{bien.codigo_patrimonial || 'S/C'}</span>
                        </p>
                        <p className="truncate">
                          <b className="text-slate-800">Bien:</b> {bien.denominacion}
                        </p>
                        <p className="truncate">
                          <b className="text-slate-800">Serie:</b>{' '}
                          <span className="font-mono">{bien.serie || bien.numero_serie || 'S/N'}</span>
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Pie de etiqueta */}
                  <div className="mt-2 pt-1 border-t border-slate-100 flex items-center justify-between text-[9px] text-slate-400">
                    <span>Marca: {bien.marca}</span>
                    {!esAIP ? (
                      <span className="font-bold text-amber-900 uppercase">
                        Uso Exclusivo de Oficina / Área
                      </span>
                    ) : (
                      <span>Inventario Patrimonial</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};