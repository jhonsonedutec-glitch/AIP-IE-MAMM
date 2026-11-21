import React, { useState } from 'react';
import {
  X,
  Laptop,
  QrCode,
  MapPin,
  Calendar,
  Layers,
  History,
  Wrench,
  ArrowLeftRight,
} from 'lucide-react';
import { BienPatrimonial, Ambiente, CategoriaEquipo } from '@/types';

interface BienDetalleModalProps {
  bien: BienPatrimonial;
  ambientes: Ambiente[];
  categorias: CategoriaEquipo[];
  onClose: () => void;
  onEdit?: () => void;
  canEdit?: boolean;
}

export const BienDetalleModal: React.FC<BienDetalleModalProps> = ({
  bien,
  ambientes,
  categorias,
  onClose,
  onEdit,
  canEdit = false,
}) => {
  const [tab, setTab] = useState<'ficha' | 'historial'>('ficha');

  const ambienteNombreBase =
    ambientes.find((a) => a.id === bien.ambiente_id)?.nombre || 'Ambiente no asignado';
  const ambienteNombre =
    ambienteNombreBase.trim().toLowerCase() === 'otros' && bien.ubicacion_detalle
      ? `Otros — ${bien.ubicacion_detalle}`
      : ambienteNombreBase;
  const categoriaNombre =
    categorias.find((c) => c.id === bien.categoria_id)?.nombre || 'Categoría general';

  const estadoConservacionLabel = (ec: string) => {
    switch (ec) {
      case 'N':
        return { label: 'Nuevo (N)', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
      case 'B':
        return { label: 'Bueno (B)', color: 'bg-blue-50 text-blue-700 border-blue-200' };
      case 'R':
        return { label: 'Regular (R)', color: 'bg-amber-50 text-amber-700 border-amber-200' };
      case 'M':
        return { label: 'Malo (M)', color: 'bg-rose-50 text-rose-700 border-rose-200' };
      default:
        return { label: ec, color: 'bg-slate-50 text-slate-700 border-slate-200' };
    }
  };

  const estadoOperativoLabel = (eo: string) => {
    switch (eo) {
      case 'OPERATIVO':
        return { label: 'Operativo / Disponible', color: 'bg-emerald-600 text-white' };
      case 'PRESTADO':
        return { label: 'En Préstamo', color: 'bg-indigo-600 text-white' };
      case 'EN_MANTENIMIENTO':
        return { label: 'En Soporte / Mantenimiento', color: 'bg-amber-600 text-white' };
      case 'DE_BAJA':
        return { label: 'Dado de Baja', color: 'bg-rose-700 text-white' };
      default:
        return { label: eo, color: 'bg-slate-600 text-white' };
    }
  };

  const cons = estadoConservacionLabel(bien.estado_conservacion);
  const oper = estadoOperativoLabel(bien.estado_operativo);

  const formatFecha = (f?: string | Date) => {
    if (!f) return '—';
    try {
      const d = typeof f === 'string' ? new Date(f) : f;
      return d.toLocaleDateString('es-PE', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return '—';
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full border border-slate-200 overflow-hidden my-6">
        {/* Encabezado */}
        <div className="bg-slate-900 text-white p-5 flex items-start justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-emerald-600 rounded-xl text-white">
              <Laptop className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-mono text-xs bg-emerald-950/80 text-emerald-300 px-2 py-0.5 rounded border border-emerald-800">
                  {bien.etiqueta_interna || 'S/E'}
                </span>
                <span className={`text-[11px] font-semibold px-2 py-0.5 rounded ${oper.color}`}>
                  {oper.label}
                </span>
              </div>
              <h2 className="text-lg font-bold mt-1 text-white leading-tight">
                {bien.denominacion}
              </h2>
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

        {/* Barra de Pestañas */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-5 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setTab('ficha')}
            className={`py-3 px-4 border-b-2 transition-colors flex items-center space-x-1.5 ${
              tab === 'ficha'
                ? 'border-emerald-600 text-emerald-700 bg-white'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Ficha Patrimonial (Anexo 01)</span>
          </button>
          <button
            type="button"
            onClick={() => setTab('historial')}
            className={`py-3 px-4 border-b-2 transition-colors flex items-center space-x-1.5 ${
              tab === 'historial'
                ? 'border-emerald-600 text-emerald-700 bg-white'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <History className="w-4 h-4" />
            <span>Trazabilidad y Mantenimiento</span>
          </button>
        </div>

        {/* Contenido Pestaña Ficha */}
        {tab === 'ficha' && (
          <div className="p-6 space-y-5 text-xs">
            {/* Tarjeta de Código QR y Patrimonial */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <span className="text-[11px] font-semibold text-slate-500 block">
                  Código Patrimonial
                </span>
                <span className="text-sm font-bold text-slate-900 font-mono">
                  {bien.codigo_patrimonial || 'S/C'}
                </span>
                <span className="text-[10px] text-slate-500 block mt-0.5">
                  Tipo: {bien.tipo_codigo || 'S/C'}
                </span>
              </div>

              <div>
                <span className="text-[11px] font-semibold text-slate-500 block">
                  Etiqueta Interna / QR
                </span>
                <span className="text-sm font-bold text-emerald-700 font-mono flex items-center space-x-1">
                  <QrCode className="w-4 h-4" />
                  <span>{bien.etiqueta_interna || 'Sin Etiqueta'}</span>
                </span>
                <span className="text-[10px] text-slate-500 block mt-0.5">
                  QR: {bien.codigo_qr}
                </span>
              </div>

              <div>
                <span className="text-[11px] font-semibold text-slate-500 block">
                  Estado de Conservación
                </span>
                <span
                  className={`inline-block mt-1 px-2.5 py-0.5 rounded border text-[11px] font-semibold ${cons.color}`}
                >
                  {cons.label}
                </span>
              </div>
            </div>

            {/* Datos Técnicos y Físicos */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <div>
                <span className="text-slate-500 font-medium block">Categoría</span>
                <span className="font-semibold text-slate-800">{categoriaNombre}</span>
              </div>

              <div>
                <span className="text-slate-500 font-medium block">Ubicación / Ambiente</span>
                <span className="font-semibold text-slate-800 flex items-center space-x-1">
                  <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>{ambienteNombre}</span>
                </span>
              </div>

              <div>
                <span className="text-slate-500 font-medium block">Marca</span>
                <span className="font-semibold text-slate-800">{bien.marca || '—'}</span>
              </div>

              <div>
                <span className="text-slate-500 font-medium block">Modelo</span>
                <span className="font-semibold text-slate-800">{bien.modelo || '—'}</span>
              </div>

              <div>
                <span className="text-slate-500 font-medium block">Número de Serie</span>
                <span className="font-semibold font-mono text-slate-800">{bien.serie || 'S/N'}</span>
              </div>

              <div>
                <span className="text-slate-500 font-medium block">Color</span>
                <span className="font-semibold text-slate-800">{bien.color || '—'}</span>
              </div>

              <div>
                <span className="text-slate-500 font-medium block">Estación / Grupo</span>
                <span className="font-semibold text-slate-800">{bien.estacion_grupo || '—'}</span>
              </div>

              <div>
                <span className="text-slate-500 font-medium block">Préstamos Acumulados</span>
                <span className="font-semibold text-slate-800">{bien.total_prestamos} salidas</span>
              </div>

              <div>
                <span className="text-slate-500 font-medium block">Registrado el</span>
                <span className="font-medium text-slate-700 flex items-center space-x-1">
                  <Calendar className="w-3 h-3 text-slate-400" />
                  <span>{formatFecha(bien.fecha_registro)}</span>
                </span>
              </div>
            </div>

            {/* Observaciones */}
            <div>
              <span className="text-slate-500 font-semibold block mb-1">
                Observaciones Técnicas
              </span>
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-slate-700 whitespace-pre-wrap">
                {bien.observacion || 'Sin observaciones registradas.'}
              </div>
            </div>

            {/* Información de Baja si aplica */}
            {bien.estado_operativo === 'DE_BAJA' && (
              <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-900">
                <span className="font-bold block text-xs">Registro de Baja Patrimonial:</span>
                <p className="mt-1">
                  <strong>Motivo:</strong> {bien.motivo_baja || 'No especificado'}
                </p>
                <p className="text-[11px] text-rose-700 mt-0.5">
                  Fecha de baja: {formatFecha(bien.fecha_baja)}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Contenido Pestaña Historial */}
        {tab === 'historial' && (
          <div className="p-6 space-y-4 text-xs">
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex items-start space-x-3">
              <div className="p-2 bg-emerald-100 text-emerald-800 rounded-lg">
                <ArrowLeftRight className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-slate-800">Módulo de Traslados (Fase 3)</h4>
                <p className="text-slate-600 mt-1 leading-relaxed">
                  Los registros de movimiento entre ambientes escolares y las Actas de Entrega /
                  Recepción en PDF se vincularán automáticamente a este equipo en la Fase 3.
                </p>
              </div>
            </div>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex items-start space-x-3">
              <div className="p-2 bg-amber-100 text-amber-800 rounded-lg">
                <Wrench className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-slate-800">
                  Hoja de Vida Técnica y Mantenimientos (Fase 3)
                </h4>
                <p className="text-slate-600 mt-1 leading-relaxed">
                  Las órdenes de servicio preventivo, cambios de repuestos y soporte técnico
                  correctivo se registrarán en la hoja de vida inmutable de este bien.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Pie de Modal */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <span className="text-[11px] text-slate-400 font-mono">ID: {bien.id}</span>
          <div className="flex items-center space-x-2">
            {canEdit && onEdit && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onEdit();
                }}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white font-semibold text-xs rounded-lg transition-colors"
              >
                Editar Bien
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 font-semibold text-xs rounded-lg border border-slate-300 transition-colors"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
