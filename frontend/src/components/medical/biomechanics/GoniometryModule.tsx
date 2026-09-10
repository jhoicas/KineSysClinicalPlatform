import { useEffect, useMemo, useState } from 'react';
import { CanvasOverlay, type AngleMeasurement } from './CanvasOverlay';
import { useBiomechanicsEngine, type PoseLandmark } from '../../../hooks/useBiomechanicsEngine';
import { calculateAngle3D } from '../../../utils/biomechanicsMath';

export interface BiomechanicsCaptureTargets {
  onVideoReady?: (video: HTMLVideoElement | null) => void;
  onCanvasReady?: (canvas: HTMLCanvasElement | null) => void;
}

type GoniometryMovement = 'shoulder' | 'elbow' | 'knee';

interface MovementDefinition {
  label: string;
  points: [number, number, number];
}

const MOVEMENTS: Record<GoniometryMovement, MovementDefinition> = {
  shoulder: { label: 'Flexión de Hombro', points: [24, 12, 14] },
  elbow: { label: 'Flexión de Codo', points: [12, 14, 16] },
  knee: { label: 'Flexión de Rodilla', points: [24, 26, 28] },
};

function currentAngle(landmarks: PoseLandmark[], points: [number, number, number]) {
  const [first, middle, last] = points;
  if (!landmarks[first] || !landmarks[middle] || !landmarks[last]) return null;
  return calculateAngle3D(landmarks[first], landmarks[middle], landmarks[last]);
}

export function GoniometryModule({ onVideoReady, onCanvasReady }: BiomechanicsCaptureTargets) {
  const [movement, setMovement] = useState<GoniometryMovement>('knee');
  const [maxRom, setMaxRom] = useState(0);
  const { videoRef, landmarks, isLoading, isReady, error } = useBiomechanicsEngine();
  const pose = landmarks[0] || [];
  const definition = MOVEMENTS[movement];
  const angle = currentAngle(pose, definition.points);
  const displayedAngle = angle === null ? '—' : `${Math.round(angle)}°`;

  useEffect(() => {
    if (angle === null || !Number.isFinite(angle)) return;
    setMaxRom((previous) => Math.max(previous, angle));
  }, [angle]);

  const angleMeasurement = useMemo<AngleMeasurement[]>(
    () => [
      {
        id: movement,
        label: definition.label,
        points: definition.points,
        value: angle === null ? undefined : Math.round(angle),
        color: '#22c55e',
      },
    ],
    [angle, definition.label, definition.points, movement]
  );

  return (
    <section className="space-y-5 rounded-3xl border border-outline-variant/30 bg-surface-container-lowest p-5 md:p-7 clinical-shadow">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-primary">Laboratorio de biomecánica IA</p>
          <h2 className="mt-1 text-2xl font-black text-on-surface">Goniometría dinámica continua</h2>
          <p className="mt-1 text-sm text-on-surface-variant">Procesamiento local en tiempo real con MediaPipe.</p>
        </div>
        <label className="block min-w-56">
          <span className="text-xs font-bold text-on-surface-variant">Movimiento</span>
          <select
            className="mt-1 w-full rounded-xl border border-outline-variant/40 bg-surface-container-lowest px-3 py-2.5 text-sm font-semibold text-on-surface"
            value={movement}
            onChange={(event) => setMovement(event.target.value as GoniometryMovement)}
          >
            {Object.entries(MOVEMENTS).map(([value, item]) => (
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
          <CanvasOverlay landmarks={landmarks} angles={angleMeasurement} onCanvasReady={onCanvasReady} />
          {!isReady && (
            <div className="absolute inset-0 z-20 flex items-center justify-center bg-slate-950/75 p-6 text-center text-sm text-white">
              {isLoading ? 'Inicializando cámara y modelo IA…' : error || 'Esperando autorización de cámara.'}
            </div>
          )}
        </div>

        <aside className="flex flex-col justify-between rounded-2xl bg-surface-container-low p-5">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">Ángulo actual</p>
            <p className="mt-2 text-5xl font-black tabular-nums text-primary">{displayedAngle}</p>
            <p className="mt-2 text-xs text-on-surface-variant">Vértice MediaPipe: índice {definition.points[1]}</p>
          </div>
          <div className="mt-8 border-t border-outline-variant/30 pt-4">
            <p className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">ROM máximo</p>
            <p className="mt-1 text-3xl font-black tabular-nums text-secondary">{maxRom ? `${Math.round(maxRom)}°` : '—'}</p>
            <p className="mt-1 text-xs text-on-surface-variant">Retenido durante esta sesión</p>
          </div>
        </aside>
      </div>
    </section>
  );
}