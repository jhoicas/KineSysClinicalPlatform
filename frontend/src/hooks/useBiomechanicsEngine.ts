import { useCallback, useEffect, useRef, useState } from 'react';
import type { RefObject } from 'react';
import { FilesetResolver, PoseLandmarker } from '@mediapipe/tasks-vision';

export interface PoseLandmark {
  x: number;
  y: number;
  z: number;
  visibility?: number;
}

export interface UseBiomechanicsEngineOptions {
  enabled?: boolean;
  modelAssetPath?: string;
  wasmRoot?: string;
  facingMode?: 'user' | 'environment';
}

export interface UseBiomechanicsEngineResult {
  videoRef: RefObject<HTMLVideoElement | null>;
  landmarks: PoseLandmark[][];
  isLoading: boolean;
  isReady: boolean;
  error: string | null;
  startCamera: () => Promise<void>;
  stopCamera: () => void;
}

const DEFAULT_MODEL_ASSET_PATH =
  'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task';
const DEFAULT_WASM_ROOT = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.22-rc.20250304/wasm';

export function useBiomechanicsEngine({
  enabled = true,
  modelAssetPath = DEFAULT_MODEL_ASSET_PATH,
  wasmRoot = DEFAULT_WASM_ROOT,
  facingMode = 'user',
}: UseBiomechanicsEngineOptions = {}): UseBiomechanicsEngineResult {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const landmarkerRef = useRef<PoseLandmarker | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const lastVideoTimeRef = useRef(-1);
  const [landmarks, setLandmarks] = useState<PoseLandmark[][]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const stopCamera = useCallback(() => {
    if (animationFrameRef.current !== null) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    lastVideoTimeRef.current = -1;
    setLandmarks([]);
    setIsReady(false);
  }, []);

  const startCamera = useCallback(async () => {
    if (!videoRef.current || !navigator.mediaDevices?.getUserMedia) {
      setError('Este navegador no permite acceder a la cámara.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      if (!landmarkerRef.current) {
        const vision = await FilesetResolver.forVisionTasks(wasmRoot);
        landmarkerRef.current = await PoseLandmarker.createFromOptions(vision, {
          baseOptions: { modelAssetPath },
          runningMode: 'VIDEO',
          numPoses: 1,
          minPoseDetectionConfidence: 0.5,
          minPosePresenceConfidence: 0.5,
          minTrackingConfidence: 0.5,
        });
      }

      streamRef.current = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: { facingMode, width: { ideal: 1280 }, height: { ideal: 720 } },
      });

      const video = videoRef.current;
      video.srcObject = streamRef.current;
      await video.play();
      setIsReady(true);

      const detectFrame = () => {
        if (!videoRef.current || !landmarkerRef.current) return;

        const currentVideo = videoRef.current;
        if (currentVideo.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA && currentVideo.currentTime !== lastVideoTimeRef.current) {
          const result = landmarkerRef.current.detectForVideo(currentVideo, performance.now());
          setLandmarks(result.landmarks as PoseLandmark[][]);
          lastVideoTimeRef.current = currentVideo.currentTime;
        }

        animationFrameRef.current = requestAnimationFrame(detectFrame);
      };

      detectFrame();
    } catch (cameraError) {
      stopCamera();
      setError(cameraError instanceof Error ? cameraError.message : 'No fue posible iniciar el análisis biomecánico.');
    } finally {
      setIsLoading(false);
    }
  }, [facingMode, modelAssetPath, stopCamera, wasmRoot]);

  useEffect(() => {
    if (!enabled) {
      stopCamera();
      return;
    }

    void startCamera();
    return stopCamera;
  }, [enabled, startCamera, stopCamera]);

  return { videoRef, landmarks, isLoading, isReady, error, startCamera, stopCamera };
}