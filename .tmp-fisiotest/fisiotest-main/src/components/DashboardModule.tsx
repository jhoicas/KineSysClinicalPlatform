import React from 'react';
import {
  Patient,
  PostureAssessment,
  MobilityAssessment,
  StrengthAssessment,
  MovementAssessment,
  TreatmentPlan,
  ProgressSessionPoint,
} from '../types';
import { NavTab } from './Sidebar';
import {
  Activity,
  Compass,
  Dumbbell,
  CheckCircle2,
  AlertCircle,
  Clock,
  ArrowRight,
  TrendingDown,
  TrendingUp,
  FileText,
  User,
  Calendar,
  Layers,
  Flame,
} from 'lucide-react';
import { PainMapAssessment } from '../types';

interface DashboardModuleProps {
  patient: Patient;
  posture: PostureAssessment;
  mobility: MobilityAssessment;
  strength: StrengthAssessment;
  movement: MovementAssessment;
  treatment: TreatmentPlan;
  history: ProgressSessionPoint[];
  painMap?: PainMapAssessment;
  onNavigateTo: (tab: NavTab) => void;
}

export const DashboardModule: React.FC<DashboardModuleProps> = ({
  patient,
  posture,
  mobility,
  strength,
  movement,
  treatment,
  history,
  painMap,
  onNavigateTo,
}) => {
  const painPointsCount = painMap?.painPoints.length || 0;
  const maxEva = painMap && painMap.painPoints.length > 0
    ? Math.max(...painMap.painPoints.map((p) => p.intensityVAS))
    : 0;
  const mobilityLimitationsCount = mobility.structures.filter(
    (s) => s.hasLeftLimitation || s.hasRightLimitation
  ).length;

  const movementIssuesCount = movement.gestures.filter((g) =>
    g.criteria.some((c) => c.selected)
  ).length;

  const latestHistory = history[history.length - 1];

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* 4 Overview Quick Status Cards matching Clean Minimalism Header Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Diagnóstico */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">
            Diagnóstico Principal
          </p>
          <p className="font-semibold text-slate-800 text-sm truncate" title={patient.diagnosticReason}>
            {patient.diagnosticReason || 'Sobrecarga y déficit miofascial'}
          </p>
        </div>

        {/* Metric 2: Nivel de Dolor (EVA) */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">
            Nivel de Dolor (EVA)
          </p>
          <div className="flex items-center gap-3">
            <span className="text-2xl font-bold text-slate-900">{latestHistory?.painVAS || 1.5}/10</span>
            <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs font-semibold">
              Mejorando
            </span>
          </div>
        </div>

        {/* Metric 3: Fuerza Global */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">
            Fuerza Global (ActivForce)
          </p>
          <div className="flex items-center gap-3">
            <span className="text-2xl font-bold text-slate-900">{strength.fuerzaGlobalPct}%</span>
            <span className="text-xs text-blue-600 font-semibold">+12% vs inicial</span>
          </div>
        </div>

        {/* Metric 4: Adherencia al Plan */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">
            Adherencia al Plan
          </p>
          <div className="flex items-center gap-3">
            <span className="text-2xl font-bold text-slate-900">
              {Math.round((treatment.sessionsCompleted / treatment.totalSessionsPlanned) * 100)}%
            </span>
            <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-semibold">
              {treatment.sessionsCompleted}/{treatment.totalSessionsPlanned} Sesiones
            </span>
          </div>
        </div>
      </div>

      {/* Clinical Modules Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {/* Pain Map Card */}
        <div
          onClick={() => onNavigateTo('painmap')}
          className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs hover:border-blue-400 hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center group-hover:bg-rose-600 group-hover:text-white transition-colors">
                <Flame size={20} />
              </div>
              <span className="text-[10px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-md uppercase">
                EVA {maxEva}/10
              </span>
            </div>
            <h2 className="font-bold text-base text-slate-900">
              Mapa del Dolor
            </h2>
            <p className="text-xs text-slate-500 mt-1 line-clamp-2">
              {painPointsCount > 0
                ? `${painPointsCount} punto(s) álgico(s) registrados con escala EVA.`
                : 'Sin puntos de dolor activos registrados.'}
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-rose-600 group-hover:text-rose-700">
            <span>Abrir Mapa de Dolor</span>
            <ArrowRight size={15} />
          </div>
        </div>

        {/* Posture Card */}
        <div
          onClick={() => onNavigateTo('posture')}
          className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs hover:border-blue-400 hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-colors">
                <User size={20} />
              </div>
              <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md uppercase">
                3 Planos
              </span>
            </div>
            <h2 className="font-bold text-base text-slate-900">
              Alineación Postural
            </h2>
            <p className="text-xs text-slate-500 mt-1 line-clamp-2">
              Elevación escapular der. y leve antepulsión de cabeza
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-blue-600 group-hover:text-blue-700">
            <span>Abrir Postura</span>
            <ArrowRight size={15} />
          </div>
        </div>

        {/* Mobility Card */}
        <div
          onClick={() => onNavigateTo('mobility')}
          className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs hover:border-blue-400 hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-colors">
                <Compass size={20} />
              </div>
              <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md uppercase">
                {mobilityLimitationsCount} Limitaciones
              </span>
            </div>
            <h2 className="font-bold text-base text-slate-900">
              Movilidad Articular
            </h2>
            <p className="text-xs text-slate-500 mt-1 line-clamp-2">
              Restricción en rotación cervical y abducción hombro der.
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-blue-600 group-hover:text-blue-700">
            <span>Abrir Movilidad</span>
            <ArrowRight size={15} />
          </div>
        </div>

        {/* Strength Card */}
        <div
          onClick={() => onNavigateTo('strength')}
          className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs hover:border-blue-400 hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                <Dumbbell size={20} />
              </div>
              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md uppercase">
                {strength.asimetriaGlobalPct}% Asimetría
              </span>
            </div>
            <h2 className="font-bold text-base text-slate-900">
              Fuerza Muscular
            </h2>
            <p className="text-xs text-slate-500 mt-1 line-clamp-2">
              {strength.fuerzaGlobalPct}% fuerza global. Evaluación con ActivForce 2.
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-blue-600 group-hover:text-blue-700">
            <span>Abrir Dinamometría</span>
            <ArrowRight size={15} />
          </div>
        </div>

        {/* Movement Control Card */}
        <div
          onClick={() => onNavigateTo('movement')}
          className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs hover:border-blue-400 hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-colors">
                <Layers size={20} />
              </div>
              <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md uppercase">
                7 Gestos
              </span>
            </div>
            <h2 className="font-bold text-base text-slate-900">
              Control Motor & Técnica
            </h2>
            <p className="text-xs text-slate-500 mt-1 line-clamp-2">
              Valoración biomecánica en salto, sentadilla y sobrecargas.
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-blue-600 group-hover:text-blue-700">
            <span>Abrir 7 Gestos</span>
            <ArrowRight size={15} />
          </div>
        </div>
      </div>

      {/* Main Section: Treatment Plan (Matching Clean Minimalism Template) + Clinical Evolution */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Treatment Plan Section (7 cols) matching Clean Minimalism style */}
        <div className="lg:col-span-7 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <span className="text-xs font-bold text-blue-600 uppercase tracking-widest block mb-0.5">
                FASE ACTUAL: {treatment.currentPhase}
              </span>
              <h3 className="font-bold text-lg text-slate-900">
                Plan de Tratamiento & Readaptación
              </h3>
            </div>
            <button
              type="button"
              onClick={() => onNavigateTo('treatment')}
              className="text-blue-600 text-xs font-semibold underline cursor-pointer hover:text-blue-800"
            >
              Editar Plan
            </button>
          </div>

          <div className="text-sm text-slate-600 bg-slate-50 p-4 rounded-xl border border-dashed border-slate-200">
            <span className="font-bold text-slate-800 not-italic block mb-1">
              Objetivo Terapéutico:
            </span>
            <span>{treatment.objective}</span>
          </div>

          <div className="space-y-3">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
              Ejercicios Asignados en Curso
            </span>

            {treatment.exercises.slice(0, 4).map((ex, index) => (
              <div key={ex.id} className="flex items-center gap-3.5 p-2.5 rounded-xl hover:bg-slate-50 transition-colors">
                {ex.imageUrl ? (
                  <img
                    src={ex.imageUrl}
                    alt={ex.name}
                    referrerPolicy="no-referrer"
                    className="w-10 h-10 rounded-lg object-cover shrink-0 border border-slate-200 bg-slate-100"
                    onError={(e) => {
                      (e.currentTarget as HTMLElement).style.display = 'none';
                    }}
                  />
                ) : (
                  <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center shrink-0 text-blue-600 font-bold text-xs">
                    {index + 1}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-xs sm:text-sm font-semibold text-slate-900 truncate">{ex.name}</p>
                  <p className="text-[11px] text-slate-500 truncate">
                    {ex.sets} × {ex.repsOrDuration} • {ex.targetMuscle}
                  </p>
                </div>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700 shrink-0">
                  {ex.category}
                </span>
              </div>
            ))}
          </div>

          <div className="pt-2 border-t border-slate-100">
            <div className="flex justify-between text-xs font-semibold text-slate-700 mb-2">
              <span>Progreso de Sesiones del Plan</span>
              <span className="text-blue-600 font-bold">
                {treatment.sessionsCompleted} de {treatment.totalSessionsPlanned} sesiones ({Math.round((treatment.sessionsCompleted / treatment.totalSessionsPlanned) * 100)}%)
              </span>
            </div>
            <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
              <div
                className="bg-blue-600 h-full rounded-full transition-all duration-500"
                style={{
                  width: `${(treatment.sessionsCompleted / treatment.totalSessionsPlanned) * 100}%`,
                }}
              />
            </div>
          </div>
        </div>

        {/* Clinical Evolution / Metrics Card (5 cols) */}
        <div className="lg:col-span-5 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <h3 className="font-bold text-lg text-slate-900">
              Evolución Cuantitativa
            </h3>
            <button
              type="button"
              onClick={() => onNavigateTo('progress')}
              className="text-xs font-semibold text-blue-600 hover:text-blue-800 underline"
            >
              Ver Gráficas
            </button>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-xl border border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs shrink-0">
                  -14%
                </div>
                <div>
                  <span className="font-semibold text-xs text-slate-900 block">
                    Reducción de Asimetría
                  </span>
                  <span className="text-[11px] text-slate-500">
                    De 22% inicial a 8% actual
                  </span>
                </div>
              </div>
              <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                Excelente
              </span>
            </div>

            <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-xl border border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs shrink-0">
                  +12%
                </div>
                <div>
                  <span className="font-semibold text-xs text-slate-900 block">
                    Aumento de Fuerza Global
                  </span>
                  <span className="text-[11px] text-slate-500">
                    De 74% a 86% de norma
                  </span>
                </div>
              </div>
              <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
                86% Total
              </span>
            </div>

            <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-xl border border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xs shrink-0">
                  -5.0
                </div>
                <div>
                  <span className="font-semibold text-xs text-slate-900 block">
                    Alivio de Dolor (EVA)
                  </span>
                  <span className="text-[11px] text-slate-500">
                    De 6.5 a 1.5 puntos
                  </span>
                </div>
              </div>
              <span className="text-xs font-bold text-green-700 bg-green-50 px-2 py-0.5 rounded">
                1.5 / 10
              </span>
            </div>
          </div>

          {/* Next appointment note */}
          <div className="p-4 bg-blue-50/70 rounded-xl border border-blue-100 text-xs text-blue-900">
            <span className="font-bold block mb-0.5 text-blue-950">Próxima sesión programada:</span>
            <span className="text-slate-600 text-xs">
              Martes 02 de Septiembre • 10:30 AM (Reevaluación de técnica en Clean y Salto)
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
