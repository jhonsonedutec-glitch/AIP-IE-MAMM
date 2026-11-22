import React, { useState } from 'react';
import {
  AlertTriangle,
  X,
  Trash2,
  CheckCircle2,
  ShieldAlert,
  Info,
} from 'lucide-react';
import { BienPatrimonial, Ambiente, GrupoDuplicado } from '@/types';
import { bienRepository } from '@/repositories';
import { useAuth } from '@/hooks';

interface ModalLimpiezaDuplicadosProps {
  isOpen: boolean;
  onClose: () => void;
  grupos: GrupoDuplicado[];
  ambientes: Ambiente[];
  onDuplicadoResuelto: () => Promise<void>;
}

export const ModalLimpiezaDuplicados: React.FC<ModalLimpiezaDuplicadosProps> = ({
  isOpen,
  onClose,
  grupos,
  ambientes,
  onDuplicadoResuelto,
}) => {
  const { user } = useAuth();
  const [procesandoId, setProcesandoId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ tipo: 'ok' | 'err'; msg: string } | null>(null);

  if (!isOpen) return null;

  const getNombreAmbiente = (ambienteId?: string) => {
    return ambientes.find((a) => a.id === ambienteId)?.nombre || 'Ambiente no asignado';
  };

  const handleDarDeBajaDuplicado = async (
    bienAEliminar: BienPatrimonial,
    bienAConservar: BienPatrimonial
  ) => {
    // 1. Bloqueo estricto si el equipo está en préstamo activo
    if (bienAEliminar.estado_operativo === 'PRESTADO') {
      alert(
        `Acción bloqueada: El equipo ${bienAEliminar.etiqueta_interna || bienAEliminar.codigo_patrimonial} se encuentra actualmente en estado PRESTADO.\n\nPara darlo de baja, primero debe registrar su devolución formal en el módulo de Préstamos QR.`
      );
      return;
    }

    const confirmar = window.confirm(
      `¿Confirmas dar de baja el registro duplicado "${bienAEliminar.etiqueta_interna || bienAEliminar.codigo_patrimonial}" (${bienAEliminar.denominacion})?\n\nSe conservará el registro activo: "${bienAConservar.etiqueta_interna || bienAConservar.codigo_patrimonial}".`
    );

    if (!confirmar) return;

    setProcesandoId(bienAEliminar.id);
    setFeedback(null);

    try {
      const operador = user ? { uid: user.uid, email: user.email || '' } : undefined;
      const motivo = `Depuración de duplicado: Desactivado en favor del registro ${bienAConservar.etiqueta_interna || bienAConservar.id}`;

      // Soft-delete según reglas firestore.rules
      await bienRepository.darDeBaja(bienAEliminar.id, motivo, operador);
      await onDuplicadoResuelto();

      setFeedback({
        tipo: 'ok',
        msg: `Registro duplicado ${bienAEliminar.etiqueta_interna || bienAEliminar.id} dado de baja exitosamente.`,
      });
    } catch (err: any) {
      console.error('Error al depurar duplicado:', err);
      setFeedback({
        tipo: 'err',
        msg: err.message || 'Error al dar de baja el registro duplicado.',
      });
    } finally {
      setProcesandoId(null);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full border border-slate-200 overflow-hidden my-6 flex flex-col max-h-[90vh]">
        {/* Cabecera */}
        <div className="bg-slate-900 text-white p-5 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-amber-500 rounded-xl text-white">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">
                Herramienta de Depuración y Resolución de Duplicados
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Compara los registros activos en conflicto y selecciona cuál conservar con soft-delete conforme a auditoría
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Feedback Alert */}
        {feedback && (
          <div
            className={`p-3.5 px-6 text-xs flex items-center justify-between shrink-0 ${
              feedback.tipo === 'ok'
                ? 'bg-emerald-50 text-emerald-800 border-b border-emerald-200'
                : 'bg-rose-50 text-rose-800 border-b border-rose-200'
            }`}
          >
            <div className="flex items-center space-x-2">
              {feedback.tipo === 'ok' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              )}
              <span className="font-semibold">{feedback.msg}</span>
            </div>
            <button
              type="button"
              onClick={() => setFeedback(null)}
              className="text-slate-400 hover:text-slate-700"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Contenido Principal */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
          {grupos.length === 0 ? (
            <div className="p-12 text-center text-slate-500">
              <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
              <h3 className="text-base font-bold text-slate-800">
                ¡Inventario limpio de duplicados!
              </h3>
              <p className="text-slate-400 mt-1 max-w-md mx-auto text-xs">
                No se detectaron bienes activos con códigos patrimoniales ni números de serie repetidos.
              </p>
              <button
                type="button"
                onClick={onClose}
                className="mt-5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-xl"
              >
                Cerrar ventana
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs flex items-start space-x-2">
                <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <p>
                  Para cada grupo en conflicto, pulsa <strong>&quot;Dar de baja este duplicado&quot;</strong> en el registro prescindible o ingresado por error. El registro seleccionado se desactivará lógicamente en Firestore manteniendo el historial y trazabilidad institucional.
                </p>
              </div>

              {grupos.map((g, idxGrupo) => (
                <div
                  key={g.id}
                  className="bg-slate-50/80 rounded-2xl border border-slate-200 p-4 space-y-3"
                >
                  {/* Encabezado del Grupo */}
                  <div className="flex items-center justify-between border-b border-slate-200 pb-2.5 flex-wrap gap-2">
                    <div className="flex items-center space-x-2">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                        Grupo #{idxGrupo + 1}
                      </span>
                      <span className="font-mono font-bold text-slate-800 text-xs">
                        {g.clave}
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-500 font-medium">
                      {g.bienes.length} registros en conflicto
                    </span>
                  </div>

                  {/* Comparación lado a lado */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {g.bienes.map((bien) => {
                      const esPrestado = bien.estado_operativo === 'PRESTADO';
                      const otroBien = g.bienes.find((b) => b.id !== bien.id) || bien;

                      return (
                        <div
                          key={bien.id}
                          className="bg-white rounded-xl border border-slate-200 p-3.5 flex flex-col justify-between shadow-2xs hover:border-slate-300 transition-all space-y-3"
                        >
                          <div>
                            {/* Cabecera del bien */}
                            <div className="flex items-center justify-between mb-2">
                              <span className="font-mono font-semibold text-slate-800 bg-slate-100 px-2 py-0.5 rounded border border-slate-300 text-[11px]">
                                {bien.etiqueta_interna || 'S/E'}
                              </span>

                              <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-white border border-slate-200 text-slate-700 shadow-2xs">
                                <span
                                  className={`w-1.5 h-1.5 rounded-full inline-block shrink-0 ${
                                    bien.estado_operativo === 'OPERATIVO'
                                      ? 'bg-emerald-500'
                                      : bien.estado_operativo === 'PRESTADO'
                                      ? 'bg-blue-500'
                                      : bien.estado_operativo === 'EN_MANTENIMIENTO'
                                      ? 'bg-amber-500'
                                      : 'bg-rose-500'
                                  }`}
                                />
                                <span>{bien.estado_operativo}</span>
                              </span>
                            </div>

                            {/* Ficha técnica resumida */}
                            <h4 className="font-bold text-slate-900 text-xs truncate">
                              {bien.denominacion}
                            </h4>
                            <p className="text-slate-500 text-[11px] truncate mb-2">
                              {bien.marca} {bien.modelo ? `— ${bien.modelo}` : ''}
                            </p>

                            <div className="space-y-1 bg-slate-50 p-2 rounded-lg border border-slate-100 font-mono text-[11px] text-slate-700">
                              <div className="flex justify-between">
                                <span className="text-slate-400 font-sans">Cód. Pat:</span>
                                <span className="font-bold text-slate-900">
                                  {bien.codigo_patrimonial || 'S/C'}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-slate-400 font-sans">N° Serie:</span>
                                <span className="font-bold text-slate-900">
                                  {bien.serie || 'S/N'}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-slate-400 font-sans">Ambiente:</span>
                                <span className="font-sans font-medium text-slate-800 truncate max-w-[150px]">
                                  {getNombreAmbiente(bien.ambiente_id)}
                                </span>
                              </div>
                              {bien.lote_etiqueta && (
                                <div className="flex justify-between items-center pt-0.5">
                                  <span className="text-slate-400 font-sans">Lote:</span>
                                  <span
                                    className="px-1.5 py-0.2 rounded text-[9px] font-bold text-white uppercase tracking-wider"
                                    style={{ backgroundColor: bien.lote_color || '#475569' }}
                                  >
                                    {bien.lote_etiqueta}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Acciones de resolución */}
                          <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                            {esPrestado ? (
                              <div className="w-full text-[10px] text-amber-800 bg-amber-50 border border-amber-200 p-2 rounded-lg font-medium">
                                ⚠ Equipo en préstamo activo. No se puede dar de baja sin registrar su devolución previa en Préstamos QR.
                              </div>
                            ) : (
                              <button
                                type="button"
                                disabled={procesandoId !== null}
                                onClick={() => handleDarDeBajaDuplicado(bien, otroBien)}
                                className="w-full px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold border border-rose-200 rounded-lg transition-colors flex items-center justify-center space-x-1.5 disabled:opacity-50"
                                title={`Dar de baja ${bien.etiqueta_interna || bien.id} y conservar el otro registro`}
                              >
                                <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                                <span>
                                  {procesandoId === bien.id
                                    ? 'Procesando...'
                                    : 'Dar de baja este duplicado'}
                                </span>
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pie */}
        <div className="bg-slate-50 border-t border-slate-200 p-4 px-6 flex items-center justify-between shrink-0">
          <span className="text-[11px] text-slate-500 font-medium">
            Las bajas se procesan como soft-delete con motivo registrado en auditoría.
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold text-xs rounded-xl transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
