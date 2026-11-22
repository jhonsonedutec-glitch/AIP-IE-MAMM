import React, { useState, useEffect } from 'react';
import {
  ArrowLeftRight,
  Layers,
  MapPin,
  Search,
  Printer,
  History,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import {
  BienPatrimonial,
  Ambiente,
  CategoriaEquipo,
  MovimientoBien,
  InstitucionConfig,
  esAmbientePrestable,
} from '@/types';
import {
  bienRepository,
  ambienteRepository,
  categoriaRepository,
  movimientoRepository,
  configuracionRepository,
} from '@/repositories';
import { useAuth } from '@/hooks';
import { ModalTraslado } from './ModalTraslado';
import { ActaTrasladoModal } from './ActaTrasladoModal';

export const DistribucionModule: React.FC = () => {
  const { perfil } = useAuth();
  const isAdmin = perfil?.rol === 'ADMIN';

  const [pestaña, setPestaña] = useState<'ambientes' | 'historial'>('ambientes');
  const [bienes, setBienes] = useState<BienPatrimonial[]>([]);
  const [ambientes, setAmbientes] = useState<Ambiente[]>([]);
  const [categorias, setCategorias] = useState<CategoriaEquipo[]>([]);
  const [movimientos, setMovimientos] = useState<MovimientoBien[]>([]);
  const [institucionConfig, setInstitucionConfig] = useState<InstitucionConfig | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filtros de vista de Ambientes
  const [ambienteSeleccionadoId, setAmbienteSeleccionadoId] = useState<string | 'TODOS'>('TODOS');
  const [busquedaBienes, setBusquedaBienes] = useState('');
  const [bienesCheckeados, setBienesCheckeados] = useState<string[]>([]);

  // Filtros de vista de Historial
  const [busquedaHistorial, setBusquedaHistorial] = useState('');
  const [filtroAmbienteOrigen, setFiltroAmbienteOrigen] = useState('');
  const [filtroAmbienteDestino, setFiltroAmbienteDestino] = useState('');

  // Modales
  const [modalTrasladoAbierto, setModalTrasladoAbierto] = useState(false);
  const [bienesParaTrasladar, setBienesParaTrasladar] = useState<BienPatrimonial[]>([]);
  const [modalActaAbierto, setModalActaAbierto] = useState(false);
  const [movimientosParaActa, setMovimientosParaActa] = useState<MovimientoBien[]>([]);

  // Notificación de éxito
  const [notificacion, setNotificacion] = useState<string | null>(null);

  const cargarDatos = async () => {
    setLoading(true);
    setError(null);
    try {
      const [listaBienes, listaAmbientes, listaCategorias, listaMovimientos, config] =
        await Promise.all([
          bienRepository.listar(),
          ambienteRepository.listar(),
          categoriaRepository.listar(),
          movimientoRepository.listar(),
          configuracionRepository.obtenerInstitucion(),
        ]);

      setBienes(listaBienes);
      setAmbientes(listaAmbientes.filter((a: Ambiente) => a.activo));
      setCategorias(listaCategorias);
      setMovimientos(listaMovimientos);
      setInstitucionConfig(config);
    } catch (err: any) {
      setError(err.message || 'Error al cargar datos de distribución.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, []);

  // Bienes filtrados por ambiente y búsqueda
  const bienesVisibles = bienes.filter((b) => {
    if (b.estado_operativo === 'DE_BAJA') return false;

    if (ambienteSeleccionadoId !== 'TODOS' && b.ambiente_id !== ambienteSeleccionadoId) {
      return false;
    }

    if (!busquedaBienes.trim()) return true;
    const term = busquedaBienes.toLowerCase().trim();
    return (
      b.denominacion.toLowerCase().includes(term) ||
      b.codigo_patrimonial.toLowerCase().includes(term) ||
      (b.etiqueta_interna && b.etiqueta_interna.toLowerCase().includes(term)) ||
      b.serie.toLowerCase().includes(term) ||
      b.marca.toLowerCase().includes(term) ||
      b.modelo.toLowerCase().includes(term)
    );
  });

  // Movimientos filtrados
  const movimientosVisibles = movimientos.filter((m) => {
    if (filtroAmbienteOrigen && m.ambiente_origen_id !== filtroAmbienteOrigen) return false;
    if (filtroAmbienteDestino && m.ambiente_destino_id !== filtroAmbienteDestino) return false;

    if (!busquedaHistorial.trim()) return true;
    const term = busquedaHistorial.toLowerCase().trim();
    return (
      m.codigo_patrimonial.toLowerCase().includes(term) ||
      (m.etiqueta_interna && m.etiqueta_interna.toLowerCase().includes(term)) ||
      (m.denominacion && m.denominacion.toLowerCase().includes(term)) ||
      (m.serie && m.serie.toLowerCase().includes(term)) ||
      (m.motivo && m.motivo.toLowerCase().includes(term)) ||
      (m.responsable_recepcion && m.responsable_recepcion.toLowerCase().includes(term)) ||
      (m.lote_id && m.lote_id.toLowerCase().includes(term))
    );
  });

  const abrirTrasladoIndividual = (bien: BienPatrimonial) => {
    setBienesParaTrasladar([bien]);
    setModalTrasladoAbierto(true);
  };

  const abrirTrasladoMasivo = () => {
    const seleccionados = bienes.filter((b) => bienesCheckeados.includes(b.id));
    setBienesParaTrasladar(seleccionados);
    setModalTrasladoAbierto(true);
  };

  const abrirActaParaMovimiento = (mov: MovimientoBien) => {
    if (mov.lote_id) {
      const delLote = movimientos.filter((m) => m.lote_id === mov.lote_id);
      setMovimientosParaActa(delLote.length > 0 ? delLote : [mov]);
    } else {
      setMovimientosParaActa([mov]);
    }
    setModalActaAbierto(true);
  };

  const toggleCheckBien = (id: string) => {
    const bien = bienes.find((b) => b.id === id);
    if (bien?.estado_operativo === 'PRESTADO') return;
    setBienesCheckeados((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const toggleCheckTodosVisibles = () => {
    // Solo seleccionar equipos que no se encuentren en préstamo activo
    const ids = bienesVisibles
      .filter((b) => b.estado_operativo !== 'PRESTADO')
      .map((b) => b.id);
    const todosYa = ids.length > 0 && ids.every((id) => bienesCheckeados.includes(id));
    if (todosYa) {
      setBienesCheckeados((prev) => prev.filter((id) => !ids.includes(id)));
    } else {
      setBienesCheckeados((prev) => Array.from(new Set([...prev, ...ids])));
    }
  };

  const formatFecha = (f?: string | Date) => {
    if (!f) return '—';
    try {
      const d = typeof f === 'string' ? new Date(f) : f;
      return d.toLocaleDateString('es-PE', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return String(f);
    }
  };

  return (
    <div className="space-y-6">
      {/* Encabezado del Módulo */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center space-x-2.5">
            <ArrowLeftRight className="w-7 h-7 text-emerald-600" />
            <span>Distribución y Traslados entre Ambientes</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Reasignación física de equipos, actas oficiales de entrega/recepción e historial inmutable
          </p>
        </div>

        {isAdmin && (
          <button
            type="button"
            onClick={() => {
              setBienesParaTrasladar([]);
              setModalTrasladoAbierto(true);
            }}
            className="flex items-center space-x-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs rounded-xl shadow-sm transition-all"
          >
            <ArrowLeftRight className="w-4 h-4" />
            <span>Nuevo Traslado de Equipos</span>
          </button>
        )}
      </div>

      {notificacion && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs flex items-center justify-between">
          <div className="flex items-center space-x-2 font-medium">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{notificacion}</span>
          </div>
          <button
            onClick={() => setNotificacion(null)}
            className="text-emerald-700 hover:text-emerald-900 text-xs font-semibold"
          >
            Cerrar
          </button>
        </div>
      )}

      {error && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-start space-x-2">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Selector de Pestañas Principales */}
      <div className="flex space-x-1 border-b border-slate-200 text-xs font-semibold">
        <button
          onClick={() => setPestaña('ambientes')}
          className={`px-4 py-2.5 border-b-2 flex items-center space-x-2 transition-colors ${
            pestaña === 'ambientes'
              ? 'border-emerald-600 text-emerald-700 bg-emerald-50/40'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Distribución por Ambientes</span>
        </button>
        <button
          onClick={() => setPestaña('historial')}
          className={`px-4 py-2.5 border-b-2 flex items-center space-x-2 transition-colors ${
            pestaña === 'historial'
              ? 'border-emerald-600 text-emerald-700 bg-emerald-50/40'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <History className="w-4 h-4" />
          <span>Historial de Movimientos ({movimientos.length})</span>
        </button>
      </div>

      {/* VISTA 1: DISTRIBUCIÓN POR AMBIENTES */}
      {pestaña === 'ambientes' && (
        <div className="space-y-6">
          {/* Tarjetas de Ambientes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {/* Opción Todos los Ambientes */}
            <div
              onClick={() => setAmbienteSeleccionadoId('TODOS')}
              className={`p-4 rounded-xl border cursor-pointer transition-all ${
                ambienteSeleccionadoId === 'TODOS'
                  ? 'bg-slate-900 text-white border-slate-900 shadow-md ring-2 ring-emerald-500/50'
                  : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-800 shadow-2xs'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold uppercase tracking-wider opacity-80">
                  Inventario General
                </span>
                <span
                  className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                    ambienteSeleccionadoId === 'TODOS'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-100 text-slate-700'
                  }`}
                >
                  {bienes.filter((b) => b.estado_operativo !== 'DE_BAJA').length} equipos
                </span>
              </div>
              <h3 className="font-bold text-sm">Todos los Ambientes</h3>
              <p className="text-[11px] opacity-70 mt-1">
                Visualización consolidada de todo el equipamiento
              </p>
            </div>

            {/* Tarjeta por cada Ambiente Registrado */}
            {ambientes.map((amb) => {
              const bienesDelAmbiente = bienes.filter(
                (b) => b.ambiente_id === amb.id && b.estado_operativo !== 'DE_BAJA'
              );
              const seleccionado = ambienteSeleccionadoId === amb.id;
              const esAIP = esAmbientePrestable(amb);

              // Conteo operativo en tiempo real para ambientes AIP
              const libresAIP = bienesDelAmbiente.filter((b) => b.estado_operativo === 'OPERATIVO').length;
              const prestadosAIP = bienesDelAmbiente.filter((b) => b.estado_operativo === 'PRESTADO').length;
              const enMantAIP = bienesDelAmbiente.filter(
                (b) => b.estado_operativo === 'EN_MANTENIMIENTO'
              ).length;

              // Conteo por categorías
              const conteoCategorias = categorias
                .map((cat) => {
                  const cant = bienesDelAmbiente.filter((b) => b.categoria_id === cat.id).length;
                  return { cat, cant };
                })
                .filter((c) => c.cant > 0);

              return (
                <div
                  key={amb.id}
                  onClick={() => setAmbienteSeleccionadoId(amb.id)}
                  className={`p-4 rounded-xl border cursor-pointer transition-all flex flex-col justify-between ${
                    seleccionado
                      ? 'bg-emerald-900 text-white border-emerald-900 shadow-md ring-2 ring-emerald-500/50'
                      : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-800 shadow-2xs'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center space-x-1.5">
                        <MapPin
                          className={`w-3.5 h-3.5 ${
                            seleccionado ? 'text-emerald-300' : 'text-emerald-600'
                          }`}
                        />
                        <span className="text-xs font-bold truncate max-w-[140px]">
                          {amb.nombre}
                        </span>
                      </div>
                      <span
                        className={`text-[11px] font-extrabold px-2 py-0.5 rounded-full ${
                          seleccionado
                            ? 'bg-emerald-700 text-white'
                            : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                        }`}
                      >
                        {bienesDelAmbiente.length}
                      </span>
                    </div>

                    {/* Estado en tiempo real para ambientes AIP */}
                    {esAIP && (
                      <div
                        className={`text-[10px] font-semibold mb-1 flex items-center space-x-1.5 ${
                          seleccionado ? 'text-emerald-200' : 'text-slate-600'
                        }`}
                      >
                        <span className={seleccionado ? 'text-emerald-300 font-bold' : 'text-emerald-700 font-bold'}>
                          {libresAIP} libre{libresAIP !== 1 ? 's' : ''}
                        </span>
                        <span>&bull;</span>
                        <span className={seleccionado ? 'text-indigo-200 font-bold' : 'text-indigo-600 font-bold'}>
                          {prestadosAIP} en préstamo
                        </span>
                        {enMantAIP > 0 && (
                          <>
                            <span>&bull;</span>
                            <span className={seleccionado ? 'text-rose-300 font-bold' : 'text-rose-600 font-bold'}>
                              {enMantAIP} mant.
                            </span>
                          </>
                        )}
                      </div>
                    )}

                    <p
                      className={`text-[11px] mb-2 truncate ${
                        seleccionado ? 'text-emerald-200' : 'text-slate-500'
                      }`}
                    >
                      Encargado: {amb.encargado || 'No asignado'}
                    </p>
                  </div>

                  {/* Desglose por categoría */}
                  <div className="pt-2 border-t border-slate-100/30 flex flex-wrap gap-1">
                    {conteoCategorias.length === 0 ? (
                      <span
                        className={`text-[10px] italic ${
                          seleccionado ? 'text-emerald-300' : 'text-slate-400'
                        }`}
                      >
                        Sin equipos asignados
                      </span>
                    ) : (
                      conteoCategorias.map(({ cat, cant }) => (
                        <span
                          key={cat.id}
                          className={`text-[9px] px-1.5 py-0.5 rounded font-medium ${
                            seleccionado
                              ? 'bg-emerald-800/80 text-emerald-100'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {cat.prefijo_etiqueta}: {cant}
                        </span>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Tabla de Equipos en el Ambiente */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            {/* Barra de Búsqueda y Acciones Rápidas */}
            <div className="p-4 bg-slate-50/70 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex items-center space-x-2">
                <span className="text-xs font-bold text-slate-800">
                  Equipos en:{' '}
                  <span className="text-emerald-700 font-extrabold">
                    {ambienteSeleccionadoId === 'TODOS'
                      ? 'Todos los Ambientes'
                      : ambientes.find((a) => a.id === ambienteSeleccionadoId)?.nombre}
                  </span>
                </span>
                <span className="text-xs text-slate-400 font-medium">
                  ({bienesVisibles.length} equipos activos)
                </span>
              </div>

              <div className="flex items-center space-x-2">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={busquedaBienes}
                    onChange={(e) => setBusquedaBienes(e.target.value)}
                    placeholder="Buscar equipo en este ambiente..."
                    className="pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 w-52 sm:w-64"
                  />
                </div>

                {isAdmin && bienesCheckeados.length > 0 && (
                  <button
                    type="button"
                    onClick={abrirTrasladoMasivo}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs rounded-lg shadow-sm transition-colors flex items-center space-x-1"
                  >
                    <ArrowLeftRight className="w-3.5 h-3.5" />
                    <span>Trasladar ({bienesCheckeados.length})</span>
                  </button>
                )}
              </div>
            </div>

            {/* Tabla */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-100/80 border-b border-slate-200 text-slate-600 text-[11px] uppercase tracking-wider font-semibold">
                    {isAdmin && (
                      <th className="p-3 w-10 text-center">
                        <input
                          type="checkbox"
                          checked={
                            bienesVisibles.length > 0 &&
                            bienesVisibles.every((b) => bienesCheckeados.includes(b.id))
                          }
                          onChange={toggleCheckTodosVisibles}
                          className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                        />
                      </th>
                    )}
                    <th className="p-3">Etiqueta QR</th>
                    <th className="p-3">Cód. Patrimonial</th>
                    <th className="p-3">Denominación</th>
                    <th className="p-3">Marca / Modelo</th>
                    <th className="p-3">N° Serie</th>
                    <th className="p-3">Ubicación Actual</th>
                    <th className="p-3 text-center">Conservación</th>
                    <th className="p-3 text-center">Estado Operativo</th>
                    {isAdmin && <th className="p-3 text-right">Acción</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr>
                      <td colSpan={10} className="p-8 text-center text-slate-400">
                        Cargando distribución de bienes...
                      </td>
                    </tr>
                  ) : bienesVisibles.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="p-8 text-center text-slate-400">
                        No hay equipos para mostrar en este ambiente.
                      </td>
                    </tr>
                  ) : (
                    bienesVisibles.map((b) => {
                      const amb = ambientes.find((a) => a.id === b.ambiente_id);
                      const ambNombre =
                        amb?.nombre.trim().toLowerCase() === 'otros' && b.ubicacion_detalle
                          ? `Otros (${b.ubicacion_detalle})`
                          : amb?.nombre || 'Sin asignar';
                      const checkeado = bienesCheckeados.includes(b.id);
                      const enPrestamo = b.estado_operativo === 'PRESTADO';

                      return (
                        <tr
                          key={b.id}
                          className={`hover:bg-slate-50 transition-colors ${
                            checkeado ? 'bg-emerald-50/50' : ''
                          }`}
                        >
                          {isAdmin && (
                            <td className="p-3 text-center">
                              <input
                                type="checkbox"
                                checked={checkeado}
                                disabled={enPrestamo}
                                onChange={() => toggleCheckBien(b.id)}
                                title={
                                  enPrestamo
                                    ? 'Equipo en préstamo activo (no trasladable)'
                                    : ''
                                }
                                className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                              />
                            </td>
                          )}
                          <td className="p-3 font-mono font-bold text-emerald-700">
                            {b.etiqueta_interna || '—'}
                          </td>
                          <td className="p-3 font-mono text-slate-700">
                            {b.codigo_patrimonial || 'S/C'}
                          </td>
                          <td className="p-3 font-medium text-slate-800">{b.denominacion}</td>
                          <td className="p-3 text-slate-600">
                            {b.marca} {b.modelo ? `— ${b.modelo}` : ''}
                          </td>
                          <td className="p-3 font-mono text-slate-500">{b.serie}</td>
                          <td className="p-3">
                            <span className="px-2 py-0.5 bg-slate-100 text-slate-700 border border-slate-200 rounded text-[11px] font-medium">
                              {ambNombre}
                            </span>
                          </td>
                          <td className="p-3 text-center">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                              {b.estado_conservacion}
                            </span>
                          </td>
                          <td className="p-3 text-center">
                            {b.estado_operativo === 'OPERATIVO' ? (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                OPERATIVO
                              </span>
                            ) : b.estado_operativo === 'PRESTADO' ? (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-100 text-indigo-800 border border-indigo-200">
                                PRESTADO
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                                {b.estado_operativo}
                              </span>
                            )}
                          </td>
                          {isAdmin && (
                            <td className="p-3 text-right">
                              <button
                                type="button"
                                disabled={enPrestamo}
                                onClick={() => abrirTrasladoIndividual(b)}
                                title={
                                  enPrestamo
                                    ? 'Registre primero la devolución del préstamo activo'
                                    : 'Trasladar equipo a otro ambiente'
                                }
                                className="px-2.5 py-1 text-[11px] font-semibold text-emerald-700 hover:text-white hover:bg-emerald-600 disabled:bg-slate-100 disabled:text-slate-400 disabled:border-slate-200 disabled:cursor-not-allowed border border-emerald-300 hover:border-emerald-600 rounded-md transition-colors"
                              >
                                Trasladar
                              </button>
                            </td>
                          )}
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* VISTA 2: HISTORIAL DE TRASLADOS */}
      {pestaña === 'historial' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          {/* Barra de Filtros de Historial */}
          <div className="p-4 bg-slate-50/70 border-b border-slate-200 grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div className="sm:col-span-2 relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={busquedaHistorial}
                onChange={(e) => setBusquedaHistorial(e.target.value)}
                placeholder="Buscar por equipo, serie, motivo, receptor o código de acta..."
                className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <select
                value={filtroAmbienteOrigen}
                onChange={(e) => setFiltroAmbienteOrigen(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="">Cualquier Origen</option>
                {ambientes.map((a) => (
                  <option key={a.id} value={a.id}>
                    Desde: {a.nombre}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <select
                value={filtroAmbienteDestino}
                onChange={(e) => setFiltroAmbienteDestino(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="">Cualquier Destino</option>
                {ambientes.map((a) => (
                  <option key={a.id} value={a.id}>
                    Hacia: {a.nombre}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Tabla de Movimientos */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-100/80 border-b border-slate-200 text-slate-600 text-[11px] uppercase tracking-wider font-semibold">
                  <th className="p-3">Fecha y Hora</th>
                  <th className="p-3">Bien Tecnológico</th>
                  <th className="p-3">Trayecto (Origen → Destino)</th>
                  <th className="p-3">Motivo / Justificación</th>
                  <th className="p-3">Custodia y Recepción</th>
                  <th className="p-3 text-right">Acta Oficial</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-400">
                      Cargando historial de movimientos...
                    </td>
                  </tr>
                ) : movimientosVisibles.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-400">
                      No se registran movimientos con los filtros seleccionados.
                    </td>
                  </tr>
                ) : (
                  movimientosVisibles.map((m) => {
                    const ambOrig =
                      ambientes.find((a) => a.id === m.ambiente_origen_id)?.nombre ||
                      m.ambiente_origen_id;
                    const ambDestBase =
                      ambientes.find((a) => a.id === m.ambiente_destino_id)?.nombre ||
                      m.ambiente_destino_id;
                    const ambDest =
                      ambDestBase.trim().toLowerCase() === 'otros' && m.ubicacion_detalle_destino
                        ? `Otros (${m.ubicacion_detalle_destino})`
                        : ambDestBase;

                    return (
                      <tr key={m.id} className="hover:bg-slate-50 transition-colors">
                        <td className="p-3 whitespace-nowrap text-slate-600">
                          {formatFecha(m.fecha_movimiento)}
                        </td>
                        <td className="p-3">
                          <p className="font-semibold text-slate-800">
                            {m.denominacion || 'Bien Tecnológico'}
                          </p>
                          <p className="text-[11px] text-slate-500 font-mono">
                            Patr: {m.codigo_patrimonial} | Etq:{' '}
                            <span className="text-emerald-700 font-bold">
                              {m.etiqueta_interna || 'S/E'}
                            </span>
                          </p>
                        </td>
                        <td className="p-3">
                          <div className="flex items-center space-x-1.5 font-medium">
                            <span className="text-slate-600 bg-slate-100 px-2 py-0.5 rounded text-[11px]">
                              {ambOrig}
                            </span>
                            <ArrowLeftRight className="w-3 h-3 text-slate-400 shrink-0" />
                            <span className="text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded text-[11px] font-bold">
                              {ambDest}
                            </span>
                          </div>
                        </td>
                        <td className="p-3 text-slate-700 max-w-xs truncate" title={m.motivo}>
                          {m.motivo}
                        </td>
                        <td className="p-3 text-[11px]">
                          <p className="font-semibold text-slate-800">
                            Recibe: {m.responsable_recepcion}
                          </p>
                          <p className="text-slate-400">
                            Entrega: {m.responsable_entrega || 'Responsable AIP'}
                          </p>
                        </td>
                        <td className="p-3 text-right">
                          <button
                            type="button"
                            onClick={() => abrirActaParaMovimiento(m)}
                            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white font-semibold text-[11px] rounded-lg shadow-xs transition-colors inline-flex items-center space-x-1"
                          >
                            <Printer className="w-3.5 h-3.5" />
                            <span>Ver Acta</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL DE TRASLADO */}
      {modalTrasladoAbierto && (
        <ModalTraslado
          bienesPreseleccionados={bienesParaTrasladar}
          todosBienes={bienes}
          ambientes={ambientes}
          onClose={() => setModalTrasladoAbierto(false)}
          onSuccess={(resultado) => {
            setModalTrasladoAbierto(false);
            setBienesCheckeados([]);
            cargarDatos();
            setNotificacion(
              `Traslado completado exitosamente: ${resultado.totalMovimientos} equipo(s) reasignados (Código Acta: ${resultado.loteId}).`
            );
            // Abrir automáticamente el acta para imprimir
            setMovimientosParaActa(resultado.movimientos);
            setModalActaAbierto(true);
          }}
        />
      )}

      {/* MODAL DE ACTA OFICIAL IMPRIMIBLE */}
      {modalActaAbierto && (
        <ActaTrasladoModal
          movimientos={movimientosParaActa}
          ambientes={ambientes}
          institucionNombre={institucionConfig?.nombre_ie}
          ugel={institucionConfig?.ugel}
          dre={institucionConfig?.dre}
          onClose={() => setModalActaAbierto(false)}
        />
      )}
    </div>
  );
};
