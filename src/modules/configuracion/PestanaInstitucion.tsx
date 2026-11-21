import React, { useEffect, useState } from 'react';
import { Building2, Save, RotateCcw, CheckCircle2, AlertCircle } from 'lucide-react';
import { configuracionRepository } from '@/repositories';
import { InstitucionConfig } from '@/types';

export const PestanaInstitucion: React.FC = () => {
  const [config, setConfig] = useState<InstitucionConfig>({
    nombre_ie: '',
    ugel: '',
    dre: '',
    nivel: '',
    lugar: '',
    distrito: '',
    anexo_default: '01',
    tipo_inventario: 'MAQUINAS Y EQUIPOS',
    responsable_nombre: '',
    responsable_dni: '',
    responsable_celular: '',
    responsable_correo: '',
    logo_url: '',
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ tipo: 'ok' | 'err'; msg: string } | null>(null);

  useEffect(() => {
    cargarConfiguracion();
  }, []);

  const cargarConfiguracion = async () => {
    setLoading(true);
    try {
      const data = await configuracionRepository.obtenerInstitucion();
      if (data) {
        setConfig(data);
      }
    } catch (err: any) {
      console.error('Error al cargar institución:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setConfig((prev) => ({ ...prev, [name]: value }));
    setFeedback(null);
  };

  const handleGuardar = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setFeedback(null);
    try {
      await configuracionRepository.guardarInstitucion(config);
      setFeedback({ tipo: 'ok', msg: 'Configuración institucional guardada exitosamente.' });
    } catch (err: any) {
      setFeedback({ tipo: 'err', msg: err.message || 'Error al guardar los datos institucionales.' });
    } finally {
      setSaving(false);
    }
  };

  const handleCargarPredeterminados = async () => {
    if (!window.confirm('¿Desea cargar los valores oficiales de la I.E. Emblemática Manuel Antonio Mesones Muro?')) {
      return;
    }
    setSaving(true);
    setFeedback(null);
    try {
      const def = await configuracionRepository.cargarValoresPredeterminados();
      setConfig(def);
      setFeedback({ tipo: 'ok', msg: 'Valores oficiales predeterminados del colegio cargados con éxito.' });
    } catch (err: any) {
      setFeedback({ tipo: 'err', msg: err.message || 'Error al cargar valores predeterminados.' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 text-center text-slate-500 text-xs">
        <span className="w-5 h-5 inline-block border-2 border-emerald-600/30 border-t-emerald-600 rounded-full animate-spin mr-2" />
        Cargando datos institucionales...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Encabezado descriptivo */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-200 gap-3">
        <div>
          <h2 className="text-base font-bold text-slate-800 flex items-center space-x-2">
            <Building2 className="w-4 h-4 text-emerald-600" />
            <span>Cabecera Oficial y Datos Institucionales (Anexo 01)</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Estos datos se imprimirán en los encabezados de los reportes oficiales en Excel y PDF.
          </p>
        </div>
        <button
          type="button"
          onClick={handleCargarPredeterminados}
          disabled={saving}
          className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg border border-slate-300 transition-colors"
        >
          <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
          <span>Cargar valores predeterminados del colegio</span>
        </button>
      </div>

      {feedback && (
        <div
          className={`p-3.5 rounded-xl border text-xs flex items-center space-x-2.5 ${
            feedback.tipo === 'ok'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          {feedback.tipo === 'ok' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          )}
          <span className="font-medium">{feedback.msg}</span>
        </div>
      )}

      {/* Formulario */}
      <form onSubmit={handleGuardar} className="space-y-6">
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
            1. Datos de la Institución Educativa
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Nombre de la I.E. *
              </label>
              <input
                type="text"
                name="nombre_ie"
                required
                value={config.nombre_ie}
                onChange={handleChange}
                placeholder="Ej. I.E. Emblemática Manuel Antonio Mesones Muro"
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Nivel Educativo *</label>
              <input
                type="text"
                name="nivel"
                required
                value={config.nivel}
                onChange={handleChange}
                placeholder="Ej. Secundaria"
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">UGEL *</label>
              <input
                type="text"
                name="ugel"
                required
                value={config.ugel}
                onChange={handleChange}
                placeholder="Ej. UGEL Bagua"
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">DRE / Región *</label>
              <input
                type="text"
                name="dre"
                required
                value={config.dre}
                onChange={handleChange}
                placeholder="Ej. DRE Amazonas"
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Lugar / Ciudad *</label>
              <input
                type="text"
                name="lugar"
                required
                value={config.lugar}
                onChange={handleChange}
                placeholder="Ej. Bagua"
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Distrito *</label>
              <input
                type="text"
                name="distrito"
                required
                value={config.distrito}
                onChange={handleChange}
                placeholder="Ej. Bagua"
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Anexo por Defecto</label>
              <input
                type="text"
                name="anexo_default"
                required
                value={config.anexo_default}
                onChange={handleChange}
                placeholder="01"
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Tipo de Inventario</label>
              <input
                type="text"
                name="tipo_inventario"
                required
                value={config.tipo_inventario}
                onChange={handleChange}
                placeholder="MAQUINAS Y EQUIPOS"
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
            2. Datos del Responsable del Inventario TIC
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Nombres y Apellidos del Responsable *
              </label>
              <input
                type="text"
                name="responsable_nombre"
                required
                value={config.responsable_nombre}
                onChange={handleChange}
                placeholder="Ej. Juan Pérez García (DAIP)"
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">DNI del Responsable</label>
              <input
                type="text"
                name="responsable_dni"
                maxLength={8}
                value={config.responsable_dni}
                onChange={handleChange}
                placeholder="8 dígitos"
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Celular de Contacto</label>
              <input
                type="text"
                name="responsable_celular"
                value={config.responsable_celular}
                onChange={handleChange}
                placeholder="Ej. 941234567"
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">Correo Electrónico</label>
              <input
                type="email"
                name="responsable_correo"
                value={config.responsable_correo}
                onChange={handleChange}
                placeholder="responsable@colegio.edu.pe"
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center space-x-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm rounded-lg shadow-md transition-all disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Guardando datos...' : 'Guardar Configuración'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
