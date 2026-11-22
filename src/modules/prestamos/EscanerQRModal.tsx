import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode, CameraDevice } from 'html5-qrcode';
import {
  Camera,
  X,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  Upload,
  Video,
} from 'lucide-react';
import { Bien } from '@/types';

interface EscanerQRModalProps {
  isOpen: boolean;
  onClose: () => void;
  bienesDisponibles: Bien[];
  onEquipoDetectado: (bien: Bien) => void;
}

export const EscanerQRModal: React.FC<EscanerQRModalProps> = ({
  isOpen,
  onClose,
  bienesDisponibles,
  onEquipoDetectado,
}) => {
  const containerId = 'html5qr-code-reader-modal';

  const [camaras, setCamaras] = useState<CameraDevice[]>([]);
  const [camaraSeleccionadaId, setCamaraSeleccionadaId] = useState<string>('');
  const [estadoVisor, setEstadoVisor] = useState<'buscando' | 'iniciando' | 'activo' | 'error'>('buscando');
  const [mensajeEstado, setMensajeEstado] = useState<string>('Buscando cámaras disponibles...');
  const [detalleTecnicoError, setDetalleTecnicoError] = useState<string | null>(null);
  const [permisoDenegado, setPermisoDenegado] = useState(false);

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const isStartingRef = useRef<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  // Reproducir sonido sutil de confirmación
  const reproducirBeep = () => {
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
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.15);
    } catch {
      // Ignorar si el navegador bloquea audio sin interacción
    }
  };

  // Detener y limpiar escáner de forma completamente segura
  const detenerEscaner = async () => {
    const scanner = scannerRef.current;
    if (scanner) {
      try {
        if (scanner.isScanning) {
          await scanner.stop();
        }
        scanner.clear();
      } catch (e) {
        console.warn('Advertencia al detener cámara QR:', e);
      } finally {
        scannerRef.current = null;
      }
    }

    // Limpiar contenedor DOM para evitar videos o streams huérfanos
    const container = document.getElementById(containerId);
    if (container) {
      container.innerHTML = '';
    }
  };

  // Iniciar cámara con ID específico
  const arrancarCamaraConId = async (cameraId: string, isCancelled: () => boolean) => {
    if (isStartingRef.current) return;
    isStartingRef.current = true;

    setEstadoVisor('iniciando');
    setMensajeEstado('Iniciando transmisión de video...');
    setErrorMsg(null);
    setDetalleTecnicoError(null);

    await detenerEscaner();

    if (isCancelled()) {
      isStartingRef.current = false;
      return;
    }

    const container = document.getElementById(containerId);
    if (container) {
      container.innerHTML = '';
    }

    try {
      const scanner = new Html5Qrcode(containerId);
      scannerRef.current = scanner;

      const config = {
        fps: 10,
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0,
      };

      await scanner.start(
        cameraId,
        config,
        (decodedText) => {
          handleCodigoEscaneado(decodedText);
        },
        () => {
          // Frame sin código QR - silencioso
        }
      );

      if (isCancelled()) {
        await detenerEscaner();
        isStartingRef.current = false;
        return;
      }

      setEstadoVisor('activo');
      setMensajeEstado('Cámara activa');
    } catch (err: any) {
      if (isCancelled()) {
        isStartingRef.current = false;
        return;
      }
      console.error('Error al iniciar cámara QR:', err);
      setEstadoVisor('error');
      const errorMsgText = err?.message || String(err);
      setDetalleTecnicoError(errorMsgText);

      if (err?.name === 'NotAllowedError' || errorMsgText.includes('Permission')) {
        setPermisoDenegado(true);
        setMensajeEstado('Permiso de cámara bloqueado.');
        setErrorMsg('Permite el acceso a la cámara en los permisos de tu navegador.');
      } else if (
        errorMsgText.includes('NotReadableError') ||
        errorMsgText.includes('in use') ||
        errorMsgText.includes('Could not start video source')
      ) {
        setMensajeEstado('La cámara está en uso o bloqueada.');
        setErrorMsg('Cierra otras aplicaciones que puedan estar usando la cámara y presiona "Reintentar cámara".');
      } else {
        setMensajeEstado('No se pudo inicializar la cámara.');
        setErrorMsg(`Detalle técnico: ${errorMsgText}`);
      }
    } finally {
      isStartingRef.current = false;
    }
  };

  // Ciclo de vida con protección contra doble montaje (React 18 StrictMode)
  useEffect(() => {
    if (!isOpen) {
      detenerEscaner();
      return;
    }

    let cancelled = false;
    setErrorMsg(null);
    setSuccessMsg(null);
    setDetalleTecnicoError(null);
    setPermisoDenegado(false);
    setEstadoVisor('buscando');
    setMensajeEstado('Buscando cámaras disponibles...');

    const inicializar = async () => {
      // Pequeño retardo para asegurar que el DOM del modal esté listo
      await new Promise((resolve) => setTimeout(resolve, 150));
      if (cancelled) return;

      try {
        const devices = await Html5Qrcode.getCameras();
        if (cancelled) return;

        if (!devices || devices.length === 0) {
          setEstadoVisor('error');
          setMensajeEstado('No se detectaron cámaras en este equipo.');
          setErrorMsg('No se encontró ninguna cámara conectada. Puedes usar el botón "Escanear desde imagen".');
          return;
        }

        setCamaras(devices);

        // Priorizar cámara trasera si existe, de lo contrario la primera disponible
        const trasera = devices.find((d) =>
          /back|rear|environment|trasera/i.test(d.label)
        );
        const camId = trasera ? trasera.id : devices[0].id;
        setCamaraSeleccionadaId(camId);

        await arrancarCamaraConId(camId, () => cancelled);
      } catch (err: any) {
        if (cancelled) return;
        console.error('Error al detectar cámaras:', err);
        setEstadoVisor('error');
        const msg = err?.message || String(err);
        setDetalleTecnicoError(msg);
        if (err?.name === 'NotAllowedError' || msg.includes('Permission')) {
          setPermisoDenegado(true);
          setMensajeEstado('Permiso de cámara denegado.');
          setErrorMsg('Permite el acceso a la cámara en los permisos de tu navegador.');
        } else {
          setMensajeEstado('Error al consultar dispositivos de video.');
          setErrorMsg(`Falla al consultar cámaras: ${msg}`);
        }
      }
    };

    inicializar();

    return () => {
      cancelled = true;
      detenerEscaner();
    };
  }, [isOpen]);

  // Cambiar cámara manualmente desde el select
  const handleCambioCamara = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const nuevoId = e.target.value;
    setCamaraSeleccionadaId(nuevoId);
    await arrancarCamaraConId(nuevoId, () => false);
  };

  // Reintentar cámara
  const handleReintentar = async () => {
    setErrorMsg(null);
    setSuccessMsg(null);
    setDetalleTecnicoError(null);
    setPermisoDenegado(false);

    try {
      const devices = await Html5Qrcode.getCameras();
      if (!devices || devices.length === 0) {
        setEstadoVisor('error');
        setMensajeEstado('No se detectaron cámaras en este dispositivo.');
        setErrorMsg('Conecta una cámara web o sube una imagen con el código QR.');
        return;
      }
      setCamaras(devices);
      const camId = camaraSeleccionadaId || devices[0].id;
      setCamaraSeleccionadaId(camId);
      await arrancarCamaraConId(camId, () => false);
    } catch (err: any) {
      console.error('Error al reintentar cámara:', err);
      setEstadoVisor('error');
      const msg = err?.message || String(err);
      setDetalleTecnicoError(msg);
      setErrorMsg(`Error al reintentar: ${msg}`);
    }
  };

  // Escanear código QR desde archivo de imagen
  const handleEscanearArchivo = () => {
    fileInputRef.current?.click();
  };

  const handleArchivoSeleccionado = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      // Detener cámara activa para evitar conflicto de scanner
      await detenerEscaner();
      setEstadoVisor('iniciando');
      setMensajeEstado('Decodificando imagen seleccionada...');

      const fileScanner = new Html5Qrcode(containerId);
      scannerRef.current = fileScanner;
      const decodedText = await fileScanner.scanFile(file, true);
      setEstadoVisor('activo');
      setMensajeEstado('Código detectado en imagen');
      handleCodigoEscaneado(decodedText);
    } catch (err: any) {
      console.error('Error al escanear archivo QR:', err);
      setEstadoVisor('error');
      setMensajeEstado('No se detectó código QR en la imagen.');
      setErrorMsg('No se encontró un código QR legible en la imagen. Intenta con una foto más nítida o reanuda la cámara.');
    } finally {
      e.target.value = '';
    }
  };

  // Procesar código decodificado
  const handleCodigoEscaneado = (textoQR: string) => {
    const codigoLimpio = textoQR.trim().toUpperCase();
    if (!codigoLimpio) return;

    const bienEncontrado = bienesDisponibles.find(
      (b) =>
        (b.etiqueta_interna && b.etiqueta_interna.toUpperCase() === codigoLimpio) ||
        (b.codigo_patrimonial && b.codigo_patrimonial.toUpperCase() === codigoLimpio) ||
        (b.serie && b.serie.toUpperCase() === codigoLimpio) ||
        (b.numero_serie && b.numero_serie.toUpperCase() === codigoLimpio)
    );

    if (!bienEncontrado) {
      setErrorMsg(`No se encontró ningún equipo con el código: "${codigoLimpio}"`);
      setSuccessMsg(null);
      return;
    }

    if (bienEncontrado.estado_operativo !== 'OPERATIVO') {
      setErrorMsg(
        `El equipo ${bienEncontrado.etiqueta_interna} NO está disponible. Estado actual: ${bienEncontrado.estado_operativo}`
      );
      setSuccessMsg(null);
      return;
    }

    // Éxito
    reproducirBeep();
    setSuccessMsg(`¡Equipo detectado: ${bienEncontrado.etiqueta_interna} - ${bienEncontrado.denominacion}!`);
    setErrorMsg(null);
    onEquipoDetectado(bienEncontrado);

    setTimeout(() => {
      setSuccessMsg(null);
    }, 2500);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      {/* Estilos dedicados para inyección limpia de html5-qrcode sin pantalla negra */}
      <style>{`
        #${containerId} {
          width: 100% !important;
          min-height: 280px !important;
          position: relative !important;
        }
        #${containerId} video {
          width: 100% !important;
          height: auto !important;
          min-height: 280px !important;
          max-height: 340px !important;
          object-fit: cover !important;
          display: block !important;
          border-radius: 0.75rem !important;
        }
        #${containerId} canvas {
          display: none !important;
        }
        #${containerId} #qr-shaded-region {
          border-color: rgba(16, 185, 129, 0.4) !important;
        }
      `}</style>

      {/* Input de archivo oculto para respaldo */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleArchivoSeleccionado}
        className="hidden"
      />

      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[92vh]">
        {/* Encabezado */}
        <div className="flex items-center justify-between px-5 py-4 bg-slate-900 text-white">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-lg">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-base leading-tight">Escáner de Código QR</h3>
              <p className="text-xs text-slate-400">Apunta la cámara a la etiqueta del equipo</p>
            </div>
          </div>
          <button
            onClick={() => {
              detenerEscaner();
              onClose();
            }}
            className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Barra superior de cámara y opciones */}
        <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-2">
          {/* Selector de cámara */}
          <div className="flex items-center space-x-1.5 flex-1 min-w-0">
            <Video className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
            <select
              value={camaraSeleccionadaId}
              onChange={handleCambioCamara}
              disabled={camaras.length === 0}
              className="text-[11px] font-medium bg-white border border-slate-300 rounded-lg px-2 py-1 text-slate-700 w-full truncate focus:outline-none focus:ring-1 focus:ring-indigo-500"
              title="Seleccionar dispositivo de cámara"
            >
              {camaras.length === 0 ? (
                <option value="">Sin cámaras detectadas</option>
              ) : (
                camaras.map((c, idx) => (
                  <option key={c.id} value={c.id}>
                    {c.label || `Cámara ${idx + 1}`}
                  </option>
                ))
              )}
            </select>
          </div>

          {/* Botones de acción rápida */}
          <div className="flex items-center space-x-1 flex-shrink-0">
            <button
              type="button"
              onClick={handleReintentar}
              className="p-1.5 text-slate-600 hover:text-indigo-600 hover:bg-slate-200 rounded-lg transition-colors"
              title="Reintentar / Reiniciar cámara"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={handleEscanearArchivo}
              className="px-2 py-1 text-[11px] font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 rounded-lg transition-colors flex items-center space-x-1"
              title="Subir foto o captura con código QR"
            >
              <Upload className="w-3 h-3 text-slate-600" />
              <span>Foto QR</span>
            </button>
          </div>
        </div>

        {/* Contenido / Visor */}
        <div className="p-4 flex flex-col items-center">
          {/* Contenedor oficial para html5-qrcode (nunca hidden para no bloquear el video de Chromium) */}
          <div className="relative w-full rounded-xl overflow-hidden bg-slate-950 border border-slate-700 min-h-[280px] flex items-center justify-center">
            <div
              id={containerId}
              className="w-full min-h-[280px]"
            />

            {/* Overlay de Carga o Búsqueda */}
            {(estadoVisor === 'buscando' || estadoVisor === 'iniciando') && (
              <div className="absolute inset-0 z-10 bg-slate-950/85 backdrop-blur-xs flex flex-col items-center justify-center p-6 text-center space-y-3">
                <RefreshCw className="w-8 h-8 text-emerald-400 animate-spin" />
                <p className="text-xs font-semibold text-slate-200">{mensajeEstado}</p>
                <p className="text-[11px] text-slate-400">Inicializando sensor de video...</p>
              </div>
            )}

            {/* Overlay de Error o Diagnóstico */}
            {estadoVisor === 'error' && (
              <div className="absolute inset-0 z-10 bg-slate-950/95 flex flex-col items-center justify-center p-5 text-center space-y-3">
                <AlertCircle className="w-9 h-9 text-rose-500 flex-shrink-0" />
                <div>
                  <p className="text-xs font-bold text-rose-400 leading-tight mb-1">
                    {mensajeEstado}
                  </p>
                  {detalleTecnicoError && (
                    <p className="text-[10px] text-slate-400 font-mono bg-slate-900 px-2 py-1 rounded max-w-[280px] truncate mx-auto border border-slate-800">
                      {detalleTecnicoError}
                    </p>
                  )}
                </div>

                <div className="flex items-center space-x-2 pt-1">
                  <button
                    type="button"
                    onClick={handleReintentar}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg shadow transition-colors flex items-center space-x-1.5"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Reintentar cámara</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleEscanearArchivo}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-lg border border-slate-700 transition-colors flex items-center space-x-1.5"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Subir imagen</span>
                  </button>
                </div>
              </div>
            )}

            {/* Indicador de cámara activa */}
            {estadoVisor === 'activo' && (
              <div className="absolute top-2.5 right-2.5 z-20 pointer-events-none">
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 backdrop-blur-xs">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping mr-1.5" />
                  En vivo
                </span>
              </div>
            )}
          </div>

          {permisoDenegado && (
            <div className="p-3 mt-3 w-full bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-xs flex items-start space-x-2">
              <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-semibold">Acceso a la cámara bloqueado</p>
                <p>Verifica los permisos en la barra de direcciones de tu navegador y pulsa "Reintentar cámara".</p>
              </div>
            </div>
          )}

          {errorMsg && !permisoDenegado && (
            <div className="w-full mt-3 p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center space-x-2 animate-shake">
              <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="w-full mt-3 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-600" />
              <span className="font-medium">{successMsg}</span>
            </div>
          )}

          <p className="text-[11px] text-slate-500 text-center mt-3">
            El sistema detecta automáticamente la etiqueta interna (ej. <b>LAP-001</b>) o el código patrimonial.
          </p>
        </div>

        {/* Pie */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
          <span className="text-[11px] text-slate-400 font-mono">
            {camaras.length > 0 ? `${camaras.length} cámara(s)` : 'Modo visual'}
          </span>
          <button
            type="button"
            onClick={() => {
              detenerEscaner();
              onClose();
            }}
            className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 transition-colors"
          >
            Cerrar Escáner
          </button>
        </div>
      </div>
    </div>
  );
};
