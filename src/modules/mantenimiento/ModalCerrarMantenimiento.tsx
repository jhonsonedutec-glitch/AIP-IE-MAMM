import React, { useState } from 'react';
import { X, CheckCircle, AlertCircle } from 'lucide-react';
import { MantenimientoRegistro, EstadoConservacion, EstadoOperativo } from '@/types';
import { mantenimientoRepository } from '@/repositories';
import { useAuth } from '@/hooks';

interface ModalCerrarMantenimientoProps {
  mantenimiento: MantenimientoRegistro;
  onClose: () => void;
  onSuccess: () => void;
}

export const ModalCerrarMantenimiento: React.FC<ModalCerrarMantenimientoProps> = ({
  mantenimiento,
  onClose,
  onSuccess,
}) => {
  const { user } = useAuth();

  const [fechaFin, setFechaFin] = useState(new Date().toISOString().slice(0, 10));
  const [trabajoRealizado, setTrabajoRealizado] = useState('');
  const [repuestos, setRepuestos] = useState('');
  const [estadoOperativoResultante, setEstadoOperativoResultante] =
    useState<EstadoOperativo>('OPERATIVO');
  const [estadoConservacionResultante, setEstadoConservacionResultante] =
    useState<EstadoConservacion>(mantenimiento.estado_conservacion_resultante || 'B');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!trabajoRealizado.trim()) {
      setError('Debe detallar el trabajo técnico realizado o solución aplicada.');
      return;
    }

    setLoading(true);
    setError(null);

    const operador = user ? { uid: user.uid, email: user.email || '' } : undefined;

    try {
      await mantenimientoRepository.cerrarMantenimiento(
        mantenimiento.id,
        {
          fechaFin,
          trabajoRealizado: trabajoRealizado.trim(),
          repuestos: repuestos.trim(),
          estadoOperativoResultante,
          estadoConservacionResultante,
        },
        operador
      );

      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Error al finalizar orden de mantenimiento.');
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
            <div className="p-2 bg-emerald-600 rounded-xl text-white">
              <CheckCircle className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">
                Finalizar Atención / Cerrar Mantenimiento
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Actualiza el estado operativo y de conservación del bien
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
          {/* Tarjeta de Datos del Equipo en Mantenimiento */}
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 space-y-1">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-900 text-sm">
                {mantenimiento.denominacion} — {mantenimiento.marca} {mantenimiento.modelo}
              </span>
              <span className="px-2 py-0.5 bg-amber-100 text-amber-800 font-bold rounded text-[10px]">
                {mantenimiento.tipo}
              </span>
            </div>
            <p className="font-mono text-[11px] text-slate-500">
              Patrimonial: {mantenimiento.codigo_patrimonial} | Serie: {mantenimiento.serie} | Etq:{' '}
              {mantenimiento.etiqueta_interna || 'S/E'}
            </p>
            <p className="text-[11px] text-slate-600 pt-1 border-t border-slate-200">
              <strong>Diagnóstico inicial:</strong> {mantenimiento.descripcion_falla}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Fecha de Finalización *
              </label>
              <input
                type="date"
                required
                value={fechaFin}
                onChange={(e) => setFechaFin(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Estado Operativo Resultante *
              </label>
              <select
                value={estadoOperativoResultante}
                onChange={(e) => setEstadoOperativoResultante(e.target.value as EstadoOperativo)}
                className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-bold text-emerald-800"
              >
                <option value="OPERATIVO">OPERATIVO (Disponible para uso y préstamo)</option>
                <option value="INOPERATIVO">INOPERATIVO (Equipo no reparable / en espera)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Estado de Conservación Actualizado *
            </label>
            <select
              value={estadoConservacionResultante}
              onChange={(e) => setEstadoConservacionResultante(e.target.value as EstadoConservacion)}
              className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-semibold"
            >
              <option value="B">Bueno (B) — En óptimas condiciones</option>
              <option value="R">Regular (R) — Operativo con desgaste o detalles menores</option>
              <option value="M">Malo (M) — Deteriorado o con fallas operativas</option>
              <option value="N">Nuevo (N) — Impecable / Componentes nuevos</option>
            </select>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Solución Aplicada / Trabajo Realizado *
            </label>
            <textarea
              required
              rows={3}
              value={trabajoRealizado}
              onChange={(e) => setTrabajoRealizado(e.target.value)}
              placeholder="Detalle de trabajos ejecutados: formateo, cambio de pasta térmica, soldadura, limpieza de contactos..."
              className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Repuestos Utilizados / Observaciones Finales (Opcional)
            </label>
            <input
              type="text"
              value={repuestos}
              onChange={(e) => setRepuestos(e.target.value)}
              placeholder="Ej. Disco SSD 240GB Kingston, Fuente 500W, Cable de poder..."
              className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
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
              disabled={loading}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs rounded-lg shadow-sm transition-colors flex items-center space-x-1.5"
            >
              <CheckCircle className="w-4 h-4" />
              <span>{loading ? 'Cerrando orden...' : 'Finalizar y Guardar Atención'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
