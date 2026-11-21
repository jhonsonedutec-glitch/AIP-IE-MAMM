import React, { useState } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { BienPatrimonial } from '@/types';
import { bienRepository } from '@/repositories';
import { useAuth } from '@/hooks';

interface BajaBienModalProps {
  bien: BienPatrimonial;
  onClose: () => void;
  onSuccess: () => void;
}

export const BajaBienModal: React.FC<BajaBienModalProps> = ({
  bien,
  onClose,
  onSuccess,
}) => {
  const { user } = useAuth();
  const [motivo, setMotivo] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!motivo.trim()) {
      setError('Debe especificar un motivo justificatorio obligatorio para la baja.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await bienRepository.darDeBaja(
        bien.id,
        motivo.trim(),
        user ? { uid: user.uid, email: user.email || '' } : undefined
      );
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Error al procesar la baja lógica.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 border border-slate-200">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <h3 className="text-base font-bold text-slate-800 flex items-center space-x-2 text-rose-600">
            <AlertTriangle className="w-5 h-5 shrink-0" />
            <span>Confirmar Baja Lógica de Bien</span>
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="my-4 p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 leading-relaxed">
          <p className="font-semibold text-amber-950 mb-1">
            Principio de Integridad Patrimonial (Sin Borrado Físico)
          </p>
          Este equipo no será eliminado de la base de datos. Pasará al estado operativo{' '}
          <strong>DE BAJA</strong>, conservando su historial, registros de traslados y hoja de vida.
        </div>

        <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs space-y-1 mb-4">
          <p>
            <span className="font-semibold text-slate-700">Denominación:</span>{' '}
            {bien.denominacion}
          </p>
          <p>
            <span className="font-semibold text-slate-700">Código Patrimonial:</span>{' '}
            {bien.codigo_patrimonial}
          </p>
          <p>
            <span className="font-semibold text-slate-700">Etiqueta Interna / QR:</span>{' '}
            {bien.etiqueta_interna || 'S/E'}
          </p>
          <p>
            <span className="font-semibold text-slate-700">Serie:</span>{' '}
            {bien.serie || 'S/N'}
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-xs font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Motivo de la Baja Lógica * (Obligatorio)
            </label>
            <textarea
              required
              rows={3}
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="Ej. Obsolescencia técnica irreparable, daño severo por descarga eléctrica, pérdida justificada con denuncia policial..."
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500 text-slate-800 resize-none"
            />
          </div>

          <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              disabled={loading}
              onClick={onClose}
              className="px-3 py-2 text-slate-600 hover:text-slate-800 font-semibold"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded-lg shadow-sm disabled:opacity-50 transition-colors"
            >
              {loading ? 'Procesando baja...' : 'Confirmar Baja'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
