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
  Palette,
  X,
  CheckCircle2,
  Scissors,
  SlidersHorizontal,
  LayoutGrid,
  Eye,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import {
  Bien,
  Ambiente,
  CategoriaEquipo,
  esAmbientePrestable,
  COLORES_LOTE_PREDEFINIDOS,
  deducirColorLote,
} from '@/types';
import { bienRepository } from '@/repositories';
import { useAuth } from '@/hooks';

interface GeneradorEtiquetasQRProps {
  bienes: Bien[];
  ambientes: Ambiente[];
  categorias: CategoriaEquipo[];
  onBienesActualizados?: () => void;
}

export const GeneradorEtiquetasQR: React.FC<GeneradorEtiquetasQRProps> = ({
  bienes,
  ambientes,
  categorias,
  onBienesActualizados,
}) => {
  const { user, perfil } = useAuth();
  const esAdmin = perfil?.rol === 'ADMIN';

  const [tipoStockFiltro, setTipoStockFiltro] = useState<'TODOS' | 'AIP' | 'DISTRIBUIDOS'>('TODOS');
  const [ambienteFiltro, setAmbienteFiltro] = useState<string>('TODOS');
  const [categoriaFiltro, setCategoriaFiltro] = useState<string>('TODAS');
  const [loteFiltro, setLoteFiltro] = useState<string>('TODOS');
  const [busqueda, setBusqueda] = useState<string>('');
  const [seleccionados, setSeleccionados] = useState<Set<string>>(new Set());
  const [qrDataUrls, setQrDataUrls] = useState<Record<string, string>>({});
  const [generandoQRs, setGenerandoQRs] = useState(false);
  const [mostrarFranjaColor, setMostrarFranjaColor] = useState<boolean>(true);

  // Configuración de formato de impresión de rótulos físicos (4 a 5 por fila)
  const [columnasImpresion, setColumnasImpresion] = useState<3 | 4 | 5>(4);
  const [mostrarGuiasCorte, setMostrarGuiasCorte] = useState<boolean>(true);
  const [mostrarLogo, setMostrarLogo] = useState<boolean>(true);

  // Modo de visualización en pantalla dentro de la aplicación
  const [modoVistaApp, setModoVistaApp] = useState<'TARJETAS' | 'SIMULADOR_A4'>('TARJETAS');
  const [paginaSimulador, setPaginaSimulador] = useState<number>(1);

  // Capacidad de etiquetas por hoja A4 según densidad seleccionada
  const capacidadPorHoja = useMemo(() => {
    switch (columnasImpresion) {
      case 5:
        return {
          cols: 5,
          rows: 8,
          total: 40,
          anchoMm: 38,
          altoMm: 33,
          label: '5 por Fila (40 / hoja)',
          sublabel: 'Compacto • Máximo Ahorro',
          stripeWidth: '2.8mm',
        };
      case 3:
        return {
          cols: 3,
          rows: 6,
          total: 18,
          anchoMm: 63,
          altoMm: 44,
          label: '3 por Fila (18 / hoja)',
          sublabel: 'Grande • Gabinetes / TVs',
          stripeWidth: '4.5mm',
        };
      case 4:
      default:
        return {
          cols: 4,
          rows: 7,
          total: 28,
          anchoMm: 48,
          altoMm: 38,
          label: '4 por Fila (28 / hoja)',
          sublabel: 'Recomendado • Laptops AIP',
          stripeWidth: '3.5mm',
        };
    }
  }, [columnasImpresion]);

  // Modal para asignar lote masivo a seleccionados
  const [modalAsignarLoteOpen, setModalAsignarLoteOpen] = useState(false);
  const [loteAsignarSelect, setLoteAsignarSelect] = useState<string>('LOTE NARANJA');
  const [loteAsignarNombreOtro, setLoteAsignarNombreOtro] = useState<string>('');
  const [loteAsignarColor, setLoteAsignarColor] = useState<string>('#EA580C');
  const [guardandoLoteMasivo, setGuardandoLoteMasivo] = useState(false);
  const [mensajeLoteMasivo, setMensajeLoteMasivo] = useState<string | null>(null);

  // Lotes únicos detectados en los bienes
  const lotesDisponibles = useMemo(() => {
    const set = new Set<string>();
    bienes.forEach((b) => {
      if (b.lote_etiqueta?.trim()) set.add(b.lote_etiqueta.trim());
    });
    return Array.from(set).sort();
  }, [bienes]);

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
      if (loteFiltro !== 'TODOS') {
        if (loteFiltro === '__SIN_LOTE__') {
          if (bien.lote_etiqueta && bien.lote_etiqueta.trim()) return false;
        } else if (bien.lote_etiqueta?.trim() !== loteFiltro) {
          return false;
        }
      }
      if (busqueda.trim()) {
        const query = busqueda.toLowerCase().trim();
        const coincide =
          (bien.etiqueta_interna && bien.etiqueta_interna.toLowerCase().includes(query)) ||
          bien.denominacion.toLowerCase().includes(query) ||
          (bien.codigo_patrimonial && bien.codigo_patrimonial.toLowerCase().includes(query)) ||
          (bien.serie && bien.serie.toLowerCase().includes(query)) ||
          (bien.numero_serie && bien.numero_serie.toLowerCase().includes(query)) ||
          (bien.lote_etiqueta && bien.lote_etiqueta.toLowerCase().includes(query)) ||
          bien.marca.toLowerCase().includes(query);
        if (!coincide) return false;
      }
      return true;
    }).sort((a, b) => {
      const etqA = a.etiqueta_interna || a.codigo_patrimonial || '';
      const etqB = b.etiqueta_interna || b.codigo_patrimonial || '';
      return etqA.localeCompare(etqB, undefined, { numeric: true, sensitivity: 'base' });
    });
  }, [bienes, ambientes, tipoStockFiltro, ambienteFiltro, categoriaFiltro, loteFiltro, busqueda]);

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

  // Bienes elegidos para imprimir (con ordenamiento natural)
  const bienesParaImprimir = useMemo(() => {
    return bienes
      .filter((b) => seleccionados.has(b.id))
      .sort((a, b) => {
        const etqA = a.etiqueta_interna || a.codigo_patrimonial || '';
        const etqB = b.etiqueta_interna || b.codigo_patrimonial || '';
        return etqA.localeCompare(etqB, undefined, { numeric: true, sensitivity: 'base' });
      });
  }, [bienes, seleccionados]);

  // Total estimado de hojas A4 según capacidad por hoja
  const totalHojasEstimadas = useMemo(() => {
    if (bienesParaImprimir.length === 0) return 0;
    return Math.ceil(bienesParaImprimir.length / capacidadPorHoja.total);
  }, [bienesParaImprimir.length, capacidadPorHoja.total]);

  // Equipos correspondientes a la página activa en el simulador A4
  const itemsPaginaSimulador = useMemo(() => {
    const inicio = (paginaSimulador - 1) * capacidadPorHoja.total;
    return bienesParaImprimir.slice(inicio, inicio + capacidadPorHoja.total);
  }, [bienesParaImprimir, paginaSimulador, capacidadPorHoja.total]);

  // Mantener la página del simulador dentro de los límites válidos
  useEffect(() => {
    if (paginaSimulador > totalHojasEstimadas && totalHojasEstimadas > 0) {
      setPaginaSimulador(totalHojasEstimadas);
    }
  }, [totalHojasEstimadas, paginaSimulador]);

  // Generar QRs con qrcode.toDataURL para los seleccionados (alta resolución 240px)
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
              width: 240,
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

  const handleAsignarLoteMasivo = async () => {
    if (seleccionados.size === 0) return;
    setGuardandoLoteMasivo(true);
    setMensajeLoteMasivo(null);

    let etiquetaFinal = '';
    let colorFinal = '';
    if (loteAsignarSelect === 'OTRO') {
      if (!loteAsignarNombreOtro.trim()) {
        setMensajeLoteMasivo('Debe especificar el nombre del lote personalizado.');
        setGuardandoLoteMasivo(false);
        return;
      }
      etiquetaFinal = loteAsignarNombreOtro.trim().toUpperCase();
      colorFinal = loteAsignarColor.trim() || '#6366F1';
    } else if (loteAsignarSelect) {
      etiquetaFinal = loteAsignarSelect;
      colorFinal = loteAsignarColor.trim() || deducirColorLote(loteAsignarSelect);
    }

    try {
      const operador = user ? { uid: user.uid, email: user.email || '' } : undefined;
      const ids = Array.from(seleccionados);
      await bienRepository.asignarLoteMasivo(ids, etiquetaFinal, colorFinal, operador);
      if (onBienesActualizados) {
        onBienesActualizados();
      }
      setMensajeLoteMasivo(`¡Lote ${etiquetaFinal || 'Sin Lote'} asignado a ${ids.length} equipos!`);
      setTimeout(() => {
        setModalAsignarLoteOpen(false);
        setMensajeLoteMasivo(null);
      }, 1200);
    } catch (err: any) {
      console.error('Error al asignar lote masivo:', err);
      setMensajeLoteMasivo('Error al actualizar el lote de los equipos.');
    } finally {
      setGuardandoLoteMasivo(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Estilos para impresión de etiquetas A4 */}
      <style>{`
        /* EN PANTALLA NORMAL: Ocultar el contenedor exclusivo de impresión */
        .print-only-container {
          display: none !important;
        }

        @media print {
          @page {
            size: A4 portrait;
            margin: 6mm 6mm;
          }
          body, html, #root {
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
            width: 100% !important;
            height: auto !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .no-print {
            display: none !important;
          }
          aside, header, nav {
            display: none !important;
          }
          .print-only-container {
            display: grid !important;
            width: 100% !important;
            box-sizing: border-box !important;
          }

          /* Modo 4 columnas (Recomendado Laptops - 28 etiquetas por hoja A4: 7 filas x 4 cols) */
          .print-grid-cols-4 {
            grid-template-columns: repeat(4, minmax(0, 1fr)) !important;
            gap: 2mm !important;
          }
          .print-grid-cols-4 .label-card {
            height: 38mm !important;
            max-height: 38mm !important;
            padding: 1.8mm 2mm 1.5mm 4.5mm !important;
          }
          .print-grid-cols-4 .label-qr-box {
            width: 20mm !important;
            height: 20mm !important;
            min-width: 20mm !important;
          }
          .print-grid-cols-4 .label-qr-img {
            width: 19mm !important;
            height: 19mm !important;
          }

          /* Modo 5 columnas (Compacto / Máximo Ahorro - 40 etiquetas por hoja A4: 8 filas x 5 cols) */
          .print-grid-cols-5 {
            grid-template-columns: repeat(5, minmax(0, 1fr)) !important;
            gap: 1.5mm !important;
          }
          .print-grid-cols-5 .label-card {
            height: 33mm !important;
            max-height: 33mm !important;
            padding: 1.2mm 1.5mm 1mm 3.8mm !important;
          }
          .print-grid-cols-5 .label-qr-box {
            width: 16.5mm !important;
            height: 16.5mm !important;
            min-width: 16.5mm !important;
          }
          .print-grid-cols-5 .label-qr-img {
            width: 15.5mm !important;
            height: 15.5mm !important;
          }

          /* Modo 3 columnas (Grande - 18 etiquetas por hoja A4: 6 filas x 3 cols) */
          .print-grid-cols-3 {
            grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
            gap: 2.5mm !important;
          }
          .print-grid-cols-3 .label-card {
            height: 44mm !important;
            max-height: 44mm !important;
            padding: 2.5mm 3mm 2mm 5.5mm !important;
          }
          .print-grid-cols-3 .label-qr-box {
            width: 25mm !important;
            height: 25mm !important;
            min-width: 25mm !important;
          }
          .print-grid-cols-3 .label-qr-img {
            width: 24mm !important;
            height: 24mm !important;
          }

          .label-card {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            box-sizing: border-box !important;
            background: #ffffff !important;
            position: relative !important;
            overflow: hidden !important;
            display: flex !important;
            flex-direction: column !important;
            justify-content: space-between !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .label-card-corte {
            border: 1px dashed #94a3b8 !important;
          }
          .label-card-sin-corte {
            border: 1px solid #cbd5e1 !important;
          }
          .label-color-stripe {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            bottom: 0 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .label-card-distribuido {
            border: 1.5px solid #d97706 !important;
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
                Identificación física para computadoras y laptops con código QR de escaneo rápido
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {esAdmin && (
              <button
                type="button"
                onClick={() => {
                  setMensajeLoteMasivo(null);
                  setModalAsignarLoteOpen(true);
                }}
                disabled={seleccionados.size === 0}
                className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 disabled:bg-slate-50 disabled:text-slate-300 text-slate-700 font-semibold text-xs rounded-xl border border-slate-300 transition-colors flex items-center space-x-1.5 shadow-xs"
                title="Asignar lote y color a los equipos seleccionados"
              >
                <Palette className="w-4 h-4 text-indigo-600" />
                <span>Asignar Lote ({seleccionados.size})</span>
              </button>
            )}

            <button
              onClick={handleImprimir}
              disabled={seleccionados.size === 0 || generandoQRs}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-semibold text-xs rounded-xl shadow transition-colors flex items-center space-x-2"
            >
              <Printer className="w-4 h-4" />
              <span>
                {generandoQRs
                  ? 'Generando QRs...'
                  : `Imprimir ${seleccionados.size} Etiquetas (${totalHojasEstimadas} ${
                      totalHojasEstimadas === 1 ? 'Hoja' : 'Hojas'
                    })`}
              </span>
            </button>
          </div>
        </div>

        {/* Filtros */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-2 border-t border-slate-100">
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

          <div>
            <select
              value={loteFiltro}
              onChange={(e) => setLoteFiltro(e.target.value)}
              className="w-full text-xs px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-700 font-medium"
            >
              <option value="TODOS">Todos los Lotes</option>
              <option value="__SIN_LOTE__">(Sin lote asignado)</option>
              {lotesDisponibles.map((lote) => (
                <option key={lote} value={lote}>
                  {lote}
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
            {bienesFiltrados.map((bien, idx) => {
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
                      <span className="font-mono text-slate-400 text-[11px] font-semibold">
                        {String(idx + 1).padStart(2, '0')}.
                      </span>
                      <span className="font-mono font-bold text-slate-900">
                        {bien.etiqueta_interna}
                      </span>
                      <span className="text-[10px] text-slate-500 truncate">
                        &bull; {bien.denominacion}
                      </span>
                    </div>
                    <div className="flex items-center space-x-1.5 mt-0.5 flex-wrap gap-y-1">
                      {!esAIP ? (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-300 truncate">
                          DISTRIBUIDO: {nombreAmbiente}
                        </span>
                      ) : (
                        <span className="text-[9px] font-medium px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                          {amb?.nombre || 'AIP'}
                        </span>
                      )}
                      {bien.lote_etiqueta && (
                        <span
                          className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md text-[9px] font-bold text-white shadow-xs tracking-wide uppercase truncate"
                          style={{
                            backgroundColor: bien.lote_color || '#475569',
                          }}
                          title={`Lote: ${bien.lote_etiqueta}`}
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-white inline-block shrink-0" />
                          <span className="truncate max-w-[90px]">{bien.lote_etiqueta}</span>
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

      {/* VISTA PREVIA Y CONFIGURACIÓN DEL FORMATO DE IMPRESIÓN */}
      <div className="space-y-4">
        {/* Barra de Configuración de Formato Físico (No se imprime) */}
        <div className="no-print bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-4 sm:p-5 rounded-2xl shadow-lg border border-slate-800 space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            {/* Título y descripción */}
            <div>
              <div className="flex items-center space-x-2">
                <SlidersHorizontal className="w-4 h-4 text-indigo-400" />
                <h3 className="text-sm font-bold tracking-wide">
                  Configuración de Hoja de Impresión A4
                </h3>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Ajusta la densidad de columnas y filas según el tamaño físico deseado para adherir a las laptops
              </p>
            </div>

            {/* Selector de Densidad (Columnas por fila) */}
            <div className="flex items-center bg-slate-800/80 p-1 rounded-xl border border-slate-700/80 self-start sm:self-auto">
              <button
                type="button"
                onClick={() => setColumnasImpresion(4)}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center space-x-1.5 ${
                  columnasImpresion === 4
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-300 hover:text-white'
                }`}
                title="4 rótulos por fila (~48 x 38 mm). 28 rótulos por hoja A4. Tamaño ideal para laptops."
              >
                <span>4 por Fila (28 / hoja)</span>
                <span className="text-[9px] px-1.5 py-0.2 bg-indigo-500/50 rounded-full font-normal hidden sm:inline">
                  Recomendado
                </span>
              </button>

              <button
                type="button"
                onClick={() => setColumnasImpresion(5)}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center space-x-1.5 ${
                  columnasImpresion === 5
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-300 hover:text-white'
                }`}
                title="5 rótulos por fila (~38 x 33 mm). 40 rótulos por hoja A4. Formato ultra compacto y económico."
              >
                <span>5 por Fila (40 / hoja)</span>
                <span className="text-[9px] px-1.5 py-0.2 bg-emerald-500/50 text-emerald-200 rounded-full font-normal hidden sm:inline">
                  Compacto
                </span>
              </button>

              <button
                type="button"
                onClick={() => setColumnasImpresion(3)}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center space-x-1.5 ${
                  columnasImpresion === 3
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-300 hover:text-white'
                }`}
                title="3 rótulos por fila (~63 x 44 mm). 18 rótulos por hoja A4. Formato grande para gabinetes PC o pantallas."
              >
                <span>3 por Fila (18 / hoja)</span>
              </button>
            </div>
          </div>

          {/* Opciones Adicionales de Estilo y Corte */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-800 text-xs">
            <div className="flex flex-wrap items-center gap-4">
              <label className="flex items-center space-x-2 cursor-pointer select-none text-slate-200 hover:text-white">
                <input
                  type="checkbox"
                  checked={mostrarFranjaColor}
                  onChange={(e) => setMostrarFranjaColor(e.target.checked)}
                  className="w-4 h-4 text-indigo-500 rounded border-slate-700 bg-slate-800 focus:ring-indigo-400 cursor-pointer"
                />
                <span className="font-medium">Franja lateral de color de lote</span>
              </label>

              <label className="flex items-center space-x-2 cursor-pointer select-none text-slate-200 hover:text-white">
                <input
                  type="checkbox"
                  checked={mostrarGuiasCorte}
                  onChange={(e) => setMostrarGuiasCorte(e.target.checked)}
                  className="w-4 h-4 text-indigo-500 rounded border-slate-700 bg-slate-800 focus:ring-indigo-400 cursor-pointer"
                />
                <span className="font-medium flex items-center space-x-1">
                  <Scissors className="w-3.5 h-3.5 text-amber-400" />
                  <span>Líneas guía para recorte (Tijera / Guillotina)</span>
                </span>
              </label>

              <label className="flex items-center space-x-2 cursor-pointer select-none text-slate-200 hover:text-white">
                <input
                  type="checkbox"
                  checked={mostrarLogo}
                  onChange={(e) => setMostrarLogo(e.target.checked)}
                  className="w-4 h-4 text-indigo-500 rounded border-slate-700 bg-slate-800 focus:ring-indigo-400 cursor-pointer"
                />
                <span className="font-medium">Insignia institucional MAMM</span>
              </label>
            </div>

            {/* Resumen de Hojas y Acción */}
            <div className="flex items-center space-x-3 w-full sm:w-auto justify-between sm:justify-end">
              <div className="text-right">
                <span className="text-[11px] text-slate-400 block">
                  {bienesParaImprimir.length} seleccionados &bull; {capacidadPorHoja.cols} cols &times; {capacidadPorHoja.rows} filas
                </span>
                <span className="text-xs font-bold text-indigo-300">
                  {totalHojasEstimadas === 0
                    ? '0 hojas requeridas'
                    : `Se imprimirán en ${totalHojasEstimadas} ${
                        totalHojasEstimadas === 1 ? 'hoja A4' : 'hojas A4'
                      }`}
                </span>
              </div>

              <button
                type="button"
                onClick={handleImprimir}
                disabled={bienesParaImprimir.length === 0 || generandoQRs}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-700 disabled:text-slate-500 disabled:cursor-not-allowed text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center space-x-2 shrink-0"
              >
                <Printer className="w-4 h-4" />
                <span>Imprimir / PDF</span>
              </button>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 1. VISTA EN PANTALLA DENTRO DE LA APLICACIÓN (no-print)                    */}
        {/* Diseño visual compacto, legible, elegante y no invasivo en el navegador   */}
        {/* ========================================================================= */}
        <div className="no-print space-y-3">
          {bienesParaImprimir.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-2xl border border-dashed border-slate-300">
              <QrCode className="w-12 h-12 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-medium text-slate-600">
                Ninguna etiqueta seleccionada para previsualizar
              </p>
              <p className="text-xs text-slate-400 mt-1">
                Marca las casillas en la lista superior para generar y previsualizar los rótulos.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Barra de Controles de Visualización en Pantalla */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-white px-4 py-2.5 rounded-xl border border-slate-200 shadow-2xs">
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-bold text-slate-800">
                    Vista Previa en App ({bienesParaImprimir.length} equipos)
                  </span>
                  <span className="text-slate-300">|</span>
                  <span className="text-xs text-slate-500">
                    Salida física: <strong className="text-slate-700">{capacidadPorHoja.label}</strong> ({totalHojasEstimadas} {totalHojasEstimadas === 1 ? 'hoja A4' : 'hojas A4'})
                  </span>
                </div>

                {/* Selector de modo de vista en la app */}
                <div className="flex items-center space-x-1.5 self-start sm:self-auto">
                  <button
                    type="button"
                    onClick={() => setModoVistaApp('TARJETAS')}
                    className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all flex items-center space-x-1.5 ${
                      modoVistaApp === 'TARJETAS'
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    <LayoutGrid className="w-3.5 h-3.5" />
                    <span>Tarjetas Compactas</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setModoVistaApp('SIMULADOR_A4')}
                    className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all flex items-center space-x-1.5 ${
                      modoVistaApp === 'SIMULADOR_A4'
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Simulador Hoja A4</span>
                  </button>
                </div>
              </div>

              {/* MODO A: TARJETAS COMPACTAS (Diseño limpio, cómodo y perfectamente proporcionado) */}
              {modoVistaApp === 'TARJETAS' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
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
                        key={`app-${bien.id}`}
                        className={`bg-white rounded-xl border transition-all p-3 relative overflow-hidden flex flex-col justify-between shadow-2xs hover:shadow-md hover:border-indigo-300 ${
                          !esAIP
                            ? 'border-amber-300 bg-amber-50/20'
                            : 'border-slate-200'
                        }`}
                        style={{
                          paddingLeft: mostrarFranjaColor && bien.lote_etiqueta ? '14px' : '12px',
                          minHeight: '122px',
                        }}
                      >
                        {/* Franja vertical de color de lote */}
                        {mostrarFranjaColor && bien.lote_etiqueta && (
                          <div
                            className="absolute left-0 top-0 bottom-0 w-1.5 z-10"
                            style={{ backgroundColor: bien.lote_color || '#EA580C' }}
                            title={`Lote: ${bien.lote_etiqueta}`}
                          />
                        )}

                        {/* Cabecera miniatura */}
                        <div className="flex items-center justify-between pb-1.5 border-b border-slate-100 gap-2">
                          <div className="flex items-center space-x-1.5 min-w-0">
                            {mostrarLogo && (
                              <img
                                src="/logo-mamm.jpg"
                                alt="MAMM"
                                className="w-4 h-4 object-contain shrink-0 rounded-xs"
                              />
                            )}
                            <span className="text-[11px] font-bold text-slate-800 truncate">
                              I.E.E. Mesones Muro
                            </span>
                          </div>

                          <div className="flex items-center space-x-1 shrink-0">
                            {bien.lote_etiqueta && (
                              <span
                                className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[9.5px] font-black uppercase text-white shadow-2xs tracking-wide"
                                style={{ backgroundColor: bien.lote_color || '#EA580C' }}
                              >
                                <span className="w-1.5 h-1.5 rounded-full bg-white shrink-0" />
                                <span className="truncate max-w-[85px]">{bien.lote_etiqueta}</span>
                              </span>
                            )}
                            {!esAIP && (
                              <span className="text-[9.5px] font-bold text-amber-900 bg-amber-100 border border-amber-300 px-1.5 py-0.5 rounded uppercase truncate max-w-[75px]">
                                {nombreAmbiente}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Cuerpo central: QR compacto a la izquierda + Datos legibles a la derecha */}
                        <div className="flex items-center space-x-2.5 py-1.5">
                          {/* QR compacto */}
                          <div className="w-14 h-14 shrink-0 bg-white p-1 border border-slate-200 rounded-lg shadow-2xs flex items-center justify-center">
                            {qrUrl ? (
                              <img
                                src={qrUrl}
                                alt={`QR ${bien.etiqueta_interna}`}
                                className="w-12 h-12 object-contain"
                              />
                            ) : (
                              <RefreshCw className="w-4 h-4 text-slate-400 animate-spin" />
                            )}
                          </div>

                          {/* Información del equipo */}
                          <div className="flex-1 min-w-0 space-y-0.5">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-black font-mono text-slate-900 tracking-tight">
                                {bien.etiqueta_interna || 'S/E'}
                              </span>
                              <span className="text-[10px] font-medium text-slate-400 uppercase">
                                {!esAIP ? 'Área' : 'AIP'}
                              </span>
                            </div>

                            <p className="text-xs font-mono text-slate-700 font-semibold truncate leading-tight">
                              <strong className="text-slate-900 font-sans">Cód:</strong> {bien.codigo_patrimonial || 'S/C'}
                            </p>

                            <p className="text-[11px] text-slate-600 truncate leading-tight">
                              <strong className="text-slate-800">Bien:</strong> {bien.denominacion}
                            </p>

                            <p className="text-[11px] font-mono text-slate-500 truncate leading-tight">
                              <strong className="text-slate-700 font-sans">S/N:</strong> {bien.serie || bien.numero_serie || 'S/N'}
                            </p>
                          </div>
                        </div>

                        {/* Pie de tarjeta en pantalla */}
                        <div className="pt-1 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400">
                          <span className="truncate font-medium text-slate-500">
                            {esAIP ? (amb?.nombre || 'AIP 1') : `Ubicación: ${nombreAmbiente}`}
                          </span>
                          <span className="shrink-0 font-medium text-indigo-600 bg-indigo-50 px-1.5 py-0.2 rounded text-[9.5px]">
                            Formato: {capacidadPorHoja.cols}&times;{capacidadPorHoja.rows}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* MODO B: SIMULADOR HOJA A4 (Hoja virtual a escala exacta para visualizar por página) */}
              {modoVistaApp === 'SIMULADOR_A4' && (
                <div className="space-y-3">
                  {/* Controles de paginación de la hoja A4 */}
                  <div className="flex items-center justify-between bg-white px-4 py-2 rounded-xl border border-slate-200 shadow-2xs">
                    <button
                      type="button"
                      onClick={() => setPaginaSimulador((p) => Math.max(1, p - 1))}
                      disabled={paginaSimulador === 1}
                      className="px-3 py-1 text-xs font-semibold bg-slate-100 hover:bg-slate-200 disabled:opacity-40 rounded-lg text-slate-700 flex items-center space-x-1"
                    >
                      <ChevronLeft className="w-4 h-4" />
                      <span>Hoja Anterior</span>
                    </button>

                    <div className="text-xs font-bold text-slate-800 flex items-center space-x-2">
                      <span className="px-2 py-0.5 bg-indigo-100 text-indigo-800 rounded-md">
                        Hoja {paginaSimulador} de {totalHojasEstimadas}
                      </span>
                      <span className="text-slate-500 font-normal">
                        (Equipos {(paginaSimulador - 1) * capacidadPorHoja.total + 1} al{' '}
                        {Math.min(paginaSimulador * capacidadPorHoja.total, bienesParaImprimir.length)})
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => setPaginaSimulador((p) => Math.min(totalHojasEstimadas, p + 1))}
                      disabled={paginaSimulador === totalHojasEstimadas}
                      className="px-3 py-1 text-xs font-semibold bg-slate-100 hover:bg-slate-200 disabled:opacity-40 rounded-lg text-slate-700 flex items-center space-x-1"
                    >
                      <span>Siguiente Hoja</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Hoja A4 virtual a escala */}
                  <div className="max-w-[780px] mx-auto bg-white border border-slate-300 shadow-2xl rounded-sm p-3.5 sm:p-4 aspect-[210/297] flex flex-col justify-start overflow-hidden">
                    <div className="text-[10px] text-slate-400 font-mono text-center pb-2 border-b border-dashed border-slate-200 mb-2">
                      --- SIMULACIÓN HOJA A4 ({capacidadPorHoja.cols} columnas &times; {capacidadPorHoja.rows} filas &bull; Pág. {paginaSimulador}/{totalHojasEstimadas}) ---
                    </div>

                    <div
                      className={`grid gap-1.5 flex-1 ${
                        columnasImpresion === 5
                          ? 'grid-cols-5'
                          : columnasImpresion === 3
                          ? 'grid-cols-3'
                          : 'grid-cols-4'
                      }`}
                    >
                      {itemsPaginaSimulador.map((bien) => {
                        const qrUrl = qrDataUrls[bien.id];
                        const amb = ambientes.find((a) => a.id === bien.ambiente_id);
                        const esAIP = esAmbientePrestable(amb);

                        return (
                          <div
                            key={`sim-${bien.id}`}
                            className={`border rounded p-1 flex flex-col justify-between relative overflow-hidden bg-white text-[8px] ${
                              mostrarGuiasCorte ? 'border-dashed border-slate-400' : 'border-slate-300'
                            } ${!esAIP ? 'bg-amber-50/20 border-amber-400' : ''}`}
                            style={{
                              paddingLeft: mostrarFranjaColor && bien.lote_etiqueta ? '8px' : '4px',
                              minHeight: columnasImpresion === 5 ? '48px' : '58px',
                            }}
                          >
                            {mostrarFranjaColor && bien.lote_etiqueta && (
                              <div
                                className="absolute left-0 top-0 bottom-0 w-1 z-10"
                                style={{ backgroundColor: bien.lote_color || '#EA580C' }}
                              />
                            )}

                            <div className="flex items-center justify-between leading-none truncate border-b border-slate-100 pb-0.5">
                              <span className="font-bold text-[7px] truncate text-slate-800">
                                MAMM
                              </span>
                              {bien.lote_etiqueta && (
                                <span
                                  className="px-1 py-0.2 rounded text-[6px] text-white font-bold"
                                  style={{ backgroundColor: bien.lote_color || '#EA580C' }}
                                >
                                  {bien.lote_etiqueta}
                                </span>
                              )}
                            </div>

                            <div className="flex items-center space-x-1 my-0.5">
                              {qrUrl ? (
                                <img src={qrUrl} alt="" className="w-6 h-6 object-contain shrink-0" />
                              ) : (
                                <div className="w-6 h-6 bg-slate-100" />
                              )}
                              <div className="min-w-0 flex-1 leading-none space-y-0.5">
                                <span className="font-mono font-black text-[9px] block truncate text-slate-900">
                                  {bien.etiqueta_interna}
                                </span>
                                <span className="text-[6.5px] font-mono text-slate-600 block truncate">
                                  {bien.codigo_patrimonial || 'S/C'}
                                </span>
                                <span className="text-[6px] text-slate-500 block truncate">
                                  {bien.denominacion}
                                </span>
                              </div>
                            </div>

                            <div className="flex justify-between items-center text-[6px] text-slate-400 border-t border-slate-100 pt-0.5 leading-none">
                              <span>{amb?.nombre || 'AIP'}</span>
                              <span>{mostrarGuiasCorte ? '✂ CORTE' : 'MAMM'}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ========================================================================= */}
        {/* 2. CONTENEDOR EXCLUSIVO DE IMPRESIÓN (SOLO IMPRESIÓN / PDF)               */}
        {/* Mantiene EXACTAMENTE la configuración milimétrica 4/5 cols aprobada       */}
        {/* ========================================================================= */}
        <div
          className={`print-only-container print-label-grid ${
            columnasImpresion === 5
              ? 'print-grid-cols-5'
              : columnasImpresion === 3
              ? 'print-grid-cols-3'
              : 'print-grid-cols-4'
          }`}
        >
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
                  className={`label-card bg-white rounded-lg shadow-2xs relative overflow-hidden transition-all ${
                    mostrarGuiasCorte ? 'label-card-corte' : 'label-card-sin-corte'
                  } ${
                    !esAIP
                      ? 'label-card-distribuido border-amber-400 bg-amber-50/20'
                      : ''
                  }`}
                  style={{
                    paddingLeft:
                      mostrarFranjaColor && bien.lote_etiqueta
                        ? columnasImpresion === 5
                          ? '12px'
                          : '14px'
                        : undefined,
                  }}
                >
                  {/* Franja vertical de color de lote en el lateral izquierdo */}
                  {mostrarFranjaColor && bien.lote_etiqueta && (
                    <div
                      className="label-color-stripe absolute left-0 top-0 bottom-0 z-10"
                      style={{
                        width: capacidadPorHoja.stripeWidth,
                        backgroundColor: bien.lote_color || '#EA580C',
                        WebkitPrintColorAdjust: 'exact',
                        printColorAdjust: 'exact',
                      }}
                      title={`Lote: ${bien.lote_etiqueta}`}
                    />
                  )}

                  {/* Cabecera miniatura de la etiqueta */}
                  <div className="flex items-center justify-between border-b border-slate-200 pb-1 mb-1 pl-0.5">
                    <div className="flex items-center space-x-1.5 min-w-0">
                      {mostrarLogo && (
                        <img
                          src="/logo-mamm.jpg"
                          alt="Logo MAMM"
                          className={`object-contain shrink-0 ${
                            columnasImpresion === 5
                              ? 'w-3 h-3'
                              : columnasImpresion === 4
                              ? 'w-3.5 h-3.5'
                              : 'w-4 h-4'
                          }`}
                        />
                      )}
                      <span
                        className={`font-black uppercase tracking-tight text-slate-800 truncate leading-none ${
                          columnasImpresion === 5
                            ? 'text-[6.5px]'
                            : columnasImpresion === 4
                            ? 'text-[7.5px]'
                            : 'text-[9px]'
                        }`}
                      >
                        {columnasImpresion === 5
                          ? 'I.E.E. MESONES MURO'
                          : 'I.E.E. M. A. MESONES MURO'}
                      </span>
                    </div>

                    <div className="flex items-center space-x-1 shrink-0 ml-1">
                      {bien.lote_etiqueta && (
                        <span
                          className="inline-flex items-center px-1.5 py-0.5 rounded text-white font-extrabold uppercase tracking-wider leading-none shadow-2xs"
                          style={{
                            backgroundColor: bien.lote_color || '#EA580C',
                            fontSize: columnasImpresion === 5 ? '5.5px' : '6.5px',
                            WebkitPrintColorAdjust: 'exact',
                            printColorAdjust: 'exact',
                          }}
                        >
                          {bien.lote_etiqueta}
                        </span>
                      )}

                      {!esAIP && (
                        <span
                          className="bg-amber-100 text-amber-900 border border-amber-300 font-bold px-1 py-0.2 rounded uppercase leading-none truncate max-w-[65px]"
                          style={{
                            fontSize: columnasImpresion === 5 ? '5.5px' : '6.5px',
                          }}
                        >
                          {nombreAmbiente}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Cuerpo: QR + Datos clave para identificación física de laptops */}
                  <div className="flex items-center space-x-2 flex-1 min-w-0">
                    {/* Código QR optimizado para lector de cámara y escáner USB */}
                    <div className="label-qr-box shrink-0 bg-white p-0.5 border border-slate-200 rounded flex items-center justify-center">
                      {qrUrl ? (
                        <img
                          src={qrUrl}
                          alt={`QR ${bien.etiqueta_interna}`}
                          className="label-qr-img object-contain"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-400">
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        </div>
                      )}
                    </div>

                    {/* Datos del bien: Identificador grande, código patrimonial y serie */}
                    <div className="flex-1 min-w-0 space-y-0.5">
                      <div>
                        <span
                          className="text-slate-400 font-semibold uppercase block leading-none tracking-tight"
                          style={{
                            fontSize: columnasImpresion === 5 ? '5.5px' : '6.5px',
                          }}
                        >
                          {!esAIP ? 'Etiqueta Área' : 'Etiqueta Interna AIP'}
                        </span>
                        <span
                          className={`font-mono font-black text-slate-900 tracking-tight block leading-tight ${
                            columnasImpresion === 5
                              ? 'text-[11px]'
                              : columnasImpresion === 4
                              ? 'text-[13px]'
                              : 'text-[15px]'
                          }`}
                        >
                          {bien.etiqueta_interna}
                        </span>
                      </div>

                      <div className="space-y-0.2 leading-tight">
                        <p
                          className="truncate font-mono text-slate-700"
                          style={{
                            fontSize: columnasImpresion === 5 ? '6px' : '7px',
                          }}
                        >
                          <strong className="text-slate-900">Cód:</strong>{' '}
                          {bien.codigo_patrimonial || 'S/C'}
                        </p>
                        <p
                          className="truncate text-slate-600"
                          style={{
                            fontSize: columnasImpresion === 5 ? '5.5px' : '6.5px',
                          }}
                        >
                          <strong className="text-slate-800">Bien:</strong> {bien.denominacion}
                        </p>
                        <p
                          className="truncate font-mono text-slate-500"
                          style={{
                            fontSize: columnasImpresion === 5 ? '5.5px' : '6.5px',
                          }}
                        >
                          <strong className="text-slate-700">S/N:</strong>{' '}
                          {bien.serie || bien.numero_serie || 'S/N'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Pie de etiqueta con guías de corte y ambiente */}
                  <div className="mt-1 pt-0.5 border-t border-slate-100 flex items-center justify-between text-slate-400 leading-none">
                    <span
                      className="truncate font-medium"
                      style={{
                        fontSize: columnasImpresion === 5 ? '5.5px' : '6.5px',
                      }}
                    >
                      {esAIP ? (amb?.nombre || 'AIP 1') : `Ubicación: ${nombreAmbiente}`}
                    </span>
                    <span
                      className="shrink-0 font-mono tracking-tight text-slate-400 ml-1"
                      style={{
                        fontSize: columnasImpresion === 5 ? '5.5px' : '6px',
                      }}
                    >
                      {mostrarGuiasCorte ? '✂ MAMM • AIP' : 'CONTROL PATRIMONIAL'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      {/* Modal para asignar lote a seleccionados */}
      {modalAsignarLoteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in no-print">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full border border-slate-200 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 bg-slate-900 text-white">
              <div className="flex items-center space-x-2">
                <Palette className="w-5 h-5 text-indigo-400" />
                <div>
                  <h3 className="font-bold text-sm">Asignar Lote a Equipos Seleccionados</h3>
                  <p className="text-[11px] text-slate-400">
                    Se actualizarán {seleccionados.size} equipos simultáneamente en Firestore
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setModalAsignarLoteOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {mensajeLoteMasivo && (
                <div
                  className={`p-3 rounded-xl text-xs font-semibold flex items-center space-x-2 ${
                    mensajeLoteMasivo.startsWith('¡')
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                      : 'bg-rose-50 text-rose-800 border border-rose-200'
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{mensajeLoteMasivo}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Lote Predefinido o Personalizado
                </label>
                <select
                  value={loteAsignarSelect}
                  onChange={(e) => {
                    const val = e.target.value;
                    setLoteAsignarSelect(val);
                    if (val && val !== 'OTRO') {
                      const pred = COLORES_LOTE_PREDEFINIDOS.find((item) => item.nombre === val);
                      if (pred) setLoteAsignarColor(pred.color);
                    }
                  }}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                >
                  <option value="">(Quitar Lote / Dejar sin lote)</option>
                  {COLORES_LOTE_PREDEFINIDOS.map((item) => (
                    <option key={item.nombre} value={item.nombre}>
                      {item.nombre} ({item.color})
                    </option>
                  ))}
                  <option value="OTRO">OTRO (Personalizado)...</option>
                </select>
              </div>

              {loteAsignarSelect !== '' && (
                <div className="flex items-center space-x-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <input
                    type="color"
                    value={loteAsignarColor}
                    onChange={(e) => setLoteAsignarColor(e.target.value)}
                    className="w-9 h-9 p-0.5 bg-white border border-slate-300 rounded-lg cursor-pointer shrink-0"
                    title="Seleccionar color"
                  />
                  <div className="flex-1">
                    <label className="block text-[11px] font-medium text-slate-600 mb-0.5">
                      Color Hexadecimal
                    </label>
                    <input
                      type="text"
                      value={loteAsignarColor}
                      onChange={(e) => setLoteAsignarColor(e.target.value)}
                      placeholder="#EA580C"
                      className="w-28 px-2 py-1 text-xs font-mono bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>
              )}

              {loteAsignarSelect === 'OTRO' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Nombre del Lote Personalizado
                  </label>
                  <input
                    type="text"
                    value={loteAsignarNombreOtro}
                    onChange={(e) => setLoteAsignarNombreOtro(e.target.value.toUpperCase())}
                    placeholder="Ej. LOTE CELESTE, DOTACIÓN 2026"
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 font-semibold"
                  />
                </div>
              )}

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  disabled={guardandoLoteMasivo}
                  onClick={() => setModalAsignarLoteOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={guardandoLoteMasivo}
                  onClick={handleAsignarLoteMasivo}
                  className="px-4 py-2 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow-sm disabled:opacity-50 transition-colors"
                >
                  {guardandoLoteMasivo ? 'Aplicando...' : `Aplicar a ${seleccionados.size} Equipos`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};