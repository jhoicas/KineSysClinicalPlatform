import { useEffect, useRef } from 'react';
import type { PoseLandmark } from '../../../hooks/useBiomechanicsEngine';
import { calculateAngle3D } from '../../../utils/biomechanicsMath';

export interface AngleMeasurement {
  id: string;
  label: string;
  points: [number, number, number];
  value?: number;
  riskThreshold?: number;
  riskWhen?: 'above' | 'below';
  color?: string;
}

export interface CanvasOverlayProps {
  landmarks: PoseLandmark[][] | PoseLandmark[];
  angles?: AngleMeasurement[];
  className?: string;
  lineWidth?: number;
  mirrored?: boolean;
  showGrid?: boolean;
  onCanvasReady?: (canvas: HTMLCanvasElement | null) => void;
}

const POSE_CONNECTIONS: ReadonlyArray<readonly [number, number]> = [
  [11, 12], [11, 13], [13, 15], [12, 14], [14, 16],
  [11, 23], [12, 24], [23, 24], [23, 25], [25, 27],
  [24, 26], [26, 28], [27, 29], [29, 31], [28, 30], [30, 32],
];

const DEFAULT_ANGLES: AngleMeasurement[] = [
  { id: 'left-knee', label: 'Rodilla I', points: [23, 25, 27], riskThreshold: 15, riskWhen: 'above' },
  { id: 'right-knee', label: 'Rodilla D', points: [24, 26, 28], riskThreshold: 15, riskWhen: 'above' },
];

function pointFor(landmarks: PoseLandmark[], index: number, width: number, height: number, mirrored: boolean) {
  const landmark = landmarks[index];
  if (!landmark) return null;
  return {
    x: (mirrored ? 1 - landmark.x : landmark.x) * width,
    y: landmark.y * height,
    z: landmark.z,
  };
}

function isRisk(measurement: AngleMeasurement, value: number) {
  if (measurement.riskThreshold === undefined) return false;
  return measurement.riskWhen === 'below' ? value < measurement.riskThreshold : value > measurement.riskThreshold;
}

export function CanvasOverlay({
  landmarks,
  angles = DEFAULT_ANGLES,
  className,
  lineWidth = 3,
  mirrored = true,
  showGrid = false,
  onCanvasReady,
}: CanvasOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const pose = Array.isArray(landmarks[0]) ? (landmarks[0] as PoseLandmark[]) : (landmarks as PoseLandmark[]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const parent = canvas.parentElement;
    if (!parent) return;

    const width = parent.clientWidth;
    const height = parent.clientHeight;
    const pixelRatio = window.devicePixelRatio || 1;
    canvas.width = width * pixelRatio;
    canvas.height = height * pixelRatio;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    const context = canvas.getContext('2d');
    if (!context) return;
    context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    context.clearRect(0, 0, width, height);

    if (showGrid) {
      context.save();
      context.strokeStyle = 'rgba(226, 232, 240, 0.28)';
      context.lineWidth = 1;
      for (let x = 0; x <= width; x += 50) {
        context.beginPath();
        context.moveTo(x, 0);
        context.lineTo(x, height);
        context.stroke();
      }
      for (let y = 0; y <= height; y += 50) {
        context.beginPath();
        context.moveTo(0, y);
        context.lineTo(width, y);
        context.stroke();
      }
      context.beginPath();
      context.moveTo(width / 2, 0);
      context.lineTo(width / 2, height);
      context.strokeStyle = 'rgba(248, 250, 252, 0.72)';
      context.lineWidth = 2.5;
      context.stroke();
      context.restore();
    }

    if (pose.length === 0) return;

    const points = new Map<number, ReturnType<typeof pointFor>>();
    pose.forEach((_, index) => points.set(index, pointFor(pose, index, width, height, mirrored)));
    const riskSegments = new Map<string, string>();

    angles.forEach((measurement) => {
      const [firstIndex, middleIndex, lastIndex] = measurement.points;
      const first = pose[firstIndex];
      const middle = pose[middleIndex];
      const last = pose[lastIndex];
      if (!first || !middle || !last) return;
      const value = measurement.value ?? calculateAngle3D(first, middle, last);
      const risk = isRisk(measurement, value);
      const color = risk ? '#ef4444' : measurement.color || '#22c55e';
      riskSegments.set(`${firstIndex}-${middleIndex}`, color);
      riskSegments.set(`${middleIndex}-${lastIndex}`, color);

      const center = points.get(middleIndex);
      const start = points.get(firstIndex);
      const end = points.get(lastIndex);
      if (!center || !start || !end) return;
      const startAngle = Math.atan2(start.y - center.y, start.x - center.x);
      const endAngle = Math.atan2(end.y - center.y, end.x - center.x);
      context.beginPath();
      context.arc(center.x, center.y, 34, startAngle, endAngle);
      context.strokeStyle = color;
      context.lineWidth = lineWidth;
      context.stroke();
      context.font = '700 20px Manrope, sans-serif';
      context.fillStyle = color;
      context.strokeStyle = 'rgba(0, 0, 0, 0.65)';
      context.lineWidth = 4;
      context.strokeText(`${value}°`, center.x + 12, center.y - 12);
      context.fillText(`${value}°`, center.x + 12, center.y - 12);
      context.font = '600 11px Manrope, sans-serif';
      context.fillText(measurement.label, center.x + 12, center.y + 4);
    });

    context.lineCap = 'round';
    context.lineJoin = 'round';
    POSE_CONNECTIONS.forEach(([fromIndex, toIndex]) => {
      const from = points.get(fromIndex);
      const to = points.get(toIndex);
      if (!from || !to) return;
      context.beginPath();
      context.moveTo(from.x, from.y);
      context.lineTo(to.x, to.y);
      context.strokeStyle = riskSegments.get(`${fromIndex}-${toIndex}`) || riskSegments.get(`${toIndex}-${fromIndex}`) || '#38bdf8';
      context.lineWidth = lineWidth;
      context.stroke();
    });

    pose.forEach((_, index) => {
      const point = points.get(index);
      if (!point) return;
      context.beginPath();
      context.arc(point.x, point.y, 4, 0, Math.PI * 2);
      context.fillStyle = '#f8fafc';
      context.fill();
      context.strokeStyle = '#0f172a';
      context.lineWidth = 1;
      context.stroke();
    });
  }, [angles, lineWidth, mirrored, pose, showGrid]);

  return (
    <canvas
      ref={(canvas) => {
        canvasRef.current = canvas;
        onCanvasReady?.(canvas);
      }}
      className={`pointer-events-none absolute inset-0 z-10 h-full w-full ${className || ''}`}
      aria-hidden="true"
    />
  );
}