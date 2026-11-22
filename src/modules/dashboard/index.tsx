import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  CheckCircle2,
  QrCode,
  Wrench,
  AlertTriangle,
  RotateCcw,
  Clock,
  ArrowRight,
  TrendingUp,
  ShieldAlert,
  Layers,
  BookOpen,
  Award,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import {
  BienPatrimonial,
  Ambiente,
  Prestamo,
  MantenimientoRegistro,
  AuditoriaLog,
  esAmbientePrestable,
  deducirColorLote,
} from '@/types';
import {
  bienRepository,
  ambienteRepository,
  prestamoRepository,
  mantenimientoRepository,
  auditoriaRepository,
} from '@/repositories';
import { useAuth } from '@/hooks';

const COLORES_CONSERVACION: Record<string, string> = {
  Nuevo: '#3B82F6', // Blue
  Bueno: '#10B981', // Emerald
  Regular: '#F59E0B', // Amber
  Malo: '#EF4444', // Red
};

const COLORES_OPERATIVO: Record<string, string> = {
  OPERATIVO: '#10B981',
  EN_MANTENIMIENTO: '#F59E0B',
  PRESTADO: '#3B82F6',
  DE_BAJA: '#64748B',
};

export const DashboardModule: React.FC = () => {
  const navigate = useNavigate();
  const { perfil } = useAuth();

  const [loading, setLoading] = useState(true);
  const [bienes, setBienes] = useState<BienPatrimonial[]>([]);
  const [ambientes, setAmbientes] = useState<Ambiente[]>([]);
  const [prestamos, setPrestamos] = useState<Prestamo[]>([]);
  const [mantenimientos, setMantenimientos] = useState<MantenimientoRegistro[]>([]);
  const [auditoriaLogs, setAuditoriaLogs] = useState<AuditoriaLog[]>([]);

  // Toggle de visualización de dona (Conservación vs Estado Operativo)
  const [vistaDona, setVistaDona] = useState<'CONSERVACION' | 'OPERATIVO'>('CONSERVACION');

  useEffect(() => {
    cargarDatosDashboard();
  }, []);

  const cargarDatosDashboard = async () => {
    setLoading(true);
    try {
      const [
        bienesData,
        ambientesData,
        prestamosData,
        mantenimientosData,
        logsData,
      ] = await Promise.all([
        bienRepository.listar(),
        ambienteRepository.listar(),
        prestamoRepository.listar(),
        mantenimientoRepository.listar(),
        auditoriaRepository.listar(5),
      ]);

      setBienes(bienesData);
      setAmbientes(ambientesData);
      setPrestamos(prestamosData);
      setMantenimientos(mantenimientosData);
      setAuditoriaLogs(logsData);
    } catch (err) {
      console.error('Error al cargar datos del dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  // 1. KPIs Globales
  const kpis = useMemo(() => {
    const bienesActivos = bienes.filter((b) => b.estado_operativo !== 'DE_BAJA');
    const totalActivos = bienesActivos.length;
    const totalBajas = bienes.filter((b) => b.estado_operativo === 'DE_BAJA').length;

    // Mapa de ambientes prestables (AIP)
    const mapaAmbientesPrestables = new Map<string, boolean>();
    ambientes.forEach((a) => {
      mapaAmbientesPrestables.set(a.id, esAmbientePrestable(a));
    });

    const stockAIP = bienesActivos.filter((b) =>
      mapaAmbientesPrestables.get(b.ambiente_id) ?? false
    ).length;

    const distribuidos = totalActivos - stockAIP;

    const operativos = bienesActivos.filter((b) => b.estado_operativo === 'OPERATIVO').length;
    const tasaOperatividad = totalActivos > 0 ? ((operativos / totalActivos) * 100).toFixed(1) : '100';

    const prestamosActivosList = prestamos.filter((p) => p.estado === 'ACTIVO');
    const prestamosActivos = prestamosActivosList.length;
    const equiposEnAula = prestamosActivosList.reduce((acc, p) => acc + (p.cantidad_equipos || p.bienes_ids?.length || 0), 0);

    const now = new Date();
    const prestamosVencidos = prestamosActivosList.filter((p) => {
      if (!p.fecha_devolucion_estimada) return false;
      const fDev = new Date(p.fecha_devolucion_estimada);
      return fDev.getTime() < now.getTime();
    }).length;

    const enMantenimiento = bienesActivos.filter((b) => b.estado_operativo === 'EN_MANTENIMIENTO').length;
    const inoperativos = bienesActivos.filter((b) => b.estado_conservacion === 'M').length;
    const enSoporte = enMantenimiento + inoperativos;

    return {
      totalActivos,
      totalBajas,
      stockAIP,
      distribuidos,
      operativos,
      tasaOperatividad,
      prestamosActivos,
      equiposEnAula,
      prestamosVencidos,
      enMantenimiento,
      inoperativos,
      enSoporte,
    };
  }, [bienes, ambientes, prestamos]);

  // 2. Gráfico 1: Distribución por Ambiente
  const datosAmbientes = useMemo(() => {
    const mapaAmbientes = new Map<string, string>();
    ambientes.forEach((a) => mapaAmbientes.set(a.id, a.nombre));

    const conteo = new Map<string, number>();
    bienes
      .filter((b) => b.estado_operativo !== 'DE_BAJA')
      .forEach((b) => {
        const nombre = mapaAmbientes.get(b.ambiente_id) || 'Otros / Sin asignar';
        conteo.set(nombre, (conteo.get(nombre) || 0) + 1);
      });

    return Array.from(conteo.entries()).map(([nombre, cantidad]) => ({
      ambiente: nombre,
      cantidad,
    }));
  }, [bienes, ambientes]);

  // 3. Gráfico 2: Conservación vs Operatividad (Dona)
  const datosDona = useMemo(() => {
    const bienesActivos = bienes.filter((b) => b.estado_operativo !== 'DE_BAJA');
    const total = bienesActivos.length;
    if (total === 0) return [];

    if (vistaDona === 'CONSERVACION') {
      const mapa: Record<string, { label: string; count: number; color: string }> = {
        N: { label: 'Nuevo (N)', count: 0, color: COLORES_CONSERVACION.Nuevo },
        B: { label: 'Bueno (B)', count: 0, color: COLORES_CONSERVACION.Bueno },
        R: { label: 'Regular (R)', count: 0, color: COLORES_CONSERVACION.Regular },
        M: { label: 'Malo (M)', count: 0, color: COLORES_CONSERVACION.Malo },
      };

      bienesActivos.forEach((b) => {
        const c = b.estado_conservacion;
        if (mapa[c]) mapa[c].count++;
      });

      return Object.values(mapa)
        .filter((item) => item.count > 0)
        .map((item) => ({
          name: item.label,
          value: item.count,
          color: item.color,
          porcentaje: ((item.count / total) * 100).toFixed(1),
        }));
    } else {
      const mapa: Record<string, { label: string; count: number; color: string }> = {
        OPERATIVO: { label: 'Operativo', count: 0, color: COLORES_OPERATIVO.OPERATIVO },
        EN_MANTENIMIENTO: { label: 'En Soporte', count: 0, color: COLORES_OPERATIVO.EN_MANTENIMIENTO },
        PRESTADO: { label: 'En Préstamo', count: 0, color: COLORES_OPERATIVO.PRESTADO },
      };

      bienesActivos.forEach((b) => {
        const op = b.estado_operativo;
        if (mapa[op]) mapa[op].count++;
      });

      return Object.values(mapa)
        .filter((item) => item.count > 0)
        .map((item) => ({
          name: item.label,
          value: item.count,
          color: item.color,
          porcentaje: ((item.count / total) * 100).toFixed(1),
        }));
    }
  }, [bienes, vistaDona]);

  // 4. Gráfico 3: Parque Tecnológico por Lote / Color
  const datosLotes = useMemo(() => {
    const bienesActivos = bienes.filter((b) => b.estado_operativo !== 'DE_BAJA');
    const mapa = new Map<string, { cantidad: number; color: string }>();

    bienesActivos.forEach((b) => {
      const etiqueta = b.lote_etiqueta?.trim() ? b.lote_etiqueta.trim() : 'Sin lote';
      const color = b.lote_color?.trim()
        ? b.lote_color.trim()
        : etiqueta === 'Sin lote'
        ? '#94A3B8'
        : deducirColorLote(etiqueta);

      if (!mapa.has(etiqueta)) {
        mapa.set(etiqueta, { cantidad: 0, color });
      }
      mapa.get(etiqueta)!.cantidad++;
    });

    return Array.from(mapa.entries()).map(([nombre, val]) => ({
      lote: nombre,
      cantidad: val.cantidad,
      color: val.color,
    }));
  }, [bienes]);

  // 5. Gráfico 4: Préstamos por Área Curricular y Top Docentes
  const { datosAreas, topDocentes } = useMemo(() => {
    const mapaAreas = new Map<string, number>();
    const mapaDocentes = new Map<
      string,
      { nombre: string; totalPrestamos: number; totalEquipos: number; dni?: string }
    >();

    prestamos.forEach((p) => {
      // Por Área
      const nombreArea = p.area_nombre || 'Área no registrada';
      mapaAreas.set(nombreArea, (mapaAreas.get(nombreArea) || 0) + 1);

      // Por Docente
      const docKey = p.docente_id || p.docente_nombre || 'Desconocido';
      const cant = p.cantidad_equipos || p.bienes_ids?.length || 1;
      if (!mapaDocentes.has(docKey)) {
        mapaDocentes.set(docKey, {
          nombre: p.docente_nombre || 'Docente sin nombre',
          totalPrestamos: 0,
          totalEquipos: 0,
        });
      }
      const entry = mapaDocentes.get(docKey)!;
      entry.totalPrestamos += 1;
      entry.totalEquipos += cant;
    });

    const datosAreasRes = Array.from(mapaAreas.entries()).map(([area, total]) => ({
      area,
      prestamos: total,
    }));

    const topDocentesRes = Array.from(mapaDocentes.values())
      .sort((a, b) => b.totalPrestamos - a.totalPrestamos || b.totalEquipos - a.totalEquipos)
      .slice(0, 5);

    return { datosAreas: datosAreasRes, topDocentes: topDocentesRes };
  }, [prestamos]);

  // 6. Alertas operativas: Préstamos activos y Mantenimientos abiertos
  const prestamosActivosDetalle = useMemo(() => {
    return prestamos
      .filter((p) => p.estado === 'ACTIVO')
      .slice(0, 4)
      .map((p) => {
        const esVencido =
          p.fecha_devolucion_estimada &&
          new Date(p.fecha_devolucion_estimada).getTime() < new Date().getTime();
        return { ...p, esVencido };
      });
  }, [prestamos]);

  const mantenimientosAbiertos = useMemo(() => {
    return mantenimientos
      .filter((m) => !m.cerrado)
      .slice(0, 4);
  }, [mantenimientos]);

  return (
    <div className="space-y-6">
      {/* Cabecera del Dashboard */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center space-x-2.5">
            <h1 className="text-2xl font-bold text-slate-800 tracking-tight">
              Panel Principal y Analítica TIC
            </h1>
            <span className="px-2.5 py-0.5 text-[11px] font-bold rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
              {perfil?.rol === 'ADMIN' ? 'Vista Administrador' : 'Supervisión de Dirección'}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Supervisión pedagógica en tiempo real, disponibilidad de flota y salud del inventario institucional.
          </p>
        </div>

        <div className="flex items-center space-x-2 shrink-0">
          <button
            type="button"
            onClick={cargarDatosDashboard}
            disabled={loading}
            className="inline-flex items-center space-x-1.5 px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg border border-slate-300 shadow-2xs transition-colors cursor-pointer"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Actualizar</span>
          </button>
        </div>
      </div>

      {/* 1. FILA DE KPIS GLOBALES (4 TARJETAS) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Total Bienes Activos */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Total Bienes Activos
            </span>
            <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
              <Box className="w-5 h-5" />
            </div>
          </div>
          <div>
            <div className="text-3xl font-extrabold text-slate-900 tracking-tight">
              {kpis.totalActivos}
            </div>
            <div className="flex items-center space-x-2 mt-1.5 text-xs text-slate-600 font-medium">
              <span className="inline-flex items-center space-x-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span>Stock AIP: <strong>{kpis.stockAIP}</strong></span>
              </span>
              <span>&bull;</span>
              <span className="inline-flex items-center space-x-1">
                <span className="w-2 h-2 rounded-full bg-slate-400" />
                <span>Oficinas: <strong>{kpis.distribuidos}</strong></span>
              </span>
            </div>
          </div>
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
            <span>Bajas patrimoniales:</span>
            <span className="font-semibold text-rose-600">{kpis.totalBajas} registrados</span>
          </div>
        </div>

        {/* KPI 2: Tasa de Operatividad */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider">
              Tasa de Operatividad
            </span>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div>
            <div className="text-3xl font-extrabold text-emerald-700 tracking-tight">
              {kpis.tasaOperatividad}%
            </div>
            <p className="text-xs text-emerald-800/90 font-medium mt-1">
              <strong>{kpis.operativos}</strong> de {kpis.totalActivos} equipos operativos
            </p>
          </div>
          <div className="pt-2 border-t border-slate-100">
            <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
              <div
                className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, Math.max(0, Number(kpis.tasaOperatividad)))}%` }}
              />
            </div>
          </div>
        </div>

        {/* KPI 3: Préstamos Activos (En Aula) */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-indigo-800 uppercase tracking-wider">
              Préstamos Activos
            </span>
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
              <QrCode className="w-5 h-5" />
            </div>
          </div>
          <div>
            <div className="text-3xl font-extrabold text-indigo-950 tracking-tight">
              {kpis.prestamosActivos}
            </div>
            <p className="text-xs text-indigo-700 font-medium mt-1">
              <strong>{kpis.equiposEnAula}</strong> equipos actualmente en sesión
            </p>
          </div>
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
            {kpis.prestamosVencidos > 0 ? (
              <span className="text-rose-600 font-bold flex items-center space-x-1">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>{kpis.prestamosVencidos} préstamo(s) demorado(s)</span>
              </span>
            ) : (
              <span className="text-emerald-700 font-medium flex items-center space-x-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Sin demoras activas</span>
              </span>
            )}
            <button
              type="button"
              onClick={() => navigate('/prestamos')}
              className="text-indigo-600 hover:text-indigo-800 font-semibold cursor-pointer"
            >
              Ver &rarr;
            </button>
          </div>
        </div>

        {/* KPI 4: Soporte Técnico */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-800 uppercase tracking-wider">
              Soporte Técnico
            </span>
            <div
              className={`p-2 rounded-xl ${
                kpis.enSoporte > 0 ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500'
              }`}
            >
              <Wrench className="w-5 h-5" />
            </div>
          </div>
          <div>
            <div
              className={`text-3xl font-extrabold tracking-tight ${
                kpis.enSoporte > 0 ? 'text-amber-800' : 'text-slate-900'
              }`}
            >
              {kpis.enSoporte}
            </div>
            <p className="text-xs text-slate-600 font-medium mt-1">
              <strong>{kpis.enMantenimiento}</strong> en taller | <strong>{kpis.inoperativos}</strong> inoperativos
            </p>
          </div>
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
            {kpis.enSoporte > 0 ? (
              <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-bold">
                Atención requerida
              </span>
            ) : (
              <span className="text-emerald-700 font-medium">Parque al 100% disponible</span>
            )}
            <button
              type="button"
              onClick={() => navigate('/mantenimiento')}
              className="text-amber-700 hover:text-amber-900 font-semibold cursor-pointer"
            >
              Ver &rarr;
            </button>
          </div>
        </div>
      </div>

      {/* 2. GRÁFICOS INTERACTIVOS (SECCIÓN PRINCIPAL) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gráfico 1: Distribución por Ambiente */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-800 text-sm flex items-center space-x-2">
                <Layers className="w-4 h-4 text-emerald-600" />
                <span>Distribución de Equipos por Ambiente</span>
              </h3>
              <p className="text-xs text-slate-400">Total de máquinas activas asignadas a cada espacio</p>
            </div>
            <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg">
              {datosAmbientes.length} ambientes
            </span>
          </div>

          <div className="h-64 w-full pt-2">
            {datosAmbientes.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                Sin datos de bienes registrados.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={datosAmbientes} margin={{ top: 10, right: 10, left: -20, bottom: 25 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis
                    dataKey="ambiente"
                    tick={{ fill: '#64748B', fontSize: 11 }}
                    interval={0}
                    angle={-20}
                    textAnchor="end"
                  />
                  <YAxis tick={{ fill: '#64748B', fontSize: 11 }} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1E293B',
                      borderRadius: '8px',
                      color: '#FFF',
                      fontSize: '12px',
                    }}
                    formatter={((val: any) => [`${val} equipos`, 'Total']) as any}
                  />
                  <Bar dataKey="cantidad" fill="#059669" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Gráfico 2: Conservación vs Operatividad (Dona) */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <h3 className="font-bold text-slate-800 text-sm flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-blue-600" />
                <span>Salud del Inventario</span>
              </h3>
              <p className="text-xs text-slate-400">Desglose porcentual de la flota tecnológica</p>
            </div>

            {/* Selector de Vista */}
            <div className="flex items-center bg-slate-100 p-0.5 rounded-lg text-xs font-semibold">
              <button
                type="button"
                onClick={() => setVistaDona('CONSERVACION')}
                className={`px-3 py-1 rounded-md transition-colors cursor-pointer ${
                  vistaDona === 'CONSERVACION'
                    ? 'bg-white text-slate-900 shadow-2xs font-bold'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                Conservación (N/B/R/M)
              </button>
              <button
                type="button"
                onClick={() => setVistaDona('OPERATIVO')}
                className={`px-3 py-1 rounded-md transition-colors cursor-pointer ${
                  vistaDona === 'OPERATIVO'
                    ? 'bg-white text-slate-900 shadow-2xs font-bold'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                Estado Operativo
              </button>
            </div>
          </div>

          <div className="h-64 w-full flex items-center justify-center">
            {datosDona.length === 0 ? (
              <div className="text-xs text-slate-400">Sin datos para clasificar.</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={datosDona}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {datosDona.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1E293B',
                      borderRadius: '8px',
                      color: '#FFF',
                      fontSize: '12px',
                    }}
                    formatter={((val: any, name: any, props: any) => [
                      `${val} equipos (${props?.payload?.porcentaje || ''}%)`,
                      name,
                    ]) as any}
                  />
                  <Legend
                    verticalAlign="bottom"
                    iconType="circle"
                    formatter={(value, entry: any) => (
                      <span className="text-slate-700 text-xs font-medium">
                        {value}: {entry.payload.value} ({entry.payload.porcentaje}%)
                      </span>
                    )}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* 3. PARQUE TECNOLÓGICO POR LOTE Y USO PEDAGÓGICO */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gráfico 3: Parque Tecnológico por Lote / Color */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-800 text-sm flex items-center space-x-2">
                <Box className="w-4 h-4 text-amber-600" />
                <span>Parque Tecnológico por Lote / Color</span>
              </h3>
              <p className="text-xs text-slate-400">
                Segmentación cromática de dotaciones (Lote Naranja, Verde, etc.)
              </p>
            </div>
            <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg">
              {datosLotes.length} lotes
            </span>
          </div>

          <div className="h-64 w-full pt-2">
            {datosLotes.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                Sin información de lotes asignados.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={datosLotes} margin={{ top: 10, right: 10, left: -20, bottom: 25 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis
                    dataKey="lote"
                    tick={{ fill: '#64748B', fontSize: 11 }}
                    interval={0}
                    angle={-15}
                    textAnchor="end"
                  />
                  <YAxis tick={{ fill: '#64748B', fontSize: 11 }} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1E293B',
                      borderRadius: '8px',
                      color: '#FFF',
                      fontSize: '12px',
                    }}
                    formatter={((val: any) => [`${val} equipos`, 'Cantidad']) as any}
                  />
                  <Bar dataKey="cantidad" radius={[4, 4, 0, 0]}>
                    {datosLotes.map((entry, index) => (
                      <Cell key={`cell-lote-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Gráfico 4: Préstamos por Área Curricular y Top Docentes */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-800 text-sm flex items-center space-x-2">
                <BookOpen className="w-4 h-4 text-violet-600" />
                <span>Uso Pedagógico por Área y Docentes</span>
              </h3>
              <p className="text-xs text-slate-400">Demanda de recursos TIC en sesiones de clase</p>
            </div>
            <span className="text-[11px] font-semibold text-violet-800 bg-violet-100 px-2.5 py-1 rounded-lg">
              {prestamos.length} préstamos
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
            {/* Gráfico de barras por Área */}
            <div className="h-56 w-full">
              {datosAreas.length === 0 ? (
                <div className="h-full flex items-center justify-center text-xs text-slate-400">
                  Aún no hay préstamos registrados.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={datosAreas} margin={{ top: 5, right: 5, left: -25, bottom: 25 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                    <XAxis
                      dataKey="area"
                      tick={{ fill: '#64748B', fontSize: 10 }}
                      interval={0}
                      angle={-20}
                      textAnchor="end"
                    />
                    <YAxis tick={{ fill: '#64748B', fontSize: 10 }} allowDecimals={false} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#1E293B',
                        borderRadius: '8px',
                        color: '#FFF',
                        fontSize: '11px',
                      }}
                      formatter={((val: any) => [`${val} sesiones`, 'Préstamos']) as any}
                    />
                    <Bar dataKey="prestamos" fill="#7C3AED" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Ranking Top Docentes */}
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80 flex flex-col justify-between">
              <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider flex items-center space-x-1.5 mb-2">
                <Award className="w-3.5 h-3.5 text-amber-500" />
                <span>Top Docentes TIC</span>
              </span>

              {topDocentes.length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-xs">
                  Sin registros de uso docente.
                </div>
              ) : (
                <div className="space-y-2">
                  {topDocentes.map((doc, idx) => (
                    <div
                      key={idx}
                      className="bg-white p-2 rounded-lg border border-slate-200/60 flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center space-x-2 min-w-0">
                        <span
                          className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-[10px] shrink-0 ${
                            idx === 0
                              ? 'bg-amber-100 text-amber-800'
                              : idx === 1
                              ? 'bg-slate-200 text-slate-700'
                              : idx === 2
                              ? 'bg-amber-50 text-amber-900 border border-amber-200'
                              : 'bg-slate-100 text-slate-500'
                          }`}
                        >
                          {idx + 1}
                        </span>
                        <span className="font-semibold text-slate-800 truncate" title={doc.nombre}>
                          {doc.nombre}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 shrink-0 text-right">
                        <span className="font-bold text-violet-700">{doc.totalPrestamos}</span> prést.
                        <span className="text-slate-400 block text-[9px]">{doc.totalEquipos} eq.</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 4. ALERTAS OPERATIVAS Y ACTIVIDAD RECIENTE */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Alertas de Préstamos Activos */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between space-y-3">
          <div>
            <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-3">
              <h3 className="font-bold text-slate-800 text-sm flex items-center space-x-2">
                <Clock className="w-4 h-4 text-indigo-600" />
                <span>Préstamos en Curso</span>
              </h3>
              <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
                {prestamosActivosDetalle.length} activos
              </span>
            </div>

            {prestamosActivosDetalle.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400">
                No hay préstamos activos en este momento. Todos los equipos se encuentran en AIP.
              </div>
            ) : (
              <div className="space-y-2.5">
                {prestamosActivosDetalle.map((p) => (
                  <div
                    key={p.id}
                    className={`p-2.5 rounded-xl border text-xs ${
                      p.esVencido
                        ? 'bg-rose-50/80 border-rose-200 text-rose-900'
                        : 'bg-slate-50 border-slate-200 text-slate-800'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold truncate max-w-[160px]">{p.docente_nombre}</span>
                      {p.esVencido ? (
                        <span className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-rose-200 text-rose-800">
                          Demorado
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-500 font-mono">
                          {p.grado_seccion}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-slate-500">
                      <span>{p.area_nombre}</span>
                      <span className="font-semibold text-slate-700">
                        {p.cantidad_equipos || p.bienes_ids?.length || 0} equipos
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => navigate('/prestamos')}
            className="w-full mt-2 py-2 px-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold rounded-xl text-xs transition-colors flex items-center justify-center space-x-1.5 cursor-pointer"
          >
            <span>Gestionar Préstamos QR</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Equipos en Mantenimiento */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between space-y-3">
          <div>
            <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-3">
              <h3 className="font-bold text-slate-800 text-sm flex items-center space-x-2">
                <Wrench className="w-4 h-4 text-amber-600" />
                <span>En Soporte Técnico</span>
              </h3>
              <span className="text-xs font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">
                {mantenimientosAbiertos.length} en taller
              </span>
            </div>

            {mantenimientosAbiertos.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400">
                No hay equipos en servicio técnico. Parque tecnológico 100% operativo.
              </div>
            ) : (
              <div className="space-y-2.5">
                {mantenimientosAbiertos.map((m) => (
                  <div
                    key={m.id}
                    className="p-2.5 rounded-xl border border-amber-200 bg-amber-50/60 text-xs text-slate-800"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-mono font-bold text-amber-900">
                        {m.etiqueta_interna || m.codigo_patrimonial}
                      </span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded font-bold bg-amber-200 text-amber-800">
                        {m.tipo}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600 truncate mb-1">
                      {m.descripcion_falla || 'Sin diagnóstico registrado'}
                    </p>
                    <div className="text-[10px] text-slate-400 flex items-center justify-between">
                      <span>Técnico: {m.tecnico || 'No asignado'}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => navigate('/mantenimiento')}
            className="w-full mt-2 py-2 px-3 bg-amber-50 hover:bg-amber-100 text-amber-800 font-bold rounded-xl text-xs transition-colors flex items-center justify-center space-x-1.5 cursor-pointer"
          >
            <span>Gestionar Soporte Técnico</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Registro Reciente de Auditoría */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between space-y-3">
          <div>
            <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-3">
              <h3 className="font-bold text-slate-800 text-sm flex items-center space-x-2">
                <ShieldAlert className="w-4 h-4 text-slate-700" />
                <span>Auditoría Reciente</span>
              </h3>
              <span className="text-xs font-mono text-slate-400">Últimos eventos</span>
            </div>

            {auditoriaLogs.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400">
                Sin eventos registrados en auditoría.
              </div>
            ) : (
              <div className="space-y-2.5">
                {auditoriaLogs.map((log) => {
                  const fechaStr = log.fecha
                    ? new Date(log.fecha).toLocaleDateString('es-PE', {
                        day: '2-digit',
                        month: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    : 'Reciente';

                  return (
                    <div
                      key={log.id}
                      className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1"
                    >
                      <div className="flex items-center justify-between">
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-200 text-slate-800">
                          {log.accion}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">{fechaStr}</span>
                      </div>
                      <p className="text-[11px] text-slate-700 line-clamp-2">
                        {log.detalle || `Operación en ${log.coleccion}`}
                      </p>
                      <div className="text-[10px] text-slate-400 truncate">
                        Por: {log.usuario_email || 'Sistema'}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => navigate('/reportes?tab=auditoria')}
            className="w-full mt-2 py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors flex items-center justify-center space-x-1.5 cursor-pointer"
          >
            <span>Ver Registro Inmutable</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
