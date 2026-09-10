export async function captureBiomechanicsSnapshot(
  videoElement: HTMLVideoElement,
  canvasElement: HTMLCanvasElement
): Promise<string | null> {
  const width = videoElement.videoWidth || videoElement.clientWidth;
  const height = videoElement.videoHeight || videoElement.clientHeight;
  if (!width || !height) return null;

  const captureCanvas = document.createElement('canvas');
  captureCanvas.width = width;
  captureCanvas.height = height;
  const context = captureCanvas.getContext('2d');
  if (!context) return null;

  try {
    context.drawImage(videoElement, 0, 0, width, height);
    context.drawImage(canvasElement, 0, 0, width, height);
    return captureCanvas.toDataURL('image/jpeg', 0.9);
  } catch (error) {
    console.error('No se pudo capturar la evidencia biomecánica.', error);
    return null;
  }
}