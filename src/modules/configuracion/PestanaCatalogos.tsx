import React, { useEffect, useState } from 'react';
import {
  FolderTree,
  Plus,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Tag,
  Edit2,
  Power,
} from 'lucide-react';
import { ambienteRepository, categoriaRepository } from '@/repositories';
import { Ambiente, CategoriaEquipo } from '@/types';

export const PestanaCatalogos: React.FC = () => {
  const [ambientes, setAmbientes] = useState<Ambiente[]>([]);
  const [categorias, setCategorias] = useState<CategoriaEquipo[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ tipo: 'ok' | 'err'; msg: string } | null>(null);

  // Estados para modal de Ambiente
  const [showAmbienteModal, setShowAmbienteModal] = useState(false);
  const [editAmbienteId, setEditAmbienteId] = useState<string | null>(null);
  const [ambNombre, setAmbNombre] = useState('');
  const [ambEncargado, setAmbEncargado] = useState('');
  const [ambDescripcion, setAmbDescripcion] = useState('');

  // Estados para modal de Categoría
  const [showCatModal, setShowCatModal] = useState(false);
  const [editCatId, setEditCatId] = useState<string | null>(null);
  const [catNombre, setCatNombre] = useState('');
  const [catPrefijo, setCatPrefijo] = useState('');

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    setLoading(true);
    try {
      const [ambData, catData] = await Promise.all([
        ambienteRepository.listar(),
        categoriaRepository.listar(),
      ]);
      setAmbientes(ambData);
      setCategorias(catData);
    } catch (err: any) {
      console.error('Error al cargar catálogos:', err);
      setFeedback({ tipo: 'err', msg: 'Error al consultar catálogos.' });
    } finally {
      setLoading(false);
    }
  };

  // Acciones de Inicialización Rápida
  const handleInicializarAmbientes = async () => {
    if (!window.confirm('¿Desea inicializar los 7 ambientes base de la institución?')) return;
    setActionLoading(true);
    setFeedback(null);
    try {
      await ambienteRepository.inicializarAmbientesBase();
      setFeedback({ tipo: 'ok', msg: 'Los 7 ambientes base han sido inicializados exitosamente.' });
      await cargarDatos();
    } catch (err: any) {
      setFeedback({ tipo: 'err', msg: err.message || 'Error al inicializar ambientes.' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleInicializarCategorias = async () => {
    if (!window.confirm('¿Desea inicializar las 4 categorías base de equipos?')) return;
    setActionLoading(true);
    setFeedback(null);
    try {
      await categoriaRepository.inicializarCategoriasBase();
      setFeedback({ tipo: 'ok', msg: 'Las 4 categorías base han sido inicializadas exitosamente.' });
      await cargarDatos();
    } catch (err: any) {
      setFeedback({ tipo: 'err', msg: err.message || 'Error al inicializar categorías.' });
    } finally {
      setActionLoading(false);
    }
  };

  // Toggle de Estado
  const handleToggleAmbiente = async (amb: Ambiente) => {
    setActionLoading(true);
    try {
      await ambienteRepository.cambiarEstado(amb.id, !amb.activo);
      await cargarDatos();
    } catch (err: any) {
      setFeedback({ tipo: 'err', msg: err.message });
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleCategoria = async (cat: CategoriaEquipo) => {
    setActionLoading(true);
    try {
      await categoriaRepository.cambiarEstado(cat.id, !cat.activo);
      await cargarDatos();
    } catch (err: any) {
      setFeedback({ tipo: 'err', msg: err.message });
    } finally {
      setActionLoading(false);
    }
  };

  // Guardar Ambiente
  const handleGuardarAmbiente = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ambNombre.trim()) return;

    setActionLoading(true);
    try {
      if (editAmbienteId) {
        await ambienteRepository.actualizar(editAmbienteId, {
          nombre: ambNombre.trim(),
          encargado: ambEncargado.trim(),
          descripcion: ambDescripcion.trim(),
        });
        setFeedback({ tipo: 'ok', msg: 'Ambiente actualizado correctamente.' });
      } else {
        await ambienteRepository.crear({
          nombre: ambNombre.trim(),
          encargado: ambEncargado.trim(),
          descripcion: ambDescripcion.trim(),
          activo: true,
        });
        setFeedback({ tipo: 'ok', msg: 'Nuevo ambiente creado con éxito.' });
      }
      setShowAmbienteModal(false);
      setAmbNombre('');
      setAmbEncargado('');
      setAmbDescripcion('');
      setEditAmbienteId(null);
      await cargarDatos();
    } catch (err: any) {
      setFeedback({ tipo: 'err', msg: err.message });
    } finally {
      setActionLoading(false);
    }
  };

  // Guardar Categoría
  const handleGuardarCategoria = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!catNombre.trim()) return;

    setActionLoading(true);
    try {
      if (editCatId) {
        await categoriaRepository.actualizar(editCatId, {
          nombre: catNombre.trim(),
          prefijo_etiqueta: catPrefijo.trim().toUpperCase(),
        });
        setFeedback({ tipo: 'ok', msg: 'Categoría actualizada correctamente.' });
      } else {
        await categoriaRepository.crear({
          nombre: catNombre.trim(),
          prefijo_etiqueta: catPrefijo.trim().toUpperCase() || 'EQ',
          activo: true,
        });
        setFeedback({ tipo: 'ok', msg: 'Nueva categoría creada con éxito.' });
      }
      setShowCatModal(false);
      setCatNombre('');
      setCatPrefijo('');
      setEditCatId(null);
      await cargarDatos();
    } catch (err: any) {
      setFeedback({ tipo: 'err', msg: err.message });
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 text-center text-slate-500 text-xs">
        Cargando catálogos del sistema...
      </div>
    );
  }

  return (
    <div className="space-y-8">
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

      {/* SECCIÓN 1: AMBIENTES */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-3">
          <div>
            <h3 className="text-sm font-bold text-slate-800 flex items-center space-x-2">
              <FolderTree className="w-4 h-4 text-emerald-600" />
              <span>Catálogo de Ambientes y Espacios Escolares</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Utilizados para control de traslados de inventario y Actas de Entrega.
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={handleInicializarAmbientes}
              disabled={actionLoading}
              className="inline-flex items-center space-x-1 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg border border-slate-300 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
              <span>Inicializar 7 Ambientes Base</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setEditAmbienteId(null);
                setAmbNombre('');
                setAmbEncargado('');
                setAmbDescripcion('');
                setShowAmbienteModal(true);
              }}
              className="inline-flex items-center space-x-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Nuevo Ambiente</span>
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase">
                <th className="py-2.5 px-3">Ambiente</th>
                <th className="py-2.5 px-3">Responsable / Encargado</th>
                <th className="py-2.5 px-3">Descripción</th>
                <th className="py-2.5 px-3">Estado</th>
                <th className="py-2.5 px-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {ambientes.map((amb) => (
                <tr key={amb.id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="py-2.5 px-3 font-semibold text-slate-800">{amb.nombre}</td>
                  <td className="py-2.5 px-3 text-slate-600">{amb.encargado || '—'}</td>
                  <td className="py-2.5 px-3 text-slate-500">{amb.descripcion || '—'}</td>
                  <td className="py-2.5 px-3">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold ${
                        amb.activo
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-slate-100 text-slate-500 border border-slate-200'
                      }`}
                    >
                      {amb.activo ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-right space-x-2">
                    <button
                      type="button"
                      onClick={() => {
                        setEditAmbienteId(amb.id);
                        setAmbNombre(amb.nombre);
                        setAmbEncargado(amb.encargado);
                        setAmbDescripcion(amb.descripcion);
                        setShowAmbienteModal(true);
                      }}
                      className="p-1 text-slate-500 hover:text-emerald-700 transition-colors"
                      title="Editar ambiente"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleToggleAmbiente(amb)}
                      className={`p-1 transition-colors ${
                        amb.activo ? 'text-slate-400 hover:text-rose-600' : 'text-slate-400 hover:text-emerald-600'
                      }`}
                      title={amb.activo ? 'Desactivar ambiente' : 'Activar ambiente'}
                    >
                      <Power className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* SECCIÓN 2: CATEGORÍAS */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-3">
          <div>
            <h3 className="text-sm font-bold text-slate-800 flex items-center space-x-2">
              <Tag className="w-4 h-4 text-emerald-600" />
              <span>Catálogo de Categorías de Equipos</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Clasificación patrimonial (PCs, Laptops, Proyectores, etc.) y prefijos para rotulado QR.
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={handleInicializarCategorias}
              disabled={actionLoading}
              className="inline-flex items-center space-x-1 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg border border-slate-300 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
              <span>Inicializar 4 Categorías Base</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setEditCatId(null);
                setCatNombre('');
                setCatPrefijo('');
                setShowCatModal(true);
              }}
              className="inline-flex items-center space-x-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Nueva Categoría</span>
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase">
                <th className="py-2.5 px-3">Nombre de Categoría</th>
                <th className="py-2.5 px-3">Prefijo de Etiqueta QR</th>
                <th className="py-2.5 px-3">Estado</th>
                <th className="py-2.5 px-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {categorias.map((cat) => (
                <tr key={cat.id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="py-2.5 px-3 font-semibold text-slate-800">{cat.nombre}</td>
                  <td className="py-2.5 px-3">
                    <span className="font-mono bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200 text-[11px]">
                      {cat.prefijo_etiqueta}
                    </span>
                  </td>
                  <td className="py-2.5 px-3">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold ${
                        cat.activo
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-slate-100 text-slate-500 border border-slate-200'
                      }`}
                    >
                      {cat.activo ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-right space-x-2">
                    <button
                      type="button"
                      onClick={() => {
                        setEditCatId(cat.id);
                        setCatNombre(cat.nombre);
                        setCatPrefijo(cat.prefijo_etiqueta);
                        setShowCatModal(true);
                      }}
                      className="p-1 text-slate-500 hover:text-emerald-700 transition-colors"
                      title="Editar categoría"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleToggleCategoria(cat)}
                      className={`p-1 transition-colors ${
                        cat.activo ? 'text-slate-400 hover:text-rose-600' : 'text-slate-400 hover:text-emerald-600'
                      }`}
                      title={cat.activo ? 'Desactivar categoría' : 'Activar categoría'}
                    >
                      <Power className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL AMBIENTE */}
      {showAmbienteModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6 border border-slate-200">
            <h3 className="text-base font-bold text-slate-800">
              {editAmbienteId ? 'Editar Ambiente' : 'Nuevo Ambiente Escolar'}
            </h3>
            <form onSubmit={handleGuardarAmbiente} className="mt-4 space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Nombre del Ambiente *</label>
                <input
                  type="text"
                  required
                  value={ambNombre}
                  onChange={(e) => setAmbNombre(e.target.value)}
                  placeholder="Ej. AIP 1, Secretaría, Psicología"
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Responsable / Encargado</label>
                <input
                  type="text"
                  value={ambEncargado}
                  onChange={(e) => setAmbEncargado(e.target.value)}
                  placeholder="Ej. Docente de Turno / Coordinador"
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Descripción Breve</label>
                <input
                  type="text"
                  value={ambDescripcion}
                  onChange={(e) => setAmbDescripcion(e.target.value)}
                  placeholder="Ej. Pabellón B - Segundo Piso"
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAmbienteModal(false)}
                  className="px-3 py-1.5 text-slate-600 font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg shadow-xs disabled:opacity-50"
                >
                  {actionLoading ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL CATEGORÍA */}
      {showCatModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6 border border-slate-200">
            <h3 className="text-base font-bold text-slate-800">
              {editCatId ? 'Editar Categoría' : 'Nueva Categoría de Equipo'}
            </h3>
            <form onSubmit={handleGuardarCategoria} className="mt-4 space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Nombre de Categoría *</label>
                <input
                  type="text"
                  required
                  value={catNombre}
                  onChange={(e) => setCatNombre(e.target.value)}
                  placeholder="Ej. PCs de Mesa, Laptops, Proyectores"
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Prefijo de Etiqueta QR *</label>
                <input
                  type="text"
                  required
                  maxLength={6}
                  value={catPrefijo}
                  onChange={(e) => setCatPrefijo(e.target.value.toUpperCase())}
                  placeholder="Ej. PC, LAP, PROY"
                  className="w-full px-3 py-2 text-sm font-mono bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCatModal(false)}
                  className="px-3 py-1.5 text-slate-600 font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg shadow-xs disabled:opacity-50"
                >
                  {actionLoading ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
