# Ficha Técnica del Proyecto: SIGI-AIP MAMM

> **Documento Maestro de Arquitectura y Especificaciones**  
> Este archivo sirve como fuente de verdad técnica para el desarrollo, supervisión y escalamiento de la aplicación web **SIGI-AIP MAMM** (compatible con flujo asistido en Antigravity).

---

## 1. Identificación General del Proyecto

| Campo | Especificación |
| :--- | :--- |
| **Nombre del Sistema** | **SIGI-AIP MAMM** (Sistema Integral de Gestión de Inventario Tecnológico, Préstamos y Analítica TIC) |
| **Institución Beneficiaria** | I.E. Emblemática Manuel Antonio Mesones Muro |
| **Nivel / Jurisdicción** | Nivel Secundaria – UGEL Bagua – Dirección Regional de Educación (DRE) Amazonas |
| **Ubicación** | Distrito y Provincia de Bagua, Amazonas, Perú |
| **Propósito Principal** | Digitalizar el control patrimonial de máquinas y equipos (compatible con el **Formato Oficial Anexo 01**), gestionar la distribución por ambientes, controlar préstamos individuales y por bloques mediante códigos QR, llevar el historial de mantenimientos y generar métricas pedagógicas de uso TIC. |
| **Versión del Documento** | `v1.0` – Arquitectura Base (Firebase + GitHub + Proyección Híbrida Escolar) |

---

## 2. Objetivos Específicos

1. **Control Patrimonial Estandarizado:** Mantener un registro único, validado y sin duplicados de cada bien tecnológico, fiel a las columnas del Formato de Inventario de Bienes Muebles Patrimoniales (Anexo 01 – Máquinas y Equipos).
2. **Trazabilidad de Distribución:** Controlar la ubicación exacta de cada equipo en los ambientes institucionales, generando historial inmutable de traslados y **Actas de Entrega/Recepción en PDF**.
3. **Gestión Ágil de Préstamos con QR:** Registrar salidas y devoluciones de equipos (individuales o por bloques/lotes) en menos de 15 segundos mediante escaneo QR, eliminando el préstamo informal sin respaldo.
4. **Mantenimiento Preventivo y Correctivo:** Documentar la hoja de vida técnica de cada equipo (fallas, reparaciones, repuestos y cambio automático de estado de conservación).
5. **Analítica Pedagógica para Dirección:** Medir con gráficos reales qué docentes y áreas curriculares aprovechan los equipos TIC, detectar brechas de uso y monitorear el desgaste por equipo.
6. **Interoperabilidad y Soberanía de Datos:** Permitir importación masiva desde Excel/CSV, generación en un clic de reportes oficiales en **Excel y PDF** (por ambiente o general) y exportación/restauración completa mediante **Backup JSON**.

---

## 3. Arquitectura y Stack Tecnológico

### 3.1 Stack Principal (Frontend + BaaS)

| Capa | Tecnología | Justificación Técnica |
| :--- | :--- | :--- |
| **Framework Frontend** | **React 18+ / Vite / TypeScript** | Alto rendimiento, tipado estricto para integridad patrimonial y ecosistema maduro para reportes en navegador. |
| **Estilos y UI** | **Tailwind CSS + Shadcn/UI + Lucide Icons** | Interfaz limpia, moderna, accesible y responsiva (escritorio para AIP/Dirección y móvil para escaneo QR). |
| **Gráficos y Analítica** | **Recharts** | Gráficos interactivos de uso por asignatura, frecuencia docente y distribución por ambiente. |
| **Códigos QR** | **`html5-qrcode`** (escaneo) + **`qrcode.react`** (generación) | Lectura desde cámara móvil (HTTPS) o lector QR USB físico, más generación de etiquetas imprimibles. |
| **Motor de Reportes (Cliente)** | **`ExcelJS`** (XLSX) + **`jsPDF` / `jspdf-autotable`** (PDF) | Genera el Anexo 01 oficial, actas e informes ejecutivos directamente en el navegador sin sobrecargar el servidor. |
| **Autenticación** | **Firebase Authentication** | Inicio de sesión seguro con correo/contraseña y gestión de sesiones. |
| **Base de Datos** | **Cloud Firestore (con persistencia offline habilitada)** | Base NoSQL en tiempo real, capa gratuita (Plan Spark) y operación resistente a cortes temporales de internet escolar. |
| **Hosting y SSL** | **Firebase Hosting** | Despliegue rápido con **HTTPS automático** (requisito obligatorio para abrir la cámara QR en celulares). |
| **Control de Versiones y CI/CD** | **GitHub (Repo Privado) + GitHub Actions** | Respaldo del código fuente, historial de cambios y despliegue automático hacia Firebase Hosting en cada push a `main`. |

### 3.2 Estrategia de Migración (Opción B – Traspaso Limpio)

* **Entorno 1 (Desarrollo y Validación):** Proyecto alojado en la cuenta personal de Firebase del desarrollador (Plan Spark gratuito) para pruebas y demostración funcional ante el AIP y Dirección.
* **Entorno 2 (Producción Institucional):** Creación de un proyecto Firebase limpio bajo una cuenta institucional dedicada del área (ej. correo oficial del AIP). La migración se realiza sin reescribir código:
  1. Actualizar las variables `VITE_FIREBASE_*` y credenciales de despliegue en **GitHub Secrets**.
  2. Ejecutar el workflow de **GitHub Actions** para publicar la aplicación en el nuevo dominio institucional.
  3. Cargar el inventario validado utilizando el módulo propio de **Restaurar Backup (`.json`)** o importación masiva desde Excel.

### 3.3 Proyección Híbrida con el Servidor Institucional

El colegio cuenta con servidores locales, entre ellos un **HP ProLiant ML110 G7** operando actualmente con **Windows Server y 1 GB de RAM** (1 módulo instalado y 3 ranuras DIMM libres, compatible exclusivamente con memoria **DDR3 ECC Unbuffered / UDIMM PC3-10600E**). Para integrarlo sin saturar sus recursos:

* **Fase Híbrida A (Corto Plazo – Compatible con 1 GB RAM):** Script ligero programado en el Programador de Tareas de Windows Server que descarga diariamente desde Firebase una copia de seguridad completa (`.json`) y genera el archivo Excel actualizado en una carpeta compartida de la red local.
* **Fase Híbrida B (Mediano/Largo Plazo):** Todo el acceso a datos del frontend estará abstraído en `src/repositories/`. Si en el futuro el colegio amplía la memoria RAM del servidor (4 GB–8 GB ECC) o habilita un servidor local dedicado, se puede cambiar la capa de repositorios hacia una API local sin rediseñar la interfaz ni la lógica de negocio.

---

## 4. Seguridad, Roles y Protección de Datos (RBAC)

### 4.1 Matriz de Permisos por Rol

| Módulo / Funcionalidad | `ADMIN` (DAIP / Soporte) | `DIRECCION` (Dirección / Subdirección) |
| :--- | :---: | :---: |
| Dashboard y Analítica Pedagógica TIC | Lectura completa | Lectura completa |
| Inventario (Consulta y Filtros) | Lectura y Escritura | Solo Lectura |
| Registro, Edición y Baja Lógica de Equipos | Sí | No |
| Traslados entre Ambientes y Actas PDF | Sí | Solo Lectura / Descarga |
| Préstamos con QR (Individual y Bloques) | Sí (Entrega / Devolución) | Solo Lectura / Supervisión |
| Registro de Mantenimientos | Sí | Solo Lectura |
| Reportes Oficiales (Excel y PDF) | Sí | Sí |
| Importación Masiva (Excel / CSV) | Sí | No |
| Exportar Backup (`.json`) | Sí | Sí (solo descarga) |
| Restaurar Backup (`.json`) | Sí | No |
| **Configuración** (Usuarios, Cabecera Anexo 01, Catálogos) | **Sí** | **No** |

### 4.2 Directrices Obligatorias de Seguridad

1. **Validación en Servidor (`firestore.rules`):** Ninguna regla de acceso depende únicamente de ocultar botones en el frontend. Todas las lecturas y escrituras se validan mediante reglas de Firestore según el rol del usuario autenticado (`request.auth != null`).
2. **Integridad Patrimonial (*Soft Delete*):** Ningún bien registrado se elimina físicamente de la base de datos. Los equipos dados de baja pasan a `estado_operativo = "BAJA"` conservando motivo, fecha e historial.
3. **Protección de Credenciales y Datos Personales:**
   * Prohibido incluir llaves de API, archivos `.env`, archivos `serviceAccountKey.json` o respaldos con DNI/celulares reales en GitHub (`.gitignore` estricto).
   * Los datos personales del responsable del inventario (Nombre, DNI, Celular, Correo) se gestionan exclusivamente desde la interfaz de **Configuración** en Firestore, nunca en texto plano dentro del código fuente.
4. **Registro de Auditoría:** Toda acción crítica (`CREATE`, `UPDATE`, `TRASLADO`, `BAJA`, `IMPORT`, `BACKUP_RESTORE`, `USER_CHANGE`) genera un registro inmutable en `auditoria_logs`.

---

## 5. Modelo de Datos (Cloud Firestore)

### 5.1 Colecciones Principales

* **`configuracion/institucion`** *(Documento único)*
  * `nombre_ie`, `ugel`, `dre`, `nivel`, `lugar`, `distrito`, `anexo_default` (`"01"`), `tipo_inventario` (`"MAQUINAS Y EQUIPOS"`), `responsable_nombre`, `responsable_dni`, `responsable_celular`, `responsable_correo`, `logo_url`.
* **`usuarios/{uid}`**
  * `uid`, `nombres`, `email`, `rol` (`"ADMIN"` | `"DIRECCION"`), `activo` (`boolean`), `creado_en`, `ultimo_acceso`.
* **`ambientes/{id}`** *(Catálogo administrable)*
  * `nombre`, `encargado`, `descripcion`, `activo`.
  * *Valores iniciales:* `AIP 1`, `AIP 2`, `Secretaría de Dirección`, `Secretaría Subdirección`, `Psicología`, `TOE`, `Otros`.
* **`categorias_equipo/{id}`** *(Catálogo administrable)*
  * `nombre`, `prefijo_etiqueta`, `activo`.
  * *Valores iniciales:* `PCs de Mesa`, `Laptops`, `Proyectores`, `Otros`.
* **`bienes/{id}`** *(Núcleo compatible con Anexo 01)*
  * `codigo_patrimonial` *(string, validación de unicidad)*
  * `tipo_codigo` (`"S/C"` | `"CIC"`)
  * `denominacion` *(ej. `"LAPTOP"`, `"PROYECTOR"`, `"CPU"`)*
  * `categoria_id` *(referencia a `categorias_equipo`)*
  * `marca`, `modelo`, `color`
  * `serie` *(string, validación de unicidad)*
  * `estado_conservacion` (`"N"` Nuevo | `"B"` Bueno | `"R"` Regular | `"M"` Malo)
  * `estado_operativo` (`"OPERATIVO"` | `"PRESTADO"` | `"EN_MANTENIMIENTO"` | `"BAJA"`)
  * `ambiente_id` *(referencia a `ambientes`)*
  * `estacion_grupo` *(opcional: agrupa monitor/CPU/periféricos de una misma PC de mesa)*
  * `etiqueta_interna` *(alias físico separado de observación, ej. `"LAPTOP 27"`, `"LAPTOP 4 VERDE"`)*
  * `observacion` *(notas técnicas reales)*
  * `bloque_id` *(opcional: referencia al bloque/lote al que pertenece)*
  * `codigo_qr` *(identificador único para escaneo)*
  * `total_prestamos` *(contador para métricas de desgaste)*, `fecha_registro`, `actualizado_en`.
* **`bloques_equipos/{id}`**
  * `nombre` *(ej. `"Bloque AIP 1"`, `"Lote Verde"`)*, `descripcion`, `codigo_qr_lote`, `bienes_ids` (`string[]`), `activo`.
* **`docentes/{id}`**
  * `dni`, `nombres_apellidos`, `area_principal_id`, `celular`, `activo`.
* **`areas_curriculares/{id}`**
  * `nombre` *(Matemática, Comunicación, CyT, EPT, Inglés, CC.SS., DPCC, Arte, Educación Física, Religión, Tutoría, Otros)*, `activo`.
* **`prestamos/{id}`**
  * `tipo` (`"INDIVIDUAL"` | `"BLOQUE"`), `bloque_id` *(nullable)*, `docente_id`, `docente_nombre`, `area_id`, `area_nombre`, `grado_seccion`, `ambiente_uso`, `bienes_ids` (`string[]`), `cantidad_equipos`, `accesorios_entregados`, `fecha_salida`, `fecha_devolucion_estimada`, `fecha_devolucion_real`, `estado` (`"ACTIVO"` | `"DEVUELTO"` | `"CON_INCIDENCIA"`), `observacion_retorno`, `usuario_entrega_id`, `usuario_recepcion_id`.
* **`movimientos/{id}`**
  * `bien_id`, `codigo_patrimonial`, `ambiente_origen_id`, `ambiente_destino_id`, `responsable_recepcion`, `motivo`, `usuario_id`, `fecha_movimiento`.
* **`mantenimientos/{id}`**
  * `bien_id`, `codigo_patrimonial`, `tipo` (`"PREVENTIVO"` | `"CORRECTIVO"`), `descripcion_falla`, `trabajo_realizado`, `repuestos`, `tecnico`, `fecha_inicio`, `fecha_fin`, `estado_conservacion_resultante` (`N`/`B`/`R`/`M`), `cerrado` (`boolean`).
* **`auditoria_logs/{id}`**
  * `usuario_id`, `usuario_email`, `accion`, `coleccion`, `documento_id`, `detalle`, `fecha`.

---

## 6. Requerimientos Funcionales por Módulo

1. **Autenticación (`auth`):** Pantalla de inicio de sesión limpia, recuperación de contraseña y cierre automático o manual seguro.
2. **Dashboard y Analítica Pedagógica (`dashboard`):**
   * Tarjetas KPI: Total de equipos, Operativos, Prestados en circulación (tiempo real), En mantenimiento y Estado Regular/Malo.
   * Distribución de equipos por ambiente (gráfico de barras).
   * Uso de equipos por **Asignatura / Área Curricular**.
   * Ranking de **Docentes con uso frecuente** y lista de **Docentes sin uso reciente** (30/60 días).
   * Indicador de desgaste (equipos con más préstamos acumulados) y mapa de calor por días/horas pico.
3. **Inventario e Importación (`inventario`):**
   * Tabla con búsqueda instantánea (por código patrimonial, serie, modelo o etiqueta interna) y filtros combinados por ambiente, categoría, estado de conservación y estado operativo.
   * Validación estricta para normalizar textos (evitar errores de tipeo en modelos/marcas) y bloquear duplicados de código patrimonial o serie.
   * Asistente de importación en 3 pasos: (1) Descargar plantilla Excel oficial, (2) Subir `.xlsx`/`.csv` y visualizar tabla previa con alertas de errores o duplicados, (3) Confirmar inserción por lotes.
4. **Distribución y Traslados (`distribucion`):**
   * Traslado individual o múltiple entre ambientes mediante transacción atómica (actualiza `ambiente_id` + crea registro en `movimientos`).
   * Emisión de **Acta de Entrega / Cargo de Recepción en PDF** con bloques de firma.
5. **Préstamos con QR (`prestamos`):**
   * Escaneo de QR individual o **QR Maestro de Bloque** (carga todas las unidades disponibles del bloque y permite desmarcar excepciones).
   * Validación automática: impide prestar equipos que ya estén `PRESTADO`, `EN_MANTENIMIENTO` o `BAJA`.
   * Flujo de devolución con checklist rápido (`cargador/cables`, `incidencia técnica`); si reporta falla, ofrece abrir ticket directo en Mantenimiento.
6. **Mantenimiento (`mantenimiento`):**
   * Registro de ingresos a soporte preventivo/correctivo, seguimiento de reparaciones y actualización automática del estado operativo y de conservación al cerrar la atención.
7. **Reportes y Backups (`reportes`):**
   * **Reporte Anexo 01 en Excel (`.xlsx`) y PDF:** Fiel al encabezado institucional UGEL Bagua y tabla de 9 columnas oficiales, respetando filtros activos (**por ambiente específico** o **inventario general**).
   * **Informe Mensual de Impacto TIC (PDF):** Resumen ejecutivo con estadísticas de préstamos por área y docente para Dirección.
   * **Etiquetas QR Imprimibles (PDF):** Hoja lista para imprimir y pegar en equipos y lotes.
   * **Backup Total (`.json`):** Descarga íntegra de todas las colecciones y herramienta de restauración con validación de esquema (solo `ADMIN`).
8. **Configuración (`configuracion`):**
   * Gestión de usuarios (crear/desactivar cuentas y asignar rol `ADMIN` o `DIRECCION`).
   * Edición de cabecera institucional del Anexo 01.
   * Administración dinámica de Ambientes, Categorías de Equipos, Áreas Curriculares y Padrón de Docentes.

---

## 7. Estructura de Carpetas y Convenciones para Antigravity

```text
sigi-aip-mamm/
├── .github/
│   └── workflows/
│       └── firebase-deploy.yml   # CI/CD automático a Firebase Hosting
├── docs/
│   └── FICHA_TECNICA.md          # Este documento (contexto maestro)
├── public/
├── src/
│   ├── config/
│   │   └── firebase.ts           # Única conexión usando import.meta.env.VITE_FIREBASE_*
│   ├── types/                    # Interfaces TypeScript estrictas
│   ├── repositories/             # Capa de acceso a datos (desacoplada de la UI)
│   ├── hooks/                    # useAuth, usePermissions, useOnlineStatus
│   ├── utils/
│   │   ├── excelExport.ts        # Generador Anexo 01 XLSX
│   │   ├── pdfExport.ts          # Generador Anexo 01 PDF, Actas e Informe TIC
│   │   ├── importValidator.ts    # Validador de importación masiva Excel/CSV
│   │   └── backupManager.ts      # Exportar e importar Backup JSON
│   ├── components/               # Layout, Sidebar, Badges de estado, QRScanner, QRModal
│   └── modules/
│       ├── auth/
│       ├── dashboard/
│       ├── inventario/
│       ├── distribucion/
│       ├── prestamos/
│       ├── mantenimiento/
│       ├── reportes/
│       └── configuracion/
├── firestore.rules               # Reglas de seguridad RBAC en servidor
├── firestore.indexes.json        # Índices compuestos para filtros y métricas
├── .env.example                  # Plantilla de variables sin secretos
└── .gitignore                    # Bloquea .env, llaves y backups reales
```

### Reglas Estrictas de Desarrollo
1. **Desacoplamiento:** Los componentes en `src/modules/` y `src/components/` **nunca** deben importar funciones directas de `firebase/firestore`; toda consulta debe pasar por `src/repositories/`.
2. **Sin secretos en código:** Toda credencial se lee únicamente desde `import.meta.env.VITE_FIREBASE_*`.
3. **Idioma y UX:** Toda la interfaz, mensajes de validación, reportes y etiquetas deben estar en **español claro**, con indicadores visuales de estado de conexión (*En línea* / *Modo sin conexión*).
4. **Optimización de Cuota Firebase:** Evitar listeners en tiempo real innecesarios sobre colecciones históricas completas; usar paginación, filtros por rango de fechas y contadores agregados para mantenerse cómodamente dentro del Plan Spark gratuito.

---

## 8. Plan de Desarrollo por Fases (Ruta Supervisada)

| Fase | Nombre | Alcance Técnico | Criterio de Aprobación (Gate de Calidad) |
| :---: | :--- | :--- | :--- |
| **Fase 0** | **Cimientos, Repo y CI/CD** | Inicializar Vite + React + TS + Tailwind + Shadcn/UI, crear `.gitignore`, `.env.example`, conexión Firebase con persistencia offline y workflow de GitHub Actions. | Repo privado limpio sin secretos expuestos; deploy automático en verde hacia Firebase Hosting. |
| **Fase 1** | **Seguridad, Login y Configuración** | Login, contexto de roles (`ADMIN`/`DIRECCION`), `firestore.rules`, Layout responsivo y módulo **Configuración** (usuarios, cabecera Anexo 01, ambientes y categorías). | Auditoría de `firestore.rules` aprobada; usuario `DIRECCION` bloqueado para escritura en servidor y UI. |
| **Fase 2** | **Core de Inventario e Importación** | CRUD completo de bienes, buscador, filtros combinados, validación de unicidad y asistente de importación Excel/CSV con vista previa. | Carga exitosa de lote real de equipos detectando duplicados y separando `etiqueta_interna` de `observacion`. |
| **Fase 3** | **Distribución, Mantenimiento y QR** | Traslados transaccionales entre ambientes, Acta de Entrega PDF, módulo de Mantenimientos y generador de etiquetas QR imprimibles. | Traslado actualiza ubicación y registra movimiento atómicamente; etiqueta QR escaneable físicamente. |
| **Fase 4** | **Préstamos con QR (Individual y Bloques)** | Padrón de docentes/áreas, creación de bloques/lotes, flujo rápido de salida y retorno por QR (<15 s) y vinculación de incidencias a mantenimiento. | Bloqueo de doble préstamo verificado; escaneo funcional desde celular en HTTPS y por lector USB. |
| **Fase 5** | **Analítica de Uso Pedagógico** | Dashboard en tiempo real con equipos en circulación, gráficos por asignatura, ranking/inactividad docente, desgaste de equipos y mapa de calor horario. | Consultas optimizadas sin lecturas redundantes; datos consistentes con préstamos de prueba. |
| **Fase 6** | **Reportes Oficiales (Excel/PDF) y Backups** | Generador de Anexo 01 en Excel y PDF (por ambiente y general), Informe Mensual TIC PDF y módulo de Exportar/Restaurar Backup JSON. | Anexo 01 validado columna por columna contra el formato UGEL Bagua; restauración de Backup JSON verificada. |
| **Fase 7** | **Migración Opción B y Puerta Híbrida** | Creación del proyecto limpio en correo institucional, actualización de GitHub Secrets, carga limpia vía Backup JSON y script de respaldo diario al servidor escolar HP. | Acceso validado en producción desde ventana incógnito y verificación del respaldo automático local en Windows Server. |