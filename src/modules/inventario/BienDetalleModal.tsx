import React, { useState, useEffect } from 'react';
import {
  X,
  Laptop,
  QrCode,
  MapPin,
  Calendar,
  Layers,
  History,
  Wrench,
  ArrowLeftRight,
  Clock,
} from 'lucide-react';
import {
  BienPatrimonial,
  Ambiente,
  CategoriaEquipo,
  MovimientoBien,
  MantenimientoRegistro,
  Prestamo,
} from '@/types';
import {
  movimientoRepository,
  mantenimientoRepository,
  prestamoRepository,
} from '@/repositories';

interface BienDetalleModalProps {
  bien: BienPatrimonial;
  ambientes: Ambiente[];
  categorias: CategoriaEquipo[];
  onClose: () => void;
  onEdit?: () => void;
  canEdit?: boolean;
}

interface EventoTimeline {
  id: string;
  tipo: 'TRASLADO' | 'MANTENIMIENTO' | 'PRESTAMO';
  fecha: Date;
  titulo: string;
  subtitulo: string;
  detalle: string;
  responsable: string;
  badge: { texto: string; color: string };
}

export const BienDetalleModal: React.FC<BienDetalleModalProps> = ({
  bien,
  ambientes,
  categorias,
  onClose,
  onEdit,
  canEdit = false,
}) => {
  const [tab, setTab] = useState<'ficha' | 'historial'>('ficha');

  const [movimientos, setMovimientos] = useState<MovimientoBien[]>([]);
  const [mantenimientos, setMantenimientos] = useState<MantenimientoRegistro[]>([]);
  const [prestamos, setPrestamos] = useState<Prestamo[]>([]);
  const [cargandoHistorial, setCargandoHistorial] = useState(false);

  useEffect(() => {
    let activo = true;
    const cargarTrazabilidad = async () => {
      setCargandoHistorial(true);
      try {
        const [movs, mants, prests] = await Promise.all([
          movimientoRepository.listarPorBien(bien.id),
          mantenimientoRepository.listarPorBien(bien.id),
          prestamoRepository.listarPorBien(bien.id),
        ]);
        if (activo) {
          setMovimientos(movs);
          setMantenimientos(mants);
          setPrestamos(prests);
        }
      } catch (err) {
        console.error('Error al cargar historial del bien:', err);
      } finally {
        if (activo) setCargandoHistorial(false);
      }
    };

    cargarTrazabilidad();
    return () => {
      activo = false;
    };
  }, [bien.id]);

  const ambienteNombreBase =
    ambientes.find((a) => a.id === bien.ambiente_id)?.nombre || 'Ambiente no asignado';
  const ambienteNombre =
    ambienteNombreBase.trim().toLowerCase() === 'otros' && bien.ubicacion_detalle
      ? `Otros — ${bien.ubicacion_detalle}`
      : ambienteNombreBase;
  const categoriaNombre =
    categorias.find((c) => c.id === bien.categoria_id)?.nombre || 'Categoría general';

  const estadoConservacionLabel = (ec: string) => {
    switch (ec) {
      case 'N':
        return { label: 'Nuevo (N)', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
      case 'B':
        return { label: 'Bueno (B)', color: 'bg-blue-50 text-blue-700 border-blue-200' };
      case 'R':
        return { label: 'Regular (R)', color: 'bg-amber-50 text-amber-700 border-amber-200' };
      case 'M':
        return { label: 'Malo (M)', color: 'bg-rose-50 text-rose-700 border-rose-200' };
      default:
        return { label: ec, color: 'bg-slate-50 text-slate-700 border-slate-200' };
    }
  };

  const estadoOperativoLabel = (eo: string) => {
    switch (eo) {
      case 'OPERATIVO':
        return { label: 'Operativo / Disponible', color: 'bg-emerald-600 text-white' };
      case 'PRESTADO':
        return { label: 'En Préstamo', color: 'bg-indigo-600 text-white' };
      case 'EN_MANTENIMIENTO':
        return { label: 'En Soporte / Mantenimiento', color: 'bg-amber-600 text-white' };
      case 'DE_BAJA':
        return { label: 'Dado de Baja', color: 'bg-rose-700 text-white' };
      default:
        return { label: eo, color: 'bg-slate-600 text-white' };
    }
  };

  const cons = estadoConservacionLabel(bien.estado_conservacion);
  const oper = estadoOperativoLabel(bien.estado_operativo);

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
      return '—';
    }
  };

  // Construir línea de tiempo cronológica unificada
  const eventosTimeline: EventoTimeline[] = [
    ...movimientos.map((m) => {
      const ambOrig =
        ambientes.find((a) => a.id === m.ambiente_origen_id)?.nombre || m.ambiente_origen_id;
      const ambDestBase =
        ambientes.find((a) => a.id === m.ambiente_destino_id)?.nombre || m.ambiente_destino_id;
      const ambDest =
        ambDestBase.trim().toLowerCase() === 'otros' && m.ubicacion_detalle_destino
          ? `Otros (${m.ubicacion_detalle_destino})`
          : ambDestBase;

      return {
        id: `mov-${m.id}`,
        tipo: 'TRASLADO' as const,
        fecha: new Date(m.fecha_movimiento),
        titulo: 'Traslado entre Ambientes',
        subtitulo: `${ambOrig} → ${ambDest}`,
        detalle: m.motivo,
        responsable: `Recibe: ${m.responsable_recepcion}${
          m.responsable_entrega ? ` | Entrega: ${m.responsable_entrega}` : ''
        }`,
        badge: { texto: 'Traslado', color: 'bg-emerald-100 text-emerald-800' },
      };
    }),
    ...mantenimientos.map((mt) => {
      return {
        id: `mant-${mt.id}`,
        tipo: 'MANTENIMIENTO' as const,
        fecha: new Date(mt.fecha_inicio),
        titulo: `Mantenimiento ${mt.tipo} ${mt.cerrado ? '(Finalizado)' : '(En Proceso)'}`,
        subtitulo: `Técnico: ${mt.tecnico}`,
        detalle: `${mt.descripcion_falla}${
          mt.trabajo_realizado ? ` — Solución: ${mt.trabajo_realizado}` : ''
        }${mt.repuestos ? ` [Repuestos: ${mt.repuestos}]` : ''}`,
        responsable: mt.cerrado
          ? `Cerrado el ${formatFecha(mt.fecha_fin)} | Estado resultante: ${mt.estado_conservacion_resultante}`
          : 'Atención técnica en curso',
        badge: {
          texto: mt.tipo,
          color:
            mt.tipo === 'CORRECTIVO'
              ? 'bg-rose-100 text-rose-800'
              : 'bg-blue-100 text-blue-800',
        },
      };
    }),
    ...prestamos.map((p) => {
      const esDevuelto = p.estado === 'DEVUELTO' || p.estado === 'CON_INCIDENCIA';
      return {
        id: `prest-${p.id}`,
        tipo: 'PRESTAMO' as const,
        fecha: new Date(p.fecha_salida),
        titulo: `Préstamo Pedagógico ${esDevuelto ? '(Devuelto)' : '(En Curso)'}`,
        subtitulo: `Docente: ${p.docente_nombre} | Área: ${p.area_nombre} (${p.grado_seccion})`,
        detalle: `Ambiente de uso: ${p.ambiente_uso}.${
          p.accesorios_entregados ? ` Accesorios: ${p.accesorios_entregados}.` : ''
        }${p.observacion_retorno ? ` Observación retorno: ${p.observacion_retorno}` : ''}`,
        responsable:
          esDevuelto && p.fecha_devolucion_real
            ? `Retornado el ${formatFecha(p.fecha_devolucion_real)} (${
                p.estado === 'CON_INCIDENCIA' ? 'Con Incidencia' : 'Conforme'
              })`
            : `Retorno estimado: ${formatFecha(p.fecha_devolucion_estimada)}`,
        badge: {
          texto:
            p.estado === 'ACTIVO'
              ? 'En Uso'
              : p.estado === 'DEVUELTO'
              ? 'Devuelto'
              : 'Incidencia',
          color:
            p.estado === 'ACTIVO'
              ? 'bg-amber-100 text-amber-800'
              : p.estado === 'DEVUELTO'
              ? 'bg-indigo-100 text-indigo-800'
              : 'bg-rose-100 text-rose-800',
        },
      };
    }),
  ].sort((a, b) => b.fecha.getTime() - a.fecha.getTime());

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full border border-slate-200 overflow-hidden my-6">
        {/* Encabezado */}
        <div className="bg-slate-900 text-white p-5 flex items-start justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-emerald-600 rounded-xl text-white">
              <Laptop className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-mono text-xs font-bold text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-800">
                  {bien.etiqueta_interna || 'S/E'}
                </span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${oper.color}`}>
                  {oper.label}
                </span>
                {bien.lote_etiqueta && (
                  <span
                    className="inline-flex items-center space-x-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold border"
                    style={{
                      backgroundColor: `${bien.lote_color || '#6366F1'}30`,
                      borderColor: bien.lote_color || '#6366F1',
                      color: bien.lote_color || '#6366F1',
                    }}
                  >
                    <span
                      className="w-2 h-2 rounded-full inline-block shrink-0 shadow-xs"
                      style={{ backgroundColor: bien.lote_color || '#6366F1' }}
                    />
                    <span>{bien.lote_etiqueta}</span>
                  </span>
                )}
              </div>
              <h2 className="text-base font-bold text-white mt-1">
                {bien.denominacion} — {bien.marca} {bien.modelo}
              </h2>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Pestañas */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-6 text-xs font-semibold">
          <button
            onClick={() => setTab('ficha')}
            className={`py-3 px-4 border-b-2 flex items-center space-x-2 transition-colors ${
              tab === 'ficha'
                ? 'border-emerald-600 text-emerald-700 bg-white'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Ficha Técnica Patrimonial</span>
          </button>
          <button
            onClick={() => setTab('historial')}
            className={`py-3 px-4 border-b-2 flex items-center space-x-2 transition-colors ${
              tab === 'historial'
                ? 'border-emerald-600 text-emerald-700 bg-white'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <History className="w-4 h-4" />
            <span>Hoja de Vida y Trazabilidad ({eventosTimeline.length})</span>
          </button>
        </div>

        {/* Contenido Pestaña Ficha Técnica */}
        {tab === 'ficha' && (
          <div className="p-6 space-y-4 text-xs max-h-[65vh] overflow-y-auto">
            {/* Tarjeta de Identificación Oficial */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-4 bg-slate-50 rounded-xl border border-slate-200">
              <div>
                <span className="text-slate-500 font-medium block">Código Patrimonial</span>
                <span className="font-mono font-bold text-slate-900 text-sm">
                  {bien.codigo_patrimonial || 'S/C'}
                </span>
                <span className="text-[10px] text-slate-400 block font-sans">
                  {bien.tipo_codigo === 'CIC' ? 'Con Código Inventario' : 'Sin Código'}
                </span>
              </div>
              <div>
                <span className="text-slate-500 font-medium block">Número de Serie</span>
                <span className="font-mono font-bold text-slate-900 text-sm">
                  {bien.serie || 'S/N'}
                </span>
              </div>
              <div>
                <span className="text-slate-500 font-medium block">Etiqueta / QR</span>
                <span className="font-mono font-bold text-emerald-700 text-sm flex items-center space-x-1">
                  <QrCode className="w-3.5 h-3.5" />
                  <span>{bien.etiqueta_interna || bien.codigo_qr || 'S/E'}</span>
                </span>
              </div>
            </div>

            {/* Especificaciones Físicas y Clasificación */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <span className="text-slate-500 font-medium block">Categoría</span>
                <span className="font-semibold text-slate-800">{categoriaNombre}</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <span className="text-slate-500 font-medium block">Marca</span>
                <span className="font-semibold text-slate-800">{bien.marca || '—'}</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <span className="text-slate-500 font-medium block">Modelo</span>
                <span className="font-semibold text-slate-800">{bien.modelo || '—'}</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <span className="text-slate-500 font-medium block">Color</span>
                <span className="font-semibold text-slate-800">{bien.color || '—'}</span>
              </div>
            </div>

            {/* Lote de Adquisición si está definido */}
            {bien.lote_etiqueta && (
              <div
                className="p-3 rounded-xl border flex items-center justify-between"
                style={{
                  backgroundColor: `${bien.lote_color || '#6366F1'}10`,
                  borderColor: `${bien.lote_color || '#6366F1'}40`,
                }}
              >
                <div className="flex items-center space-x-2.5">
                  <span
                    className="w-4 h-4 rounded-full inline-block border-2 border-white shadow-xs"
                    style={{ backgroundColor: bien.lote_color || '#6366F1' }}
                  />
                  <div>
                    <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 block">
                      Lote de Adquisición / Dotación
                    </span>
                    <span
                      className="text-xs font-black tracking-tight"
                      style={{ color: bien.lote_color || '#6366F1' }}
                    >
                      {bien.lote_etiqueta}
                    </span>
                  </div>
                </div>
                <span className="font-mono text-[10px] text-slate-500 font-semibold">
                  {bien.lote_color || '#6366F1'}
                </span>
              </div>
            )}

            {/* Ubicación y Estado */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-slate-500 font-semibold block mb-1">
                  Ubicación Institucional
                </span>
                <div className="flex items-center space-x-2 text-slate-800">
                  <MapPin className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span className="font-bold text-sm">{ambienteNombre}</span>
                </div>
                {bien.estacion_grupo && (
                  <p className="text-[11px] text-slate-600 mt-1 pl-6">
                    Estación / Grupo: <strong>{bien.estacion_grupo}</strong>
                  </p>
                )}
              </div>

              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-slate-500 font-semibold block mb-1">
                  Estado de Conservación
                </span>
                <span
                  className={`inline-block px-2.5 py-1 rounded-md text-xs font-bold border ${cons.color}`}
                >
                  {cons.label}
                </span>
                <p className="text-[11px] text-slate-500 mt-1">
                  Total de préstamos acumulados:{' '}
                  <strong className="text-slate-800">{bien.total_prestamos}</strong>
                </p>
              </div>
            </div>

            {/* Fechas de Registro y Actualización */}
            <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200 text-[11px]">
              <div>
                <span className="text-slate-500 font-medium block">Registrado el</span>
                <span className="font-medium text-slate-700 flex items-center space-x-1">
                  <Calendar className="w-3 h-3 text-slate-400" />
                  <span>{formatFecha(bien.fecha_registro)}</span>
                </span>
              </div>
              <div>
                <span className="text-slate-500 font-medium block">Última actualización</span>
                <span className="font-medium text-slate-700 flex items-center space-x-1">
                  <Clock className="w-3 h-3 text-slate-400" />
                  <span>{formatFecha(bien.actualizado_en)}</span>
                </span>
              </div>
            </div>

            {/* Observaciones */}
            <div>
              <span className="text-slate-500 font-semibold block mb-1">
                Observaciones Técnicas
              </span>
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-slate-700 whitespace-pre-wrap">
                {bien.observacion || 'Sin observaciones registradas.'}
              </div>
            </div>

            {/* Información de Baja si aplica */}
            {bien.estado_operativo === 'DE_BAJA' && (
              <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-900">
                <span className="font-bold block text-xs">Registro de Baja Patrimonial:</span>
                <p className="mt-1">
                  <strong>Motivo:</strong> {bien.motivo_baja || 'No especificado'}
                </p>
                <p className="text-[11px] text-rose-700 mt-0.5">
                  Fecha de baja: {formatFecha(bien.fecha_baja)}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Contenido Pestaña Historial y Hoja de Vida */}
        {tab === 'historial' && (
          <div className="p-6 space-y-4 text-xs max-h-[65vh] overflow-y-auto">
            {cargandoHistorial ? (
              <div className="p-8 text-center text-slate-400">
                Consultando trazabilidad y mantenimientos...
              </div>
            ) : eventosTimeline.length === 0 ? (
              <div className="p-8 text-center bg-slate-50 rounded-xl border border-slate-200 text-slate-500">
                <History className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="font-semibold text-slate-700">Sin historial registrado aún</p>
                <p className="text-[11px] text-slate-400 mt-1">
                  Este bien no registra traslados, mantenimientos ni préstamos pedagógicos hasta el momento.
                </p>
              </div>
            ) : (
              <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                {eventosTimeline.map((ev) => {
                  const esTraslado = ev.tipo === 'TRASLADO';
                  const esMantenimiento = ev.tipo === 'MANTENIMIENTO';
                  return (
                    <div key={ev.id} className="relative group">
                      {/* Nodo icono en la línea */}
                      <div
                        className={`absolute -left-6 top-0 w-5 h-5 rounded-full flex items-center justify-center text-white ring-4 ring-white shadow-xs ${
                          esTraslado
                            ? 'bg-emerald-600'
                            : esMantenimiento
                            ? 'bg-amber-600'
                            : 'bg-indigo-600'
                        }`}
                      >
                        {esTraslado ? (
                          <ArrowLeftRight className="w-3 h-3" />
                        ) : esMantenimiento ? (
                          <Wrench className="w-3 h-3" />
                        ) : (
                          <QrCode className="w-3 h-3" />
                        )}
                      </div>

                      {/* Tarjeta del Evento */}
                      <div className="bg-slate-50 hover:bg-slate-100/70 p-3.5 rounded-xl border border-slate-200 transition-colors">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <span className="font-bold text-slate-800 text-xs">{ev.titulo}</span>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${ev.badge.color}`}
                          >
                            {ev.badge.texto}
                          </span>
                        </div>

                        <p className="font-semibold text-emerald-800 text-[11px]">{ev.subtitulo}</p>
                        <p className="text-slate-600 text-[11px] mt-1 leading-relaxed">{ev.detalle}</p>

                        <div className="mt-2 pt-2 border-t border-slate-200/60 flex flex-wrap items-center justify-between text-[10px] text-slate-400 gap-2">
                          <span className="text-slate-600 font-medium">{ev.responsable}</span>
                          <span className="font-mono">{formatFecha(ev.fecha)}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Pie de Modal */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <span className="text-[11px] text-slate-400 font-mono">ID: {bien.id}</span>
          <div className="flex items-center space-x-2">
            {canEdit && onEdit && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onEdit();
                }}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white font-semibold text-xs rounded-lg transition-colors"
              >
                Editar Bien
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 font-semibold text-xs rounded-lg border border-slate-300 transition-colors"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
