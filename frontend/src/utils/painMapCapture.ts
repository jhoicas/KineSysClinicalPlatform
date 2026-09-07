import html2canvas from 'html2canvas';
import type { PainObservation } from '../types';

export interface CapturePngOptions {
  scale?: number;
  backgroundColor?: string | null;
  /** Retardo previo a la captura para que SVG/imágenes terminen de pintar */
  settleMs?: number;
}

/**
 * Captura un nodo DOM (lienzo / SVG anatómico) a PNG Base64
 * listo para `doc.addImage` en jsPDF.
 */
export async function captureElementToPngBase64(
  element: HTMLElement,
  options?: CapturePngOptions,
): Promise<string> {
  const settleMs = options?.settleMs ?? 450;
  if (settleMs > 0) {
    await new Promise((r) => setTimeout(r, settleMs));
  }

  // Forzar layout medible (evita capturas vacías off-screen)
  const prev = {
    position: element.style.position,
    left: element.style.left,
    top: element.style.top,
    opacity: element.style.opacity,
    pointerEvents: element.style.pointerEvents,
    zIndex: element.style.zIndex,
  };
  element.style.position = 'fixed';
  element.style.left = '0';
  element.style.top = '0';
  element.style.opacity = '1';
  element.style.pointerEvents = 'none';
  element.style.zIndex = '-1';

  try {
    const canvas = await html2canvas(element, {
      scale: options?.scale ?? 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: options?.backgroundColor ?? '#ffffff',
      logging: false,
      foreignObjectRendering: false,
      imageTimeout: 15000,
      onclone: (_doc, cloned) => {
        cloned.style.opacity = '1';
        cloned.style.visibility = 'visible';
        cloned.style.position = 'static';
        cloned.style.left = 'auto';
        cloned.style.top = 'auto';
        cloned.style.zIndex = 'auto';
        cloned.querySelectorAll('svg').forEach((svg) => {
          (svg as SVGElement).style.visibility = 'visible';
          (svg as SVGElement).style.opacity = '1';
        });
      },
    });
    const dataUrl = canvas.toDataURL('image/png');
    const parts = dataUrl.split(',');
    return parts.length > 1 ? parts[1] : dataUrl;
  } finally {
    element.style.position = prev.position;
    element.style.left = prev.left;
    element.style.top = prev.top;
    element.style.opacity = prev.opacity;
    element.style.pointerEvents = prev.pointerEvents;
    element.style.zIndex = prev.zIndex;
  }
}

/** Color clínico por intensidad EVA (1–10): Verde 1–3, Ámbar/Naranja 4–6, Rojo 7–10. */
export function painLevelHex(level: number): string {
  if (level <= 3) return '#22c55e';
  if (level <= 6) return '#f97316';
  return '#ef4444';
}

export function groupPainBySide(observations: PainObservation[]) {
  return {
    front: observations.filter((o) => o.body_side === 'front'),
    back: observations.filter((o) => o.body_side === 'back'),
  };
}
