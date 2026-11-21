import React, { useState, useEffect } from 'react';
import {
  X,
  RotateCcw,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  User,
  BookOpen,
  MapPin,
  Laptop,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';
import { Prestamo, Bien, EstadoOperativoBien, EstadoConservacionBien } from '@/types';
import { prestamoRepository } from '@/repositories';
import { useAuth } from '@/context/AuthContext';

interface ModalDevolucionPrestamoProps {
  isOpen: boolean;
  onClose: () => void;
  prestamo: Prestamo | null;
  bienesDelPrestamo: Bien[];
  onDevolucionExitosa: () => void;
}

interface EstadoEquipoRetorno {
  bien_id: string;
  estadoOperativo: EstadoOperativoBien;
  estadoConservacion: EstadoConservacionBien;
  tieneIncidencia: boolean;
  detalleIncidencia: string;
}

export const ModalDevolucionPrestamo: React.FC<ModalDevolucionPrestamoProps> = ({
  isOpen,
  onClose,
  prestamo,
  bienesDelPrestamo,
  onDevolucionExitosa,
}) => {
  const { perfil } = useAuth();
  const [observacionGeneral, setObservacionGeneral] = useState('');
  const [estadosEquipos, setEstadosEquipos] = useState<Record<string, EstadoEquipoRetorno>>({});
  const [guardando, setGuardando] = useState(false);
  const [errorValidacion, setErrorValidacion] = useState<string | null>(null);

  useEffect(() => {
    if (prestamo && bienesDelPrestamo.length > 0) {
      const inicial: Record<string, EstadoEquipoRetorno> = {};
      bienesDelPrestamo.forEach((bien) => {
        inicial[bien.id] = {
          bien_id: bien.id,
          estadoOperativo: 'OPERATIVO',
          estadoConservacion: bien.estado_conservacion || 'B',
          tieneIncidencia: false,
          detalleIncidencia: '',
        };
      });
      setEstadosEquipos(inicial);
      setObservacionGeneral('');
      setErrorValidacion(null);
    }
  }, [prestamo, bienesDelPrestamo]);

  if (!isOpen || !prestamo) return null;

  const toggleIncidencia = (bienId: string, tieneIncidencia: boolean) => {
    setEstadosEquipos((prev) => ({
      ...prev,
      [bienId]: {
        ...prev[bienId],
        tieneIncidencia,
        estadoOperativo: tieneIncidencia ? 'EN_MANTENIMIENTO' : 'OPERATIVO',
      },
    }));
  };

  const handleCambioEstadoOperativo = (bienId: string, estado: EstadoOperativoBien) => {
    setEstadosEquipos((prev) => ({
      ...prev,
      [bienId]: {
        ...prev[bienId],
        estadoOperativo: estado,
        tieneIncidencia: estado !== 'OPERATIVO',
      },
    }));
  };

  const handleCambioConservacion = (bienId: string, conservacion: EstadoConservacionBien) => {
    setEstadosEquipos((prev) => ({
      ...prev,
      [bienId]: {
        ...prev[bienId],
        estadoConservacion: conservacion,
      },
    }));
  };

  const handleCambioDetalle = (bienId: string, detalle: string) => {
    setEstadosEquipos((prev) => ({
      ...prev,
      [bienId]: {
        ...prev[bienId],
        detalleIncidencia: detalle,
      },
    }));
  };

  const hayAlgunaIncidencia = Object.values(estadosEquipos).some(
    (e) => e.tieneIncidencia || e.estadoOperativo !== 'OPERATIVO'
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorValidacion(null);

    // Validar si algún equipo marcado con incidencia carece de detalle
    for (const eq of Object.values(estadosEquipos)) {
      if (eq.tieneIncidencia && !eq.detalleIncidencia.trim() && !observacionGeneral.trim()) {
        const bien = bienesDelPrestamo.find((b) => b.id === eq.bien_id);
        setErrorValidacion(
          `Por favor, describe la incidencia o falla técnica del equipo ${bien?.etiqueta_interna || ''}`
        );
        return;
      }
    }

    try {
      setGuardando(true);

      const operadorInfo = perfil
        ? { uid: perfil.uid, email: perfil.email, rol: perfil.rol, nombre: perfil.nombres }
        : undefined;

      const equiposRetorno = Object.values(estadosEquipos).map((eq) => ({
        bien_id: eq.bien_id,
        estadoOperativo: eq.estadoOperativo,
        estadoConservacion: eq.estadoConservacion,
      }));

      // Si hay incidencias individuales, concatenarlas a la observación general
      const notasIncidencias = Object.values(estadosEquipos)
        .filter((eq) => eq.tieneIncidencia && eq.detalleIncidencia.trim())
        .map((eq) => {
          const bien = bienesDelPrestamo.find((b) => b.id === eq.bien_id);
          return `[${bien?.etiqueta_interna}]: ${eq.detalleIncidencia.trim()}`;
        })
        .join('; ');

      const observacionFinal = [observacionGeneral.trim(), notasIncidencias]
        .filter(Boolean)
        .join(' | ');

      await prestamoRepository.registrarDevolucion(
        prestamo.id,
        {
          estado: hayAlgunaIncidencia ? 'CON_INCIDENCIA' : 'DEVUELTO',
          observacion: observacionFinal,
          equiposRetorno,
        },
        operadorInfo
      );

      onDevolucionExitosa();
      onClose();
    } catch (err: any) {
      console.error('Error al registrar devolución:', err);
      setErrorValidacion(err.message || 'Error al registrar la devolución en el servidor.');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col my-6">
        {/* Encabezado */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-indigo-500/20 text-indigo-400 rounded-lg">
              <RotateCcw className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-base">Registrar Retorno de Préstamo</h3>
              <p className="text-xs text-slate-400">Verificación y reingreso de equipos al AIP</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Ficha Resumen del Préstamo */}
        <div className="p-5 bg-slate-50 border-b border-slate-200">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            <div className="bg-white p-2.5 rounded-lg border border-slate-200">
              <div className="flex items-center space-x-1.5 text-slate-500 mb-1">
                <User className="w-3.5 h-3.5 text-indigo-600" />
                <span className="font-medium">Docente</span>
              </div>
              <p className="font-semibold text-slate-800 truncate">{prestamo.docente_nombre}</p>
            </div>

            <div className="bg-white p-2.5 rounded-lg border border-slate-200">
              <div className="flex items-center space-x-1.5 text-slate-500 mb-1">
                <BookOpen className="w-3.5 h-3.5 text-indigo-600" />
                <span className="font-medium">Área / Grado</span>
              </div>
              <p className="font-semibold text-slate-800 truncate">
                {prestamo.area_nombre} ({prestamo.grado_seccion})
              </p>
            </div>

            <div className="bg-white p-2.5 rounded-lg border border-slate-200">
              <div className="flex items-center space-x-1.5 text-slate-500 mb-1">
                <MapPin className="w-3.5 h-3.5 text-indigo-600" />
                <span className="font-medium">Ambiente de Uso</span>
              </div>
              <p className="font-semibold text-slate-800 truncate">{prestamo.ambiente_uso}</p>
            </div>

            <div className="bg-white p-2.5 rounded-lg border border-slate-200">
              <div className="flex items-center space-x-1.5 text-slate-500 mb-1">
                <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                <span className="font-medium">Salida</span>
              </div>
              <p className="font-semibold text-slate-800 truncate">
                {new Date(prestamo.fecha_salida).toLocaleDateString('es-PE', {
                  day: '2-digit',
                  month: 'short',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
            </div>
          </div>

          {prestamo.accesorios_entregados && (
            <div className="mt-2.5 px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-xs flex items-center space-x-2">
              <HelpCircle className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
              <span>
                <b>Accesorios entregados:</b> {prestamo.accesorios_entregados} (Verificar que retornen completos).
              </span>
            </div>
          )}
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto max-h-[60vh]">
          {errorValidacion && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-600" />
              <span>{errorValidacion}</span>
            </div>
          )}

          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-semibold text-slate-800 flex items-center space-x-2">
                <Laptop className="w-4 h-4 text-slate-600" />
                <span>Verificación de Equipos ({bienesDelPrestamo.length} en total)</span>
              </label>
              <span className="text-xs text-slate-500">
                Por defecto todos retornan en condición <b>OPERATIVO</b>
              </span>
            </div>

            <div className="space-y-3">
              {bienesDelPrestamo.map((bien) => {
                const estado = estadosEquipos[bien.id];
                if (!estado) return null;

                return (
                  <div
                    key={bien.id}
                    className={`p-3.5 rounded-xl border transition-all ${
                      estado.tieneIncidencia
                        ? 'bg-rose-50/50 border-rose-300'
                        : 'bg-white border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center space-x-3">
                        <span className="px-2.5 py-1 bg-slate-100 text-slate-800 font-bold font-mono text-xs rounded-md border border-slate-300">
                          {bien.etiqueta_interna}
                        </span>
                        <div>
                          <p className="text-xs font-semibold text-slate-900 leading-tight">
                            {bien.denominacion}
                          </p>
                          <p className="text-[11px] text-slate-500">
                            Serie: {bien.serie || bien.numero_serie || 'S/N'} | Cód. Pat: {bien.codigo_patrimonial || 'S/C'}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2 self-end sm:self-auto">
                        {/* Selector de conservación */}
                        <select
                          value={estado.estadoConservacion}
                          onChange={(e) =>
                            handleCambioConservacion(bien.id, e.target.value as EstadoConservacionBien)
                          }
                          className="text-xs px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          title="Estado de conservación"
                        >
                          <option value="B">Bueno (B)</option>
                          <option value="R">Regular (R)</option>
                          <option value="M">Malo (M)</option>
                        </select>

                        {/* Botón switch Conforme / Reportar Daño */}
                        <button
                          type="button"
                          onClick={() => toggleIncidencia(bien.id, !estado.tieneIncidencia)}
                          className={`text-xs px-2.5 py-1 rounded-lg font-medium flex items-center space-x-1 transition-colors ${
                            estado.tieneIncidencia
                              ? 'bg-rose-600 text-white hover:bg-rose-700'
                              : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                          }`}
                        >
                          {estado.tieneIncidencia ? (
                            <>
                              <AlertTriangle className="w-3.5 h-3.5" />
                              <span>Incidencia Reportada</span>
                            </>
                          ) : (
                            <>
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              <span>Conforme</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Si reporta incidencia, mostrar opciones y descripción */}
                    {estado.tieneIncidencia && (
                      <div className="mt-3 pt-3 border-t border-rose-200 grid grid-cols-1 sm:grid-cols-3 gap-2.5 animate-fade-in">
                        <div>
                          <label className="text-[11px] font-semibold text-rose-900 block mb-1">
                            Nuevo Estado Operativo *
                          </label>
                          <select
                            value={estado.estadoOperativo}
                            onChange={(e) =>
                              handleCambioEstadoOperativo(bien.id, e.target.value as EstadoOperativoBien)
                            }
                            className="w-full text-xs px-2 py-1.5 bg-white border border-rose-300 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500"
                          >
                            <option value="EN_MANTENIMIENTO">EN MANTENIMIENTO (Taller)</option>
                            <option value="INOPERATIVO">INOPERATIVO (Dañado severo)</option>
                          </select>
                        </div>

                        <div className="sm:col-span-2">
                          <label className="text-[11px] font-semibold text-rose-900 block mb-1">
                            Falla detectada o detalle de incidencia *
                          </label>
                          <input
                            type="text"
                            value={estado.detalleIncidencia}
                            onChange={(e) => handleCambioDetalle(bien.id, e.target.value)}
                            placeholder="Ej. Pantalla rota, cargador extraviado, no enciende..."
                            className="w-full text-xs px-3 py-1.5 bg-white border border-rose-300 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500 placeholder-slate-400"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Observación General de Cierre */}
          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1.5">
              Observaciones Generales de la Devolución (Opcional)
            </label>
            <textarea
              rows={2}
              value={observacionGeneral}
              onChange={(e) => setObservacionGeneral(e.target.value)}
              placeholder="Notas generales sobre la devolución, puntualidad del docente, estado del ambiente, etc."
              className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Resumen del Estado Global */}
          <div
            className={`p-3 rounded-xl border flex items-center justify-between text-xs ${
              hayAlgunaIncidencia
                ? 'bg-amber-50 border-amber-200 text-amber-900'
                : 'bg-emerald-50 border-emerald-200 text-emerald-900'
            }`}
          >
            <div className="flex items-center space-x-2">
              {hayAlgunaIncidencia ? (
                <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
              ) : (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              )}
              <span className="font-semibold">
                Estado resultante del préstamo:{' '}
                {hayAlgunaIncidencia ? 'CON INCIDENCIA' : 'DEVUELTO CONFORME'}
              </span>
            </div>
            <span className="text-[11px] opacity-80">
              {hayAlgunaIncidencia
                ? 'Los equipos dañados se marcarán automáticamente para mantenimiento'
                : 'Todos los equipos volverán a estar disponibles'}
            </span>
          </div>

          {/* Botones de acción */}
          <div className="pt-3 border-t border-slate-200 flex items-center justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              disabled={guardando}
              className="px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={guardando}
              className={`px-5 py-2 text-xs font-semibold text-white rounded-xl shadow-md transition-all flex items-center space-x-2 ${
                hayAlgunaIncidencia
                  ? 'bg-amber-600 hover:bg-amber-700'
                  : 'bg-emerald-600 hover:bg-emerald-700'
              }`}
            >
              <RotateCcw className={`w-4 h-4 ${guardando ? 'animate-spin' : ''}`} />
              <span>{guardando ? 'Registrando...' : 'Confirmar Devolución'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};