import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type {
  HistoriaClinica,
  KinesiologyEvaluation,
  PacienteClinico,
  PainObservation,
  PostureAssessment,
} from '../../types';
import { useAuth } from '../../app/providers/AuthProvider';
import { supabase } from '../../services/supabaseClient';
import { PdfViewer } from '../common/PdfViewer';
import { PainMapPdfSnapshot } from './PainMapPdfSnapshot';
import { PosturePdfSnapshot } from './PosturePdfSnapshot';
import { createEmptyPosture } from '../../data/kinesiologyCatalog';
import {
  capturePainMapForPdf,
  capturePostureForPdf,
  downloadKinesiologyPdf,
  getKinesiologyPdfBase64,
  getKinesiologyPdfBlob,
  type GenerateKinesiologyPdfOptions,
} from '../../utils/kinesiologyPdfExport';

export interface KinesiologyPdfModalProps {
  isOpen: boolean;
  onClose: () => void;
  patient: PacienteClinico;
  evaluation: Partial<KinesiologyEvaluation> | null;
  historia?: HistoriaClinica | null;
  painObservations?: PainObservation[];
  physiotherapistName?: string;
  onToast?: (type: 'success' | 'error', title: string, message: string) => void;
}

export const KinesiologyPdfModal: React.FC<KinesiologyPdfModalProps> = ({
  isOpen,
  onClose,
  patient,
  evaluation,
  historia = null,
  painObservations: painProp,
  physiotherapistName,
  onToast,
}) => {
  const { user, tenant } = useAuth();
  const painCaptureRef = useRef<HTMLDivElement>(null);
  const postureCaptureRef = useRef<HTMLDivElement>(null);

  const [painObservations, setPainObservations] = useState<PainObservation[]>(painProp || []);
  const [painMapImageBase64, setPainMapImageBase64] = useState<string | null>(null);
  const [postureImageBase64, setPostureImageBase64] = useState<string | null>(null);
  const [capturing, setCapturing] = useState(false);
  const [isEmailOpen, setIsEmailOpen] = useState(false);
  const [recipientEmail, setRecipientEmail] = useState(patient.telecom_email || '');
  const [customMessage, setCustomMessage] = useState(
    `Hola ${patient.first_name || ''}, te compartimos tu Informe de Evaluación Kinésica con los hallazgos clínicos y el plan terapéutico sugerido.`,
  );
  const [isSending, setIsSending] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [previewKey, setPreviewKey] = useState(0);

  const professionalName =
    physiotherapistName || user?.full_name || 'Fisioterapeuta KineSys';

  const clinicOptions = useMemo(
    () => ({
      clinicName: tenant?.name || 'KineSys Clinical Platform',
      clinicAddress: (tenant?.settings as { address?: string } | undefined)?.address || 'Centro Clínico',
      clinicPhone: (tenant?.settings as { phone?: string } | undefined)?.phone || '',
      clinicEmail: (tenant?.settings as { email?: string } | undefined)?.email || '',
      primaryColorHex: tenant?.primary_color || '#004870',
      physiotherapistName: professionalName,
    }),
    [tenant, professionalName],
  );

  const postureForCapture: PostureAssessment =
    (evaluation?.postura as PostureAssessment | undefined) || createEmptyPosture();

  const pdfOptions: GenerateKinesiologyPdfOptions = useMemo(
    () => ({
      patient,
      historia,
      evaluation,
      painObservations,
      painMapImageBase64,
      postureImageBase64,
      ...clinicOptions,
      evaluationDate: evaluation?.created_at?.slice(0, 10) || new Date().toISOString().slice(0, 10),
    }),
    [
      patient,
      historia,
      evaluation,
      painObservations,
      painMapImageBase64,
      postureImageBase64,
      clinicOptions,
    ],
  );

  // Sync external pain list or fetch from Supabase
  useEffect(() => {
    if (!isOpen) return;
    setRecipientEmail(patient.telecom_email || '');

    if (painProp && painProp.length > 0) {
      setPainObservations(painProp);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const { data, error } = await supabase
          .from('pain_observations')
          .select('*')
          .eq('patient_id', patient.id)
          .order('created_at', { ascending: false });
        if (error) throw error;
        if (!cancelled) setPainObservations((data as PainObservation[]) || []);
      } catch (err) {
        console.error('Supabase Error:', err);
        if (!cancelled) setPainObservations([]);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isOpen, patient.id, patient.telecom_email, painProp]);

  // Captura HD: mapa anatómico + postura (html2canvas, settle 400ms dentro del helper)
  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;

    const run = async () => {
      // Primer paint del DOM (SVG anatómico + visualizador postural)
      await new Promise((r) => setTimeout(r, 450));
      if (cancelled) return;
      setCapturing(true);
      try {
        let painB64: string | null = null;
        let postureB64: string | null = null;

        if (painCaptureRef.current) {
          painB64 = await capturePainMapForPdf(painCaptureRef.current);
        }
        if (postureCaptureRef.current) {
          postureB64 = await capturePostureForPdf(postureCaptureRef.current);
        }

        if (!cancelled) {
          setPainMapImageBase64(painB64);
          setPostureImageBase64(postureB64);
          setPreviewKey((k) => k + 1);
        }
      } catch (err) {
        console.error('Error capturando gráficos PDF:', err);
        if (!cancelled) {
          setPainMapImageBase64(null);
          setPostureImageBase64(null);
        }
      } finally {
        if (!cancelled) setCapturing(false);
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [isOpen, painObservations, evaluation?.postura]);

  const handleDownload = useCallback(async () => {
    try {
      setIsDownloading(true);
      await new Promise((r) => setTimeout(r, 40));
      downloadKinesiologyPdf(pdfOptions);
      onToast?.(
        'success',
        'PDF descargado',
        'El Informe de Evaluación Kinésica se guardó en tu dispositivo.',
      );
    } catch (err) {
      console.error(err);
      onToast?.('error', 'Error', 'No se pudo generar el PDF.');
    } finally {
      setIsDownloading(false);
    }
  }, [pdfOptions, onToast]);

  const handleSendEco = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recipientEmail.includes('@')) {
      onToast?.('error', 'Correo inválido', 'Ingresa una dirección de correo válida.');
      return;
    }

    try {
      setIsSending(true);
      const lastName = patient.last_name?.replace(/\s+/g, '_') || 'Paciente';
      const dateStr = new Date().toISOString().slice(0, 10);
      const filename = `Evaluacion_Kinesica_${lastName}_${dateStr}.pdf`;
      const pdf_base64 = getKinesiologyPdfBase64(pdfOptions);

      const payload = {
        to_email: recipientEmail.trim(),
        patient_name: `${patient.first_name || ''} ${patient.last_name || ''}`.trim() || 'Paciente',
        document_type: 'Informe de Evaluación Kinésica',
        subject: `Tu Informe de Evaluación Kinésica - ${clinicOptions.clinicName}`,
        pdf_base64,
        filename,
        clinic_name: clinicOptions.clinicName,
        primary_color: clinicOptions.primaryColorHex,
        nutritionist_name: professionalName,
        custom_message: customMessage,
        tenant_id: tenant?.id,
      };

      const { data, error } = await supabase.functions.invoke('send-patient-document', {
        body: payload,
      });

      if (error) throw new Error(error.message || 'Error en envío Eco-Friendly');
      if (data?.success === false) {
        throw new Error(
          typeof data.error === 'string'
            ? data.error
            : data.error?.message || 'Resend rechazó el envío',
        );
      }

      setIsEmailOpen(false);
      onToast?.(
        'success',
        'Envío Eco-Friendly',
        `Documento enviado a ${recipientEmail}. Ahorro estimado: 2 hojas y 20 L de agua.`,
      );
    } catch (err: unknown) {
      console.error('Supabase Error:', err);
      const msg = err instanceof Error ? err.message : 'No se pudo enviar el correo.';
      onToast?.('error', 'Error de envío', msg);
    } finally {
      setIsSending(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      {/* Targets de captura: el helper los mueve a fixed 0,0 durante html2canvas */}
      <div
        aria-hidden
        className="fixed pointer-events-none"
        style={{ left: -10000, top: 0, width: 640, opacity: 1 }}
      >
        <PainMapPdfSnapshot ref={painCaptureRef} observations={painObservations} />
      </div>
      <div
        aria-hidden
        className="fixed pointer-events-none"
        style={{ left: -10000, top: 520, width: 740, opacity: 1 }}
      >
        <PosturePdfSnapshot ref={postureCaptureRef} posture={postureForCapture} />
      </div>

      <div className="bg-surface-container-lowest w-full max-w-5xl rounded-3xl border border-outline-variant/40 shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
        <div className="p-5 border-b border-outline-variant/30 flex flex-wrap items-center justify-between gap-3 bg-surface-container-low">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-primary-fixed text-primary flex items-center justify-center border border-primary-fixed-dim">
              <span className="material-symbols-outlined text-xl">picture_as_pdf</span>
            </div>
            <div>
              <h3 className="text-sm font-black text-on-surface">
                Informe de Evaluación Kinésica Integral
              </h3>
              <p className="text-xs text-on-surface-variant">
                {patient.first_name} {patient.last_name} · Historia · Mapa de dolor · Valoración
                {capturing ? ' · Capturando gráficas anatómicas…' : ''}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-surface-container-high text-on-surface-variant cursor-pointer"
          >
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
        </div>

        <div className="px-5 py-3 border-b border-outline-variant/20 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleDownload}
            disabled={isDownloading || capturing}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-surface-container-high hover:bg-surface-container-highest text-on-surface text-xs font-extrabold border border-outline-variant/40 disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-base text-primary">
              {isDownloading ? 'hourglass_top' : 'download'}
            </span>
            Descargar PDF
          </button>
          <button
            type="button"
            onClick={() => setIsEmailOpen(true)}
            disabled={capturing}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-base">eco</span>
            Envío Eco-Friendly
          </button>
          <button
            type="button"
            onClick={() => setPreviewKey((k) => k + 1)}
            disabled={capturing}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl border border-outline-variant/30 text-on-surface-variant text-xs font-bold hover:bg-surface-container-low disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-base">visibility</span>
            Actualizar vista previa
          </button>
        </div>

        <div className="flex-1 min-h-[480px] overflow-hidden">
          <PdfViewer
            key={previewKey}
            generatePdf={() => getKinesiologyPdfBlob(pdfOptions)}
            title={`Evaluación Kinésica - ${patient.first_name} ${patient.last_name}`}
            fileName={`Evaluacion_Kinesica_${(patient.last_name || 'Paciente').replace(/\s+/g, '_')}.pdf`}
            height="h-full w-full min-h-[480px]"
            showToolbar
          />
        </div>
      </div>

      {isEmailOpen && (
        <div className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest w-full max-w-lg rounded-3xl border border-outline-variant/40 shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-emerald-600 text-2xl">eco</span>
                <h4 className="text-sm font-black text-on-surface">Envío Eco-Friendly a Paciente</h4>
              </div>
              <button type="button" onClick={() => setIsEmailOpen(false)} className="p-1 cursor-pointer">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <form onSubmit={handleSendEco} className="space-y-3 text-xs">
              <label className="block">
                <span className="font-extrabold text-on-surface">Correo del paciente *</span>
                <input
                  type="email"
                  required
                  value={recipientEmail}
                  onChange={(e) => setRecipientEmail(e.target.value)}
                  className="mt-1 w-full rounded-2xl border border-outline-variant/50 bg-surface-container-low px-3 py-2 font-bold"
                />
              </label>
              <label className="block">
                <span className="font-extrabold text-on-surface">Mensaje personalizado</span>
                <textarea
                  rows={3}
                  value={customMessage}
                  onChange={(e) => setCustomMessage(e.target.value)}
                  className="mt-1 w-full rounded-2xl border border-outline-variant/50 bg-surface-container-low px-3 py-2"
                />
              </label>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsEmailOpen(false)}
                  className="px-4 py-2 rounded-xl font-bold text-on-surface-variant"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSending}
                  className="px-5 py-2.5 rounded-2xl bg-emerald-600 text-white font-extrabold disabled:opacity-50 inline-flex items-center gap-2"
                >
                  <span className="material-symbols-outlined text-base">
                    {isSending ? 'hourglass_top' : 'send'}
                  </span>
                  {isSending ? 'Enviando…' : 'Enviar documento'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
