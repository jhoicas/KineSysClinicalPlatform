import html2canvas from 'html2canvas';
import type { PainObservation } from '../types';

/**
 * Captura un nodo DOM (lienzo / SVG del mapa de dolor) a imagen PNG Base64
 * lista para incrustar en jsPDF (`addImage`).
 */
export async function captureElementToPngBase64(
  element: HTMLElement,
  options?: { scale?: number; backgroundColor?: string | null },
): Promise<string> {
  const canvas = await html2canvas(element, {
    scale: options?.scale ?? 2,
    backgroundColor: options?.backgroundColor ?? '#ffffff',
    useCORS: true,
    logging: false,
    allowTaint: true,
  });
  const dataUrl = canvas.toDataURL('image/png');
  const parts = dataUrl.split(',');
  return parts.length > 1 ? parts[1] : dataUrl;
}

/** Color clínico por intensidad EVA (1–10). */
export function painLevelHex(level: number): string {
  if (level <= 3) return '#22c55e';
  if (level <= 6) return '#f59e0b';
  if (level <= 8) return '#f97316';
  return '#ef4444';
}

export function groupPainBySide(observations: PainObservation[]) {
  return {
    front: observations.filter((o) => o.body_side === 'front'),
    back: observations.filter((o) => o.body_side === 'back'),
  };
}
