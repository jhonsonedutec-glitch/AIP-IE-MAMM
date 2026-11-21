import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Camera, X, AlertCircle, CheckCircle2, RefreshCw } from 'lucide-react';
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
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [cargandoCamara, setCargandoCamara] = useState(true);
  const [permisoDenegado, setPermisoDenegado] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const containerId = 'html5qr-code-reader-modal';
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
      osc.frequency.setValueAtTime(880, ctx.currentTime); // La5
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

  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    setErrorMsg(null);
    setSuccessMsg(null);
    setCargandoCamara(true);
    setPermisoDenegado(false);

    // Timeout pequeño para asegurar que el div contenedor exista en el DOM
    const timer = setTimeout(async () => {
      try {
        const scanner = new Html5Qrcode(containerId);
        scannerRef.current = scanner;

        const config = {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0,
        };

        await scanner.start(
          { facingMode: 'environment' },
          config,
          (decodedText) => {
            if (!isMounted) return;
            handleCodigoEscaneado(decodedText);
          },
          () => {
            // Ignorar errores por frame sin QR
          }
        );

        if (isMounted) {
          setCargandoCamara(false);
        }
      } catch (err: any) {
        if (!isMounted) return;
        console.error('Error al iniciar cámara QR:', err);
        setCargandoCamara(false);
        if (err?.name === 'NotAllowedError' || err?.message?.includes('Permission')) {
          setPermisoDenegado(true);
          setErrorMsg('Permiso de cámara denegado. Permite el acceso a la cámara en tu navegador.');
        } else {
          setErrorMsg('No se pudo acceder a la cámara o no hay dispositivos disponibles.');
        }
      }
    }, 250);

    return () => {
      isMounted = false;
      clearTimeout(timer);
      detenerEscaner();
    };
  }, [isOpen]);

  const detenerEscaner = async () => {
    if (scannerRef.current) {
      try {
        if (scannerRef.current.isScanning) {
          await scannerRef.current.stop();
        }
        scannerRef.current.clear();
      } catch (e) {
        console.warn('Error al detener cámara QR:', e);
      } finally {
        scannerRef.current = null;
      }
    }
  };

  const handleCodigoEscaneado = (textoQR: string) => {
    const codigoLimpio = textoQR.trim().toUpperCase();
    if (!codigoLimpio) return;

    // Buscar en la lista de todos los bienes
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

    // Pequeño timeout para no reescanear inmediatamente el mismo equipo
    setTimeout(() => {
      setSuccessMsg(null);
    }, 2500);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
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

        {/* Contenido / Visor */}
        <div className="p-4 flex flex-col items-center">
          {cargandoCamara && (
            <div className="py-12 flex flex-col items-center justify-center space-y-3 text-slate-500">
              <RefreshCw className="w-8 h-8 animate-spin text-emerald-600" />
              <p className="text-sm">Iniciando cámara...</p>
            </div>
          )}

          {/* Contenedor oficial para html5-qrcode */}
          <div
            id={containerId}
            className={`w-full overflow-hidden rounded-xl border border-slate-200 bg-slate-950 ${
              cargandoCamara ? 'hidden' : 'block'
            }`}
            style={{ minHeight: '280px' }}
          />

          {permisoDenegado && (
            <div className="p-4 mt-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-xs flex items-start space-x-2">
              <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-semibold">Acceso a la cámara bloqueado</p>
                <p>Verifica los permisos en la barra de direcciones de tu navegador y vuelve a intentarlo.</p>
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
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
          <button
            type="button"
            onClick={() => {
              detenerEscaner();
              onClose();
            }}
            className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
          >
            Cerrar Escáner
          </button>
        </div>
      </div>
    </div>
  );
};