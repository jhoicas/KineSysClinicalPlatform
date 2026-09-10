import { useRef, useState } from 'react';
import { Camera } from 'lucide-react';
import { GoniometryModule, type BiomechanicsCaptureTargets } from './GoniometryModule';
import { PostureAnalysisModule } from './PostureAnalysisModule';
import { GaitAnalysisModule } from './GaitAnalysisModule';
import { LcaRiskModule } from './LcaRiskModule';
import { captureBiomechanicsSnapshot } from '../../../utils/biomechanicsCapture';

type DashboardTab = 'goniometry' | 'posture' | 'gait' | 'lca';

export interface AiBiomechanicsDashboardProps {
  onSaveEvidence?: (imageBase64: string) => void;
}

export function AiBiomechanicsDashboard({ onSaveEvidence }: AiBiomechanicsDashboardProps) {
  const [activeTab, setActiveTab] = useState<DashboardTab>('goniometry');
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [captureReady, setCaptureReady] = useState(false);
  const videoElementRef = useRef<HTMLVideoElement | null>(null);
  const canvasElementRef = useRef<HTMLCanvasElement | null>(null);

  const captureTargets: BiomechanicsCaptureTargets = {
    onVideoReady: (video) => {
      videoElementRef.current = video;
      setCaptureReady(Boolean(video && canvasElementRef.current));
    },
    onCanvasReady: (canvas) => {
      canvasElementRef.current = canvas;
      setCaptureReady(Boolean(canvas && videoElementRef.current));
    },
  };

  const captureEvidence = async () => {
    if (!videoElementRef.current || !canvasElementRef.current) return;
    const snapshot = await captureBiomechanicsSnapshot(videoElementRef.current, canvasElementRef.current);
    if (snapshot) setCapturedImage(snapshot);
  };

  const discardCapture = () => setCapturedImage(null);

  const saveCapture = () => {
    if (!capturedImage) return;
    onSaveEvidence?.(capturedImage);
    setCapturedImage(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-outline-variant/30 pb-3">
        <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setActiveTab('goniometry')}
          className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-bold transition-colors ${
            activeTab === 'goniometry'
              ? 'border-primary bg-primary text-on-primary'
              : 'border-outline-variant/30 bg-surface-container-lowest text-on-surface'
          }`}
        >
          <span className="material-symbols-outlined text-base">360</span>
          Goniometría
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('posture')}
          className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-bold transition-colors ${
            activeTab === 'posture'
              ? 'border-primary bg-primary text-on-primary'
              : 'border-outline-variant/30 bg-surface-container-lowest text-on-surface'
          }`}
        >
          <span className="material-symbols-outlined text-base">accessibility_new</span>
          Postura Estática
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('gait')}
          className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-bold transition-colors ${
            activeTab === 'gait'
              ? 'border-primary bg-primary text-on-primary'
              : 'border-outline-variant/30 bg-surface-container-lowest text-on-surface'
          }`}
        >
          <span className="material-symbols-outlined text-base">directions_run</span>
          Análisis de Marcha
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('lca')}
          className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-bold transition-colors ${
            activeTab === 'lca'
              ? 'border-primary bg-primary text-on-primary'
              : 'border-outline-variant/30 bg-surface-container-lowest text-on-surface'
          }`}
        >
          <span className="material-symbols-outlined text-base">health_and_safety</span>
          Screening LCA (Salto)
        </button>
        </div>
        <button
          type="button"
          onClick={() => void captureEvidence()}
          disabled={!captureReady}
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-on-primary disabled:cursor-not-allowed disabled:opacity-50"
          title="Capturar evidencia"
        >
          <Camera size={17} aria-hidden="true" />
          Capturar Evidencia
        </button>
      </div>

      {activeTab === 'goniometry' && <GoniometryModule {...captureTargets} />}
      {activeTab === 'posture' && <PostureAnalysisModule showGrid {...captureTargets} />}
      {activeTab === 'gait' && <GaitAnalysisModule {...captureTargets} />}
      {activeTab === 'lca' && <LcaRiskModule {...captureTargets} />}

      {capturedImage && (
        <div className="fixed bottom-6 right-6 z-50 w-72 rounded-2xl border border-outline-variant/40 bg-surface-container-lowest p-3 shadow-2xl">
          <img src={capturedImage} alt="Evidencia biomecánica capturada" className="aspect-video w-full rounded-xl object-cover" />
          <div className="mt-3 flex items-center justify-end gap-2">
            <button type="button" onClick={discardCapture} className="rounded-lg border border-outline-variant/40 px-3 py-2 text-xs font-bold text-on-surface">
              Descartar
            </button>
            <button type="button" onClick={saveCapture} className="rounded-lg bg-primary px-3 py-2 text-xs font-bold text-on-primary">
              Guardar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}