import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  QrCode,
  PlusCircle,
  Clock,
  RotateCcw,
  Printer,
  FileText,
  Search,
  BookOpen,
  User,
  MapPin,
  Laptop,
  CheckCircle2,
  AlertTriangle,
  Camera,
  Layers,
  Trash2,
  AlertCircle,
  Check,
  Hash,
  Minus,
  Plus,
  ExternalLink,
} from 'lucide-react';
import {
  Prestamo,
  BienPatrimonial as Bien,
  Docente,
  AreaCurricular,
  BloqueEquipos as BloqueEquipo,
  Ambiente,
  CategoriaEquipo,
  InstitucionConfig as ConfiguracionSistema,
  esAmbientePrestable,
} from '@/types';
import {
  prestamoRepository,
  bienRepository,
  docenteRepository,
  areaCurricularRepository,
  bloqueRepository,
  ambienteRepository,
  categoriaRepository,
  configuracionRepository,
} from '@/repositories';
import { useAuth } from '@/context/AuthContext';
import { EscanerQRModal } from './EscanerQRModal';
import { ModalDevolucionPrestamo } from './ModalDevolucionPrestamo';
import { ConstanciaPrestamoModal } from './ConstanciaPrestamoModal';
import { GeneradorEtiquetasQR } from './GeneradorEtiquetasQR';
import { CatalogosPedagogicosTab } from './CatalogosPedagogicosTab';

export const PrestamosModule: React.FC = () => {
  const { user, perfil } = useAuth();
  const esAdmin = perfil?.rol === 'ADMIN';

  // Tabs principales
  const [tabActiva, setTabActiva] = useState<
    'CONTROL' | 'NUEVO' | 'ETIQUETAS' | 'CATALOGOS'
  >('CONTROL');

  // Sub-vista de Control de Préstamos
  const [subVistaControl, setSubVistaControl] = useState<'ACTIVOS' | 'HISTORIAL'>('ACTIVOS');

  // Estados de datos
  const [prestamosActivos, setPrestamosActivos] = useState<Prestamo[]>([]);
  const [prestamosHistorial, setPrestamosHistorial] = useState<Prestamo[]>([]);
  const [bienes, setBienes] = useState<Bien[]>([]);
  const [docentes, setDocentes] = useState<Docente[]>([]);
  const [areas, setAreas] = useState<AreaCurricular[]>([]);
  const [bloques, setBloques] = useState<BloqueEquipo[]>([]);
  const [ambientes, setAmbientes] = useState<Ambiente[]>([]);
  const [categorias, setCategorias] = useState<CategoriaEquipo[]>([]);
  const [configuracion, setConfiguracion] = useState<ConfiguracionSistema | null>(null);
  const [cargando, setCargando] = useState(true);

  // Estados para Modales
  const [modalScannerOpen, setModalScannerOpen] = useState(false);
  const [modalDevolucionOpen, setModalDevolucionOpen] = useState(false);
  const [prestamoParaDevolver, setPrestamoParaDevolver] = useState<Prestamo | null>(null);
  const [modalConstanciaOpen, setModalConstanciaOpen] = useState(false);
  const [prestamoParaConstancia, setPrestamoParaConstancia] = useState<Prestamo | null>(null);

  // Estado del Formulario de Nuevo Préstamo
  const [docenteId, setDocenteId] = useState('');
  const [areaId, setAreaId] = useState('');
  const [grado, setGrado] = useState('1°');
  const [seccion, setSeccion] = useState('A');
  const [ambienteUso, setAmbienteUso] = useState('Aula 1A');
  const [accesoriosSeleccionados, setAccesoriosSeleccionados] = useState<string[]>([]);
  const [duracionHoras, setDuracionHoras] = useState(2);
  const [carritoBienes, setCarritoBienes] = useState<Bien[]>([]);

  // Entrada rápida por teclado / lector USB (Modalidad 2)
  const [codigoRapido, setCodigoRapido] = useState('');
  const [mensajeRapido, setMensajeRapido] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(
    null
  );
  const inputRapidoRef = useRef<HTMLInputElement>(null);

  // Modalidad 3: Selección Rápida por Cantidad
  const [cantidadCategoriaFiltro, setCantidadCategoriaFiltro] = useState<string>('TODAS');
  const [cantidadAmbienteFiltro, setCantidadAmbienteFiltro] = useState<string>('TODOS');
  const [cantidadDeseada, setCantidadDeseada] = useState<number>(1);

  // Modalidad 4: Selector de Bloque Masivo
  const [bloqueSeleccionadoId, setBloqueSeleccionadoId] = useState('');
  const [bloqueModoCantidad, setBloqueModoCantidad] = useState<'TODOS' | 'PARCIAL'>('TODOS');
  const [bloqueCantidadParcial, setBloqueCantidadParcial] = useState<number>(1);

  // Búsqueda en historial
  const [busquedaHistorial, setBusquedaHistorial] = useState('');

  // Accesorios disponibles
  const listaAccesoriosDisponibles = [
    'Cargador / Adaptador',
    'Mouse USB',
    'Cable HDMI',
    'Cable de Red RJ-45',
    'Extensión eléctrica',
    'Puntero Láser',
  ];

  // Cargar datos completos
  const cargarDatos = async () => {
    try {
      setCargando(true);
      const [
        activos,
        historial,
        bienesList,
        docentesList,
        areasList,
        bloquesList,
        ambientesList,
        categoriasList,
        config,
      ] = await Promise.all([
        prestamoRepository.listarActivos(),
        prestamoRepository.listarHistorial(),
        bienRepository.listar(),
        docenteRepository.listar(),
        areaCurricularRepository.listar(),
        bloqueRepository.listar(),
        ambienteRepository.listar(),
        categoriaRepository.listar(),
        configuracionRepository.obtenerInstitucion(),
      ]);

      setPrestamosActivos(activos);
      setPrestamosHistorial(historial);
      setBienes(bienesList);
      setDocentes(docentesList);
      setAreas(areasList);
      setBloques(bloquesList);
      setAmbientes(ambientesList);
      setCategorias(categoriasList);
      setConfiguracion(config);
    } catch (err) {
      console.error('Error al cargar datos de préstamos:', err);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, []);

  // Ambientes pertenecientes al Stock AIP
  const ambientesAIP = useMemo(() => {
    return ambientes.filter((a) => esAmbientePrestable(a) && a.activo !== false);
  }, [ambientes]);

  // Bienes disponibles para prestar (deben ser OPERATIVO, activos y estar ubicados en un ambiente AIP)
  const bienesOperativos = useMemo(() => {
    return bienes.filter((b) => {
      if (b.activo === false || b.estado_operativo !== 'OPERATIVO') return false;
      const amb = ambientes.find((a) => a.id === b.ambiente_id);
      return esAmbientePrestable(amb);
    });
  }, [bienes, ambientes]);

  // Equipos disponibles para el selector por cantidad (filtrados, en AIP y ordenados por etiqueta interna)
  const equiposDisponiblesParaCantidad = useMemo(() => {
    const idsEnCarrito = new Set(carritoBienes.map((b) => b.id));
    return bienes
      .filter((b) => {
        if (b.activo === false) return false;
        if (b.estado_operativo !== 'OPERATIVO') return false;
        const amb = ambientes.find((a) => a.id === b.ambiente_id);
        if (!esAmbientePrestable(amb)) return false;
        if (idsEnCarrito.has(b.id)) return false;
        if (cantidadCategoriaFiltro !== 'TODAS' && b.categoria_id !== cantidadCategoriaFiltro) {
          return false;
        }
        if (cantidadAmbienteFiltro !== 'TODOS' && b.ambiente_id !== cantidadAmbienteFiltro) {
          return false;
        }
        return true;
      })
      .sort((a, b) =>
        (a.etiqueta_interna || '').localeCompare(b.etiqueta_interna || '', undefined, {
          numeric: true,
        })
      );
  }, [bienes, ambientes, carritoBienes, cantidadCategoriaFiltro, cantidadAmbienteFiltro]);

  // Equipos disponibles dentro del bloque seleccionado (no en carrito, operativos y estrictamente en stock AIP)
  const equiposDisponiblesEnBloque = useMemo(() => {
    if (!bloqueSeleccionadoId) return [];
    const bloque = bloques.find((b) => b.id === bloqueSeleccionadoId);
    if (!bloque) return [];
    const idsEnCarrito = new Set(carritoBienes.map((c) => c.id));
    return bienes
      .filter((b) => {
        if (!bloque.bienes_ids.includes(b.id)) return false;
        if (b.estado_operativo !== 'OPERATIVO' || b.activo === false) return false;
        const amb = ambientes.find((a) => a.id === b.ambiente_id);
        if (!esAmbientePrestable(amb)) return false;
        return !idsEnCarrito.has(b.id);
      })
      .sort((a, b) =>
        (a.etiqueta_interna || '').localeCompare(b.etiqueta_interna || '', undefined, {
          numeric: true,
        })
      );
  }, [bloqueSeleccionadoId, bloques, bienes, ambientes, carritoBienes]);

  // Manejo de Carrito con Bloqueo Estricto de Duplicados y Validación de Stock AIP
  const agregarAlCarrito = (bien: Bien) => {
    // 1. Validar que el equipo pertenezca al stock AIP
    const amb = ambientes.find((a) => a.id === bien.ambiente_id);
    if (!esAmbientePrestable(amb)) {
      setMensajeRapido({
        tipo: 'error',
        texto: `El equipo ${bien.etiqueta_interna || bien.codigo_patrimonial} se encuentra distribuido en ${
          amb?.nombre || 'otro ambiente'
        } (fuera del AIP). Registre primero su retorno en Distribución.`,
      });
      return;
    }

    // 2. Validar estado operativo
    if (bien.estado_operativo !== 'OPERATIVO') {
      setMensajeRapido({
        tipo: 'error',
        texto: `El equipo ${bien.etiqueta_interna || bien.codigo_patrimonial} no está disponible (${bien.estado_operativo}).`,
      });
      return;
    }

    // 3. Prevenir duplicados con actualización funcional
    let yaEstaba = false;
    setCarritoBienes((prev) => {
      if (prev.some((b) => b.id === bien.id)) {
        yaEstaba = true;
        return prev;
      }
      return [...prev, bien];
    });

    if (yaEstaba) {
      setMensajeRapido({
        tipo: 'error',
        texto: `${bien.etiqueta_interna || bien.codigo_patrimonial} ya fue agregado al préstamo.`,
      });
    } else {
      setMensajeRapido({
        tipo: 'ok',
        texto: `+ ${bien.etiqueta_interna || bien.codigo_patrimonial} (${bien.denominacion}) agregado al préstamo.`,
      });
    }
  };

  // Agregar lote de equipos sin duplicar y validando stock AIP
  const agregarVariosAlCarrito = (nuevos: Bien[], origenNombre?: string, avisoAdicional?: string) => {
    let cantidadAgregados = 0;
    let duplicados = 0;

    setCarritoBienes((prev) => {
      const idsActuales = new Set(prev.map((b) => b.id));
      const aAgregar: Bien[] = [];

      for (const bien of nuevos) {
        if (bien.estado_operativo !== 'OPERATIVO') continue;
        const amb = ambientes.find((a) => a.id === bien.ambiente_id);
        if (!esAmbientePrestable(amb)) continue;

        if (idsActuales.has(bien.id)) {
          duplicados++;
          continue;
        }
        idsActuales.add(bien.id);
        aAgregar.push(bien);
      }

      cantidadAgregados = aAgregar.length;
      return [...prev, ...aAgregar];
    });

    if (cantidadAgregados > 0) {
      const detalleDuplicados =
        duplicados > 0 ? ` (${duplicados} omitido(s) por ya estar en la lista)` : '';
      setMensajeRapido({
        tipo: 'ok',
        texto: `¡Se agregaron ${cantidadAgregados} equipo(s)${
          origenNombre ? ` (${origenNombre})` : ''
        }!${detalleDuplicados}${avisoAdicional || ''}`,
      });
    } else if (duplicados > 0) {
      setMensajeRapido({
        tipo: 'error',
        texto: `Los equipos seleccionados ya se encontraban agregados en el préstamo.${avisoAdicional || ''}`,
      });
    } else if (avisoAdicional) {
      setMensajeRapido({
        tipo: 'error',
        texto: avisoAdicional.trim(),
      });
    }
  };

  const quitarDelCarrito = (bienId: string) => {
    setCarritoBienes((prev) => prev.filter((b) => b.id !== bienId));
  };

  // Entrada rápida por teclado o lector USB (detecta Enter)
  const handleCodigoRapidoSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const codigo = codigoRapido.trim().toUpperCase();
    if (!codigo) return;

    const encontrado = bienes.find(
      (b) =>
        (b.etiqueta_interna && b.etiqueta_interna.toUpperCase() === codigo) ||
        (b.codigo_patrimonial && b.codigo_patrimonial.toUpperCase() === codigo) ||
        (b.serie && b.serie.toUpperCase() === codigo) ||
        (b.numero_serie && b.numero_serie.toUpperCase() === codigo)
    );

    if (!encontrado) {
      setMensajeRapido({
        tipo: 'error',
        texto: `No se encontró ningún equipo con código "${codigo}".`,
      });
    } else {
      agregarAlCarrito(encontrado);
      setCodigoRapido('');
    }

    // Reenfocar para escaneos continuos
    setTimeout(() => {
      inputRapidoRef.current?.focus();
    }, 50);
  };

  // Modalidad 3: Agregar equipos por cantidad consecutiva
  const handleAgregarPorCantidad = () => {
    if (equiposDisponiblesParaCantidad.length === 0) return;
    const maxDisponibles = equiposDisponiblesParaCantidad.length;
    const cantidadFinal = Math.min(Math.max(1, cantidadDeseada), maxDisponibles);
    const seleccionados = equiposDisponiblesParaCantidad.slice(0, cantidadFinal);
    agregarVariosAlCarrito(seleccionados, `Cantidad: ${cantidadFinal}`);
    setCantidadDeseada(1);
  };

  // Modalidad 4: Carga por bloque masivo (todos o parcial, omitiendo equipos fuera de AIP)
  const handleCargarBloque = () => {
    if (!bloqueSeleccionadoId) return;
    const bloque = bloques.find((b) => b.id === bloqueSeleccionadoId);
    if (!bloque) return;

    const todosDelBloque = bienes.filter((b) => bloque.bienes_ids.includes(b.id));
    const fueraAIP = todosDelBloque.filter((b) => {
      const amb = ambientes.find((a) => a.id === b.ambiente_id);
      return !esAmbientePrestable(amb);
    });

    if (equiposDisponiblesEnBloque.length === 0) {
      const enMantenimiento = todosDelBloque.filter((b) => b.estado_operativo !== 'OPERATIVO').length;
      const yaEnCarrito = todosDelBloque.filter((b) => carritoBienes.some((c) => c.id === b.id)).length;

      const causas: string[] = [];
      if (fueraAIP.length > 0) causas.push(`${fueraAIP.length} distribuido(s) fuera del AIP`);
      if (yaEnCarrito > 0) causas.push(`${yaEnCarrito} ya en lista`);
      if (enMantenimiento > 0) causas.push(`${enMantenimiento} en soporte/mantenimiento`);

      setMensajeRapido({
        tipo: 'error',
        texto: `No hay equipos disponibles en el bloque "${bloque.nombre}"${
          causas.length > 0 ? ` (${causas.join(', ')})` : ''
        }.`,
      });
      return;
    }

    const maxDisp = equiposDisponiblesEnBloque.length;
    const cantidadFinal =
      bloqueModoCantidad === 'TODOS'
        ? maxDisp
        : Math.min(Math.max(1, bloqueCantidadParcial), maxDisp);

    const seleccionados = equiposDisponiblesEnBloque.slice(0, cantidadFinal);

    let avisoAdicional = '';
    if (fueraAIP.length > 0) {
      avisoAdicional = ` (Se omitieron ${fueraAIP.length} equipo(s) distribuidos fuera del AIP: ${fueraAIP
        .map((f) => f.etiqueta_interna)
        .join(', ')})`;
    }

    agregarVariosAlCarrito(seleccionados, `Bloque ${bloque.nombre}`, avisoAdicional);
    setBloqueSeleccionadoId('');
    setBloqueCantidadParcial(1);
  };

  const toggleAccesorio = (acc: string) => {
    setAccesoriosSeleccionados((prev) =>
      prev.includes(acc) ? prev.filter((a) => a !== acc) : [...prev, acc]
    );
  };

  // Confirmar y generar préstamo
  const handleCrearPrestamo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!docenteId) {
      alert('Por favor selecciona el docente solicitante.');
      return;
    }
    if (carritoBienes.length === 0) {
      alert('Debes agregar al menos un equipo informático al préstamo.');
      return;
    }

    const docObj = docentes.find((d) => d.id === docenteId);
    const areaObj = areas.find((a) => a.id === areaId);

    const fechaSalida = new Date();
    const fechaEstimada = new Date(fechaSalida.getTime() + duracionHoras * 60 * 60 * 1000);

    const operadorInfo = perfil
      ? { uid: perfil.uid, email: perfil.email, rol: perfil.rol, nombre: perfil.nombres }
      : undefined;

    try {
      setCargando(true);
      const docNombre =
        docObj?.nombres_apellidos ||
        (docObj ? `${docObj.apellidos || ''}, ${docObj.nombres || ''}` : 'DOCENTE');

      const idsDeduplicados = Array.from(new Set(carritoBienes.map((b) => b.id)));

      const prestamoData: Omit<Prestamo, 'id'> = {
        tipo: idsDeduplicados.length > 1 ? 'BLOQUE' : 'INDIVIDUAL',
        bloque_id: null,
        docente_id: docenteId,
        docente_nombre: docNombre,
        area_id: areaId,
        area_nombre: areaObj?.nombre || 'General',
        grado_seccion: `${grado} ${seccion}`,
        ambiente_uso: ambienteUso,
        bienes_ids: idsDeduplicados,
        cantidad_equipos: idsDeduplicados.length,
        accesorios_entregados: accesoriosSeleccionados.join(', '),
        fecha_salida: fechaSalida.toISOString(),
        fecha_devolucion_estimada: fechaEstimada.toISOString(),
        fecha_devolucion_real: null,
        estado: 'ACTIVO',
        observacion_retorno: '',
        usuario_entrega_id: user?.uid || 'AIP',
        usuario_recepcion_id: undefined,
      };

      const prestamoId = await prestamoRepository.registrarPrestamo(prestamoData, operadorInfo);

      // Recargar datos y abrir la constancia imprimible
      await cargarDatos();

      // Limpiar formulario
      setCarritoBienes([]);
      setAccesoriosSeleccionados([]);

      // Abrir constancia
      const prestamoCreado = await prestamoRepository.obtenerPorId(prestamoId);
      if (prestamoCreado) {
        setPrestamoParaConstancia(prestamoCreado);
        setModalConstanciaOpen(true);
      }

      setTabActiva('CONTROL');
    } catch (err: any) {
      alert(err.message || 'Error al registrar el préstamo.');
    } finally {
      setCargando(false);
    }
  };

  // KPIs
  const totalActivosHoy = prestamosActivos.length;
  const totalEquiposPrestados = prestamosActivos.reduce(
    (acc, p) => acc + (p.cantidad_equipos || p.bienes_ids.length),
    0
  );
  const totalDemorados = prestamosActivos.filter((p) => {
    if (!p.fecha_devolucion_estimada) return false;
    return new Date(p.fecha_devolucion_estimada).getTime() < Date.now();
  }).length;
  const mesActual = new Date().getMonth();
  const anioActual = new Date().getFullYear();
  const totalDevueltosMes = prestamosHistorial.filter((p) => {
    if (!p.fecha_devolucion_real) return false;
    const d = new Date(p.fecha_devolucion_real);
    return d.getMonth() === mesActual && d.getFullYear() === anioActual;
  }).length;

  // Filtrar historial
  const historialFiltrado = useMemo(() => {
    if (!busquedaHistorial.trim()) return prestamosHistorial;
    const q = busquedaHistorial.toLowerCase().trim();
    return prestamosHistorial.filter((p) => {
      return (
        p.docente_nombre.toLowerCase().includes(q) ||
        p.area_nombre.toLowerCase().includes(q) ||
        p.grado_seccion.toLowerCase().includes(q) ||
        p.ambiente_uso.toLowerCase().includes(q) ||
        p.id.toLowerCase().includes(q)
      );
    });
  }, [prestamosHistorial, busquedaHistorial]);

  return (
    <div className="space-y-6">
      {/* Encabezado del Módulo */}
      <div className="no-print flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center space-x-2.5">
            <QrCode className="w-7 h-7 text-indigo-600" />
            <span>Módulo de Préstamos y Control QR</span>
          </h1>
          <p className="text-sm text-slate-500">
            Atención rápida a docentes, escaneo con cámara y lectores de código de barras
          </p>
        </div>

        {/* Botón de acceso rápido a Nuevo Préstamo */}
        {esAdmin && tabActiva !== 'NUEVO' && (
          <button
            onClick={() => setTabActiva('NUEVO')}
            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-xl shadow-md transition-all flex items-center space-x-2 self-start sm:self-auto"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Nuevo Préstamo QR</span>
          </button>
        )}
      </div>

      {/* Pestañas Principales */}
      <div className="no-print flex border-b border-slate-200 space-x-2 overflow-x-auto">
        <button
          onClick={() => setTabActiva('CONTROL')}
          className={`py-3 px-5 text-xs font-bold border-b-2 transition-all flex items-center space-x-2 whitespace-nowrap ${
            tabActiva === 'CONTROL'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>Control de Préstamos ({prestamosActivos.length})</span>
        </button>

        {esAdmin && (
          <button
            onClick={() => setTabActiva('NUEVO')}
            className={`py-3 px-5 text-xs font-bold border-b-2 transition-all flex items-center space-x-2 whitespace-nowrap ${
              tabActiva === 'NUEVO'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <PlusCircle className="w-4 h-4" />
            <span>Nuevo Préstamo y Escáner QR</span>
            {carritoBienes.length > 0 && (
              <span className="ml-1.5 px-2 py-0.5 bg-indigo-100 text-indigo-800 rounded-full text-[10px] font-extrabold">
                {carritoBienes.length}
              </span>
            )}
          </button>
        )}

        <button
          onClick={() => setTabActiva('ETIQUETAS')}
          className={`py-3 px-5 text-xs font-bold border-b-2 transition-all flex items-center space-x-2 whitespace-nowrap ${
            tabActiva === 'ETIQUETAS'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Printer className="w-4 h-4" />
          <span>Generador de Etiquetas QR</span>
        </button>

        <button
          onClick={() => setTabActiva('CATALOGOS')}
          className={`py-3 px-5 text-xs font-bold border-b-2 transition-all flex items-center space-x-2 whitespace-nowrap ${
            tabActiva === 'CATALOGOS'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>Catálogos Pedagógicos</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* PESTAÑA 1: CONTROL DE PRÉSTAMOS (ACTIVOS E HISTORIAL)                     */}
      {/* ========================================================================= */}
      {tabActiva === 'CONTROL' && (
        <div className="space-y-6">
          {/* 4 Tarjetas KPI */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center space-x-3.5">
              <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
                <Clock className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs text-slate-500 font-medium">Préstamos Activos</p>
                <p className="text-2xl font-black text-slate-800">{totalActivosHoy}</p>
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center space-x-3.5">
              <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
                <Laptop className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs text-slate-500 font-medium">Equipos Prestados</p>
                <p className="text-2xl font-black text-slate-800">{totalEquiposPrestados}</p>
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center space-x-3.5">
              <div
                className={`p-3 rounded-xl ${
                  totalDemorados > 0 ? 'bg-rose-50 text-rose-600' : 'bg-slate-50 text-slate-400'
                }`}
              >
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs text-slate-500 font-medium">Demorados / Vencidos</p>
                <p
                  className={`text-2xl font-black ${
                    totalDemorados > 0 ? 'text-rose-600' : 'text-slate-800'
                  }`}
                >
                  {totalDemorados}
                </p>
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center space-x-3.5">
              <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs text-slate-500 font-medium">Devoluciones del Mes</p>
                <p className="text-2xl font-black text-slate-800">{totalDevueltosMes}</p>
              </div>
            </div>
          </div>

          {/* Selector de subvista: Activos vs Historial */}
          <div className="flex items-center justify-between bg-white p-3 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex space-x-2">
              <button
                onClick={() => setSubVistaControl('ACTIVOS')}
                className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                  subVistaControl === 'ACTIVOS'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                Préstamos en Curso ({prestamosActivos.length})
              </button>
              <button
                onClick={() => setSubVistaControl('HISTORIAL')}
                className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                  subVistaControl === 'HISTORIAL'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                Historial de Devoluciones ({prestamosHistorial.length})
              </button>
            </div>

            {subVistaControl === 'HISTORIAL' && (
              <div className="relative w-64">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={busquedaHistorial}
                  onChange={(e) => setBusquedaHistorial(e.target.value)}
                  placeholder="Buscar por docente, área..."
                  className="w-full text-xs pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none"
                />
              </div>
            )}
          </div>

          {/* Subvista: PRÉSTAMOS ACTIVOS */}
          {subVistaControl === 'ACTIVOS' && (
            <div className="space-y-4">
              {prestamosActivos.length === 0 ? (
                <div className="p-12 text-center bg-white rounded-2xl border border-dashed border-slate-300">
                  <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-2" />
                  <p className="text-base font-bold text-slate-800">
                    No hay préstamos activos en este momento
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    Todos los equipos del Aula de Innovación Pedagógica se encuentran disponibles.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {prestamosActivos.map((p) => {
                    const esVencido =
                      p.fecha_devolucion_estimada &&
                      new Date(p.fecha_devolucion_estimada).getTime() < Date.now();

                    const bienesDelP = bienes.filter((b) => p.bienes_ids.includes(b.id));

                    return (
                      <div
                        key={p.id}
                        className={`bg-white p-5 rounded-2xl border transition-all flex flex-col justify-between shadow-sm ${
                          esVencido ? 'border-rose-300 bg-rose-50/20' : 'border-slate-200'
                        }`}
                      >
                        <div>
                          {/* Cabecera de la tarjeta */}
                          <div className="flex items-center justify-between mb-3">
                            <span className="font-mono text-xs font-bold text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded border border-slate-200">
                              N° {p.id.slice(0, 8).toUpperCase()}
                            </span>
                            <span
                              className={`inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                                esVencido
                                  ? 'bg-rose-100 text-rose-800 animate-pulse'
                                  : 'bg-amber-100 text-amber-800'
                              }`}
                            >
                              <Clock className="w-3 h-3" />
                              <span>{esVencido ? 'Tiempo Excedido' : 'En Uso'}</span>
                            </span>
                          </div>

                          {/* Docente y Aula */}
                          <div className="space-y-1 mb-3">
                            <h3 className="text-base font-bold text-slate-900 leading-tight">
                              {p.docente_nombre}
                            </h3>
                            <p className="text-xs text-indigo-700 font-semibold">
                              {p.area_nombre} &bull; {p.grado_seccion}
                            </p>
                            <p className="text-xs text-slate-500 flex items-center space-x-1">
                              <MapPin className="w-3.5 h-3.5 text-slate-400" />
                              <span>Ubicación de uso: {p.ambiente_uso}</span>
                            </p>
                          </div>

                          {/* Equipos prestados en chips */}
                          <div className="mb-3">
                            <p className="text-[11px] font-bold text-slate-600 uppercase mb-1.5">
                              Equipos Asignados ({p.cantidad_equipos} unid.):
                            </p>
                            <div className="flex flex-wrap gap-1.5">
                              {bienesDelP.map((bien) => (
                                <span
                                  key={bien.id}
                                  className="px-2 py-0.5 bg-slate-100 border border-slate-300 text-slate-800 font-mono font-bold text-[11px] rounded"
                                  title={`${bien.denominacion} - Serie: ${bien.serie || bien.numero_serie || 'S/N'}`}
                                >
                                  {bien.etiqueta_interna}
                                </span>
                              ))}
                            </div>
                          </div>

                          {p.accesorios_entregados && (
                            <p className="text-[11px] text-slate-500 mb-3">
                              <b>Accesorios:</b> {p.accesorios_entregados}
                            </p>
                          )}

                          <div className="text-[11px] text-slate-400 pt-2 border-t border-slate-100 flex items-center justify-between">
                            <span>
                              Salida:{' '}
                              {new Date(p.fecha_salida).toLocaleTimeString('es-PE', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                            <span>
                              Retorno est:{' '}
                              {p.fecha_devolucion_estimada
                                ? new Date(p.fecha_devolucion_estimada).toLocaleTimeString(
                                    'es-PE',
                                    { hour: '2-digit', minute: '2-digit' }
                                  )
                                : '—'}
                            </span>
                          </div>
                        </div>

                        {/* Botones de acción */}
                        <div className="pt-4 mt-3 border-t border-slate-100 flex items-center justify-end space-x-2">
                          <button
                            onClick={() => {
                              setPrestamoParaConstancia(p);
                              setModalConstanciaOpen(true);
                            }}
                            className="px-3 py-1.5 text-xs text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-xl font-medium transition-colors flex items-center space-x-1.5"
                          >
                            <FileText className="w-3.5 h-3.5" />
                            <span>Constancia</span>
                          </button>

                          {esAdmin && (
                            <button
                              onClick={() => {
                                setPrestamoParaDevolver(p);
                                setModalDevolucionOpen(true);
                              }}
                              className="px-3.5 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow transition-colors flex items-center space-x-1.5"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                              <span>Registrar Devolución</span>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Subvista: HISTORIAL DE DEVOLUCIONES */}
          {subVistaControl === 'HISTORIAL' && (
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
              <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
                <thead className="bg-slate-50 font-semibold text-slate-600 text-[11px] uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Código</th>
                    <th className="py-3 px-4">Docente</th>
                    <th className="py-3 px-4">Área / Grado</th>
                    <th className="py-3 px-4">Cant. Equipos</th>
                    <th className="py-3 px-4">Fecha Salida / Retorno</th>
                    <th className="py-3 px-4 text-center">Estado</th>
                    <th className="py-3 px-4 text-right">Constancia</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {historialFiltrado.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-400">
                        No se encontraron registros de devoluciones.
                      </td>
                    </tr>
                  ) : (
                    historialFiltrado.map((p) => (
                      <tr key={p.id} className="hover:bg-slate-50">
                        <td className="py-3 px-4 font-mono font-bold text-slate-800">
                          {p.id.slice(0, 8).toUpperCase()}
                        </td>
                        <td className="py-3 px-4 font-semibold text-slate-900">
                          {p.docente_nombre}
                        </td>
                        <td className="py-3 px-4 text-slate-600">
                          {p.area_nombre} ({p.grado_seccion})
                        </td>
                        <td className="py-3 px-4 font-bold text-slate-800">
                          {p.cantidad_equipos} unid.
                        </td>
                        <td className="py-3 px-4 text-slate-600">
                          <p>
                            Salida:{' '}
                            {new Date(p.fecha_salida).toLocaleDateString('es-PE', {
                              day: '2-digit',
                              month: '2-digit',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </p>
                          {p.fecha_devolucion_real && (
                            <p className="text-[11px] text-slate-500">
                              Retorno:{' '}
                              {new Date(p.fecha_devolucion_real).toLocaleDateString('es-PE', {
                                day: '2-digit',
                                month: '2-digit',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </p>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span
                            className={`inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                              p.estado === 'DEVUELTO'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-rose-50 text-rose-700 border border-rose-200'
                            }`}
                          >
                            {p.estado === 'DEVUELTO' ? 'Conforme' : 'Con Incidencia'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => {
                              setPrestamoParaConstancia(p);
                              setModalConstanciaOpen(true);
                            }}
                            className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                            title="Reimprimir constancia"
                          >
                            <Printer className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* PESTAÑA 2: NUEVO PRÉSTAMO Y ESCÁNER QR                                   */}
      {/* ========================================================================= */}
      {tabActiva === 'NUEVO' && esAdmin && (
        <form onSubmit={handleCrearPrestamo} className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Columna Izquierda: Datos del Docente y la Sesión */}
            <div className="lg:col-span-1 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-slate-800 flex items-center space-x-2">
                <User className="w-4 h-4 text-indigo-600" />
                <span>Datos del Docente y la Sesión</span>
              </h3>

              {/* Docente */}
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Docente Solicitante *
                </label>
                <select
                  required
                  value={docenteId}
                  onChange={(e) => setDocenteId(e.target.value)}
                  className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">-- Seleccionar Docente --</option>
                  {docentes
                    .filter((d) => d.activo !== false)
                    .map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.nombres_apellidos || `${d.apellidos || ''}, ${d.nombres || ''}`} {d.dni ? `(DNI: ${d.dni})` : ''}
                      </option>
                    ))}
                </select>
              </div>

              {/* Área Curricular */}
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Área Curricular *
                </label>
                <select
                  required
                  value={areaId}
                  onChange={(e) => setAreaId(e.target.value)}
                  className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">-- Seleccionar Área --</option>
                  {areas
                    .filter((a) => a.activo !== false)
                    .map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.nombre}
                      </option>
                    ))}
                </select>
              </div>

              {/* Grado y Sección */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Grado *</label>
                  <select
                    value={grado}
                    onChange={(e) => setGrado(e.target.value)}
                    className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="1°">1° Grado</option>
                    <option value="2°">2° Grado</option>
                    <option value="3°">3° Grado</option>
                    <option value="4°">4° Grado</option>
                    <option value="5°">5° Grado</option>
                    <option value="AIP">AIP General</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Sección *
                  </label>
                  <select
                    value={seccion}
                    onChange={(e) => setSeccion(e.target.value)}
                    className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="A">Sección A</option>
                    <option value="B">Sección B</option>
                    <option value="C">Sección C</option>
                    <option value="D">Sección D</option>
                    <option value="E">Sección E</option>
                    <option value="Única">Única</option>
                  </select>
                </div>
              </div>

              {/* Ambiente de Uso */}
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Ambiente de Uso *
                </label>
                <input
                  type="text"
                  required
                  value={ambienteUso}
                  onChange={(e) => setAmbienteUso(e.target.value)}
                  placeholder="Ej. Aula 1A, AIP 1, Laboratorio, Patio"
                  className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Duración Estimada */}
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Duración Prevista (Horas pedagógicas)
                </label>
                <select
                  value={duracionHoras}
                  onChange={(e) => setDuracionHoras(Number(e.target.value))}
                  className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value={1}>1 Hora Pedagógica (45 min)</option>
                  <option value={2}>2 Horas Pedagógicas (90 min - 1 Bloque)</option>
                  <option value={3}>3 Horas Pedagógicas</option>
                  <option value={4}>4 Horas (Media jornada)</option>
                  <option value={6}>Jornada Completa</option>
                </select>
              </div>

              {/* Accesorios Entregados */}
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1.5">
                  Accesorios Adicionales Entregados
                </label>
                <div className="grid grid-cols-1 gap-1.5">
                  {listaAccesoriosDisponibles.map((acc) => {
                    const isChecked = accesoriosSeleccionados.includes(acc);
                    return (
                      <label
                        key={acc}
                        className={`flex items-center space-x-2 text-xs p-1.5 rounded-lg border cursor-pointer transition-colors ${
                          isChecked
                            ? 'bg-indigo-50 border-indigo-300 text-indigo-900 font-medium'
                            : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-white'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleAccesorio(acc)}
                          className="w-3.5 h-3.5 text-indigo-600 rounded cursor-pointer"
                        />
                        <span>{acc}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Columna Derecha: Métodos de Entrada + Carrito */}
            <div className="lg:col-span-2 space-y-5">
              {/* Caja de las 4 Modalidades de Entrada */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-800 flex items-center space-x-2">
                    <Laptop className="w-4 h-4 text-indigo-600" />
                    <span>Agregar Equipos al Préstamo (4 Modalidades)</span>
                  </h3>
                  <span className="text-xs text-slate-500">
                    Disponibles en AIP: <b>{bienesOperativos.length}</b> equipos
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Modalidad 1: Escáner Cámara */}
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex flex-col justify-between space-y-3">
                    <div>
                      <div className="flex items-center space-x-1.5 text-indigo-600 font-bold text-xs mb-1">
                        <Camera className="w-4 h-4" />
                        <span>1. Escáner con Cámara</span>
                      </div>
                      <p className="text-[11px] text-slate-500 leading-relaxed">
                        Usa la cámara web o del móvil para leer instantáneamente el QR de los equipos.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setModalScannerOpen(true)}
                      className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-lg shadow-sm transition-colors flex items-center justify-center space-x-1.5"
                    >
                      <Camera className="w-4 h-4" />
                      <span>Abrir Escáner QR</span>
                    </button>
                  </div>

                  {/* Modalidad 2: Entrada Rápida / Lector USB */}
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex flex-col justify-between space-y-3">
                    <div>
                      <div className="flex items-center space-x-1.5 text-indigo-600 font-bold text-xs mb-1">
                        <QrCode className="w-4 h-4" />
                        <span>2. Lector USB / Teclado</span>
                      </div>
                      <p className="text-[11px] text-slate-500 leading-relaxed">
                        Digita el código o escanea con pistola lectora de código de barras y presiona Enter.
                      </p>
                    </div>
                    <div>
                      <input
                        ref={inputRapidoRef}
                        type="text"
                        value={codigoRapido}
                        onChange={(e) => setCodigoRapido(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handleCodigoRapidoSubmit(e);
                          }
                        }}
                        placeholder="Ej. LAP-001 o Cód. Pat [Enter]"
                        className="w-full text-xs px-3 py-2 bg-white border border-slate-300 rounded-lg font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  </div>

                  {/* Modalidad 3: Selección Rápida por Cantidad (NUEVO) */}
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex flex-col justify-between space-y-3">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center space-x-1.5 text-indigo-600 font-bold text-xs">
                          <Hash className="w-4 h-4" />
                          <span>3. Selección por Cantidad</span>
                        </div>
                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                          Disponibles: {equiposDisponiblesParaCantidad.length}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 leading-relaxed">
                        Agrega N unidades consecutivas disponibles por categoría y ambiente.
                      </p>
                    </div>

                    <div className="space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        <select
                          value={cantidadCategoriaFiltro}
                          onChange={(e) => {
                            setCantidadCategoriaFiltro(e.target.value);
                            setCantidadDeseada(1);
                          }}
                          className="text-[11px] px-2 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        >
                          <option value="TODAS">Todas las Categorías</option>
                          {categorias.map((cat) => (
                            <option key={cat.id} value={cat.id}>
                              {cat.nombre}
                            </option>
                          ))}
                        </select>

                        <select
                          value={cantidadAmbienteFiltro}
                          onChange={(e) => {
                            setCantidadAmbienteFiltro(e.target.value);
                            setCantidadDeseada(1);
                          }}
                          className="text-[11px] px-2 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        >
                          <option value="TODOS">Todos los AIP</option>
                          {ambientesAIP.map((amb) => (
                            <option key={amb.id} value={amb.id}>
                              {amb.nombre}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="flex items-center space-x-2">
                        {/* Contador - / + */}
                        <div className="flex items-center bg-white border border-slate-300 rounded-lg overflow-hidden flex-shrink-0">
                          <button
                            type="button"
                            onClick={() => setCantidadDeseada((prev) => Math.max(1, prev - 1))}
                            disabled={cantidadDeseada <= 1 || equiposDisponiblesParaCantidad.length === 0}
                            className="px-2 py-1.5 text-slate-600 hover:bg-slate-100 disabled:opacity-40 transition-colors"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <input
                            type="number"
                            min={1}
                            max={Math.max(1, equiposDisponiblesParaCantidad.length)}
                            value={cantidadDeseada}
                            onChange={(e) => {
                              const val = parseInt(e.target.value, 10);
                              if (!isNaN(val)) {
                                setCantidadDeseada(
                                  Math.min(Math.max(1, val), Math.max(1, equiposDisponiblesParaCantidad.length))
                                );
                              }
                            }}
                            className="w-12 text-center text-xs font-bold text-slate-800 focus:outline-none py-1"
                          />
                          <button
                            type="button"
                            onClick={() =>
                              setCantidadDeseada((prev) =>
                                Math.min(prev + 1, Math.max(1, equiposDisponiblesParaCantidad.length))
                              )
                            }
                            disabled={
                              cantidadDeseada >= equiposDisponiblesParaCantidad.length ||
                              equiposDisponiblesParaCantidad.length === 0
                            }
                            className="px-2 py-1.5 text-slate-600 hover:bg-slate-100 disabled:opacity-40 transition-colors"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Botón agregar */}
                        <button
                          type="button"
                          onClick={handleAgregarPorCantidad}
                          disabled={equiposDisponiblesParaCantidad.length === 0}
                          className="flex-1 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-semibold text-xs rounded-lg shadow-sm transition-colors flex items-center justify-center space-x-1"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>
                            {equiposDisponiblesParaCantidad.length === 0
                              ? 'Sin disponibles'
                              : `Agregar ${Math.min(cantidadDeseada, equiposDisponiblesParaCantidad.length)} unid.`}
                          </span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Modalidad 4: Bloque Masivo (MEJORADO) */}
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex flex-col justify-between space-y-3">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center space-x-1.5 text-indigo-600 font-bold text-xs">
                          <Layers className="w-4 h-4" />
                          <span>4. Bloque Masivo</span>
                        </div>
                        {bloqueSeleccionadoId && (
                          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                            Disponibles: {equiposDisponiblesEnBloque.length}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 leading-relaxed">
                        Carga conjuntos predefinidos (kits, carritos móviles) con opción total o parcial.
                      </p>
                    </div>

                    {bloques.filter((b) => b.activo !== false).length === 0 ? (
                      <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-[11px] text-amber-800 flex items-center justify-between">
                        <span>No hay bloques creados aún.</span>
                        <button
                          type="button"
                          onClick={() => setTabActiva('CATALOGOS')}
                          className="font-bold text-indigo-700 hover:underline flex items-center space-x-1"
                        >
                          <span>Crear Bloque</span>
                          <ExternalLink className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <select
                          value={bloqueSeleccionadoId}
                          onChange={(e) => {
                            setBloqueSeleccionadoId(e.target.value);
                            setBloqueCantidadParcial(1);
                          }}
                          className="w-full text-[11px] px-2 py-1.5 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-700"
                        >
                          <option value="">-- Seleccionar bloque de equipos --</option>
                          {bloques
                            .filter((b) => b.activo !== false)
                            .map((b) => (
                              <option key={b.id} value={b.id}>
                                {b.nombre} ({b.bienes_ids.length} equipos)
                              </option>
                            ))}
                        </select>

                        {bloqueSeleccionadoId && (
                          <div className="flex items-center space-x-2 pt-1 animate-fade-in">
                            {/* Opciones Todos / Parcial */}
                            <div className="flex items-center space-x-1 bg-white border border-slate-300 rounded-lg p-0.5 text-[10px] font-semibold text-slate-600 flex-shrink-0">
                              <button
                                type="button"
                                onClick={() => setBloqueModoCantidad('TODOS')}
                                className={`px-2 py-1 rounded transition-colors ${
                                  bloqueModoCantidad === 'TODOS'
                                    ? 'bg-indigo-600 text-white shadow-xs'
                                    : 'hover:text-slate-900'
                                }`}
                              >
                                Todos ({equiposDisponiblesEnBloque.length})
                              </button>
                              <button
                                type="button"
                                onClick={() => setBloqueModoCantidad('PARCIAL')}
                                className={`px-2 py-1 rounded transition-colors ${
                                  bloqueModoCantidad === 'PARCIAL'
                                    ? 'bg-indigo-600 text-white shadow-xs'
                                    : 'hover:text-slate-900'
                                }`}
                              >
                                Parcial
                              </button>
                            </div>

                            {bloqueModoCantidad === 'PARCIAL' && (
                              <div className="flex items-center bg-white border border-slate-300 rounded-lg overflow-hidden flex-shrink-0">
                                <button
                                  type="button"
                                  onClick={() => setBloqueCantidadParcial((prev) => Math.max(1, prev - 1))}
                                  disabled={bloqueCantidadParcial <= 1}
                                  className="px-1.5 py-1 text-slate-600 hover:bg-slate-100 disabled:opacity-40"
                                >
                                  <Minus className="w-3 h-3" />
                                </button>
                                <input
                                  type="number"
                                  min={1}
                                  max={Math.max(1, equiposDisponiblesEnBloque.length)}
                                  value={bloqueCantidadParcial}
                                  onChange={(e) => {
                                    const v = parseInt(e.target.value, 10);
                                    if (!isNaN(v)) {
                                      setBloqueCantidadParcial(
                                        Math.min(Math.max(1, v), Math.max(1, equiposDisponiblesEnBloque.length))
                                      );
                                    }
                                  }}
                                  className="w-9 text-center text-xs font-bold text-slate-800 focus:outline-none"
                                />
                                <button
                                  type="button"
                                  onClick={() =>
                                    setBloqueCantidadParcial((prev) =>
                                      Math.min(prev + 1, Math.max(1, equiposDisponiblesEnBloque.length))
                                    )
                                  }
                                  disabled={bloqueCantidadParcial >= equiposDisponiblesEnBloque.length}
                                  className="px-1.5 py-1 text-slate-600 hover:bg-slate-100 disabled:opacity-40"
                                >
                                  <Plus className="w-3 h-3" />
                                </button>
                              </div>
                            )}

                            <button
                              type="button"
                              onClick={handleCargarBloque}
                              disabled={equiposDisponiblesEnBloque.length === 0}
                              className="flex-1 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-semibold text-xs rounded-lg shadow-sm transition-colors flex items-center justify-center space-x-1"
                            >
                              <span>
                                {equiposDisponiblesEnBloque.length === 0
                                  ? 'Sin disponibles'
                                  : `Cargar ${
                                      bloqueModoCantidad === 'TODOS'
                                        ? equiposDisponiblesEnBloque.length
                                        : bloqueCantidadParcial
                                    } unid.`}
                              </span>
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Feedback del input rápido */}
                {mensajeRapido && (
                  <div
                    className={`p-2.5 rounded-xl text-xs flex items-center space-x-2 animate-fade-in ${
                      mensajeRapido.tipo === 'ok'
                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                        : 'bg-rose-50 text-rose-800 border border-rose-200'
                    }`}
                  >
                    {mensajeRapido.tipo === 'ok' ? (
                      <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-600" />
                    ) : (
                      <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-600" />
                    )}
                    <span>{mensajeRapido.texto}</span>
                  </div>
                )}
              </div>

              {/* Carrito de Equipos Agregados */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-slate-800 flex items-center space-x-2">
                    <span>Equipos Seleccionados para el Préstamo</span>
                    <span className="px-2.5 py-0.5 bg-indigo-100 text-indigo-800 rounded-full text-xs font-extrabold">
                      {carritoBienes.length} unid.
                    </span>
                  </h4>
                  {carritoBienes.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setCarritoBienes([])}
                      className="text-xs text-rose-600 hover:text-rose-800 font-medium"
                    >
                      Vaciar lista
                    </button>
                  )}
                </div>

                {carritoBienes.length === 0 ? (
                  <div className="p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200 text-slate-400 text-xs">
                    Ningún equipo agregado al préstamo. Escanea con cámara, digita el código o carga
                    un bloque para empezar.
                  </div>
                ) : (
                  <div className="space-y-2 max-h-72 overflow-y-auto">
                    {carritoBienes.map((bien, idx) => (
                      <div
                        key={bien.id}
                        className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs"
                      >
                        <div className="flex items-center space-x-3">
                          <span className="font-bold text-slate-400 w-5 text-center">{idx + 1}</span>
                          <span className="px-2.5 py-1 bg-white border border-slate-300 font-mono font-extrabold text-slate-900 rounded-md">
                            {bien.etiqueta_interna}
                          </span>
                          <div>
                            <p className="font-bold text-slate-800">{bien.denominacion}</p>
                            <p className="text-[11px] text-slate-500">
                              {bien.marca} {bien.modelo} &bull; Serie: {bien.serie || bien.numero_serie || 'S/N'}
                            </p>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => quitarDelCarrito(bien.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                          title="Quitar equipo"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Botón de Confirmación Final */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-end">
                  <button
                    type="submit"
                    disabled={carritoBienes.length === 0 || !docenteId || cargando}
                    className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-bold text-xs rounded-xl shadow-lg transition-all flex items-center space-x-2"
                  >
                    <Check className="w-4 h-4" />
                    <span>
                      {cargando
                        ? 'Registrando Préstamo...'
                        : `Confirmar y Generar Préstamo (${carritoBienes.length} Equipos)`}
                    </span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </form>
      )}

      {/* ========================================================================= */}
      {/* PESTAÑA 3: GENERADOR DE ETIQUETAS QR                                      */}
      {/* ========================================================================= */}
      {tabActiva === 'ETIQUETAS' && (
        <GeneradorEtiquetasQR
          bienes={bienes}
          ambientes={ambientes}
          categorias={categorias}
          onBienesActualizados={cargarDatos}
        />
      )}

      {/* ========================================================================= */}
      {/* PESTAÑA 4: CATÁLOGOS PEDAGÓGICOS                                          */}
      {/* ========================================================================= */}
      {tabActiva === 'CATALOGOS' && (
        <CatalogosPedagogicosTab
          docentes={docentes}
          areas={areas}
          bloques={bloques}
          bienes={bienes}
          ambientes={ambientes}
          prestamosActivos={prestamosActivos}
          onRecargar={cargarDatos}
          esAdmin={esAdmin}
        />
      )}

      {/* Modales Auxiliares */}
      <EscanerQRModal
        isOpen={modalScannerOpen}
        onClose={() => setModalScannerOpen(false)}
        bienesDisponibles={bienes}
        ambientes={ambientes}
        onEquipoDetectado={(bien) => {
          agregarAlCarrito(bien);
        }}
      />

      <ModalDevolucionPrestamo
        isOpen={modalDevolucionOpen}
        onClose={() => {
          setModalDevolucionOpen(false);
          setPrestamoParaDevolver(null);
        }}
        prestamo={prestamoParaDevolver}
        bienesDelPrestamo={
          prestamoParaDevolver
            ? bienes.filter((b) => prestamoParaDevolver.bienes_ids.includes(b.id))
            : []
        }
        onDevolucionExitosa={async () => {
          await cargarDatos();
        }}
      />

      <ConstanciaPrestamoModal
        isOpen={modalConstanciaOpen}
        onClose={() => {
          setModalConstanciaOpen(false);
          setPrestamoParaConstancia(null);
        }}
        prestamo={prestamoParaConstancia}
        bienes={
          prestamoParaConstancia
            ? bienes.filter((b) => prestamoParaConstancia.bienes_ids.includes(b.id))
            : []
        }
        configuracion={configuracion}
      />
    </div>
  );
};