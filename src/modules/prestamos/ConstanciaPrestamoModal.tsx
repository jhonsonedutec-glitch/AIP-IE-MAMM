import React from 'react';
import { X, Printer, CheckCircle2, AlertTriangle, Clock } from 'lucide-react';
import { Prestamo, Bien, ConfiguracionSistema } from '@/types';

interface ConstanciaPrestamoModalProps {
  isOpen: boolean;
  onClose: () => void;
  prestamo: Prestamo | null;
  bienes: Bien[];
  configuracion: ConfiguracionSistema | null;
}

export const ConstanciaPrestamoModal: React.FC<ConstanciaPrestamoModalProps> = ({
  isOpen,
  onClose,
  prestamo,
  bienes,
  configuracion,
}) => {
  if (!isOpen || !prestamo) return null;

  const dre = configuracion?.dre || 'AMAZONAS';
  const ugel = configuracion?.ugel || 'BAGUA';
  const institucion = configuracion?.nombre_ie || 'I.E. EMBLEMÁTICA MANUEL ANTONIO MESONES MURO';

  const dreTexto = dre.toUpperCase().startsWith('DRE') ? dre.toUpperCase() : `DRE ${dre.toUpperCase()}`;
  const ugelTexto = ugel.toUpperCase().startsWith('UGEL') ? ugel.toUpperCase() : `UGEL ${ugel.toUpperCase()}`;

  const formatearFechaHora = (fecha?: string | Date | null) => {
    if (!fecha) return '—';
    try {
      const d = typeof fecha === 'string' ? new Date(fecha) : fecha;
      return d.toLocaleDateString('es-PE', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return String(fecha);
    }
  };

  const handleImprimir = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in overflow-y-auto">
      {/* Estilos para impresión */}
      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 0;
          }
          body {
            margin: 0;
            padding: 0;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .no-print {
            display: none !important;
          }
          .print-container {
            width: 100% !important;
            max-width: 100% !important;
            box-shadow: none !important;
            border: none !important;
            padding: 14mm !important;
            margin: 0 !important;
          }
          .print-avoid-break {
            page-break-inside: avoid;
          }
        }
      `}</style>

      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[92vh] overflow-y-auto flex flex-col my-4">
        {/* Barra superior de controles (no se imprime) */}
        <div className="no-print flex items-center justify-between px-6 py-4 bg-slate-900 text-white rounded-t-2xl">
          <div className="flex items-center space-x-2.5">
            <Printer className="w-5 h-5 text-indigo-400" />
            <h3 className="font-semibold text-base">Constancia de Préstamo AIP</h3>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={handleImprimir}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs rounded-xl shadow transition-colors flex items-center space-x-2"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimir / Guardar PDF</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Hoja A4 Imprimible */}
        <div className="print-container p-8 md:p-12 text-slate-900 bg-white space-y-6">
          {/* Cabecera Oficial */}
          <div className="border-b-2 border-slate-800 pb-4 flex items-center justify-between gap-4">
            <div className="flex items-center space-x-4">
              <img
                src="/logo-mamm.jpg"
                alt="Insignia MAMM"
                className="w-16 h-16 object-contain flex-shrink-0"
              />
              <div>
                <p className="text-[11px] font-bold tracking-widest text-slate-600 uppercase">
                  {dreTexto} &bull; {ugelTexto}
                </p>
                <h1 className="text-base font-extrabold uppercase text-slate-900 leading-tight">
                  {institucion}
                </h1>
                <p className="text-xs font-semibold text-indigo-900">
                  AULA DE INNOVACIÓN PEDAGÓGICA (AIP) &bull; SISTEMA DE GESTIÓN DE RECURSOS
                </p>
              </div>
            </div>

            <div className="text-right flex-shrink-0">
              <span className="inline-block px-3 py-1 bg-slate-100 border border-slate-300 rounded font-mono text-xs font-bold text-slate-800 whitespace-nowrap">
                N° {prestamo.id.slice(0, 10).toUpperCase()}
              </span>
              <p className="text-[10px] text-slate-500 mt-1">
                Fecha emisión: {new Date().toLocaleDateString('es-PE')}
              </p>
            </div>
          </div>

          {/* Título del documento */}
          <div className="text-center py-1">
            <h2 className="text-sm font-black tracking-wide text-slate-900 uppercase">
              CONSTANCIA OFICIAL DE PRÉSTAMO Y CUSTODIA DE RECURSOS TECNOLÓGICOS
            </h2>
            <p className="text-xs text-slate-500">
              Uso pedagógico exclusivo en sesiones de aprendizaje
            </p>
          </div>

          {/* Estado del préstamo (badge impreso) */}
          <div className="flex items-center justify-between bg-slate-50 border border-slate-200 p-3 rounded-lg text-xs">
            <div className="flex items-center space-x-2">
              <span className="font-bold text-slate-700">Estado del Registro:</span>
              {prestamo.estado === 'ACTIVO' && (
                <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 font-bold text-[11px]">
                  <Clock className="w-3 h-3 text-amber-600" />
                  <span>PRÉSTAMO EN CURSO (ACTIVO)</span>
                </span>
              )}
              {prestamo.estado === 'DEVUELTO' && (
                <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[11px]">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                  <span>DEVUELTO CONFORME</span>
                </span>
              )}
              {prestamo.estado === 'CON_INCIDENCIA' && (
                <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-800 font-bold text-[11px]">
                  <AlertTriangle className="w-3 h-3 text-rose-600" />
                  <span>DEVUELTO CON OBSERVACIONES / DAÑO</span>
                </span>
              )}
            </div>

            <div className="text-right">
              <span className="font-semibold text-slate-700">Tipo de Préstamo: </span>
              <span className="font-bold uppercase text-slate-900">{prestamo.tipo}</span>
            </div>
          </div>

          {/* Datos del Docente y la Sesión */}
          <div className="grid grid-cols-2 gap-x-6 gap-y-2.5 text-xs border border-slate-200 rounded-lg p-4 bg-white">
            <div>
              <span className="font-bold text-slate-600 block text-[10px] uppercase">
                Docente Solicitante:
              </span>
              <span className="font-bold text-slate-900 text-sm">{prestamo.docente_nombre}</span>
            </div>

            <div>
              <span className="font-bold text-slate-600 block text-[10px] uppercase">
                Área Curricular:
              </span>
              <span className="font-semibold text-slate-900">{prestamo.area_nombre}</span>
            </div>

            <div>
              <span className="font-bold text-slate-600 block text-[10px] uppercase">
                Grado y Sección:
              </span>
              <span className="font-semibold text-slate-900">{prestamo.grado_seccion}</span>
            </div>

            <div>
              <span className="font-bold text-slate-600 block text-[10px] uppercase">
                Ambiente de Uso:
              </span>
              <span className="font-semibold text-slate-900">{prestamo.ambiente_uso}</span>
            </div>

            <div>
              <span className="font-bold text-slate-600 block text-[10px] uppercase">
                Fecha / Hora de Entrega:
              </span>
              <span className="font-semibold text-slate-900">
                {formatearFechaHora(prestamo.fecha_salida)}
              </span>
            </div>

            <div>
              <span className="font-bold text-slate-600 block text-[10px] uppercase">
                Fecha / Hora de Retorno:
              </span>
              <span className="font-semibold text-slate-900">
                {prestamo.fecha_devolucion_real
                  ? formatearFechaHora(prestamo.fecha_devolucion_real)
                  : `Estimado: ${formatearFechaHora(prestamo.fecha_devolucion_estimada)}`}
              </span>
            </div>

            {prestamo.accesorios_entregados && (
              <div className="col-span-2 pt-1 border-t border-slate-100">
                <span className="font-bold text-slate-600 text-[10px] uppercase">
                  Accesorios Entregados:
                </span>{' '}
                <span className="text-slate-800">{prestamo.accesorios_entregados}</span>
              </div>
            )}
          </div>

          {/* Tabla de Equipos Prestados */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
              Detalle de Equipos Tecnológicos ({bienes.length} unid.)
            </h3>
            <div className="overflow-hidden border border-slate-300 rounded-lg">
              <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
                <thead className="bg-slate-100 font-bold text-slate-700 text-[11px] uppercase">
                  <tr>
                    <th className="py-2 px-3 w-10 text-center">N°</th>
                    <th className="py-2 px-3">Etiqueta QR</th>
                    <th className="py-2 px-3">Cód. Patrimonial</th>
                    <th className="py-2 px-3">Denominación / Bien</th>
                    <th className="py-2 px-3">Marca / Modelo</th>
                    <th className="py-2 px-3">N° de Serie</th>
                    <th className="py-2 px-3 text-center">Est. Operativo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {bienes.map((bien, idx) => (
                    <tr key={bien.id} className="hover:bg-slate-50">
                      <td className="py-2 px-3 text-center font-bold text-slate-500">{idx + 1}</td>
                      <td className="py-2 px-3 font-mono font-bold text-slate-900">
                        {bien.etiqueta_interna}
                      </td>
                      <td className="py-2 px-3 font-mono text-slate-700">
                        {bien.codigo_patrimonial || 'S/C'}
                      </td>
                      <td className="py-2 px-3 font-medium text-slate-900">{bien.denominacion}</td>
                      <td className="py-2 px-3 text-slate-700">
                        {bien.marca} {bien.modelo ? `- ${bien.modelo}` : ''}
                      </td>
                      <td className="py-2 px-3 font-mono text-slate-700">
                        {bien.serie || bien.numero_serie || 'S/N'}
                      </td>
                      <td className="py-2 px-3 text-center font-bold text-[11px]">
                        <span
                          className={`px-2 py-0.5 rounded ${
                            bien.estado_operativo === 'OPERATIVO'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}
                        >
                          {bien.estado_operativo}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Observaciones de retorno */}
          {prestamo.observacion_retorno && (
            <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-lg text-xs">
              <span className="font-bold text-amber-900 block mb-0.5">
                Observaciones registradas en el retorno:
              </span>
              <p className="text-amber-800">{prestamo.observacion_retorno}</p>
            </div>
          )}

          {/* Cláusula de compromiso */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-[11px] text-slate-600 leading-relaxed print-avoid-break">
            <p>
              <b>Compromiso de Custodia:</b> El/La docente solicitante asume la responsabilidad del
              cuidado, custodia y uso estrictamente pedagógico de los equipos informáticos recibidos,
              comprometiéndose a velar por su integridad física y devolverlos inmediatamente concluida
              la sesión en el estado en que fueron recibidos.
            </p>
          </div>

          {/* Firmas de Entrega y Recepción */}
          <div className="pt-10 grid grid-cols-2 gap-12 text-center text-xs print-avoid-break">
            <div className="border-t border-slate-800 pt-2">
              <p className="font-bold uppercase text-slate-900">
                {prestamo.usuario_entrega_id ? 'Responsable del AIP' : 'Entrega Conforme'}
              </p>
              <p className="text-[11px] text-slate-500">Aula de Innovación Pedagógica</p>
              <p className="text-[10px] text-slate-400 mt-0.5">I.E. Emblemática MAMM</p>
            </div>

            <div className="border-t border-slate-800 pt-2">
              <p className="font-bold uppercase text-slate-900">{prestamo.docente_nombre}</p>
              <p className="text-[11px] text-slate-500">Docente Solicitante</p>
              <p className="text-[10px] text-slate-400 mt-0.5">Recibe Conforme</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};