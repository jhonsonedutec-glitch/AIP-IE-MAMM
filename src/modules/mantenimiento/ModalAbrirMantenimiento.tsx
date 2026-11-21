import React, { useState } from 'react';
import { X, Wrench, Search, AlertCircle } from 'lucide-react';
import { BienPatrimonial } from '@/types';
import { mantenimientoRepository } from '@/repositories';
import { useAuth } from '@/hooks';

interface ModalAbrirMantenimientoProps {
  bienesDisponibles: BienPatrimonial[];
  onClose: () => void;
  onSuccess: (nuevoId: string) => void;
}

export const ModalAbrirMantenimiento: React.FC<ModalAbrirMantenimientoProps> = ({
  bienesDisponibles,
  onClose,
  onSuccess,
}) => {
  const { user } = useAuth();

  // Filtrar equipos aptos para mantenimiento: no dados de baja y no en mantenimiento actualmente
  const bienesAptos = bienesDisponibles.filter(
    (b) => b.estado_operativo !== 'DE_BAJA' && b.estado_operativo !== 'EN_MANTENIMIENTO'
  );

  const [bienSeleccionadoId, setBienSeleccionadoId] = useState<string>(
    bienesAptos[0]?.id || ''
  );
  const [busqueda, setBusqueda] = useState('');
  const [tipo, setTipo] = useState<'PREVENTIVO' | 'CORRECTIVO'>('PREVENTIVO');
  const [descripcionFalla, setDescripcionFalla] = useState('');
  const [tecnico, setTecnico] = useState('');
  const [fechaInicio, setFechaInicio] = useState(
    new Date().toISOString().slice(0, 10)
  );

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const bienesFiltrados = bienesAptos.filter((b) => {
    if (!busqueda.trim()) return true;
    const term = busqueda.toLowerCase().trim();
    return (
      b.denominacion.toLowerCase().includes(term) ||
      b.codigo_patrimonial.toLowerCase().includes(term) ||
      (b.etiqueta_interna && b.etiqueta_interna.toLowerCase().includes(term)) ||
      b.serie.toLowerCase().includes(term) ||
      b.marca.toLowerCase().includes(term)
    );
  });

  const bienSeleccionado = bienesAptos.find((b) => b.id === bienSeleccionadoId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bienSeleccionadoId) {
      setError('Debe seleccionar un equipo patrimonial.');
      return;
    }
    if (!descripcionFalla.trim()) {
      setError('La descripción de la falla o motivo del servicio es obligatoria.');
      return;
    }
    if (!tecnico.trim()) {
      setError('Debe especificar el técnico, docente o empresa responsable del servicio.');
      return;
    }

    setLoading(true);
    setError(null);

    const operador = user ? { uid: user.uid, email: user.email || '' } : undefined;

    try {
      const id = await mantenimientoRepository.abrirMantenimiento(
        {
          bienId: bienSeleccionadoId,
          tipo,
          descripcionFalla: descripcionFalla.trim(),
          tecnico: tecnico.trim(),
          fechaInicio,
        },
        operador
      );
      onSuccess(id);
    } catch (err: any) {
      setError(err.message || 'Error al registrar orden de soporte.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full border border-slate-200 overflow-hidden my-6">
        {/* Encabezado */}
        <div className="bg-slate-900 text-white p-5 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-amber-600 rounded-xl text-white">
              <Wrench className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">
                Abrir Orden de Soporte / Mantenimiento
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Cambia automáticamente el estado del bien a "EN_MANTENIMIENTO"
              </p>
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

        {error && (
          <div className="m-5 mb-0 p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-start space-x-2 text-rose-800 text-xs">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <span className="font-medium leading-relaxed">{error}</span>
          </div>
        )}

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          {/* Selección de Equipo con Buscador */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Equipo Tecnológico a Intervenir *
            </label>
            <div className="relative mb-1.5">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Filtrar por código patrimonial, serie o etiqueta..."
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
            <select
              required
              value={bienSeleccionadoId}
              onChange={(e) => setBienSeleccionadoId(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 font-medium"
            >
              {bienesFiltrados.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.denominacion} — {b.marca} {b.modelo} [Patr: {b.codigo_patrimonial}] (Etq:{' '}
                  {b.etiqueta_interna || 'S/E'})
                </option>
              ))}
            </select>
            {bienesAptos.length === 0 && (
              <p className="text-amber-700 mt-1 text-[11px]">
                No hay equipos disponibles para mantenimiento (todos están en soporte o dados de baja).
              </p>
            )}
          </div>

          {bienSeleccionado && (
            <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl text-[11px] text-amber-900 flex items-center justify-between">
              <div>
                <span className="font-bold block">
                  {bienSeleccionado.denominacion} — {bienSeleccionado.marca} {bienSeleccionado.modelo}
                </span>
                <span className="font-mono text-amber-800">
                  Serie: {bienSeleccionado.serie} | Estado actual: {bienSeleccionado.estado_conservacion}
                </span>
              </div>
              <span className="px-2 py-0.5 bg-amber-200/80 text-amber-900 rounded font-bold text-[10px]">
                Apto para servicio
              </span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Tipo de Mantenimiento *
              </label>
              <select
                value={tipo}
                onChange={(e) => setTipo(e.target.value as 'PREVENTIVO' | 'CORRECTIVO')}
                className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 font-semibold text-slate-800"
              >
                <option value="PREVENTIVO">PREVENTIVO (Limpieza, ajustes, optimización)</option>
                <option value="CORRECTIVO">CORRECTIVO (Reparación de falla o daño)</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Fecha de Ingreso a Soporte *
              </label>
              <input
                type="date"
                required
                value={fechaInicio}
                onChange={(e) => setFechaInicio(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 font-medium"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Técnico / Responsable del Soporte *
            </label>
            <input
              type="text"
              required
              value={tecnico}
              onChange={(e) => setTecnico(e.target.value)}
              placeholder="Ej. Juan Pérez (Soporte AIP) / Servicio Técnico Autorizado"
              className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Diagnóstico Inicial / Motivo de la Falla *
            </label>
            <textarea
              required
              rows={3}
              value={descripcionFalla}
              onChange={(e) => setDescripcionFalla(e.target.value)}
              placeholder="Describa el problema detectado o los trabajos preventivos programados..."
              className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          {/* Botones */}
          <div className="pt-3 border-t border-slate-200 flex items-center justify-end space-x-2">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 font-semibold text-xs rounded-lg border border-slate-300 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading || !bienSeleccionadoId}
              className="px-5 py-2 bg-amber-600 hover:bg-amber-500 disabled:bg-slate-300 text-white font-semibold text-xs rounded-lg shadow-sm transition-colors flex items-center space-x-1.5"
            >
              <Wrench className="w-4 h-4" />
              <span>{loading ? 'Registrando orden...' : 'Registrar Mantenimiento'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
