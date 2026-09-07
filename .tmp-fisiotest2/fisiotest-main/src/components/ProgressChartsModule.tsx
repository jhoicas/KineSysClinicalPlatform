import React, { useState } from 'react';
import { ProgressSessionPoint } from '../types';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  Activity,
  Award,
  ArrowDownRight,
  ArrowUpRight,
  Calendar,
  Layers,
} from 'lucide-react';

interface ProgressChartsModuleProps {
  history: ProgressSessionPoint[];
}

export const ProgressChartsModule: React.FC<ProgressChartsModuleProps> = ({
  history,
}) => {
  const [activeMetric, setActiveMetric] = useState<'asymmetry' | 'strengthPain' | 'mobility' | 'radar'>('asymmetry');

  // Compute key delta statistics from first session to latest session
  const initial = history[0];
  const latest = history[history.length - 1];

  const asymmetryDelta = latest.globalAsymmetryPct - initial.globalAsymmetryPct; // e.g. 8 - 22 = -14%
  const strengthDelta = latest.globalStrengthPct - initial.globalStrengthPct; // e.g. 86 - 74 = +12%
  const painDelta = latest.painVAS - initial.painVAS; // e.g. 1.5 - 6.5 = -5.0
  const mobilityDelta = latest.shoulderMobilityDeg - initial.shoulderMobilityDeg; // e.g. 155 - 140 = +15 deg

  // Radar comparison dataset: Inicial vs Actual across 6 structures
  const radarData = [
    { structure: 'Hombros', Inicial: 68, Actual: 81, fullMark: 100 },
    { structure: 'Codos', Inicial: 92, Actual: 97, fullMark: 100 },
    { structure: 'Muñecas', Inicial: 88, Actual: 92, fullMark: 100 },
    { structure: 'Caderas', Inicial: 70, Actual: 82, fullMark: 100 },
    { structure: 'Rodillas', Inicial: 94, Actual: 98, fullMark: 100 },
    { structure: 'Tobillos', Inicial: 90, Actual: 97, fullMark: 100 },
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header Banner */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-widest text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded border border-blue-200">
              MÉTRICAS LONGITUDINALES
            </span>
            <span className="text-xs font-semibold text-slate-500">
              6 Semanas de Tratamiento Activo
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Gráficas Comparativas y Evolución Temporal
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Monitoreo cuantitativo de simetría muscular, fuerza objetiva y arcos de movilidad articular
          </p>
        </div>

        {/* Metric Selector Tabs */}
        <div className="flex flex-wrap bg-slate-100 p-1 rounded-xl text-xs font-semibold text-slate-600">
          <button
            type="button"
            onClick={() => setActiveMetric('asymmetry')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              activeMetric === 'asymmetry'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'hover:text-slate-950'
            }`}
          >
            Asimetría (%)
          </button>
          <button
            type="button"
            onClick={() => setActiveMetric('strengthPain')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              activeMetric === 'strengthPain'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'hover:text-slate-950'
            }`}
          >
            Fuerza vs Dolor (EVA)
          </button>
          <button
            type="button"
            onClick={() => setActiveMetric('mobility')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              activeMetric === 'mobility'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'hover:text-slate-950'
            }`}
          >
            Movilidad (ROM)
          </button>
          <button
            type="button"
            onClick={() => setActiveMetric('radar')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              activeMetric === 'radar'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'hover:text-slate-950'
            }`}
          >
            Simetría Global (Radar)
          </button>
        </div>
      </div>

      {/* KPI Delta Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Asymmetry KPI */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 font-semibold mb-1">
            <span>Asimetría Global</span>
            <span className="flex items-center text-emerald-600 font-bold gap-0.5">
              <ArrowDownRight size={14} /> {asymmetryDelta}%
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">
              {latest.globalAsymmetryPct}%
            </span>
            <span className="text-xs text-slate-400 line-through">
              {initial.globalAsymmetryPct}%
            </span>
          </div>
          <span className="text-[11px] text-emerald-700 font-semibold block mt-1">
            ✓ Dentro del rango seguro (&lt;10%)
          </span>
        </div>

        {/* Strength KPI */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 font-semibold mb-1">
            <span>Fuerza Global</span>
            <span className="flex items-center text-emerald-600 font-bold gap-0.5">
              <ArrowUpRight size={14} /> +{strengthDelta}%
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">
              {latest.globalStrengthPct}%
            </span>
            <span className="text-xs text-slate-400">
              base: {initial.globalStrengthPct}%
            </span>
          </div>
          <span className="text-[11px] text-slate-500 block mt-1">
            Ganancia neuromuscular neta
          </span>
        </div>

        {/* Pain EVA KPI */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 font-semibold mb-1">
            <span>Dolor EVA (0-10)</span>
            <span className="flex items-center text-emerald-600 font-bold gap-0.5">
              <ArrowDownRight size={14} /> {painDelta.toFixed(1)} pts
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">
              {latest.painVAS} / 10
            </span>
            <span className="text-xs text-slate-400 line-through">
              {initial.painVAS}
            </span>
          </div>
          <span className="text-[11px] text-emerald-700 font-semibold block mt-1">
            Reducción del 77% en molestia
          </span>
        </div>

        {/* Mobility Shoulder KPI */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 font-semibold mb-1">
            <span>ROM Hombro Abducción</span>
            <span className="flex items-center text-emerald-600 font-bold gap-0.5">
              <ArrowUpRight size={14} /> +{mobilityDelta}°
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">
              {latest.shoulderMobilityDeg}°
            </span>
            <span className="text-xs text-slate-400">
              normal: 180°
            </span>
          </div>
          <span className="text-[11px] text-slate-500 block mt-1">
            Recuperación de rango terminal
          </span>
        </div>
      </div>

      {/* Main Chart Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
        {/* CHART 1: ASYMMETRY EVOLUTION */}
        {activeMetric === 'asymmetry' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Evolución de la Asimetría Global (%) por Sesión
                </h3>
                <p className="text-xs text-slate-500">
                  La meta terapéutica es mantener la asimetría por debajo del 10% (umbral fisiológico seguro).
                </p>
              </div>
              <div className="flex items-center gap-3 text-xs font-semibold">
                <span className="flex items-center gap-1 text-blue-600">
                  <span className="w-3 h-3 rounded-full bg-blue-600" />
                  Asimetría Registrada
                </span>
                <span className="flex items-center gap-1 text-emerald-600">
                  <span className="w-3 h-0.5 bg-emerald-500" />
                  Meta (&lt;10%)
                </span>
              </div>
            </div>

            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={history} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="asymmetryGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2563eb" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#2563eb" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                  <XAxis dataKey="date" stroke="#64748b" fontSize={12} tickLine={false} />
                  <YAxis stroke="#64748b" fontSize={12} unit="%" domain={[0, 30]} tickLine={false} />
                  <Tooltip
                    formatter={(value: any) => [`${value}%`, 'Asimetría']}
                    labelFormatter={(label) => `Fecha: ${label}`}
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', color: '#fff' }}
                  />
                  <Area
                    type="monotone"
                    dataKey="globalAsymmetryPct"
                    stroke="#2563eb"
                    strokeWidth={3}
                    fillOpacity={1}
                    fill="url(#asymmetryGrad)"
                  />
                  {/* Reference line for 10% threshold */}
                  <Line
                    type="monotone"
                    dataKey={() => 10}
                    stroke="#10b981"
                    strokeDasharray="4 4"
                    strokeWidth={2}
                    dot={false}
                    name="Meta terapéutica (10%)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* CHART 2: STRENGTH VS PAIN (EVA) */}
        {activeMetric === 'strengthPain' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Progreso de Fuerza Global (%) vs Escala de Dolor EVA (0-10)
                </h3>
                <p className="text-xs text-slate-500">
                  Correlación inversa esperada: al incrementar la fuerza y estabilidad, disminuye la sintomatología dolorosa.
                </p>
              </div>
              <div className="flex items-center gap-3 text-xs font-semibold">
                <span className="flex items-center gap-1 text-emerald-600">
                  <span className="w-3 h-3 rounded-full bg-emerald-500" />
                  Fuerza Global (%)
                </span>
                <span className="flex items-center gap-1 text-rose-500">
                  <span className="w-3 h-3 rounded-full bg-rose-500" />
                  Dolor EVA (0-10)
                </span>
              </div>
            </div>

            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={history} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                  <XAxis dataKey="date" stroke="#64748b" fontSize={12} tickLine={false} />
                  <YAxis yAxisId="left" stroke="#10b981" fontSize={12} unit="%" domain={[50, 100]} tickLine={false} />
                  <YAxis yAxisId="right" orientation="right" stroke="#f43f5e" fontSize={12} domain={[0, 10]} tickLine={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', color: '#fff' }}
                  />
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="globalStrengthPct"
                    stroke="#10b981"
                    strokeWidth={3}
                    dot={{ fill: '#10b981', r: 4 }}
                    name="Fuerza Global (%)"
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="painVAS"
                    stroke="#f43f5e"
                    strokeWidth={3}
                    dot={{ fill: '#f43f5e', r: 4 }}
                    name="Dolor EVA (0-10)"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* CHART 3: ROM MOBILITY */}
        {activeMetric === 'mobility' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Arcos de Movilidad Articular (Grados °)
                </h3>
                <p className="text-xs text-slate-500">
                  Medición de goniometría activa en abducción de hombro y flexión de cadera
                </p>
              </div>
              <div className="flex items-center gap-3 text-xs font-semibold">
                <span className="flex items-center gap-1 text-blue-600">
                  <span className="w-3 h-3 rounded-full bg-blue-600" />
                  Hombro (Abducción)
                </span>
                <span className="flex items-center gap-1 text-slate-600">
                  <span className="w-3 h-3 rounded-full bg-slate-500" />
                  Cadera (Flexión)
                </span>
              </div>
            </div>

            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={history} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                  <XAxis dataKey="date" stroke="#64748b" fontSize={12} tickLine={false} />
                  <YAxis stroke="#64748b" fontSize={12} unit="°" domain={[0, 180]} tickLine={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', color: '#fff' }}
                  />
                  <Bar dataKey="shoulderMobilityDeg" fill="#2563eb" radius={[4, 4, 0, 0]} name="Hombro (°)" />
                  <Bar dataKey="hipMobilityDeg" fill="#64748b" radius={[4, 4, 0, 0]} name="Cadera (°)" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* CHART 4: RADAR CHART */}
        {activeMetric === 'radar' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Perfil de Simetría Articular: Evaluación Inicial vs Actual
                </h3>
                <p className="text-xs text-slate-500">
                  Puntaje de simetría (100 = equilibrio perfecto entre hemicuerpo derecho e izquierdo).
                </p>
              </div>
              <div className="flex items-center gap-3 text-xs font-semibold">
                <span className="flex items-center gap-1 text-slate-500">
                  <span className="w-3 h-3 rounded-full bg-slate-400" />
                  Sesión 1 (Inicial)
                </span>
                <span className="flex items-center gap-1 text-blue-600">
                  <span className="w-3 h-3 rounded-full bg-blue-600" />
                  Sesión 6 (Actual)
                </span>
              </div>
            </div>

            <div className="h-80 w-full flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="75%" data={radarData}>
                  <PolarGrid stroke="#cbd5e1" />
                  <PolarAngleAxis dataKey="structure" stroke="#475569" fontSize={12} />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} stroke="#94a3b8" />
                  <Radar
                    name="Sesión Inicial"
                    dataKey="Inicial"
                    stroke="#94a3b8"
                    fill="#94a3b8"
                    fillOpacity={0.25}
                  />
                  <Radar
                    name="Sesión Actual"
                    dataKey="Actual"
                    stroke="#1d4ed8"
                    fill="#2563eb"
                    fillOpacity={0.45}
                  />
                  <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', color: '#fff' }} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>

      {/* Historical Sessions Data Table */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 bg-slate-100 px-3 py-1.5 rounded-lg inline-block">
          TABLA DE REGISTRO HISTÓRICO DE EVOLUCIÓN
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border border-slate-200 rounded-xl overflow-hidden">
            <thead className="bg-slate-50 text-slate-700 font-semibold uppercase text-[10px] tracking-wider border-b border-slate-200">
              <tr>
                <th className="p-3">Sesión</th>
                <th className="p-3">Fecha</th>
                <th className="p-3 text-center">Fuerza Global</th>
                <th className="p-3 text-center">Asimetría</th>
                <th className="p-3 text-center">Dolor EVA</th>
                <th className="p-3 text-center">Hombro ROM</th>
                <th className="p-3 text-center">Score Funcional</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {history.map((pt) => (
                <tr key={pt.sessionNumber} className="hover:bg-slate-50/70 transition-colors">
                  <td className="p-3 font-semibold text-slate-900">
                    Sesión #{pt.sessionNumber}
                  </td>
                  <td className="p-3 text-slate-600">{pt.date}</td>
                  <td className="p-3 text-center font-bold text-emerald-600">
                    {pt.globalStrengthPct}%
                  </td>
                  <td className="p-3 text-center">
                    <span
                      className={`px-2 py-0.5 rounded font-bold ${
                        pt.globalAsymmetryPct <= 10
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : pt.globalAsymmetryPct <= 20
                          ? 'bg-amber-50 text-amber-700 border border-amber-200'
                          : 'bg-rose-50 text-rose-700 border border-rose-200'
                      }`}
                    >
                      {pt.globalAsymmetryPct}%
                    </span>
                  </td>
                  <td className="p-3 text-center font-semibold text-slate-700">
                    {pt.painVAS} / 10
                  </td>
                  <td className="p-3 text-center text-slate-700">
                    {pt.shoulderMobilityDeg}°
                  </td>
                  <td className="p-3 text-center font-bold text-blue-700">
                    {pt.functionalScorePct}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
