import React from 'react';
import { X, Printer } from 'lucide-react';
import {
  BienPatrimonial,
  Prestamo,
  MantenimientoRegistro,
  InstitucionConfig,
  formatearNombreIE,
} from '@/types';

interface ResumenEjecutivoPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  bienes: BienPatrimonial[];
  prestamos: Prestamo[];
  mantenimientos: MantenimientoRegistro[];
  config: InstitucionConfig | null;
  fechaDesde?: string;
  fechaHasta?: string;
}

export const ResumenEjecutivoPrintModal: React.FC<ResumenEjecutivoPrintModalProps> = ({
  isOpen,
  onClose,
  bienes,
  prestamos,
  mantenimientos,
  config,
  fechaDesde,
  fechaHasta,
}) => {
  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  const dre = (config?.dre || 'AMAZONAS').toUpperCase().replace(/^DRE\s+/i, '');
  const ugel = (config?.ugel || 'BAGUA').toUpperCase().replace(/^UGEL\s+/i, '');
  const nombreIe = formatearNombreIE(config?.nombre_ie);
  const nivel = config?.nivel || 'SECUNDARIA';
  const lugar = config?.lugar || 'BAGUA';
  const distrito = config?.distrito || 'BAGUA';
  const responsable = config?.responsable_nombre || 'DOCENTE RESPONSABLE AIP';
  const dni = config?.responsable_dni || '';

  // Cálculos del periodo
  const bienesActivos = bienes.filter((b) => b.estado_operativo !== 'DE_BAJA');
  const totalActivos = bienesActivos.length;
  const totalBajas = bienes.filter((b) => b.estado_operativo === 'DE_BAJA').length;

  const stockAIP = bienesActivos.filter((b) => {
    // Si no tenemos objeto ambiente completo aquí, asumimos esAmbientePrestable por defecto si no es oficina
    return b.estado_operativo !== 'DE_BAJA';
  }).length;

  const operativos = bienesActivos.filter((b) => b.estado_operativo === 'OPERATIVO').length;
  const tasaOperatividad = totalActivos > 0 ? ((operativos / totalActivos) * 100).toFixed(1) : '100';

  // Desglose por Área Curricular
  const areasMap = new Map<string, { sesiones: number; equipos: number }>();
  let totalEquiposPrestados = 0;

  prestamos.forEach((p) => {
    const area = p.area_nombre || 'Área General';
    const cant = p.cantidad_equipos || p.bienes_ids?.length || 1;
    totalEquiposPrestados += cant;
    if (!areasMap.has(area)) {
      areasMap.set(area, { sesiones: 0, equipos: 0 });
    }
    const item = areasMap.get(area)!;
    item.sesiones += 1;
    item.equipos += cant;
  });

  const areasList = Array.from(areasMap.entries()).sort((a, b) => b[1].sesiones - a[1].sesiones);

  // Mantenimiento
  const mantPreventivos = mantenimientos.filter((m) => m.tipo === 'PREVENTIVO').length;
  const mantCorrectivos = mantenimientos.filter((m) => m.tipo === 'CORRECTIVO').length;
  const mantCerrados = mantenimientos.filter((m) => m.cerrado).length;
  const mantPendientes = mantenimientos.filter((m) => !m.cerrado).length;

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
          .printable-resumen {
            padding: 10mm 12mm !important;
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            box-shadow: none !important;
            border: none !important;
          }
        }
      `}</style>

      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[96vh] flex flex-col overflow-hidden my-auto border border-slate-300">
        {/* Barra de acción */}
        <div className="no-print bg-slate-900 text-white p-4 px-6 flex items-center justify-between shrink-0">
          <div>
            <h2 className="text-sm font-bold text-white flex items-center space-x-2">
              <Printer className="w-4 h-4 text-emerald-400" />
              <span>Resumen Ejecutivo Pedagógico y Técnico (A4 Vertical)</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Informe consolidado para Dirección Institucional y Supervisión UGEL
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

        {/* Contenido Imprimible */}
        <div className="printable-resumen overflow-y-auto p-8 sm:p-10 bg-white text-slate-900 flex-1 text-xs leading-relaxed font-sans">
          {/* Cabecera Oficial */}
          <div className="border-b-2 border-slate-900 pb-4 mb-4 flex items-center justify-between">
            <div className="flex items-center space-x-3.5">
              <img
                src="/logo-mamm.jpg"
                alt="Insignia MAMM"
                className="w-16 h-16 object-contain border border-slate-200 p-0.5 rounded shrink-0"
              />
              <div className="leading-tight">
                <p className="text-[10px] font-bold text-slate-700 uppercase">
                  Gobierno Regional de Amazonas &bull; DRE {dre}
                </p>
                <p className="text-[11px] font-bold text-slate-800 uppercase">
                  Unidad de Gestión Educativa Local — UGEL {ugel}
                </p>
                <p className="text-sm font-extrabold text-slate-900 uppercase">
                  I.E. &quot;{nombreIe}&quot;
                </p>
                <p className="text-[10px] text-slate-600">
                  Nivel {nivel} &bull; {lugar} - {distrito}
                </p>
              </div>
            </div>

            <div className="text-right text-[10px] text-slate-600 border-l border-slate-200 pl-4 space-y-0.5">
              <p>
                <strong>Emisión:</strong> {new Date().toLocaleDateString('es-PE')}
              </p>
              <p>
                <strong>Periodo:</strong>{' '}
                {fechaDesde && fechaHasta
                  ? `${fechaDesde} al ${fechaHasta}`
                  : fechaDesde
                  ? `Desde ${fechaDesde}`
                  : 'Histórico Completo'}
              </p>
              <p>
                <strong>Módulo:</strong> SIGI-AIP MAMM v1.0
              </p>
            </div>
          </div>

          {/* Título */}
          <div className="text-center my-4">
            <h1 className="text-base font-black text-slate-900 uppercase tracking-wide">
              Informe de Gestión y Rendimiento del Aula de Innovación Pedagógica
            </h1>
            <p className="text-xs font-bold text-emerald-800 uppercase tracking-widest mt-0.5">
              Resumen Ejecutivo para Dirección y Órganos de Supervisión Pedagógica
            </p>
          </div>

          {/* 1. Inventario y Capacidad Instalada */}
          <div className="my-4 space-y-2">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800 border-b border-slate-200 pb-1">
              1. Capacidad Tecnológica Instalada y Salud del Inventario
            </h2>
            <div className="grid grid-cols-4 gap-3 text-center pt-1">
              <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg">
                <span className="text-[10px] text-slate-500 uppercase block font-semibold">
                  Total Activos
                </span>
                <span className="text-lg font-bold text-slate-900">{totalActivos}</span>
                <span className="text-[9px] text-slate-500 block">Stock AIP: {stockAIP}</span>
              </div>
              <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg">
                <span className="text-[10px] text-emerald-700 uppercase block font-semibold">
                  Operativos
                </span>
                <span className="text-lg font-bold text-emerald-800">{operativos}</span>
              </div>
              <div className="p-2.5 bg-blue-50 border border-blue-200 rounded-lg">
                <span className="text-[10px] text-blue-700 uppercase block font-semibold">
                  Tasa de Operatividad
                </span>
                <span className="text-lg font-bold text-blue-800">{tasaOperatividad}%</span>
              </div>
              <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg">
                <span className="text-[10px] text-rose-700 uppercase block font-semibold">
                  Bajas Registradas
                </span>
                <span className="text-lg font-bold text-rose-800">{totalBajas}</span>
              </div>
            </div>
          </div>

          {/* 2. Uso Pedagógico en Aulas */}
          <div className="my-4 space-y-2">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800 border-b border-slate-200 pb-1">
              2. Atención Pedagógica y Circulación de Recursos TIC
            </h2>
            <div className="flex items-center justify-between text-[11px] bg-slate-50 p-2.5 rounded-lg border border-slate-200">
              <span>
                Total de sesiones pedagógicas atendidas con préstamo QR:{' '}
                <strong className="text-indigo-900">{prestamos.length}</strong>
              </span>
              <span>
                Total de equipos puestos a disposición en aula:{' '}
                <strong className="text-indigo-900">{totalEquiposPrestados} unidades</strong>
              </span>
            </div>

            <div className="pt-2">
              <h3 className="text-[11px] font-semibold text-slate-700 mb-1">
                Desglose de Atención por Áreas Curriculares:
              </h3>
              <table className="w-full border-collapse text-[10px]">
                <thead>
                  <tr className="bg-slate-100 text-slate-800 border border-slate-300 font-bold">
                    <th className="p-1.5 text-left border border-slate-300">Área Curricular</th>
                    <th className="p-1.5 text-center border border-slate-300 w-28">Sesiones Realizadas</th>
                    <th className="p-1.5 text-center border border-slate-300 w-32">Equipos Utilizados</th>
                    <th className="p-1.5 text-center border border-slate-300 w-24">% Participación</th>
                  </tr>
                </thead>
                <tbody>
                  {areasList.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="p-3 text-center text-slate-400 border border-slate-300">
                        No se registraron préstamos en el periodo seleccionado.
                      </td>
                    </tr>
                  ) : (
                    areasList.map(([area, val], idx) => {
                      const porc =
                        prestamos.length > 0 ? ((val.sesiones / prestamos.length) * 100).toFixed(1) : '0';
                      return (
                        <tr key={idx} className="border border-slate-300">
                          <td className="p-1.5 border border-slate-300 font-medium">{area}</td>
                          <td className="p-1.5 border border-slate-300 text-center font-bold">
                            {val.sesiones}
                          </td>
                          <td className="p-1.5 border border-slate-300 text-center">{val.equipos}</td>
                          <td className="p-1.5 border border-slate-300 text-center text-slate-600">
                            {porc}%
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* 3. Soporte Técnico */}
          <div className="my-4 space-y-2">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800 border-b border-slate-200 pb-1">
              3. Mantenimiento Preventivo, Correctivo y Soporte Técnico
            </h2>
            <div className="grid grid-cols-4 gap-3 text-center pt-1 text-[11px]">
              <div className="p-2 bg-slate-50 border border-slate-200 rounded-lg">
                <span className="text-[10px] text-slate-500 block">Total Atenciones</span>
                <span className="font-bold text-slate-900">{mantenimientos.length}</span>
              </div>
              <div className="p-2 bg-slate-50 border border-slate-200 rounded-lg">
                <span className="text-[10px] text-slate-500 block">Preventivos</span>
                <span className="font-bold text-emerald-700">{mantPreventivos}</span>
              </div>
              <div className="p-2 bg-slate-50 border border-slate-200 rounded-lg">
                <span className="text-[10px] text-slate-500 block">Correctivos</span>
                <span className="font-bold text-amber-700">{mantCorrectivos}</span>
              </div>
              <div className="p-2 bg-slate-50 border border-slate-200 rounded-lg">
                <span className="text-[10px] text-slate-500 block">Cerrados / Listos</span>
                <span className="font-bold text-blue-700">{mantCerrados}</span>
                <span className="text-[9px] text-amber-700 block">{mantPendientes} pendientes</span>
              </div>
            </div>
          </div>

          {/* 4. Conclusiones */}
          <div className="my-4 space-y-1">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800 border-b border-slate-200 pb-1">
              4. Observaciones Institucionales
            </h2>
            <p className="text-[10px] text-slate-600 text-justify">
              El Aula de Innovación Pedagógica de la I.E. &quot;{nombreIe}&quot; mantiene un control
              sistematizado del equipamiento tecnológico mediante identificación QR individual y
              bloques temáticos. Las devoluciones e incidencias registradas en el sistema permiten
              garantizar la disponibilidad de los recursos educativos para el logro de aprendizajes.
            </p>
          </div>

          {/* Firmas */}
          <div className="pt-8 mt-6 border-t border-slate-300 grid grid-cols-2 gap-12 text-center text-[10px] break-inside-avoid">
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
