import { useMemo, useState } from 'react';
import { CanvasOverlay } from './CanvasOverlay';
import { useBiomechanicsEngine } from '../../../hooks/useBiomechanicsEngine';
import type { BiomechanicsCaptureTargets } from './GoniometryModule';

type PostureView = 'anterior' | 'posterior' | 'lateral';

const VIEW_LABELS: Record<PostureView, string> = {
  anterior: 'Vista Anterior',
  posterior: 'Vista Posterior',
  lateral: 'Vista Lateral',
};

function asymmetryPercentage(first?: { y: number }, second?: { y: number }) {
  if (!first || !second) return null;
  return Math.abs(first.y - second.y) * 100;
}

function alignmentLabel(value: number | null) {
  if (value === null) return 'Sin datos';
  return value < 1 ? 'Alineado' : `${value.toFixed(1)} %`;
}

export interface PostureAnalysisModuleProps {
  showGrid?: boolean;
}

export function PostureAnalysisModule({ showGrid = true, onVideoReady, onCanvasReady }: PostureAnalysisModuleProps & BiomechanicsCaptureTargets) {
  const [view, setView] = useState<PostureView>('anterior');
  const { videoRef, landmarks, isLoading, isReady, error } = useBiomechanicsEngine();
  const pose = landmarks[0] || [];
  const shoulderAsymmetry = useMemo(() => asymmetryPercentage(pose[11], pose[12]), [pose]);
  const pelvisAsymmetry = useMemo(() => asymmetryPercentage(pose[23], pose[24]), [pose]);

  return (
    <section className="space-y-5 rounded-3xl border border-outline-variant/30 bg-surface-container-lowest p-5 md:p-7 clinical-shadow">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-primary">Laboratorio de biomecánica IA</p>
          <h2 className="mt-1 text-2xl font-black text-on-surface">Evaluación postural estática</h2>
          <p className="mt-1 text-sm text-on-surface-variant">Referencias visuales y simetría corporal en tiempo real.</p>
        </div>
        <label className="block min-w-56">
          <span className="text-xs font-bold text-on-surface-variant">Vista</span>
          <select
            className="mt-1 w-full rounded-xl border border-outline-variant/40 bg-surface-container-lowest px-3 py-2.5 text-sm font-semibold text-on-surface"
            value={view}
            onChange={(event) => setView(event.target.value as PostureView)}
          >
            {Object.entries(VIEW_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_240px]">
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
          <CanvasOverlay landmarks={landmarks} showGrid={showGrid} onCanvasReady={onCanvasReady} />
          {!isReady && (
            <div className="absolute inset-0 z-20 flex items-center justify-center bg-slate-950/75 p-6 text-center text-sm text-white">
              {isLoading ? 'Inicializando cámara y modelo IA…' : error || 'Esperando autorización de cámara.'}
            </div>
          )}
        </div>

        <aside className="space-y-4 rounded-2xl bg-surface-container-low p-5">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">Vista activa</p>
            <p className="mt-1 text-lg font-black text-primary">{VIEW_LABELS[view]}</p>
          </div>
          <div className="border-t border-outline-variant/30 pt-4">
            <p className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">Desnivel hombros</p>
            <p className={`mt-1 text-2xl font-black tabular-nums ${shoulderAsymmetry !== null && shoulderAsymmetry >= 1 ? 'text-tertiary' : 'text-secondary'}`}>
              {shoulderAsymmetry === null ? '—' : alignmentLabel(shoulderAsymmetry)}
            </p>
          </div>
          <div className="border-t border-outline-variant/30 pt-4">
            <p className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">Desnivel pélvico</p>
            <p className={`mt-1 text-2xl font-black tabular-nums ${pelvisAsymmetry !== null && pelvisAsymmetry >= 1 ? 'text-tertiary' : 'text-secondary'}`}>
              {pelvisAsymmetry === null ? '—' : alignmentLabel(pelvisAsymmetry)}
            </p>
          </div>
          <p className="text-[11px] leading-relaxed text-on-surface-variant">
            La diferencia se calcula sobre la coordenada Y normalizada de los landmarks MediaPipe.
          </p>
        </aside>
      </div>
    </section>
  );
}