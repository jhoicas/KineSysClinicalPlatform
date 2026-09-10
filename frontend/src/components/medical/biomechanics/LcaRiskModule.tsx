import { useEffect, useMemo, useRef, useState } from 'react';
import { CanvasOverlay, type AngleMeasurement } from './CanvasOverlay';
import type { BiomechanicsCaptureTargets } from './GoniometryModule';
import { useBiomechanicsEngine, type PoseLandmark } from '../../../hooks/useBiomechanicsEngine';
import { calculateAngle3D } from '../../../utils/biomechanicsMath';

type LcaLeg = 'left' | 'right';
type TestStatus = 'idle' | 'running' | 'complete';
type RiskLevel = 'low' | 'high';

const LEG_DEFINITIONS: Record<LcaLeg, { label: string; points: [number, number, number] }> = {
  left: { label: 'Rodilla Izquierda', points: [23, 25, 27] },
  right: { label: 'Rodilla Derecha', points: [24, 26, 28] },
};

const TEST_DURATION_MS = 4000;
const VALGUS_RISK_THRESHOLD = 160;
const RIGID_LANDING_THRESHOLD = 150;

function angleFor(pose: PoseLandmark[], points: [number, number, number]) {
  const [hip, knee, ankle] = points;
  if (!pose[hip] || !pose[knee] || !pose[ankle]) return null;
  return calculateAngle3D(pose[hip], pose[knee], pose[ankle]);
}

function metricColor(value: number | null, threshold: number, riskWhen: 'above' | 'below') {
  if (value === null) return 'text-on-surface-variant';
  const risky = riskWhen === 'below' ? value < threshold : value > threshold;
  return risky ? 'text-error' : 'text-secondary';
}

export function LcaRiskModule({ onVideoReady, onCanvasReady }: BiomechanicsCaptureTargets) {
  const [leg, setLeg] = useState<LcaLeg>('left');
  const [status, setStatus] = useState<TestStatus>('idle');
  const [risk, setRisk] = useState<RiskLevel | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [impactFlexion, setImpactFlexion] = useState<number | null>(null);
  const [impactValgus, setImpactValgus] = useState<number | null>(null);
  const testRef = useRef({
    lowestHipY: -Infinity,
    flexion: null as number | null,
    valgus: null as number | null,
  });
  const timerRef = useRef<number | null>(null);
  const { videoRef, landmarks, isLoading, isReady, error } = useBiomechanicsEngine();
  const pose = landmarks[0] || [];
  const definition = LEG_DEFINITIONS[leg];
  const liveFlexion = angleFor(pose, definition.points);
  const liveValgus = angleFor(pose, definition.points);

  const finishTest = () => {
    const { flexion, valgus } = testRef.current;
    setImpactFlexion(flexion);
    setImpactValgus(valgus);
    setRisk(flexion !== null && valgus !== null && (valgus < VALGUS_RISK_THRESHOLD || flexion > RIGID_LANDING_THRESHOLD) ? 'high' : 'low');
    setStatus('complete');
    setRemainingSeconds(0);
    timerRef.current = null;
  };

  const startTest = () => {
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    testRef.current = { lowestHipY: -Infinity, flexion: null, valgus: null };
    setImpactFlexion(null);
    setImpactValgus(null);
    setRisk(null);
    setStatus('running');
    setRemainingSeconds(TEST_DURATION_MS / 1000);
    timerRef.current = window.setTimeout(finishTest, TEST_DURATION_MS);
  };

  useEffect(() => {
    if (status !== 'running') return;
    const hip = pose[definition.points[0]];
    if (hip && liveFlexion !== null && liveValgus !== null && hip.y >= testRef.current.lowestHipY) {
      testRef.current = { lowestHipY: hip.y, flexion: liveFlexion, valgus: liveValgus };
    }
  }, [definition.points, liveFlexion, liveValgus, pose, status]);

  useEffect(() => {
    if (status !== 'running') return undefined;
    const startedAt = performance.now();
    const interval = window.setInterval(() => {
      setRemainingSeconds(Math.max(0, Math.ceil((TEST_DURATION_MS - (performance.now() - startedAt)) / 1000)));
    }, 200);
    return () => window.clearInterval(interval);
  }, [status]);

  useEffect(() => () => {
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
  }, []);

  const overlayAngles = useMemo<AngleMeasurement[]>(() => [{
    id: `lca-${leg}`,
    label: `${definition.label} · Valgo`,
    points: definition.points,
    value: liveValgus === null ? undefined : Math.round(liveValgus),
    riskThreshold: VALGUS_RISK_THRESHOLD,
    riskWhen: 'below',
  }], [definition.label, definition.points, leg, liveValgus]);

  const displayedFlexion = status === 'complete' ? impactFlexion : liveFlexion;
  const displayedValgus = status === 'complete' ? impactValgus : liveValgus;

  return (
    <section className="space-y-5 rounded-3xl border border-outline-variant/30 bg-surface-container-lowest p-5 md:p-7 clinical-shadow">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-primary">Laboratorio de biomecánica IA</p>
          <h2 className="mt-1 text-2xl font-black text-on-surface">Screening de Riesgo LCA</h2>
          <p className="mt-1 text-sm text-on-surface-variant">LESS Test · Drop Jump con procesamiento local.</p>
        </div>
        <label className="block min-w-56">
          <span className="text-xs font-bold text-on-surface-variant">Rodilla evaluada</span>
          <select
            className="mt-1 w-full rounded-xl border border-outline-variant/40 bg-surface-container-lowest px-3 py-2.5 text-sm font-semibold text-on-surface"
            value={leg}
            disabled={status === 'running'}
            onChange={(event) => {
              setLeg(event.target.value as LcaLeg);
              setStatus('idle');
              setRisk(null);
            }}
          >
            {Object.entries(LEG_DEFINITIONS).map(([value, item]) => (
              <option key={value} value={value}>{item.label}</option>
            ))}
          </select>
        </label>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_260px]">
        <div className="relative aspect-video min-h-72 overflow-hidden rounded-2xl bg-slate-950">
          <video
            ref={(video) => {
              videoRef.current = video;
              onVideoReady?.(video);
            }}
            className="h-full w-full object-cover"
            autoPlay
            muted
            playsInline
          />
          <CanvasOverlay landmarks={landmarks} angles={overlayAngles} onCanvasReady={onCanvasReady} />
          {!isReady && (
            <div className="absolute inset-0 z-20 flex items-center justify-center bg-slate-950/75 p-6 text-center text-sm text-white">
              {isLoading ? 'Inicializando cámara y modelo IA…' : error || 'Esperando autorización de cámara.'}
            </div>
          )}
        </div>

        <aside className="space-y-4 rounded-2xl bg-surface-container-low p-5">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant">Alineación (Valgo)</p>
              <p className={`mt-1 text-2xl font-black tabular-nums ${metricColor(displayedValgus, VALGUS_RISK_THRESHOLD, 'below')}`}>
                {displayedValgus === null ? '—' : `${Math.round(displayedValgus)}°`}
              </p>
              <p className="text-[11px] text-on-surface-variant">Riesgo &lt; 160°</p>
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant">Impacto (Flexión)</p>
              <p className={`mt-1 text-2xl font-black tabular-nums ${metricColor(displayedFlexion, RIGID_LANDING_THRESHOLD, 'above')}`}>
                {displayedFlexion === null ? '—' : `${Math.round(displayedFlexion)}°`}
              </p>
              <p className="text-[11px] text-on-surface-variant">Rígido &gt; 150°</p>
            </div>
          </div>

          <div className={`rounded-2xl border p-4 ${risk === 'high' ? 'border-error/30 bg-error/10' : risk === 'low' ? 'border-secondary/30 bg-secondary/10' : 'border-outline-variant/30 bg-surface-container-lowest'}`}>
            <p className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">Conclusión global</p>
            <p className={`mt-1 text-xl font-black ${risk === 'high' ? 'text-error' : risk === 'low' ? 'text-secondary' : 'text-on-surface'}`}>
              {risk === 'high' ? 'Riesgo Alto' : risk === 'low' ? 'Riesgo Bajo / Normal' : 'Pendiente de test'}
            </p>
          </div>

          <button
            type="button"
            onClick={startTest}
            disabled={!isReady || status === 'running'}
            className="w-full rounded-xl bg-primary px-4 py-3 text-sm font-black text-on-primary disabled:cursor-not-allowed disabled:opacity-50"
          >
            {status === 'running' ? `Test en curso · ${remainingSeconds}s` : 'Iniciar Test (Drop Jump)'}
          </button>
          <p className="text-[11px] leading-relaxed text-on-surface-variant">
            La prueba registra durante 4 segundos el punto de mayor descenso de la cadera y evalúa el frame de impacto.
          </p>
        </aside>
      </div>
    </section>
  );
}