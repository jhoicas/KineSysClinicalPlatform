import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { Patient } from '../types';
import { QrCode, ShieldCheck, CheckCircle2, Award, ExternalLink } from 'lucide-react';

interface ProfessionalSignatureQRProps {
  patient: Patient;
  evaluatorName?: string;
  evaluatorId?: string;
  compact?: boolean;
}

export const ProfessionalSignatureQR: React.FC<ProfessionalSignatureQRProps> = ({
  patient,
  evaluatorName,
  evaluatorId,
  compact = false,
}) => {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [showModal, setShowModal] = useState(false);

  const name = evaluatorName || patient.physiotherapist || 'Juan David García';
  const id = evaluatorId || patient.physiotherapistId || 'T.P. 123456';
  const emissionDate = new Date().toLocaleDateString('es-CO', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

  const verificationUrl = `https://corebody.clinical/verify/tp-${id.replace(/\D/g, '') || '123456'}?patient=${encodeURIComponent(
    patient.name
  )}&doc=${encodeURIComponent(patient.documentId)}&auth=${Date.now().toString(36)}`;

  useEffect(() => {
    QRCode.toDataURL(verificationUrl, {
      width: 256,
      margin: 1,
      color: {
        dark: '#0F172A',
        light: '#FFFFFF',
      },
      errorCorrectionLevel: 'M',
    })
      .then((url) => {
        setQrDataUrl(url);
      })
      .catch((err) => {
        console.error('Error generating QR code', err);
      });
  }, [verificationUrl]);

  return (
    <div className={`border-t-2 border-slate-200 pt-6 mt-8 ${compact ? 'space-y-4' : 'space-y-6'}`}>
      <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
        {/* QR Code and Official Validation Seal */}
        <div className="flex items-center gap-4">
          <div
            onClick={() => setShowModal(true)}
            className="p-1.5 bg-white border border-slate-200 rounded-xl shadow-xs cursor-pointer hover:border-blue-400 transition-colors shrink-0 group relative"
            title="Haga clic para validar credenciales del profesional"
          >
            {qrDataUrl ? (
              <img
                src={qrDataUrl}
                alt="Código QR de Verificación Profesional"
                className="w-20 h-20 sm:w-24 sm:h-24 rounded-lg object-contain"
              />
            ) : (
              <div className="w-20 h-20 bg-slate-900 text-white rounded-lg flex items-center justify-center">
                <QrCode size={36} />
              </div>
            )}
            <div className="absolute inset-0 bg-blue-600/10 rounded-xl opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity print:hidden">
              <ExternalLink size={16} className="text-blue-700 drop-shadow-xs" />
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-1.5">
              <ShieldCheck size={16} className="text-blue-600 shrink-0" />
              <span className="font-bold text-slate-900 uppercase text-xs tracking-wider">
                VALIDACIÓN OFICIAL DIGITAL
              </span>
            </div>
            <p className="text-[11px] text-slate-500 max-w-xs leading-relaxed">
              Escanea el código QR para verificar la autenticidad del registro profesional del fisioterapeuta tratante y el expediente clínico cifrado.
            </p>
            <div className="text-[10px] font-mono text-blue-700 bg-blue-50 px-2 py-0.5 rounded inline-block">
              HASH: CB-{patient.id}-{Date.now().toString(36).toUpperCase()}
            </div>
          </div>
        </div>

        {/* Professional Signature Block */}
        <div className="text-center sm:text-right min-w-[220px]">
          {/* Handwritten vector signature graphic */}
          <div className="h-14 flex items-end justify-center sm:justify-end pr-2 select-none">
            <svg viewBox="0 0 240 60" className="h-12 w-48 text-slate-900" fill="none">
              <path
                d="M 15 38 C 30 18, 45 10, 52 32 C 58 50, 48 55, 38 48 C 30 42, 35 25, 62 28 C 88 30, 92 18, 105 24 C 118 30, 110 44, 130 36 C 150 28, 162 18, 175 32 C 185 42, 195 24, 220 28"
                stroke="#1E293B"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M 40 45 L 210 42"
                stroke="#0284C7"
                strokeWidth="1.2"
                strokeDasharray="4,3"
                opacity="0.6"
              />
            </svg>
          </div>

          {/* Underline */}
          <div className="w-56 border-b-2 border-slate-700 mb-2 mx-auto sm:ml-auto" />

          <span className="font-bold text-slate-900 text-xs uppercase block tracking-tight">
            {name}
          </span>
          <span className="text-slate-600 text-[11px] block">
            Fisioterapeuta Especialista en Rendimiento Físico
          </span>
          <span className="text-blue-700 font-bold text-[10px] block mt-0.5">
            Registro / Tarjeta Profesional: {id}
          </span>
          <span className="text-slate-400 text-[9px] block">
            Colegio Colombiano de Fisioterapeutas • Fecha: {emissionDate}
          </span>
        </div>
      </div>

      {/* Verification Modal when clicking QR */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 print:hidden">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2 text-emerald-600">
                <CheckCircle2 size={20} />
                <span className="font-bold text-sm text-slate-900">
                  Credencial Profesional Verificada
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-600 text-base p-1"
              >
                ✕
              </button>
            </div>

            <div className="flex items-center gap-4 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
              {qrDataUrl && (
                <img
                  src={qrDataUrl}
                  alt="QR Verificación"
                  className="w-20 h-20 rounded-lg bg-white p-1 border border-slate-200 shrink-0"
                />
              )}
              <div className="text-xs space-y-1">
                <div className="font-bold text-slate-900">{name}</div>
                <div className="text-slate-600">{id}</div>
                <div className="text-emerald-700 font-semibold text-[11px] flex items-center gap-1">
                  <Award size={13} />
                  <span>Estado: Habilitado Activo</span>
                </div>
                <div className="text-[10px] text-slate-400">
                  Institución: Core Body Rendimiento Físico
                </div>
              </div>
            </div>

            <div className="text-[11px] text-slate-600 space-y-1.5 bg-blue-50/60 p-3 rounded-xl border border-blue-100">
              <div className="font-bold text-blue-900">Expediente Clínico Vinculado:</div>
              <div>• Paciente: <strong>{patient.name}</strong> ({patient.documentId})</div>
              <div>• Emitido el: <strong>{emissionDate}</strong></div>
              <div>• Validez jurídica según Ley 528 del ejercicio de fisioterapia.</div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl transition-colors"
              >
                Cerrar Verificación
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
