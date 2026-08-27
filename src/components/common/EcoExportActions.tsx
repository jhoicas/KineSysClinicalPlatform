import React, { useState } from 'react';
import { PacienteClinico, PlanNutricional, EvaluacionAntropometrica, Tenant } from '../../types';
import { useAuth } from '../../app/providers/AuthProvider';
import { supabase } from '../../services/supabaseClient';
import {
  downloadNutritionPlanPdf,
  getNutritionPlanPdfBase64,
  getNutritionPlanPdfBlob,
  getNutritionPlanPdfDataUrl,
} from '../../utils/nutritionPdfExport';
import {
  downloadAnthropometryPdf,
  getAnthropometryPdfBase64,
  getAnthropometryPdfBlob,
  getAnthropometryPdfDataUrl,
} from '../../utils/anthropometryPdfExport';
import { PdfViewer } from './PdfViewer';

export interface EcoExportActionsProps {
  patient: PacienteClinico;
  documentType: 'plan_nutricional' | 'antropometria' | 'historia_clinica';
  plan?: PlanNutricional | null;
  evaluation?: EvaluacionAntropometrica | null;
  historyEvaluations?: EvaluacionAntropometrica[];
  tenant?: Tenant | null;
  nutritionistName?: string;
  customTitle?: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  showPreviewOption?: boolean;
  onSuccess?: (result: any) => void;
  onError?: (error: string) => void;
}

export const EcoExportActions: React.FC<EcoExportActionsProps> = ({
  patient,
  documentType,
  plan,
  evaluation,
  historyEvaluations,
  tenant: propsTenant,
  nutritionistName,
  customTitle,
  className = '',
  size = 'md',
  showPreviewOption = true,
  onSuccess,
  onError,
}) => {
  const { tenant: authTenant, user } = useAuth();
  const activeTenant = propsTenant || authTenant;

  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);

  // Email form state
  const defaultEmail = patient.telecom_email || '';
  const [recipientEmail, setRecipientEmail] = useState(defaultEmail);
  const [customMessage, setCustomMessage] = useState(
    `Hola ${patient.first_name || ''}, te adjunto tu ${
      documentType === 'plan_nutricional' ? 'Plan Nutricional' : 'Evaluación Antropométrica'
    } actualizado con las pautas e indicaciones clínicas.`
  );
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string; impact?: any } | null>(
    null
  );

  const docTypeName =
    documentType === 'plan_nutricional'
      ? 'Plan Nutricional'
      : documentType === 'antropometria'
      ? 'Evaluación Antropométrica'
      : 'Historia Clínica';

  const effectiveNutritionistName =
    nutritionistName ||
    plan?.nutritionist_name ||
    user?.full_name ||
    'Nutricionista KineSys';

  const getPdfOptions = () => {
    const primaryColor = activeTenant?.primary_color || '#004870';
    const clinicName = activeTenant?.name || 'KineSys Salud & Centro Clínico';
    const clinicAddress = (activeTenant?.settings as any)?.address || 'Av. Salud Integral 1050, Piso 4';
    const clinicPhone = (activeTenant?.settings as any)?.phone || '+56 9 8765 4321';
    const clinicEmail = (activeTenant?.settings as any)?.email || 'contacto@kinesys.health';
    const clinicLogo = activeTenant?.logo_url || undefined;

    return {
      patient,
      nutritionistName: effectiveNutritionistName,
      clinicName,
      clinicAddress,
      clinicPhone,
      clinicEmail,
      clinicLogoBase64: clinicLogo,
      primaryColorHex: primaryColor,
    };
  };

  // 1. Download handler
  const handleDownloadPdf = async () => {
    try {
      setIsDownloading(true);
      setStatusMessage(null);

      // Yield event loop for immediate UI responsiveness
      await new Promise((r) => setTimeout(r, 80));

      if (documentType === 'plan_nutricional' && plan) {
        downloadNutritionPlanPdf({
          ...getPdfOptions(),
          plan,
          evaluation,
        });
      } else if (documentType === 'antropometria' && evaluation) {
        downloadAnthropometryPdf({
          ...getPdfOptions(),
          evaluation,
          historyEvaluations,
        });
      } else {
        throw new Error('Faltan datos requeridos del documento para generar el PDF.');
      }

      setStatusMessage({
        type: 'success',
        text: `¡${docTypeName} descargado con éxito en formato PDF!`,
      });
      setTimeout(() => setStatusMessage(null), 5000);
    } catch (err: any) {
      console.error('Error downloading PDF:', err);
      const errMsg = err?.message || 'Error al compilar el documento PDF.';
      setStatusMessage({ type: 'error', text: errMsg });
      onError?.(errMsg);
    } finally {
      setIsDownloading(false);
    }
  };

  // 2. Open Preview modal
  const handleOpenPreview = () => {
    setIsPreviewModalOpen(true);
  };

  // 3. Send Eco-Friendly Email via Supabase Edge Function
  const handleSendEcoEmail = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!recipientEmail || !recipientEmail.includes('@')) {
      setStatusMessage({
        type: 'error',
        text: 'Por favor ingrese una dirección de correo válida.',
      });
      return;
    }

    try {
      setIsSendingEmail(true);
      setStatusMessage(null);

      // Generate Base64 PDF in memory
      let pdfBase64 = '';
      const lastName = patient.last_name?.replace(/\s+/g, '_') || 'Paciente';
      const dateStr = new Date().toISOString().split('T')[0];
      const filename = `${docTypeName.replace(/\s+/g, '_')}_${lastName}_${dateStr}.pdf`;

      if (documentType === 'plan_nutricional' && plan) {
        pdfBase64 = getNutritionPlanPdfBase64({
          ...getPdfOptions(),
          plan,
          evaluation,
        });
      } else if (documentType === 'antropometria' && evaluation) {
        pdfBase64 = getAnthropometryPdfBase64({
          ...getPdfOptions(),
          evaluation,
          historyEvaluations,
        });
      } else {
        throw new Error('No se puede generar el archivo PDF: datos incompletos.');
      }

      const payload = {
        to_email: recipientEmail.trim(),
        patient_name: `${patient.first_name || ''} ${patient.last_name || ''}`.trim() || 'Paciente',
        document_type: docTypeName,
        subject: `Tu ${docTypeName} - ${activeTenant?.name || 'KineSys Salud'}`,
        pdf_base64: pdfBase64,
        filename,
        clinic_name: activeTenant?.name || 'KineSys Salud & Centro Clínico',
        primary_color: activeTenant?.primary_color || '#004870',
        nutritionist_name: effectiveNutritionistName,
        custom_message: customMessage,
        tenant_id: activeTenant?.id,
      };

      // Invoke Supabase Edge Function
      const { data, error } = await supabase.functions.invoke('send-patient-document', {
        body: payload,
      });

      if (error) {
        throw new Error(error.message || 'Error en la función de entrega de correo.');
      }

      setIsEmailModalOpen(false);
      setStatusMessage({
        type: 'success',
        text: `🌱 ¡Documento enviado con éxito a ${recipientEmail}!`,
        impact: data?.eco_saved || { paper_sheets: 2, water_liters: 20 },
      });

      onSuccess?.(data);
      setTimeout(() => setStatusMessage(null), 8000);
    } catch (err: any) {
      console.error('Error sending eco-friendly email:', err);
      const msg = err?.message || 'Hubo un inconveniente al enviar el correo.';
      setStatusMessage({ type: 'error', text: msg });
      onError?.(msg);
    } finally {
      setIsSendingEmail(false);
    }
  };

  const btnPadding =
    size === 'sm'
      ? 'px-3 py-1.5 text-xs'
      : size === 'lg'
      ? 'px-6 py-3 text-sm'
      : 'px-4 py-2.5 text-xs';

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Action Buttons Row */}
      <div className="flex flex-wrap items-center gap-2.5">
        {/* 1. Download PDF Button */}
        <button
          type="button"
          onClick={handleDownloadPdf}
          disabled={isDownloading}
          className={`${btnPadding} bg-surface-container-high hover:bg-surface-container-highest text-on-surface font-extrabold rounded-2xl border border-outline-variant/50 flex items-center gap-2 cursor-pointer shadow-2xs transition-all hover:scale-[1.01] active:scale-[0.99]`}
          title={`Descargar ${docTypeName} en PDF con branding institucional`}
        >
          <span className="material-symbols-outlined text-base text-primary">
            {isDownloading ? 'hourglass_top' : 'download'}
          </span>
          <span>{isDownloading ? 'Generando PDF...' : 'Descargar PDF'}</span>
        </button>

        {/* 2. Eco-Friendly Email Button */}
        <button
          type="button"
          onClick={() => {
            setRecipientEmail(patient.telecom_email || '');
            setIsEmailModalOpen(true);
          }}
          className={`${btnPadding} bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-2xl shadow-xs flex items-center gap-2 cursor-pointer transition-all hover:scale-[1.01] active:scale-[0.99] border border-emerald-500/40`}
          title="Enviar documento directamente al correo del paciente (Cero Papel)"
        >
          <span className="material-symbols-outlined text-base text-emerald-200">
            eco
          </span>
          <span>Enviar por Correo</span>
          <span className="hidden sm:inline-block px-1.5 py-0.5 bg-emerald-800/60 text-emerald-200 text-[9px] font-black rounded-md tracking-wider uppercase">
            Eco-Friendly
          </span>
        </button>

        {/* 3. Optional Preview Button */}
        {showPreviewOption && (
          <button
            type="button"
            onClick={handleOpenPreview}
            className={`${btnPadding} bg-surface-container-low hover:bg-surface-container text-on-surface-variant hover:text-on-surface font-bold rounded-2xl border border-outline-variant/30 flex items-center gap-1.5 cursor-pointer transition-colors`}
            title="Vista previa del documento generado"
          >
            <span className="material-symbols-outlined text-base">visibility</span>
            <span className="hidden md:inline">Vista Previa</span>
          </button>
        )}
      </div>

      {/* Dynamic Status / Feedback Alert */}
      {statusMessage && (
        <div
          className={`p-3 rounded-2xl border flex items-center justify-between gap-3 text-xs animate-fadeIn ${
            statusMessage.type === 'success'
              ? 'bg-emerald-50 text-emerald-900 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-200 dark:border-emerald-800/50'
              : 'bg-error-container/40 text-on-error-container border-error/30'
          }`}
        >
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-base">
              {statusMessage.type === 'success' ? 'check_circle' : 'error'}
            </span>
            <div>
              <span className="font-bold">{statusMessage.text}</span>
              {statusMessage.impact && (
                <p className="text-[11px] text-emerald-700 dark:text-emerald-300 font-medium mt-0.5">
                  🌱 Impacto ambiental: Has ahorrado aproximadamente {statusMessage.impact.paper_sheets || 2} hojas
                  de papel y {(statusMessage.impact.water_liters || 20)}L de agua.
                </p>
              )}
            </div>
          </div>
          <button
            onClick={() => setStatusMessage(null)}
            className="text-on-surface-variant hover:text-on-surface p-1 cursor-pointer"
          >
            <span className="material-symbols-outlined text-sm">close</span>
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: ECO-FRIENDLY EMAIL DISPATCH MODAL                                */}
      {/* ========================================================================= */}
      {isEmailModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest w-full max-w-lg rounded-3xl border border-outline-variant/40 shadow-2xl p-6 space-y-5 animate-scaleUp">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-outline-variant/30">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <span className="material-symbols-outlined text-2xl">eco</span>
                </div>
                <div>
                  <h3 className="text-sm font-black text-on-surface">
                    Envío Eco-Friendly a Paciente
                  </h3>
                  <p className="text-xs text-on-surface-variant">
                    Entrega digital directa sin uso de papel
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsEmailModalOpen(false)}
                className="p-1.5 rounded-full hover:bg-surface-container-high text-on-surface-variant cursor-pointer"
              >
                <span className="material-symbols-outlined text-xl">close</span>
              </button>
            </div>

            {/* Environmental Impact Pill */}
            <div className="p-3 bg-emerald-50/80 dark:bg-emerald-950/20 border border-emerald-200/80 dark:border-emerald-800/40 rounded-2xl flex items-center gap-3">
              <span className="text-2xl">🍃</span>
              <div className="text-xs">
                <strong className="text-emerald-900 dark:text-emerald-200 block">
                  Iniciativa Verde KineSys
                </strong>
                <span className="text-emerald-700 dark:text-emerald-400 text-[11px]">
                  El paciente recibirá el PDF oficial con el branding de {activeTenant?.name || 'su clínica'} en su bandeja de entrada.
                </span>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleSendEcoEmail} className="space-y-4 text-xs">
              <div>
                <label className="block font-extrabold text-on-surface mb-1">
                  Correo Electrónico de Destino *
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-on-surface-variant material-symbols-outlined text-base">
                    mail
                  </span>
                  <input
                    type="email"
                    required
                    value={recipientEmail}
                    onChange={(e) => setRecipientEmail(e.target.value)}
                    placeholder="paciente@correo.com"
                    className="w-full bg-surface-container-low border border-outline-variant/50 rounded-2xl pl-9 pr-3 py-2 text-xs font-bold text-on-surface focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                  />
                </div>
                {!patient.telecom_email && (
                  <p className="text-[10px] text-amber-600 dark:text-amber-400 mt-1">
                    ⚠️ El paciente no tiene un correo registrado en su ficha; especifique uno arriba.
                  </p>
                )}
              </div>

              <div>
                <label className="block font-extrabold text-on-surface mb-1">
                  Mensaje Personalizado (Opcional)
                </label>
                <textarea
                  rows={3}
                  value={customMessage}
                  onChange={(e) => setCustomMessage(e.target.value)}
                  className="w-full bg-surface-container-low border border-outline-variant/50 rounded-2xl p-3 text-xs font-medium text-on-surface focus:outline-none focus:ring-2 focus:ring-emerald-500/50 leading-relaxed"
                  placeholder="Escriba indicaciones o palabras de aliento para el paciente..."
                />
              </div>

              {/* Document Summary Pill */}
              <div className="p-3 bg-surface-container-low rounded-2xl border border-outline-variant/30 flex items-center justify-between text-[11px]">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-base">
                    description
                  </span>
                  <span className="font-bold text-on-surface">
                    {docTypeName}: {patient.first_name} {patient.last_name}
                  </span>
                </div>
                <span className="text-on-surface-variant font-mono">PDF Oficial</span>
              </div>

              {/* Actions Footer */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsEmailModalOpen(false)}
                  disabled={isSendingEmail}
                  className="px-4 py-2 text-on-surface-variant font-bold hover:bg-surface-container-high rounded-xl transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSendingEmail || !recipientEmail}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-extrabold rounded-2xl shadow-xs flex items-center gap-2 cursor-pointer transition-all"
                >
                  <span className="material-symbols-outlined text-base">
                    {isSendingEmail ? 'hourglass_top' : 'send'}
                  </span>
                  <span>{isSendingEmail ? 'Enviando Eco-Email...' : 'Enviar Documento'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: INTERACTIVE PDF PREVIEW MODAL                                   */}
      {/* ========================================================================= */}
      {isPreviewModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest w-full max-w-4xl h-[88vh] rounded-3xl border border-outline-variant/40 shadow-2xl flex flex-col overflow-hidden animate-scaleUp">
            {/* Header */}
            <div className="p-4 border-b border-outline-variant/30 flex items-center justify-between bg-surface-container-low">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-xl">
                  picture_as_pdf
                </span>
                <span className="font-extrabold text-sm text-on-surface">
                  Vista Previa Oficial: {docTypeName}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsPreviewModalOpen(false);
                    setIsEmailModalOpen(true);
                  }}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <span className="material-symbols-outlined text-sm">eco</span>
                  <span>Enviar por Correo</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsPreviewModalOpen(false)}
                  className="p-1.5 rounded-full hover:bg-surface-container-high text-on-surface-variant cursor-pointer ml-2"
                >
                  <span className="material-symbols-outlined text-xl">close</span>
                </button>
              </div>
            </div>

            {/* PDF Viewer */}
            <div className="flex-1 w-full h-full min-h-[500px] overflow-hidden">
              <PdfViewer
                generatePdf={() => {
                  if (documentType === 'plan_nutricional' && plan) {
                    return getNutritionPlanPdfBlob({
                      ...getPdfOptions(),
                      plan,
                      evaluation,
                    });
                  } else if (documentType === 'antropometria' && evaluation) {
                    return getAnthropometryPdfBlob({
                      ...getPdfOptions(),
                      evaluation,
                      historyEvaluations,
                    });
                  }
                  throw new Error('Faltan datos para compilar la vista previa.');
                }}
                title={`${docTypeName} - ${patient.first_name} ${patient.last_name}`}
                fileName={`${docTypeName.replace(/\s+/g, '_')}_${(patient.last_name || 'Paciente').replace(/\s+/g, '_')}.pdf`}
                height="h-full w-full min-h-[500px]"
                showToolbar={true}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
