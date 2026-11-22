import React, { useMemo } from 'react';
import { X, Printer } from 'lucide-react';
import {
  BienPatrimonial,
  Ambiente,
  CategoriaEquipo,
  InstitucionConfig,
  formatearNombreIE,
  compararBienesDeterminista,
} from '@/types';

interface Anexo01PrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  bienes: BienPatrimonial[];
  ambientes: Ambiente[];
  categorias: CategoriaEquipo[];
  config: InstitucionConfig | null;
}

export const Anexo01PrintModal: React.FC<Anexo01PrintModalProps> = ({
  isOpen,
  onClose,
  bienes,
  ambientes,
  categorias,
  config,
}) => {
  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  const getNombreAmbiente = (ambienteId?: string, detalle?: string) => {
    const amb = ambientes.find((a) => a.id === ambienteId);
    const nom = amb?.nombre || 'No asignado';
    if (detalle && detalle.trim() && nom.toLowerCase().includes('otro')) {
      return `${nom} (${detalle.trim()})`;
    }
    return nom;
  };

  const getNombreCategoria = (catId?: string) => {
    return categorias.find((c) => c.id === catId)?.nombre || 'General';
  };

  const dre = (config?.dre || 'AMAZONAS').toUpperCase().replace(/^DRE\s+/i, '');
  const ugel = (config?.ugel || 'BAGUA').toUpperCase().replace(/^UGEL\s+/i, '');
  const nombreIe = formatearNombreIE(config?.nombre_ie);
  const nivel = config?.nivel || 'SECUNDARIA';
  const lugar = config?.lugar || 'BAGUA';
  const distrito = config?.distrito || 'BAGUA';
  const responsable = config?.responsable_nombre || 'RESPONSABLE AIP';
  const dni = config?.responsable_dni || '';

  const bienesOrdenados = useMemo(() => {
    return [...bienes].sort(compararBienesDeterminista);
  }, [bienes]);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4">
      <style>{`
        @media print {
          @page {
            size: A4 landscape;
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
          .printable-anexo01 {
            padding: 8mm 10mm !important;
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
        }
      `}</style>

      <div className="bg-white rounded-2xl shadow-2xl max-w-6xl w-full max-h-[96vh] flex flex-col overflow-hidden my-auto border border-slate-300">
        {/* Barra superior de acciones (no imprimible) */}
        <div className="no-print bg-slate-900 text-white p-4 px-6 flex items-center justify-between shrink-0">
          <div>
            <h2 className="text-sm font-bold text-white flex items-center space-x-2">
              <Printer className="w-4 h-4 text-emerald-400" />
              <span>Vista Previa de Impresión — Formato Anexo 01 Oficial</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Optimizado en orientación horizontal A4 para generar PDF oficial o imprimir en físico
            </p>
          </div>
          <div className="flex items-center space-x-2.5">
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
        <div className="printable-anexo01 overflow-y-auto p-6 sm:p-8 bg-white text-slate-900 flex-1 text-[10px]">
          {/* Encabezado Institucional */}
          <div className="border-b-2 border-slate-900 pb-3 mb-3">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center space-x-3 shrink-0">
                <img
                  src="/logo-mamm.jpg"
                  alt="Insignia MAMM"
                  className="w-14 h-14 object-contain border border-slate-200 p-0.5 rounded"
                />
                <div className="text-left font-serif leading-tight">
                  <p className="text-[10px] font-bold tracking-wide text-slate-700 uppercase">
                    Gobierno Regional de Amazonas
                  </p>
                  <p className="text-[10px] font-bold text-slate-800 uppercase">
                    DRE {dre} &bull; UGEL {ugel}
                  </p>
                  <p className="text-xs font-extrabold text-slate-900 uppercase">
                    I.E. &quot;{nombreIe}&quot;
                  </p>
                  <p className="text-[9px] text-slate-600 font-sans">
                    Nivel {nivel} &bull; {lugar} - {distrito}
                  </p>
                </div>
              </div>

              <div className="text-center flex-1 px-2">
                <h1 className="text-sm font-black uppercase tracking-wider text-slate-900 font-sans">
                  Inventario Físico de Máquinas y Equipos
                </h1>
                <p className="text-[11px] font-bold text-emerald-800 uppercase tracking-widest font-sans">
                  Formato Anexo 01 Oficial &bull; Aula de Innovación Pedagógica
                </p>
                <p className="text-[9px] text-slate-500 font-mono mt-0.5">
                  Conforme a Directiva de Control Patrimonial Institucional
                </p>
              </div>

              <div className="text-right text-[9px] text-slate-700 shrink-0 space-y-0.5 font-sans border-l border-slate-200 pl-3">
                <p>
                  <strong>Fecha de Emisión:</strong> {new Date().toLocaleDateString('es-PE')}
                </p>
                <p>
                  <strong>Responsable AIP:</strong> {responsable}
                </p>
                {dni && (
                  <p>
                    <strong>DNI:</strong> {dni}
                  </p>
                )}
                <p>
                  <strong>Total Ítems:</strong>{' '}
                  <span className="font-bold text-emerald-700">{bienesOrdenados.length}</span>
                </p>
              </div>
            </div>
          </div>

          {/* Tabla de Bienes */}
          <table className="w-full border-collapse text-[9px] leading-tight mb-4">
            <thead>
              <tr className="bg-slate-100 text-slate-800 border border-slate-900 font-bold uppercase text-center">
                <th className="border border-slate-900 p-1 w-6">N°</th>
                <th className="border border-slate-900 p-1 w-16">Etiqueta QR</th>
                <th className="border border-slate-900 p-1 w-24">Cód. Patrimonial</th>
                <th className="border border-slate-900 p-1">Denominación</th>
                <th className="border border-slate-900 p-1 w-20">Categoría</th>
                <th className="border border-slate-900 p-1 w-16">Marca</th>
                <th className="border border-slate-900 p-1 w-16">Modelo</th>
                <th className="border border-slate-900 p-1 w-20">N° Serie</th>
                <th className="border border-slate-900 p-1 w-12">Color</th>
                <th className="border border-slate-900 p-1 w-16">Lote</th>
                <th className="border border-slate-900 p-1 w-8">Est.</th>
                <th className="border border-slate-900 p-1 w-16">Estado Op.</th>
                <th className="border border-slate-900 p-1 w-24">Ubicación</th>
                <th className="border border-slate-900 p-1">Observaciones</th>
              </tr>
            </thead>
            <tbody>
              {bienesOrdenados.length === 0 ? (
                <tr>
                  <td colSpan={14} className="border border-slate-400 p-4 text-center text-slate-400">
                    No hay bienes que coincidan con los filtros seleccionados.
                  </td>
                </tr>
              ) : (
                bienesOrdenados.map((b, idx) => (
                  <tr
                    key={b.id}
                    className={`border border-slate-400 ${
                      idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/60'
                    } ${b.estado_operativo === 'DE_BAJA' ? 'opacity-60 bg-rose-50/40' : ''}`}
                  >
                    <td className="border border-slate-400 p-1 text-center font-bold">{idx + 1}</td>
                    <td className="border border-slate-400 p-1 font-mono font-bold text-center">
                      {b.etiqueta_interna || 'S/E'}
                    </td>
                    <td className="border border-slate-400 p-1 font-mono text-center">
                      {b.codigo_patrimonial || 'S/C'}
                    </td>
                    <td className="border border-slate-400 p-1 font-semibold">{b.denominacion}</td>
                    <td className="border border-slate-400 p-1 text-center">
                      {getNombreCategoria(b.categoria_id)}
                    </td>
                    <td className="border border-slate-400 p-1 text-center">{b.marca || '—'}</td>
                    <td className="border border-slate-400 p-1 text-center">{b.modelo || '—'}</td>
                    <td className="border border-slate-400 p-1 font-mono text-center">{b.serie || 'S/N'}</td>
                    <td className="border border-slate-400 p-1 text-center">{b.color || '—'}</td>
                    <td className="border border-slate-400 p-1 text-center font-semibold">
                      {b.lote_etiqueta ? (
                        <span
                          className="px-1 py-0.2 rounded text-[8px] font-bold text-white inline-block"
                          style={{ backgroundColor: b.lote_color || '#475569' }}
                        >
                          {b.lote_etiqueta}
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="border border-slate-400 p-1 text-center font-bold">
                      {b.estado_conservacion}
                    </td>
                    <td className="border border-slate-400 p-1 text-center font-semibold">
                      {b.estado_operativo}
                    </td>
                    <td className="border border-slate-400 p-1">
                      {getNombreAmbiente(b.ambiente_id, b.ubicacion_detalle)}
                    </td>
                    <td className="border border-slate-400 p-1 text-[8px] text-slate-600">
                      {b.observacion || '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          {/* Bloque de Firmas Oficiales */}
          <div className="pt-6 mt-4 border-t border-slate-300 grid grid-cols-2 gap-12 text-center text-[10px] break-inside-avoid">
            <div className="flex flex-col items-center">
              <div className="w-56 border-t-2 border-slate-800 pt-1.5 mb-1">
                <p className="font-bold uppercase text-slate-900">{responsable}</p>
                <p className="text-[9px] text-slate-600 font-medium">Docente Responsable del AIP</p>
                {dni && <p className="text-[9px] text-slate-500 font-mono">DNI: {dni}</p>}
              </div>
            </div>

            <div className="flex flex-col items-center">
              <div className="w-56 border-t-2 border-slate-800 pt-1.5 mb-1">
                <p className="font-bold uppercase text-slate-900">V° B° Dirección Institucional</p>
                <p className="text-[9px] text-slate-600 font-medium">I.E. &quot;{nombreIe}&quot;</p>
                <p className="text-[9px] text-slate-500">Sello y Firma</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
