import React, { useRef } from 'react';
import { X, Printer, ShieldCheck } from 'lucide-react';
import { MovimientoBien, Ambiente, formatearNombreIE } from '@/types';

interface ActaTrasladoModalProps {
  movimientos: MovimientoBien[];
  ambientes: Ambiente[];
  institucionNombre?: string;
  ugel?: string;
  dre?: string;
  onClose: () => void;
}

export const ActaTrasladoModal: React.FC<ActaTrasladoModalProps> = ({
  movimientos,
  ambientes,
  institucionNombre = 'I.E. Emblemática Manuel Antonio Mesones Muro',
  ugel = 'UGEL Bagua',
  dre = 'DRE Amazonas',
  onClose,
}) => {
  const printRef = useRef<HTMLDivElement>(null);

  if (movimientos.length === 0) return null;

  const primerMov = movimientos[0];
  const ambienteOrigen =
    ambientes.find((a) => a.id === primerMov.ambiente_origen_id)?.nombre ||
    primerMov.ambiente_origen_id;
  const ambienteDestinoBase =
    ambientes.find((a) => a.id === primerMov.ambiente_destino_id)?.nombre ||
    primerMov.ambiente_destino_id;
  const ambienteDestino =
    ambienteDestinoBase.trim().toLowerCase() === 'otros' && primerMov.ubicacion_detalle_destino
      ? `Otros (${primerMov.ubicacion_detalle_destino})`
      : ambienteDestinoBase;

  const codigoActa = primerMov.lote_id || `ACTA-IND-${primerMov.id.slice(0, 8).toUpperCase()}`;
  const nombreIELimpio = formatearNombreIE(institucionNombre);

  const dreTexto = (dre || '').trim().toUpperCase().startsWith('DRE')
    ? dre
    : `DRE ${dre || 'Amazonas'}`;
  const ugelTexto = (ugel || '').trim().toUpperCase().startsWith('UGEL')
    ? ugel
    : `UGEL ${ugel || 'Bagua'}`;

  const formatFecha = (f?: string | Date) => {
    if (!f) return new Date().toLocaleDateString('es-PE');
    try {
      const d = typeof f === 'string' ? new Date(f) : f;
      return d.toLocaleDateString('es-PE', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return String(f);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
      {/* Contenedor Modal */}
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full border border-slate-200 overflow-hidden my-6 flex flex-col max-h-[92vh]">
        {/* Barra superior de acciones (oculta al imprimir) */}
        <div className="bg-slate-900 text-white p-4 flex items-center justify-between shrink-0 print:hidden">
          <div className="flex items-center space-x-2">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            <h3 className="text-sm font-bold text-white">Vista Previa de Acta Oficial de Traslado</h3>
            <span className="text-xs bg-emerald-950 text-emerald-300 px-2 py-0.5 rounded border border-emerald-700/60 font-mono">
              {codigoActa}
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center space-x-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs rounded-lg shadow-sm transition-colors"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimir / Guardar PDF</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Hoja Imprimible Oficial */}
        <div className="overflow-y-auto p-6 sm:p-10 flex-1 bg-slate-100 print:bg-white print:p-0">
          <style>{`
            @media print {
              @page {
                size: A4;
                margin: 0;
              }
              body {
                margin: 0;
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
              }
            }
          `}</style>

          <div
            ref={printRef}
            className="max-w-[210mm] mx-auto bg-white p-8 sm:p-12 print:p-[14mm] print:m-0 print:w-full print:max-w-none shadow-md print:shadow-none border border-slate-200 print:border-none text-slate-900 font-sans text-xs leading-relaxed"
          >
            {/* Encabezado Oficial */}
            <div className="border-b-2 border-slate-800 pb-4 mb-6">
              <div className="flex items-center justify-between gap-4">
                <div className="w-16 h-16 sm:w-20 sm:h-20 shrink-0 flex items-center justify-center">
                  <img
                    src="/logo-mamm.jpg"
                    alt="Insignia Institucional"
                    className="max-w-full max-h-full object-contain"
                  />
                </div>
                <div className="text-center flex-1">
                  <h4 className="text-[11px] font-bold tracking-wider text-slate-600 uppercase">
                    Ministerio de Educación – {dreTexto}
                  </h4>
                  <h3 className="text-xs font-bold text-slate-700 uppercase">{ugelTexto}</h3>
                  <h2 className="text-sm sm:text-base font-extrabold text-slate-900 uppercase tracking-tight mt-0.5">
                    I.E. &quot;{nombreIELimpio}&quot;
                  </h2>
                  <p className="text-[11px] text-emerald-800 font-semibold mt-0.5">
                    Aula de Innovación Pedagógica (AIP) – Gestión de Recursos Tecnológicos
                  </p>
                </div>
                <div className="w-24 h-16 sm:w-28 sm:h-20 shrink-0 flex flex-col items-center justify-center border border-slate-300 rounded p-1 text-center bg-slate-50 whitespace-nowrap">
                  <span className="text-[9px] font-bold text-slate-500 uppercase whitespace-nowrap">
                    CÓDIGO ACTA
                  </span>
                  <span className="text-[10px] font-mono font-bold text-slate-800 mt-0.5 whitespace-nowrap">
                    {codigoActa.replace('ACTA-', '')}
                  </span>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-200 text-center">
                <h1 className="text-sm sm:text-base font-black tracking-wide text-slate-900 uppercase">
                  ACTA DE ENTREGA / TRASLADO DE BIENES TECNOLÓGICOS
                </h1>
                <p className="text-[11px] text-slate-600 mt-0.5">
                  Constancia oficial de reasignación y custodia de recursos tecnológicos escolares
                </p>
              </div>
            </div>

            {/* Metadatos del Traslado */}
            <div className="grid grid-cols-2 gap-3 mb-6 p-4 bg-slate-50 border border-slate-200 rounded-lg text-xs">
              <div>
                <span className="font-bold text-slate-600 block text-[10px] uppercase">
                  Ambiente de Origen:
                </span>
                <span className="font-semibold text-slate-800 text-xs">{ambienteOrigen}</span>
              </div>
              <div>
                <span className="font-bold text-slate-600 block text-[10px] uppercase">
                  Ambiente de Destino:
                </span>
                <span className="font-semibold text-emerald-800 text-xs">{ambienteDestino}</span>
              </div>
              <div>
                <span className="font-bold text-slate-600 block text-[10px] uppercase">
                  Fecha y Hora de Emisión:
                </span>
                <span className="font-medium text-slate-800 capitalize">
                  {formatFecha(primerMov.fecha_movimiento)}
                </span>
              </div>
              <div>
                <span className="font-bold text-slate-600 block text-[10px] uppercase">
                  Total de Equipos Trasladados:
                </span>
                <span className="font-bold text-slate-900">{movimientos.length} unidad(es)</span>
              </div>
              <div className="col-span-2 pt-2 border-t border-slate-200">
                <span className="font-bold text-slate-600 block text-[10px] uppercase">
                  Motivo / Justificación del Traslado:
                </span>
                <span className="font-medium text-slate-800">{primerMov.motivo}</span>
              </div>
            </div>

            {/* Tabla de Equipos Trasladados */}
            <div className="mb-8">
              <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-2">
                Detalle de Bienes Tecnológicos Objeto de Traslado
              </h4>
              <div className="border border-slate-300 rounded overflow-hidden">
                <table className="w-full text-left border-collapse text-[11px]">
                  <thead>
                    <tr className="bg-slate-100 border-b border-slate-300 text-slate-700">
                      <th className="p-2 border-r border-slate-300 w-8 text-center font-bold">N°</th>
                      <th className="p-2 border-r border-slate-300 font-bold">Cód. Patrimonial</th>
                      <th className="p-2 border-r border-slate-300 font-bold">Etiqueta QR</th>
                      <th className="p-2 border-r border-slate-300 font-bold">Descripción / Denominación</th>
                      <th className="p-2 border-r border-slate-300 font-bold">Marca / Modelo</th>
                      <th className="p-2 border-r border-slate-300 font-bold">N° Serie</th>
                      <th className="p-2 text-center font-bold w-16">Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {movimientos.map((m, idx) => (
                      <tr
                        key={m.id}
                        className={`border-b border-slate-200 ${
                          idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/60'
                        }`}
                      >
                        <td className="p-2 border-r border-slate-200 text-center font-medium">
                          {idx + 1}
                        </td>
                        <td className="p-2 border-r border-slate-200 font-mono font-medium">
                          {m.codigo_patrimonial || 'S/C'}
                        </td>
                        <td className="p-2 border-r border-slate-200 font-mono text-emerald-800 font-bold">
                          {m.etiqueta_interna || '—'}
                        </td>
                        <td className="p-2 border-r border-slate-200 font-medium">
                          {m.denominacion || 'BIEN TECNOLÓGICO'}
                        </td>
                        <td className="p-2 border-r border-slate-200">
                          {m.marca || '—'} {m.modelo ? `/ ${m.modelo}` : ''}
                        </td>
                        <td className="p-2 border-r border-slate-200 font-mono">
                          {m.serie || 'S/N'}
                        </td>
                        <td className="p-2 text-center font-bold">
                          {m.estado_conservacion || 'B'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Cláusula de Custodia y Responsabilidad */}
            <div className="mb-10 text-[10.5px] text-slate-600 bg-slate-50 p-3.5 border border-slate-200 rounded leading-relaxed">
              <strong>Compromiso de Custodia:</strong> La persona o responsable receptor suscribe la presente
              acta en señal de conformidad, asumiendo la custodia, buen uso y resguardo de los bienes tecnológicos
              arriba descritos conforme a las normativas de control patrimonial y de recursos del Aula de
              Innovación Pedagógica (AIP).
            </div>

            {/* Bloque de Tres Firmas Oficiales */}
            <div className="grid grid-cols-3 gap-6 pt-10 text-center text-xs">
              <div>
                <div className="border-t border-slate-700 w-4/5 mx-auto pt-2">
                  <p className="font-bold text-slate-800 leading-tight uppercase">
                    {primerMov.responsable_entrega || 'Responsable AIP'}
                  </p>
                  <p className="text-[10px] text-slate-500 uppercase mt-0.5">Entrega Conforme</p>
                  <p className="text-[9px] text-slate-400">Docente de Innovación Pedagógica</p>
                </div>
              </div>
              <div>
                <div className="border-t border-slate-700 w-4/5 mx-auto pt-2">
                  <p className="font-bold text-slate-800 leading-tight uppercase">
                    {primerMov.responsable_recepcion || 'Receptor Responsable'}
                  </p>
                  <p className="text-[10px] text-slate-500 uppercase mt-0.5">Recibe Conforme</p>
                  <p className="text-[9px] text-slate-400">Responsable de Ambiente Receptor</p>
                </div>
              </div>
              <div>
                <div className="border-t border-slate-700 w-4/5 mx-auto pt-2">
                  <p className="font-bold text-slate-800 leading-tight uppercase">Dirección General</p>
                  <p className="text-[10px] text-slate-500 uppercase mt-0.5">V° B° Dirección</p>
                  <p className="text-[9px] text-slate-400">I.E. M. A. Mesones Muro</p>
                </div>
              </div>
            </div>

            {/* Pie de Página */}
            <div className="mt-12 pt-3 border-t border-slate-200 text-center text-[9px] text-slate-400 flex items-center justify-between">
              <span>SIGI-AIP MAMM – Sistema Integrado de Gestión Institucional</span>
              <span>Documento Oficial de Control Interno Patrimonial</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
