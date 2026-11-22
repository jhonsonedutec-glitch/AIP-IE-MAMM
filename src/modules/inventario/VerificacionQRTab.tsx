import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  QrCode,
  Camera,
  History,
  CheckCircle2,
  AlertTriangle,
  Search,
  FileSpreadsheet,
  Printer,
  RotateCcw,
  Save,
  Trash2,
  Filter,
  AlertCircle,
  MapPin,
  Tag,
  ShieldCheck,
} from 'lucide-react';
import {
  BienPatrimonial,
  Ambiente,
  CategoriaEquipo,
  InstitucionConfig,
  EstadoConciliacion,
  ItemVerificacion,
  VerificacionInventario,
  normalizarCodigoPatrimonial,
  normalizarSerie,
} from '@/types';
import { useAuth } from '@/hooks';
import { verificacionRepository } from '@/repositories';
import { generarExcelConciliacionInventario } from '@/utils/excelProfesional';
import { EscanerQRModal } from '@/modules/prestamos/EscanerQRModal';
import { ActaVerificacionPrintModal } from './ActaVerificacionPrintModal';

interface VerificacionQRTabProps {
  bienes: BienPatrimonial[];
  ambientes: Ambiente[];
  categorias: CategoriaEquipo[];
  config: InstitucionConfig | null;
}

const LOCAL_STORAGE_BORRADOR_KEY = 'sigi_verificacion_qr_borrador';

export const VerificacionQRTab: React.FC<VerificacionQRTabProps> = ({
  bienes,
  ambientes,
  categorias,
  config,
}) => {
  const { user, perfil } = useAuth();
  const esAdmin = perfil?.rol === 'ADMIN';

  // Pestaña interna: Nueva Verificación (solo admin) o Historial
  const [subTab, setSubTab] = useState<'NUEVA' | 'HISTORIAL'>(esAdmin ? 'NUEVA' : 'HISTORIAL');

  // Etapa del flujo de nueva verificación
  const [etapa, setEtapa] = useState<'ALCANCE' | 'BARRIDO' | 'RESUMEN'>('ALCANCE');

  // Configuración de alcance
  const [alcanceAmbienteId, setAlcanceAmbienteId] = useState<string>('TODOS');
  const [filtroCategoriaId, setFiltroCategoriaId] = useState<string>('');
  const [filtroLote, setFiltroLote] = useState<string>('');

  // Ítems de la auditoría en curso
  const [itemsVerificacion, setItemsVerificacion] = useState<ItemVerificacion[]>([]);
  const [fechaInicio, setFechaInicio] = useState<string>('');
  const [observacionesGenerales, setObservacionesGenerales] = useState<string>('');

  // Escaneo y captura
  const [inputPistola, setInputPistola] = useState<string>('');
  const [modalCamaraOpen, setModalCamaraOpen] = useState(false);
  const inputPistolaRef = useRef<HTMLInputElement>(null);

  // Filtros y búsqueda de la tabla de verificación
  const [filtroEstadoTabla, setFiltroEstadoTabla] = useState<string>('TODOS');
  const [busquedaTabla, setBusquedaTabla] = useState<string>('');

  // Novedad física sobre ítem
  const [itemParaNovedad, setItemParaNovedad] = useState<ItemVerificacion | null>(null);
  const [textoNovedad, setTextoNovedad] = useState<string>('');
  const [modalNovedadOpen, setModalNovedadOpen] = useState(false);

  // Finalizar auditoría
  const [modalFinalizarOpen, setModalFinalizarOpen] = useState(false);
  const [guardandoVerificacion, setGuardandoVerificacion] = useState(false);
  const [verificacionCompletada, setVerificacionCompletada] = useState<VerificacionInventario | null>(null);

  // Modal de impresión de acta oficial
  const [actaParaImprimir, setActaParaImprimir] = useState<VerificacionInventario | null>(null);
  const [modalActaOpen, setModalActaOpen] = useState(false);

  // Historial de verificaciones
  const [historialVerificaciones, setHistorialVerificaciones] = useState<VerificacionInventario[]>([]);
  const [cargandoHistorial, setCargandoHistorial] = useState(false);
  const [busquedaHistorial, setBusquedaHistorial] = useState('');

  // Notificaciones instantáneas
  const [toast, setToast] = useState<{ tipo: 'ok' | 'err' | 'warn'; msg: string } | null>(null);

  // Audio Context para feedback sonoro
  const audioContextRef = useRef<AudioContext | null>(null);

  const reproducirSonido = (tipo: 'conforme' | 'duplicado' | 'alerta') => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioContextRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      const now = ctx.currentTime;

      if (tipo === 'conforme') {
        // Tono agudo y limpio (880 Hz, A5)
        osc.frequency.setValueAtTime(880, now);
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
        osc.start(now);
        osc.stop(now + 0.12);
      } else if (tipo === 'duplicado') {
        // Doble beep medio (600 Hz)
        osc.frequency.setValueAtTime(600, now);
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
        osc.start(now);
        osc.stop(now + 0.08);

        setTimeout(() => {
          try {
            if (!ctx) return;
            const osc2 = ctx.createOscillator();
            const gain2 = ctx.createGain();
            osc2.connect(gain2);
            gain2.connect(ctx.destination);
            const now2 = ctx.currentTime;
            osc2.frequency.setValueAtTime(600, now2);
            gain2.gain.setValueAtTime(0.12, now2);
            gain2.gain.exponentialRampToValueAtTime(0.001, now2 + 0.08);
            osc2.start(now2);
            osc2.stop(now2 + 0.08);
          } catch {}
        }, 120);
      } else {
        // Tono grave de alerta (220 Hz, A3)
        osc.frequency.setValueAtTime(220, now);
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
        osc.start(now);
        osc.stop(now + 0.28);
      }
    } catch {
      // Ignorar fallos de audio si el navegador bloquea autoplay
    }
  };

  const mostrarToast = (tipo: 'ok' | 'err' | 'warn', msg: string) => {
    setToast({ tipo, msg });
    setTimeout(() => {
      setToast(null);
    }, 3500);
  };

  // Cargar borrador de localStorage al inicio
  useEffect(() => {
    try {
      const borradorGuardado = localStorage.getItem(LOCAL_STORAGE_BORRADOR_KEY);
      if (borradorGuardado) {
        const parsed = JSON.parse(borradorGuardado);
        if (parsed && Array.isArray(parsed.items) && parsed.items.length > 0) {
          setAlcanceAmbienteId(parsed.alcanceAmbienteId || 'TODOS');
          setFiltroCategoriaId(parsed.filtroCategoriaId || '');
          setFiltroLote(parsed.filtroLote || '');
          setItemsVerificacion(parsed.items);
          setFechaInicio(parsed.fechaInicio || new Date().toISOString());
          setObservacionesGenerales(parsed.observacionesGenerales || '');
          setEtapa('BARRIDO');
          mostrarToast(
            'ok',
            `Borrador de verificación recuperado (${parsed.items.length} ítems en curso).`
          );
        }
      }
    } catch (e) {
      console.warn('No se pudo restaurar borrador de verificación:', e);
    }
  }, []);

  // Auto-guardado en localStorage durante la etapa de barrido
  useEffect(() => {
    if (etapa === 'BARRIDO' && itemsVerificacion.length > 0) {
      try {
        localStorage.setItem(
          LOCAL_STORAGE_BORRADOR_KEY,
          JSON.stringify({
            alcanceAmbienteId,
            filtroCategoriaId,
            filtroLote,
            items: itemsVerificacion,
            fechaInicio,
            observacionesGenerales,
          })
        );
      } catch (e) {
        console.warn('Error al auto-guardar borrador:', e);
      }
    }
  }, [etapa, itemsVerificacion, alcanceAmbienteId, filtroCategoriaId, filtroLote, fechaInicio, observacionesGenerales]);

  // Cargar historial de actas
  const cargarHistorial = async () => {
    setCargandoHistorial(true);
    try {
      const docs = await verificacionRepository.listar();
      setHistorialVerificaciones(docs);
    } catch (err: any) {
      console.error('Error al cargar historial de verificaciones:', err);
      mostrarToast('err', 'No se pudo cargar el historial de verificaciones.');
    } finally {
      setCargandoHistorial(false);
    }
  };

  useEffect(() => {
    if (subTab === 'HISTORIAL') {
      cargarHistorial();
    }
  }, [subTab]);

  // Universo esperado según los filtros de alcance
  const universoEsperado = useMemo(() => {
    return bienes.filter((b) => {
      if (b.estado_operativo === 'DE_BAJA') return false;
      if (alcanceAmbienteId !== 'TODOS' && b.ambiente_id !== alcanceAmbienteId) return false;
      if (filtroCategoriaId && b.categoria_id !== filtroCategoriaId) return false;
      if (filtroLote && (b.lote_etiqueta || '').trim().toUpperCase() !== filtroLote.toUpperCase()) {
        return false;
      }
      return true;
    });
  }, [bienes, alcanceAmbienteId, filtroCategoriaId, filtroLote]);

  // Lista única de lotes para el selector
  const listaLotesDisponibles = useMemo(() => {
    const lotesSet = new Set<string>();
    bienes.forEach((b) => {
      if (b.lote_etiqueta && b.lote_etiqueta.trim()) {
        lotesSet.add(b.lote_etiqueta.trim().toUpperCase());
      }
    });
    return Array.from(lotesSet).sort();
  }, [bienes]);

  // Nombre del ambiente seleccionado
  const nombreAmbienteSeleccionado = useMemo(() => {
    if (alcanceAmbienteId === 'TODOS') return 'Todos los Ambientes (General)';
    return ambientes.find((a) => a.id === alcanceAmbienteId)?.nombre || 'Ambiente no especificado';
  }, [alcanceAmbienteId, ambientes]);

  const getNombreAmbientePorId = (id?: string) => {
    if (!id) return 'No asignado';
    return ambientes.find((a) => a.id === id)?.nombre || 'Otro';
  };

  // Iniciar barrido físico
  const handleIniciarBarrido = () => {
    if (universoEsperado.length === 0) {
      if (!window.confirm('El universo esperado con los filtros actuales es 0. ¿Deseas iniciar de todas formas?')) {
        return;
      }
    }

    // Inicializar los ítems esperados
    const itemsIniciales: ItemVerificacion[] = universoEsperado.map((b) => {
      const estaJustificado =
        b.estado_operativo === 'PRESTADO' || b.estado_operativo === 'EN_MANTENIMIENTO';
      const estadoConciliacion: EstadoConciliacion = estaJustificado
        ? 'AUSENTE_JUSTIFICADO'
        : 'FALTANTE';

      return {
        bien_id: b.id,
        codigo_escaneado: b.etiqueta_interna || b.codigo_patrimonial || b.serie || b.id,
        etiqueta_interna: b.etiqueta_interna || '',
        codigo_patrimonial: b.codigo_patrimonial || '',
        denominacion: b.denominacion || 'Equipo',
        marca_modelo: `${b.marca || ''} ${b.modelo || ''}`.trim(),
        numero_serie: b.serie || b.numero_serie || '',
        lote_etiqueta: b.lote_etiqueta,
        lote_color: b.lote_color,
        ambiente_bd: getNombreAmbientePorId(b.ambiente_id),
        estado_operativo_bd: b.estado_operativo,
        estado_conciliacion: estadoConciliacion,
        detalle_justificacion: estaJustificado
          ? b.estado_operativo === 'PRESTADO'
            ? 'En calidad de préstamo institucional'
            : 'En soporte / mantenimiento técnico'
          : undefined,
      };
    });

    setItemsVerificacion(itemsIniciales);
    setFechaInicio(new Date().toISOString());
    setEtapa('BARRIDO');
    mostrarToast('ok', `Auditoría iniciada con ${itemsIniciales.length} bienes en universo esperado.`);

    setTimeout(() => {
      inputPistolaRef.current?.focus();
    }, 150);
  };

  // Descartar borrador y reiniciar
  const handleDescartarBorrador = () => {
    if (
      !window.confirm(
        '¿Estás seguro de descartar la verificación actual? Se borrarán todos los escaneos no guardados.'
      )
    ) {
      return;
    }
    localStorage.removeItem(LOCAL_STORAGE_BORRADOR_KEY);
    setItemsVerificacion([]);
    setEtapa('ALCANCE');
    mostrarToast('warn', 'Verificación descartada.');
  };

  // Procesar código escaneado (ya sea por pistola USB o por cámara QR)
  const procesarCodigoEscaneado = (codigoBruto: string) => {
    const raw = (codigoBruto || '').trim();
    if (!raw) return;

    // Normalizar código patrimonial y serie para búsqueda flexible
    const codPatNorm = normalizarCodigoPatrimonial(raw);
    const serieNorm = normalizarSerie(raw);
    const upperRaw = raw.toUpperCase();

    // 1. Verificar si ya fue escaneado en esta sesión (para evitar duplicados)
    const yaEscaneado = itemsVerificacion.find((it) => {
      if (it.estado_conciliacion !== 'VERIFICADO_CONFORME' && it.estado_conciliacion !== 'FUERA_DE_UBICACION') {
        return false;
      }
      const matchEtq = it.etiqueta_interna && it.etiqueta_interna.toUpperCase() === upperRaw;
      const matchCod = codPatNorm && normalizarCodigoPatrimonial(it.codigo_patrimonial) === codPatNorm;
      const matchSer = serieNorm && normalizarSerie(it.numero_serie) === serieNorm;
      return matchEtq || matchCod || matchSer;
    });

    if (yaEscaneado) {
      reproducirSonido('duplicado');
      mostrarToast(
        'warn',
        `El equipo [${yaEscaneado.etiqueta_interna || yaEscaneado.codigo_patrimonial}] ya fue verificado anteriormente.`
      );
      return;
    }

    // 2. Buscar si coincide con algún ítem ya existente en el universo de la verificación
    const indiceEnUniverso = itemsVerificacion.findIndex((it) => {
      const matchEtq = it.etiqueta_interna && it.etiqueta_interna.toUpperCase() === upperRaw;
      const matchCod = codPatNorm && normalizarCodigoPatrimonial(it.codigo_patrimonial) === codPatNorm;
      const matchSer = serieNorm && normalizarSerie(it.numero_serie) === serieNorm;
      return matchEtq || matchCod || matchSer;
    });

    if (indiceEnUniverso !== -1) {
      // Coincide con el universo esperado -> MARCAR COMO VERIFICADO_CONFORME
      const copia = [...itemsVerificacion];
      const target = { ...copia[indiceEnUniverso] };

      target.estado_conciliacion = 'VERIFICADO_CONFORME';
      target.hora_escaneo = new Date().toLocaleTimeString('es-PE');
      copia[indiceEnUniverso] = target;

      setItemsVerificacion(copia);
      reproducirSonido('conforme');
      mostrarToast(
        'ok',
        `✓ [${target.etiqueta_interna || target.codigo_patrimonial}] ${target.denominacion} — VERIFICADO CONFORME`
      );
      return;
    }

    // 3. No estaba en el universo esperado. Buscar en TODA la base de datos de bienes
    const bienEncontradoBD = bienes.find((b) => {
      const matchEtq = b.etiqueta_interna && b.etiqueta_interna.toUpperCase() === upperRaw;
      const matchCod = codPatNorm && normalizarCodigoPatrimonial(b.codigo_patrimonial) === codPatNorm;
      const matchSer = serieNorm && normalizarSerie(b.serie || b.numero_serie) === serieNorm;
      return matchEtq || matchCod || matchSer;
    });

    if (bienEncontradoBD) {
      // Pertenece a otro ambiente o está de baja -> MARCAR FUERA_DE_UBICACION
      const ambBD = getNombreAmbientePorId(bienEncontradoBD.ambiente_id);
      const esBaja = bienEncontradoBD.estado_operativo === 'DE_BAJA';

      const nuevoItem: ItemVerificacion = {
        bien_id: bienEncontradoBD.id,
        codigo_escaneado: raw,
        etiqueta_interna: bienEncontradoBD.etiqueta_interna || '',
        codigo_patrimonial: bienEncontradoBD.codigo_patrimonial || '',
        denominacion: bienEncontradoBD.denominacion || 'Equipo',
        marca_modelo: `${bienEncontradoBD.marca || ''} ${bienEncontradoBD.modelo || ''}`.trim(),
        numero_serie: bienEncontradoBD.serie || bienEncontradoBD.numero_serie || '',
        lote_etiqueta: bienEncontradoBD.lote_etiqueta,
        lote_color: bienEncontradoBD.lote_color,
        ambiente_bd: ambBD,
        estado_operativo_bd: bienEncontradoBD.estado_operativo,
        estado_conciliacion: 'FUERA_DE_UBICACION',
        hora_escaneo: new Date().toLocaleTimeString('es-PE'),
        novedad_fisica: esBaja
          ? 'Equipo registrado como DADO DE BAJA en sistema.'
          : `Pertenece según BD a "${ambBD}". Encontrado en este barrido.`,
      };

      setItemsVerificacion([nuevoItem, ...itemsVerificacion]);
      reproducirSonido('alerta');
      mostrarToast(
        'warn',
        `⚠ [${nuevoItem.etiqueta_interna || nuevoItem.codigo_patrimonial}] FUERA DE UBICACIÓN (Registrado en ${ambBD})`
      );
      return;
    }

    // 4. El código no existe en toda la base de datos -> MARCAR DESCONOCIDO
    const itemDesconocido: ItemVerificacion = {
      codigo_escaneado: raw,
      etiqueta_interna: 'S/E',
      codigo_patrimonial: codPatNorm || raw,
      denominacion: 'Equipo No Catalogado',
      marca_modelo: 'Desconocido',
      numero_serie: raw,
      ambiente_bd: 'Sin registro',
      estado_operativo_bd: 'DESCONOCIDO',
      estado_conciliacion: 'DESCONOCIDO',
      hora_escaneo: new Date().toLocaleTimeString('es-PE'),
      novedad_fisica: 'Código no encontrado en el inventario institucional.',
    };

    setItemsVerificacion([itemDesconocido, ...itemsVerificacion]);
    reproducirSonido('alerta');
    mostrarToast('err', `✕ Código "${raw}" NO CATALOGADO en la base de datos.`);
  };

  // Manejador del input de pistola
  const handleKeyDownPistola = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      procesarCodigoEscaneado(inputPistola);
      setInputPistola('');
    }
  };

  // Métricas en tiempo real de la auditoría en curso
  const metricas = useMemo(() => {
    const totalEsperados = universoEsperado.length;
    const conformes = itemsVerificacion.filter((it) => it.estado_conciliacion === 'VERIFICADO_CONFORME').length;
    const justificados = itemsVerificacion.filter((it) => it.estado_conciliacion === 'AUSENTE_JUSTIFICADO').length;
    const faltantes = itemsVerificacion.filter((it) => it.estado_conciliacion === 'FALTANTE').length;
    const fueraUbicacion = itemsVerificacion.filter((it) => it.estado_conciliacion === 'FUERA_DE_UBICACION').length;
    const desconocidos = itemsVerificacion.filter((it) => it.estado_conciliacion === 'DESCONOCIDO').length;

    const totalEfectivos = conformes;
    const porcentajeConformidad =
      totalEsperados > 0 ? (totalEfectivos / totalEsperados) * 100 : 100;

    return {
      totalEsperados,
      conformes,
      justificados,
      faltantes,
      fueraUbicacion,
      desconocidos,
      porcentajeConformidad: Math.min(100, Math.max(0, porcentajeConformidad)),
    };
  }, [universoEsperado.length, itemsVerificacion]);

  // Filtrado de la tabla de verificación
  const itemsFiltrados = useMemo(() => {
    return itemsVerificacion.filter((it) => {
      if (filtroEstadoTabla !== 'TODOS' && it.estado_conciliacion !== filtroEstadoTabla) {
        return false;
      }
      if (busquedaTabla.trim()) {
        const q = busquedaTabla.trim().toUpperCase();
        const match =
          (it.etiqueta_interna || '').toUpperCase().includes(q) ||
          (it.codigo_patrimonial || '').toUpperCase().includes(q) ||
          (it.numero_serie || '').toUpperCase().includes(q) ||
          (it.denominacion || '').toUpperCase().includes(q) ||
          (it.marca_modelo || '').toUpperCase().includes(q) ||
          (it.novedad_fisica || '').toUpperCase().includes(q);
        if (!match) return false;
      }
      return true;
    });
  }, [itemsVerificacion, filtroEstadoTabla, busquedaTabla]);

  // Guardar novedad física sobre un ítem
  const handleGuardarNovedad = () => {
    if (!itemParaNovedad) return;
    const copia = itemsVerificacion.map((it) => {
      if (it.codigo_escaneado === itemParaNovedad.codigo_escaneado) {
        return {
          ...it,
          novedad_fisica: textoNovedad.trim() || undefined,
        };
      }
      return it;
    });
    setItemsVerificacion(copia);
    setModalNovedadOpen(false);
    setItemParaNovedad(null);
    setTextoNovedad('');
    mostrarToast('ok', 'Novedad física registrada.');
  };

  // Finalizar y guardar verificación
  const handleConfirmarFinalizar = async () => {
    if (!user) return;
    setGuardandoVerificacion(true);

    try {
      const catObj = categorias.find((c) => c.id === filtroCategoriaId);
      const dataVerificacion: Omit<VerificacionInventario, 'id' | 'codigo_acta'> = {
        fecha_inicio: fechaInicio || new Date().toISOString(),
        fecha_cierre: new Date().toISOString(),
        alcance_ambiente_id: alcanceAmbienteId,
        alcance_ambiente_nombre: nombreAmbienteSeleccionado,
        filtro_categoria: catObj ? catObj.nombre : undefined,
        filtro_categoria_id: filtroCategoriaId || undefined,
        filtro_categoria_nombre: catObj ? catObj.nombre : undefined,
        filtro_lote: filtroLote || undefined,
        operador_uid: user.uid,
        operador_nombre: user.displayName || config?.responsable_nombre || 'Docente AIP',
        operador_email: user.email || '',
        auditor_id: user.uid,
        auditor_email: user.email || '',
        auditor_nombre: user.displayName || config?.responsable_nombre || 'Docente AIP',
        total_esperados: metricas.totalEsperados,
        total_conformes: metricas.conformes,
        total_verificados_conforme: metricas.conformes,
        total_ausentes_justificados: metricas.justificados,
        total_faltantes: metricas.faltantes,
        total_fuera_ubicacion: metricas.fueraUbicacion,
        total_desconocidos: metricas.desconocidos,
        porcentaje_conformidad: metricas.porcentajeConformidad,
        observaciones_generales: observacionesGenerales.trim() || undefined,
        items: itemsVerificacion,
      };

      const resultado = await verificacionRepository.registrarVerificacion(dataVerificacion, {
        uid: user.uid,
        email: user.email || '',
      });

      const verificacionCreada: VerificacionInventario = {
        ...dataVerificacion,
        id: resultado.id,
        codigo_acta: resultado.codigo_acta,
      };

      // Limpiar borrador local
      localStorage.removeItem(LOCAL_STORAGE_BORRADOR_KEY);

      setVerificacionCompletada(verificacionCreada);
      setModalFinalizarOpen(false);
      setEtapa('RESUMEN');
      mostrarToast('ok', `Acta ${resultado.codigo_acta} registrada exitosamente.`);
      mostrarToast('ok', `Acta ${resultado.codigo_acta} registrada exitosamente.`);
    } catch (err: any) {
      console.error('Error al guardar verificación:', err);
      mostrarToast('err', `Error al registrar verificación: ${err.message || 'Intente nuevamente'}`);
    } finally {
      setGuardandoVerificacion(false);
    }
  };

  const getBadgeClase = (estado: EstadoConciliacion) => {
    switch (estado) {
      case 'VERIFICADO_CONFORME':
        return 'bg-emerald-100 text-emerald-800 border-emerald-300';
      case 'AUSENTE_JUSTIFICADO':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'FALTANTE':
        return 'bg-rose-100 text-rose-800 border-rose-300 font-bold';
      case 'FUERA_DE_UBICACION':
        return 'bg-amber-100 text-amber-800 border-amber-300 font-bold';
      case 'DESCONOCIDO':
        return 'bg-purple-100 text-purple-800 border-purple-300 font-bold';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-300';
    }
  };

  const getTextoEstado = (estado: EstadoConciliacion) => {
    switch (estado) {
      case 'VERIFICADO_CONFORME':
        return 'CONFORME';
      case 'AUSENTE_JUSTIFICADO':
        return 'JUSTIFICADO';
      case 'FALTANTE':
        return 'FALTANTE';
      case 'FUERA_DE_UBICACION':
        return 'DESUBICADO';
      case 'DESCONOCIDO':
        return 'NO REGISTRADO';
      default:
        return estado;
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast flotante */}
      {toast && (
        <div
          className={`fixed bottom-5 right-5 z-50 px-4 py-3 rounded-xl shadow-lg border text-xs font-semibold flex items-center space-x-2.5 transition-all ${
            toast.tipo === 'ok'
              ? 'bg-emerald-900 text-white border-emerald-700'
              : toast.tipo === 'err'
              ? 'bg-rose-900 text-white border-rose-700'
              : 'bg-amber-900 text-white border-amber-700'
          }`}
        >
          {toast.tipo === 'ok' && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
          {toast.tipo === 'err' && <AlertTriangle className="w-4 h-4 text-rose-400" />}
          {toast.tipo === 'warn' && <AlertCircle className="w-4 h-4 text-amber-400" />}
          <span>{toast.msg}</span>
        </div>
      )}

      {/* Sub-pestañas: Nueva Verificación (solo ADMIN) vs Historial */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-3">
        <div className="flex items-center space-x-2">
          {esAdmin && (
            <button
              type="button"
              onClick={() => setSubTab('NUEVA')}
              className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer ${
                subTab === 'NUEVA'
                  ? 'bg-emerald-700 text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <QrCode className="w-4 h-4" />
              <span>Nueva Verificación Física</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setSubTab('HISTORIAL')}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer ${
              subTab === 'HISTORIAL'
                ? 'bg-emerald-700 text-white shadow-xs'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <History className="w-4 h-4" />
            <span>Historial de Actas ({historialVerificaciones.length})</span>
          </button>
        </div>

        {subTab === 'NUEVA' && etapa === 'BARRIDO' && (
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={handleDescartarBorrador}
              className="px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-50 rounded-lg border border-rose-200 transition-colors flex items-center space-x-1 cursor-pointer"
              title="Descartar borrador y empezar de nuevo"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Descartar Borrador</span>
            </button>
            <button
              type="button"
              onClick={() => setModalFinalizarOpen(true)}
              className="px-4 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs transition-colors flex items-center space-x-1.5 cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Finalizar y Guardar Acta</span>
            </button>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* VISTA 1: NUEVA VERIFICACIÓN                                               */}
      {/* ========================================================================= */}
      {subTab === 'NUEVA' && (
        <div>
          {/* ETAPA A: CONFIGURACIÓN DE ALCANCE */}
          {etapa === 'ALCANCE' && (
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6">
              <div className="flex items-start space-x-4">
                <div className="p-3 bg-emerald-100 text-emerald-800 rounded-xl shrink-0">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-800">
                    Definición del Alcance y Universo de Verificación
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Selecciona el ambiente o lote que inspeccionarás físicamente. El sistema calculará el universo esperado de bienes a conciliar.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                {/* Selector de Ambiente */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5 flex items-center space-x-1">
                    <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Ambiente / Ubicación</span>
                  </label>
                  <select
                    value={alcanceAmbienteId}
                    onChange={(e) => setAlcanceAmbienteId(e.target.value)}
                    className="w-full text-xs font-medium bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-800 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  >
                    <option value="TODOS">TODOS LOS AMBIENTES (Barrido General Institucional)</option>
                    {ambientes.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.nombre}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Filtro de Categoría */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5 flex items-center space-x-1">
                    <Filter className="w-3.5 h-3.5 text-blue-600" />
                    <span>Categoría de Equipo</span>
                  </label>
                  <select
                    value={filtroCategoriaId}
                    onChange={(e) => setFiltroCategoriaId(e.target.value)}
                    className="w-full text-xs font-medium bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-800 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  >
                    <option value="">Todas las Categorías</option>
                    {categorias.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nombre}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Filtro de Lote */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5 flex items-center space-x-1">
                    <Tag className="w-3.5 h-3.5 text-orange-600" />
                    <span>Lote Pedagógico / Color</span>
                  </label>
                  <select
                    value={filtroLote}
                    onChange={(e) => setFiltroLote(e.target.value)}
                    className="w-full text-xs font-medium bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-800 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  >
                    <option value="">Todos los Lotes</option>
                    {listaLotesDisponibles.map((lote) => (
                      <option key={lote} value={lote}>
                        {lote}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Tarjeta de Universo Esperado */}
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                    Universo Físico Esperado en Base de Datos:
                  </span>
                  <div className="flex items-baseline space-x-2 mt-1">
                    <span className="text-3xl font-black text-slate-900 font-mono">
                      {universoEsperado.length}
                    </span>
                    <span className="text-xs text-slate-600 font-semibold">bienes activos esperados</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Alcance: <span className="font-semibold text-slate-700">{nombreAmbienteSeleccionado}</span>
                    {filtroCategoriaId && ` &bull; Categoría: ${categorias.find((c) => c.id === filtroCategoriaId)?.nombre}`}
                    {filtroLote && ` &bull; Lote: ${filtroLote}`}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleIniciarBarrido}
                  className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-xl shadow-md transition-all flex items-center justify-center space-x-2 cursor-pointer shrink-0"
                >
                  <QrCode className="w-5 h-5" />
                  <span>Iniciar Verificación Física</span>
                </button>
              </div>
            </div>
          )}

          {/* ETAPA B: BARRIDO Y ESCANEO EN TIEMPO REAL */}
          {etapa === 'BARRIDO' && (
            <div className="space-y-5">
              {/* Barra de Entrada de Escaneo */}
              <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-xs">
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                  {/* Input para lector USB / Pistola de código de barras */}
                  <div className="relative flex-1">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <QrCode className="w-5 h-5 text-emerald-600" />
                    </div>
                    <input
                      ref={inputPistolaRef}
                      type="text"
                      value={inputPistola}
                      onChange={(e) => setInputPistola(e.target.value)}
                      onKeyDown={handleKeyDownPistola}
                      placeholder="Escanea con pistola USB o escribe código y presiona Enter..."
                      className="w-full pl-11 pr-4 py-2.5 text-xs sm:text-sm font-mono font-semibold bg-slate-50 border-2 border-slate-300 rounded-xl focus:bg-white focus:border-emerald-600 focus:ring-2 focus:ring-emerald-200 focus:outline-none transition-colors"
                      autoFocus
                    />
                  </div>

                  {/* Botón Escáner Cámara */}
                  <button
                    type="button"
                    onClick={() => setModalCamaraOpen(true)}
                    className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs sm:text-sm rounded-xl shadow-xs transition-colors flex items-center justify-center space-x-2 shrink-0 cursor-pointer"
                  >
                    <Camera className="w-4 h-4 text-emerald-400" />
                    <span>Abrir Cámara QR</span>
                  </button>
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-500 mt-2 px-1">
                  <span>
                    Auditoría en: <strong className="text-slate-700">{nombreAmbienteSeleccionado}</strong>
                  </span>
                  <span className="flex items-center space-x-1.5 text-emerald-700 font-medium">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    <span>Listo para escanear</span>
                  </span>
                </div>
              </div>

              {/* Barra de Progreso y KPI Cards Filtrables */}
              <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-xs space-y-4">
                <div>
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="font-bold text-slate-700 uppercase tracking-wide">
                      Progreso de Conciliación Física
                    </span>
                    <span className="font-mono font-bold text-slate-900 text-sm">
                      {metricas.porcentajeConformidad.toFixed(1)}% Conforme
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden flex">
                    <div
                      className="bg-emerald-500 h-full transition-all duration-300"
                      style={{
                        width: `${
                          metricas.totalEsperados > 0
                            ? (metricas.conformes / metricas.totalEsperados) * 100
                            : 0
                        }%`,
                      }}
                      title={`Conformes: ${metricas.conformes}`}
                    />
                    <div
                      className="bg-blue-400 h-full transition-all duration-300"
                      style={{
                        width: `${
                          metricas.totalEsperados > 0
                            ? (metricas.justificados / metricas.totalEsperados) * 100
                            : 0
                        }%`,
                      }}
                      title={`Justificados: ${metricas.justificados}`}
                    />
                    <div
                      className="bg-rose-400 h-full transition-all duration-300"
                      style={{
                        width: `${
                          metricas.totalEsperados > 0
                            ? (metricas.faltantes / metricas.totalEsperados) * 100
                            : 0
                        }%`,
                      }}
                      title={`Faltantes: ${metricas.faltantes}`}
                    />
                  </div>
                </div>

                {/* 5 Botones de Filtro KPI */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
                  <button
                    type="button"
                    onClick={() => setFiltroEstadoTabla('TODOS')}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      filtroEstadoTabla === 'TODOS'
                        ? 'bg-slate-800 text-white border-slate-900 shadow-sm'
                        : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-800'
                    }`}
                  >
                    <span className="text-[10px] font-bold uppercase tracking-wider block opacity-80">
                      Todos
                    </span>
                    <span className="text-xl font-black font-mono block mt-0.5">
                      {itemsVerificacion.length}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFiltroEstadoTabla('VERIFICADO_CONFORME')}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      filtroEstadoTabla === 'VERIFICADO_CONFORME'
                        ? 'bg-emerald-700 text-white border-emerald-800 shadow-sm'
                        : 'bg-white hover:bg-emerald-50 border-slate-200 text-emerald-800'
                    }`}
                  >
                    <span className="text-[10px] font-bold uppercase tracking-wider block opacity-80">
                      Conformes
                    </span>
                    <span className="text-xl font-black font-mono block mt-0.5">
                      {metricas.conformes}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFiltroEstadoTabla('AUSENTE_JUSTIFICADO')}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      filtroEstadoTabla === 'AUSENTE_JUSTIFICADO'
                        ? 'bg-blue-700 text-white border-blue-800 shadow-sm'
                        : 'bg-white hover:bg-blue-50 border-slate-200 text-blue-800'
                    }`}
                  >
                    <span className="text-[10px] font-bold uppercase tracking-wider block opacity-80">
                      Justificados
                    </span>
                    <span className="text-xl font-black font-mono block mt-0.5">
                      {metricas.justificados}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFiltroEstadoTabla('FALTANTE')}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      filtroEstadoTabla === 'FALTANTE'
                        ? 'bg-rose-700 text-white border-rose-800 shadow-sm'
                        : 'bg-white hover:bg-rose-50 border-slate-200 text-rose-800'
                    }`}
                  >
                    <span className="text-[10px] font-bold uppercase tracking-wider block opacity-80">
                      Faltantes
                    </span>
                    <span className="text-xl font-black font-mono block mt-0.5">
                      {metricas.faltantes}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFiltroEstadoTabla('FUERA_DE_UBICACION')}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      filtroEstadoTabla === 'FUERA_DE_UBICACION'
                        ? 'bg-amber-600 text-white border-amber-700 shadow-sm'
                        : 'bg-white hover:bg-amber-50 border-slate-200 text-amber-800'
                    }`}
                  >
                    <span className="text-[10px] font-bold uppercase tracking-wider block opacity-80">
                      Desubicados
                    </span>
                    <span className="text-xl font-black font-mono block mt-0.5">
                      {metricas.fueraUbicacion}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFiltroEstadoTabla('DESCONOCIDO')}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      filtroEstadoTabla === 'DESCONOCIDO'
                        ? 'bg-purple-700 text-white border-purple-800 shadow-sm'
                        : 'bg-white hover:bg-purple-50 border-slate-200 text-purple-800'
                    }`}
                  >
                    <span className="text-[10px] font-bold uppercase tracking-wider block opacity-80">
                      No Catalogados
                    </span>
                    <span className="text-xl font-black font-mono block mt-0.5">
                      {metricas.desconocidos}
                    </span>
                  </button>
                </div>
              </div>

              {/* Tabla de Resultados de la Verificación en Vivo */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
                <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div className="relative w-full sm:w-72">
                    <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                    <input
                      type="text"
                      value={busquedaTabla}
                      onChange={(e) => setBusquedaTabla(e.target.value)}
                      placeholder="Buscar por código, serie o descripción..."
                      className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>

                  <span className="text-xs text-slate-500 font-medium">
                    Mostrando <strong className="text-slate-800">{itemsFiltrados.length}</strong> de{' '}
                    {itemsVerificacion.length} bienes
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-100 text-slate-700 font-bold uppercase text-[10px] border-b border-slate-200">
                        <th className="py-2.5 px-3 text-center w-10">N°</th>
                        <th className="py-2.5 px-3">Etiqueta QR / Lote</th>
                        <th className="py-2.5 px-3">Cód. Patrimonial</th>
                        <th className="py-2.5 px-3">Denominación / Marca / Modelo</th>
                        <th className="py-2.5 px-3">Serie</th>
                        <th className="py-2.5 px-3">Ambiente BD</th>
                        <th className="py-2.5 px-3 text-center">Estado Físico</th>
                        <th className="py-2.5 px-3">Novedad Física</th>
                        <th className="py-2.5 px-3 text-center w-16">Acción</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {itemsFiltrados.map((it, idx) => (
                        <tr
                          key={`${it.codigo_escaneado}-${idx}`}
                          className={`hover:bg-slate-50/80 transition-colors ${
                            it.estado_conciliacion === 'VERIFICADO_CONFORME'
                              ? 'bg-emerald-50/30'
                              : it.estado_conciliacion === 'FALTANTE'
                              ? 'bg-rose-50/20'
                              : it.estado_conciliacion === 'FUERA_DE_UBICACION'
                              ? 'bg-amber-50/30'
                              : it.estado_conciliacion === 'DESCONOCIDO'
                              ? 'bg-purple-50/30'
                              : ''
                          }`}
                        >
                          <td className="py-2.5 px-3 text-center font-mono text-slate-400">
                            {String(idx + 1).padStart(2, '0')}
                          </td>
                          <td className="py-2.5 px-3 font-mono font-bold text-slate-800">
                            <div className="flex items-center space-x-1.5 flex-wrap">
                              <span>{it.etiqueta_interna || '—'}</span>
                              {it.lote_etiqueta && (
                                <span
                                  className="px-1.5 py-0.5 rounded text-[9px] font-bold text-white shadow-2xs"
                                  style={{ backgroundColor: it.lote_color || '#16A34A' }}
                                >
                                  {it.lote_etiqueta}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-2.5 px-3 font-mono text-slate-700">
                            {it.codigo_patrimonial || '—'}
                          </td>
                          <td className="py-2.5 px-3">
                            <span className="font-semibold text-slate-800 block">
                              {it.denominacion}
                            </span>
                            {it.marca_modelo && (
                              <span className="text-[11px] text-slate-500 block">
                                {it.marca_modelo}
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 font-mono text-slate-600">
                            {it.numero_serie || '—'}
                          </td>
                          <td className="py-2.5 px-3 text-slate-600">
                            {it.ambiente_bd}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <span
                              className={`inline-block px-2 py-0.5 rounded text-[9.5px] border ${getBadgeClase(
                                it.estado_conciliacion
                              )}`}
                            >
                              {getTextoEstado(it.estado_conciliacion)}
                            </span>
                            {it.hora_escaneo && (
                              <span className="block text-[9px] text-slate-400 font-mono mt-0.5">
                                {it.hora_escaneo}
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-slate-700 text-[11px]">
                            {it.novedad_fisica || it.detalle_justificacion || (
                              <span className="text-slate-300 italic">Sin novedades</span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <button
                              type="button"
                              onClick={() => {
                                setItemParaNovedad(it);
                                setTextoNovedad(it.novedad_fisica || '');
                                setModalNovedadOpen(true);
                              }}
                              className="px-2 py-1 text-[10px] font-bold text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 rounded border border-slate-200 transition-colors"
                              title="Registrar o editar observación física"
                            >
                              Nota
                            </button>
                          </td>
                        </tr>
                      ))}

                      {itemsFiltrados.length === 0 && (
                        <tr>
                          <td colSpan={9} className="py-8 text-center text-slate-400">
                            No se encontraron bienes con el filtro seleccionado.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ETAPA C: RESUMEN Y DESCARGAS DEL ACTA GENERADA */}
          {etapa === 'RESUMEN' && verificacionCompletada && (
            <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-xs max-w-2xl mx-auto text-center space-y-6">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-10 h-10" />
              </div>

              <div>
                <span className="px-3 py-1 bg-emerald-100 text-emerald-800 text-xs font-bold rounded-full uppercase tracking-wider">
                  Verificación Física Registrada Exitosamente
                </span>
                <h2 className="text-2xl font-black text-slate-900 mt-2 font-mono">
                  {verificacionCompletada.codigo_acta}
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  El acta oficial ha sido guardada en la base de datos inmutable para auditorías internas y presentación ante UGEL.
                </p>
              </div>

              {/* Estadísticas finales */}
              <div className="grid grid-cols-4 gap-2 bg-slate-50 p-4 rounded-xl border border-slate-200 text-center">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 block uppercase">Esperados</span>
                  <span className="text-lg font-black text-slate-800 font-mono">
                    {verificacionCompletada.total_esperados}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-emerald-600 block uppercase">Conformes</span>
                  <span className="text-lg font-black text-emerald-700 font-mono">
                    {verificacionCompletada.total_verificados_conforme ?? verificacionCompletada.total_conformes}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-rose-600 block uppercase">Faltantes</span>
                  <span className="text-lg font-black text-rose-700 font-mono">
                    {verificacionCompletada.total_faltantes}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-emerald-700 block uppercase">% Éxito</span>
                  <span className="text-lg font-black text-emerald-800 font-mono">
                    {verificacionCompletada.porcentaje_conformidad.toFixed(1)}%
                  </span>
                </div>
              </div>

              {/* Acciones principales */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    generarExcelConciliacionInventario(verificacionCompletada, config);
                    mostrarToast('ok', 'Descargando reporte Excel profesional...');
                  }}
                  className="w-full sm:w-auto px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center justify-center space-x-2 cursor-pointer"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>Descargar Reporte Excel (.xlsx)</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setActaParaImprimir(verificacionCompletada);
                    setModalActaOpen(true);
                  }}
                  className="w-full sm:w-auto px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center justify-center space-x-2 cursor-pointer"
                >
                  <Printer className="w-4 h-4 text-emerald-400" />
                  <span>Imprimir Acta Oficial (PDF)</span>
                </button>
              </div>

              <div className="pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => {
                    setVerificacionCompletada(null);
                    setItemsVerificacion([]);
                    setEtapa('ALCANCE');
                  }}
                  className="text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors"
                >
                  ← Iniciar otra verificación
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* VISTA 2: HISTORIAL DE ACTAS DE VERIFICACIÓN                               */}
      {/* ========================================================================= */}
      {subTab === 'HISTORIAL' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={busquedaHistorial}
                onChange={(e) => setBusquedaHistorial(e.target.value)}
                placeholder="Buscar por código de acta, auditor o ambiente..."
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            <button
              type="button"
              onClick={cargarHistorial}
              disabled={cargandoHistorial}
              className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-100 rounded-lg border border-slate-300 transition-colors flex items-center space-x-1.5"
            >
              <RotateCcw className={`w-3.5 h-3.5 ${cargandoHistorial ? 'animate-spin' : ''}`} />
              <span>Actualizar</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-100 text-slate-700 font-bold uppercase text-[10px] border-b border-slate-200">
                  <th className="py-2.5 px-3">Código de Acta</th>
                  <th className="py-2.5 px-3">Fecha y Hora</th>
                  <th className="py-2.5 px-3">Ambiente Evaluado</th>
                  <th className="py-2.5 px-3">Auditor Responsable</th>
                  <th className="py-2.5 px-3 text-center">Universo</th>
                  <th className="py-2.5 px-3 text-center">Conformes</th>
                  <th className="py-2.5 px-3 text-center">Faltantes</th>
                  <th className="py-2.5 px-3 text-center">% Éxito</th>
                  <th className="py-2.5 px-3 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {historialVerificaciones
                  .filter((v) => {
                    if (!busquedaHistorial.trim()) return true;
                    const q = busquedaHistorial.trim().toUpperCase();
                    return (
                      v.codigo_acta.toUpperCase().includes(q) ||
                      v.alcance_ambiente_nombre.toUpperCase().includes(q) ||
                      (v.auditor_nombre || v.operador_nombre || '').toUpperCase().includes(q) ||
                      (v.auditor_email || v.operador_email || '').toUpperCase().includes(q)
                    );
                  })
                  .map((v) => (
                    <tr key={v.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-2.5 px-3 font-mono font-bold text-slate-900">
                        {v.codigo_acta}
                      </td>
                      <td className="py-2.5 px-3 text-slate-600">
                        {new Date(v.fecha_inicio).toLocaleDateString('es-PE', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td className="py-2.5 px-3 font-medium text-slate-800">
                        {v.alcance_ambiente_nombre}
                        {v.filtro_lote && (
                          <span className="ml-1 text-[10px] text-slate-500">
                            ({v.filtro_lote})
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-slate-600">
                        {v.auditor_nombre || v.operador_nombre || v.auditor_email || v.operador_email || 'Docente AIP'}
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono font-semibold">
                        {v.total_esperados}
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono text-emerald-700 font-bold">
                        {v.total_verificados_conforme ?? v.total_conformes}
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono text-rose-700 font-bold">
                        {v.total_faltantes}
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono font-black text-emerald-800">
                        {v.porcentaje_conformidad.toFixed(1)}%
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <div className="flex items-center justify-center space-x-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              generarExcelConciliacionInventario(v, config);
                              mostrarToast('ok', 'Generando Excel...');
                            }}
                            className="p-1.5 text-emerald-700 hover:bg-emerald-50 rounded transition-colors"
                            title="Descargar Excel (.xlsx)"
                          >
                            <FileSpreadsheet className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setActaParaImprimir(v);
                              setModalActaOpen(true);
                            }}
                            className="p-1.5 text-slate-700 hover:bg-slate-100 rounded transition-colors"
                            title="Imprimir Acta Oficial (PDF)"
                          >
                            <Printer className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}

                {historialVerificaciones.length === 0 && (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-slate-400">
                      {cargandoHistorial
                        ? 'Cargando historial de auditorías...'
                        : 'No se encontraron actas de verificación registradas.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL DE CÁMARA QR */}
      <EscanerQRModal
        isOpen={modalCamaraOpen}
        onClose={() => {
          setModalCamaraOpen(false);
          setTimeout(() => {
            inputPistolaRef.current?.focus();
          }, 150);
        }}
        onRawScan={(codigo) => {
          procesarCodigoEscaneado(codigo);
        }}
        tituloPersonalizado="Escáner QR — Toma de Inventario"
      />

      {/* MODAL DE NOVEDAD FÍSICA */}
      {modalNovedadOpen && itemParaNovedad && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-sm font-bold text-slate-800">
              Registrar Novedad Física sobre el Equipo
            </h3>
            <p className="text-xs text-slate-500">
              Equipo: <strong className="text-slate-700">{itemParaNovedad.etiqueta_interna || itemParaNovedad.codigo_patrimonial}</strong> ({itemParaNovedad.denominacion})
            </p>

            <textarea
              value={textoNovedad}
              onChange={(e) => setTextoNovedad(e.target.value)}
              placeholder="Ej. Pantalla rayada, cargador no original, teclado incompleto..."
              rows={3}
              className="w-full text-xs p-3 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />

            <div className="flex items-center justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setModalNovedadOpen(false);
                  setItemParaNovedad(null);
                }}
                className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleGuardarNovedad}
                className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg"
              >
                Guardar Novedad
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE FINALIZACIÓN Y CIERRE */}
      {modalFinalizarOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center space-x-3 text-emerald-700">
              <ShieldCheck className="w-6 h-6" />
              <h3 className="text-base font-bold text-slate-800">
                Finalizar y Cerrar Verificación Física
              </h3>
            </div>

            <p className="text-xs text-slate-600">
              Al guardar, se generará un <strong>Acta Oficial Inmutable</strong> con fecha y hora de cierre. Esta acta servirá como comprobante formal de inventario para la institución.
            </p>

            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-500">Universo Esperado:</span>
                <span className="font-mono font-bold">{metricas.totalEsperados}</span>
              </div>
              <div className="flex justify-between text-emerald-700">
                <span>Verificados Conformes:</span>
                <span className="font-mono font-bold">{metricas.conformes}</span>
              </div>
              <div className="flex justify-between text-rose-700">
                <span>Faltantes No Ubicados:</span>
                <span className="font-mono font-bold">{metricas.faltantes}</span>
              </div>
              <div className="flex justify-between text-amber-700">
                <span>Fuera de Ubicación:</span>
                <span className="font-mono font-bold">{metricas.fueraUbicacion}</span>
              </div>
              <div className="flex justify-between font-bold pt-1 border-t border-slate-200">
                <span>Conformidad:</span>
                <span className="font-mono text-emerald-800">{metricas.porcentajeConformidad.toFixed(1)}%</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Observaciones Generales de la Comisión (Opcional):
              </label>
              <textarea
                value={observacionesGenerales}
                onChange={(e) => setObservacionesGenerales(e.target.value)}
                placeholder="Observaciones de la toma de inventario, incidencias detectadas, etc."
                rows={3}
                className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div className="flex items-center justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setModalFinalizarOpen(false)}
                disabled={guardandoVerificacion}
                className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              >
                Volver al Barrido
              </button>
              <button
                type="button"
                onClick={handleConfirmarFinalizar}
                disabled={guardandoVerificacion}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center space-x-1.5 cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>{guardandoVerificacion ? 'Guardando Acta...' : 'Confirmar y Guardar'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL IMPRESIÓN ACTA OFICIAL */}
      {modalActaOpen && actaParaImprimir && (
        <ActaVerificacionPrintModal
          isOpen={modalActaOpen}
          onClose={() => {
            setModalActaOpen(false);
            setActaParaImprimir(null);
          }}
          verificacion={actaParaImprimir}
          config={config}
        />
      )}
    </div>
  );
};
