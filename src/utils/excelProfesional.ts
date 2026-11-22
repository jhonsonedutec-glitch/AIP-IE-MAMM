import ExcelJS from 'exceljs';
import { InstitucionConfig, formatearNombreIE } from '@/types';

export interface ColumnaReporteExcel {
  header: string;
  key: string;
  width?: number;
  align?: 'left' | 'center' | 'right';
  isTextFormat?: boolean; // Para códigos patrimoniales, DNI, series, evitando 7.408E+11
  isLote?: boolean;
  isEstado?: boolean;
}

export interface OpcionesReporteExcel {
  tituloReporte: string;
  subtitulo?: string;
  nombreHoja?: string;
  nombreArchivo: string;
  config?: InstitucionConfig | null;
  columnas: ColumnaReporteExcel[];
  datos: Record<string, any>[];
  incluirFirmas?: boolean;
  orientacion?: 'landscape' | 'portrait';
}

/**
 * Carga la insignia oficial de la institución (/logo-mamm.jpg) como ArrayBuffer
 */
async function cargarLogoInstitucional(): Promise<ArrayBuffer | null> {
  try {
    const res = await fetch('/logo-mamm.jpg');
    if (!res.ok) return null;
    return await res.arrayBuffer();
  } catch (err) {
    console.warn('No se pudo cargar el logo para incrustar en Excel:', err);
    return null;
  }
}

/**
 * Aplica estilos semánticos a celdas de lote y estado operativo/conservación
 */
function aplicarEstilosSemanticos(
  cell: ExcelJS.Cell,
  valor: any,
  tipo: 'lote' | 'estado'
) {
  const str = String(valor || '').trim().toUpperCase();
  if (!str || str === '—' || str === '-') return;

  if (tipo === 'lote') {
    if (str.includes('VERDE')) {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFDCFCE7' }, // Verde suave
      };
      cell.font = { name: 'Calibri', size: 9, bold: true, color: { argb: 'FF166534' } };
    } else if (str.includes('NARANJA')) {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFFFEDD5' }, // Naranja suave
      };
      cell.font = { name: 'Calibri', size: 9, bold: true, color: { argb: 'FF9A3412' } };
    } else if (str.includes('AZUL') || str.includes('CELESTE')) {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFDBEAFE' },
      };
      cell.font = { name: 'Calibri', size: 9, bold: true, color: { argb: 'FF1E40AF' } };
    } else if (str.includes('AMARILLO')) {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFFEF9C3' },
      };
      cell.font = { name: 'Calibri', size: 9, bold: true, color: { argb: 'FF854D0E' } };
    } else if (str.includes('ROJO')) {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFFEE2E2' },
      };
      cell.font = { name: 'Calibri', size: 9, bold: true, color: { argb: 'FF991B1B' } };
    } else if (str.includes('MORADO')) {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFF3E8FF' },
      };
      cell.font = { name: 'Calibri', size: 9, bold: true, color: { argb: 'FF6B21A8' } };
    } else {
      cell.font = { name: 'Calibri', size: 9, bold: true, color: { argb: 'FF334155' } };
    }
  } else if (tipo === 'estado') {
    if (
      str === 'OPERATIVO' ||
      str === 'DEVUELTO' ||
      str === 'FINALIZADO' ||
      str === 'CERRADO' ||
      str === 'BUENO' ||
      str === 'B'
    ) {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFDCFCE7' },
      };
      cell.font = { name: 'Calibri', size: 9, bold: true, color: { argb: 'FF166534' } };
    } else if (str === 'PRESTADO' || str === 'ACTIVO' || str === 'NUEVO' || str === 'N') {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFDBEAFE' },
      };
      cell.font = { name: 'Calibri', size: 9, bold: true, color: { argb: 'FF1E40AF' } };
    } else if (
      str === 'EN_MANTENIMIENTO' ||
      str === 'EN TALLER' ||
      str === 'EN_PROCESO' ||
      str === 'REGULAR' ||
      str === 'R'
    ) {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFFEF3C7' },
      };
      cell.font = { name: 'Calibri', size: 9, bold: true, color: { argb: 'FF92400E' } };
    } else if (
      str === 'INOPERATIVO' ||
      str === 'DE_BAJA' ||
      str === 'CON_INCIDENCIA' ||
      str === 'MALO' ||
      str === 'M'
    ) {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFFEE2E2' },
      };
      cell.font = { name: 'Calibri', size: 9, bold: true, color: { argb: 'FF991B1B' } };
    }
  }
}

/**
 * Genera y descarga un archivo Excel profesional estilizado para presentación a Dirección y UGEL
 */
export async function generarExcelProfesional(opciones: OpcionesReporteExcel): Promise<void> {
  const {
    tituloReporte,
    subtitulo,
    nombreHoja = 'Reporte',
    nombreArchivo,
    config,
    columnas,
    datos,
    incluirFirmas = false,
    orientacion = 'landscape',
  } = opciones;

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'SIGI-AIP MAMM';
  workbook.lastModifiedBy = config?.responsable_nombre || 'Docente Responsable AIP';
  workbook.created = new Date();
  workbook.modified = new Date();

  const worksheet = workbook.addWorksheet(nombreHoja, {
    views: [{ state: 'frozen', xSplit: 0, ySplit: 7, activeCell: 'A8' }],
  });

  const totalCols = Math.max(columnas.length, 6);

  // 1. Incrustar Insignia Institucional (/logo-mamm.jpg) en A1:B4
  const logoBuffer = await cargarLogoInstitucional();
  if (logoBuffer) {
    try {
      const imageId = workbook.addImage({
        buffer: logoBuffer,
        extension: 'jpeg',
      });
      worksheet.addImage(imageId, {
        tl: { col: 0.1, row: 0.15 },
        ext: { width: 72, height: 72 },
      });
    } catch (e) {
      console.warn('Error al adjuntar imagen en Excel:', e);
    }
  }

  // 2. Cabecera Institucional Oficial
  const dre = (config?.dre || 'AMAZONAS').toUpperCase().replace(/^DRE\s+/i, '');
  const ugel = (config?.ugel || 'BAGUA').toUpperCase().replace(/^UGEL\s+/i, '');
  const nombreIe = formatearNombreIE(config?.nombre_ie);
  const nivel = (config?.nivel || 'SECUNDARIA').toUpperCase();
  const lugar = config?.lugar || 'BAGUA';
  const distrito = config?.distrito || 'BAGUA';
  const responsable = config?.responsable_nombre || 'DOCENTE RESPONSABLE AIP';
  const dni = config?.responsable_dni || '';
  const fechaEmision = `${new Date().toLocaleDateString('es-PE')} ${new Date().toLocaleTimeString('es-PE')}`;

  // Fila 1: GOBIERNO REGIONAL DE AMAZONAS
  worksheet.mergeCells(1, 3, 1, totalCols);
  const r1 = worksheet.getCell(1, 3);
  r1.value = 'GOBIERNO REGIONAL DE AMAZONAS';
  r1.font = { name: 'Calibri', size: 9, bold: true, color: { argb: 'FF475569' } };
  r1.alignment = { vertical: 'middle', horizontal: 'left' };

  // Fila 2: DRE - UGEL
  worksheet.mergeCells(2, 3, 2, totalCols);
  const r2 = worksheet.getCell(2, 3);
  r2.value = `DIRECCIÓN REGIONAL DE EDUCACIÓN - DRE ${dre}  |  UGEL ${ugel}`;
  r2.font = { name: 'Calibri', size: 9, bold: true, color: { argb: 'FF334155' } };
  r2.alignment = { vertical: 'middle', horizontal: 'left' };

  // Fila 3: I.E. y Ubicación (SIN DUPLICAR "I.E.")
  worksheet.mergeCells(3, 3, 3, totalCols);
  const r3 = worksheet.getCell(3, 3);
  r3.value = `I.E. "${nombreIe}"  •  NIVEL ${nivel}  •  ${lugar} - ${distrito}`;
  r3.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF0F172A' } };
  r3.alignment = { vertical: 'middle', horizontal: 'left' };

  // Fila 4: Título del Reporte
  worksheet.mergeCells(4, 3, 4, totalCols);
  const r4 = worksheet.getCell(4, 3);
  r4.value = tituloReporte.toUpperCase();
  r4.font = { name: 'Calibri', size: 12, bold: true, color: { argb: 'FF065F46' } }; // Verde esmeralda institucional
  r4.alignment = { vertical: 'middle', horizontal: 'left' };

  // Fila 5: Metadatos de Emisión
  worksheet.mergeCells(5, 3, 5, totalCols);
  const r5 = worksheet.getCell(5, 3);
  const metaSubtitulo = subtitulo ? `${subtitulo}  •  ` : '';
  r5.value = `${metaSubtitulo}RESPONSABLE AIP: ${responsable} ${dni ? `(DNI: ${dni})` : ''}  |  FECHA DE EMISIÓN: ${fechaEmision}  |  TOTAL ÍTEMS: ${datos.length}`;
  r5.font = { name: 'Calibri', size: 8.5, color: { argb: 'FF64748B' } };
  r5.alignment = { vertical: 'middle', horizontal: 'left' };

  // Borde inferior institucional verde bajo la fila 5
  for (let c = 1; c <= totalCols; c++) {
    const celda = worksheet.getCell(5, c);
    celda.border = {
      ...(celda.border || {}),
      bottom: { style: 'medium', color: { argb: 'FF065F46' } },
    };
  }

  // Fila 6: Separador en blanco
  worksheet.getRow(6).height = 8;

  // Fila 7: Encabezados de la Tabla
  const filaHeader = 7;
  const headerRow = worksheet.getRow(filaHeader);
  headerRow.height = 28;

  columnas.forEach((col, idx) => {
    const colNum = idx + 1;
    const cell = headerRow.getCell(colNum);
    cell.value = col.header;
    cell.font = { name: 'Calibri', size: 9.5, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF0F172A' }, // Slate 900 corporativo
    };
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    cell.border = {
      top: { style: 'medium', color: { argb: 'FF0F172A' } },
      bottom: { style: 'medium', color: { argb: 'FF0F172A' } },
      left: { style: 'thin', color: { argb: 'FF334155' } },
      right: { style: 'thin', color: { argb: 'FF334155' } },
    };
  });

  // Habilitar AutoFiltro nativo en toda la fila de cabecera
  worksheet.autoFilter = {
    from: { row: filaHeader, column: 1 },
    to: { row: filaHeader, column: columnas.length },
  };

  // 3. Filas de Datos
  const thinBorder: Partial<ExcelJS.Borders> = {
    top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
    bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } },
    left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
    right: { style: 'thin', color: { argb: 'FFCBD5E1' } },
  };

  datos.forEach((item, rowIdx) => {
    const currentRowNum = filaHeader + 1 + rowIdx;
    const row = worksheet.getRow(currentRowNum);
    row.height = 22;

    const esCebra = rowIdx % 2 !== 0;
    const bgCebra: ExcelJS.FillPattern = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: esCebra ? 'FFF8FAFC' : 'FFFFFFFF' },
    };

    columnas.forEach((col, colIdx) => {
      const colNum = colIdx + 1;
      const cell = row.getCell(colNum);
      const val = item[col.key];

      cell.value = val !== undefined && val !== null ? val : '—';
      cell.fill = bgCebra;
      cell.border = thinBorder;
      cell.font = { name: 'Calibri', size: 9, color: { argb: 'FF1E293B' } };

      // Alineación
      const alignHoriz =
        col.align ||
        (col.key === 'N°' || col.key === 'index'
          ? 'center'
          : col.isTextFormat
          ? 'center'
          : 'left');

      cell.alignment = {
        vertical: 'middle',
        horizontal: alignHoriz,
        wrapText: col.key === 'observacion' || col.key === 'denominacion' || col.key === 'detalle',
      };

      // Formato explícito de texto ('@') para evitar notación científica (7.408E+11)
      if (col.isTextFormat) {
        cell.numFmt = '@';
        cell.font = { name: 'Calibri', size: 9, bold: true, color: { argb: 'FF0F172A' } };
      }

      // Estilos semánticos de lote o estado
      if (col.isLote) {
        aplicarEstilosSemanticos(cell, val, 'lote');
      } else if (col.isEstado) {
        aplicarEstilosSemanticos(cell, val, 'estado');
      }
    });
  });

  // 4. Auto-ajuste de Ancho de Columnas
  columnas.forEach((col, colIdx) => {
    const colNum = colIdx + 1;
    let maxLen = col.header.length;

    datos.forEach((d) => {
      const v = String(d[col.key] || '');
      if (v.length > maxLen) maxLen = v.length;
    });

    const calculatedWidth = Math.min(50, Math.max(col.width || 10, maxLen + 4));
    worksheet.getColumn(colNum).width = calculatedWidth;
  });

  // 5. Bloque de Firmas Oficiales al Pie (si está habilitado)
  if (incluirFirmas && datos.length > 0) {
    const ultimaFilaDatos = filaHeader + datos.length;
    const filaFirmaEspacio = ultimaFilaDatos + 3;
    const filaFirmaNombre = filaFirmaEspacio + 1;
    const filaFirmaCargo = filaFirmaEspacio + 2;

    worksheet.getRow(filaFirmaEspacio).height = 18;
    worksheet.getRow(filaFirmaNombre).height = 18;
    worksheet.getRow(filaFirmaCargo).height = 16;

    // Firma 1: Responsable AIP (Columnas 2 a 4 aprox)
    const cIni1 = 2;
    const cFin1 = Math.min(4, totalCols);
    worksheet.mergeCells(filaFirmaEspacio, cIni1, filaFirmaEspacio, cFin1);
    worksheet.mergeCells(filaFirmaNombre, cIni1, filaFirmaNombre, cFin1);
    worksheet.mergeCells(filaFirmaCargo, cIni1, filaFirmaCargo, cFin1);

    const fEsp1 = worksheet.getCell(filaFirmaEspacio, cIni1);
    fEsp1.border = { top: { style: 'medium', color: { argb: 'FF0F172A' } } };

    const fNom1 = worksheet.getCell(filaFirmaNombre, cIni1);
    fNom1.value = responsable.toUpperCase();
    fNom1.font = { name: 'Calibri', size: 9, bold: true, color: { argb: 'FF0F172A' } };
    fNom1.alignment = { horizontal: 'center' };

    const fCar1 = worksheet.getCell(filaFirmaCargo, cIni1);
    fCar1.value = `Docente Responsable del AIP ${dni ? `• DNI: ${dni}` : ''}`;
    fCar1.font = { name: 'Calibri', size: 8, color: { argb: 'FF64748B' } };
    fCar1.alignment = { horizontal: 'center' };

    // Firma 2: V° B° Dirección Institucional (Columnas finales)
    const cIni2 = Math.max(cFin1 + 2, totalCols - 3);
    const cFin2 = totalCols;
    if (cIni2 < cFin2) {
      worksheet.mergeCells(filaFirmaEspacio, cIni2, filaFirmaEspacio, cFin2);
      worksheet.mergeCells(filaFirmaNombre, cIni2, filaFirmaNombre, cFin2);
      worksheet.mergeCells(filaFirmaCargo, cIni2, filaFirmaCargo, cFin2);

      const fEsp2 = worksheet.getCell(filaFirmaEspacio, cIni2);
      fEsp2.border = { top: { style: 'medium', color: { argb: 'FF0F172A' } } };

      const fNom2 = worksheet.getCell(filaFirmaNombre, cIni2);
      fNom2.value = 'V° B° DIRECCIÓN INSTITUCIONAL';
      fNom2.font = { name: 'Calibri', size: 9, bold: true, color: { argb: 'FF0F172A' } };
      fNom2.alignment = { horizontal: 'center' };

      const fCar2 = worksheet.getCell(filaFirmaCargo, cIni2);
      fCar2.value = `I.E. "${nombreIe}" • Sello y Firma`;
      fCar2.font = { name: 'Calibri', size: 8, color: { argb: 'FF64748B' } };
      fCar2.alignment = { horizontal: 'center' };
    }
  }

  // 6. Configuración de Impresión Nativa de Excel (Page Setup A4)
  worksheet.pageSetup = {
    paperSize: 9, // A4
    orientation: orientacion,
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 0,
    margins: {
      left: 0.35,
      right: 0.35,
      top: 0.5,
      bottom: 0.5,
      header: 0.2,
      footer: 0.2,
    },
    printTitlesRow: `${filaHeader}:${filaHeader}`,
  };

  // 7. Descarga en el Navegador
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = nombreArchivo.endsWith('.xlsx') ? nombreArchivo : `${nombreArchivo}.xlsx`;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

/**
 * Genera un Respaldo Consolidado Multi-Hoja en Excel con estilos corporativos en cada pestaña
 */
export async function generarBackupConsolidadoExcel(opciones: {
  nombreArchivo: string;
  config?: InstitucionConfig | null;
  operadorEmail: string;
  hojas: Array<{
    nombre: string;
    columnas: ColumnaReporteExcel[];
    datos: Record<string, any>[];
  }>;
}): Promise<void> {
  const { nombreArchivo, config, operadorEmail, hojas } = opciones;

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'SIGI-AIP MAMM';
  workbook.lastModifiedBy = operadorEmail;
  workbook.created = new Date();

  const dre = (config?.dre || 'AMAZONAS').toUpperCase().replace(/^DRE\s+/i, '');
  const ugel = (config?.ugel || 'BAGUA').toUpperCase().replace(/^UGEL\s+/i, '');
  const nombreIe = formatearNombreIE(config?.nombre_ie);
  const fechaStr = `${new Date().toLocaleDateString('es-PE')} ${new Date().toLocaleTimeString('es-PE')}`;

  // 1. Hoja de Portada / Resumen
  const wsResumen = workbook.addWorksheet('Resumen_Backup');
  wsResumen.columns = [
    { header: 'Parámetro Institucional', key: 'param', width: 32 },
    { header: 'Detalle del Respaldo', key: 'valor', width: 50 },
  ];

  const rHead = wsResumen.getRow(1);
  rHead.height = 26;
  rHead.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
  rHead.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF065F46' } };

  const datosResumen = [
    { param: 'Sistema', valor: 'SIGI-AIP MAMM v1.0' },
    { param: 'Institución Educativa', valor: `I.E. "${nombreIe}"` },
    { param: 'DRE / UGEL', valor: `DRE ${dre}  •  UGEL ${ugel}` },
    { param: 'Fecha y Hora de Generación', valor: fechaStr },
    { param: 'Operador Responsable', valor: operadorEmail },
    { param: 'Total Colecciones Respaldadas', valor: hojas.length },
    { param: '—', valor: '—' },
  ];

  hojas.forEach((h) => {
    datosResumen.push({
      param: `Colección: ${h.nombre}`,
      valor: `${h.datos.length} registros`,
    });
  });

  datosResumen.forEach((dr, idx) => {
    const row = wsResumen.getRow(idx + 2);
    row.height = 20;
    const c1 = row.getCell(1);
    const c2 = row.getCell(2);
    c1.value = dr.param;
    c2.value = dr.valor;
    c1.font = { name: 'Calibri', size: 9, bold: true, color: { argb: 'FF0F172A' } };
    c2.font = { name: 'Calibri', size: 9, color: { argb: 'FF334155' } };
    const border: Partial<ExcelJS.Borders> = {
      top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
    };
    c1.border = border;
    c2.border = border;
  });

  // 2. Cada hoja operativa respaldada
  hojas.forEach((h) => {
    const ws = workbook.addWorksheet(h.nombre, {
      views: [{ state: 'frozen', xSplit: 0, ySplit: 1, activeCell: 'A2' }],
    });

    const header = ws.getRow(1);
    header.height = 24;

    h.columnas.forEach((col, idx) => {
      const cell = header.getCell(idx + 1);
      cell.value = col.header;
      cell.font = { name: 'Calibri', size: 9, bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F172A' } };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
    });

    ws.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: 1, column: h.columnas.length },
    };

    h.datos.forEach((item, rIdx) => {
      const row = ws.getRow(rIdx + 2);
      row.height = 20;
      const esCebra = rIdx % 2 !== 0;

      h.columnas.forEach((col, cIdx) => {
        const cell = row.getCell(cIdx + 1);
        const val = item[col.key];
        cell.value = val !== undefined && val !== null ? val : '—';
        cell.font = { name: 'Calibri', size: 9, color: { argb: 'FF1E293B' } };
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: esCebra ? 'FFF8FAFC' : 'FFFFFFFF' },
        };
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        };

        if (col.isTextFormat) {
          cell.numFmt = '@';
        }
        if (col.isLote) {
          aplicarEstilosSemanticos(cell, val, 'lote');
        } else if (col.isEstado) {
          aplicarEstilosSemanticos(cell, val, 'estado');
        }
      });
    });

    // Auto-anchos
    h.columnas.forEach((col, cIdx) => {
      let maxLen = col.header.length;
      h.datos.forEach((d) => {
        const len = String(d[col.key] || '').length;
        if (len > maxLen) maxLen = len;
      });
      ws.getColumn(cIdx + 1).width = Math.min(50, Math.max(col.width || 12, maxLen + 4));
    });
  });

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = nombreArchivo.endsWith('.xlsx') ? nombreArchivo : `${nombreArchivo}.xlsx`;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}
