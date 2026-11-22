import React, { useState } from 'react';
import * as XLSX from 'xlsx';
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

      const workbook = XLSX.utils.book_new();

      // 1. Hoja Inventario
      const wsInventario = XLSX.utils.json_to_sheet(
        bienesData.map((b) => ({
          ID: b.id,
          'Código Patrimonial': b.codigo_patrimonial || 'S/C',
          'Etiqueta QR': b.etiqueta_interna || 'S/E',
          Denominación: b.denominacion,
          Marca: b.marca || '—',
          Modelo: b.modelo || '—',
          'N° Serie': b.serie || 'S/N',
          Color: b.color || '—',
          Lote: b.lote_etiqueta || '—',
          'Color Lote': b.lote_color || '—',
          Conservación: b.estado_conservacion,
          'Estado Operativo': b.estado_operativo,
          'ID Ambiente': b.ambiente_id,
          'Detalle Ubicación': b.ubicacion_detalle || '—',
          Observaciones: b.observacion || '—',
        }))
      );
      XLSX.utils.book_append_sheet(workbook, wsInventario, 'Inventario');

      // 2. Hoja Traslados
      const wsTraslados = XLSX.utils.json_to_sheet(
        movData.map((m) => ({
          ID: m.id,
          'Lote Traslado': m.lote_id || '—',
          'Fecha Movimiento': m.fecha_movimiento ? new Date(m.fecha_movimiento).toISOString() : '',
          'ID Bien': m.bien_id,
          'Código Patrimonial': m.codigo_patrimonial,
          'Etiqueta QR': m.etiqueta_interna || 'S/E',
          Denominación: m.denominacion || '',
          'ID Ambiente Origen': m.ambiente_origen_id,
          'ID Ambiente Destino': m.ambiente_destino_id,
          'Detalle Destino': m.ubicacion_detalle_destino || '',
          Motivo: m.motivo,
          'Responsable Entrega': m.responsable_entrega || '',
          'Responsable Recepción': m.responsable_recepcion,
          'Operador Email': m.usuario_email || '',
        }))
      );
      XLSX.utils.book_append_sheet(workbook, wsTraslados, 'Traslados');

      // 3. Hoja Mantenimientos
      const wsMantenimientos = XLSX.utils.json_to_sheet(
        mantData.map((m) => ({
          ID: m.id,
          'ID Bien': m.bien_id,
          'Código Patrimonial': m.codigo_patrimonial,
          'Etiqueta QR': m.etiqueta_interna || 'S/E',
          Denominación: m.denominacion || '',
          Tipo: m.tipo,
          'Fecha Inicio': m.fecha_inicio ? new Date(m.fecha_inicio).toISOString() : '',
          'Fecha Fin': m.fecha_fin ? new Date(m.fecha_fin).toISOString() : '',
          Técnico: m.tecnico,
          Falla: m.descripcion_falla,
          'Trabajo Realizado': m.trabajo_realizado,
          Repuestos: m.repuestos,
          'Conservación Resultante': m.estado_conservacion_resultante,
          'Estado Operativo Resultante': m.estado_operativo_resultante || '',
          Cerrado: m.cerrado ? 'SÍ' : 'NO',
        }))
      );
      XLSX.utils.book_append_sheet(workbook, wsMantenimientos, 'Mantenimientos');

      // 4. Hoja Préstamos
      const wsPrestamos = XLSX.utils.json_to_sheet(
        prestData.map((p) => ({
          ID: p.id,
          Tipo: p.tipo,
          'ID Docente': p.docente_id,
          'Docente Nombre': p.docente_nombre,
          'ID Área': p.area_id,
          'Área Nombre': p.area_nombre,
          'Grado y Sección': p.grado_seccion,
          'Ambiente de Uso': p.ambiente_uso,
          'Cantidad Equipos': p.cantidad_equipos || p.bienes_ids?.length || 0,
          'Equipos IDs': (p.bienes_ids || []).join(', '),
          Accesorios: p.accesorios_entregados,
          'Fecha Salida': p.fecha_salida ? new Date(p.fecha_salida).toISOString() : '',
          'Fecha Devolución Estimada': p.fecha_devolucion_estimada
            ? new Date(p.fecha_devolucion_estimada).toISOString()
            : '',
          'Fecha Devolución Real': p.fecha_devolucion_real
            ? new Date(p.fecha_devolucion_real).toISOString()
            : '',
          Estado: p.estado,
          'Observación Retorno': p.observacion_retorno || '',
        }))
      );
      XLSX.utils.book_append_sheet(workbook, wsPrestamos, 'Prestamos');

      // 5. Hoja Docentes
      const wsDocentes = XLSX.utils.json_to_sheet(
        docData.map((d) => ({
          ID: d.id,
          DNI: d.dni,
          'Nombres y Apellidos': d.nombres_apellidos,
          Especialidad: d.especialidad || '',
          'ID Área Principal': d.area_principal_id || '',
          Celular: d.celular || '',
          Email: d.email || '',
          Activo: d.activo ? 'SÍ' : 'NO',
        }))
      );
      XLSX.utils.book_append_sheet(workbook, wsDocentes, 'Docentes');

      // 6. Hoja Ambientes
      const wsAmbientes = XLSX.utils.json_to_sheet(
        ambData.map((a) => ({
          ID: a.id,
          Nombre: a.nombre,
          Encargado: a.encargado,
          Descripción: a.descripcion,
          'Permite Préstamo (AIP)': a.permite_prestamo ? 'SÍ' : 'NO',
          Activo: a.activo ? 'SÍ' : 'NO',
        }))
      );
      XLSX.utils.book_append_sheet(workbook, wsAmbientes, 'Ambientes');

      // 7. Hoja Categorías
      const wsCategorias = XLSX.utils.json_to_sheet(
        catData.map((c) => ({
          ID: c.id,
          Nombre: c.nombre,
          'Prefijo Etiqueta': c.prefijo_etiqueta,
          Activo: c.activo ? 'SÍ' : 'NO',
        }))
      );
      XLSX.utils.book_append_sheet(workbook, wsCategorias, 'Categorias');

      // 8. Hoja Áreas Curriculares
      const wsAreas = XLSX.utils.json_to_sheet(
        areasData.map((ar) => ({
          ID: ar.id,
          Nombre: ar.nombre,
          Activo: ar.activo ? 'SÍ' : 'NO',
        }))
      );
      XLSX.utils.book_append_sheet(workbook, wsAreas, 'Areas');

      // 9. Hoja Bloques de Equipos
      const wsBloques = XLSX.utils.json_to_sheet(
        bloqData.map((bl) => ({
          ID: bl.id,
          Nombre: bl.nombre,
          Descripción: bl.descripcion,
          'Código QR Lote': bl.codigo_qr_lote || '',
          'Total Bienes': (bl.bienes_ids || []).length,
          'IDs Bienes': (bl.bienes_ids || []).join(', '),
          Activo: bl.activo ? 'SÍ' : 'NO',
        }))
      );
      XLSX.utils.book_append_sheet(workbook, wsBloques, 'Bloques');

      const filename = `SIGI-AIP-MAMM_Backup_Consolidado_${obtenerTimestampArchivo()}.xlsx`;
      XLSX.writeFile(workbook, filename);

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
