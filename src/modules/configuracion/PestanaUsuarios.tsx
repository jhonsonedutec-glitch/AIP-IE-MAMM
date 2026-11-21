import React, { useEffect, useState } from 'react';
import {
  Users,
  UserPlus,
  Shield,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Lock,
  Mail,
  User as UserIcon,
} from 'lucide-react';
import { usuarioRepository } from '@/repositories';
import { UsuarioPerfil, RolUsuario } from '@/types';
import { useAuth } from '@/hooks';

export const PestanaUsuarios: React.FC = () => {
  const { user: authUser } = useAuth();
  const [usuarios, setUsuarios] = useState<UsuarioPerfil[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ tipo: 'ok' | 'err'; msg: string } | null>(null);

  // Estado para Modal de Creación
  const [showModal, setShowModal] = useState(false);
  const [nuevoNombre, setNuevoNombre] = useState('');
  const [nuevoEmail, setNuevoEmail] = useState('');
  const [nuevoPassword, setNuevoPassword] = useState('');
  const [nuevoRol, setNuevoRol] = useState<RolUsuario>('DIRECCION');
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  useEffect(() => {
    cargarUsuarios();
  }, []);

  const cargarUsuarios = async () => {
    setLoading(true);
    try {
      const data = await usuarioRepository.listar();
      setUsuarios(data);
    } catch (err: any) {
      console.error('Error al listar usuarios:', err);
      setFeedback({ tipo: 'err', msg: 'Error al cargar la lista de usuarios.' });
    } finally {
      setLoading(false);
    }
  };

  const handleToggleEstado = async (u: UsuarioPerfil) => {
    if (authUser?.uid === u.uid) {
      alert('Por seguridad institucional, no puede desactivar su propia cuenta de administrador.');
      return;
    }

    const nuevoEstado = !u.activo;
    const confirmMsg = nuevoEstado
      ? `¿Desea reactivar el acceso para el usuario ${u.nombres}?`
      : `¿Está seguro de desactivar el acceso para ${u.nombres}?`;

    if (!window.confirm(confirmMsg)) return;

    setActionLoading(true);
    setFeedback(null);
    try {
      await usuarioRepository.cambiarEstadoActivo(u.uid, nuevoEstado);
      setFeedback({
        tipo: 'ok',
        msg: `El usuario ${u.nombres} ha sido ${nuevoEstado ? 'activado' : 'desactivado'}.`,
      });
      await cargarUsuarios();
    } catch (err: any) {
      setFeedback({ tipo: 'err', msg: err.message || 'Error al modificar estado del usuario.' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleCambiarRol = async (u: UsuarioPerfil) => {
    if (authUser?.uid === u.uid) {
      alert('Por seguridad institucional, no puede remover sus propios privilegios de administrador.');
      return;
    }

    const nuevoRol: RolUsuario = u.rol === 'ADMIN' ? 'DIRECCION' : 'ADMIN';
    if (!window.confirm(`¿Desea cambiar el rol de ${u.nombres} a '${nuevoRol}'?`)) return;

    setActionLoading(true);
    setFeedback(null);
    try {
      await usuarioRepository.actualizarRol(u.uid, nuevoRol);
      setFeedback({ tipo: 'ok', msg: `Rol de ${u.nombres} actualizado a ${nuevoRol}.` });
      await cargarUsuarios();
    } catch (err: any) {
      setFeedback({ tipo: 'err', msg: err.message || 'Error al cambiar rol del usuario.' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleCrearUsuario = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nuevoNombre || !nuevoEmail || !nuevoPassword) return;

    if (nuevoPassword.length < 6) {
      setModalError('La contraseña debe tener al menos 6 caracteres.');
      return;
    }

    setModalLoading(true);
    setModalError(null);
    try {
      await usuarioRepository.crearUsuario({
        nombres: nuevoNombre,
        email: nuevoEmail,
        password: nuevoPassword,
        rol: nuevoRol,
      });

      setShowModal(false);
      setNuevoNombre('');
      setNuevoEmail('');
      setNuevoPassword('');
      setNuevoRol('DIRECCION');
      setFeedback({
        tipo: 'ok',
        msg: `Usuario institucional ${nuevoEmail} creado exitosamente con rol ${nuevoRol}.`,
      });
      await cargarUsuarios();
    } catch (err: any) {
      console.error('Error al crear usuario:', err);
      setModalError(err.message || 'Error al crear usuario.');
    } finally {
      setModalLoading(false);
    }
  };

  const formatFecha = (fecha?: string | Date) => {
    if (!fecha) return 'Sin registro';
    try {
      const d = typeof fecha === 'string' ? new Date(fecha) : fecha;
      return d.toLocaleString('es-PE', {
        dateStyle: 'short',
        timeStyle: 'short',
      });
    } catch {
      return 'Sin registro';
    }
  };

  return (
    <div className="space-y-6">
      {/* Cabecera */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-200 gap-3">
        <div>
          <h2 className="text-base font-bold text-slate-800 flex items-center space-x-2">
            <Users className="w-4 h-4 text-emerald-600" />
            <span>Gestión de Cuentas Institucionales y Roles (RBAC)</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Administre accesos para el equipo del DAIP y Dirección.
          </p>
        </div>
        <button
          onClick={() => {
            setModalError(null);
            setShowModal(true);
          }}
          className="inline-flex items-center space-x-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg shadow-sm transition-all"
        >
          <UserPlus className="w-4 h-4" />
          <span>Nuevo Usuario Institucional</span>
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

      {/* Tabla de Usuarios */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-slate-500 text-xs">
            Cargando padrón de usuarios...
          </div>
        ) : usuarios.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-xs">
            No existen usuarios registrados aún. Utilice el botón "Nuevo Usuario Institucional".
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider">
                  <th className="py-3 px-4">Usuario</th>
                  <th className="py-3 px-4">Correo Institucional</th>
                  <th className="py-3 px-4">Rol Asignado</th>
                  <th className="py-3 px-4">Estado</th>
                  <th className="py-3 px-4">Último Acceso</th>
                  <th className="py-3 px-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {usuarios.map((u) => {
                  const esPropioAdmin = authUser?.uid === u.uid;
                  return (
                    <tr key={u.uid} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-800 flex items-center space-x-1.5">
                          <span>{u.nombres}</span>
                          {esPropioAdmin && (
                            <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-normal">
                              Tú
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-slate-600">{u.email}</td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold ${
                            u.rol === 'ADMIN'
                              ? 'bg-purple-50 text-purple-700 border border-purple-200'
                              : 'bg-blue-50 text-blue-700 border border-blue-200'
                          }`}
                        >
                          <Shield className="w-3 h-3 mr-1" />
                          {u.rol}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        {u.activo ? (
                          <span className="inline-flex items-center text-emerald-700 font-medium bg-emerald-50 px-2 py-0.5 rounded text-[11px] border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3 mr-1 text-emerald-600" />
                            Activo
                          </span>
                        ) : (
                          <span className="inline-flex items-center text-rose-700 font-medium bg-rose-50 px-2 py-0.5 rounded text-[11px] border border-rose-200">
                            <XCircle className="w-3 h-3 mr-1 text-rose-600" />
                            Inactivo
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-slate-500">
                        {formatFecha(u.ultimoAcceso || u.ultimo_acceso)}
                      </td>
                      <td className="py-3 px-4 text-right space-x-2">
                        <button
                          type="button"
                          disabled={actionLoading || esPropioAdmin}
                          onClick={() => handleCambiarRol(u)}
                          title={
                            esPropioAdmin
                              ? 'No puede cambiar su propio rol'
                              : `Cambiar rol a ${u.rol === 'ADMIN' ? 'DIRECCION' : 'ADMIN'}`
                          }
                          className="px-2.5 py-1 text-[11px] font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 rounded border border-slate-300 disabled:opacity-40 transition-colors"
                        >
                          Cambiar Rol
                        </button>
                        <button
                          type="button"
                          disabled={actionLoading || esPropioAdmin}
                          onClick={() => handleToggleEstado(u)}
                          title={
                            esPropioAdmin
                              ? 'No puede desactivar su propia cuenta'
                              : u.activo
                              ? 'Desactivar acceso'
                              : 'Reactivar acceso'
                          }
                          className={`px-2.5 py-1 text-[11px] font-medium rounded border disabled:opacity-40 transition-colors ${
                            u.activo
                              ? 'bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-200'
                              : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200'
                          }`}
                        >
                          {u.activo ? 'Desactivar' : 'Activar'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal para Crear Usuario Institucional */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-800 flex items-center space-x-2">
                <UserPlus className="w-5 h-5 text-emerald-600" />
                <span>Registrar Usuario Institucional</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-600 text-lg leading-none"
              >
                &times;
              </button>
            </div>

            {modalError && (
              <div className="mt-4 p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-xs">
                {modalError}
              </div>
            )}

            <form onSubmit={handleCrearUsuario} className="mt-4 space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Nombres y Apellidos *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <UserIcon className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    required
                    value={nuevoNombre}
                    onChange={(e) => setNuevoNombre(e.target.value)}
                    placeholder="Ej. Mg. Carlos Ramírez Ruiz"
                    className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Correo Electrónico Institucional *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="email"
                    required
                    value={nuevoEmail}
                    onChange={(e) => setNuevoEmail(e.target.value)}
                    placeholder="carlos.ramirez@mesonesmuro.edu.pe"
                    className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Contraseña Temporal * (mínimo 6 caracteres)
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={nuevoPassword}
                    onChange={(e) => setNuevoPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Rol en el Sistema *</label>
                <select
                  value={nuevoRol}
                  onChange={(e) => setNuevoRol(e.target.value as RolUsuario)}
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="DIRECCION">DIRECCION (Solo Lectura y Supervisión de Reportes)</option>
                  <option value="ADMIN">ADMIN (DAIP / Soporte Técnico - Control Total)</option>
                </select>
                <p className="text-[11px] text-slate-500 mt-1">
                  El Plan Spark permite crear cuentas directamente sin alterar su sesión de administrador.
                </p>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  disabled={modalLoading}
                  onClick={() => setShowModal(false)}
                  className="px-3 py-2 text-slate-600 hover:text-slate-800 font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={modalLoading}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg shadow-sm disabled:opacity-50"
                >
                  {modalLoading ? 'Registrando cuenta...' : 'Crear Usuario'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
