import React, { useState } from 'react';
import {
  FileSpreadsheet,
  Download,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  FileJson,
  Lock,
} from 'lucide-react';
import { InstitucionConfig } from '@/types';
import {
  bienRepository,
  ambienteRepository,
  categoriaRepository,
  configuracionRepository,
  movimientoRepository,
  mantenimientoRepository,
  docenteRepository,
  areaCurricularRepository,
  bloqueRepository,
  prestamoRepository,
  auditoriaRepository,
} from '@/repositories';
import { useAuth } from '@/hooks';
import { generarBackupConsolidadoExcel } from '@/utils/excelProfesional';

interface RespaldosTabProps {
  config: InstitucionConfig | null;
}

export const RespaldosTab: React.FC<RespaldosTabProps> = ({ config }) => {
  const { user, perfil } = useAuth();
  const esAdmin = perfil?.rol === 'ADMIN';

  const [generandoJson, setGenerandoJson] = useState(false);
  const [generandoExcel, setGenerandoExcel] = useState(false);
  const [feedback, setFeedback] = useState<{ tipo: 'ok' | 'err'; msg: string } | null>(null);

  if (!esAdmin) {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-8 text-center max-w-lg mx-auto my-12 space-y-3">
        <Lock className="w-10 h-10 text-amber-600 mx-auto" />
        <h3 className="font-bold text-base text-amber-900">Acceso Restringido a Backups</h3>
        <p className="text-xs text-amber-800">
          La descarga y custodia de respaldos institucionales está reservada exclusivamente para el
          Administrador del Aula de Innovación Pedagógica.
        </p>
      </div>
    );
  }

  const obtenerTimestampArchivo = () => {
    const d = new Date();
    const YYYY = d.getFullYear();
    const MM = String(d.getMonth() + 1).padStart(2, '0');
    const DD = String(d.getDate()).padStart(2, '0');
    const HH = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    return `${YYYY}${MM}${DD}_${HH}${mm}`;
  };

  // 1. Descarga de Backup Completo en JSON
  const handleDescargarBackupJson = async () => {
    setGenerandoJson(true);
    setFeedback(null);
    try {
      // Consultar todas las colecciones maestras y operativas activas
      const [
        confData,
        ambData,
        catData,
        bienesData,
        movData,
        mantData,
        docData,
        areasData,
        bloqData,
        prestData,
      ] = await Promise.all([
        configuracionRepository.obtenerInstitucion(),
        ambienteRepository.listar(),
        categoriaRepository.listar(),
        bienRepository.listar(),
        movimientoRepository.listar(),
        mantenimientoRepository.listar(),
        docenteRepository.listar(),
        areaCurricularRepository.listar(),
        bloqueRepository.listar(),
        prestamoRepository.listar(),
      ]);

      const backupData = {
        metadata: {
          sistema: 'SIGI-AIP MAMM',
          version: '1.0.0',
          institucion: config?.nombre_ie || 'I.E. MANUEL ANTONIO MESONES MURO',
          ugel: config?.ugel || 'BAGUA',
          dre: config?.dre || 'AMAZONAS',
          fecha_generacion: new Date().toISOString(),
          operador: {
            uid: user?.uid || 'UNKNOWN',
            email: user?.email || 'admin@aip.edu.pe',
          },
          total_colecciones: 10,
          conteo_registros: {
            configuracion: confData ? 1 : 0,
            ambientes: ambData.length,
            categorias_equipo: catData.length,
            bienes: bienesData.length,
            movimientos: movData.length,
            mantenimientos: mantData.length,
            docentes: docData.length,
            areas_curriculares: areasData.length,
            bloques_equipos: bloqData.length,
            prestamos: prestData.length,
          },
        },
        configuracion: confData ? [confData] : [],
        ambientes: ambData,
        categorias_equipo: catData,
        bienes: bienesData,
        movimientos: movData,
        mantenimientos: mantData,
        docentes: docData,
        areas_curriculares: areasData,
        bloques_equipos: bloqData,
        prestamos: prestData,
      };

      const jsonStr = JSON.stringify(backupData, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const filename = `SIGI-AIP-MAMM_Backup_${obtenerTimestampArchivo()}.json`;
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      // Registrar evento en auditoría inmutable
      await auditoriaRepository.registrar({
        usuario_id: user?.uid || 'ADMIN',
        usuario_email: user?.email || 'admin@aip.edu.pe',
        accion: 'BACKUP_RESTORE',
        coleccion: 'sistema',
        documento_id: 'backup_json',
        detalle: `Descarga de respaldo institucional JSON completo (${filename}) con ${bienesData.length} bienes y ${prestData.length} préstamos.`,
      });

      setFeedback({
        tipo: 'ok',
        msg: `Respaldo JSON descargado exitosamente: ${filename}`,
      });
    } catch (err: any) {
      console.error('Error al generar respaldo JSON:', err);
      setFeedback({
        tipo: 'err',
        msg: err.message || 'Error al generar el respaldo institucional JSON.',
      });
    } finally {
      setGenerandoJson(false);
    }
  };

  // 2. Descarga de Backup Consolidado en Excel Multi-Hoja
  const handleDescargarBackupExcel = async () => {
    setGenerandoExcel(true);
    setFeedback(null);
    try {
      const [
        ambData,
        catData,
        bienesData,
        movData,
        mantData,
        docData,
        areasData,
        bloqData,
        prestData,
      ] = await Promise.all([
        ambienteRepository.listar(),
        categoriaRepository.listar(),
        bienRepository.listar(),
        movimientoRepository.listar(),
        mantenimientoRepository.listar(),
        docenteRepository.listar(),
        areaCurricularRepository.listar(),
        bloqueRepository.listar(),
        prestamoRepository.listar(),
      ]);

      const filename = `SIGI-AIP-MAMM_Backup_Consolidado_${obtenerTimestampArchivo()}.xlsx`;

      await generarBackupConsolidadoExcel({
        nombreArchivo: filename,
        config,
        operadorEmail: user?.email || 'admin@aip.edu.pe',
        hojas: [
          {
            nombre: 'Inventario',
            columnas: [
              { header: 'ID Bien', key: 'id', width: 22, isTextFormat: true },
              { header: 'Código Patrimonial', key: 'codigo_patrimonial', width: 18, isTextFormat: true },
              { header: 'Etiqueta QR', key: 'etiqueta_interna', width: 14, isTextFormat: true },
              { header: 'Denominación', key: 'denominacion', width: 32 },
              { header: 'Marca', key: 'marca', width: 16 },
              { header: 'Modelo', key: 'modelo', width: 16 },
              { header: 'N° Serie', key: 'serie', width: 18, isTextFormat: true },
              { header: 'Color', key: 'color', width: 12 },
              { header: 'Lote', key: 'lote_etiqueta', width: 16, isLote: true },
              { header: 'Color Lote', key: 'lote_color', width: 14 },
              { header: 'Conservación', key: 'estado_conservacion', width: 14 },
              { header: 'Estado Operativo', key: 'estado_operativo', width: 18, isEstado: true },
              { header: 'ID Ambiente', key: 'ambiente_id', width: 20 },
              { header: 'Detalle Ubicación', key: 'ubicacion_detalle', width: 22 },
              { header: 'Observaciones', key: 'observacion', width: 32 },
            ],
            datos: bienesData,
          },
          {
            nombre: 'Traslados',
            columnas: [
              { header: 'ID Traslado', key: 'id', width: 20, isTextFormat: true },
              { header: 'Lote Traslado', key: 'lote_id', width: 18, isTextFormat: true },
              { header: 'Fecha Movimiento', key: 'fecha_movimiento', width: 22 },
              { header: 'ID Bien', key: 'bien_id', width: 20, isTextFormat: true },
              { header: 'Código Patrimonial', key: 'codigo_patrimonial', width: 18, isTextFormat: true },
              { header: 'Etiqueta QR', key: 'etiqueta_interna', width: 14, isTextFormat: true },
              { header: 'Denominación', key: 'denominacion', width: 28 },
              { header: 'ID Ambiente Origen', key: 'ambiente_origen_id', width: 20 },
              { header: 'ID Ambiente Destino', key: 'ambiente_destino_id', width: 20 },
              { header: 'Detalle Destino', key: 'ubicacion_detalle_destino', width: 22 },
              { header: 'Motivo', key: 'motivo', width: 30 },
              { header: 'Responsable Entrega', key: 'responsable_entrega', width: 22 },
              { header: 'Responsable Recepción', key: 'responsable_recepcion', width: 22 },
              { header: 'Operador Email', key: 'usuario_email', width: 24 },
            ],
            datos: movData.map((m) => ({
              ...m,
              fecha_movimiento: m.fecha_movimiento
                ? new Date(m.fecha_movimiento).toLocaleString('es-PE')
                : '—',
            })),
          },
          {
            nombre: 'Mantenimientos',
            columnas: [
              { header: 'ID Mantenimiento', key: 'id', width: 20, isTextFormat: true },
              { header: 'ID Bien', key: 'bien_id', width: 20, isTextFormat: true },
              { header: 'Código Patrimonial', key: 'codigo_patrimonial', width: 18, isTextFormat: true },
              { header: 'Etiqueta QR', key: 'etiqueta_interna', width: 14, isTextFormat: true },
              { header: 'Denominación', key: 'denominacion', width: 28 },
              { header: 'Tipo', key: 'tipo', width: 14 },
              { header: 'Fecha Inicio', key: 'fecha_inicio', width: 16 },
              { header: 'Fecha Fin', key: 'fecha_fin', width: 16 },
              { header: 'Técnico', key: 'tecnico', width: 20 },
              { header: 'Falla', key: 'descripcion_falla', width: 30 },
              { header: 'Trabajo Realizado', key: 'trabajo_realizado', width: 30 },
              { header: 'Repuestos', key: 'repuestos', width: 20 },
              { header: 'Conservación Resultante', key: 'estado_conservacion_resultante', width: 16 },
              { header: 'Estado Operativo Resultante', key: 'estado_operativo_resultante', width: 18, isEstado: true },
              { header: 'Cerrado', key: 'cerrado_str', width: 12 },
            ],
            datos: mantData.map((m) => ({
              ...m,
              fecha_inicio: m.fecha_inicio ? new Date(m.fecha_inicio).toLocaleDateString('es-PE') : '—',
              fecha_fin: m.fecha_fin ? new Date(m.fecha_fin).toLocaleDateString('es-PE') : '—',
              cerrado_str: m.cerrado ? 'SÍ' : 'NO',
            })),
          },
          {
            nombre: 'Prestamos',
            columnas: [
              { header: 'ID Préstamo', key: 'id', width: 20, isTextFormat: true },
              { header: 'Tipo', key: 'tipo', width: 12 },
              { header: 'ID Docente', key: 'docente_id', width: 18 },
              { header: 'Docente Nombre', key: 'docente_nombre', width: 26 },
              { header: 'ID Área', key: 'area_id', width: 16 },
              { header: 'Área Nombre', key: 'area_nombre', width: 22 },
              { header: 'Grado y Sección', key: 'grado_seccion', width: 16 },
              { header: 'Ambiente de Uso', key: 'ambiente_uso', width: 20 },
              { header: 'Cantidad Equipos', key: 'cantidad_equipos', width: 12 },
              { header: 'Equipos IDs', key: 'equipos_ids', width: 30 },
              { header: 'Accesorios', key: 'accesorios_entregados', width: 20 },
              { header: 'Fecha Salida', key: 'fecha_salida', width: 20 },
              { header: 'Fecha Devolución Estimada', key: 'fecha_devolucion_estimada', width: 20 },
              { header: 'Fecha Devolución Real', key: 'fecha_devolucion_real', width: 20 },
              { header: 'Estado', key: 'estado', width: 16, isEstado: true },
              { header: 'Observación Retorno', key: 'observacion_retorno', width: 28 },
            ],
            datos: prestData.map((p) => ({
              ...p,
              cantidad_equipos: p.cantidad_equipos || p.bienes_ids?.length || 0,
              equipos_ids: (p.bienes_ids || []).join(', '),
              fecha_salida: p.fecha_salida ? new Date(p.fecha_salida).toLocaleString('es-PE') : '',
              fecha_devolucion_estimada: p.fecha_devolucion_estimada
                ? new Date(p.fecha_devolucion_estimada).toLocaleString('es-PE')
                : '',
              fecha_devolucion_real: p.fecha_devolucion_real
                ? new Date(p.fecha_devolucion_real).toLocaleString('es-PE')
                : '',
            })),
          },
          {
            nombre: 'Docentes',
            columnas: [
              { header: 'ID Docente', key: 'id', width: 18, isTextFormat: true },
              { header: 'DNI', key: 'dni', width: 14, isTextFormat: true },
              { header: 'Nombres y Apellidos', key: 'nombres_apellidos', width: 28 },
              { header: 'Especialidad', key: 'especialidad', width: 22 },
              { header: 'ID Área Principal', key: 'area_principal_id', width: 18 },
              { header: 'Celular', key: 'celular', width: 16, isTextFormat: true },
              { header: 'Email', key: 'email', width: 24 },
              { header: 'Activo', key: 'activo_str', width: 10 },
            ],
            datos: docData.map((d) => ({ ...d, activo_str: d.activo ? 'SÍ' : 'NO' })),
          },
          {
            nombre: 'Ambientes',
            columnas: [
              { header: 'ID Ambiente', key: 'id', width: 18, isTextFormat: true },
              { header: 'Nombre', key: 'nombre', width: 24 },
              { header: 'Encargado', key: 'encargado', width: 24 },
              { header: 'Descripción', key: 'descripcion', width: 30 },
              { header: 'Permite Préstamo (AIP)', key: 'permite_prestamo_str', width: 18 },
              { header: 'Activo', key: 'activo_str', width: 10 },
            ],
            datos: ambData.map((a) => ({
              ...a,
              permite_prestamo_str: a.permite_prestamo ? 'SÍ' : 'NO',
              activo_str: a.activo ? 'SÍ' : 'NO',
            })),
          },
          {
            nombre: 'Categorias',
            columnas: [
              { header: 'ID Categoría', key: 'id', width: 18, isTextFormat: true },
              { header: 'Nombre', key: 'nombre', width: 24 },
              { header: 'Prefijo Etiqueta', key: 'prefijo_etiqueta', width: 18 },
              { header: 'Activo', key: 'activo_str', width: 10 },
            ],
            datos: catData.map((c) => ({ ...c, activo_str: c.activo ? 'SÍ' : 'NO' })),
          },
          {
            nombre: 'Areas',
            columnas: [
              { header: 'ID Área', key: 'id', width: 18, isTextFormat: true },
              { header: 'Nombre', key: 'nombre', width: 28 },
              { header: 'Activo', key: 'activo_str', width: 10 },
            ],
            datos: areasData.map((ar) => ({ ...ar, activo_str: ar.activo ? 'SÍ' : 'NO' })),
          },
          {
            nombre: 'Bloques',
            columnas: [
              { header: 'ID Bloque', key: 'id', width: 18, isTextFormat: true },
              { header: 'Nombre', key: 'nombre', width: 24 },
              { header: 'Descripción', key: 'descripcion', width: 30 },
              { header: 'Código QR Lote', key: 'codigo_qr_lote', width: 20, isTextFormat: true },
              { header: 'Total Bienes', key: 'total_bienes', width: 14 },
              { header: 'IDs Bienes', key: 'bienes_ids_str', width: 35 },
              { header: 'Activo', key: 'activo_str', width: 10 },
            ],
            datos: bloqData.map((bl) => ({
              ...bl,
              total_bienes: (bl.bienes_ids || []).length,
              bienes_ids_str: (bl.bienes_ids || []).join(', '),
              activo_str: bl.activo ? 'SÍ' : 'NO',
            })),
          },
        ],
      });

      // Registrar evento en auditoría inmutable
      await auditoriaRepository.registrar({
        usuario_id: user?.uid || 'ADMIN',
        usuario_email: user?.email || 'admin@aip.edu.pe',
        accion: 'BACKUP_RESTORE',
        coleccion: 'sistema',
        documento_id: 'backup_xlsx',
        detalle: `Descarga de respaldo consolidado Excel multi-hoja (${filename}) con 9 colecciones institucionales.`,
      });

      setFeedback({
        tipo: 'ok',
        msg: `Respaldo Consolidado Excel descargado exitosamente: ${filename}`,
      });
    } catch (err: any) {
      console.error('Error al generar respaldo Excel:', err);
      setFeedback({
        tipo: 'err',
        msg: err.message || 'Error al generar el respaldo consolidado en Excel.',
      });
    } finally {
      setGenerandoExcel(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Feedback banner */}
      {feedback && (
        <div
          className={`p-4 rounded-xl border text-xs flex items-center justify-between ${
            feedback.tipo === 'ok'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
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
            className="text-slate-400 hover:text-slate-600 text-xs font-bold"
          >
            &times;
          </button>
        </div>
      )}

      {/* Tarjeta Informativa de Seguridad */}
      <div className="bg-slate-900 text-white p-6 rounded-2xl shadow-xs space-y-3">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-emerald-500 rounded-xl text-white">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white">
              Respaldos Institucionales de Seguridad y Contingencia
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Descarga la base de datos completa de SIGI-AIP MAMM para almacenamiento en frío (USB, Google Drive institucional o servidor de respaldo).
            </p>
          </div>
        </div>
        <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400 flex-wrap gap-2">
          <span>
            Cada descarga queda registrada de forma inmutable en el registro de auditoría del sistema.
          </span>
          <span className="text-emerald-400 font-semibold font-mono">
            Estado de Datos: Sincronizado en tiempo real
          </span>
        </div>
      </div>

      {/* Opciones de Respaldo */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Opción 1: Backup JSON Completo */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
                <FileJson className="w-6 h-6" />
              </div>
              <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-indigo-100 text-indigo-800">
                10 Colecciones
              </span>
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-900">
                Respaldo Completo en Formato JSON (.json)
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Estructura canónica nativa con metadatos de auditoría, ideal para migraciones de servidor, restauraciones de desastre o scripts de procesamiento automatizado.
              </p>
            </div>

            <ul className="text-[11px] text-slate-600 space-y-1 bg-slate-50 p-3 rounded-xl border border-slate-100 font-mono">
              <li>&bull; configuracion + ambientes + categorias</li>
              <li>&bull; bienes (con lotes y colores)</li>
              <li>&bull; movimientos + mantenimientos</li>
              <li>&bull; docentes + areas + bloques + prestamos</li>
            </ul>
          </div>

          <button
            type="button"
            disabled={generandoJson || generandoExcel}
            onClick={handleDescargarBackupJson}
            className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center justify-center space-x-2 cursor-pointer"
          >
            {generandoJson ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin inline-block" />
                <span>Empaquetando datos JSON...</span>
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                <span>Descargar Backup Completo (.json)</span>
              </>
            )}
          </button>
        </div>

        {/* Opción 2: Backup Consolidado Excel Multi-Hoja */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
                <FileSpreadsheet className="w-6 h-6" />
              </div>
              <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800">
                Libro Multi-hoja
              </span>
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-900">
                Respaldo Consolidado en Excel (.xlsx)
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Genera un solo archivo de Microsoft Excel con 9 pestañas independientes listas para apertura inmediata, auditoría administrativa o consulta offline.
              </p>
            </div>

            <ul className="text-[11px] text-slate-600 space-y-1 bg-slate-50 p-3 rounded-xl border border-slate-100 font-mono">
              <li>&bull; Hojas: Inventario, Traslados, Mantenimientos</li>
              <li>&bull; Hojas: Prestamos, Docentes, Ambientes</li>
              <li>&bull; Hojas: Categorias, Areas, Bloques</li>
            </ul>
          </div>

          <button
            type="button"
            disabled={generandoJson || generandoExcel}
            onClick={handleDescargarBackupExcel}
            className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center justify-center space-x-2 cursor-pointer"
          >
            {generandoExcel ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin inline-block" />
                <span>Construyendo libro Excel...</span>
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                <span>Descargar Respaldo Consolidado (.xlsx)</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
