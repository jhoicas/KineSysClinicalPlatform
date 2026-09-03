import React, { useRef, useState } from 'react';
import { PostureAssessment } from '../../types';
import { HumanBodyVisualizer } from './HumanBodyVisualizer';
import { postureFindingsFor } from '../../data/kinesiologyCatalog';

export interface PostureModuleProps {
  formState: PostureAssessment;
  onUpdateLandmark: (
    view: 'anterior' | 'lateral' | 'posterior',
    landmark: string,
    severity: string
  ) => void;
  onUpdateText?: (field: 'observaciones_generales' | 'diagnostico_kinesico', value: string) => void;
  conceptGlobal?: string;
  observacionesGenerales?: string;
  onUpdateConcepto?: (value: string) => void;
  readOnly?: boolean;
}

const VISUALIZER_PART_TO_LANDMARK: Record<string, string> = {
  cabeza: 'Cabeza',
  hombros: 'Hombros',
  pelvis: 'Pelvis',
  rodillas: 'Rodillas',
  pies: 'Pies',
  columnaDorsal: 'Cifosis dorsal',
  columnaLumbar: 'Lordosis lumbar',
  escapulas: 'Escápulas',
  columna: 'Columna',
  talones: 'Pies',
};

function findingOf(
  data: PostureAssessment,
  view: 'anterior' | 'lateral' | 'posterior',
  landmark: string
) {
  return data[view].landmarks.find((lm) => lm.landmark === landmark)?.finding || '';
}

function isNeutralFinding(view: 'anterior' | 'lateral' | 'posterior', landmark: string, value: string) {
  const opts = postureFindingsFor(view, landmark);
  return !value || value === opts[0];
}

const Icon: React.FC<{ name: string; className?: string }> = ({ name, className = '' }) => (
  <span className={`material-symbols-outlined text-[16px] leading-none ${className}`}>{name}</span>
);

const FindingButtons: React.FC<{
  view: 'anterior' | 'lateral' | 'posterior';
  landmark: string;
  label: string;
  value: string;
  cols?: 2 | 3;
  disabled?: boolean;
  highlighted?: boolean;
  onSelect: (value: string) => void;
}> = ({ view, landmark, label, value, cols = 3, disabled, highlighted, onSelect }) => {
  const options = postureFindingsFor(view, landmark);
  const grid = cols === 2 ? 'grid-cols-2' : 'grid-cols-3';
  return (
    <div
      className={`bg-surface-container-low/70 p-3 rounded-xl border space-y-1.5 ${
        highlighted ? 'border-primary ring-2 ring-primary/20' : 'border-outline-variant/15'
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <label className="text-xs font-bold text-on-surface flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-primary shrink-0" />
          {label}
        </label>
        <span className="text-[11px] font-semibold text-on-surface-variant truncate">{value || '—'}</span>
      </div>
      <div className={`grid ${grid} gap-2 text-xs`}>
        {options.map((opt) => {
          const aligned = isNeutralFinding(view, landmark, opt);
          const active = value === opt;
          return (
            <button
              key={opt}
              type="button"
              disabled={disabled}
              onClick={() => onSelect(opt)}
              className={`px-2 py-2 rounded-xl border text-center transition-all flex items-center justify-center gap-1.5 disabled:opacity-70 ${
                active
                  ? aligned
                    ? 'bg-emerald-50 border-emerald-500 text-emerald-900 font-bold'
                    : 'bg-primary/10 border-primary text-primary font-bold'
                  : 'bg-surface-container-lowest border-outline-variant/30 text-on-surface-variant hover:bg-surface-container-low'
              }`}
            >
              <span className={`w-2 h-2 rounded-full shrink-0 ${aligned ? 'bg-emerald-500' : 'bg-primary'}`} />
              <span className="truncate">{opt}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export const PostureModule: React.FC<PostureModuleProps> = ({
  formState,
  onUpdateLandmark,
  onUpdateText,
  conceptGlobal,
  observacionesGenerales,
  onUpdateConcepto,
  readOnly = false,
}) => {
  const [activeViewTab, setActiveViewTab] = useState<'all' | 'anterior' | 'lateral' | 'posterior'>('all');
  const [viewMode, setViewMode] = useState<'muscular' | 'skeletal'>('muscular');
  const [showPlumbLine, setShowPlumbLine] = useState(true);
  const [showAngles, setShowAngles] = useState(true);
  const [showGhostIdeal, setShowGhostIdeal] = useState(true);
  const [activeLandmarkHighlight, setActiveLandmarkHighlight] = useState<string | null>(null);

  const anteriorRef = useRef<HTMLDivElement>(null);
  const lateralRef = useRef<HTMLDivElement>(null);
  const posteriorRef = useRef<HTMLDivElement>(null);

  const setFinding = (
    view: 'anterior' | 'lateral' | 'posterior',
    landmark: string,
    value: string
  ) => {
    if (readOnly) return;
    onUpdateLandmark(view, landmark, value);
  };

  const handleSelectLandmarkFromModel = (
    view: 'anterior' | 'lateral' | 'posterior',
    part: string
  ) => {
    const landmark = VISUALIZER_PART_TO_LANDMARK[part] || part;
    setActiveLandmarkHighlight(`${view}-${landmark}`);
    window.setTimeout(() => setActiveLandmarkHighlight(null), 2800);
    const ref = view === 'anterior' ? anteriorRef : view === 'lateral' ? lateralRef : posteriorRef;
    ref.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  };

  const applyNeutral = () => {
    (['anterior', 'lateral', 'posterior'] as const).forEach((view) => {
      formState[view].landmarks.forEach((lm) => {
        const first = postureFindingsFor(view, lm.landmark)[0] || '';
        onUpdateLandmark(view, lm.landmark, first);
      });
    });
    onUpdateConcepto?.('Adecuado');
  };

  const applyKyphosisValgus = () => {
    setFinding('anterior', 'Hombros', 'Elevado D');
    setFinding('anterior', 'Rodillas', 'Valgo');
    setFinding('anterior', 'Pies', 'Pronación');
    setFinding('lateral', 'Cabeza', 'Anteriorizada');
    setFinding('lateral', 'Hombros', 'Protracción');
    setFinding('lateral', 'Cifosis dorsal', 'Hipercifosis');
    setFinding('lateral', 'Lordosis lumbar', 'Hiperlordosis');
    setFinding('lateral', 'Pelvis', 'Anteversión');
    onUpdateConcepto?.('Alteración marcada');
  };

  const applyScoliosis = () => {
    setFinding('anterior', 'Cabeza', 'Derecha');
    setFinding('anterior', 'Hombros', 'Elevado I');
    setFinding('anterior', 'Pelvis', 'Elevada D');
    setFinding('anterior', 'Rodillas', 'Varo');
    setFinding('posterior', 'Escápulas', 'Escápula alada');
    setFinding('posterior', 'Columna', 'Desviación derecha');
    setFinding('posterior', 'Pelvis', 'Asimetría');
    onUpdateConcepto?.('Alteración moderada');
  };

  const countDeviations = (view: 'anterior' | 'lateral' | 'posterior') =>
    formState[view].landmarks.filter((lm) => !isNeutralFinding(view, lm.landmark, lm.finding || '')).length;

  const anteriorDeviations = countDeviations('anterior');
  const lateralDeviations = countDeviations('lateral');
  const posteriorDeviations = countDeviations('posterior');
  const totalDeviations = anteriorDeviations + lateralDeviations + posteriorDeviations;
  const symmetryScore = Math.max(20, Math.round(100 - totalDeviations * 6.5));
  const concepto = conceptGlobal ?? formState.concepto ?? '';

  const visualizer = (view: 'anterior' | 'lateral' | 'posterior') => (
    <HumanBodyVisualizer
      data={formState}
      activeView={view}
      onSelectLandmark={handleSelectLandmarkFromModel}
      viewMode={viewMode}
      showPlumbLine={showPlumbLine}
      showAngles={showAngles}
      showGhostIdeal={showGhostIdeal}
      hideToolbar
      hideCardWrapper
      hideViewTitle
    />
  );

  const viewShell = (
    view: 'anterior' | 'lateral' | 'posterior',
    ref: React.RefObject<HTMLDivElement | null>,
    title: string,
    paramsLabel: string,
    okLabel: string,
    warnLabel: string,
    deviations: number,
    modelLabel: string,
    controls: React.ReactNode
  ) => (
    <div
      ref={ref}
      className={`bg-surface-container-lowest rounded-2xl border p-5 sm:p-6 shadow-xs space-y-5 transition-all ${
        activeLandmarkHighlight?.startsWith(view)
          ? 'border-primary ring-2 ring-primary/20'
          : 'border-outline-variant/30'
      }`}
    >
      <div className="flex flex-wrap items-center justify-between pb-3.5 border-b border-outline-variant/15 gap-2">
        <div className="flex items-center gap-2.5">
          <span className="w-3 h-3 rounded-full bg-primary ring-4 ring-primary/15 shrink-0" />
          <h2 className="text-sm sm:text-base font-black uppercase tracking-wider text-on-surface">{title}</h2>
          <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-surface-container-low text-on-surface-variant">
            {paramsLabel}
          </span>
        </div>
        {deviations === 0 ? (
          <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 font-semibold border border-emerald-200 text-xs inline-flex items-center gap-1.5">
            <Icon name="check_circle" className="text-emerald-600" />
            {okLabel}
          </span>
        ) : (
          <span className="px-2.5 py-1 rounded-full bg-primary/10 text-primary font-semibold border border-primary/20 text-xs inline-flex items-center gap-1.5">
            <Icon name="warning" className="text-primary" />
            {warnLabel}
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 xl:gap-8 items-center">
        <div className="lg:col-span-5 flex flex-col items-center justify-center bg-surface-container-low/60 rounded-2xl p-4 border border-outline-variant/20">
          <div className="w-full flex items-center justify-between text-[11px] font-bold text-on-surface-variant mb-2 px-2">
            <span>{modelLabel}</span>
            <span className="font-medium">Clic en los puntos anatómicos</span>
          </div>
          <div className="w-full flex justify-center">{visualizer(view)}</div>
        </div>
        <div className="lg:col-span-7 space-y-3.5">{controls}</div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/30 p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl sm:text-2xl font-black text-on-surface tracking-tight">VALORACIÓN POSTURAL</h1>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-primary/10 text-primary border border-primary/20">
              Parámetros frente a cada vista
            </span>
          </div>
          <p className="text-xs text-on-surface-variant mt-1">
            Cada plano tiene su silueta interactiva y los hallazgos se guardan en la evaluación del paciente activo.
          </p>
        </div>
        {!readOnly && (
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={applyKyphosisValgus}
              className="px-2.5 py-1.5 rounded-lg border border-outline-variant/30 bg-surface-container-low hover:bg-surface-container-high text-on-surface text-xs font-semibold inline-flex items-center gap-1.5"
            >
              <Icon name="bolt" className="text-primary" />
              Caso Cifosis + Valgo
            </button>
            <button
              type="button"
              onClick={applyScoliosis}
              className="px-2.5 py-1.5 rounded-lg border border-outline-variant/30 bg-surface-container-low hover:bg-surface-container-high text-on-surface text-xs font-semibold inline-flex items-center gap-1.5"
            >
              <Icon name="auto_awesome" className="text-primary" />
              Caso Escoliosis
            </button>
            <button
              type="button"
              onClick={applyNeutral}
              className="px-2.5 py-1.5 rounded-lg border border-outline-variant/30 bg-surface-container-lowest hover:bg-surface-container-low text-on-surface-variant text-xs font-semibold inline-flex items-center gap-1.5"
            >
              <Icon name="replay" />
              Postura Neutra
            </button>
          </div>
        )}
      </div>

      <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/30 p-3 sm:p-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-bold text-on-surface uppercase tracking-wider pl-1">Vistas:</span>
          <div className="flex bg-surface-container-low p-1 rounded-xl text-xs font-semibold text-on-surface-variant">
            {(['all', 'anterior', 'lateral', 'posterior'] as const).map((viewKey) => (
              <button
                key={viewKey}
                type="button"
                onClick={() => setActiveViewTab(viewKey)}
                className={`px-3 py-1.5 rounded-lg transition-all capitalize ${
                  activeViewTab === viewKey
                    ? 'bg-surface-container-lowest text-primary font-bold shadow-xs'
                    : 'hover:text-on-surface'
                }`}
              >
                {viewKey === 'all' ? 'Todas las vistas' : `Vista ${viewKey}`}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          <button
            type="button"
            onClick={() => setViewMode(viewMode === 'muscular' ? 'skeletal' : 'muscular')}
            className={`px-2.5 py-1.5 rounded-lg border font-medium inline-flex items-center gap-1.5 ${
              viewMode === 'skeletal'
                ? 'bg-primary/10 border-primary/40 text-primary'
                : 'bg-surface-container-low border-outline-variant/30 text-on-surface'
            }`}
            title="Alternar silueta muscular y ejes esqueléticos"
          >
            <Icon name="layers" className={viewMode === 'skeletal' ? 'text-primary' : ''} />
            <span className="hidden sm:inline">{viewMode === 'muscular' ? 'Modo Muscular' : 'Ejes Esqueléticos'}</span>
          </button>
          <button
            type="button"
            onClick={() => setShowPlumbLine(!showPlumbLine)}
            className={`px-2.5 py-1.5 rounded-lg border font-medium inline-flex items-center gap-1.5 ${
              showPlumbLine
                ? 'bg-primary/10 border-primary/40 text-primary'
                : 'bg-surface-container-low border-outline-variant/30 text-on-surface-variant'
            }`}
            title="Línea de plomada"
          >
            <Icon name="my_location" />
            <span className="hidden sm:inline">Línea de Plomada</span>
          </button>
          <button
            type="button"
            onClick={() => setShowAngles(!showAngles)}
            className={`px-2.5 py-1.5 rounded-lg border font-medium inline-flex items-center gap-1.5 ${
              showAngles
                ? 'bg-primary/10 border-primary/40 text-primary'
                : 'bg-surface-container-low border-outline-variant/30 text-on-surface-variant'
            }`}
            title="Ángulos y ejes"
          >
            <Icon name="architecture" />
            <span className="hidden sm:inline">Ángulos & Ejes</span>
          </button>
          <button
            type="button"
            onClick={() => setShowGhostIdeal(!showGhostIdeal)}
            className={`px-2.5 py-1.5 rounded-lg border font-medium inline-flex items-center gap-1.5 ${
              showGhostIdeal
                ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                : 'bg-surface-container-low border-outline-variant/30 text-on-surface-variant'
            }`}
            title="Comparar con postura ideal"
          >
            <Icon name="visibility" className={showGhostIdeal ? 'text-emerald-600' : ''} />
            <span className="hidden sm:inline">Comparar con Ideal</span>
          </button>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-container-low text-on-surface font-semibold border border-outline-variant/20">
            <span>Simetría Global:</span>
            <span
              className={`font-bold ${
                symmetryScore >= 85 ? 'text-emerald-600' : symmetryScore >= 65 ? 'text-primary' : 'text-amber-600'
              }`}
            >
              {symmetryScore}%
            </span>
          </div>
          <div className="hidden md:block text-[11px] font-medium">
            {totalDeviations === 0 ? (
              <span className="text-emerald-600 font-semibold inline-flex items-center gap-1">
                <Icon name="check_circle" /> Alineación Neutra
              </span>
            ) : (
              <span className="text-primary font-semibold inline-flex items-center gap-1">
                <Icon name="warning" /> {totalDeviations} hallazgos
              </span>
            )}
          </div>
        </div>
      </div>

      {(activeViewTab === 'all' || activeViewTab === 'anterior') &&
        viewShell(
          'anterior',
          anteriorRef,
          'VISTA ANTERIOR (PLANO CORONAL)',
          '5 Parámetros',
          'Alineación Frontal Equilibrada',
          `${anteriorDeviations} asimetría(s) detectada(s)`,
          anteriorDeviations,
          'MODELO ANTERIOR',
          <>
            <FindingButtons view="anterior" landmark="Cabeza" label="Cabeza" value={findingOf(formState, 'anterior', 'Cabeza')} disabled={readOnly} highlighted={activeLandmarkHighlight === 'anterior-Cabeza'} onSelect={(v) => setFinding('anterior', 'Cabeza', v)} />
            <FindingButtons view="anterior" landmark="Hombros" label="Hombros (Eje Biacromial)" value={findingOf(formState, 'anterior', 'Hombros')} disabled={readOnly} highlighted={activeLandmarkHighlight === 'anterior-Hombros'} onSelect={(v) => setFinding('anterior', 'Hombros', v)} />
            <FindingButtons view="anterior" landmark="Pelvis" label="Pelvis (Crestas Ilíacas)" value={findingOf(formState, 'anterior', 'Pelvis')} disabled={readOnly} highlighted={activeLandmarkHighlight === 'anterior-Pelvis'} onSelect={(v) => setFinding('anterior', 'Pelvis', v)} />
            <FindingButtons view="anterior" landmark="Rodillas" label="Rodillas (Ángulo Q)" value={findingOf(formState, 'anterior', 'Rodillas')} disabled={readOnly} highlighted={activeLandmarkHighlight === 'anterior-Rodillas'} onSelect={(v) => setFinding('anterior', 'Rodillas', v)} />
            <FindingButtons view="anterior" landmark="Pies" label="Pies (Apoyo Plantar)" value={findingOf(formState, 'anterior', 'Pies')} disabled={readOnly} highlighted={activeLandmarkHighlight === 'anterior-Pies'} onSelect={(v) => setFinding('anterior', 'Pies', v)} />
          </>
        )}

      {(activeViewTab === 'all' || activeViewTab === 'lateral') &&
        viewShell(
          'lateral',
          lateralRef,
          'VISTA LATERAL (PLANO SAGITAL)',
          '6 Parámetros',
          'Curvaturas Sagitales Fisiológicas',
          `${lateralDeviations} alteración(es) activa(s)`,
          lateralDeviations,
          'MODELO SAGITAL',
          <>
            <FindingButtons view="lateral" landmark="Cabeza" label="Cabeza (Antepulsión)" value={findingOf(formState, 'lateral', 'Cabeza')} cols={2} disabled={readOnly} highlighted={activeLandmarkHighlight === 'lateral-Cabeza'} onSelect={(v) => setFinding('lateral', 'Cabeza', v)} />
            <FindingButtons view="lateral" landmark="Hombros" label="Hombros (Posición Sagital)" value={findingOf(formState, 'lateral', 'Hombros')} cols={2} disabled={readOnly} highlighted={activeLandmarkHighlight === 'lateral-Hombros'} onSelect={(v) => setFinding('lateral', 'Hombros', v)} />
            <FindingButtons view="lateral" landmark="Cifosis dorsal" label="Columna Dorsal (Cifosis)" value={findingOf(formState, 'lateral', 'Cifosis dorsal')} cols={2} disabled={readOnly} highlighted={activeLandmarkHighlight === 'lateral-Cifosis dorsal'} onSelect={(v) => setFinding('lateral', 'Cifosis dorsal', v)} />
            <FindingButtons view="lateral" landmark="Lordosis lumbar" label="Columna Lumbar (Lordosis)" value={findingOf(formState, 'lateral', 'Lordosis lumbar')} disabled={readOnly} highlighted={activeLandmarkHighlight === 'lateral-Lordosis lumbar'} onSelect={(v) => setFinding('lateral', 'Lordosis lumbar', v)} />
            <FindingButtons view="lateral" landmark="Pelvis" label="Pelvis (Báscula Sagital)" value={findingOf(formState, 'lateral', 'Pelvis')} disabled={readOnly} highlighted={activeLandmarkHighlight === 'lateral-Pelvis'} onSelect={(v) => setFinding('lateral', 'Pelvis', v)} />
            <FindingButtons view="lateral" landmark="Rodillas" label="Rodillas (Extensión Sagital)" value={findingOf(formState, 'lateral', 'Rodillas')} disabled={readOnly} highlighted={activeLandmarkHighlight === 'lateral-Rodillas'} onSelect={(v) => setFinding('lateral', 'Rodillas', v)} />
          </>
        )}

      {(activeViewTab === 'all' || activeViewTab === 'posterior') &&
        viewShell(
          'posterior',
          posteriorRef,
          'VISTA POSTERIOR (PLANO DORSAL)',
          '4 Parámetros',
          'Eje Dorsal & Escapular Simétrico',
          `${posteriorDeviations} alteración(es) activa(s)`,
          posteriorDeviations,
          'MODELO POSTERIOR',
          <>
            <FindingButtons view="posterior" landmark="Escápulas" label="Escápulas" value={findingOf(formState, 'posterior', 'Escápulas')} disabled={readOnly} highlighted={activeLandmarkHighlight === 'posterior-Escápulas'} onSelect={(v) => setFinding('posterior', 'Escápulas', v)} />
            <FindingButtons view="posterior" landmark="Columna" label="Columna (Escoliosis / Desviación Lateral)" value={findingOf(formState, 'posterior', 'Columna')} disabled={readOnly} highlighted={activeLandmarkHighlight === 'posterior-Columna'} onSelect={(v) => setFinding('posterior', 'Columna', v)} />
            <FindingButtons view="posterior" landmark="Pelvis" label="Pelvis Posterior (EIPS)" value={findingOf(formState, 'posterior', 'Pelvis')} cols={2} disabled={readOnly} highlighted={activeLandmarkHighlight === 'posterior-Pelvis'} onSelect={(v) => setFinding('posterior', 'Pelvis', v)} />
            <FindingButtons view="posterior" landmark="Pies" label="Talones (Tendón de Aquiles)" value={findingOf(formState, 'posterior', 'Pies')} disabled={readOnly} highlighted={activeLandmarkHighlight === 'posterior-Pies'} onSelect={(v) => setFinding('posterior', 'Pies', v)} />
          </>
        )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        <div className="lg:col-span-7 bg-surface-container-lowest rounded-2xl border border-outline-variant/30 p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-xs font-black uppercase tracking-wider text-on-surface">
                Observaciones fisioterapéuticas
              </h2>
              <span className="text-[11px] text-on-surface-variant">{(observacionesGenerales || '').length} caracteres</span>
            </div>
            <textarea
              rows={4}
              disabled={readOnly}
              value={observacionesGenerales || ''}
              onChange={(e) => onUpdateText?.('observaciones_generales', e.target.value)}
              placeholder="Describa compensaciones musculares, cadenas lesionales o hallazgos clave..."
              className="w-full text-xs text-on-surface p-3 rounded-xl border border-outline-variant/40 focus:outline-none focus:ring-2 focus:ring-primary/20 bg-surface-container-low/50 leading-relaxed resize-none disabled:opacity-70"
            />
          </div>
        </div>

        <div className="lg:col-span-5 bg-surface-container-lowest rounded-2xl border border-outline-variant/30 p-5">
          <h2 className="text-xs font-black uppercase tracking-wider text-on-surface mb-3">Concepto postural global</h2>
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: 'Adecuado', color: 'bg-emerald-500', active: 'border-emerald-600 bg-emerald-50 text-emerald-950' },
              { label: 'Alteración leve', color: 'bg-primary', active: 'border-primary bg-primary/10 text-primary' },
              { label: 'Alteración moderada', color: 'bg-amber-500', active: 'border-amber-600 bg-amber-50 text-amber-950' },
              { label: 'Alteración marcada', color: 'bg-red-500', active: 'border-red-600 bg-red-50 text-red-950' },
            ].map((item) => (
              <button
                key={item.label}
                type="button"
                disabled={readOnly}
                onClick={() => onUpdateConcepto?.(item.label)}
                className={`p-2.5 rounded-xl border text-left text-xs font-semibold flex items-center gap-2.5 disabled:opacity-70 ${
                  concepto === item.label ? `${item.active} font-bold` : 'border-outline-variant/30 text-on-surface-variant hover:bg-surface-container-low'
                }`}
              >
                <span className={`w-2.5 h-2.5 rounded-full ${item.color} shrink-0`} />
                <span className="truncate">{item.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
