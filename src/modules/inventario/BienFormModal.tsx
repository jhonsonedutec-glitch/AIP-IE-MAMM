import React, { useState, useEffect } from 'react';
import { X, Save, AlertCircle, AlertTriangle } from 'lucide-react';
import {
  BienPatrimonial,
  Ambiente,
  CategoriaEquipo,
  EstadoConservacion,
  EstadoOperativo,
  COLORES_LOTE_PREDEFINIDOS,
  deducirColorLote,
  detectarLoteAutomatico,
} from '@/types';
import { bienRepository } from '@/repositories';
import { useAuth } from '@/hooks';

interface BienFormModalProps {
  bienParaEditar?: BienPatrimonial | null;
  ambientes: Ambiente[];
  categorias: CategoriaEquipo[];
  onClose: () => void;
  onSuccess: () => void;
}

const DENOMINACIONES_PREDEFINIDAS = [
  'LAPTOP',
  'COMPUTADORA DE ESCRITORIO',
  'PROYECTOR MULTIMEDIA',
  'TABLET',
  'IMPRESORA',
  'MONITOR',
  'CPU',
  'PARLANTE / SISTEMA DE AUDIO',
  'SWITCH / EQUIPO DE RED',
  'ESTABILIZADOR / UPS',
  'ECRAN / PANTALLA',
  'OTRO',
] as const;

const MARCAS_PREDEFINIDAS = [
  'HP',
  'LENOVO',
  'ASUS',
  'EPSON',
  'DELL',
  'ACER',
  'LG',
  'SAMSUNG',
  'OTRO',
] as const;

const MODELOS_POR_MARCA: Record<string, string[]> = {
  LENOVO: [
    'THINKPAD E14',
    'THINKPAD L14',
    'THINKCENTRE M70Q',
    'IDEAPAD 3',
    'V14 / V15',
    'S/M (SIN MODELO)',
    'OTRO',
  ],
  HP: [
    'PRODESK 400',
    'PROBOOK 440',
    'PRODESK 600',
    '240 G8 / G9',
    'ELITEDESK',
    'S/M (SIN MODELO)',
    'OTRO',
  ],
  DELL: [
    'OPTIPLEX 3080',
    'LATITUDE 3420',
    'VOSTRO 3400',
    'INSPIRON 15',
    'S/M (SIN MODELO)',
    'OTRO',
  ],
  EPSON: [
    'POWERLITE E20',
    'POWERLITE X49',
    'ECOTANK L3250',
    'ECOTANK L3150',
    'S/M (SIN MODELO)',
    'OTRO',
  ],
  ASUS: [
    'EXPERTBOOK B1',
    'VIVOBOOK 15',
    'TUF GAMING',
    'S/M (SIN MODELO)',
    'OTRO',
  ],
  ACER: [
    'ASPIRE 3',
    'ASPIRE 5',
    'TRAVELMATE',
    'S/M (SIN MODELO)',
    'OTRO',
  ],
  SAMSUNG: [
    'GALAXY TAB A8',
    'GALAXY TAB S6 LITE',
    'SERIE 3',
    'S/M (SIN MODELO)',
    'OTRO',
  ],
  LG: [
    'GRAM 14',
    'ULTRA PC',
    'S/M (SIN MODELO)',
    'OTRO',
  ],
};

const MODELOS_GENERALES = [
  'THINKPAD E14',
  'PRODESK 400',
  'PROBOOK 440',
  'OPTIPLEX 3080',
  'LATITUDE 3420',
  'POWERLITE E20',
  'ECOTANK L3250',
  'S/M (SIN MODELO)',
  'OTRO',
];

const COLORES_PREDEFINIDOS = [
  'GRIS',
  'NEGRO',
  'AZUL',
  'PLOMO',
  'BLANCO',
  'PLATEADO',
  'OTRO',
] as const;

export const BienFormModal: React.FC<BienFormModalProps> = ({
  bienParaEditar,
  ambientes,
  categorias,
  onClose,
  onSuccess,
}) => {
  const { user } = useAuth();
  const esEdicion = Boolean(bienParaEditar);

  const [denominacionSelect, setDenominacionSelect] = useState<string>('LAPTOP');
  const [denominacionOtra, setDenominacionOtra] = useState('');
  const [categoriaId, setCategoriaId] = useState('');
  const [ambienteId, setAmbienteId] = useState('');
  const [ubicacionDetalle, setUbicacionDetalle] = useState('');
  const [codigoPatrimonial, setCodigoPatrimonial] = useState('');
  const [tipoCodigo, setTipoCodigo] = useState<'S/C' | 'CIC'>('S/C');
  const [etiquetaInterna, setEtiquetaInterna] = useState('');

  // Estados para Marca
  const [marcaSelect, setMarcaSelect] = useState<string>('HP');
  const [marcaOtra, setMarcaOtra] = useState('');

  // Estados para Modelo
  const [modeloSelect, setModeloSelect] = useState<string>('PRODESK 400');
  const [modeloOtro, setModeloOtro] = useState('');
  const [serie, setSerie] = useState('');

  // Estados para Color
  const [colorSelect, setColorSelect] = useState<string>('NEGRO');
  const [colorOtro, setColorOtro] = useState('');

  // Estados para Lote de Adquisición
  const [loteSelect, setLoteSelect] = useState<string>(''); // '' = Sin lote
  const [loteNombreOtro, setLoteNombreOtro] = useState<string>('');
  const [loteColor, setLoteColor] = useState<string>('#EA580C');

  const [estacionGrupo, setEstacionGrupo] = useState('');
  const [estadoConservacion, setEstadoConservacion] = useState<EstadoConservacion>('B');
  const [estadoOperativo, setEstadoOperativo] = useState<EstadoOperativo>('OPERATIVO');
  const [observacion, setObservacion] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Detectar si el ambiente seleccionado es "Otros"
  const ambienteSeleccionado = ambientes.find((a) => a.id === ambienteId);
  const esAmbienteOtros =
    ambienteSeleccionado?.nombre.trim().toLowerCase() === 'otros';

  const modelosDisponibles =
    MODELOS_POR_MARCA[marcaSelect] || MODELOS_GENERALES;

  const handleMarcaChange = (nuevaMarca: string) => {
    setMarcaSelect(nuevaMarca);
    const nuevosModelos = MODELOS_POR_MARCA[nuevaMarca] || MODELOS_GENERALES;
    if (modeloSelect !== 'OTRO') {
      if (!nuevosModelos.includes(modeloSelect)) {
        setModeloSelect(nuevosModelos[0] || 'OTRO');
      }
    }
  };

  const handleLoteSelectChange = (nuevoLote: string) => {
    setLoteSelect(nuevoLote);
    if (nuevoLote === 'OTRO') {
      if (!loteNombreOtro) setLoteNombreOtro('');
    } else if (nuevoLote) {
      const pred = COLORES_LOTE_PREDEFINIDOS.find((item) => item.nombre === nuevoLote);
      if (pred) setLoteColor(pred.color);
    }
  };

  const handleObservacionChange = (texto: string) => {
    setObservacion(texto);
    // Si el lote aún está en "Sin lote", auto-etiquetar si escribe VERDE u otro color
    if (!loteSelect) {
      const { lote_etiqueta, lote_color } = detectarLoteAutomatico(texto);
      if (lote_etiqueta) {
        setLoteSelect(lote_etiqueta);
        setLoteColor(lote_color);
      }
    }
  };

  useEffect(() => {
    if (bienParaEditar) {
      // Manejo inteligente de Denominación en edición
      const d = (bienParaEditar.denominacion || '').trim().toUpperCase();
      const denomsBase: readonly string[] = [
        'LAPTOP',
        'COMPUTADORA DE ESCRITORIO',
        'PROYECTOR MULTIMEDIA',
        'TABLET',
        'IMPRESORA',
        'MONITOR',
        'CPU',
        'PARLANTE / SISTEMA DE AUDIO',
        'SWITCH / EQUIPO DE RED',
        'ESTABILIZADOR / UPS',
        'ECRAN / PANTALLA',
      ];
      if (denomsBase.includes(d)) {
        setDenominacionSelect(d);
        setDenominacionOtra('');
      } else if (d) {
        setDenominacionSelect('OTRO');
        setDenominacionOtra(d);
      } else {
        setDenominacionSelect('LAPTOP');
        setDenominacionOtra('');
      }

      setCategoriaId(bienParaEditar.categoria_id || '');
      setAmbienteId(bienParaEditar.ambiente_id || '');
      setUbicacionDetalle(bienParaEditar.ubicacion_detalle || '');
      setCodigoPatrimonial(bienParaEditar.codigo_patrimonial || '');
      setTipoCodigo(bienParaEditar.tipo_codigo || 'S/C');
      setEtiquetaInterna(bienParaEditar.etiqueta_interna || '');

      // Manejo inteligente de Marca en edición
      const m = (bienParaEditar.marca || '').trim().toUpperCase();
      const marcasBase = ['HP', 'LENOVO', 'ASUS', 'EPSON', 'DELL', 'ACER', 'LG', 'SAMSUNG'];
      if (marcasBase.includes(m)) {
        setMarcaSelect(m);
        setMarcaOtra('');
      } else if (m) {
        setMarcaSelect('OTRO');
        setMarcaOtra(m);
      } else {
        setMarcaSelect('HP');
        setMarcaOtra('');
      }

      // Manejo inteligente de Modelo en edición
      const mod = (bienParaEditar.modelo || '').trim().toUpperCase();
      const todosModelos = Array.from(
        new Set([...Object.values(MODELOS_POR_MARCA).flat(), ...MODELOS_GENERALES])
      );
      if (todosModelos.includes(mod) && mod !== 'OTRO') {
        setModeloSelect(mod);
        setModeloOtro('');
      } else if (mod) {
        setModeloSelect('OTRO');
        setModeloOtro(mod);
      } else {
        const mods = MODELOS_POR_MARCA[m] || MODELOS_GENERALES;
        setModeloSelect(mods[0] || 'S/M (SIN MODELO)');
        setModeloOtro('');
      }

      setSerie(bienParaEditar.serie || '');

      // Manejo inteligente de Color en edición
      const c = (bienParaEditar.color || '').trim().toUpperCase();
      const coloresBase = ['GRIS', 'NEGRO', 'AZUL', 'PLOMO', 'BLANCO', 'PLATEADO'];
      if (coloresBase.includes(c)) {
        setColorSelect(c);
        setColorOtro('');
      } else if (c) {
        setColorSelect('OTRO');
        setColorOtro(c);
      } else {
        setColorSelect('NEGRO');
        setColorOtro('');
      }

      setEstacionGrupo(bienParaEditar.estacion_grupo || '');
      setEstadoConservacion(bienParaEditar.estado_conservacion || 'B');
      setEstadoOperativo(bienParaEditar.estado_operativo || 'OPERATIVO');
      setObservacion(bienParaEditar.observacion || '');

      // Manejo inteligente de Lote en edición
      if (bienParaEditar.lote_etiqueta) {
        const etiquetaExistente = bienParaEditar.lote_etiqueta.trim().toUpperCase();
        const coincide = COLORES_LOTE_PREDEFINIDOS.find(
          (item) => item.nombre === etiquetaExistente
        );
        if (coincide) {
          setLoteSelect(coincide.nombre);
          setLoteNombreOtro('');
          setLoteColor(bienParaEditar.lote_color || coincide.color);
        } else {
          setLoteSelect('OTRO');
          setLoteNombreOtro(etiquetaExistente);
          setLoteColor(bienParaEditar.lote_color || deducirColorLote(etiquetaExistente));
        }
      } else {
        setLoteSelect('');
        setLoteNombreOtro('');
        setLoteColor('#EA580C');
      }
    } else {
      setDenominacionSelect('LAPTOP');
      setDenominacionOtra('');
      setMarcaSelect('HP');
      setMarcaOtra('');
      setModeloSelect(MODELOS_POR_MARCA['HP'][0] || 'PRODESK 400');
      setModeloOtro('');
      setColorSelect('NEGRO');
      setColorOtro('');
      setCodigoPatrimonial('');
      setTipoCodigo('S/C');
      setSerie('');
      setEtiquetaInterna('');
      setEstacionGrupo('');
      setEstadoConservacion('B');
      setEstadoOperativo('OPERATIVO');
      setObservacion('');
      setUbicacionDetalle('');
      setLoteSelect('');
      setLoteNombreOtro('');
      setLoteColor('#EA580C');
      if (categorias.length > 0) setCategoriaId(categorias[0].id);
      if (ambientes.length > 0) setAmbienteId(ambientes[0].id);
    }
  }, [bienParaEditar, ambientes, categorias]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validación de denominación
    const denominacionFinal =
      denominacionSelect === 'OTRO'
        ? denominacionOtra.trim().toUpperCase()
        : denominacionSelect;

    if (denominacionSelect === 'OTRO' && !denominacionOtra.trim()) {
      setError('Debe especificar la denominación o descripción del bien.');
      return;
    }
    if (!denominacionFinal) {
      setError('La denominación del bien es obligatoria (ej. LAPTOP, CPU, PROYECTOR).');
      return;
    }
    if (!categoriaId) {
      setError('Debe seleccionar una categoría de equipo.');
      return;
    }
    if (!ambienteId) {
      setError('Debe seleccionar un ambiente de ubicación.');
      return;
    }

    // Validación de marca personalizada
    const marcaFinal = marcaSelect === 'OTRO' ? marcaOtra.trim().toUpperCase() : marcaSelect;
    if (marcaSelect === 'OTRO' && !marcaOtra.trim()) {
      setError('Debe especificar la marca personalizada del equipo.');
      return;
    }

    // Validación de modelo
    const modeloFinal =
      modeloSelect === 'OTRO'
        ? (modeloOtro.trim().toUpperCase() || 'S/M')
        : modeloSelect;

    if (modeloSelect === 'OTRO' && !modeloOtro.trim()) {
      setError('Debe especificar el modelo del equipo.');
      return;
    }

    // Validación de color personalizado
    const colorFinal = colorSelect === 'OTRO' ? colorOtro.trim().toUpperCase() : colorSelect;
    if (colorSelect === 'OTRO' && !colorOtro.trim()) {
      setError('Debe especificar el color personalizado del equipo.');
      return;
    }

    // Validación de ambiente "Otros"
    if (esAmbienteOtros && !ubicacionDetalle.trim()) {
      setError('Al seleccionar el ambiente Otros, debe especificar la ubicación o ambiente detallado.');
      return;
    }

    // Saneamiento y valores por defecto para Código Patrimonial y Tipo de Código
    const cleanCodigo = codigoPatrimonial.trim().toUpperCase();
    const codigoFinal = cleanCodigo || 'S/C';
    let tipoCodigoFinal = tipoCodigo;
    if (cleanCodigo && cleanCodigo !== 'S/C' && tipoCodigo === 'S/C') {
      tipoCodigoFinal = 'CIC';
    }

    // Saneamiento y valor por defecto para Número de Serie
    const cleanSerie = serie.trim().toUpperCase();
    const serieFinal = cleanSerie || 'S/N';

    // Procesar Lote y Color
    let loteEtiquetaFinal = '';
    let loteColorFinal = '';
    if (loteSelect === 'OTRO') {
      if (!loteNombreOtro.trim()) {
        setError('Debe especificar el nombre del lote personalizado.');
        return;
      }
      loteEtiquetaFinal = loteNombreOtro.trim().toUpperCase();
      loteColorFinal = loteColor.trim() || '#6366F1';
    } else if (loteSelect) {
      loteEtiquetaFinal = loteSelect;
      loteColorFinal = loteColor.trim() || deducirColorLote(loteSelect);
    }

    setLoading(true);
    setError(null);

    const operador = user ? { uid: user.uid, email: user.email || '' } : undefined;

    try {
      if (esEdicion && bienParaEditar) {
        await bienRepository.actualizar(
          bienParaEditar.id,
          {
            denominacion: denominacionFinal,
            categoria_id: categoriaId,
            ambiente_id: ambienteId,
            ubicacion_detalle: esAmbienteOtros ? ubicacionDetalle.trim() : '',
            codigo_patrimonial: codigoFinal,
            tipo_codigo: tipoCodigoFinal,
            etiqueta_interna: etiquetaInterna.trim() || bienParaEditar.etiqueta_interna,
            codigo_qr: etiquetaInterna.trim() || bienParaEditar.codigo_qr,
            marca: marcaFinal,
            modelo: modeloFinal,
            serie: serieFinal,
            color: colorFinal,
            estacion_grupo: estacionGrupo.trim() || '',
            lote_etiqueta: loteEtiquetaFinal,
            lote_color: loteColorFinal,
            estado_conservacion: estadoConservacion,
            estado_operativo: estadoOperativo,
            observacion: observacion.trim() || '',
          },
          operador
        );
      } else {
        await bienRepository.crear(
          {
            denominacion: denominacionFinal,
            categoria_id: categoriaId,
            ambiente_id: ambienteId,
            ubicacion_detalle: esAmbienteOtros ? ubicacionDetalle.trim() : '',
            codigo_patrimonial: codigoFinal,
            tipo_codigo: tipoCodigoFinal,
            etiqueta_interna: etiquetaInterna.trim() || '',
            codigo_qr: etiquetaInterna.trim() || '',
            marca: marcaFinal,
            modelo: modeloFinal,
            serie: serieFinal,
            color: colorFinal,
            estacion_grupo: estacionGrupo.trim() || '',
            lote_etiqueta: loteEtiquetaFinal,
            lote_color: loteColorFinal,
            estado_conservacion: estadoConservacion,
            estado_operativo: estadoOperativo,
            observacion: observacion.trim() || '',
            total_prestamos: 0,
          },
          operador
        );
      }

      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Error al guardar el bien patrimonial.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full border border-slate-200 overflow-hidden my-6">
        {/* Encabezado */}
        <div className="bg-slate-900 text-white p-5 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-white">
              {esEdicion ? 'Editar Bien Patrimonial' : 'Registrar Nuevo Bien Tecnológico'}
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Formato Oficial Anexo 01 – I.E. Emblemática Manuel Antonio Mesones Muro
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="m-5 mb-0 p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-start space-x-2 text-rose-800 text-xs">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <span className="font-medium leading-relaxed">{error}</span>
          </div>
        )}

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label className="block font-semibold text-slate-700 mb-1">
                Denominación / Descripción *
              </label>
              <select
                value={denominacionSelect}
                onChange={(e) => setDenominacionSelect(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
              >
                {DENOMINACIONES_PREDEFINIDAS.map((d) => (
                  <option key={d} value={d}>
                    {d === 'OTRO' ? 'OTRO (Especificar)' : d}
                  </option>
                ))}
              </select>
              {denominacionSelect === 'OTRO' && (
                <input
                  type="text"
                  required
                  value={denominacionOtra}
                  onChange={(e) => setDenominacionOtra(e.target.value.toUpperCase())}
                  placeholder="Escriba la denominación del bien (ej. SCANNER, SMART TV, CÁMARA)..."
                  className="w-full mt-1.5 px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                />
              )}
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Categoría *</label>
              <select
                required
                value={categoriaId}
                onChange={(e) => setCategoriaId(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                {categorias.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nombre} ({c.prefijo_etiqueta})
                  </option>
                ))}
              </select>
              {categorias.length === 0 && (
                <div className="mt-1.5 p-2 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-[11px] flex items-start space-x-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                  <span>
                    No hay categorías registradas. Inicialízalas en{' '}
                    <strong>Configuración → Catálogos</strong>.
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Código Patrimonial
              </label>
              <input
                type="text"
                value={codigoPatrimonial}
                onChange={(e) => {
                  const val = e.target.value.toUpperCase();
                  setCodigoPatrimonial(val);
                  if (val.trim() && val.trim() !== 'S/C' && tipoCodigo === 'S/C') {
                    setTipoCodigo('CIC');
                  }
                }}
                onFocus={() => {
                  if (codigoPatrimonial.trim().toUpperCase() === 'S/C') {
                    setCodigoPatrimonial('');
                  }
                }}
                placeholder="S/C — Digita o pega el código (vacío = S/C)"
                className="w-full px-3 py-2 text-sm font-mono bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Tipo de Código</label>
              <select
                value={tipoCodigo}
                onChange={(e) => setTipoCodigo(e.target.value as 'S/C' | 'CIC')}
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="S/C">S/C (Sin Código)</option>
                <option value="CIC">CIC (Con Código Inventario)</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Etiqueta Interna / Rotulado QR
              </label>
              <input
                type="text"
                value={etiquetaInterna}
                onChange={(e) => setEtiquetaInterna(e.target.value.toUpperCase())}
                placeholder="Autogenerado si está vacío (ej. LAP-001)"
                className="w-full px-3 py-2 text-sm font-mono bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            {/* Campo Marca con Select + OTRO */}
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Marca *</label>
              <select
                value={marcaSelect}
                onChange={(e) => handleMarcaChange(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
              >
                {MARCAS_PREDEFINIDAS.map((m) => (
                  <option key={m} value={m}>
                    {m === 'OTRO' ? 'OTRO (Especificar)' : m}
                  </option>
                ))}
              </select>
              {marcaSelect === 'OTRO' && (
                <input
                  type="text"
                  required
                  value={marcaOtra}
                  onChange={(e) => setMarcaOtra(e.target.value.toUpperCase())}
                  placeholder="Escriba la marca..."
                  className="w-full mt-1.5 px-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                />
              )}
            </div>

            {/* Campo Modelo con Select + OTRO */}
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Modelo *</label>
              <select
                value={modeloSelect}
                onChange={(e) => setModeloSelect(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
              >
                {modelosDisponibles.map((mod) => (
                  <option key={mod} value={mod}>
                    {mod === 'OTRO' ? 'OTRO (Especificar)' : mod}
                  </option>
                ))}
              </select>
              {modeloSelect === 'OTRO' && (
                <input
                  type="text"
                  required
                  value={modeloOtro}
                  onChange={(e) => setModeloOtro(e.target.value.toUpperCase())}
                  placeholder="Escriba el modelo..."
                  className="w-full mt-1.5 px-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                />
              )}
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Número de Serie</label>
              <input
                type="text"
                value={serie}
                onChange={(e) => setSerie(e.target.value.toUpperCase())}
                onFocus={() => {
                  const s = serie.trim().toUpperCase();
                  if (s === 'S/N' || s === 'S/S' || s === 'SIN SERIE') {
                    setSerie('');
                  }
                }}
                placeholder="S/N — Digita o pega la serie (vacío = S/N)"
                className="w-full px-3 py-2 text-sm font-mono bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            {/* Campo Color con Select + OTRO */}
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Color *</label>
              <select
                value={colorSelect}
                onChange={(e) => setColorSelect(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
              >
                {COLORES_PREDEFINIDOS.map((c) => (
                  <option key={c} value={c}>
                    {c === 'OTRO' ? 'OTRO (Especificar)' : c}
                  </option>
                ))}
              </select>
              {colorSelect === 'OTRO' && (
                <input
                  type="text"
                  required
                  value={colorOtro}
                  onChange={(e) => setColorOtro(e.target.value.toUpperCase())}
                  placeholder="Escriba el color..."
                  className="w-full mt-1.5 px-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                />
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Selector de Ambiente + Detalle Dinámico si es "Otros" */}
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Ubicación / Ambiente *
              </label>
              <select
                required
                value={ambienteId}
                onChange={(e) => setAmbienteId(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                {ambientes.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.nombre}
                  </option>
                ))}
              </select>
              {esAmbienteOtros && (
                <div className="mt-2">
                  <label className="block font-semibold text-emerald-800 text-[11px] mb-1">
                    Especificar ubicación / ambiente * (Ej. Biblioteca, Dirección, Laboratorio)
                  </label>
                  <input
                    type="text"
                    required
                    value={ubicacionDetalle}
                    onChange={(e) => setUbicacionDetalle(e.target.value)}
                    placeholder="Ej. Biblioteca, Dirección, Laboratorio 2"
                    className="w-full px-3 py-1.5 text-xs bg-emerald-50/40 border border-emerald-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium text-slate-800"
                  />
                </div>
              )}
            </div>

            {/* Selector de Estado de Conservación (4 Opciones) */}
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Estado de Conservación *
              </label>
              <select
                value={estadoConservacion}
                onChange={(e) => setEstadoConservacion(e.target.value as EstadoConservacion)}
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
              >
                <option value="N">Nuevo (N)</option>
                <option value="B">Bueno (B)</option>
                <option value="R">Regular (R)</option>
                <option value="M">Malo (M)</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Estado Operativo *</label>
              <select
                value={estadoOperativo}
                onChange={(e) => setEstadoOperativo(e.target.value as EstadoOperativo)}
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
              >
                <option value="OPERATIVO">OPERATIVO (Disponible para préstamos)</option>
                <option value="EN_MANTENIMIENTO">EN MANTENIMIENTO (En soporte)</option>
                <option value="PRESTADO">PRESTADO (En circulación)</option>
                <option value="DE_BAJA">DE BAJA (Inoperativo)</option>
              </select>
            </div>
          </div>

          {/* Sección de Lote / Etiqueta de Color (Opcional) */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <label className="block font-semibold text-slate-800 text-xs uppercase tracking-wider">
                Lote de Adquisición / Etiqueta de Color (Opcional)
              </label>
              {loteSelect && (
                <span
                  className="inline-flex items-center space-x-1.5 px-2 py-0.5 rounded-full text-[11px] font-bold border"
                  style={{
                    backgroundColor: `${loteColor}15`,
                    borderColor: loteColor,
                    color: loteColor,
                  }}
                >
                  <span
                    className="w-2.5 h-2.5 rounded-full inline-block shrink-0 shadow-xs"
                    style={{ backgroundColor: loteColor }}
                  />
                  <span>
                    {loteSelect === 'OTRO'
                      ? loteNombreOtro || 'LOTE PERSONALIZADO'
                      : loteSelect}
                  </span>
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">
                  Seleccionar Lote
                </label>
                <select
                  value={loteSelect}
                  onChange={(e) => handleLoteSelectChange(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium text-slate-800"
                >
                  <option value="">(Sin lote asignado)</option>
                  {COLORES_LOTE_PREDEFINIDOS.map((item) => (
                    <option key={item.nombre} value={item.nombre}>
                      {item.nombre} ({item.color})
                    </option>
                  ))}
                  <option value="OTRO">OTRO (Personalizado)...</option>
                </select>
              </div>

              {loteSelect !== '' && (
                <div>
                  <label className="block text-[11px] font-medium text-slate-600 mb-1">
                    Color del Lote (Vista Previa / Ajuste)
                  </label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="color"
                      value={loteColor}
                      onChange={(e) => setLoteColor(e.target.value)}
                      className="w-9 h-9 p-0.5 bg-white border border-slate-300 rounded-lg cursor-pointer shrink-0"
                      title="Seleccionar color del lote"
                    />
                    <input
                      type="text"
                      value={loteColor}
                      onChange={(e) => setLoteColor(e.target.value)}
                      placeholder="#EA580C"
                      className="w-24 px-2 py-1.5 text-xs font-mono bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                    <span className="text-[11px] text-slate-500">Color activo</span>
                  </div>
                </div>
              )}
            </div>

            {loteSelect === 'OTRO' && (
              <div className="pt-2 border-t border-slate-200">
                <label className="block text-[11px] font-medium text-slate-700 mb-1">
                  Nombre del Lote Personalizado * (Ej. LOTE CELESTE, DOTACIÓN 2026, FONDO MINEDU)
                </label>
                <input
                  type="text"
                  required={loteSelect === 'OTRO'}
                  value={loteNombreOtro}
                  onChange={(e) => setLoteNombreOtro(e.target.value.toUpperCase())}
                  placeholder="Ej. LOTE CELESTE o DOTACIÓN 2026"
                  className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-semibold text-slate-900"
                />
              </div>
            )}
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Estación o Grupo de Trabajo (Opcional)
            </label>
            <input
              type="text"
              value={estacionGrupo}
              onChange={(e) => setEstacionGrupo(e.target.value)}
              placeholder="Ej. PC Estación 05, Grupo Robótica, Kit Primaria"
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Observaciones Técnicas
            </label>
            <textarea
              rows={2}
              value={observacion}
              onChange={(e) => handleObservacionChange(e.target.value)}
              placeholder="Notas técnicas, accesorios incluidos, estado del cargador, etc."
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
            />
          </div>

          <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              disabled={loading}
              onClick={onClose}
              className="px-4 py-2 text-slate-600 hover:text-slate-800 font-semibold"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center space-x-1.5 px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg shadow-sm disabled:opacity-50 transition-colors"
            >
              <Save className="w-4 h-4" />
              <span>{loading ? 'Guardando...' : esEdicion ? 'Actualizar Bien' : 'Registrar Bien'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
