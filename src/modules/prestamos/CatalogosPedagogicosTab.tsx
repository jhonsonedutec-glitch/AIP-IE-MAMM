import React, { useState, useMemo } from 'react';
import {
  Users,
  BookOpen,
  Layers,
  Plus,
  Edit2,
  Trash2,
  CheckCircle,
  Sparkles,
  AlertCircle,
  Search,
  X,
  Laptop,
  Building2,
} from 'lucide-react';
import {
  Docente,
  AreaCurricular,
  BloqueEquipos,
  BienPatrimonial,
  Ambiente,
  esAmbientePrestable,
} from '@/types';
import {
  docenteRepository,
  areaCurricularRepository,
  bloqueRepository,
} from '@/repositories';
import { useAuth } from '@/context/AuthContext';

interface CatalogosPedagogicosTabProps {
  docentes: Docente[];
  areas: AreaCurricular[];
  bloques: BloqueEquipos[];
  bienes: BienPatrimonial[];
  ambientes: Ambiente[];
  onRecargar: () => Promise<void>;
  esAdmin: boolean;
}

export const CatalogosPedagogicosTab: React.FC<CatalogosPedagogicosTabProps> = ({
  docentes,
  areas,
  bloques,
  bienes,
  ambientes,
  onRecargar,
  esAdmin,
}) => {
  const { perfil } = useAuth();
  const [subTab, setSubTab] = useState<'DOCENTES' | 'AREAS' | 'BLOQUES'>('DOCENTES');

  // Modales
  const [modalDocenteOpen, setModalDocenteOpen] = useState(false);
  const [docenteEditando, setDocenteEditando] = useState<Docente | null>(null);
  const [formDocente, setFormDocente] = useState({
    dni: '',
    nombres: '',
    apellidos: '',
    especialidad: '',
    telefono: '',
    email: '',
  });

  const [modalAreaOpen, setModalAreaOpen] = useState(false);
  const [areaEditando, setAreaEditando] = useState<AreaCurricular | null>(null);
  const [formAreaNombre, setFormAreaNombre] = useState('');

  const [modalBloqueOpen, setModalBloqueOpen] = useState(false);
  const [bloqueEditando, setBloqueEditando] = useState<BloqueEquipos | null>(null);
  const [formBloque, setFormBloque] = useState<{
    nombre: string;
    descripcion: string;
    bienes_ids: string[];
  }>({
    nombre: '',
    descripcion: '',
    bienes_ids: [],
  });

  const [guardando, setGuardando] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [busquedaBienBloque, setBusquedaBienBloque] = useState('');
  const [filtroAmbienteBloque, setFiltroAmbienteBloque] = useState<string>('TODOS');

  const operadorInfo = perfil
    ? { uid: perfil.uid, email: perfil.email, rol: perfil.rol, nombre: perfil.nombres }
    : undefined;

  // --- DOCENTES ---
  const handleAbrirDocente = (d?: Docente) => {
    if (d) {
      setDocenteEditando(d);
      setFormDocente({
        dni: d.dni || '',
        nombres:
          d.nombres ||
          (d.nombres_apellidos?.includes(',') ? d.nombres_apellidos.split(',')[1]?.trim() : '') ||
          '',
        apellidos:
          d.apellidos ||
          (d.nombres_apellidos?.includes(',') ? d.nombres_apellidos.split(',')[0]?.trim() : d.nombres_apellidos) ||
          '',
        especialidad: d.especialidad || '',
        telefono: d.telefono || d.celular || '',
        email: d.email || '',
      });
    } else {
      setDocenteEditando(null);
      setFormDocente({
        dni: '',
        nombres: '',
        apellidos: '',
        especialidad: '',
        telefono: '',
        email: '',
      });
    }
    setErrorMsg(null);
    setModalDocenteOpen(true);
  };

  const handleGuardarDocente = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const dniLimpio = formDocente.dni.trim();
    if (dniLimpio && !/^\d{8}$/.test(dniLimpio)) {
      setErrorMsg('El DNI debe contener exactamente 8 dígitos numéricos.');
      return;
    }
    if (!formDocente.nombres.trim() || !formDocente.apellidos.trim()) {
      setErrorMsg('Nombres y Apellidos son obligatorios.');
      return;
    }

    try {
      setGuardando(true);
      const nombresApellidos = `${formDocente.apellidos.trim()}, ${formDocente.nombres.trim()}`.toUpperCase();
      if (docenteEditando) {
        await docenteRepository.actualizar(
          docenteEditando.id,
          {
            dni: dniLimpio,
            nombres_apellidos: nombresApellidos,
            nombres: formDocente.nombres.trim(),
            apellidos: formDocente.apellidos.trim(),
            especialidad: formDocente.especialidad.trim(),
            celular: formDocente.telefono.trim(),
            telefono: formDocente.telefono.trim(),
            email: formDocente.email.trim(),
          },
          operadorInfo
        );
      } else {
        await docenteRepository.crear(
          {
            dni: dniLimpio,
            nombres_apellidos: nombresApellidos,
            nombres: formDocente.nombres.trim(),
            apellidos: formDocente.apellidos.trim(),
            especialidad: formDocente.especialidad.trim(),
            celular: formDocente.telefono.trim(),
            telefono: formDocente.telefono.trim(),
            email: formDocente.email.trim(),
            area_principal_id: '',
            activo: true,
          },
          operadorInfo
        );
      }
      await onRecargar();
      setModalDocenteOpen(false);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al guardar docente.');
    } finally {
      setGuardando(false);
    }
  };

  const handleToggleActivoDocente = async (d: Docente) => {
    try {
      await docenteRepository.actualizar(d.id, { activo: !d.activo }, operadorInfo);
      await onRecargar();
    } catch (err: any) {
      alert(err.message || 'Error al cambiar estado.');
    }
  };

  // --- ÁREAS CURRICULARES ---
  const handleAbrirArea = (a?: AreaCurricular) => {
    if (a) {
      setAreaEditando(a);
      setFormAreaNombre(a.nombre);
    } else {
      setAreaEditando(null);
      setFormAreaNombre('');
    }
    setErrorMsg(null);
    setModalAreaOpen(true);
  };

  const handleGuardarArea = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formAreaNombre.trim()) {
      setErrorMsg('El nombre del área curricular es obligatorio.');
      return;
    }

    try {
      setGuardando(true);
      if (areaEditando) {
        await areaCurricularRepository.actualizar(
          areaEditando.id,
          { nombre: formAreaNombre.trim() },
          operadorInfo
        );
      } else {
        await areaCurricularRepository.crear(
          { nombre: formAreaNombre.trim(), activo: true },
          operadorInfo
        );
      }
      await onRecargar();
      setModalAreaOpen(false);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al guardar área curricular.');
    } finally {
      setGuardando(false);
    }
  };

  const handleInicializarAreasEBR = async () => {
    if (!window.confirm('¿Deseas inicializar las 11 áreas oficiales de Secundaria EBR Perú?')) {
      return;
    }
    try {
      setGuardando(true);
      const creadas = await areaCurricularRepository.inicializarAreasBase(operadorInfo);
      alert(
        creadas > 0
          ? `¡Se registraron ${creadas} nuevas áreas curriculares EBR exitosamente!`
          : 'Todas las áreas curriculares EBR ya se encuentran registradas.'
      );
      await onRecargar();
    } catch (err: any) {
      alert(err.message || 'Error al inicializar áreas.');
    } finally {
      setGuardando(false);
    }
  };

  const handleToggleActivoArea = async (a: AreaCurricular) => {
    try {
      await areaCurricularRepository.actualizar(a.id, { activo: !a.activo }, operadorInfo);
      await onRecargar();
    } catch (err: any) {
      alert(err.message || 'Error al cambiar estado.');
    }
  };

  // --- BLOQUES DE EQUIPOS ---
  const handleAbrirBloque = (b?: BloqueEquipos) => {
    if (b) {
      setBloqueEditando(b);
      setFormBloque({
        nombre: b.nombre,
        descripcion: b.descripcion || '',
        bienes_ids: b.bienes_ids || [],
      });
    } else {
      setBloqueEditando(null);
      setFormBloque({
        nombre: '',
        descripcion: '',
        bienes_ids: [],
      });
    }
    setBusquedaBienBloque('');
    setFiltroAmbienteBloque('TODOS');
    setErrorMsg(null);
    setModalBloqueOpen(true);
  };

  const toggleBienEnBloque = (bienId: string) => {
    setFormBloque((prev) => {
      const existe = prev.bienes_ids.includes(bienId);
      return {
        ...prev,
        bienes_ids: existe
          ? prev.bienes_ids.filter((id) => id !== bienId)
          : [...prev.bienes_ids, bienId],
      };
    });
  };

  const handleGuardarBloque = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formBloque.nombre.trim()) {
      setErrorMsg('El nombre del bloque es obligatorio.');
      return;
    }
    if (formBloque.bienes_ids.length === 0) {
      setErrorMsg('Debes incluir al menos un equipo en el bloque.');
      return;
    }

    try {
      setGuardando(true);
      if (bloqueEditando) {
        await bloqueRepository.actualizar(
          bloqueEditando.id,
          {
            nombre: formBloque.nombre.trim(),
            descripcion: formBloque.descripcion.trim(),
            bienes_ids: formBloque.bienes_ids,
          },
          operadorInfo
        );
      } else {
        await bloqueRepository.crear(
          {
            nombre: formBloque.nombre.trim(),
            descripcion: formBloque.descripcion.trim(),
            bienes_ids: formBloque.bienes_ids,
            activo: true,
          },
          operadorInfo
        );
      }
      await onRecargar();
      setModalBloqueOpen(false);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al guardar bloque de equipos.');
    } finally {
      setGuardando(false);
    }
  };

  const handleToggleActivoBloque = async (b: BloqueEquipos) => {
    try {
      await bloqueRepository.actualizar(b.id, { activo: !b.activo }, operadorInfo);
      await onRecargar();
    } catch (err: any) {
      alert(err.message || 'Error al cambiar estado.');
    }
  };

  // Quitar un equipo individual del bloque (para bienes trasladados fuera del AIP)
  const handleQuitarEquipoDeBloque = async (bloque: BloqueEquipos, bienId: string) => {
    const bien = bienes.find((x) => x.id === bienId);
    const etiqueta = bien?.etiqueta_interna || 'el equipo seleccionado';
    if (!window.confirm(`¿Deseas desvincular ${etiqueta} del bloque "${bloque.nombre}"?`)) {
      return;
    }

    try {
      setGuardando(true);
      const nuevosIds = bloque.bienes_ids.filter((id) => id !== bienId);
      await bloqueRepository.actualizar(
        bloque.id,
        { bienes_ids: nuevosIds },
        operadorInfo
      );
      await onRecargar();
    } catch (err: any) {
      alert(err.message || 'Error al desvincular equipo del bloque.');
    } finally {
      setGuardando(false);
    }
  };

  // Resumen global de equipos en tiempo real para la pestaña de bloques
  const metricasBloques = useMemo(() => {
    const bienesActivos = bienes.filter(
      (b) => b.activo !== false && b.estado_operativo !== 'DE_BAJA'
    );

    // Bienes activos en ambiente AIP
    const enAIP = bienesActivos.filter((b) => {
      const amb = ambientes.find((a) => a.id === b.ambiente_id);
      return esAmbientePrestable(amb);
    });

    // Ids de bienes asignados a cualquier bloque activo
    const idsEnBloquesActivos = new Set(
      bloques.filter((bl) => bl.activo !== false).flatMap((bl) => bl.bienes_ids || [])
    );

    // Asignados a bloques que están actualmente en AIP
    const asignadosABloques = enAIP.filter((b) => idsEnBloquesActivos.has(b.id));

    // Bienes activos distribuidos en otras oficinas (TOE, Dirección, Psicología, etc.)
    const distribuidosFuera = bienesActivos.filter((b) => {
      const amb = ambientes.find((a) => a.id === b.ambiente_id);
      return !esAmbientePrestable(amb);
    });

    return {
      totalEnAIP: enAIP.length,
      asignadosABloques: asignadosABloques.length,
      distribuidosFuera: distribuidosFuera.length,
    };
  }, [bienes, ambientes, bloques]);

  // Ambientes AIP habilitados para filtro
  const ambientesAIP = useMemo(() => {
    return ambientes.filter((a) => esAmbientePrestable(a) && a.activo !== false);
  }, [ambientes]);

  // Bienes en el bloque actual que salieron del AIP por traslados
  const bienesEnBloqueFueraAIP = useMemo(() => {
    return formBloque.bienes_ids
      .map((id) => bienes.find((b) => b.id === id))
      .filter((bien): bien is BienPatrimonial => {
        if (!bien) return false;
        const amb = ambientes.find((a) => a.id === bien.ambiente_id);
        return !esAmbientePrestable(amb);
      });
  }, [formBloque.bienes_ids, bienes, ambientes]);

  // Bienes filtrados para selector del modal de bloques
  const bienesParaBloqueFiltrados = useMemo(() => {
    return bienes.filter((bien) => {
      // Solo bienes activos y no dados de baja
      if (bien.activo === false || bien.estado_operativo === 'DE_BAJA') return false;

      // El ambiente actual DEBE ser prestable (AIP)
      const amb = ambientes.find((a) => a.id === bien.ambiente_id);
      if (!esAmbientePrestable(amb)) return false;

      // Excluir equipos ya asignados a otro bloque activo diferente al que se edita
      const asignadoAOtroBloque = bloques.some((b) => {
        if (b.activo === false) return false;
        if (bloqueEditando && b.id === bloqueEditando.id) return false;
        return b.bienes_ids?.includes(bien.id);
      });
      if (asignadoAOtroBloque) return false;

      // Filtro por ambiente AIP específico si no es 'TODOS'
      if (filtroAmbienteBloque !== 'TODOS' && bien.ambiente_id !== filtroAmbienteBloque) {
        return false;
      }

      if (!busquedaBienBloque.trim()) return true;
      const q = busquedaBienBloque.toLowerCase();
      return (
        (bien.etiqueta_interna && bien.etiqueta_interna.toLowerCase().includes(q)) ||
        bien.denominacion.toLowerCase().includes(q) ||
        bien.marca.toLowerCase().includes(q) ||
        (bien.codigo_patrimonial && bien.codigo_patrimonial.toLowerCase().includes(q))
      );
    });
  }, [bienes, ambientes, bloques, bloqueEditando, filtroAmbienteBloque, busquedaBienBloque]);

  return (
    <div className="space-y-6">
      {/* Selector de subpestañas */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setSubTab('DOCENTES')}
          className={`py-3 px-5 text-xs font-semibold border-b-2 transition-all flex items-center space-x-2 ${
            subTab === 'DOCENTES'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Docentes ({docentes.length})</span>
        </button>

        <button
          onClick={() => setSubTab('AREAS')}
          className={`py-3 px-5 text-xs font-semibold border-b-2 transition-all flex items-center space-x-2 ${
            subTab === 'AREAS'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>Áreas Curriculares ({areas.length})</span>
        </button>

        <button
          onClick={() => setSubTab('BLOQUES')}
          className={`py-3 px-5 text-xs font-semibold border-b-2 transition-all flex items-center space-x-2 ${
            subTab === 'BLOQUES'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Bloques de Equipos ({bloques.length})</span>
        </button>
      </div>

      {/* ==================== SUB-PESTAÑA DOCENTES ==================== */}
      {subTab === 'DOCENTES' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-800">Directorio de Docentes del MAMM</h3>
              <p className="text-xs text-slate-500">
                Docentes autorizados para solicitar préstamos de recursos tecnológicos
              </p>
            </div>
            {esAdmin && (
              <button
                onClick={() => handleAbrirDocente()}
                className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-xl shadow transition-colors flex items-center space-x-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>Nuevo Docente</span>
              </button>
            )}
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
            <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
              <thead className="bg-slate-50 font-semibold text-slate-600 text-[11px] uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">DNI</th>
                  <th className="py-3 px-4">Apellidos y Nombres</th>
                  <th className="py-3 px-4">Especialidad / Área</th>
                  <th className="py-3 px-4">Teléfono / Celular</th>
                  <th className="py-3 px-4 text-center">Estado</th>
                  {esAdmin && <th className="py-3 px-4 text-right">Acciones</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {docentes.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400">
                      No hay docentes registrados en la base de datos.
                    </td>
                  </tr>
                ) : (
                  docentes.map((d) => (
                    <tr key={d.id} className="hover:bg-slate-50">
                      <td className="py-3 px-4 font-mono font-bold text-slate-800">
                        {d.dni || '—'}
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-900">
                        {d.nombres_apellidos || `${d.apellidos || ''}, ${d.nombres || ''}`}
                      </td>
                      <td className="py-3 px-4 text-slate-600">{d.especialidad || '—'}</td>
                      <td className="py-3 px-4 text-slate-600">{d.celular || d.telefono || '—'}</td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[11px] font-bold ${
                            d.activo
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-slate-100 text-slate-500 border border-slate-200'
                          }`}
                        >
                          {d.activo ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>
                      {esAdmin && (
                        <td className="py-3 px-4 text-right space-x-2">
                          <button
                            onClick={() => handleAbrirDocente(d)}
                            className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                            title="Editar docente"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleToggleActivoDocente(d)}
                            className={`p-1.5 rounded-lg transition-colors ${
                              d.activo
                                ? 'text-slate-400 hover:text-rose-600 hover:bg-rose-50'
                                : 'text-slate-400 hover:text-emerald-600 hover:bg-emerald-50'
                            }`}
                            title={d.activo ? 'Desactivar docente' : 'Activar docente'}
                          >
                            {d.activo ? (
                              <Trash2 className="w-3.5 h-3.5" />
                            ) : (
                              <CheckCircle className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ==================== SUB-PESTAÑA ÁREAS ==================== */}
      {subTab === 'AREAS' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-slate-800">
                Áreas Curriculares (EBR Secundaria)
              </h3>
              <p className="text-xs text-slate-500">
                Catálogo de áreas pedagógicas para asociar las sesiones de uso de laptops y recursos
              </p>
            </div>
            {esAdmin && (
              <div className="flex items-center space-x-2">
                <button
                  onClick={handleInicializarAreasEBR}
                  disabled={guardando}
                  className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-semibold text-xs rounded-xl shadow transition-colors flex items-center space-x-1.5"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Inicializar 11 Áreas EBR</span>
                </button>
                <button
                  onClick={() => handleAbrirArea()}
                  className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-xl shadow transition-colors flex items-center space-x-1.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>Nueva Área</span>
                </button>
              </div>
            )}
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
            <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
              <thead className="bg-slate-50 font-semibold text-slate-600 text-[11px] uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4 w-12 text-center">N°</th>
                  <th className="py-3 px-4">Nombre del Área Curricular</th>
                  <th className="py-3 px-4 text-center">Estado</th>
                  {esAdmin && <th className="py-3 px-4 text-right">Acciones</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {areas.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-slate-400">
                      No hay áreas registradas. Puedes crearlas o pulsar "Inicializar 11 Áreas EBR".
                    </td>
                  </tr>
                ) : (
                  areas.map((a, idx) => (
                    <tr key={a.id} className="hover:bg-slate-50">
                      <td className="py-3 px-4 text-center font-bold text-slate-400">{idx + 1}</td>
                      <td className="py-3 px-4 font-semibold text-slate-900">{a.nombre}</td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[11px] font-bold ${
                            a.activo
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-slate-100 text-slate-500 border border-slate-200'
                          }`}
                        >
                          {a.activo ? 'Activa' : 'Inactiva'}
                        </span>
                      </td>
                      {esAdmin && (
                        <td className="py-3 px-4 text-right space-x-2">
                          <button
                            onClick={() => handleAbrirArea(a)}
                            className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                            title="Editar área"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleToggleActivoArea(a)}
                            className={`p-1.5 rounded-lg transition-colors ${
                              a.activo
                                ? 'text-slate-400 hover:text-rose-600 hover:bg-rose-50'
                                : 'text-slate-400 hover:text-emerald-600 hover:bg-emerald-50'
                            }`}
                            title={a.activo ? 'Desactivar área' : 'Activar área'}
                          >
                            {a.activo ? (
                              <Trash2 className="w-3.5 h-3.5" />
                            ) : (
                              <CheckCircle className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ==================== SUB-PESTAÑA BLOQUES ==================== */}
      {subTab === 'BLOQUES' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-800">Bloques Predefinidos de Equipos</h3>
              <p className="text-xs text-slate-500">
                Agrupa sets de laptops, proyectores o robótica para prestarlos en bloque con 1 solo clic
              </p>
            </div>
            {esAdmin && (
              <button
                onClick={() => handleAbrirBloque()}
                className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-xl shadow transition-colors flex items-center space-x-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>Nuevo Bloque</span>
              </button>
            )}
          </div>

          {/* Mini Barra Informativa con Cifras en Tiempo Real */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs flex items-center space-x-3">
              <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-lg">
                <Laptop className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                  Total en AIP (Prestables)
                </span>
                <span className="text-lg font-bold text-slate-800">
                  {metricasBloques.totalEnAIP}{' '}
                  <span className="text-xs font-normal text-slate-400">equipos</span>
                </span>
              </div>
            </div>

            <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs flex items-center space-x-3">
              <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-lg">
                <Layers className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                  Asignados a Bloques
                </span>
                <span className="text-lg font-bold text-slate-800">
                  {metricasBloques.asignadosABloques}{' '}
                  <span className="text-xs font-normal text-slate-400">equipos</span>
                </span>
              </div>
            </div>

            <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs flex items-center space-x-3">
              <div className="p-2.5 bg-amber-50 text-amber-600 rounded-lg">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                  Distribuidos en otras oficinas
                </span>
                <span className="text-lg font-bold text-amber-800">
                  {metricasBloques.distribuidosFuera}{' '}
                  <span className="text-xs font-normal text-amber-600/70">equipos (TOE, Dir...)</span>
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {bloques.length === 0 ? (
              <div className="col-span-full p-12 text-center bg-white rounded-2xl border border-dashed border-slate-300">
                <Layers className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <p className="text-sm font-medium text-slate-600">
                  No hay bloques de equipos creados aún
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  Crea bloques como "Carrito Móvil 1°", "Kit Robótica", etc. para agilizar la
                  atención a docentes.
                </p>
              </div>
            ) : (
              bloques.map((b) => {
                const bienesDelBloque = b.bienes_ids
                  .map((bid) => bienes.find((x) => x.id === bid))
                  .filter((bien): bien is BienPatrimonial => !!bien);

                // 1. Equipos en ambientes prestables (AIP) y no dados de baja
                const equiposLibresAIP = bienesDelBloque.filter((bien) => {
                  if (bien.activo === false || bien.estado_operativo === 'DE_BAJA') return false;
                  const amb = ambientes.find((a) => a.id === bien.ambiente_id);
                  return esAmbientePrestable(amb);
                });

                // 2. Equipos en oficinas no prestables (TOE, Dirección, etc.) o dados de baja
                const equiposDistribuidos = bienesDelBloque.filter((bien) => {
                  if (bien.activo === false || bien.estado_operativo === 'DE_BAJA') return true;
                  const amb = ambientes.find((a) => a.id === bien.ambiente_id);
                  return !esAmbientePrestable(amb);
                });

                return (
                  <div
                    key={b.id}
                    className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between hover:border-indigo-300 transition-all"
                  >
                    <div>
                      {/* Cabecera con badges diferenciados */}
                      <div className="flex items-center justify-between gap-1.5 mb-2 flex-wrap">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                            {equiposLibresAIP.length} libres en AIP
                          </span>
                          {equiposDistribuidos.length > 0 && (
                            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                              {equiposDistribuidos.length} distribuido{equiposDistribuidos.length > 1 ? 's' : ''}
                            </span>
                          )}
                        </div>
                        <span
                          className={`text-[11px] font-bold ${
                            b.activo ? 'text-emerald-600' : 'text-slate-400'
                          }`}
                        >
                          {b.activo ? 'Activo' : 'Inactivo'}
                        </span>
                      </div>

                      <h4 className="text-sm font-bold text-slate-900 mb-1">{b.nombre}</h4>
                      <p className="text-xs text-slate-500 mb-3">{b.descripcion || 'Sin descripción'}</p>

                      {/* Lista principal: renderiza ÚNICAMENTE equiposLibresAIP */}
                      <div className="space-y-1 bg-slate-50 p-2.5 rounded-xl border border-slate-100 max-h-36 overflow-y-auto">
                        {equiposLibresAIP.length === 0 ? (
                          <p className="text-[11px] text-slate-400 text-center py-3 italic">
                            Sin equipos disponibles en AIP en este bloque
                          </p>
                        ) : (
                          <>
                            {equiposLibresAIP.slice(0, 5).map((bien) => (
                              <div
                                key={bien.id}
                                className="flex items-center justify-between text-[11px] text-slate-700"
                              >
                                <span className="font-mono font-bold text-slate-900">
                                  {bien.etiqueta_interna || bien.id.slice(0, 6)}
                                </span>
                                <span className="text-slate-500 truncate max-w-[140px]">
                                  {bien.denominacion || 'Equipo'}
                                </span>
                              </div>
                            ))}
                            {equiposLibresAIP.length > 5 && (
                              <p className="text-[10px] text-indigo-600 font-medium text-center pt-1">
                                + {equiposLibresAIP.length - 5} equipos adicionales en AIP...
                              </p>
                            )}
                          </>
                        )}
                      </div>

                      {/* Sección inferior de distribuidos fuera del AIP sin texto cortado */}
                      {equiposDistribuidos.length > 0 && (
                        <div className="mt-3 pt-2.5 border-t border-dashed border-amber-200 bg-amber-50/60 p-2.5 rounded-xl">
                          <div className="flex items-center space-x-1.5 text-amber-900 text-[11px] font-bold mb-1.5">
                            <AlertCircle className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
                            <span>Distribuidos fuera del AIP (excluidos de préstamo):</span>
                          </div>
                          <div className="space-y-1.5 max-h-32 overflow-y-auto">
                            {equiposDistribuidos.map((bf) => {
                              const ambNombre =
                                ambientes.find((a) => a.id === bf.ambiente_id)?.nombre ||
                                (bf.estado_operativo === 'DE_BAJA' ? 'De Baja' : 'Oficina Externa');
                              return (
                                <div
                                  key={bf.id}
                                  className="px-2 py-1 bg-white border border-amber-200 rounded-lg text-[11px] flex items-center justify-between gap-2"
                                >
                                  <div className="flex items-center space-x-1.5 min-w-0">
                                    <span className="font-mono font-bold text-slate-900 flex-shrink-0">
                                      {bf.etiqueta_interna}
                                    </span>
                                    <span className="text-amber-800 font-medium whitespace-normal">
                                      En {ambNombre}
                                    </span>
                                  </div>
                                  {esAdmin && (
                                    <button
                                      type="button"
                                      onClick={() => handleQuitarEquipoDeBloque(b, bf.id)}
                                      disabled={guardando}
                                      className="text-[10px] text-amber-700 hover:text-rose-700 hover:bg-rose-50 px-1.5 py-0.5 rounded border border-amber-200 transition-colors flex-shrink-0 font-medium disabled:opacity-50"
                                      title={`Desvincular ${bf.etiqueta_interna} de este bloque`}
                                    >
                                      Quitar del bloque
                                    </button>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>

                  {esAdmin && (
                    <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-end space-x-2">
                      <button
                        onClick={() => handleAbrirBloque(b)}
                        className="px-2.5 py-1 text-xs text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors flex items-center space-x-1"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                        <span>Editar</span>
                      </button>
                      <button
                        onClick={() => handleToggleActivoBloque(b)}
                        className={`px-2.5 py-1 text-xs rounded-lg transition-colors flex items-center space-x-1 ${
                          b.activo
                            ? 'text-slate-400 hover:text-rose-600 hover:bg-rose-50'
                            : 'text-slate-400 hover:text-emerald-600 hover:bg-emerald-50'
                        }`}
                      >
                        {b.activo ? (
                          <>
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Desactivar</span>
                          </>
                        ) : (
                          <>
                            <CheckCircle className="w-3.5 h-3.5" />
                            <span>Activar</span>
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
        </div>
      )}

      {/* ==================== MODAL FORMULARIO DOCENTE ==================== */}
      {modalDocenteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 bg-slate-900 text-white">
              <h3 className="font-semibold text-sm">
                {docenteEditando ? 'Editar Docente' : 'Registrar Nuevo Docente'}
              </h3>
              <button
                onClick={() => setModalDocenteOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleGuardarDocente} className="p-5 space-y-4">
              {errorMsg && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    DNI (8 dígitos)
                  </label>
                  <input
                    type="text"
                    maxLength={8}
                    value={formDocente.dni}
                    onChange={(e) =>
                      setFormDocente({ ...formDocente, dni: e.target.value.replace(/\D/g, '') })
                    }
                    placeholder="12345678"
                    className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Nombres *
                  </label>
                  <input
                    type="text"
                    required
                    value={formDocente.nombres}
                    onChange={(e) => setFormDocente({ ...formDocente, nombres: e.target.value })}
                    placeholder="Ej. Juan Carlos"
                    className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Apellidos *
                  </label>
                  <input
                    type="text"
                    required
                    value={formDocente.apellidos}
                    onChange={(e) => setFormDocente({ ...formDocente, apellidos: e.target.value })}
                    placeholder="Ej. Pérez García"
                    className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Especialidad / Área
                  </label>
                  <input
                    type="text"
                    value={formDocente.especialidad}
                    onChange={(e) =>
                      setFormDocente({ ...formDocente, especialidad: e.target.value })
                    }
                    placeholder="Ej. Matemática"
                    className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Teléfono / Celular
                  </label>
                  <input
                    type="text"
                    value={formDocente.telefono}
                    onChange={(e) => setFormDocente({ ...formDocente, telefono: e.target.value })}
                    placeholder="Ej. 987654321"
                    className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setModalDocenteOpen(false)}
                  className="px-3.5 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={guardando}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold text-xs rounded-xl shadow transition-colors"
                >
                  {guardando ? 'Guardando...' : 'Guardar Docente'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================== MODAL ÁREA CURRICULAR ==================== */}
      {modalAreaOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 bg-slate-900 text-white">
              <h3 className="font-semibold text-sm">
                {areaEditando ? 'Editar Área Curricular' : 'Nueva Área Curricular'}
              </h3>
              <button
                onClick={() => setModalAreaOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleGuardarArea} className="p-5 space-y-4">
              {errorMsg && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Nombre del Área Curricular *
                </label>
                <input
                  type="text"
                  required
                  value={formAreaNombre}
                  onChange={(e) => setFormAreaNombre(e.target.value)}
                  placeholder="Ej. Matemática, Comunicación..."
                  className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setModalAreaOpen(false)}
                  className="px-3.5 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={guardando}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold text-xs rounded-xl shadow transition-colors"
                >
                  {guardando ? 'Guardando...' : 'Guardar Área'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================== MODAL BLOQUE DE EQUIPOS ==================== */}
      {modalBloqueOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between px-5 py-4 bg-slate-900 text-white">
              <h3 className="font-semibold text-sm">
                {bloqueEditando ? 'Editar Bloque de Equipos' : 'Crear Nuevo Bloque de Equipos'}
              </h3>
              <button
                onClick={() => setModalBloqueOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleGuardarBloque} className="p-5 space-y-4 overflow-y-auto">
              {errorMsg && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Alerta si el bloque contiene equipos que salieron del AIP */}
              {bienesEnBloqueFueraAIP.length > 0 && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-start justify-between gap-2">
                  <div className="flex items-start space-x-2">
                    <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold">
                        {bienesEnBloqueFueraAIP.length} equipo(s) en este bloque fueron trasladados fuera del AIP:
                      </p>
                      <p className="text-[11px] text-amber-700 mt-0.5">
                        {bienesEnBloqueFueraAIP
                          .map((b) => {
                            const amb = ambientes.find((a) => a.id === b.ambiente_id);
                            return `${b.etiqueta_interna} (${amb?.nombre || 'Fuera de AIP'})`;
                          })
                          .join(', ')}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const idsFuera = new Set(bienesEnBloqueFueraAIP.map((b) => b.id));
                      setFormBloque((prev) => ({
                        ...prev,
                        bienes_ids: prev.bienes_ids.filter((id) => !idsFuera.has(id)),
                      }));
                    }}
                    className="px-2.5 py-1 bg-amber-200 hover:bg-amber-300 text-amber-950 font-semibold rounded-lg text-[11px] transition-colors whitespace-nowrap"
                  >
                    Quitar del Bloque
                  </button>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Nombre del Bloque *
                  </label>
                  <input
                    type="text"
                    required
                    value={formBloque.nombre}
                    onChange={(e) => setFormBloque({ ...formBloque, nombre: e.target.value })}
                    placeholder="Ej. Carrito Móvil Laptops 1° y 2°"
                    className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Descripción / Finalidad
                  </label>
                  <input
                    type="text"
                    value={formBloque.descripcion}
                    onChange={(e) => setFormBloque({ ...formBloque, descripcion: e.target.value })}
                    placeholder="Ej. Laptops Lenovo ThinkPad asignadas al pabellón B"
                    className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2 gap-2 flex-wrap">
                  <label className="text-xs font-semibold text-slate-700">
                    Seleccionar Equipos del Bloque ({formBloque.bienes_ids.length} seleccionados)
                  </label>
                  <div className="flex items-center gap-1.5">
                    <select
                      value={filtroAmbienteBloque}
                      onChange={(e) => setFiltroAmbienteBloque(e.target.value)}
                      className="text-[11px] px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none"
                    >
                      <option value="TODOS">Todos los AIP</option>
                      {ambientesAIP.map((amb) => (
                        <option key={amb.id} value={amb.id}>
                          {amb.nombre}
                        </option>
                      ))}
                    </select>
                    <div className="relative w-40">
                      <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2 top-2" />
                      <input
                        type="text"
                        value={busquedaBienBloque}
                        onChange={(e) => setBusquedaBienBloque(e.target.value)}
                        placeholder="Filtrar equipos..."
                        className="w-full text-[11px] pl-6 pr-2 py-1 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                <div className="border border-slate-200 rounded-xl p-2 max-h-56 overflow-y-auto space-y-1.5 bg-slate-50">
                  {bienesParaBloqueFiltrados.length === 0 ? (
                    <p className="text-xs text-slate-400 text-center py-4">
                      No se encontraron equipos disponibles en AIP.
                    </p>
                  ) : (
                    bienesParaBloqueFiltrados.map((bien) => {
                      const incluido = formBloque.bienes_ids.includes(bien.id);
                      const ambEquipo = ambientes.find((a) => a.id === bien.ambiente_id);
                      return (
                        <div
                          key={bien.id}
                          onClick={() => toggleBienEnBloque(bien.id)}
                          className={`p-2 rounded-lg border text-xs cursor-pointer flex items-center justify-between transition-colors ${
                            incluido
                              ? 'bg-indigo-50 border-indigo-300 text-indigo-900'
                              : 'bg-white border-slate-200 hover:border-slate-300 text-slate-700'
                          }`}
                        >
                          <div className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              checked={incluido}
                              onChange={() => {}}
                              className="w-3.5 h-3.5 text-indigo-600 rounded cursor-pointer"
                            />
                            <span className="font-mono font-bold">{bien.etiqueta_interna}</span>
                            <span className="truncate max-w-[160px] text-slate-500">
                              &bull; {bien.denominacion} ({bien.marca})
                            </span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-medium border border-slate-200">
                              {ambEquipo?.nombre || 'AIP'}
                            </span>
                          </div>
                          <span
                            className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                              bien.estado_operativo === 'OPERATIVO'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {bien.estado_operativo}
                          </span>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setModalBloqueOpen(false)}
                  className="px-3.5 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={guardando}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold text-xs rounded-xl shadow transition-colors"
                >
                  {guardando ? 'Guardando...' : 'Guardar Bloque'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};