import React, { useState } from 'react';
import { PacienteClinico, EvaluacionAntropometrica } from '../../types';
import { AnthropometryPdfModal } from './AnthropometryPdfModal';

interface AnthropometryProgressTimelineProps {
  patient: PacienteClinico;
  evaluations: EvaluacionAntropometrica[];
  nutritionistName?: string;
  clinicName?: string;
  onLoadIntoCalculator?: (evaluation: EvaluacionAntropometrica) => void;
  onOpenNewEvaluation?: () => void;
}

export const AnthropometryProgressTimeline: React.FC<AnthropometryProgressTimelineProps> = ({
  patient,
  evaluations,
  nutritionistName = 'Lic. Nutrición Clínica',
  clinicName = 'KineSys Salud',
  onLoadIntoCalculator,
  onOpenNewEvaluation,
}) => {
  // Sort evaluations chronologically (oldest to newest for delta calc, newest first for display)
  const sortedAsc = [...evaluations].sort(
    (a, b) => new Date(a.evaluation_date).getTime() - new Date(b.evaluation_date).getTime()
  );
  const sortedDesc = [...evaluations].sort(
    (a, b) => new Date(b.evaluation_date).getTime() - new Date(a.evaluation_date).getTime()
  );

  const [activeSubView, setActiveSubView] = useState<'timeline' | 'table' | 'charts'>('timeline');
  const [selectedForDetail, setSelectedForDetail] = useState<EvaluacionAntropometrica | null>(null);
  const [pdfModalEval, setPdfModalEval] = useState<EvaluacionAntropometrica | null>(null);

  // Compare mode state
  const [isCompareModalOpen, setIsCompareModalOpen] = useState(false);
  const [compareIdA, setCompareIdA] = useState<string>(sortedAsc[0]?.id || '');
  const [compareIdB, setCompareIdB] = useState<string>(sortedAsc[sortedAsc.length - 1]?.id || '');

  // Baseline vs Latest metrics
  const baseline = sortedAsc.length > 0 ? sortedAsc[0] : null;
  const latest = sortedAsc.length > 0 ? sortedAsc[sortedAsc.length - 1] : null;

  const totalEvaluations = evaluations.length;

  // Cumulative Deltas
  const deltaWeight = baseline && latest ? Number((latest.weight_kg - baseline.weight_kg).toFixed(1)) : 0;
  const deltaFatPct = baseline && latest && latest.body_fat_percentage && baseline.body_fat_percentage
    ? Number((latest.body_fat_percentage - baseline.body_fat_percentage).toFixed(1))
    : 0;
  const deltaLeanMass = baseline && latest && latest.fat_free_mass_kg && baseline.fat_free_mass_kg
    ? Number((latest.fat_free_mass_kg - baseline.fat_free_mass_kg).toFixed(1))
    : 0;
  const deltaWaist = baseline && latest && latest.waist_cm && baseline.waist_cm
    ? Number((latest.waist_cm - baseline.waist_cm).toFixed(1))
    : 0;

  if (totalEvaluations === 0) {
    return (
      <div className="bg-surface-container-lowest rounded-3xl p-8 border border-outline-variant/30 text-center shadow-xs">
        <div className="w-16 h-16 rounded-2xl bg-secondary-fixed text-on-secondary-fixed flex items-center justify-center mx-auto mb-4">
          <span className="material-symbols-outlined text-3xl">history_edu</span>
        </div>
        <h3 className="text-base font-black text-on-surface mb-2">
          Sin Historial de Evaluaciones para {patient.first_name} {patient.last_name}
        </h3>
        <p className="text-xs text-on-surface-variant max-w-md mx-auto mb-6">
          Aún no se han registrado evaluaciones antropométricas para este paciente. Completa el formulario de la pestaña de evaluación activa para establecer su línea base nutricional.
        </p>
        {onOpenNewEvaluation && (
          <button
            onClick={onOpenNewEvaluation}
            className="px-5 py-2.5 bg-primary hover:bg-primary-container text-white font-extrabold text-xs rounded-2xl shadow-xs transition-colors inline-flex items-center gap-2 cursor-pointer"
          >
            <span className="material-symbols-outlined text-base">add_circle</span>
            <span>Crear Primera Evaluación Base</span>
          </button>
        )}
      </div>
    );
  }

  // Calculate delta against previous visit for any given index in sortedAsc
  const getPreviousDelta = (current: EvaluacionAntropometrica) => {
    const idx = sortedAsc.findIndex((e) => e.id === current.id);
    if (idx <= 0) return null;
    const prev = sortedAsc[idx - 1];
    return {
      prevDate: prev.evaluation_date,
      weightDiff: Number((current.weight_kg - prev.weight_kg).toFixed(1)),
      fatPctDiff: current.body_fat_percentage && prev.body_fat_percentage
        ? Number((current.body_fat_percentage - prev.body_fat_percentage).toFixed(1))
        : null,
      leanMassDiff: current.fat_free_mass_kg && prev.fat_free_mass_kg
        ? Number((current.fat_free_mass_kg - prev.fat_free_mass_kg).toFixed(1))
        : null,
      waistDiff: current.waist_cm && prev.waist_cm
        ? Number((current.waist_cm - prev.waist_cm).toFixed(1))
        : null,
    };
  };

  const evalA = evaluations.find((e) => e.id === compareIdA) || sortedAsc[0];
  const evalB = evaluations.find((e) => e.id === compareIdB) || sortedAsc[sortedAsc.length - 1];

  return (
    <div className="space-y-6">
      {/* 1. Progress Summary KPI Header Card */}
      <div className="bg-surface-container-lowest rounded-3xl p-6 border border-outline-variant/30 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-5 border-b border-outline-variant/20">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-primary/10 text-primary border border-primary/20">
                Progreso Antropométrico
              </span>
              <span className="text-xs font-bold text-on-surface-variant">
                {totalEvaluations} {totalEvaluations === 1 ? 'evaluación registrada' : 'evaluaciones en el historial'}
              </span>
            </div>
            <h3 className="text-lg font-black text-on-surface">
              Evolución de {patient.first_name} {patient.last_name}
            </h3>
            {baseline && latest && totalEvaluations > 1 && (
              <p className="text-xs text-on-surface-variant flex items-center gap-1.5 mt-0.5">
                <span className="material-symbols-outlined text-sm">calendar_month</span>
                <span>
                  Línea base: <strong className="text-on-surface">{baseline.evaluation_date}</strong> ➔ Último control: <strong className="text-on-surface">{latest.evaluation_date}</strong>
                </span>
              </p>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setPdfModalEval(latest || sortedDesc[0])}
              className="px-3.5 py-2 bg-primary hover:bg-primary-container text-white font-extrabold text-xs rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
              title="Exportar informe profesional en PDF con logo de clínica e histórico longitudinal completo"
            >
              <span className="material-symbols-outlined text-base">picture_as_pdf</span>
              <span>Exportar PDF Completo</span>
            </button>

            {totalEvaluations >= 2 && (
              <button
                onClick={() => setIsCompareModalOpen(true)}
                className="px-3.5 py-2 bg-surface-container-high hover:bg-surface-container-highest text-primary font-bold text-xs rounded-xl border border-outline-variant/40 transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
                title="Comparar dos fechas específicas lado a lado"
              >
                <span className="material-symbols-outlined text-base">compare_arrows</span>
                <span>Comparar 2 Fechas</span>
              </button>
            )}

            {/* View Mode Switcher */}
            <div className="flex items-center bg-surface-container-low p-1 rounded-2xl border border-outline-variant/30">
              <button
                onClick={() => setActiveSubView('timeline')}
                className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all flex items-center gap-1 cursor-pointer ${
                  activeSubView === 'timeline'
                    ? 'bg-surface text-primary shadow-2xs'
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                <span className="material-symbols-outlined text-sm">timeline</span>
                <span>Línea de Tiempo</span>
              </button>
              <button
                onClick={() => setActiveSubView('table')}
                className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all flex items-center gap-1 cursor-pointer ${
                  activeSubView === 'table'
                    ? 'bg-surface text-primary shadow-2xs'
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                <span className="material-symbols-outlined text-sm">table_chart</span>
                <span>Tabla Histórica</span>
              </button>
              <button
                onClick={() => setActiveSubView('charts')}
                className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all flex items-center gap-1 cursor-pointer ${
                  activeSubView === 'charts'
                    ? 'bg-surface text-primary shadow-2xs'
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                <span className="material-symbols-outlined text-sm">show_chart</span>
                <span>Gráficas</span>
              </button>
            </div>
          </div>
        </div>

        {/* Delta Stat Badges (Baseline to Latest) */}
        {totalEvaluations > 1 && baseline && latest ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-5">
            {/* Peso */}
            <div className="bg-surface-container-low p-3.5 rounded-2xl border border-outline-variant/30">
              <span className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider block mb-1">
                Peso Neto (kg)
              </span>
              <div className="flex items-baseline gap-2">
                <span className="text-xl font-black text-on-surface">{latest.weight_kg} kg</span>
                <span
                  className={`text-xs font-black px-1.5 py-0.5 rounded-md flex items-center gap-0.5 ${
                    deltaWeight <= 0
                      ? 'bg-secondary-fixed text-on-secondary-fixed'
                      : 'bg-error-container text-on-error-container'
                  }`}
                >
                  <span className="material-symbols-outlined text-xs">
                    {deltaWeight <= 0 ? 'trending_down' : 'trending_up'}
                  </span>
                  <span>{deltaWeight > 0 ? `+${deltaWeight}` : deltaWeight} kg</span>
                </span>
              </div>
              <span className="text-[10px] text-on-surface-variant mt-1 block">
                Basal: {baseline.weight_kg} kg
              </span>
            </div>

            {/* % Grasa */}
            <div className="bg-surface-container-low p-3.5 rounded-2xl border border-outline-variant/30">
              <span className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider block mb-1">
                % Grasa Corporal
              </span>
              <div className="flex items-baseline gap-2">
                <span className="text-xl font-black text-on-surface">
                  {latest.body_fat_percentage ? `${latest.body_fat_percentage}%` : 'N/A'}
                </span>
                {deltaFatPct !== 0 && (
                  <span
                    className={`text-xs font-black px-1.5 py-0.5 rounded-md flex items-center gap-0.5 ${
                      deltaFatPct <= 0
                        ? 'bg-secondary-fixed text-on-secondary-fixed'
                        : 'bg-error-container text-on-error-container'
                    }`}
                  >
                    <span className="material-symbols-outlined text-xs">
                      {deltaFatPct <= 0 ? 'trending_down' : 'trending_up'}
                    </span>
                    <span>{deltaFatPct > 0 ? `+${deltaFatPct}` : deltaFatPct}%</span>
                  </span>
                )}
              </div>
              <span className="text-[10px] text-on-surface-variant mt-1 block">
                Basal: {baseline.body_fat_percentage ? `${baseline.body_fat_percentage}%` : 'N/A'}
              </span>
            </div>

            {/* Masa Magra */}
            <div className="bg-surface-container-low p-3.5 rounded-2xl border border-outline-variant/30">
              <span className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider block mb-1">
                Masa Magra (kg)
              </span>
              <div className="flex items-baseline gap-2">
                <span className="text-xl font-black text-on-surface">
                  {latest.fat_free_mass_kg ? `${latest.fat_free_mass_kg} kg` : 'N/A'}
                </span>
                {deltaLeanMass !== 0 && (
                  <span
                    className={`text-xs font-black px-1.5 py-0.5 rounded-md flex items-center gap-0.5 ${
                      deltaLeanMass >= 0
                        ? 'bg-secondary-fixed text-on-secondary-fixed'
                        : 'bg-surface-container-highest text-on-surface'
                    }`}
                  >
                    <span className="material-symbols-outlined text-xs">
                      {deltaLeanMass >= 0 ? 'trending_up' : 'trending_down'}
                    </span>
                    <span>{deltaLeanMass > 0 ? `+${deltaLeanMass}` : deltaLeanMass} kg</span>
                  </span>
                )}
              </div>
              <span className="text-[10px] text-on-surface-variant mt-1 block">
                Basal: {baseline.fat_free_mass_kg ? `${baseline.fat_free_mass_kg} kg` : 'N/A'}
              </span>
            </div>

            {/* Perímetro Cintura */}
            <div className="bg-surface-container-low p-3.5 rounded-2xl border border-outline-variant/30">
              <span className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider block mb-1">
                Cintura Abdominal
              </span>
              <div className="flex items-baseline gap-2">
                <span className="text-xl font-black text-on-surface">
                  {latest.waist_cm ? `${latest.waist_cm} cm` : 'N/A'}
                </span>
                {deltaWaist !== 0 && (
                  <span
                    className={`text-xs font-black px-1.5 py-0.5 rounded-md flex items-center gap-0.5 ${
                      deltaWaist <= 0
                        ? 'bg-secondary-fixed text-on-secondary-fixed'
                        : 'bg-error-container text-on-error-container'
                    }`}
                  >
                    <span className="material-symbols-outlined text-xs">
                      {deltaWaist <= 0 ? 'trending_down' : 'trending_up'}
                    </span>
                    <span>{deltaWaist > 0 ? `+${deltaWaist}` : deltaWaist} cm</span>
                  </span>
                )}
              </div>
              <span className="text-[10px] text-on-surface-variant mt-1 block">
                Basal: {baseline.waist_cm ? `${baseline.waist_cm} cm` : 'N/A'}
              </span>
            </div>
          </div>
        ) : (
          <div className="pt-4 flex items-center gap-3 text-xs text-on-surface-variant">
            <span className="material-symbols-outlined text-primary text-lg">info</span>
            <span>
              Mostrando la evaluación de referencia inicial. Registra nuevos controles antropométricos periódicos para visualizar la gráfica de deltas y evolución muscular/grasa.
            </span>
          </div>
        )}
      </div>

      {/* 2. SUB-VIEW: TIMELINE (Línea de Tiempo) */}
      {activeSubView === 'timeline' && (
        <div className="relative pl-6 sm:pl-8 space-y-6 before:absolute before:left-3 sm:before:left-4 before:top-3 before:bottom-3 before:w-0.5 before:bg-outline-variant/40">
          {sortedDesc.map((ev, index) => {
            const isLatest = index === 0;
            const isOldest = index === sortedDesc.length - 1 && sortedDesc.length > 1;
            const deltaPrev = getPreviousDelta(ev);

            // Skinfold sum calculation
            const skinfoldsSum =
              (ev.skinfold_triceps_mm || 0) +
              (ev.skinfold_subscapular_mm || 0) +
              (ev.skinfold_suprailiac_mm || 0) +
              (ev.skinfold_abdominal_mm || 0);

            return (
              <div key={ev.id || index} className="relative group">
                {/* Milestone Node Badge on the timeline bar */}
                <div
                  className={`absolute -left-6 sm:-left-8 top-4 w-6 sm:w-8 h-6 sm:h-8 rounded-full border-2 flex items-center justify-center text-xs font-black shadow-xs transition-transform group-hover:scale-110 ${
                    isLatest
                      ? 'bg-primary text-white border-primary-container'
                      : isOldest
                      ? 'bg-secondary-fixed text-on-secondary-fixed border-secondary-fixed-dim'
                      : 'bg-surface-container-high text-on-surface border-outline-variant'
                  }`}
                >
                  <span className="material-symbols-outlined text-xs sm:text-sm">
                    {isLatest ? 'verified' : isOldest ? 'flag' : 'calendar_today'}
                  </span>
                </div>

                {/* Timeline Card */}
                <div className="bg-surface-container-lowest rounded-3xl p-5 sm:p-6 border border-outline-variant/30 shadow-xs hover:border-primary/40 transition-all">
                  {/* Card Header */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-outline-variant/20">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-black text-on-surface flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-base text-primary">event</span>
                        <span>{ev.evaluation_date}</span>
                      </span>

                      {isLatest && (
                        <span className="px-2 py-0.5 bg-primary/10 text-primary border border-primary/20 text-[10px] font-black uppercase rounded-lg">
                          Último Control
                        </span>
                      )}

                      {isOldest && (
                        <span className="px-2 py-0.5 bg-secondary-fixed text-on-secondary-fixed text-[10px] font-black uppercase rounded-lg">
                          Evaluación Basal
                        </span>
                      )}

                      {/* Delta vs Previous Badge */}
                      {deltaPrev && (
                        <span
                          className={`px-2 py-0.5 rounded-lg text-[11px] font-extrabold flex items-center gap-1 ${
                            deltaPrev.weightDiff <= 0
                              ? 'bg-secondary-fixed text-on-secondary-fixed'
                              : 'bg-error-container text-on-error-container'
                          }`}
                          title={`Comparado con control anterior del ${deltaPrev.prevDate}`}
                        >
                          <span className="material-symbols-outlined text-xs">
                            {deltaPrev.weightDiff <= 0 ? 'arrow_downward' : 'arrow_upward'}
                          </span>
                          <span>
                            {deltaPrev.weightDiff > 0 ? `+${deltaPrev.weightDiff}` : deltaPrev.weightDiff} kg
                          </span>
                          {deltaPrev.fatPctDiff !== null && (
                            <span className="opacity-90">
                              ({deltaPrev.fatPctDiff > 0 ? `+${deltaPrev.fatPctDiff}` : deltaPrev.fatPctDiff}%)
                            </span>
                          )}
                        </span>
                      )}
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => setSelectedForDetail(ev)}
                        className="px-2.5 py-1.5 bg-surface-container-low hover:bg-surface-container-high text-on-surface font-bold text-xs rounded-xl border border-outline-variant/30 transition-colors flex items-center gap-1 cursor-pointer"
                        title="Ver todas las métricas, pliegues y perímetros de esta evaluación"
                      >
                        <span className="material-symbols-outlined text-sm">visibility</span>
                        <span>Ficha</span>
                      </button>

                      <button
                        onClick={() => setPdfModalEval(ev)}
                        className="px-2.5 py-1.5 bg-surface-container-low hover:bg-surface-container-high text-primary font-bold text-xs rounded-xl border border-outline-variant/30 transition-colors flex items-center gap-1 cursor-pointer"
                        title="Exportar informe PDF de esta evaluación histórica"
                      >
                        <span className="material-symbols-outlined text-sm">picture_as_pdf</span>
                        <span>PDF</span>
                      </button>

                      {onLoadIntoCalculator && (
                        <button
                          onClick={() => onLoadIntoCalculator(ev)}
                          className="px-2.5 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary font-bold text-xs rounded-xl border border-primary/20 transition-colors flex items-center gap-1 cursor-pointer"
                          title="Cargar estos valores en el formulario para usar como base de un nuevo control"
                        >
                          <span className="material-symbols-outlined text-sm">content_copy</span>
                          <span>Cargar Base</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Metrics Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 py-4">
                    <div className="bg-surface-container-low p-2.5 rounded-xl border border-outline-variant/20">
                      <span className="text-[10px] text-on-surface-variant uppercase font-bold block">Peso</span>
                      <span className="text-sm font-black text-on-surface">{ev.weight_kg} kg</span>
                    </div>

                    <div className="bg-surface-container-low p-2.5 rounded-xl border border-outline-variant/20">
                      <span className="text-[10px] text-on-surface-variant uppercase font-bold block">IMC (OMS)</span>
                      <span className="text-sm font-black text-on-surface">{ev.bmi} kg/m²</span>
                    </div>

                    <div className="bg-surface-container-low p-2.5 rounded-xl border border-outline-variant/20">
                      <span className="text-[10px] text-on-surface-variant uppercase font-bold block">% Grasa</span>
                      <span className="text-sm font-black text-on-surface">
                        {ev.body_fat_percentage ? `${ev.body_fat_percentage}%` : '-'}
                      </span>
                    </div>

                    <div className="bg-surface-container-low p-2.5 rounded-xl border border-outline-variant/20">
                      <span className="text-[10px] text-on-surface-variant uppercase font-bold block">Masa Magra</span>
                      <span className="text-sm font-black text-on-surface">
                        {ev.fat_free_mass_kg ? `${ev.fat_free_mass_kg} kg` : '-'}
                      </span>
                    </div>

                    <div className="bg-surface-container-low p-2.5 rounded-xl border border-outline-variant/20">
                      <span className="text-[10px] text-on-surface-variant uppercase font-bold block">Cintura / ICC</span>
                      <span className="text-sm font-black text-on-surface">
                        {ev.waist_cm ? `${ev.waist_cm} cm` : '-'} ({ev.waist_hip_ratio || '-'})
                      </span>
                    </div>

                    <div className="bg-surface-container-low p-2.5 rounded-xl border border-outline-variant/20">
                      <span className="text-[10px] text-on-surface-variant uppercase font-bold block">Gasto Total (TDEE)</span>
                      <span className="text-sm font-black text-on-surface">
                        {ev.tdee_kcal ? `${ev.tdee_kcal} kcal` : '-'}
                      </span>
                    </div>
                  </div>

                  {/* Summary Footer: Pliegues & Clinical notes snippet */}
                  <div className="pt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-on-surface-variant border-t border-outline-variant/10">
                    <div className="flex flex-wrap items-center gap-3">
                      <span>
                        Σ 4 Pliegues: <strong className="text-on-surface">{skinfoldsSum.toFixed(1)} mm</strong>
                      </span>
                      {ev.cardiovascular_risk_level && (
                        <span className="flex items-center gap-1">
                          Riesgo CV:{' '}
                          <span
                            className={`font-bold capitalize ${
                              ev.cardiovascular_risk_level === 'alto' || ev.cardiovascular_risk_level === 'muy_alto'
                                ? 'text-error font-extrabold'
                                : 'text-on-surface'
                            }`}
                          >
                            {ev.cardiovascular_risk_level}
                          </span>
                        </span>
                      )}
                    </div>

                    {ev.clinical_notes && (
                      <p className="text-[11px] text-on-surface-variant italic max-w-xl truncate">
                        "{ev.clinical_notes}"
                      </p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 3. SUB-VIEW: COMPARATIVE TABLE (Tabla Comparativa Completa) */}
      {activeSubView === 'table' && (
        <div className="bg-surface-container-lowest rounded-3xl p-5 sm:p-6 border border-outline-variant/30 shadow-xs overflow-hidden">
          <div className="flex items-center justify-between pb-4 mb-2">
            <div>
              <h4 className="text-sm font-black text-on-surface">Matriz Antropométrica Longitudinal</h4>
              <p className="text-xs text-on-surface-variant">
                Comparativa cronológica de todas las variables clínicas evaluadas
              </p>
            </div>
            <span className="text-xs font-bold text-on-surface-variant">
              {evaluations.length} Registros
            </span>
          </div>

          <div className="overflow-x-auto -mx-5 sm:-mx-6 px-5 sm:px-6">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-outline-variant/30 text-on-surface-variant text-[11px] uppercase tracking-wider font-extrabold bg-surface-container-low/50">
                  <th className="py-3 px-3">Fecha</th>
                  <th className="py-3 px-3">Peso (kg)</th>
                  <th className="py-3 px-3">IMC</th>
                  <th className="py-3 px-3">% Grasa</th>
                  <th className="py-3 px-3">Masa Grasa</th>
                  <th className="py-3 px-3">Masa Magra</th>
                  <th className="py-3 px-3">Cintura</th>
                  <th className="py-3 px-3">Cadera</th>
                  <th className="py-3 px-3">ICC</th>
                  <th className="py-3 px-3">Σ Pliegues</th>
                  <th className="py-3 px-3">TDEE</th>
                  <th className="py-3 px-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/20">
                {sortedDesc.map((ev, i) => {
                  const skinfoldsSum =
                    (ev.skinfold_triceps_mm || 0) +
                    (ev.skinfold_subscapular_mm || 0) +
                    (ev.skinfold_suprailiac_mm || 0) +
                    (ev.skinfold_abdominal_mm || 0);

                  const deltaPrev = getPreviousDelta(ev);

                  return (
                    <tr key={ev.id || i} className="hover:bg-surface-container-low/60 transition-colors">
                      <td className="py-3 px-3 font-black text-on-surface whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span>{ev.evaluation_date}</span>
                          {i === 0 && (
                            <span className="w-2 h-2 rounded-full bg-primary" title="Último control" />
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-3 font-black text-on-surface whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span>{ev.weight_kg} kg</span>
                          {deltaPrev && (
                            <span
                              className={`text-[10px] font-extrabold px-1 rounded ${
                                deltaPrev.weightDiff <= 0
                                  ? 'bg-secondary-fixed text-on-secondary-fixed'
                                  : 'bg-error-container text-on-error-container'
                              }`}
                            >
                              {deltaPrev.weightDiff > 0 ? `+${deltaPrev.weightDiff}` : deltaPrev.weightDiff}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap">
                        <span className="font-bold text-on-surface">{ev.bmi}</span>
                      </td>
                      <td className="py-3 px-3 font-bold text-on-surface whitespace-nowrap">
                        {ev.body_fat_percentage ? `${ev.body_fat_percentage}%` : '-'}
                      </td>
                      <td className="py-3 px-3 text-on-surface-variant whitespace-nowrap">
                        {ev.fat_mass_kg ? `${ev.fat_mass_kg} kg` : '-'}
                      </td>
                      <td className="py-3 px-3 font-bold text-on-surface whitespace-nowrap">
                        {ev.fat_free_mass_kg ? `${ev.fat_free_mass_kg} kg` : '-'}
                      </td>
                      <td className="py-3 px-3 text-on-surface whitespace-nowrap">
                        {ev.waist_cm ? `${ev.waist_cm} cm` : '-'}
                      </td>
                      <td className="py-3 px-3 text-on-surface-variant whitespace-nowrap">
                        {ev.hip_cm ? `${ev.hip_cm} cm` : '-'}
                      </td>
                      <td className="py-3 px-3 text-on-surface whitespace-nowrap">
                        <span className="font-mono font-bold">{ev.waist_hip_ratio || '-'}</span>
                      </td>
                      <td className="py-3 px-3 text-on-surface-variant whitespace-nowrap">
                        {skinfoldsSum > 0 ? `${skinfoldsSum.toFixed(1)} mm` : '-'}
                      </td>
                      <td className="py-3 px-3 font-black text-on-surface whitespace-nowrap">
                        {ev.tdee_kcal ? `${ev.tdee_kcal} kcal` : '-'}
                      </td>
                      <td className="py-3 px-3 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => setSelectedForDetail(ev)}
                            className="p-1 text-on-surface-variant hover:text-primary hover:bg-surface-container-high rounded-lg transition-colors cursor-pointer"
                            title="Ver Ficha Completa"
                          >
                            <span className="material-symbols-outlined text-base">visibility</span>
                          </button>
                          <button
                            onClick={() => setPdfModalEval(ev)}
                            className="p-1 text-primary hover:bg-primary/10 rounded-lg transition-colors cursor-pointer"
                            title="Exportar PDF"
                          >
                            <span className="material-symbols-outlined text-base">picture_as_pdf</span>
                          </button>
                          {onLoadIntoCalculator && (
                            <button
                              onClick={() => onLoadIntoCalculator(ev)}
                              className="p-1 text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high rounded-lg transition-colors cursor-pointer"
                              title="Cargar en Calculador"
                            >
                              <span className="material-symbols-outlined text-base">content_copy</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 4. SUB-VIEW: VISUAL EVOLUTION CHARTS (Gráficas de Tendencia) */}
      {activeSubView === 'charts' && (
        <div className="space-y-6">
          {/* Chart 1: Peso vs Masa Magra */}
          <div className="bg-surface-container-lowest rounded-3xl p-6 border border-outline-variant/30 shadow-xs">
            <div className="flex flex-wrap items-center justify-between gap-3 pb-4 mb-4 border-b border-outline-variant/20">
              <div>
                <h4 className="text-sm font-black text-on-surface flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-base">monitoring</span>
                  <span>Evolución de Peso Total vs Masa Magra (kg)</span>
                </h4>
                <p className="text-xs text-on-surface-variant">
                  Permite verificar si la reducción de peso corresponde a pérdida de grasa preservando la masa muscular
                </p>
              </div>

              <div className="flex items-center gap-4 text-xs font-bold">
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-primary" />
                  <span>Peso Total (kg)</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-secondary" />
                  <span>Masa Magra (kg)</span>
                </span>
              </div>
            </div>

            {/* Render Bars / Progression visualization */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {sortedAsc.map((ev, idx) => {
                const fatKg = ev.fat_mass_kg || (ev.weight_kg * (ev.body_fat_percentage || 20)) / 100;
                const leanKg = ev.fat_free_mass_kg || ev.weight_kg - fatKg;
                const leanPct = ((leanKg / ev.weight_kg) * 100).toFixed(0);
                const fatPct = ((fatKg / ev.weight_kg) * 100).toFixed(0);

                return (
                  <div
                    key={ev.id || idx}
                    className="bg-surface-container-low p-4 rounded-2xl border border-outline-variant/30 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-on-surface">{ev.evaluation_date}</span>
                      <span className="text-xs font-extrabold text-primary">{ev.weight_kg} kg</span>
                    </div>

                    {/* Proportional Split Bar */}
                    <div className="space-y-1">
                      <div className="h-4 w-full bg-surface-container-highest rounded-full overflow-hidden flex">
                        <div
                          style={{ width: `${leanPct}%` }}
                          className="bg-secondary h-full transition-all"
                          title={`Masa Magra: ${leanKg.toFixed(1)} kg (${leanPct}%)`}
                        />
                        <div
                          style={{ width: `${fatPct}%` }}
                          className="bg-primary h-full transition-all"
                          title={`Masa Grasa: ${fatKg.toFixed(1)} kg (${fatPct}%)`}
                        />
                      </div>
                      <div className="flex justify-between text-[10px] font-bold text-on-surface-variant">
                        <span>Masa Magra: {leanKg.toFixed(1)} kg</span>
                        <span>Grasa: {fatKg.toFixed(1)} kg</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-1 border-t border-outline-variant/20 text-[11px]">
                      <div>
                        <span className="text-on-surface-variant block text-[10px]">IMC:</span>
                        <span className="font-bold text-on-surface">{ev.bmi}</span>
                      </div>
                      <div>
                        <span className="text-on-surface-variant block text-[10px]">% Grasa:</span>
                        <span className="font-bold text-on-surface">{ev.body_fat_percentage || '-'}%</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Chart 2: Perímetro de Cintura y Pliegues */}
          <div className="bg-surface-container-lowest rounded-3xl p-6 border border-outline-variant/30 shadow-xs">
            <div className="flex flex-wrap items-center justify-between gap-3 pb-4 mb-4 border-b border-outline-variant/20">
              <div>
                <h4 className="text-sm font-black text-on-surface flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-base">straighten</span>
                  <span>Evolución de Perímetro de Cintura (cm) & Pliegue Abdominal (mm)</span>
                </h4>
                <p className="text-xs text-on-surface-variant">
                  Indicadores directos de reducción de adiposidad central y riesgo metabólico cardiovascular
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {sortedAsc.map((ev, idx) => (
                <div
                  key={ev.id || idx}
                  className="bg-surface-container-low p-4 rounded-2xl border border-outline-variant/30 space-y-2.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-on-surface">{ev.evaluation_date}</span>
                    <span className="text-xs font-bold px-2 py-0.5 bg-surface-container-highest rounded-lg text-on-surface">
                      ICC: {ev.waist_hip_ratio || '-'}
                    </span>
                  </div>

                  <div className="space-y-1.5 text-xs">
                    <div className="flex justify-between items-center">
                      <span className="text-on-surface-variant">Cintura:</span>
                      <strong className="text-on-surface">{ev.waist_cm ? `${ev.waist_cm} cm` : '-'}</strong>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-on-surface-variant">Cadera:</span>
                      <span className="text-on-surface">{ev.hip_cm ? `${ev.hip_cm} cm` : '-'}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-on-surface-variant">Pliegue Abdominal:</span>
                      <strong className="text-primary font-bold">
                        {ev.skinfold_abdominal_mm ? `${ev.skinfold_abdominal_mm} mm` : '-'}
                      </strong>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-on-surface-variant">Pliegue Tríceps:</span>
                      <span className="text-on-surface">
                        {ev.skinfold_triceps_mm ? `${ev.skinfold_triceps_mm} mm` : '-'}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 5. MODAL: DETALLE COMPLETO DE EVALUACIÓN HISTÓRICA */}
      {selectedForDetail && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-surface-container-lowest rounded-3xl p-6 max-w-3xl w-full max-h-[90vh] overflow-y-auto border border-outline-variant/40 shadow-xl space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-outline-variant/30">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
                  <span className="material-symbols-outlined text-2xl">medical_information</span>
                </div>
                <div>
                  <h3 className="text-base font-black text-on-surface">
                    Ficha de Evaluación Antropométrica
                  </h3>
                  <p className="text-xs text-on-surface-variant">
                    {patient.first_name} {patient.last_name} • Fecha: {selectedForDetail.evaluation_date}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setSelectedForDetail(null)}
                className="p-1.5 rounded-full hover:bg-surface-container-high text-on-surface-variant transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-xl">close</span>
              </button>
            </div>

            {/* Key Metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-surface-container-low p-3 rounded-2xl border border-outline-variant/20">
                <span className="text-[10px] font-bold text-on-surface-variant uppercase">Peso Corporal</span>
                <p className="text-base font-black text-on-surface">{selectedForDetail.weight_kg} kg</p>
              </div>
              <div className="bg-surface-container-low p-3 rounded-2xl border border-outline-variant/20">
                <span className="text-[10px] font-bold text-on-surface-variant uppercase">Estatura</span>
                <p className="text-base font-black text-on-surface">{selectedForDetail.height_cm} cm</p>
              </div>
              <div className="bg-surface-container-low p-3 rounded-2xl border border-outline-variant/20">
                <span className="text-[10px] font-bold text-on-surface-variant uppercase">IMC (OMS)</span>
                <p className="text-base font-black text-on-surface">{selectedForDetail.bmi}</p>
              </div>
              <div className="bg-surface-container-low p-3 rounded-2xl border border-outline-variant/20">
                <span className="text-[10px] font-bold text-on-surface-variant uppercase">% Grasa Corporal</span>
                <p className="text-base font-black text-on-surface">
                  {selectedForDetail.body_fat_percentage ? `${selectedForDetail.body_fat_percentage}%` : 'N/A'}
                </p>
              </div>
            </div>

            {/* Skinfolds & Circumferences Breakdown */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Pliegues */}
              <div className="bg-surface-container-low p-4 rounded-2xl border border-outline-variant/20 space-y-2">
                <h5 className="text-xs font-black text-on-surface uppercase tracking-wider flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-sm text-primary">pinch</span>
                  <span>Pliegues Cutáneos (mm)</span>
                </h5>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="flex justify-between py-1 border-b border-outline-variant/10">
                    <span className="text-on-surface-variant">Tríceps:</span>
                    <strong className="text-on-surface">{selectedForDetail.skinfold_triceps_mm || '-'} mm</strong>
                  </div>
                  <div className="flex justify-between py-1 border-b border-outline-variant/10">
                    <span className="text-on-surface-variant">Subescapular:</span>
                    <strong className="text-on-surface">{selectedForDetail.skinfold_subscapular_mm || '-'} mm</strong>
                  </div>
                  <div className="flex justify-between py-1 border-b border-outline-variant/10">
                    <span className="text-on-surface-variant">Suprailíaco:</span>
                    <strong className="text-on-surface">{selectedForDetail.skinfold_suprailiac_mm || '-'} mm</strong>
                  </div>
                  <div className="flex justify-between py-1 border-b border-outline-variant/10">
                    <span className="text-on-surface-variant">Abdominal:</span>
                    <strong className="text-on-surface">{selectedForDetail.skinfold_abdominal_mm || '-'} mm</strong>
                  </div>
                  <div className="flex justify-between py-1 border-b border-outline-variant/10">
                    <span className="text-on-surface-variant">Bíceps:</span>
                    <strong className="text-on-surface">{selectedForDetail.skinfold_biceps_mm || '-'} mm</strong>
                  </div>
                  <div className="flex justify-between py-1 border-b border-outline-variant/10">
                    <span className="text-on-surface-variant">Muslo:</span>
                    <strong className="text-on-surface">{selectedForDetail.skinfold_thigh_mm || '-'} mm</strong>
                  </div>
                  <div className="flex justify-between py-1 border-b border-outline-variant/10">
                    <span className="text-on-surface-variant">Pantorrilla:</span>
                    <strong className="text-on-surface">{selectedForDetail.skinfold_calf_mm || '-'} mm</strong>
                  </div>
                </div>
              </div>

              {/* Perímetros */}
              <div className="bg-surface-container-low p-4 rounded-2xl border border-outline-variant/20 space-y-2">
                <h5 className="text-xs font-black text-on-surface uppercase tracking-wider flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-sm text-primary">straighten</span>
                  <span>Perímetros Corporales (cm)</span>
                </h5>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="flex justify-between py-1 border-b border-outline-variant/10">
                    <span className="text-on-surface-variant">Cintura:</span>
                    <strong className="text-on-surface">{selectedForDetail.waist_cm || '-'} cm</strong>
                  </div>
                  <div className="flex justify-between py-1 border-b border-outline-variant/10">
                    <span className="text-on-surface-variant">Cadera:</span>
                    <strong className="text-on-surface">{selectedForDetail.hip_cm || '-'} cm</strong>
                  </div>
                  <div className="flex justify-between py-1 border-b border-outline-variant/10">
                    <span className="text-on-surface-variant">Brazo Relajado:</span>
                    <strong className="text-on-surface">{selectedForDetail.relaxed_arm_cm || '-'} cm</strong>
                  </div>
                  <div className="flex justify-between py-1 border-b border-outline-variant/10">
                    <span className="text-on-surface-variant">Brazo Contraído:</span>
                    <strong className="text-on-surface">{selectedForDetail.contracted_arm_cm || '-'} cm</strong>
                  </div>
                  <div className="flex justify-between py-1 border-b border-outline-variant/10">
                    <span className="text-on-surface-variant">Muslo:</span>
                    <strong className="text-on-surface">{selectedForDetail.thigh_cm || '-'} cm</strong>
                  </div>
                  <div className="flex justify-between py-1 border-b border-outline-variant/10">
                    <span className="text-on-surface-variant">Pantorrilla:</span>
                    <strong className="text-on-surface">{selectedForDetail.calf_cm || '-'} cm</strong>
                  </div>
                  <div className="flex justify-between py-1 border-b border-outline-variant/10">
                    <span className="text-on-surface-variant">Cuello:</span>
                    <strong className="text-on-surface">{selectedForDetail.neck_cm || '-'} cm</strong>
                  </div>
                </div>
              </div>
            </div>

            {/* Energetics & Cardio */}
            <div className="bg-surface-container-low p-4 rounded-2xl border border-outline-variant/20 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div>
                <span className="text-on-surface-variant block text-[10px] uppercase font-bold">Tasa Basal (BMR)</span>
                <strong className="text-sm text-on-surface">{selectedForDetail.bmr_kcal} kcal</strong>
              </div>
              <div>
                <span className="text-on-surface-variant block text-[10px] uppercase font-bold">Gasto Total (TDEE)</span>
                <strong className="text-sm text-on-surface">{selectedForDetail.tdee_kcal} kcal</strong>
              </div>
              <div>
                <span className="text-on-surface-variant block text-[10px] uppercase font-bold">Índice Cintura/Cadera</span>
                <strong className="text-sm text-on-surface">{selectedForDetail.waist_hip_ratio}</strong>
              </div>
              <div>
                <span className="text-on-surface-variant block text-[10px] uppercase font-bold">Riesgo Cardiovascular</span>
                <strong className="text-sm text-on-surface capitalize">{selectedForDetail.cardiovascular_risk_level}</strong>
              </div>
            </div>

            {/* Clinical Observations */}
            <div className="space-y-1">
              <span className="text-[11px] font-bold text-on-surface uppercase">Observaciones Clínicas:</span>
              <p className="p-3 bg-surface-container-low rounded-xl text-xs text-on-surface border border-outline-variant/20 italic">
                {selectedForDetail.clinical_notes || 'Sin notas clínicas registradas para esta sesión.'}
              </p>
            </div>

            {/* Footer Modal Actions */}
            <div className="pt-2 flex flex-wrap items-center justify-between gap-2 border-t border-outline-variant/20">
              {onLoadIntoCalculator && (
                <button
                  onClick={() => {
                    onLoadIntoCalculator(selectedForDetail);
                    setSelectedForDetail(null);
                  }}
                  className="px-4 py-2 bg-surface-container-high hover:bg-surface-container-highest text-on-surface font-bold text-xs rounded-xl border border-outline-variant/40 transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-base">content_copy</span>
                  <span>Cargar en Calculador Activo</span>
                </button>
              )}

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPdfModalEval(selectedForDetail)}
                  className="px-4 py-2 bg-primary hover:bg-primary-container text-white font-extrabold text-xs rounded-xl shadow-xs transition-colors flex items-center gap-2 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-base">picture_as_pdf</span>
                  <span>Exportar Informe PDF</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 6. MODAL: COMPARADOR LADO A LADO ENTRE 2 FECHAS */}
      {isCompareModalOpen && evalA && evalB && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-surface-container-lowest rounded-3xl p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto border border-outline-variant/40 shadow-xl space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-outline-variant/30">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-secondary-fixed text-on-secondary-fixed flex items-center justify-center">
                  <span className="material-symbols-outlined text-2xl">compare_arrows</span>
                </div>
                <div>
                  <h3 className="text-base font-black text-on-surface">
                    Comparativa Evolutiva de 2 Controles
                  </h3>
                  <p className="text-xs text-on-surface-variant">
                    {patient.first_name} {patient.last_name} • Análisis de deltas antropométricas
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsCompareModalOpen(false)}
                className="p-1.5 rounded-full hover:bg-surface-container-high text-on-surface-variant transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-xl">close</span>
              </button>
            </div>

            {/* Selectors for Date A and Date B */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-surface-container-low p-3.5 rounded-2xl border border-outline-variant/30 space-y-1">
                <label className="text-[11px] font-bold text-on-surface-variant uppercase">
                  Control Base (Fecha A):
                </label>
                <select
                  value={compareIdA}
                  onChange={(e) => setCompareIdA(e.target.value)}
                  className="w-full bg-surface-container-lowest border border-outline-variant/40 rounded-xl px-3 py-2 text-xs font-bold text-on-surface focus:outline-primary"
                >
                  {sortedAsc.map((ev) => (
                    <option key={ev.id} value={ev.id}>
                      {ev.evaluation_date} — {ev.weight_kg} kg ({ev.body_fat_percentage || '-'}% grasa)
                    </option>
                  ))}
                </select>
              </div>

              <div className="bg-surface-container-low p-3.5 rounded-2xl border border-outline-variant/30 space-y-1">
                <label className="text-[11px] font-bold text-on-surface-variant uppercase">
                  Control Posterior (Fecha B):
                </label>
                <select
                  value={compareIdB}
                  onChange={(e) => setCompareIdB(e.target.value)}
                  className="w-full bg-surface-container-lowest border border-outline-variant/40 rounded-xl px-3 py-2 text-xs font-bold text-on-surface focus:outline-primary"
                >
                  {sortedAsc.map((ev) => (
                    <option key={ev.id} value={ev.id}>
                      {ev.evaluation_date} — {ev.weight_kg} kg ({ev.body_fat_percentage || '-'}% grasa)
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Comparison Matrix */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-outline-variant/30 bg-surface-container-low text-on-surface-variant text-[11px] uppercase font-bold">
                    <th className="py-2.5 px-3">Variable Clínica</th>
                    <th className="py-2.5 px-3">Fecha A ({evalA.evaluation_date})</th>
                    <th className="py-2.5 px-3">Fecha B ({evalB.evaluation_date})</th>
                    <th className="py-2.5 px-3">Diferencia Neta (Δ B - A)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/20">
                  {/* Peso */}
                  <tr>
                    <td className="py-2.5 px-3 font-bold text-on-surface">Peso Corporal</td>
                    <td className="py-2.5 px-3 font-medium text-on-surface">{evalA.weight_kg} kg</td>
                    <td className="py-2.5 px-3 font-medium text-on-surface">{evalB.weight_kg} kg</td>
                    <td className="py-2.5 px-3 font-black">
                      {(() => {
                        const d = Number((evalB.weight_kg - evalA.weight_kg).toFixed(1));
                        return (
                          <span
                            className={`px-2 py-0.5 rounded text-xs ${
                              d <= 0
                                ? 'bg-secondary-fixed text-on-secondary-fixed'
                                : 'bg-error-container text-on-error-container'
                            }`}
                          >
                            {d > 0 ? `+${d}` : d} kg
                          </span>
                        );
                      })()}
                    </td>
                  </tr>

                  {/* IMC */}
                  <tr>
                    <td className="py-2.5 px-3 font-bold text-on-surface">IMC (OMS)</td>
                    <td className="py-2.5 px-3 font-medium text-on-surface">{evalA.bmi}</td>
                    <td className="py-2.5 px-3 font-medium text-on-surface">{evalB.bmi}</td>
                    <td className="py-2.5 px-3 font-black">
                      {(() => {
                        const d = Number((evalB.bmi - evalA.bmi).toFixed(1));
                        return <span>{d > 0 ? `+${d}` : d}</span>;
                      })()}
                    </td>
                  </tr>

                  {/* % Grasa */}
                  <tr>
                    <td className="py-2.5 px-3 font-bold text-on-surface">% Grasa Corporal</td>
                    <td className="py-2.5 px-3 font-medium text-on-surface">{evalA.body_fat_percentage || '-'}%</td>
                    <td className="py-2.5 px-3 font-medium text-on-surface">{evalB.body_fat_percentage || '-'}%</td>
                    <td className="py-2.5 px-3 font-black">
                      {evalA.body_fat_percentage && evalB.body_fat_percentage ? (
                        (() => {
                          const d = Number((evalB.body_fat_percentage - evalA.body_fat_percentage).toFixed(1));
                          return (
                            <span
                              className={`px-2 py-0.5 rounded text-xs ${
                                d <= 0
                                  ? 'bg-secondary-fixed text-on-secondary-fixed'
                                  : 'bg-error-container text-on-error-container'
                              }`}
                            >
                              {d > 0 ? `+${d}` : d}%
                            </span>
                          );
                        })()
                      ) : (
                        '-'
                      )}
                    </td>
                  </tr>

                  {/* Masa Magra */}
                  <tr>
                    <td className="py-2.5 px-3 font-bold text-on-surface">Masa Magra (Libre de Grasa)</td>
                    <td className="py-2.5 px-3 font-medium text-on-surface">{evalA.fat_free_mass_kg || '-'} kg</td>
                    <td className="py-2.5 px-3 font-medium text-on-surface">{evalB.fat_free_mass_kg || '-'} kg</td>
                    <td className="py-2.5 px-3 font-black">
                      {evalA.fat_free_mass_kg && evalB.fat_free_mass_kg ? (
                        (() => {
                          const d = Number((evalB.fat_free_mass_kg - evalA.fat_free_mass_kg).toFixed(1));
                          return (
                            <span
                              className={`px-2 py-0.5 rounded text-xs ${
                                d >= 0
                                  ? 'bg-secondary-fixed text-on-secondary-fixed'
                                  : 'bg-surface-container-highest text-on-surface'
                              }`}
                            >
                              {d > 0 ? `+${d}` : d} kg
                            </span>
                          );
                        })()
                      ) : (
                        '-'
                      )}
                    </td>
                  </tr>

                  {/* Cintura */}
                  <tr>
                    <td className="py-2.5 px-3 font-bold text-on-surface">Perímetro Cintura</td>
                    <td className="py-2.5 px-3 font-medium text-on-surface">{evalA.waist_cm || '-'} cm</td>
                    <td className="py-2.5 px-3 font-medium text-on-surface">{evalB.waist_cm || '-'} cm</td>
                    <td className="py-2.5 px-3 font-black">
                      {evalA.waist_cm && evalB.waist_cm ? (
                        (() => {
                          const d = Number((evalB.waist_cm - evalA.waist_cm).toFixed(1));
                          return (
                            <span
                              className={`px-2 py-0.5 rounded text-xs ${
                                d <= 0
                                  ? 'bg-secondary-fixed text-on-secondary-fixed'
                                  : 'bg-error-container text-on-error-container'
                              }`}
                            >
                              {d > 0 ? `+${d}` : d} cm
                            </span>
                          );
                        })()
                      ) : (
                        '-'
                      )}
                    </td>
                  </tr>

                  {/* Pliegue Abdominal */}
                  <tr>
                    <td className="py-2.5 px-3 font-bold text-on-surface">Pliegue Abdominal</td>
                    <td className="py-2.5 px-3 font-medium text-on-surface">{evalA.skinfold_abdominal_mm || '-'} mm</td>
                    <td className="py-2.5 px-3 font-medium text-on-surface">{evalB.skinfold_abdominal_mm || '-'} mm</td>
                    <td className="py-2.5 px-3 font-black">
                      {evalA.skinfold_abdominal_mm && evalB.skinfold_abdominal_mm ? (
                        (() => {
                          const d = Number((evalB.skinfold_abdominal_mm - evalA.skinfold_abdominal_mm).toFixed(1));
                          return (
                            <span
                              className={`px-2 py-0.5 rounded text-xs ${
                                d <= 0
                                  ? 'bg-secondary-fixed text-on-secondary-fixed'
                                  : 'bg-error-container text-on-error-container'
                              }`}
                            >
                              {d > 0 ? `+${d}` : d} mm
                            </span>
                          );
                        })()
                      ) : (
                        '-'
                      )}
                    </td>
                  </tr>

                  {/* Gasto Total */}
                  <tr>
                    <td className="py-2.5 px-3 font-bold text-on-surface">Gasto Calórico Total (TDEE)</td>
                    <td className="py-2.5 px-3 font-medium text-on-surface">{evalA.tdee_kcal || '-'} kcal</td>
                    <td className="py-2.5 px-3 font-medium text-on-surface">{evalB.tdee_kcal || '-'} kcal</td>
                    <td className="py-2.5 px-3 font-black">
                      {evalA.tdee_kcal && evalB.tdee_kcal ? (
                        (() => {
                          const d = evalB.tdee_kcal - evalA.tdee_kcal;
                          return <span>{d > 0 ? `+${d}` : d} kcal</span>;
                        })()
                      ) : (
                        '-'
                      )}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setIsCompareModalOpen(false)}
                className="px-5 py-2 bg-surface-container-high hover:bg-surface-container-highest text-on-surface font-bold text-xs rounded-xl cursor-pointer transition-colors"
              >
                Cerrar Comparativa
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 7. PDF Modal for Specific Historical Record */}
      {pdfModalEval && (
        <AnthropometryPdfModal
          isOpen={true}
          onClose={() => setPdfModalEval(null)}
          patient={patient}
          evaluation={pdfModalEval}
          historyEvaluations={evaluations}
          nutritionistName={nutritionistName}
          clinicName={clinicName}
        />
      )}
    </div>
  );
};
