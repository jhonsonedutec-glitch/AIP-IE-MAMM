import React, { useEffect, useState, useMemo } from 'react';
import {
  Box,
  Plus,
  FileSpreadsheet,
  Search,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Eye,
  Edit2,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Tag,
  Palette,
  X,
} from 'lucide-react';
import {
  BienPatrimonial,
  Ambiente,
  CategoriaEquipo,
  COLORES_LOTE_PREDEFINIDOS,
  deducirColorLote,
} from '@/types';
import { bienRepository, ambienteRepository, categoriaRepository } from '@/repositories';
import { useAuth } from '@/hooks';
import { BienFormModal } from './BienFormModal';
import { BienDetalleModal } from './BienDetalleModal';
import { BajaBienModal } from './BajaBienModal';
import { ImportadorInventarioModal } from './ImportadorInventarioModal';

const ITEMS_POR_PAGINA = 20;

export const InventarioModule: React.FC = () => {
  const { user, perfil } = useAuth();
  const esAdmin = perfil?.rol === 'ADMIN';

  const [bienes, setBienes] = useState<BienPatrimonial[]>([]);
  const [ambientes, setAmbientes] = useState<Ambiente[]>([]);
  const [categorias, setCategorias] = useState<CategoriaEquipo[]>([]);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState<{ tipo: 'ok' | 'err'; msg: string } | null>(null);

  // Estados de Filtros y Búsqueda
  const [busqueda, setBusqueda] = useState('');
  const [filtroAmbiente, setFiltroAmbiente] = useState('');
  const [filtroCategoria, setFiltroCategoria] = useState('');
  const [filtroConservacion, setFiltroConservacion] = useState('');
  const [filtroOperativo, setFiltroOperativo] = useState('');
  const [filtroLote, setFiltroLote] = useState('');

  // Paginación
  const [paginaActual, setPaginaActual] = useState(1);

  // Estados de Modales
  const [modalFormOpen, setModalFormOpen] = useState(false);
  const [bienParaEditar, setBienParaEditar] = useState<BienPatrimonial | null>(null);

  const [modalDetalleOpen, setModalDetalleOpen] = useState(false);
  const [bienParaDetalle, setBienParaDetalle] = useState<BienPatrimonial | null>(null);

  const [modalBajaOpen, setModalBajaOpen] = useState(false);
  const [bienParaBaja, setBienParaBaja] = useState<BienPatrimonial | null>(null);

  const [modalImportarOpen, setModalImportarOpen] = useState(false);

  // Modal Rápido de Asignación de Lote / Color
  const [modalRapidoLoteOpen, setModalRapidoLoteOpen] = useState(false);
  const [bienParaLoteRapido, setBienParaLoteRapido] = useState<BienPatrimonial | null>(null);
  const [loteRapidoSelect, setLoteRapidoSelect] = useState<string>('');
  const [loteRapidoNombreOtro, setLoteRapidoNombreOtro] = useState<string>('');
  const [loteRapidoColor, setLoteRapidoColor] = useState<string>('#EA580C');
  const [guardandoLoteRapido, setGuardandoLoteRapido] = useState(false);

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    setLoading(true);
    try {
      const [bienesData, ambData, catData] = await Promise.all([
        bienRepository.listar(),
        ambienteRepository.listar(),
        categoriaRepository.listar(),
      ]);
      setBienes(bienesData);
      setAmbientes(ambData);
      setCategorias(catData);
    } catch (err: any) {
      console.error('Error al cargar inventario:', err);
      setFeedback({ tipo: 'err', msg: 'Error al consultar inventario patrimonial.' });
    } finally {
      setLoading(false);
    }
  };

  // Métricas KPI
  const kpis = useMemo(() => {
    const totalActivos = bienes.filter((b) => b.estado_operativo !== 'DE_BAJA').length;
    const operativos = bienes.filter((b) => b.estado_operativo === 'OPERATIVO').length;
    const atencion = bienes.filter(
      (b) =>
        b.estado_operativo === 'EN_MANTENIMIENTO' ||
        b.estado_conservacion === 'R' ||
        b.estado_conservacion === 'M'
    ).length;
    const deBaja = bienes.filter((b) => b.estado_operativo === 'DE_BAJA').length;

    return { totalActivos, operativos, atencion, deBaja };
  }, [bienes]);

  // Lotes únicos detectados en el inventario
  const lotesDisponibles = useMemo(() => {
    const set = new Set<string>();
    bienes.forEach((b) => {
      if (b.lote_etiqueta?.trim()) set.add(b.lote_etiqueta.trim());
    });
    return Array.from(set).sort();
  }, [bienes]);

  // Filtrado reactivo en cliente
  const bienesFiltrados = useMemo(() => {
    return bienes.filter((b) => {
      // 1. Búsqueda por texto (código patrimonial, etiqueta, serie, marca, modelo, denominación)
      if (busqueda.trim()) {
        const q = busqueda.toLowerCase().trim();
        const textoConcatenado = `${b.codigo_patrimonial} ${b.etiqueta_interna} ${b.serie} ${b.marca} ${b.modelo} ${b.denominacion} ${b.lote_etiqueta || ''}`.toLowerCase();
        if (!textoConcatenado.includes(q)) return false;
      }

      // 2. Filtro de Ambiente
      if (filtroAmbiente && b.ambiente_id !== filtroAmbiente) return false;

      // 3. Filtro de Categoría
      if (filtroCategoria && b.categoria_id !== filtroCategoria) return false;

      // 4. Filtro de Estado de Conservación
      if (filtroConservacion && b.estado_conservacion !== filtroConservacion) return false;

      // 5. Filtro de Estado Operativo
      if (filtroOperativo && b.estado_operativo !== filtroOperativo) return false;

      // 6. Filtro de Lote
      if (filtroLote) {
        if (filtroLote === '__SIN_LOTE__') {
          if (b.lote_etiqueta && b.lote_etiqueta.trim()) return false;
        } else if (b.lote_etiqueta?.trim() !== filtroLote) {
          return false;
        }
      }

      return true;
    });
  }, [bienes, busqueda, filtroAmbiente, filtroCategoria, filtroConservacion, filtroOperativo, filtroLote]);

  // Datos paginados
  const totalPaginas = Math.ceil(bienesFiltrados.length / ITEMS_POR_PAGINA) || 1;
  const bienesPaginados = useMemo(() => {
    const inicio = (paginaActual - 1) * ITEMS_POR_PAGINA;
    return bienesFiltrados.slice(inicio, inicio + ITEMS_POR_PAGINA);
  }, [bienesFiltrados, paginaActual]);

  const limpiarFiltros = () => {
    setBusqueda('');
    setFiltroAmbiente('');
    setFiltroCategoria('');
    setFiltroConservacion('');
    setFiltroOperativo('');
    setFiltroLote('');
    setPaginaActual(1);
  };

  const abrirModalLoteRapido = (bien: BienPatrimonial) => {
    setBienParaLoteRapido(bien);
    if (bien.lote_etiqueta) {
      const upper = bien.lote_etiqueta.trim().toUpperCase();
      const coincide = COLORES_LOTE_PREDEFINIDOS.find((item) => item.nombre === upper);
      if (coincide) {
        setLoteRapidoSelect(coincide.nombre);
        setLoteRapidoNombreOtro('');
        setLoteRapidoColor(bien.lote_color || coincide.color);
      } else {
        setLoteRapidoSelect('OTRO');
        setLoteRapidoNombreOtro(upper);
        setLoteRapidoColor(bien.lote_color || deducirColorLote(upper));
      }
    } else {
      setLoteRapidoSelect('');
      setLoteRapidoNombreOtro('');
      setLoteRapidoColor('#EA580C');
    }
    setModalRapidoLoteOpen(true);
  };

  const handleGuardarLoteRapido = async () => {
    if (!bienParaLoteRapido) return;
    setGuardandoLoteRapido(true);
    let etiquetaFinal = '';
    let colorFinal = '';
    if (loteRapidoSelect === 'OTRO') {
      etiquetaFinal = loteRapidoNombreOtro.trim().toUpperCase();
      colorFinal = etiquetaFinal ? (loteRapidoColor.trim() || '#6366F1') : '';
    } else if (loteRapidoSelect) {
      etiquetaFinal = loteRapidoSelect;
      colorFinal = loteRapidoColor.trim() || deducirColorLote(loteRapidoSelect);
    }
    try {
      const operador = user ? { uid: user.uid, email: user.email || '' } : undefined;
      await bienRepository.actualizar(
        bienParaLoteRapido.id,
        {
          lote_etiqueta: etiquetaFinal,
          lote_color: colorFinal,
        },
        operador
      );
      await cargarDatos();
      setModalRapidoLoteOpen(false);
      setFeedback({
        tipo: 'ok',
        msg: `Lote de ${bienParaLoteRapido.etiqueta_interna || bienParaLoteRapido.codigo_patrimonial} actualizado a ${etiquetaFinal || 'Sin Lote'}.`,
      });
    } catch (err: any) {
      console.error('Error al actualizar lote rápido:', err);
      setFeedback({ tipo: 'err', msg: 'No se pudo actualizar el lote del equipo.' });
    } finally {
      setGuardandoLoteRapido(false);
    }
  };

  const getNombreAmbiente = (bien: BienPatrimonial) => {
    const amb = ambientes.find((a) => a.id === bien.ambiente_id)?.nombre || 'No asignado';
    if (amb.trim().toLowerCase() === 'otros' && bien.ubicacion_detalle) {
      return `Otros — ${bien.ubicacion_detalle}`;
    }
    return amb;
  };

  const getNombreCategoria = (id: string) =>
    categorias.find((c) => c.id === id)?.nombre || 'General';

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Cabecera del Módulo */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-200 gap-4">
        <div>
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-emerald-100 text-emerald-800 rounded-xl">
              <Box className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-800">
                Inventario Tecnológico Patrimonial
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Control de máquinas y equipos compatible con el Formato Oficial Anexo 01.
              </p>
            </div>
          </div>
        </div>

        {/* Botones de Acción (Solo ADMIN) */}
        {esAdmin && (
          <div className="flex items-center space-x-2 shrink-0">
            <button
              type="button"
              onClick={() => setModalImportarOpen(true)}
              className="inline-flex items-center space-x-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg border border-slate-300 transition-colors"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-700" />
              <span>Importar Excel / CSV</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setBienParaEditar(null);
                setModalFormOpen(true);
              }}
              className="inline-flex items-center space-x-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Nuevo Bien</span>
            </button>
          </div>
        )}
      </div>

      {feedback && (
        <div
          className={`p-3.5 rounded-xl border text-xs flex items-center space-x-2.5 ${
            feedback.tipo === 'ok'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          {feedback.tipo === 'ok' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
          )}
          <span className="font-medium">{feedback.msg}</span>
        </div>
      )}

      {/* Barra de KPIs Superiores */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 block">Total Bienes Activos</span>
          <span className="text-2xl font-bold text-slate-900 mt-1 block">
            {kpis.totalActivos}
          </span>
          <span className="text-[10px] text-slate-400 mt-0.5 block">Excluye dados de baja</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-xs font-semibold text-emerald-700 block">
            Operativos / Disponibles
          </span>
          <span className="text-2xl font-bold text-emerald-700 mt-1 block">
            {kpis.operativos}
          </span>
          <span className="text-[10px] text-emerald-600/80 mt-0.5 block">Listos para el aula</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-xs font-semibold text-amber-700 block">
            En Soporte / Observados
          </span>
          <span className="text-2xl font-bold text-amber-700 mt-1 block">
            {kpis.atencion}
          </span>
          <span className="text-[10px] text-amber-600/80 mt-0.5 block">
            Mantenimiento o estado R/M
          </span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-xs font-semibold text-rose-700 block">Dados de Baja</span>
          <span className="text-2xl font-bold text-rose-700 mt-1 block">
            {kpis.deBaja}
          </span>
          <span className="text-[10px] text-rose-600/80 mt-0.5 block">Bajas patrimoniales</span>
        </div>
      </div>

      {/* Barra de Búsqueda y Filtros Combinables */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
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
              placeholder="Buscar por código patrimonial, etiqueta interna, serie, marca, modelo o denominación..."
              className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-800"
            />
          </div>

          <button
            type="button"
            onClick={limpiarFiltros}
            className="inline-flex items-center justify-center space-x-1 px-3 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg border border-slate-200 transition-colors shrink-0"
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
            <span>Restablecer Filtros</span>
          </button>
        </div>

        {/* Desplegables de Filtro */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 pt-1 border-t border-slate-100 text-xs">
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">
              Ambiente / Ubicación
            </label>
            <select
              value={filtroAmbiente}
              onChange={(e) => {
                setFiltroAmbiente(e.target.value);
                setPaginaActual(1);
              }}
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

          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">Categoría</label>
            <select
              value={filtroCategoria}
              onChange={(e) => {
                setFiltroCategoria(e.target.value);
                setPaginaActual(1);
              }}
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

          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">
              Lote / Color
            </label>
            <select
              value={filtroLote}
              onChange={(e) => {
                setFiltroLote(e.target.value);
                setPaginaActual(1);
              }}
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

          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">
              Conservación
            </label>
            <select
              value={filtroConservacion}
              onChange={(e) => {
                setFiltroConservacion(e.target.value);
                setPaginaActual(1);
              }}
              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-700"
            >
              <option value="">Cualquier estado</option>
              <option value="B">Bueno (B)</option>
              <option value="R">Regular (R)</option>
              <option value="M">Malo (M)</option>
              <option value="N">Nuevo (N)</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">
              Estado Operativo
            </label>
            <select
              value={filtroOperativo}
              onChange={(e) => {
                setFiltroOperativo(e.target.value);
                setPaginaActual(1);
              }}
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
      </div>

      {/* Tabla de Inventario */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-500 text-xs">
            <span className="w-6 h-6 inline-block border-2 border-emerald-600/30 border-t-emerald-600 rounded-full animate-spin mb-2" />
            <p>Cargando inventario patrimonial...</p>
          </div>
        ) : bienesFiltrados.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-xs">
            <Box className="w-8 h-8 mx-auto text-slate-300 mb-2" />
            <p className="font-semibold text-slate-700">No se encontraron bienes patrimoniales.</p>
            <p className="text-slate-400 mt-1">
              Pruebe ajustando los filtros o registre un nuevo equipo con el botón superior.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3 px-3">Etiqueta / QR</th>
                  <th className="py-3 px-3">Cód. Patrimonial</th>
                  <th className="py-3 px-3">Denominación</th>
                  <th className="py-3 px-3">Marca / Modelo</th>
                  <th className="py-3 px-3">Serie</th>
                  <th className="py-3 px-3">Ambiente</th>
                  <th className="py-3 px-3">Conservación</th>
                  <th className="py-3 px-3">Estado Op.</th>
                  <th className="py-3 px-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {bienesPaginados.map((b) => (
                  <tr
                    key={b.id}
                    className={`hover:bg-slate-50/70 transition-colors ${
                      b.estado_operativo === 'DE_BAJA' ? 'bg-slate-50/40 text-slate-400 opacity-75' : ''
                    }`}
                  >
                    <td className="py-3 px-3">
                      <div className="flex flex-col space-y-1">
                        <span className="font-mono font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 text-[11px] inline-block w-fit">
                          {b.etiqueta_interna || 'S/E'}
                        </span>
                        {b.lote_etiqueta && (
                          <span
                            className="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded text-[9px] font-bold border w-fit"
                            style={{
                              backgroundColor: `${b.lote_color || '#6366F1'}15`,
                              borderColor: `${b.lote_color || '#6366F1'}60`,
                              color: b.lote_color || '#6366F1',
                            }}
                            title={`Lote: ${b.lote_etiqueta}`}
                          >
                            <span
                              className="w-1.5 h-1.5 rounded-full inline-block shrink-0"
                              style={{ backgroundColor: b.lote_color || '#6366F1' }}
                            />
                            <span className="truncate max-w-[100px]">{b.lote_etiqueta}</span>
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-3 font-mono font-semibold text-slate-800">
                      {b.codigo_patrimonial}
                    </td>
                    <td className="py-3 px-3 font-semibold text-slate-800 max-w-[180px] truncate">
                      {b.denominacion}
                      <span className="block text-[10px] text-slate-400 font-normal">
                        {getNombreCategoria(b.categoria_id)}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-slate-600">
                      {b.marca} {b.modelo}
                    </td>
                    <td className="py-3 px-3 font-mono text-slate-600">{b.serie}</td>
                    <td className="py-3 px-3 text-slate-700 font-medium">
                      {getNombreAmbiente(b)}
                    </td>
                    <td className="py-3 px-3">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[11px] font-semibold border ${
                          b.estado_conservacion === 'N'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : b.estado_conservacion === 'B'
                            ? 'bg-blue-50 text-blue-700 border-blue-200'
                            : b.estado_conservacion === 'R'
                            ? 'bg-amber-50 text-amber-700 border-amber-200'
                            : 'bg-rose-50 text-rose-700 border-rose-200'
                        }`}
                      >
                        {b.estado_conservacion}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          b.estado_operativo === 'OPERATIVO'
                            ? 'bg-emerald-100 text-emerald-800'
                            : b.estado_operativo === 'PRESTADO'
                            ? 'bg-indigo-100 text-indigo-800'
                            : b.estado_operativo === 'EN_MANTENIMIENTO'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {b.estado_operativo}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right space-x-1">
                      {/* Botón Ver Ficha (Disponible para ADMIN y DIRECCION) */}
                      <button
                        type="button"
                        onClick={() => {
                          setBienParaDetalle(b);
                          setModalDetalleOpen(true);
                        }}
                        className="p-1.5 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-md transition-colors"
                        title="Ver Ficha Detallada"
                      >
                        <Eye className="w-4 h-4" />
                      </button>

                      {/* Botones de Modificación (Solo ADMIN) */}
                      {esAdmin && (
                        <>
                          <button
                            type="button"
                            onClick={() => abrirModalLoteRapido(b)}
                            className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors"
                            title="Asignar o Cambiar Lote / Color"
                          >
                            <Tag className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setBienParaEditar(b);
                              setModalFormOpen(true);
                            }}
                            className="p-1.5 text-slate-500 hover:text-blue-700 hover:bg-blue-50 rounded-md transition-colors"
                            title="Editar Datos Patrimoniales"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          {b.estado_operativo !== 'DE_BAJA' && (
                            <button
                              type="button"
                              onClick={() => {
                                setBienParaBaja(b);
                                setModalBajaOpen(true);
                              }}
                              className="p-1.5 text-slate-400 hover:text-rose-700 hover:bg-rose-50 rounded-md transition-colors"
                              title="Dar de Baja Lógica"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Barra de Paginación */}
        {bienesFiltrados.length > 0 && (
          <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-3">
            <span>
              Mostrando {Math.min(bienesFiltrados.length, (paginaActual - 1) * ITEMS_POR_PAGINA + 1)}{' '}
              a {Math.min(bienesFiltrados.length, paginaActual * ITEMS_POR_PAGINA)} de{' '}
              {bienesFiltrados.length} bienes encontrados
            </span>

            <div className="flex items-center space-x-2">
              <button
                type="button"
                disabled={paginaActual <= 1}
                onClick={() => setPaginaActual((p) => Math.max(1, p - 1))}
                className="p-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 disabled:opacity-40 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="font-semibold text-slate-800">
                Página {paginaActual} de {totalPaginas}
              </span>
              <button
                type="button"
                disabled={paginaActual >= totalPaginas}
                onClick={() => setPaginaActual((p) => Math.min(totalPaginas, p + 1))}
                className="p-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 disabled:opacity-40 transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* MODALES */}
      {modalFormOpen && (
        <BienFormModal
          bienParaEditar={bienParaEditar}
          ambientes={ambientes}
          categorias={categorias}
          onClose={() => setModalFormOpen(false)}
          onSuccess={() => {
            setModalFormOpen(false);
            setFeedback({
              tipo: 'ok',
              msg: bienParaEditar
                ? 'Bien patrimonial actualizado con éxito.'
                : 'Nuevo bien tecnológico registrado exitosamente.',
            });
            cargarDatos();
          }}
        />
      )}

      {modalDetalleOpen && bienParaDetalle && (
        <BienDetalleModal
          bien={bienParaDetalle}
          ambientes={ambientes}
          categorias={categorias}
          canEdit={esAdmin}
          onClose={() => setModalDetalleOpen(false)}
          onEdit={() => {
            setBienParaEditar(bienParaDetalle);
            setModalFormOpen(true);
          }}
        />
      )}

      {modalBajaOpen && bienParaBaja && (
        <BajaBienModal
          bien={bienParaBaja}
          onClose={() => setModalBajaOpen(false)}
          onSuccess={() => {
            setModalBajaOpen(false);
            setFeedback({
              tipo: 'ok',
              msg: `Baja lógica registrada para el bien ${bienParaBaja.codigo_patrimonial}.`,
            });
            cargarDatos();
          }}
        />
      )}

      {modalImportarOpen && (
        <ImportadorInventarioModal
          bienesExistentes={bienes}
          ambientes={ambientes}
          categorias={categorias}
          onClose={() => setModalImportarOpen(false)}
          onSuccess={(res) => {
            setModalImportarOpen(false);
            setFeedback({
              tipo: 'ok',
              msg: `Importación masiva completada: ${res.insertados} bienes insertados (${res.omitidos} omitidos/duplicados).`,
            });
            cargarDatos();
          }}
        />
      )}

      {/* Modal Rápido de Asignación de Lote / Color */}
      {modalRapidoLoteOpen && bienParaLoteRapido && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full border border-slate-200 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 bg-slate-900 text-white">
              <div className="flex items-center space-x-2">
                <Palette className="w-5 h-5 text-indigo-400" />
                <div>
                  <h3 className="font-bold text-sm">Asignar Lote / Color</h3>
                  <p className="text-[11px] text-slate-400 font-mono">
                    {bienParaLoteRapido.etiqueta_interna} &bull; {bienParaLoteRapido.denominacion}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setModalRapidoLoteOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Lote Predefinido o Personalizado
                </label>
                <select
                  value={loteRapidoSelect}
                  onChange={(e) => {
                    const val = e.target.value;
                    setLoteRapidoSelect(val);
                    if (val && val !== 'OTRO') {
                      const pred = COLORES_LOTE_PREDEFINIDOS.find((item) => item.nombre === val);
                      if (pred) setLoteRapidoColor(pred.color);
                    }
                  }}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                >
                  <option value="">(Sin lote asignado)</option>
                  {COLORES_LOTE_PREDEFINIDOS.map((item) => (
                    <option key={item.nombre} value={item.nombre}>
                      {item.nombre} ({item.color})
                    </option>
                  ))}
                  <option value="OTRO">OTRO (Personalizado)...</option>
                </select>
              </div>

              {loteRapidoSelect !== '' && (
                <div className="flex items-center space-x-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <input
                    type="color"
                    value={loteRapidoColor}
                    onChange={(e) => setLoteRapidoColor(e.target.value)}
                    className="w-9 h-9 p-0.5 bg-white border border-slate-300 rounded-lg cursor-pointer shrink-0"
                    title="Seleccionar color"
                  />
                  <div className="flex-1">
                    <label className="block text-[11px] font-medium text-slate-600 mb-0.5">
                      Código Hexadecimal
                    </label>
                    <input
                      type="text"
                      value={loteRapidoColor}
                      onChange={(e) => setLoteRapidoColor(e.target.value)}
                      placeholder="#EA580C"
                      className="w-28 px-2 py-1 text-xs font-mono bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>
              )}

              {loteRapidoSelect === 'OTRO' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Nombre del Lote Personalizado
                  </label>
                  <input
                    type="text"
                    value={loteRapidoNombreOtro}
                    onChange={(e) => setLoteRapidoNombreOtro(e.target.value.toUpperCase())}
                    placeholder="Ej. LOTE CELESTE, DOTACIÓN 2026"
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 font-semibold"
                  />
                </div>
              )}

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  disabled={guardandoLoteRapido}
                  onClick={() => setModalRapidoLoteOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={guardandoLoteRapido}
                  onClick={handleGuardarLoteRapido}
                  className="px-4 py-2 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow-sm disabled:opacity-50 transition-colors"
                >
                  {guardandoLoteRapido ? 'Guardando...' : 'Aplicar Lote'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
