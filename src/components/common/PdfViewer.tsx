import React, { useState, useEffect, useRef } from 'react';

export interface PdfViewerProps {
  /**
   * URL del documento (puede ser 'blob:...', 'data:application/pdf...', o 'https://...')
   */
  src?: string | null;
  /**
   * Blob binario directo del PDF
   */
  blob?: Blob | null;
  /**
   * Instancia jsPDF o documento con método .output('blob')
   */
  pdfDoc?: { output: (type: string) => any } | null;
  /**
   * Función asíncrona o síncrona para generar el PDF bajo demanda
   */
  generatePdf?: () => Promise<Blob | { output: (type: string) => any } | string> | Blob | { output: (type: string) => any } | string;
  /**
   * Título para la barra superior del visor y accesibilidad
   */
  title?: string;
  /**
   * Nombre sugerido para la descarga del archivo (ej: 'Informe_Paciente.pdf')
   */
  fileName?: string;
  /**
   * Clase CSS opcional para el contenedor principal
   */
  className?: string;
  /**
   * Altura personalizada del visor (por defecto: 'h-full min-h-[550px]')
   */
  height?: string;
  /**
   * Si debe mostrar la barra de herramientas integrada (descarga, nueva pestaña, recargar)
   */
  showToolbar?: boolean;
  /**
   * Callback ejecutado cuando el PDF termina de cargarse exitosamente
   */
  onLoadSuccess?: (url: string) => void;
  /**
   * Callback ejecutado en caso de error de compilación o visualización
   */
  onLoadError?: (error: Error) => void;
}

/**
 * Convierte un Data URI en Base64 a un Blob con tipo application/pdf
 * Esto soluciona los bloqueos de iframes en navegadores modernos frente a Data URIs extensos.
 */
function dataUriToBlob(dataUri: string): Blob {
  const parts = dataUri.split(',');
  const byteString = atob(parts[1] || parts[0]);
  const mimeMatch = parts[0].match(/:(.*?);/);
  const mimeType = mimeMatch ? mimeMatch[1] : 'application/pdf';
  const arrayBuffer = new ArrayBuffer(byteString.length);
  const uint8Array = new Uint8Array(arrayBuffer);

  for (let i = 0; i < byteString.length; i++) {
    uint8Array[i] = byteString.charCodeAt(i);
  }

  return new Blob([uint8Array], { type: mimeType });
}

export const PdfViewer: React.FC<PdfViewerProps> = ({
  src,
  blob,
  pdfDoc,
  generatePdf,
  title = 'Documento Clínico PDF',
  fileName = 'documento_clinico.pdf',
  className = '',
  height = 'min-h-[550px] h-full',
  showToolbar = true,
  onLoadSuccess,
  onLoadError,
}) => {
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState<number>(0);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    let isCancelled = false;
    let createdBlobUrl: string | null = null;

    const preparePdfUrl = async () => {
      setIsLoading(true);
      setError(null);

      try {
        let finalBlob: Blob | null = null;

        // 1. Fuente directa: Función generadora
        if (generatePdf) {
          const result = await generatePdf();
          if (result instanceof Blob) {
            finalBlob = result;
          } else if (result && typeof (result as any).output === 'function') {
            finalBlob = (result as any).output('blob');
          } else if (typeof result === 'string') {
            if (result.startsWith('data:')) {
              finalBlob = dataUriToBlob(result);
            } else if (result.startsWith('blob:') || result.startsWith('http')) {
              createdBlobUrl = result;
            }
          }
        }
        // 2. Fuente directa: Instancia jsPDF
        else if (pdfDoc && typeof pdfDoc.output === 'function') {
          finalBlob = pdfDoc.output('blob');
        }
        // 3. Fuente directa: Blob binario
        else if (blob instanceof Blob) {
          finalBlob = blob;
        }
        // 4. Fuente directa: String URL (Blob, Data URI, o HTTP)
        else if (src) {
          if (src.startsWith('data:')) {
            finalBlob = dataUriToBlob(src);
          } else {
            createdBlobUrl = src;
          }
        }

        // Si tenemos un Blob, creamos un ObjectURL seguro
        if (finalBlob) {
          createdBlobUrl = URL.createObjectURL(finalBlob);
        }

        if (!createdBlobUrl && !finalBlob) {
          throw new Error('No se proporcionó un documento PDF válido para visualizar.');
        }

        if (!isCancelled && createdBlobUrl) {
          setObjectUrl(createdBlobUrl);
          setIsLoading(false);
          onLoadSuccess?.(createdBlobUrl);
        }
      } catch (err: any) {
        console.error('Error preparando el visor PDF:', err);
        if (!isCancelled) {
          const errMsg = err?.message || 'No se pudo compilar o procesar el documento PDF.';
          setError(errMsg);
          setIsLoading(false);
          onLoadError?.(err);
        }
      }
    };

    preparePdfUrl();

    // Limpieza de memoria (Cleanup de ObjectURL)
    return () => {
      isCancelled = true;
      if (createdBlobUrl && createdBlobUrl.startsWith('blob:')) {
        URL.revokeObjectURL(createdBlobUrl);
      }
    };
  }, [src, blob, pdfDoc, generatePdf, reloadKey]);

  // Manejador de descarga manual
  const handleDownload = () => {
    if (!objectUrl) return;
    const link = document.createElement('a');
    link.href = objectUrl;
    link.download = fileName.endsWith('.pdf') ? fileName : `${fileName}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Abrir en nueva ventana/pestaña
  const handleOpenNewTab = () => {
    if (!objectUrl) return;
    window.open(objectUrl, '_blank', 'noopener,noreferrer');
  };

  // Manejador de impresión
  const handlePrint = () => {
    if (!objectUrl) return;
    try {
      if (iframeRef.current && iframeRef.current.contentWindow) {
        iframeRef.current.contentWindow.focus();
        iframeRef.current.contentWindow.print();
      } else {
        handleOpenNewTab();
      }
    } catch {
      handleOpenNewTab();
    }
  };

  const handleRetry = () => {
    setReloadKey((prev) => prev + 1);
  };

  return (
    <div
      className={`relative w-full flex flex-col bg-surface-container-high rounded-2xl border border-outline-variant/40 overflow-hidden shadow-sm ${height} ${className}`}
    >
      {/* Barra de Herramientas Superior */}
      {showToolbar && (
        <div className="bg-surface-container-lowest border-b border-outline-variant/30 px-4 py-2.5 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <span className="material-symbols-outlined text-primary text-lg shrink-0">
              picture_as_pdf
            </span>
            <span className="text-xs font-black text-on-surface truncate" title={title}>
              {title}
            </span>
            <span className="hidden sm:inline-block text-[10px] font-mono px-2 py-0.5 rounded-md bg-surface-container-high text-on-surface-variant shrink-0">
              PDF Interactivo
            </span>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={handleOpenNewTab}
              disabled={!objectUrl || isLoading}
              title="Abrir en pestaña completa"
              className="p-1.5 text-on-surface-variant hover:text-primary hover:bg-surface-container-high rounded-lg text-xs font-bold transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1"
            >
              <span className="material-symbols-outlined text-base">open_in_new</span>
              <span className="hidden md:inline">Nueva Pestaña</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              disabled={!objectUrl || isLoading}
              title="Imprimir documento"
              className="p-1.5 text-on-surface-variant hover:text-primary hover:bg-surface-container-high rounded-lg text-xs font-bold transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1"
            >
              <span className="material-symbols-outlined text-base">print</span>
              <span className="hidden md:inline">Imprimir</span>
            </button>

            <button
              type="button"
              onClick={handleDownload}
              disabled={!objectUrl || isLoading}
              title="Descargar archivo PDF"
              className="px-2.5 py-1 bg-primary hover:bg-primary/90 text-white rounded-lg text-xs font-bold shadow-2xs transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1"
            >
              <span className="material-symbols-outlined text-sm">download</span>
              <span>Descargar</span>
            </button>
          </div>
        </div>
      )}

      {/* Contenedor Principal de Visualización */}
      <div className="relative flex-1 w-full h-full bg-slate-900/90 flex flex-col items-center justify-center overflow-hidden">
        {/* Estado de Carga (Spinner & Skeleton) */}
        {isLoading && (
          <div className="absolute inset-0 z-20 bg-surface-container-lowest/90 backdrop-blur-xs flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-150">
            <div className="w-12 h-12 rounded-full border-4 border-primary/20 border-t-primary animate-spin mb-4" />
            <h4 className="text-sm font-black text-on-surface mb-1">
              Cargando documento PDF...
            </h4>
            <p className="text-xs text-on-surface-variant max-w-xs">
              Compilando vectores clínicos, tablas de biometría y sellos digitales.
            </p>
          </div>
        )}

        {/* Estado de Error */}
        {error && !isLoading && (
          <div className="absolute inset-0 z-20 bg-surface-container-lowest flex flex-col items-center justify-center p-6 text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-error-container text-error flex items-center justify-center">
              <span className="material-symbols-outlined text-2xl">error_outline</span>
            </div>
            <div className="max-w-sm space-y-1">
              <h4 className="text-sm font-black text-on-surface">
                No se pudo cargar el PDF
              </h4>
              <p className="text-xs text-error font-medium">{error}</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleRetry}
                className="px-4 py-2 bg-surface-container-high hover:bg-surface-container-highest text-on-surface text-xs font-bold rounded-xl border border-outline-variant/40 cursor-pointer flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-sm">refresh</span>
                <span>Reintentar</span>
              </button>
              {objectUrl && (
                <button
                  type="button"
                  onClick={handleDownload}
                  className="px-4 py-2 bg-primary text-white text-xs font-bold rounded-xl cursor-pointer flex items-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-sm">download</span>
                  <span>Descargar Directamente</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Componente de Visualización Nativa con Fallback Seguro */}
        {objectUrl && !error && (
          <iframe
            ref={iframeRef}
            src={`${objectUrl}#toolbar=1&navpanes=0&view=FitH`}
            title={title}
            className="w-full h-full min-h-[500px] border-none block flex-1 bg-white"
          />
        )}
      </div>
    </div>
  );
};
