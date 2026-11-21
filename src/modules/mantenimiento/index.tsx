import React, { useState, useEffect } from 'react';
import {
  Wrench,
  Clock,
  CheckCircle2,
  Search,
  PlusCircle,
  AlertCircle,
  ShieldAlert,
  Layers,
} from 'lucide-react';
import { MantenimientoRegistro, BienPatrimonial } from '@/types';
import { mantenimientoRepository, bienRepository } from '@/repositories';
import { useAuth } from '@/hooks';
import { ModalAbrirMantenimiento } from './ModalAbrirMantenimiento';
import { ModalCerrarMantenimiento } from './ModalCerrarMantenimiento';

export const MantenimientoModule: React.FC = () => {
  const { perfil } = useAuth();
  const isAdmin = perfil?.rol === 'ADMIN';

  const [mantenimientos, setMantenimientos] = useState<MantenimientoRegistro[]>([]);
  const [bienes, setBienes] = useState<BienPatrimonial[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filtros
  const [busqueda, setBusqueda] = useState('');
  const [filtroEstado, setFiltroEstado] = useState<'TODOS' | 'EN_PROCESO' | 'FINALIZADO'>('TODOS');
  const [filtroTipo, setFiltroTipo] = useState<'TODOS' | 'PREVENTIVO' | 'CORRECTIVO'>('TODOS');

  // Modales
  const [modalAbrirAbierto, setModalAbrirAbierto] = useState(false);
  const [mantenimientoParaCerrar, setMantenimientoParaCerrar] =
    useState<MantenimientoRegistro | null>(null);
  const [notificacion, setNotificacion] = useState<string | null>(null);

  const cargarDatos = async () => {
    setLoading(true);
    setError(null);
    try {
      const [listaMantenimientos, listaBienes] = await Promise.all([
        mantenimientoRepository.listar(),
        bienRepository.listar(),
      ]);
      setMantenimientos(listaMantenimientos);
      setBienes(listaBienes);
    } catch (err: any) {
      setError(err.message || 'Error al cargar registros de mantenimiento.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, []);

  // Métricas y KPIs
  const enProceso = mantenimientos.filter((m) => !m.cerrado).length;

  const mesActual = new Date().getMonth();
  const anioActual = new Date().getFullYear();
  const finalizadosEsteMes = mantenimientos.filter((m) => {
    if (!m.cerrado || !m.fecha_fin) return false;
    const d = new Date(m.fecha_fin);
    return d.getMonth() === mesActual && d.getFullYear() === anioActual;
  }).length;

  const totalPreventivos = mantenimientos.filter((m) => m.tipo === 'PREVENTIVO').length;
  const totalCorrectivos = mantenimientos.filter((m) => m.tipo === 'CORRECTIVO').length;
  const equiposEnSoporte = bienes.filter((b) => b.estado_operativo === 'EN_MANTENIMIENTO').length;

  // Filtrado de la tabla
  const mantenimientosFiltrados = mantenimientos.filter((m) => {
    if (filtroEstado === 'EN_PROCESO' && m.cerrado) return false;
    if (filtroEstado === 'FINALIZADO' && !m.cerrado) return false;
    if (filtroTipo !== 'TODOS' && m.tipo !== filtroTipo) return false;

    if (!busqueda.trim()) return true;
    const term = busqueda.toLowerCase().trim();
    return (
      m.codigo_patrimonial.toLowerCase().includes(term) ||
      (m.etiqueta_interna && m.etiqueta_interna.toLowerCase().includes(term)) ||
      (m.denominacion && m.denominacion.toLowerCase().includes(term)) ||
      (m.serie && m.serie.toLowerCase().includes(term)) ||
      m.tecnico.toLowerCase().includes(term) ||
      m.descripcion_falla.toLowerCase().includes(term) ||
      m.trabajo_realizado.toLowerCase().includes(term)
    );
  });

  const formatFecha = (f?: string | Date) => {
    if (!f) return '—';
    try {
      const d = typeof f === 'string' ? new Date(f) : f;
      return d.toLocaleDateString('es-PE', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return String(f);
    }
  };

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center space-x-2.5">
            <Wrench className="w-7 h-7 text-amber-600" />
            <span>Mantenimiento y Soporte Técnico</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Gestión de servicios preventivos, correctivos y hoja de vida de intervenciones
          </p>
        </div>

        {isAdmin && (
          <button
            type="button"
            onClick={() => setModalAbrirAbierto(true)}
            className="flex items-center space-x-2 px-4 py-2.5 bg-amber-600 hover:bg-amber-500 text-white font-semibold text-xs rounded-xl shadow-sm transition-all"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Registrar Mantenimiento</span>
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

      {/* Tarjetas KPI Superiores */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs flex items-center space-x-4">
          <div className="p-3 bg-amber-50 rounded-xl text-amber-600 shrink-0">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500">En Proceso</p>
            <h3 className="text-2xl font-extrabold text-slate-800">{enProceso}</h3>
            <p className="text-[11px] text-amber-700 font-medium">Órdenes activas</p>
          </div>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs flex items-center space-x-4">
          <div className="p-3 bg-emerald-50 rounded-xl text-emerald-600 shrink-0">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500">Cerrados este Mes</p>
            <h3 className="text-2xl font-extrabold text-slate-800">{finalizadosEsteMes}</h3>
            <p className="text-[11px] text-emerald-700 font-medium">Atenciones resueltas</p>
          </div>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs flex items-center space-x-4">
          <div className="p-3 bg-indigo-50 rounded-xl text-indigo-600 shrink-0">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500">Preventivos / Correctivos</p>
            <h3 className="text-xl font-extrabold text-slate-800">
              {totalPreventivos} <span className="text-slate-400 font-normal">/</span> {totalCorrectivos}
            </h3>
            <p className="text-[11px] text-indigo-700 font-medium">Desglose acumulado</p>
          </div>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs flex items-center space-x-4">
          <div className="p-3 bg-rose-50 rounded-xl text-rose-600 shrink-0">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500">Equipos en Soporte</p>
            <h3 className="text-2xl font-extrabold text-slate-800">{equiposEnSoporte}</h3>
            <p className="text-[11px] text-rose-700 font-medium">Estado no disponible</p>
          </div>
        </div>
      </div>

      {/* Tabla Principal */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {/* Barra de Filtros */}
        <div className="p-4 bg-slate-50/70 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar por equipo, serie, etiqueta, técnico o trabajo..."
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          <div className="flex items-center space-x-2">
            <select
              value={filtroEstado}
              onChange={(e) => setFiltroEstado(e.target.value as any)}
              className="px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 font-medium"
            >
              <option value="TODOS">Todos los Estados</option>
              <option value="EN_PROCESO">Solo En Proceso</option>
              <option value="FINALIZADO">Solo Finalizados</option>
            </select>

            <select
              value={filtroTipo}
              onChange={(e) => setFiltroTipo(e.target.value as any)}
              className="px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 font-medium"
            >
              <option value="TODOS">Todos los Tipos</option>
              <option value="PREVENTIVO">Preventivos</option>
              <option value="CORRECTIVO">Correctivos</option>
            </select>
          </div>
        </div>

        {/* Tabla */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-100/80 border-b border-slate-200 text-slate-600 text-[11px] uppercase tracking-wider font-semibold">
                <th className="p-3 text-center">Estado</th>
                <th className="p-3">Tipo</th>
                <th className="p-3">Bien Tecnológico</th>
                <th className="p-3">Fechas (Inicio / Fin)</th>
                <th className="p-3">Diagnóstico / Trabajo Realizado</th>
                <th className="p-3">Técnico Encargado</th>
                <th className="p-3 text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400">
                    Cargando historial de mantenimiento...
                  </td>
                </tr>
              ) : mantenimientosFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400">
                    No se registran órdenes de mantenimiento con los filtros seleccionados.
                  </td>
                </tr>
              ) : (
                mantenimientosFiltrados.map((m) => {
                  return (
                    <tr key={m.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-3 text-center">
                        {m.cerrado ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                            Finalizado
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                            En Proceso
                          </span>
                        )}
                      </td>
                      <td className="p-3">
                        <span
                          className={`font-bold text-[11px] ${
                            m.tipo === 'CORRECTIVO' ? 'text-rose-700' : 'text-blue-700'
                          }`}
                        >
                          {m.tipo}
                        </span>
                      </td>
                      <td className="p-3">
                        <p className="font-semibold text-slate-800">
                          {m.denominacion || 'Equipo'} {m.marca ? `— ${m.marca}` : ''}{' '}
                          {m.modelo || ''}
                        </p>
                        <p className="text-[11px] text-slate-500 font-mono">
                          Patr: {m.codigo_patrimonial} | Serie: {m.serie} | Etq:{' '}
                          <span className="text-emerald-700 font-bold">
                            {m.etiqueta_interna || 'S/E'}
                          </span>
                        </p>
                      </td>
                      <td className="p-3 whitespace-nowrap text-slate-600 text-[11px]">
                        <p>Inicio: {formatFecha(m.fecha_inicio)}</p>
                        {m.fecha_fin && (
                          <p className="text-emerald-700 font-medium">
                            Fin: {formatFecha(m.fecha_fin)}
                          </p>
                        )}
                      </td>
                      <td className="p-3 max-w-xs">
                        <p className="text-slate-800 font-medium truncate" title={m.descripcion_falla}>
                          {m.descripcion_falla}
                        </p>
                        {m.trabajo_realizado && (
                          <p
                            className="text-[11px] text-slate-500 truncate mt-0.5"
                            title={m.trabajo_realizado}
                          >
                            <strong>Solución:</strong> {m.trabajo_realizado}
                          </p>
                        )}
                      </td>
                      <td className="p-3 font-medium text-slate-700">{m.tecnico}</td>
                      <td className="p-3 text-right">
                        {!m.cerrado && isAdmin ? (
                          <button
                            type="button"
                            onClick={() => setMantenimientoParaCerrar(m)}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-[11px] rounded-lg shadow-xs transition-colors inline-flex items-center space-x-1"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Finalizar</span>
                          </button>
                        ) : (
                          <span className="text-[11px] text-slate-400 font-medium italic">
                            {m.cerrado ? 'Atención cerrada' : 'Solo lectura'}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Abrir Mantenimiento */}
      {modalAbrirAbierto && (
        <ModalAbrirMantenimiento
          bienesDisponibles={bienes}
          onClose={() => setModalAbrirAbierto(false)}
          onSuccess={() => {
            setModalAbrirAbierto(false);
            cargarDatos();
            setNotificacion('Orden de soporte técnico aperturada con éxito.');
          }}
        />
      )}

      {/* Modal Cerrar Mantenimiento */}
      {mantenimientoParaCerrar && (
        <ModalCerrarMantenimiento
          mantenimiento={mantenimientoParaCerrar}
          onClose={() => setMantenimientoParaCerrar(null)}
          onSuccess={() => {
            setMantenimientoParaCerrar(null);
            cargarDatos();
            setNotificacion('Atención de soporte técnico finalizada exitosamente.');
          }}
        />
      )}
    </div>
  );
};
