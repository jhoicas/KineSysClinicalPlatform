import { useEffect, useRef, useState } from 'react';
import { CanvasOverlay } from './CanvasOverlay';
import type { BiomechanicsCaptureTargets } from './GoniometryModule';
import { useBiomechanicsEngine, type PoseLandmark } from '../../../hooks/useBiomechanicsEngine';
import { calculateAngle3D } from '../../../utils/biomechanicsMath';

type GaitLeg = 'left' | 'right';

const LEG_DEFINITIONS: Record<GaitLeg, { label: string; points: [number, number, number] }> = {
  left: { label: 'Pierna Izquierda', points: [23, 25, 27] },
  right: { label: 'Pierna Derecha', points: [24, 26, 28] },
};

const MAX_HISTORY_LENGTH = 100;

function kneeAngle(pose: PoseLandmark[], points: [number, number, number]) {
  const [hip, knee, ankle] = points;
  if (!pose[hip] || !pose[knee] || !pose[ankle]) return null;
  return calculateAngle3D(pose[hip], pose[knee], pose[ankle]);
}

function drawAngleHistory(canvas: HTMLCanvasElement, values: number[]) {
  const width = canvas.clientWidth || 640;
  const height = canvas.clientHeight || 180;
  const pixelRatio = window.devicePixelRatio || 1;
  canvas.width = width * pixelRatio;
  canvas.height = height * pixelRatio;
  const context = canvas.getContext('2d');
  if (!context) return;
  context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
  context.clearRect(0, 0, width, height);

  const padding = { top: 18, right: 16, bottom: 24, left: 42 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  const minAngle = 0;
  const maxAngle = 180;

  context.fillStyle = '#f8fafc';
  context.fillRect(0, 0, width, height);
  context.strokeStyle = 'rgba(148, 163, 184, 0.25)';
  context.lineWidth = 1;
  [0, 45, 90, 135, 180].forEach((tick) => {
    const y = padding.top + chartHeight - (tick / maxAngle) * chartHeight;
    context.beginPath();
    context.moveTo(padding.left, y);
    context.lineTo(width - padding.right, y);
    context.stroke();
    context.fillStyle = '#64748b';
    context.font = '10px Manrope, sans-serif';
    context.fillText(`${tick}°`, 8, y + 3);
  });

  if (values.length < 2) return;
  context.beginPath();
  values.forEach((value, index) => {
    const x = padding.left + (index / (MAX_HISTORY_LENGTH - 1)) * chartWidth;
    const y = padding.top + chartHeight - ((Math.max(minAngle, Math.min(maxAngle, value)) - minAngle) / maxAngle) * chartHeight;
    if (index === 0) context.moveTo(x, y);
    else context.lineTo(x, y);
  });
  context.strokeStyle = '#006c49';
  context.lineWidth = 2.5;
  context.lineJoin = 'round';
  context.lineCap = 'round';
  context.stroke();
}

export function GaitAnalysisModule({ onVideoReady, onCanvasReady }: BiomechanicsCaptureTargets) {
  const [leg, setLeg] = useState<GaitLeg>('left');
  const [angleHistory, setAngleHistory] = useState<number[]>([]);
  const chartRef = useRef<HTMLCanvasElement | null>(null);
  const { videoRef, landmarks, isLoading, isReady, error } = useBiomechanicsEngine();
  const pose = landmarks[0] || [];
  const definition = LEG_DEFINITIONS[leg];
  const angle = kneeAngle(pose, definition.points);

  useEffect(() => {
    if (angle === null || !Number.isFinite(angle)) return;
    setAngleHistory((previous) => [...previous, angle].slice(-MAX_HISTORY_LENGTH));
  }, [angle]);

  useEffect(() => {
    if (chartRef.current) drawAngleHistory(chartRef.current, angleHistory);
  }, [angleHistory]);

  return (
    <section className="space-y-5 rounded-3xl border border-outline-variant/30 bg-surface-container-lowest p-5 md:p-7 clinical-shadow">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-primary">Laboratorio de biomecánica IA</p>
          <h2 className="mt-1 text-2xl font-black text-on-surface">Análisis cinemático de la marcha</h2>
          <p className="mt-1 text-sm text-on-surface-variant">Curva de flexo-extensión de rodilla en tiempo real.</p>
        </div>
        <label className="block min-w-56">
          <span className="text-xs font-bold text-on-surface-variant">Pierna analizada</span>
          <select
            className="mt-1 w-full rounded-xl border border-outline-variant/40 bg-surface-container-lowest px-3 py-2.5 text-sm font-semibold text-on-surface"
            value={leg}
            onChange={(event) => {
              setLeg(event.target.value as GaitLeg);
              setAngleHistory([]);
            }}
          >
            {Object.entries(LEG_DEFINITIONS).map(([value, item]) => (
              <option key={value} value={value}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_220px]">
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
          <CanvasOverlay
            landmarks={landmarks}
            angles={[{ id: leg, label: `${definition.label} - Rodilla`, points: definition.points, color: '#22c55e' }]}
            onCanvasReady={onCanvasReady}
          />
          {!isReady && (
            <div className="absolute inset-0 z-20 flex items-center justify-center bg-slate-950/75 p-6 text-center text-sm text-white">
              {isLoading ? 'Inicializando cámara y modelo IA…' : error || 'Esperando autorización de cámara.'}
            </div>
          )}
        </div>

        <aside className="flex flex-col justify-between rounded-2xl bg-surface-container-low p-5">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">Flexión de rodilla</p>
            <p className="mt-2 text-5xl font-black tabular-nums text-primary">{angle === null ? '—' : `${Math.round(angle)}°`}</p>
            <p className="mt-2 text-xs text-on-surface-variant">{definition.label}</p>
          </div>
          <div className="mt-8 border-t border-outline-variant/30 pt-4">
            <p className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">Frames registrados</p>
            <p className="mt-1 text-3xl font-black tabular-nums text-secondary">{angleHistory.length}</p>
            <p className="mt-1 text-xs text-on-surface-variant">Últimas {MAX_HISTORY_LENGTH} muestras</p>
          </div>
        </aside>
      </div>

      <div className="rounded-2xl border border-outline-variant/25 bg-surface-container-low p-4">
        <div className="mb-2 flex items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-black text-on-surface">Curva de rodilla</h3>
            <p className="text-xs text-on-surface-variant">Eje Y: grados · Eje X: frames recientes</p>
          </div>
          <span className="text-xs font-bold text-secondary">En vivo</span>
        </div>
        <canvas ref={chartRef} className="h-44 w-full rounded-xl" aria-label="Gráfico de flexión de rodilla en vivo" />
      </div>
    </section>
  );
}