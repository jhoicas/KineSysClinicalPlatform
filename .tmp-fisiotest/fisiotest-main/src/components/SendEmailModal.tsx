import React, { useState } from 'react';
import { Patient, TreatmentPlan } from '../types';
import {
  Mail,
  Send,
  FileText,
  CheckCircle2,
  Paperclip,
  User,
  AlertCircle,
  ExternalLink,
  Sparkles,
} from 'lucide-react';

interface SendEmailModalProps {
  patient: Patient;
  treatment: TreatmentPlan;
  isOpen: boolean;
  onClose: () => void;
}

export const SendEmailModal: React.FC<SendEmailModalProps> = ({
  patient,
  treatment,
  isOpen,
  onClose,
}) => {
  const [recipientEmail, setRecipientEmail] = useState(patient.email || 'paciente@example.com');
  const [subject, setSubject] = useState(
    `[Core Body Fisioterapia] Resumen de Valoración y Plan Kinésico - ${patient.name}`
  );
  const [personalMessage, setPersonalMessage] = useState(
    `Hola ${patient.name},\n\nAdjunto encontrarás el informe completo de tu valoración fisioterapéutica realizada en Core Body, incluyendo el análisis postural en 3 planos, el mapa de dolor, la dinamometría de fuerza y tu plan de ejercicios de readaptación funcional.\n\nPor favor revisa las indicaciones de técnica y dosificación de cada ejercicio antes de tu próxima sesión.\n\nSaludos cordiales,\n${patient.physiotherapist}\nFisioterapeuta - ${patient.physiotherapistId}`
  );
  const [isSending, setIsSending] = useState(false);
  const [isSent, setIsSent] = useState(false);

  if (!isOpen) return null;

  const handleSendSimulated = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSending(true);

    setTimeout(() => {
      setIsSending(false);
      setIsSent(true);
      setTimeout(() => {
        setIsSent(false);
        onClose();
      }, 2500);
    }, 1200);
  };

  const handleMailto = () => {
    const encodedSubject = encodeURIComponent(subject);
    const encodedBody = encodeURIComponent(personalMessage);
    window.location.href = `mailto:${recipientEmail}?subject=${encodedSubject}&body=${encodedBody}`;
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full p-6 space-y-5">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
              <Mail size={20} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Enviar Informe Clínico por Correo
              </h3>
              <p className="text-[11px] text-slate-500">
                Entrega digital del resumen kinésico al paciente
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
          >
            ✕
          </button>
        </div>

        {isSent ? (
          <div className="py-8 text-center space-y-3">
            <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto">
              <CheckCircle2 size={32} />
            </div>
            <h4 className="text-base font-bold text-slate-900">
              ¡Informe enviado con éxito!
            </h4>
            <p className="text-xs text-slate-500 max-w-xs mx-auto">
              Se ha despachado el resumen clínico y el plan de ejercicios a{' '}
              <strong className="text-slate-700">{recipientEmail}</strong>.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSendSimulated} className="space-y-4 text-xs">
            {/* Destinatario */}
            <div>
              <label className="font-bold text-slate-700 block mb-1">
                Correo Electrónico del Paciente
              </label>
              <div className="relative">
                <input
                  type="email"
                  required
                  value={recipientEmail}
                  onChange={(e) => setRecipientEmail(e.target.value)}
                  className="w-full px-3 py-2 pl-9 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                />
                <User size={15} className="absolute left-3 top-2.5 text-slate-400" />
              </div>
            </div>

            {/* Asunto */}
            <div>
              <label className="font-bold text-slate-700 block mb-1">
                Asunto del Correo
              </label>
              <input
                type="text"
                required
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
              />
            </div>

            {/* Mensaje */}
            <div>
              <label className="font-bold text-slate-700 block mb-1">
                Cuerpo del Mensaje Personalizado
              </label>
              <textarea
                rows={5}
                required
                value={personalMessage}
                onChange={(e) => setPersonalMessage(e.target.value)}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white leading-relaxed"
              />
            </div>

            {/* Archivos Adjuntos Automáticos */}
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1.5">
              <span className="font-bold text-slate-700 text-[11px] block flex items-center gap-1.5">
                <Paperclip size={13} className="text-slate-400" />
                Archivos Clínicos Adjuntados al Despacho:
              </span>
              <div className="flex flex-wrap gap-2 text-[10px]">
                <span className="px-2 py-1 bg-white border border-slate-200 rounded-lg text-slate-700 font-semibold flex items-center gap-1">
                  <FileText size={11} className="text-blue-600" />
                  Informe_Valoracion_{patient.documentId.replace(/\D/g, '')}.pdf
                </span>
                <span className="px-2 py-1 bg-white border border-slate-200 rounded-lg text-slate-700 font-semibold flex items-center gap-1">
                  <FileText size={11} className="text-rose-600" />
                  Mapa_del_Dolor_EVA.pdf
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-100 gap-3">
              <button
                type="button"
                onClick={handleMailto}
                className="text-slate-600 hover:text-blue-700 font-semibold text-[11px] flex items-center gap-1 transition-colors"
                title="Abrir en el cliente de correo predeterminado del sistema"
              >
                <ExternalLink size={13} />
                <span>Abrir en Gmail / Mail</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-3.5 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-semibold transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSending}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold rounded-xl shadow-xs flex items-center gap-1.5 transition-colors"
                >
                  {isSending ? (
                    <span>Enviando...</span>
                  ) : (
                    <>
                      <Send size={14} />
                      <span>Enviar al Paciente</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
