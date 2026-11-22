# Ficha Técnica del Proyecto: SIGI-AIP MAMM

> **Documento Maestro de Arquitectura, Especificaciones Técnicas y Estado Operativo**  
> Este documento sirve como la fuente de verdad técnica y operativa para el desarrollo, supervisión, auditoría y escalamiento de la plataforma web **SIGI-AIP MAMM** (Sistema Integral de Gestión de Inventario Tecnológico, Préstamos y Analítica TIC).

---

## 1. Identificación General del Proyecto

| Campo | Especificación |
| :--- | :--- |
| **Nombre del Sistema** | **SIGI-AIP MAMM** (Sistema Integral de Gestión de Inventario Tecnológico, Préstamos y Analítica TIC) |
| **Institución Beneficiaria** | I.E. Emblemática Manuel Antonio Mesones Muro |
| **Nivel / Jurisdicción** | Nivel Secundaria – UGEL Bagua – Dirección Regional de Educación (DRE) Amazonas |
| **Ubicación** | Distrito y Provincia de Bagua, Departamento de Amazonas, Perú |
| **Propósito Principal** | Control patrimonial estricto de máquinas y equipos bajo el estándar oficial **Anexo 01**, gestión de distribución por ambientes, préstamos por lotes y unidades mediante escáner QR, historial de mantenimientos preventivos/correctivos, toma de inventario físico con conciliación en tiempo real y analítica pedagógica TIC para Dirección. |
| **Versión del Documento** | `v2.0` – Sistema Integral en Producción Validado y Equipado con Verificación Física QR (Fases 0 a 5.5 Completadas) |
| **Estado Operativo Actual** | **Completado y Validado Localmente (Fase 5.5 en línea)**. Servidor de desarrollo con code-splitting optimizado y listo para pase a producción en Firebase Hosting. |

---

## 2. Objetivos Estratégicos y Específicos

1. **Control Patrimonial Estandarizado (Anexo 01):** Registro único, validado e inmutable de cada bien tecnológico (compatible columna por columna con el Formato de Inventario de Bienes Muebles Patrimoniales – Máquinas y Equipos).
2. **Control Estricto Anti-Duplicados y Normalización:** Algoritmos de normalización para códigos patrimoniales y números de serie, validación de unicidad en tiempo real en servidor (`FirestoreBienRepository`) y herramienta administrativa de depuración/limpieza de duplicados.
3. **Gestión de Lotes Pedagógicos y Jerarquía Visual:** Auto-etiquetado por color según observaciones técnicas (verde, naranja, azul, etc.), badges sólidos predominantes, diferenciadores visuales por fila (`border-l-4`) y herramientas de regularización en un clic.
4. **Toma de Inventario Físico y Conciliación QR Automatizada (Fase 5.5):** Barrido de inventario ágil mediante lector USB o cámara web/móvil, conciliación instantánea contra base de datos en 5 estados de auditoría, feedback sonoro Web Audio API, persistencia en `localStorage`, emisión de **Actas Oficiales A4 en PDF con 3 firmas institucionales** y exportación de reportes ejecutivos multi-hoja en Excel con formateo decimal exacto (`0.00%`).
5. **Trazabilidad de Distribución y Traslados:** Control atómico de la ubicación de los equipos en ambientes (aulas AIP, laboratorios, oficinas administrativas), generación de historial inmutable de movimientos y **Actas de Entrega/Recepción en PDF**.
6. **Gestión Ágil de Préstamos QR:** Registro de salidas y devoluciones individuales o por bloques pedagógicos en menos de 15 segundos con validación de operatividad y generación de alertas de vencimiento (*En plazo*, *Vence hoy*, *Vencido*).
7. **Mantenimiento Preventivo y Correctivo:** Registro de fallas, soporte técnico y actualización automática del estado de conservación (`N`/`B`/`R`/`M`) y operativo (`OPERATIVO`/`EN_MANTENIMIENTO`).
8. **Analítica Pedagógica TIC para Dirección:** Tablero ejecutivo interactivo con Recharts para medir el impacto curricular, frecuencia de uso docente, índice de operatividad y distribución física.
9. **Reportes Ejecutivos e Interoperabilidad:** Motor centralizado `exceljs` (`excelProfesional.ts`) con membretes institucionales limpios, insignias incrustadas (`/logo-mamm.jpg`), anchos automáticos con `wrapText` y respaldos totales en formato JSON con restauración íntegra.

---

## 3. Arquitectura y Stack Tecnológico

### 3.1 Stack de Aplicación (Frontend + BaaS)

| Capa | Tecnología | Justificación y Rol en el Sistema |
| :--- | :--- | :--- |
| **Framework Base** | **React 18+ / Vite / TypeScript** | SPA reactiva con tipado estricto para integridad patrimonial y cero tolerancia a errores en tiempo de ejecución. |
| **Estilos y Diseño UI** | **Tailwind CSS + Lucide React** | Sistema de diseño profesional, sobrio y accesible, con jerarquía visual optimizada y estilos `@media print` para A4 horizontal y vertical. |
| **Analítica y Gráficos** | **Recharts (v3.11)** | Gráficos interactivos (donut, barras verticales y horizontales) con chunk dedicado (`vendor-charts`). |
| **Captura y Generación QR** | **`html5-qrcode` + `qrcode`** | Escaneo dual mediante cámara web/móvil (con enfriamiento de 2 s) o pistolas lectoras USB en modo teclado, más generador de códigos QR vectoriales e imprimibles. |
| **Motor de Exportación XLSX** | **`ExcelJS` (v4.4)** | Generación cliente de libros Excel multi-hoja con bordes finos, fondos corporativos, celdas combinadas, números con `numFmt = '0.00%'` e imagen oficial incrustada. |
| **Motor de Importación Rápida** | **`xlsx` (v0.18)** | Parseo ultrarrápido en navegador de archivos `.xlsx` y `.csv` para el importador masivo en 3 pasos. |
| **Síntesis de Audio (UX)** | **Web Audio API (`AudioContext`)** | Pitidos sintéticos diferenciados sin dependencias externas: 880 Hz (conforme), doble 600 Hz (duplicado) y 220 Hz (alerta/desubicado). |
| **Base de Datos y Auth** | **Firebase Auth + Cloud Firestore** | Autenticación basada en roles, base NoSQL en tiempo real, persistencia offline y reglas de seguridad granulares. |
| **Control de Versiones** | **Git + GitHub Privado** | Repositorio institucional con despliegues trazables y commits semánticos. |

### 3.2 Optimización de Rendimiento y Code-Splitting (Vite)

Para mantener la velocidad de carga óptima en conexiones escolares lentas, la compilación de Vite implementa una división modular estricta (`build.rollupOptions.output.manualChunks`):

| Chunk | Módulos Incluidos | Tamaño Minificado | Tamaño Gzip |
| :--- | :--- | :---: | :---: |
| **`index-*.js`** | Núcleo de la aplicación y enrutador principal | **~76 kB** | **~20 kB** |
| **`vendor-exceljs`** | Motor de estilos y hojas de cálculo ExcelJS | ~938 kB | ~270 kB (cargado bajo demanda) |
| **`vendor-firebase`** | Firebase App, Auth y Firestore | ~570 kB | ~137 kB |
| **`vendor-charts`** | Recharts, d3-* y victory-vendor | ~463 kB | ~131 kB (cargado bajo demanda) |
| **`vendor-xlsx`** | SheetJS (Lector de importación masiva) | ~424 kB | ~141 kB (cargado bajo demanda) |
| **`vendor-qr`** | html5-qrcode y generador QRCode | ~358 kB | ~109 kB |
| **`vendor-react`** | React, React-DOM y React-Router-DOM | ~170 kB | ~55 kB |
| **`vendor-lucide`** | Iconografía SVG Lucide React | ~31 kB | ~6 kB |

---

## 4. Matriz de Control de Acceso Basado en Roles (RBAC)

El sistema opera bajo un esquema RBAC dual reforzado por las reglas de seguridad de Firestore (`firestore.rules`):

| Módulo / Funcionalidad | `ADMIN` (Docente AIP / Soporte) | `DIRECCION` (Dirección / Subdirección) |
| :--- | :---: | :---: |
| **Dashboard y Analítica Pedagógica TIC** | Lectura y supervisión total | Lectura y supervisión total |
| **Inventario: Catálogo Patrimonial** | Lectura, Creación y Edición | Solo Lectura |
| **Inventario: Lotes Rápidos y Regularización** | Sí (Asignación manual/masiva) | No |
| **Inventario: Limpieza de Duplicados** | Sí (Resolución y baja lógica) | No |
| **Verificación Física QR (Fase 5.5): Iniciar Barrido** | **Sí (Auditor líder)** | **No** |
| **Verificación Física QR: Historial y Descarga Actas** | **Sí** | **Sí** |
| **Distribución: Traslados y Actas de Cargo** | Sí (Ejecución y emisión) | Solo Lectura / Descarga |
| **Préstamos QR: Registro y Devolución** | Sí (Operación activa) | Solo Lectura / Supervisión |
| **Mantenimiento: Apertura y Cierre de Órdenes** | Sí | Solo Lectura |
| **Reportes Oficiales (Anexo 01 Excel y PDF)** | Sí (Generación en un clic) | Sí (Generación en un clic) |
| **Backups Institucionales: Exportar JSON** | Sí | Sí |
| **Backups Institucionales: Restaurar JSON** | **Sí (Exclusivo)** | **No** |
| **Configuración del Sistema** (Usuarios, IE, Catálogos) | **Sí** | **No** |

---

## 5. Reglas de Seguridad y Contratos de Datos (`firestore.rules`)

El archivo `firestore.rules` contiene 13 bloques de reglas securizados contra el bypass de frontend:

1. **`usuarios/{userId}`**: Lectura por el propio usuario o `ADMIN`. Creación exclusiva de `ADMIN`. Actualización solo para `ADMIN` o para que el propio usuario actualice su `ultimoAcceso`. Borrado físico denegado (`allow delete: if false`).
2. **`configuracion/{docId}`**: Lectura para usuarios activos. Edición exclusiva para `ADMIN`. Borrado físico denegado.
3. **`ambientes/{docId}`**: Lectura para activos. Modificación exclusiva de `ADMIN`. Borrado físico denegado.
4. **`categorias_equipo/{docId}`**: Taxonomía de equipos. Edición exclusiva de `ADMIN`. Borrado físico denegado.
5. **`bienes/{docId}`**: Inventario patrimonial. Lectura para activos. Creación y actualización para `ADMIN`. Borrado físico bloqueado (`allow delete: if false`) para garantizar trazabilidad patrimonial mediante *soft-delete* (`DE_BAJA`).
6. **`movimientos/{docId}`**: Registro de traslados entre ambientes. Inmutable (`allow update, delete: if false`).
7. **`mantenimientos/{docId}`**: Órdenes de soporte técnico. Modificación solo por `ADMIN`. Borrado denegado.
8. **`docentes/{docId}`**: Padrón docente. Modificación exclusiva de `ADMIN`. Borrado denegado.
9. **`areas_curriculares/{docId}`**: Asignaturas institucionales. Modificación solo por `ADMIN`. Borrado denegado.
10. **`bloques_equipos/{docId}`**: Lotes y carritos pedagógicos. Modificación solo por `ADMIN`. Borrado denegado.
11. **`prestamos/{docId}`**: Salidas y retornos de equipos. Creación y cierre por `ADMIN`. Borrado denegado.
12. **`verificaciones_inventario/{docId}`**: Auditorías físicas y conciliación QR. Lectura para usuarios activos (`isActiveUser()`). Creación exclusiva para `ADMIN` (`isAdmin()`). **Actualización y eliminación estrictamente prohibidas (`allow update, delete: if false`) para garantizar inmutabilidad pericial**.
13. **`auditoria_logs/{docId}`**: Registro inmutable de eventos del sistema (`CREATE`, `UPDATE`, `BAJA`, `TRASLADO`, etc.). Lectura para `ADMIN` y `DIRECCION`. Inmutable (`allow update, delete: if false`).
14. **Ruta comodín (`/{document=**}`):** Bloqueo total por defecto (`allow read, write: if false`).

---

## 6. Modelo de Datos Detallado (Cloud Firestore)

### 6.1 Colecciones Operativas y de Inventario

#### Colección `bienes/{id}`
* `codigo_patrimonial`: string (normalizado, validación estricta de unicidad).
* `tipo_codigo`: `"S/C"` | `"CIC"`.
* `denominacion`: string (ej. `"LAPTOP"`, `"PROYECTOR MULTIMEDIA"`, `"CPU"`).
* `categoria_id`: string (referencia a `categorias_equipo`).
* `marca`, `modelo`, `color`: string.
* `serie` / `numero_serie`: string (normalizado, validación de unicidad).
* `estado_conservacion`: `"N"` (Nuevo) | `"B"` (Bueno) | `"R"` (Regular) | `"M"` (Malo).
* `estado_operativo`: `"OPERATIVO"` | `"PRESTADO"` | `"EN_MANTENIMIENTO"` | `"DE_BAJA"`.
* `ambiente_id`: string (referencia a `ambientes`).
* `ubicacion_detalle`: string opcional (para ambientes `"Otros"`).
* `etiqueta_interna`: string (código QR visible, ej. `"LAP-001"`, `"LAP-080"`).
* `lote_etiqueta`: string opcional (ej. `"LOTE VERDE"`, `"LOTE NARANJA"`).
* `lote_color`: string hexadecimal (ej. `"#16A34A"`, `"#EA580C"`).
* `observacion`: string (anotaciones técnicas reales).
* `motivo_baja`, `fecha_baja`: string opcional (presentes en `DE_BAJA`).
* `creado_en`, `actualizado_en`: timestamp.

#### Colección `verificaciones_inventario/{id}` *(Fase 5.5 - Inmutable)*
* `codigo_acta`: string (correlativo único oficial, ej. `"VER-20261122-4821"`).
* `fecha_inicio`, `fecha_cierre`: ISO timestamp string.
* `alcance_ambiente_id`: string (`'TODOS'` o ID de ambiente específico).
* `alcance_ambiente_nombre`: string (ej. `"AIP 1"`, `"Todos los Ambientes (General)"`).
* `filtro_categoria`, `filtro_categoria_id`, `filtro_categoria_nombre`: string opcional.
* `filtro_lote`: string opcional.
* `operador_uid`, `operador_nombre`, `operador_email`: datos del auditor líder.
* `total_esperados`: number (universo teórico según filtros).
* `total_conformes` / `total_verificados_conforme`: number (hallados físicamente).
* `total_ausentes_justificados`: number (en préstamo institucional o soporte técnico).
* `total_faltantes`: number (operativos en BD pero no ubicados en el barrido).
* `total_fuera_ubicacion`: number (equipos hallados pero asignados a otro ambiente o de baja).
* `total_desconocidos`: number (códigos escaneados no registrados en la BD).
* `porcentaje_conformidad`: number (decimal de 0 a 100).
* `observaciones_generales`: string opcional (conclusiones de la comisión).
* `items`: Array de `ItemVerificacion`:
  * `bien_id`: string opcional.
  * `codigo_escaneado`: string.
  * `etiqueta_interna`: string.
  * `codigo_patrimonial`: string.
  * `denominacion`, `marca_modelo`, `numero_serie`: string.
  * `lote_etiqueta`, `lote_color`: string opcional.
  * `ambiente_bd`, `estado_operativo_bd`: string.
  * `estado_conciliacion`: `'VERIFICADO_CONFORME' | 'AUSENTE_JUSTIFICADO' | 'FALTANTE' | 'FUERA_DE_UBICACION' | 'DESCONOCIDO'`.
  * `hora_escaneo`: string opcional.
  * `novedad_fisica`: string opcional (ej. `"Pantalla rayada"`, `"Sin cargador"`).
  * `detalle_justificacion`: string opcional.

---

## 7. Módulos Funcionales del Sistema

### 7.1 Módulo de Inventario Tecnológico Patrimonial (`src/modules/inventario/`)
* **Navegación por Pestañas:**
  * **Catálogo Patrimonial**: Consulta tabular con filtros por ambiente, categoría, conservación, operatividad y lote. Paginación a 20 ítems y ordenamiento determinista natural (`LAP-001` a `LAP-080` antes que bienes sin etiqueta).
  * **Verificación Física QR**: Módulo auditor de barrido y conciliación en vivo.
* **Control Anti-Duplicados y Normalización:**
  * Algoritmo `normalizarCodigoPatrimonial`: elimina espacios, guiones, símbolos y prefijos accidentales como `"C"` previo a 12 dígitos (ej. `"C740805007042"` -> `"740805007042"`).
  * Algoritmo `normalizarSerie`: unifica a mayúsculas y remueve sufijos erráticos o espacios (ej. `"PF4DMKGN E"` -> `"PF4DMKGN"`).
  * `ModalLimpiezaDuplicados`: agrupa automáticamente bienes activos que colisionan en código o serie, permitiendo al administrador elegir cuál conservar y enviar a baja lógica el sobrante.
* **Sistema de Lotes y Experiencia de Usuario (Scroll Lock):**
  * Asignación rápida de lote/color mediante popover modal.
  * **Actualización optimista instantánea**: el badge y el borde de la fila se actualizan sin parpadeo.
  * **Recarga silenciosa en segundo plano (`cargarDatos(true)`)**: no activa el spinner de carga general para no colapsar la altura de la página.
  * **Preservación milimétrica del scroll**: memoriza y restituye `window.scrollY` mediante `requestAnimationFrame`, permitiendo al operador recorrer filas inferiores sin que la pantalla salte al tope.

### 7.2 Módulo de Verificación Física y Conciliación QR (`VerificacionQRTab.tsx`)
* **Flujo en 3 Etapas:**
  1. **Etapa A (Alcance y Universo Esperado):** Selector de ambiente (`TODOS` o aula específica), filtro por categoría y lote. Cálculo automático de bienes teóricos activos.
  2. **Etapa B (Barrido Continuo en Vivo):**
     * Captura ágil con lector de código de barras USB (modo pistola, `autoFocus` y `onKeyDown Enter`) o cámara QR (`EscanerQRModal.tsx` con enfriamiento de 2 s).
     * Síntesis sonora mediante Web Audio API para operación a ciegas:
       - Agudo 880 Hz: Ítem conforme verificado.
       - Doble 600 Hz: Ítem ya escaneado previamente en la sesión.
       - Grave 220 Hz: Alerta de discrepancia (fuera de ubicación o código no registrado).
     * Conciliación automática en 5 categorías:
       - `VERIFICADO_CONFORME` (Verde).
       - `AUSENTE_JUSTIFICADO` (Azul: equipos en préstamo o mantenimiento).
       - `FALTANTE` (Rojo: equipos operativos no hallados).
       - `FUERA_DE_UBICACION` (Ámbar: equipos registrados en otra aula o dados de baja).
       - `DESCONOCIDO` (Púrpura: códigos inexistentes en el sistema).
     * Persistencia y auto-recuperación de borradores en `localStorage` (`sigi_verificacion_qr_borrador`).
     * Barra de progreso porcentual y filtros rápidos por KPI.
     * Registro de novedades o daños físicos observados por equipo.
  3. **Etapa C (Cierre Inmutable y Reportes Oficiales):**
     * Guardado del acta en la colección inmutable `verificaciones_inventario`.
     * Generación de código correlativo `VER-YYYYMMDD-XXXX`.
     * **Acta Oficial en PDF (`ActaVerificacionPrintModal.tsx`):** Documento A4 vertical con membrete del Gobierno Regional, DRE Amazonas, UGEL Bagua, cuadro resumen de balance físico, tabla detallada de hallazgos y **3 bloques de firma institucional** (Docente AIP, Comisión de Inventario y V° B° Dirección Institucional).
     * **Reporte Multi-Hoja en Excel (`excelProfesional.ts`):** Hojas `Resumen_Auditoria`, `Conciliacion_Completa` y `Solo_Discrepancias` con porcentajes decimales reales (`numFmt = '0.00%'`) y anchos protegidos contra recorte.
* **Pestaña de Historial de Verificaciones:**
  * Vista de consulta histórica de todas las actas emitidas con buscador instantáneo, desglose de métricas y botones directos para re-imprimir el acta en PDF o re-descargar el Excel oficial.

### 7.3 Motor Centralizado de Reportes Excel (`src/utils/excelProfesional.ts`)
* **Membrete Institucional Estandarizado:** Integración de la función `formatearNombreIE` para suprimir redundancias en la denominación del plantel (evitando `"I.E. 'I.E. ...'"`).
* **Insignia Oficial Incrustada:** Descarga e inserción programática de `/logo-mamm.jpg` en el encabezado `A1:B4` mediante buffers nativos de `ExcelJS`.
* **Formateo Matemático y Tipográfico:**
  * Valores numéricos reales para cantidades enteras (`#,##0`).
  * Valores decimales puros (ej. `0.0625`) con formato de celda `'0.00%'` (mostrando `6.25%`), eliminando los triángulos verdes de error de texto y garantizando que la autosuma resulte exactamente en `100.00%`.
  * Columnas calibradas con anchos expandidos (B: 44, C: 24, D: 30) y `wrapText: true` en filas institucionales para evitar truncamientos de texto como `"BAGUA - BAGUA"`.

### 7.4 Dashboard y Analítica Pedagógica TIC (`src/modules/dashboard/`)
* **KPIs en Tiempo Real:** Total de bienes activos, desglose de stock en Aula AIP vs. distribuidos en oficinas, índice de operatividad, equipos en circulación por préstamo y equipos en mantenimiento.
* **Gráficos Dinámicos con Recharts:**
  * Distribución por estado de operatividad (Donut).
  * Stock y distribución de máquinas por ambiente (Barras).
  * Cobertura de uso por áreas curriculares (Barras horizontales).
  * Docentes más activos en el mes pedagógico.
* **Monitor de Préstamos Activos:** Listado de préstamos vigentes con semáforo de tiempo de devolución (*En plazo*, *Vence hoy*, *Vencido*).

### 7.5 Distribución y Movimientos (`src/modules/distribucion/`)
* Traslado individual o en lote entre ambientes con actualización atómica de `ambiente_id` y generación obligatoria de registro en `movimientos`.
* Emisión inmediata de **Acta de Entrega / Recepción de Bienes en PDF** con especificación de responsable y motivos.

### 7.6 Préstamos QR (`src/modules/prestamos/`)
* Préstamos individuales o por bloques pedagógicos (lotes con QR maestro).
* Bloqueo estricto para equipos no operativos o asignados fuera del AIP sin retorno previo.
* Checklist de devolución y derivación directa a servicio técnico si se registran averías.

### 7.7 Mantenimiento Técnico (`src/modules/mantenimiento/`)
* Registro de atenciones preventivas y correctivas.
* Al cerrar una orden, actualización automática del estado de conservación (`N`/`B`/`R`/`M`) y retorno del equipo a estado `OPERATIVO`.

### 7.8 Reportes y Respaldos Institucionales (`src/modules/reportes/`)
* **Anexo 01 Oficial:** Exportación general o filtrada por ambiente en Excel con estilos de imprenta y en PDF con membrete oficial.
* **Etiquetas QR Imprimibles:** Generador de planchas de etiquetas en PDF con código QR, código patrimonial, etiqueta interna y lote.
* **Backups Institucionales:** Descarga completa en archivo JSON y módulo de restauración con validación de estructura (exclusivo para `ADMIN`).

---

## 8. Estructura del Código Fuente

```text
sigi-aip-mamm/
├── .github/
│   └── workflows/
│       └── firebase-deploy.yml          # CI/CD automático hacia Firebase Hosting
├── docs/
│   └── FICHA_TECNICA.md                 # Fuente de verdad arquitectónica (este archivo)
├── public/
│   ├── logo-mamm.jpg                    # Insignia oficial de la I.E.
│   └── favicon.ico
├── src/
│   ├── config/
│   │   └── firebase.ts                  # Inicialización segura con variables VITE_FIREBASE_*
│   ├── context/
│   │   └── AuthContext.tsx              # Contexto de autenticación, rol y permisos
│   ├── hooks/
│   │   └── index.ts                     # useAuth, usePermisos, etc.
│   ├── types/
│   │   └── index.ts                     # Definiciones de TypeScript y normalizadores
│   ├── repositories/                    # Capa desacoplada de acceso a datos
│   │   ├── interfaces.ts                # Contratos abstractos de repositorios
│   │   ├── index.ts                     # Instancias singleton exportadas
│   │   └── firestore/
│   │       ├── FirestoreBienRepository.ts
│   │       ├── FirestoreVerificacionRepository.ts  # Inmutable (Fase 5.5)
│   │       ├── FirestoreAmbienteRepository.ts
│   │       ├── FirestoreCategoriaRepository.ts
│   │       ├── FirestorePrestamoRepository.ts
│   │       ├── FirestoreMovimientoRepository.ts
│   │       ├── FirestoreMantenimientoRepository.ts
│   │       ├── FirestoreDocenteRepository.ts
│   │       ├── FirestoreAreaRepository.ts
│   │       ├── FirestoreBloqueRepository.ts
│   │       ├── FirestoreAuditoriaRepository.ts
│   │       └── FirestoreConfiguracionRepository.ts
│   ├── utils/
│   │   ├── excelProfesional.ts          # Motor ExcelJS (Anexo 01 y Verificación QR)
│   │   ├── excelExport.ts               # Exportador complementario
│   │   ├── pdfExport.ts                 # Exportador PDF
│   │   └── backupManager.ts             # Exportación e importación de Backups JSON
│   ├── components/                      # Layout, Sidebar, Navbar y componentes comunes
│   └── modules/
│       ├── auth/
│       ├── dashboard/
│       ├── inventario/
│       │   ├── index.tsx                # Tabla patrimonial y conmutador de pestañas
│       │   ├── VerificacionQRTab.tsx    # Módulo de Verificación Física QR (Fase 5.5)
│       │   ├── ActaVerificacionPrintModal.tsx # Acta oficial imprimible A4
│       │   ├── BienFormModal.tsx
│       │   ├── BienDetalleModal.tsx
│       │   ├── BajaBienModal.tsx
│       │   ├── ImportadorInventarioModal.tsx
│       │   └── ModalLimpiezaDuplicados.tsx
│       ├── distribucion/
│       ├── prestamos/
│       │   ├── EscanerQRModal.tsx       # Escáner de cámara reutilizable
│       │   └── GeneradorEtiquetasQR.tsx
│       ├── mantenimiento/
│       ├── reportes/
│       └── configuracion/
├── firestore.rules                      # 13 reglas de seguridad RBAC en servidor
├── firestore.indexes.json               # Índices compuestos de Firestore
├── vite.config.ts                       # Configuración de Vite y chunking manual
├── package.json                         # Dependencias y scripts
└── tsconfig.json                        # Configuración de TypeScript
```

---

## 9. Estado de Avance por Fases

| Fase | Título | Estado | Detalle de Cumplimiento |
| :---: | :--- | :---: | :--- |
| **Fase 0** | **Cimientos y Repositorio** | **100%** | Vite + React + TS + Tailwind. Repositorio en GitHub configurado y CI/CD preparado. |
| **Fase 1** | **Autenticación y RBAC Base** | **100%** | Login Firebase, perfiles `ADMIN`/`DIRECCION`, Layout responsivo y módulo Configuración. |
| **Fase 2** | **Core de Inventario y Seguridad** | **100%** | CRUD patrimonial, `firestore.rules` securizadas, importador masivo y validaciones de unicidad. |
| **Fase 3** | **Distribución y Mantenimiento** | **100%** | Traslados atómicos entre ambientes, Actas de Cargo PDF, hoja de vida técnica y generador QR. |
| **Fase 4** | **Préstamos QR (Individual y Bloques)** | **100%** | Padrón docente, lotes pedagógicos, escaneo en <15 s, validaciones y monitoreo de vencimiento. |
| **Fase 5** | **Dashboard y Analítica TIC** | **100%** | KPIs globales en tiempo real, gráficos Recharts con code-splitting y seguimiento pedagógico. |
| **Fase 5.5** | **Toma de Inventario Físico y Conciliación QR** | **100%** | Barrido USB/cámara con audio Web Audio API, conciliación en 5 estados, Actas oficiales en PDF con 3 firmas, Excel multi-hoja profesional con `0.00%` y bloqueo de scroll al etiquetar. |
| **Fase 6** | **Despliegue a Producción y PWA** | *En curso* | Compilación en verde (`exit code 0`), pruebas locales superadas; pendiente despliegue final en Firebase Hosting. |
| **Fase 7** | **Migración Institucional y Respaldo Local** | *Proyectada* | Transferencia a cuenta institucional y automatización de backups en servidor HP ProLiant ML110 G7. |

---

## 10. Directrices para Mantenedores y Desarrolladores

1. **Desacoplamiento Estricto:** Toda interacción con Firestore debe canalizarse exclusivamente a través de la capa `src/repositories/`. Ningún componente de interfaz debe invocar métodos directos del SDK de Firebase.
2. **Inmutabilidad de Auditorías:** Las colecciones `auditoria_logs`, `movimientos` y `verificaciones_inventario` no admiten bajo ninguna circunstancia operaciones `update` ni `delete`.
3. **Formateo y Denominación Institucional:** Utilizar permanentemente las utilidades `formatearNombreIE` y `normalizarCodigoPatrimonial` para mantener la coherencia con los formatos de la UGEL Bagua y DRE Amazonas.
4. **Control de Scroll y UX:** En operaciones de actualización masiva o rápida sobre tablas, emplear siempre actualizaciones optimistas en memoria combinadas con recargas silenciosas (`cargarDatos(true)`) para no perjudicar la posición del usuario en pantalla.
