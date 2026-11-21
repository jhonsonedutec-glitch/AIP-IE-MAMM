import React, { useState } from 'react';
import { X, ArrowLeftRight, Search, AlertCircle, CheckSquare, Square } from 'lucide-react';
import { BienPatrimonial, Ambiente, MovimientoBien } from '@/types';
import { movimientoRepository } from '@/repositories';
import { useAuth } from '@/hooks';

interface ModalTrasladoProps {
  bienesPreseleccionados?: BienPatrimonial[];
  todosBienes: BienPatrimonial[];
  ambientes: Ambiente[];
  onClose: () => void;
  onSuccess: (resultado: {
    loteId: string;
    totalMovimientos: number;
    movimientos: MovimientoBien[];
  }) => void;
}

export const ModalTraslado: React.FC<ModalTrasladoProps> = ({
  bienesPreseleccionados = [],
  todosBienes,
  ambientes,
  onClose,
  onSuccess,
}) => {
  const { user, perfil } = useAuth();

  // Filtrar bienes activos que no estén dados de baja
  const bienesDisponibles = todosBienes.filter((b) => b.estado_operativo !== 'DE_BAJA');

  const [seleccionadosIds, setSeleccionadosIds] = useState<string[]>(
    bienesPreseleccionados.map((b) => b.id)
  );

  const [busqueda, setBusqueda] = useState('');
  const [ambienteDestinoId, setAmbienteDestinoId] = useState<string>(
    ambientes[0]?.id || ''
  );
  const [ubicacionDetalle, setUbicacionDetalle] = useState('');
  const [motivo, setMotivo] = useState('Reasignación de recursos tecnológicos para soporte pedagógico');
  const [responsableReceptor, setResponsableReceptor] = useState('');
  const [responsableEntrega, setResponsableEntrega] = useState(
    perfil?.nombres || user?.email || 'Responsable AIP'
  );

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Detectar si el destino seleccionado es "Otros"
  const destinoSeleccionado = ambientes.find((a) => a.id === ambienteDestinoId);
  const esDestinoOtros = destinoSeleccionado?.nombre.trim().toLowerCase() === 'otros';

  // Bienes filtrados por búsqueda
  const bienesFiltrados = bienesDisponibles.filter((b) => {
    if (!busqueda.trim()) return true;
    const term = busqueda.toLowerCase().trim();
    return (
      b.denominacion.toLowerCase().includes(term) ||
      b.codigo_patrimonial.toLowerCase().includes(term) ||
      (b.etiqueta_interna && b.etiqueta_interna.toLowerCase().includes(term)) ||
      b.serie.toLowerCase().includes(term) ||
      b.marca.toLowerCase().includes(term) ||
      b.modelo.toLowerCase().includes(term)
    );
  });

  const toggleSeleccion = (id: string) => {
    setSeleccionadosIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const seleccionarTodosFiltrados = () => {
    const ids = bienesFiltrados.map((b) => b.id);
    const todosYa = ids.every((id) => seleccionadosIds.includes(id));
    if (todosYa) {
      setSeleccionadosIds((prev) => prev.filter((id) => !ids.includes(id)));
    } else {
      setSeleccionadosIds((prev) => Array.from(new Set([...prev, ...ids])));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (seleccionadosIds.length === 0) {
      setError('Debe seleccionar al menos un equipo para realizar el traslado.');
      return;
    }
    if (!ambienteDestinoId) {
      setError('Debe seleccionar un ambiente de destino.');
      return;
    }
    if (esDestinoOtros && !ubicacionDetalle.trim()) {
      setError('Al trasladar al ambiente Otros, debe especificar la ubicación o área de destino.');
      return;
    }
    if (!motivo.trim()) {
      setError('El motivo del traslado es obligatorio.');
      return;
    }
    if (!responsableReceptor.trim()) {
      setError('Debe indicar el nombre del responsable que recibe los equipos.');
      return;
    }

    setLoading(true);
    setError(null);

    const operador = user ? { uid: user.uid, email: user.email || '' } : undefined;

    try {
      const res = await movimientoRepository.registrarTrasladoMasivo(
        seleccionadosIds,
        ambienteDestinoId,
        ubicacionDetalle.trim(),
        motivo.trim(),
        responsableReceptor.trim(),
        responsableEntrega.trim(),
        operador
      );

      // Cargar los movimientos generados para poder mostrar el acta de inmediato
      const todosMovs = await movimientoRepository.listar();
      const movsDelLote = todosMovs.filter((m) => m.lote_id === res.loteId);

      onSuccess({
        loteId: res.loteId,
        totalMovimientos: res.totalMovimientos,
        movimientos: movsDelLote.length > 0 ? movsDelLote : todosMovs.slice(0, seleccionadosIds.length),
      });
    } catch (err: any) {
      setError(err.message || 'Error al ejecutar el traslado de equipos.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full border border-slate-200 overflow-hidden my-6 flex flex-col max-h-[92vh]">
        {/* Encabezado */}
        <div className="bg-slate-900 text-white p-5 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-emerald-600 rounded-xl text-white">
              <ArrowLeftRight className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">
                Registrar Traslado de Equipos entre Ambientes
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Genera constancia atómica en el historial y Acta Oficial de Entrega
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
          <div className="m-5 mb-0 p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-start space-x-2 text-rose-800 text-xs shrink-0">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <span className="font-medium leading-relaxed">{error}</span>
          </div>
        )}

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1 text-xs">
          {/* Parámetros de Destino */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Ambiente de Destino *
              </label>
              <select
                required
                value={ambienteDestinoId}
                onChange={(e) => setAmbienteDestinoId(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
              >
                {ambientes.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.nombre} {a.encargado ? `(Encargado: ${a.encargado})` : ''}
                  </option>
                ))}
              </select>
            </div>

            {esDestinoOtros ? (
              <div>
                <label className="block font-semibold text-emerald-800 mb-1">
                  Especificar Destino / Área *
                </label>
                <input
                  type="text"
                  required
                  value={ubicacionDetalle}
                  onChange={(e) => setUbicacionDetalle(e.target.value.toUpperCase())}
                  placeholder="Ej. Biblioteca, Dirección, Laboratorio..."
                  className="w-full px-3 py-2 text-sm bg-white border border-emerald-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                />
              </div>
            ) : (
              <div className="flex items-center text-slate-500 text-xs pt-6">
                <span>
                  Los equipos seleccionados pasarán a la custodia del ambiente{' '}
                  <strong className="text-slate-800">{destinoSeleccionado?.nombre}</strong>.
                </span>
              </div>
            )}

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Responsable que Entrega
              </label>
              <input
                type="text"
                required
                value={responsableEntrega}
                onChange={(e) => setResponsableEntrega(e.target.value)}
                placeholder="Nombre de quien entrega (AIP)"
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Responsable que Recibe *
              </label>
              <input
                type="text"
                required
                value={responsableReceptor}
                onChange={(e) => setResponsableReceptor(e.target.value)}
                placeholder="Nombre del docente o encargado que recibe"
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block font-semibold text-slate-700 mb-1">
                Motivo / Justificación del Traslado *
              </label>
              <input
                type="text"
                required
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                placeholder="Ej. Reasignación temporal para reforzamiento escolar, clase abierta..."
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* Selector de Equipos */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <span className="font-semibold text-slate-800">
                  Seleccionar Equipos a Trasladar
                </span>
                <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 font-bold rounded-full text-[11px]">
                  {seleccionadosIds.length} seleccionado(s)
                </span>
              </div>
              <button
                type="button"
                onClick={seleccionarTodosFiltrados}
                className="text-xs text-emerald-700 hover:text-emerald-900 font-semibold flex items-center space-x-1"
              >
                <span>Invertir / Seleccionar visibles</span>
              </button>
            </div>

            {/* Buscador Rápido de Equipos */}
            <div className="relative mb-2">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Filtrar por código patrimonial, serie, etiqueta, denominación o marca..."
                className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            {/* Lista con Selección de Bienes */}
            <div className="border border-slate-200 rounded-xl max-h-56 overflow-y-auto divide-y divide-slate-100 bg-white">
              {bienesFiltrados.length === 0 ? (
                <div className="p-4 text-center text-slate-400 text-xs">
                  No se encontraron equipos disponibles con ese criterio.
                </div>
              ) : (
                bienesFiltrados.map((b) => {
                  const seleccionado = seleccionadosIds.includes(b.id);
                  const ambActual =
                    ambientes.find((a) => a.id === b.ambiente_id)?.nombre || 'Sin ambiente';

                  return (
                    <div
                      key={b.id}
                      onClick={() => toggleSeleccion(b.id)}
                      className={`p-2.5 flex items-center justify-between hover:bg-slate-50 cursor-pointer transition-colors ${
                        seleccionado ? 'bg-emerald-50/60' : ''
                      }`}
                    >
                      <div className="flex items-center space-x-3 min-w-0">
                        {seleccionado ? (
                          <CheckSquare className="w-4 h-4 text-emerald-600 shrink-0" />
                        ) : (
                          <Square className="w-4 h-4 text-slate-300 shrink-0" />
                        )}
                        <div className="min-w-0">
                          <p className="font-semibold text-slate-800 truncate">
                            {b.denominacion} — {b.marca} {b.modelo}
                          </p>
                          <p className="text-[11px] text-slate-500 font-mono">
                            Patr: {b.codigo_patrimonial} | Serie: {b.serie} | Etq:{' '}
                            <span className="text-emerald-700 font-bold">
                              {b.etiqueta_interna || 'S/E'}
                            </span>
                          </p>
                        </div>
                      </div>
                      <div className="text-right shrink-0 ml-3">
                        <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full border border-slate-200">
                          {ambActual}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Acciones */}
          <div className="pt-3 border-t border-slate-200 flex items-center justify-end space-x-3">
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
              disabled={loading || seleccionadosIds.length === 0}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-300 text-white font-semibold text-xs rounded-lg shadow-sm transition-colors flex items-center space-x-1.5"
            >
              <ArrowLeftRight className="w-4 h-4" />
              <span>
                {loading
                  ? 'Ejecutando traslado...'
                  : `Confirmar Traslado (${seleccionadosIds.length})`}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
