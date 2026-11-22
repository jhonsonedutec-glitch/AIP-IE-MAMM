import React, { useState, useMemo } from 'react';
import { X, Printer, FileText } from 'lucide-react';
import { VerificacionInventario, InstitucionConfig, formatearNombreIE } from '@/types';

interface ActaVerificacionPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  verificacion: VerificacionInventario;
  config: InstitucionConfig | null;
}

export const ActaVerificacionPrintModal: React.FC<ActaVerificacionPrintModalProps> = ({
  isOpen,
  onClose,
  verificacion,
  config,
}) => {
  const [imprimirSoloDiscrepancias, setImprimirSoloDiscrepancias] = useState(false);

  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  const dre = (config?.dre || 'AMAZONAS').toUpperCase().replace(/^DRE\s+/i, '');
  const ugel = (config?.ugel || 'BAGUA').toUpperCase().replace(/^UGEL\s+/i, '');
  const nombreIe = formatearNombreIE(config?.nombre_ie);
  const lugar = config?.lugar || 'BAGUA';
  const responsable = config?.responsable_nombre || 'RESPONSABLE AIP';
  const dni = config?.responsable_dni || '';

  const itemsAMostrar = useMemo(() => {
    if (imprimirSoloDiscrepancias) {
      return verificacion.items.filter((it) => it.estado_conciliacion !== 'VERIFICADO_CONFORME');
    }
    return verificacion.items;
  }, [verificacion.items, imprimirSoloDiscrepancias]);

  const formatearFecha = (isoString?: string) => {
    if (!isoString) return '—';
    try {
      const d = new Date(isoString);
      return d.toLocaleString('es-PE', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
    } catch {
      return isoString;
    }
  };

  const getBadgeClase = (estado: string) => {
    switch (estado) {
      case 'VERIFICADO_CONFORME':
        return 'bg-emerald-100 text-emerald-900 border-emerald-300';
      case 'AUSENTE_JUSTIFICADO':
        return 'bg-blue-100 text-blue-900 border-blue-300';
      case 'FALTANTE':
        return 'bg-rose-100 text-rose-900 border-rose-300 font-bold';
      case 'FUERA_DE_UBICACION':
        return 'bg-amber-100 text-amber-900 border-amber-300 font-bold';
      case 'DESCONOCIDO':
        return 'bg-purple-100 text-purple-900 border-purple-300 font-bold';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-300';
    }
  };

  const getTextoEstado = (estado: string) => {
    switch (estado) {
      case 'VERIFICADO_CONFORME':
        return 'CONFORME';
      case 'AUSENTE_JUSTIFICADO':
        return 'JUSTIFICADO (PRÉSTAMO/MANT)';
      case 'FALTANTE':
        return 'FALTANTE NO UBICADO';
      case 'FUERA_DE_UBICACION':
        return 'FUERA DE UBICACIÓN';
      case 'DESCONOCIDO':
        return 'NO REGISTRADO EN BD';
      default:
        return estado;
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4">
      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 0;
          }
          body {
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .no-print {
            display: none !important;
          }
          .printable-acta {
            padding: 10mm 12mm !important;
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            box-shadow: none !important;
            border: none !important;
          }
          table {
            page-break-inside: auto;
          }
          tr {
            page-break-inside: avoid;
            page-break-after: auto;
          }
          thead {
            display: table-header-group;
          }
          tfoot {
            display: table-footer-group;
          }
          .bloque-firmas {
            page-break-inside: avoid !important;
          }
        }
      `}</style>

      <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full max-h-[96vh] flex flex-col overflow-hidden my-auto border border-slate-300">
        {/* Barra superior de acciones (no imprimible) */}
        <div className="no-print bg-slate-900 text-white p-4 px-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
          <div>
            <h2 className="text-sm font-bold text-white flex items-center space-x-2">
              <FileText className="w-4 h-4 text-emerald-400" />
              <span>Vista Previa de Acta Oficial de Verificación Física QR</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Acta N° <span className="font-mono text-emerald-400 font-semibold">{verificacion.codigo_acta}</span> &bull; Formato oficial A4 para comisiones y auditorías
            </p>
          </div>

          <div className="flex items-center flex-wrap gap-2.5">
            <label className="flex items-center space-x-1.5 text-xs text-slate-300 bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded-lg border border-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={imprimirSoloDiscrepancias}
                onChange={(e) => setImprimirSoloDiscrepancias(e.target.checked)}
                className="rounded text-emerald-500 focus:ring-emerald-400"
              />
              <span>Solo Discrepancias / Faltantes</span>
            </label>

            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center space-x-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-sm transition-colors cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimir / Guardar como PDF</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Contenedor del documento imprimible */}
        <div className="printable-acta overflow-y-auto p-6 sm:p-8 bg-white text-slate-900 flex-1 text-[11px]">
          {/* Encabezado Institucional */}
          <div className="border-b-2 border-slate-900 pb-3 mb-3">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center space-x-3 shrink-0">
                <img
                  src="/logo-mamm.jpg"
                  alt="Insignia MAMM"
                  className="w-14 h-14 object-contain border border-slate-200 p-0.5 rounded"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
                <div className="text-left font-serif leading-tight">
                  <p className="text-[10px] font-bold tracking-wide text-slate-700 uppercase">
                    Gobierno Regional de Amazonas
                  </p>
                  <p className="text-[10px] font-bold text-slate-800 uppercase">
                    DRE {dre} &bull; UGEL {ugel}
                  </p>
                  <p className="text-xs font-black text-emerald-950 uppercase mt-0.5">
                    I.E. "{nombreIe}"
                  </p>
                </div>
              </div>

              <div className="text-right shrink-0">
                <div className="inline-block border-2 border-slate-800 px-3 py-1 bg-slate-50 text-right">
                  <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">
                    ACTA OFICIAL N°
                  </p>
                  <p className="text-sm font-black font-mono text-slate-900">
                    {verificacion.codigo_acta}
                  </p>
                </div>
              </div>
            </div>

            <div className="text-center mt-3 pt-2 border-t border-slate-200">
              <h1 className="text-sm sm:text-base font-black text-slate-900 tracking-wide uppercase">
                ACTA OFICIAL DE VERIFICACIÓN FÍSICA Y CONCILIACIÓN DE INVENTARIO QR
              </h1>
              <p className="text-[10px] text-slate-600 font-medium">
                Auditoría física y cruce automático de bienes tecnológicos del Aula de Innovación Pedagógica
              </p>
            </div>
          </div>

          {/* Cuadro de Metadatos de la Auditoría */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 border border-slate-300 p-2.5 bg-slate-50/70 mb-3 text-[10px]">
            <div>
              <span className="text-slate-500 block font-semibold uppercase text-[9px]">Ambiente Evaluado:</span>
              <span className="font-bold text-slate-800">{verificacion.alcance_ambiente_nombre}</span>
            </div>
            <div>
              <span className="text-slate-500 block font-semibold uppercase text-[9px]">Categoría / Lote:</span>
              <span className="font-bold text-slate-800">
                {verificacion.filtro_categoria_nombre || 'Todas'} {verificacion.filtro_lote ? `(${verificacion.filtro_lote})` : ''}
              </span>
            </div>
            <div>
              <span className="text-slate-500 block font-semibold uppercase text-[9px]">Fecha Inicio / Cierre:</span>
              <span className="font-medium text-slate-800">
                {formatearFecha(verificacion.fecha_inicio)}
              </span>
            </div>
            <div>
              <span className="text-slate-500 block font-semibold uppercase text-[9px]">Auditor Responsable:</span>
              <span className="font-bold text-slate-800">
                {verificacion.auditor_nombre || verificacion.operador_nombre || verificacion.auditor_email || verificacion.operador_email || 'Docente AIP'}
              </span>
            </div>
          </div>

          {/* Balance Resumen de Conciliación */}
          <div className="mb-3">
            <h3 className="text-[10px] font-bold text-slate-700 uppercase tracking-wide mb-1.5 flex items-center space-x-1.5">
              <span>Resumen Ejecutivo del Barrido Físico</span>
              <span className="text-slate-400 font-normal">
                (Universo esperado: {verificacion.total_esperados} bienes)
              </span>
            </h3>

            <div className="grid grid-cols-5 gap-1.5 text-center text-[10px]">
              <div className="border border-emerald-300 bg-emerald-50/70 p-2 rounded">
                <span className="block text-[9px] font-bold text-emerald-800 uppercase">Conformes</span>
                <span className="text-base font-black text-emerald-700">
                  {verificacion.total_verificados_conforme ?? verificacion.total_conformes}
                </span>
                <span className="block text-[9px] text-emerald-600 font-semibold">
                  {verificacion.porcentaje_conformidad.toFixed(1)}%
                </span>
              </div>
              <div className="border border-blue-300 bg-blue-50/70 p-2 rounded">
                <span className="block text-[9px] font-bold text-blue-800 uppercase">Justificados</span>
                <span className="text-base font-black text-blue-700">{verificacion.total_ausentes_justificados}</span>
                <span className="block text-[9px] text-blue-600 font-semibold">Préstamos/Soporte</span>
              </div>
              <div className="border border-rose-300 bg-rose-50/70 p-2 rounded">
                <span className="block text-[9px] font-bold text-rose-800 uppercase">Faltantes</span>
                <span className="text-base font-black text-rose-700">{verificacion.total_faltantes}</span>
                <span className="block text-[9px] text-rose-600 font-semibold">No ubicados</span>
              </div>
              <div className="border border-amber-300 bg-amber-50/70 p-2 rounded">
                <span className="block text-[9px] font-bold text-amber-800 uppercase">Fuera Ubicación</span>
                <span className="text-base font-black text-amber-700">{verificacion.total_fuera_ubicacion}</span>
                <span className="block text-[9px] text-amber-600 font-semibold">De otro ambiente</span>
              </div>
              <div className="border border-purple-300 bg-purple-50/70 p-2 rounded">
                <span className="block text-[9px] font-bold text-purple-800 uppercase">No Catalogados</span>
                <span className="text-base font-black text-purple-700">{verificacion.total_desconocidos}</span>
                <span className="block text-[9px] text-purple-600 font-semibold">Sin ficha BD</span>
              </div>
            </div>
          </div>

          {/* Observaciones Generales del Auditor si existen */}
          {verificacion.observaciones_generales && (
            <div className="mb-3 p-2 bg-slate-50 border border-slate-200 rounded text-[10px]">
              <span className="font-bold text-slate-800 block text-[9px] uppercase">
                Observaciones Generales de la Comisión:
              </span>
              <p className="text-slate-700 mt-0.5 italic">{verificacion.observaciones_generales}</p>
            </div>
          )}

          {/* Tabla de Detalle de Bienes */}
          <div className="border border-slate-300 rounded mb-4 overflow-hidden">
            <div className="bg-slate-100 px-3 py-1.5 border-b border-slate-300 flex items-center justify-between">
              <span className="font-bold text-slate-800 text-[10px] uppercase">
                {imprimirSoloDiscrepancias
                  ? `Hallazgos y Discrepancias Físicas (${itemsAMostrar.length} ítems)`
                  : `Padrón Detallado de Verificación (${itemsAMostrar.length} ítems)`}
              </span>
              <span className="text-[9px] text-slate-500">
                {imprimirSoloDiscrepancias ? 'Filtrado: solo faltantes, desubicados y no catalogados' : 'Padrón íntegro'}
              </span>
            </div>

            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-300 text-[9px] font-bold text-slate-700 uppercase">
                  <th className="py-1.5 px-2 text-center w-8 border-r border-slate-200">N°</th>
                  <th className="py-1.5 px-2 border-r border-slate-200">Etiqueta QR</th>
                  <th className="py-1.5 px-2 border-r border-slate-200">Cód. Patrimonial</th>
                  <th className="py-1.5 px-2 border-r border-slate-200">Denominación / Marca / Modelo</th>
                  <th className="py-1.5 px-2 border-r border-slate-200">Serie</th>
                  <th className="py-1.5 px-2 border-r border-slate-200">Ambiente BD</th>
                  <th className="py-1.5 px-2 border-r border-slate-200 text-center">Estado Físico</th>
                  <th className="py-1.5 px-2">Novedad / Justificación</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-[9.5px]">
                {itemsAMostrar.map((item, idx) => (
                  <tr key={`${item.codigo_escaneado}-${idx}`} className="hover:bg-slate-50">
                    <td className="py-1 px-2 text-center font-mono text-slate-500 border-r border-slate-200">
                      {String(idx + 1).padStart(2, '0')}
                    </td>
                    <td className="py-1 px-2 font-mono font-semibold text-slate-800 border-r border-slate-200">
                      {item.etiqueta_interna || '—'}
                      {item.lote_etiqueta && (
                        <span
                          className="ml-1 px-1 py-0.2 rounded text-[8px] font-bold text-white inline-block"
                          style={{ backgroundColor: item.lote_color || '#16A34A' }}
                        >
                          {item.lote_etiqueta}
                        </span>
                      )}
                    </td>
                    <td className="py-1 px-2 font-mono text-slate-700 border-r border-slate-200">
                      {item.codigo_patrimonial || '—'}
                    </td>
                    <td className="py-1 px-2 font-medium text-slate-800 border-r border-slate-200">
                      {item.denominacion} {item.marca_modelo ? `— ${item.marca_modelo}` : ''}
                    </td>
                    <td className="py-1 px-2 font-mono text-slate-600 border-r border-slate-200">
                      {item.numero_serie || '—'}
                    </td>
                    <td className="py-1 px-2 text-slate-600 border-r border-slate-200">
                      {item.ambiente_bd || '—'}
                    </td>
                    <td className="py-1 px-2 text-center border-r border-slate-200">
                      <span
                        className={`inline-block px-1.5 py-0.5 rounded text-[8px] border ${getBadgeClase(
                          item.estado_conciliacion
                        )}`}
                      >
                        {getTextoEstado(item.estado_conciliacion)}
                      </span>
                    </td>
                    <td className="py-1 px-2 text-slate-700 text-[9px]">
                      {item.novedad_fisica || item.detalle_justificacion || '—'}
                    </td>
                  </tr>
                ))}
                {itemsAMostrar.length === 0 && (
                  <tr>
                    <td colSpan={8} className="py-6 text-center text-slate-400 italic">
                      No se registraron discrepancias en esta verificación.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Bloque de 3 Firmas Oficiales */}
          <div className="bloque-firmas mt-8 pt-4 border-t border-slate-300">
            <p className="text-[9px] text-slate-500 mb-6 text-center italic">
              En señal de conformidad con los hallazgos físicos constatados y conciliados contra la base de datos oficial de la I.E. "{nombreIe}", suscriben el presente documento:
            </p>

            <div className="grid grid-cols-3 gap-6 text-center text-[10px]">
              <div>
                <div className="border-b border-slate-800 w-4/5 mx-auto mb-1 h-12"></div>
                <p className="font-bold text-slate-900 uppercase">{responsable}</p>
                <p className="text-[9px] text-slate-600">Docente Responsable AIP</p>
                <p className="text-[9px] text-slate-500 font-mono">DNI: {dni || '.....................'}</p>
              </div>

              <div>
                <div className="border-b border-slate-800 w-4/5 mx-auto mb-1 h-12"></div>
                <p className="font-bold text-slate-900 uppercase">COMISIÓN DE INVENTARIO</p>
                <p className="text-[9px] text-slate-600">Representante / Docente Testigo</p>
                <p className="text-[9px] text-slate-500 font-mono">DNI: .....................</p>
              </div>

              <div>
                <div className="border-b border-slate-800 w-4/5 mx-auto mb-1 h-12"></div>
                <p className="font-bold text-slate-900 uppercase">DIRECCIÓN INSTITUCIONAL</p>
                <p className="text-[9px] text-slate-600">V° B° Director(a) I.E. "{nombreIe}"</p>
                <p className="text-[9px] text-slate-500">{lugar}, {new Date().toLocaleDateString('es-PE')}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
