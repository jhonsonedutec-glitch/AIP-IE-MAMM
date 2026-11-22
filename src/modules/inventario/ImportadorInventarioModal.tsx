import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import {
  X,
  UploadCloud,
  FileSpreadsheet,
  Download,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  FileCheck,
} from 'lucide-react';
import {
  BienPatrimonial,
  Ambiente,
  CategoriaEquipo,
  EstadoConservacion,
  COLORES_LOTE_PREDEFINIDOS,
  detectarLoteAutomatico,
} from '@/types';
import { bienRepository } from '@/repositories';
import { useAuth } from '@/hooks';

interface ImportadorInventarioModalProps {
  bienesExistentes: BienPatrimonial[];
  ambientes: Ambiente[];
  categorias: CategoriaEquipo[];
  onClose: () => void;
  onSuccess: (resultado: { insertados: number; omitidos: number }) => void;
}

interface FilaPrevia {
  index: number;
  denominacion: string;
  marca: string;
  modelo: string;
  serie: string;
  codigo_patrimonial: string;
  color: string;
  estado_conservacion: EstadoConservacion;
  ambiente_id: string;
  ubicacion_detalle?: string;
  categoria_id: string;
  lote_etiqueta?: string;
  lote_color?: string;
  etiqueta_interna: string;
  observacion: string;
  estadoValidacion: 'VALIDO' | 'DUPLICADO' | 'ERROR';
  motivoError?: string;
}

export const ImportadorInventarioModal: React.FC<ImportadorInventarioModalProps> = ({
  bienesExistentes,
  ambientes,
  categorias,
  onClose,
  onSuccess,
}) => {
  const { user } = useAuth();
  const [archivoNombre, setArchivoNombre] = useState<string | null>(null);
  const [filas, setFilas] = useState<FilaPrevia[]>([]);
  const [ambienteDefecto, setAmbienteDefecto] = useState<string>(
    ambientes[0]?.id || ''
  );
  const [categoriaDefecto, setCategoriaDefecto] = useState<string>(
    categorias[0]?.id || ''
  );
  const [loteDefecto, setLoteDefecto] = useState<string>('');
  const [omitirDuplicados, setOmitirDuplicados] = useState(true);
  const [cargandoArchivo, setCargandoArchivo] = useState(false);
  const [importando, setImportando] = useState(false);
  const [errorGlobal, setErrorGlobal] = useState<string | null>(null);

  // Normalizador de texto para emparejamiento flexible de encabezados
  const normalizar = (txt: string) =>
    txt
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]/g, '')
      .trim();

  // Descarga de la plantilla oficial en Excel
  const handleDescargarPlantilla = () => {
    const dataModelo = [
      {
        'Denominación': 'LAPTOP',
        'Marca': 'LENOVO',
        'Modelo': 'THINKPAD E14',
        'Serie': 'PF3A9812',
        'Código Patrimonial': '740895000001',
        'Color': 'NEGRO',
        'Estado Conservación (N/B/R/M)': 'B',
        'Ambiente': ambientes[0]?.nombre || 'AIP 1',
        'Categoría': 'Laptops',
        'Lote': 'LOTE NARANJA',
        'Color de Lote': '#EA580C',
        'Etiqueta Interna (Opcional)': 'LAP-001',
        'Observaciones': 'Equipo entregado con cargador original 65W',
      },
      {
        'Denominación': 'COMPUTADORA DE ESCRITORIO',
        'Marca': 'HP',
        'Modelo': 'PRODESK 400 G7',
        'Serie': 'CZC1234567',
        'Código Patrimonial': '740895000002',
        'Color': 'NEGRO',
        'Estado Conservación (N/B/R/M)': 'B',
        'Ambiente': ambientes[0]?.nombre || 'AIP 1',
        'Categoría': 'PCs de Mesa',
        'Lote': 'LOTE VERDE',
        'Color de Lote': '#16A34A',
        'Etiqueta Interna (Opcional)': 'PC-001',
        'Observaciones': 'CPU con monitor 21.5 y periféricos',
      },
    ];

    const ws = XLSX.utils.json_to_sheet(dataModelo);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Anexo 01 Inventario');
    XLSX.writeFile(wb, 'Plantilla_Inventario_SIGI_AIP_MAMM.xlsx');
  };

  // Procesamiento del archivo Excel o CSV
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setArchivoNombre(file.name);
    setCargandoArchivo(true);
    setErrorGlobal(null);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const buffer = evt.target?.result as ArrayBuffer;
        const workbook = XLSX.read(buffer, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const rows: any[] = XLSX.utils.sheet_to_json(sheet, { defval: '' });

        if (rows.length === 0) {
          setErrorGlobal('El archivo cargado no contiene filas de datos.');
          setFilas([]);
          setCargandoArchivo(false);
          return;
        }

        procesarFilas(rows);
      } catch (err: any) {
        console.error('Error al parsear Excel:', err);
        setErrorGlobal('No se pudo procesar el archivo. Verifique el formato Excel o CSV.');
      } finally {
        setCargandoArchivo(false);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const procesarFilas = (rows: any[]) => {
    // Mapas de códigos existentes para verificación de unicidad
    const codigosExistentes = new Set(
      bienesExistentes
        .filter((b) => b.estado_operativo !== 'DE_BAJA' && b.codigo_patrimonial && b.codigo_patrimonial.toUpperCase() !== 'S/C')
        .map((b) => b.codigo_patrimonial.trim().toUpperCase())
    );

    const seriesExistentes = new Set(
      bienesExistentes
        .filter((b) => b.estado_operativo !== 'DE_BAJA' && b.serie && b.serie.toUpperCase() !== 'S/N')
        .map((b) => b.serie.trim().toUpperCase())
    );

    const codigosEnArchivo = new Set<string>();
    const seriesEnArchivo = new Set<string>();

    const filasProcesadas: FilaPrevia[] = rows.map((rawRow, idx) => {
      // Buscar valores con encabezados flexibles
      const getVal = (synonyms: string[]): string => {
        const synNorm = synonyms.map(normalizar);
        for (const key of Object.keys(rawRow)) {
          if (synNorm.includes(normalizar(key))) {
            return String(rawRow[key]).trim();
          }
        }
        return '';
      };

      const denominacion =
        getVal(['denominacion', 'descripcion', 'bien', 'equipo', 'nombre']) || '';
      const marca = getVal(['marca']) || 'GENÉRICO';
      const modelo = getVal(['modelo']) || 'S/M';
      const serie = getVal(['serie', 'nro serie', 'numero de serie', 'sn']) || 'S/N';
      const codigo_patrimonial =
        getVal(['codigo patrimonial', 'cod patrimonial', 'patrimonio', 'codigo']) || 'S/C';
      const color = getVal(['color']) || '';
      const estRaw = getVal(['estado conservacion', 'conservacion', 'estado', 'condicion']).toUpperCase();
      const estado_conservacion: EstadoConservacion = ['N', 'B', 'R', 'M'].includes(estRaw)
        ? (estRaw as EstadoConservacion)
        : 'B';

      // Resolver Ambiente
      const ambRaw = getVal(['ambiente', 'ubicacion', 'aula']);
      let ambiente_id = ambienteDefecto;
      if (ambRaw) {
        const match = ambientes.find(
          (a) => normalizar(a.nombre) === normalizar(ambRaw)
        );
        if (match) ambiente_id = match.id;
      }
      const ubicacion_detalle =
        getVal(['ubicacion detalle', 'detalle ubicacion', 'ambiente detalle']) || '';

      // Resolver Categoría
      const catRaw = getVal(['categoria', 'tipo']);
      let categoria_id = categoriaDefecto;
      if (catRaw) {
        const match = categorias.find(
          (c) => normalizar(c.nombre) === normalizar(catRaw)
        );
        if (match) categoria_id = match.id;
      }

      // Extraer observaciones primero para detección inteligente de lote
      const observacion =
        getVal(['observaciones', 'observacion', 'notas', 'nota']) || '';

      // Resolver Lote y Color con detección automática por texto (ej. "LAPTOP 4 VERDE", "YERDE")
      const loteRaw = getVal(['lote', 'lote / grupo', 'lote grupo', 'grupo lote', 'lotedotacion', 'dotacion']);
      const colorLoteRaw = getVal(['color de lote', 'color lote', 'color del lote', 'colorlote']);

      const { lote_etiqueta, lote_color } = detectarLoteAutomatico(
        observacion,
        loteRaw,
        colorLoteRaw,
        loteDefecto
      );

      const etiqueta_interna =
        getVal(['etiqueta interna', 'etiqueta', 'codigo interno', 'rotulado']) || '';

      // Validación de duplicados y campos
      let estadoValidacion: 'VALIDO' | 'DUPLICADO' | 'ERROR' = 'VALIDO';
      let motivoError: string | undefined;

      if (!denominacion) {
        estadoValidacion = 'ERROR';
        motivoError = 'Falta denominación del bien';
      } else {
        const codUpper = codigo_patrimonial.toUpperCase();
        const serieUpper = serie.toUpperCase();

        const esCodDuplicado =
          codUpper !== 'S/C' && (codigosExistentes.has(codUpper) || codigosEnArchivo.has(codUpper));
        const esSerieDuplicada =
          serieUpper !== 'S/N' && (seriesExistentes.has(serieUpper) || seriesEnArchivo.has(serieUpper));

        if (esCodDuplicado) {
          estadoValidacion = 'DUPLICADO';
          motivoError = `Código patrimonial "${codigo_patrimonial}" ya existe`;
        } else if (esSerieDuplicada) {
          estadoValidacion = 'DUPLICADO';
          motivoError = `Serie "${serie}" ya existe`;
        }

        if (codUpper !== 'S/C') codigosEnArchivo.add(codUpper);
        if (serieUpper !== 'S/N') seriesEnArchivo.add(serieUpper);
      }

      return {
        index: idx + 1,
        denominacion: denominacion.toUpperCase(),
        marca: marca.toUpperCase(),
        modelo: modelo.toUpperCase(),
        serie: serie.toUpperCase(),
        codigo_patrimonial: codigo_patrimonial.toUpperCase(),
        color: color.toUpperCase(),
        estado_conservacion,
        ambiente_id,
        ubicacion_detalle,
        categoria_id,
        lote_etiqueta,
        lote_color,
        etiqueta_interna: etiqueta_interna.toUpperCase(),
        observacion,
        estadoValidacion,
        motivoError,
      };
    });

    setFilas(filasProcesadas);
  };

  const filasAImportar = filas.filter((f) => {
    if (f.estadoValidacion === 'ERROR') return false;
    if (f.estadoValidacion === 'DUPLICADO' && omitirDuplicados) return false;
    return true;
  });

  const totalValidos = filas.filter((f) => f.estadoValidacion === 'VALIDO').length;
  const totalDuplicados = filas.filter((f) => f.estadoValidacion === 'DUPLICADO').length;
  const totalErrores = filas.filter((f) => f.estadoValidacion === 'ERROR').length;

  const handleConfirmarImportacion = async () => {
    if (filasAImportar.length === 0) return;

    setImportando(true);
    setErrorGlobal(null);

    const operador = user ? { uid: user.uid, email: user.email || '' } : undefined;

    const loteParaInsertar = filasAImportar.map((f) => ({
      denominacion: f.denominacion,
      marca: f.marca,
      modelo: f.modelo,
      serie: f.serie,
      codigo_patrimonial: f.codigo_patrimonial,
      tipo_codigo: (f.codigo_patrimonial === 'S/C' ? 'S/C' : 'CIC') as 'S/C' | 'CIC',
      color: f.color,
      estado_conservacion: f.estado_conservacion,
      estado_operativo: 'OPERATIVO' as const,
      ambiente_id: f.ambiente_id,
      ubicacion_detalle: f.ubicacion_detalle,
      categoria_id: f.categoria_id,
      lote_etiqueta: f.lote_etiqueta || '',
      lote_color: f.lote_color || '',
      etiqueta_interna: f.etiqueta_interna || '',
      codigo_qr: f.etiqueta_interna || f.codigo_patrimonial,
      observacion: f.observacion,
      total_prestamos: 0,
    }));

    try {
      const res = await bienRepository.importarLote(loteParaInsertar, operador);
      onSuccess({
        insertados: res.insertados,
        omitidos: filas.length - res.insertados,
      });
    } catch (err: any) {
      console.error('Error al importar:', err);
      setErrorGlobal(err.message || 'Error durante la inserción por lotes.');
    } finally {
      setImportando(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full border border-slate-200 overflow-hidden my-6 flex flex-col max-h-[90vh]">
        {/* Cabecera */}
        <div className="bg-slate-900 text-white p-5 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-emerald-600 rounded-xl text-white">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">
                Importador Masivo de Inventario (Excel / CSV)
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Carga de equipos compatible con Anexo 01 y validación de duplicados en tiempo real.
              </p>
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

        {/* Contenido scrolleable */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1 text-xs">
          {/* Zona de Descarga de Plantilla y Carga de Archivo */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex flex-col justify-between space-y-3">
              <div>
                <span className="font-bold text-slate-800 text-sm block">
                  Paso 1: Descargar Plantilla Oficial
                </span>
                <p className="text-slate-500 mt-1 leading-relaxed">
                  Utilice el archivo Excel preformateado con los encabezados oficiales requeridos
                  por el sistema y dos filas de ejemplo.
                </p>
              </div>
              <button
                type="button"
                onClick={handleDescargarPlantilla}
                className="inline-flex items-center space-x-2 px-3.5 py-2 bg-white hover:bg-slate-100 text-slate-800 font-semibold rounded-lg border border-slate-300 shadow-xs transition-colors self-start"
              >
                <Download className="w-4 h-4 text-emerald-600" />
                <span>Descargar Plantilla (.xlsx)</span>
              </button>
            </div>

            <div className="p-4 bg-emerald-50/50 border border-emerald-200 rounded-xl flex flex-col justify-between space-y-3">
              <div>
                <span className="font-bold text-emerald-950 text-sm block">
                  Paso 2: Subir Archivo Excel o CSV
                </span>
                <p className="text-emerald-800 mt-1 leading-relaxed">
                  Arrastre o seleccione el archivo con el inventario a cargar.
                </p>
              </div>
              <label className="inline-flex items-center space-x-2 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg shadow-xs cursor-pointer transition-colors self-start">
                <UploadCloud className="w-4 h-4" />
                <span>{archivoNombre ? 'Cambiar Archivo...' : 'Seleccionar Archivo...'}</span>
                <input
                  type="file"
                  accept=".xlsx, .xls, .csv"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          {/* Configuración de Valores por Defecto */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
            <span className="font-bold text-slate-800 block text-xs uppercase tracking-wider text-slate-500">
              Valores Predeterminados (Para filas sin columna Ambiente, Categoría o Lote)
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Ambiente por Defecto
                </label>
                <select
                  value={ambienteDefecto}
                  onChange={(e) => setAmbienteDefecto(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  {ambientes.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.nombre}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Categoría por Defecto
                </label>
                <select
                  value={categoriaDefecto}
                  onChange={(e) => setCategoriaDefecto(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  {categorias.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nombre}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Lote por Defecto (Opcional)
                </label>
                <select
                  value={loteDefecto}
                  onChange={(e) => setLoteDefecto(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="">(Sin lote predeterminado)</option>
                  {COLORES_LOTE_PREDEFINIDOS.map((item) => (
                    <option key={item.nombre} value={item.nombre}>
                      {item.nombre} ({item.color})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {errorGlobal && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 flex items-center space-x-2">
              <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span className="font-medium">{errorGlobal}</span>
            </div>
          )}

          {/* Barra de Resumen de Validación */}
          {filas.length > 0 && (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-slate-100 rounded-xl border border-slate-200">
                <div className="flex items-center space-x-4">
                  <span className="font-bold text-slate-800">
                    Total Filas: {filas.length}
                  </span>
                  <span className="inline-flex items-center text-emerald-700 font-semibold bg-emerald-100/80 px-2.5 py-0.5 rounded-full">
                    <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                    {totalValidos} Válidos
                  </span>
                  <span className="inline-flex items-center text-amber-700 font-semibold bg-amber-100/80 px-2.5 py-0.5 rounded-full">
                    <AlertTriangle className="w-3.5 h-3.5 mr-1" />
                    {totalDuplicados} Duplicados
                  </span>
                  {totalErrores > 0 && (
                    <span className="inline-flex items-center text-rose-700 font-semibold bg-rose-100/80 px-2.5 py-0.5 rounded-full">
                      <XCircle className="w-3.5 h-3.5 mr-1" />
                      {totalErrores} Errores
                    </span>
                  )}
                </div>

                <label className="flex items-center space-x-2 cursor-pointer select-none text-slate-700 font-medium">
                  <input
                    type="checkbox"
                    checked={omitirDuplicados}
                    onChange={(e) => setOmitirDuplicados(e.target.checked)}
                    className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
                  />
                  <span>Omitir duplicados automáticamente</span>
                </label>
              </div>

              {/* Tabla de Previsualización */}
              <div className="border border-slate-200 rounded-xl overflow-hidden max-h-64 overflow-y-auto">
                <table className="w-full text-left border-collapse text-[11px]">
                  <thead className="bg-slate-100 text-slate-700 font-semibold sticky top-0 shadow-xs">
                    <tr>
                      <th className="py-2 px-3 w-12 text-center">N°</th>
                      <th className="py-2 px-3">Estado</th>
                      <th className="py-2 px-3">Lote</th>
                      <th className="py-2 px-3">Denominación</th>
                      <th className="py-2 px-3">Marca / Modelo</th>
                      <th className="py-2 px-3">Serie</th>
                      <th className="py-2 px-3">Cód. Patrimonial</th>
                      <th className="py-2 px-3">Observaciones / Alerta</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filas.map((f) => (
                      <tr
                        key={f.index}
                        className={
                          f.estadoValidacion === 'ERROR'
                            ? 'bg-rose-50/50'
                            : f.estadoValidacion === 'DUPLICADO'
                            ? 'bg-amber-50/50'
                            : 'hover:bg-slate-50'
                        }
                      >
                        <td className="py-1.5 px-3 text-slate-400 font-mono font-medium text-center">
                          {String(f.index).padStart(2, '0')}
                        </td>
                        <td className="py-1.5 px-3">
                          {f.estadoValidacion === 'VALIDO' && (
                            <span className="text-emerald-700 font-bold bg-emerald-100 px-1.5 py-0.5 rounded">
                              Válido
                            </span>
                          )}
                          {f.estadoValidacion === 'DUPLICADO' && (
                            <span className="text-amber-700 font-bold bg-amber-100 px-1.5 py-0.5 rounded">
                              Duplicado
                            </span>
                          )}
                          {f.estadoValidacion === 'ERROR' && (
                            <span className="text-rose-700 font-bold bg-rose-100 px-1.5 py-0.5 rounded">
                              Error
                            </span>
                          )}
                        </td>
                        <td className="py-1.5 px-3">
                          {f.lote_etiqueta ? (
                            <span
                              className="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded text-[10px] font-bold border"
                              style={{
                                backgroundColor: `${f.lote_color || '#6366F1'}15`,
                                borderColor: `${f.lote_color || '#6366F1'}50`,
                                color: f.lote_color || '#6366F1',
                              }}
                            >
                              <span
                                className="w-1.5 h-1.5 rounded-full inline-block shrink-0"
                                style={{ backgroundColor: f.lote_color || '#6366F1' }}
                              />
                              <span className="truncate max-w-[90px]">{f.lote_etiqueta}</span>
                            </span>
                          ) : (
                            <span className="text-slate-400 text-[10px]">—</span>
                          )}
                        </td>
                        <td className="py-1.5 px-3 font-semibold text-slate-800">
                          {f.denominacion || '—'}
                        </td>
                        <td className="py-1.5 px-3 text-slate-600">
                          {f.marca} {f.modelo}
                        </td>
                        <td className="py-1.5 px-3 font-mono text-slate-700">{f.serie}</td>
                        <td className="py-1.5 px-3 font-mono text-slate-700">
                          {f.codigo_patrimonial}
                        </td>
                        <td className="py-1.5 px-3 text-slate-500">
                          {f.motivoError ? (
                            <span className="text-rose-600 font-medium">{f.motivoError}</span>
                          ) : (
                            f.observacion || '—'
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Pie del Modal */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
          <span className="text-xs text-slate-500">
            {filas.length > 0
              ? `Se insertarán ${filasAImportar.length} bienes patrimoniales en lotes.`
              : 'Suba un archivo para iniciar la previsualización.'}
          </span>
          <div className="flex items-center space-x-2">
            <button
              type="button"
              disabled={importando}
              onClick={onClose}
              className="px-4 py-2 text-slate-600 hover:text-slate-800 font-semibold text-xs"
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={importando || filasAImportar.length === 0 || cargandoArchivo}
              onClick={handleConfirmarImportacion}
              className="inline-flex items-center space-x-1.5 px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg shadow-sm disabled:opacity-50 transition-colors text-xs"
            >
              <FileCheck className="w-4 h-4" />
              <span>
                {importando
                  ? 'Escribiendo en Firestore...'
                  : `Confirmar Importación (${filasAImportar.length})`}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
