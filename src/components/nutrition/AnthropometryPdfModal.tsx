import React, { useState, useMemo } from 'react';
import { PacienteClinico, EvaluacionAntropometrica } from '../../types';
import { downloadAnthropometryPdf, getAnthropometryPdfBlob } from '../../utils/anthropometryPdfExport';
import { EcoExportActions } from '../common/EcoExportActions';
import { PdfViewer } from '../common/PdfViewer';

interface AnthropometryPdfModalProps {
  isOpen: boolean;
  onClose: () => void;
  patient: PacienteClinico;
  evaluation: Partial<EvaluacionAntropometrica>;
  historyEvaluations?: EvaluacionAntropometrica[];
  nutritionistName?: string;
  clinicName?: string;
  clinicAddress?: string;
  clinicPhone?: string;
}

export const AnthropometryPdfModal: React.FC<AnthropometryPdfModalProps> = ({
  isOpen,
  onClose,
  patient,
  evaluation,
  historyEvaluations = [],
  nutritionistName = 'Lic. Nutrición Clínica',
  clinicName = 'KineSys Salud - Centro Clínico & Nutricional',
  clinicAddress = 'Av. Medicina Integral 1050, Piso 4',
  clinicPhone = '+56 9 8765 4321',
}) => {
  const [customNutritionist, setCustomNutritionist] = useState(nutritionistName);
  const [customClinic, setCustomClinic] = useState(clinicName);
  const [includeHistory, setIncludeHistory] = useState(historyEvaluations.length > 0);
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  const [previewMode, setPreviewMode] = useState<'visual' | 'raw_pdf'>('visual');

  const pdfOptions = useMemo(() => ({
    patient,
    evaluation,
    historyEvaluations,
    includeHistory,
    nutritionistName: customNutritionist,
    clinicName: customClinic,
    clinicAddress,
    clinicPhone,
  }), [patient, evaluation, historyEvaluations, includeHistory, customNutritionist, customClinic, clinicAddress, clinicPhone]);

  if (!isOpen) return null;

  const handleDownload = () => {
    downloadAnthropometryPdf(pdfOptions);
    setDownloadSuccess(true);
    setTimeout(() => setDownloadSuccess(false), 3000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-surface-container-lowest w-full max-w-4xl rounded-3xl border border-outline-variant/40 shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        {/* Modal Header */}
        <div className="p-5 border-b border-outline-variant/30 flex items-center justify-between bg-surface-container-low">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-primary-fixed text-primary flex items-center justify-center border border-primary-fixed-dim">
              <span className="material-symbols-outlined text-xl">picture_as_pdf</span>
            </div>
            <div>
              <h3 className="text-sm font-black text-on-surface">
                Exportar Informe Antropométrico & Historial Clínico (PDF)
              </h3>
              <p className="text-xs text-on-surface-variant">
                Paciente: <strong>{patient.first_name} {patient.last_name}</strong> • Documento PDF con Logo y Progreso Longitudinal
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="p-1.5 rounded-full hover:bg-surface-container-high text-on-surface-variant cursor-pointer transition-colors"
            >
              <span className="material-symbols-outlined text-xl">close</span>
            </button>
          </div>
        </div>

        {/* Modal Body: Controls & Visual Preview */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Customization Bar */}
          <div className="p-4 bg-surface-container-low rounded-2xl border border-outline-variant/30 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div>
              <label className="block font-bold text-on-surface-variant mb-1">Nombre del Nutricionista / Profesional</label>
              <input
                type="text"
                value={customNutritionist}
                onChange={(e) => setCustomNutritionist(e.target.value)}
                className="w-full bg-surface-container-lowest border border-outline-variant/50 rounded-xl px-3 py-1.5 font-bold text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
            </div>
            <div>
              <label className="block font-bold text-on-surface-variant mb-1">Centro de Salud / Clínica</label>
              <input
                type="text"
                value={customClinic}
                onChange={(e) => setCustomClinic(e.target.value)}
                className="w-full bg-surface-container-lowest border border-outline-variant/50 rounded-xl px-3 py-1.5 font-bold text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
            </div>
          </div>

          {/* Toggle Features Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 font-bold text-on-surface cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={includeHistory}
                  onChange={(e) => setIncludeHistory(e.target.checked)}
                  className="rounded text-primary focus:ring-primary h-4 w-4"
                />
                <span>Incluir Histórico de Progreso ({historyEvaluations.length} controles registrados)</span>
              </label>
            </div>

            <div className="flex bg-surface-container-low p-1 rounded-xl border border-outline-variant/30">
              <button
                onClick={() => setPreviewMode('visual')}
                className={`px-3 py-1 rounded-lg font-bold text-xs cursor-pointer transition-all ${
                  previewMode === 'visual'
                    ? 'bg-primary text-white shadow-2xs'
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                Resumen Ficha
              </button>
              <button
                onClick={() => setPreviewMode('raw_pdf')}
                className={`px-3 py-1 rounded-lg font-bold text-xs cursor-pointer transition-all ${
                  previewMode === 'raw_pdf'
                    ? 'bg-primary text-white shadow-2xs'
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                Visor PDF Interactivo
              </button>
            </div>
          </div>

          {/* Preview Container */}
          {previewMode === 'visual' ? (
            <div className="bg-surface-container-lowest p-6 rounded-3xl border border-outline-variant/40 space-y-6 shadow-sm font-sans text-xs">
              {/* Document Header Representation with Clinic Logo Badge */}
              <div className="p-4 bg-primary rounded-2xl text-white flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-primary font-black shadow-xs">
                    <span className="material-symbols-outlined text-2xl text-secondary">health_metrics</span>
                  </div>
                  <div>
                    <h4 className="font-black text-sm uppercase tracking-wider">{customClinic}</h4>
                    <p className="text-[11px] text-primary-fixed-dim mt-0.5">
                      Servicio de Nutrición Clínica, Cineantropometría & Metabolismo
                    </p>
                  </div>
                </div>
                <div className="bg-secondary px-3 py-1.5 rounded-xl text-center">
                  <span className="block text-[9px] font-black uppercase tracking-widest text-secondary-fixed">INFORME CLÍNICO</span>
                  <span className="text-[10px] font-mono font-bold text-white">
                    {evaluation.evaluation_date || new Date().toISOString().split('T')[0]}
                  </span>
                </div>
              </div>

              {/* Patient info recap */}
              <div className="p-3 bg-surface-container-low rounded-2xl border border-outline-variant/30 grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                <div>
                  <span className="text-on-surface-variant block font-bold">Paciente:</span>
                  <strong className="text-on-surface">{patient.first_name} {patient.last_name}</strong>
                </div>
                <div>
                  <span className="text-on-surface-variant block font-bold">Identificación:</span>
                  <span className="text-on-surface font-mono">{patient.identifier_type}: {patient.identifier_number}</span>
                </div>
                <div>
                  <span className="text-on-surface-variant block font-bold">Género / Edad:</span>
                  <span className="text-on-surface">{evaluation.gender === 'female' ? 'Femenino' : 'Masculino'} • {evaluation.age || 30} años</span>
                </div>
                <div>
                  <span className="text-on-surface-variant block font-bold">Nutricionista:</span>
                  <span className="text-primary font-bold">{customNutritionist}</span>
                </div>
              </div>

              {/* Metric Highlights */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3.5 bg-surface-container-low rounded-2xl border border-outline-variant/30">
                  <span className="text-[10px] font-bold text-on-surface-variant block">Peso & Talla</span>
                  <div className="flex items-baseline gap-1 mt-0.5">
                    <span className="text-base font-black text-on-surface">{evaluation.weight_kg} kg</span>
                  </div>
                  <span className="text-[10px] text-on-surface-variant block font-mono">Talla: {evaluation.height_cm} cm (IMC: {evaluation.bmi})</span>
                </div>

                <div className="p-3.5 bg-surface-container-low rounded-2xl border border-outline-variant/30">
                  <span className="text-[10px] font-bold text-on-surface-variant block">Tasa Basal (BMR)</span>
                  <div className="flex items-baseline gap-1 mt-0.5">
                    <span className="text-base font-black text-primary">{evaluation.bmr_kcal}</span>
                    <span className="text-[10px] text-primary font-bold">kcal/día</span>
                  </div>
                  <span className="text-[10px] text-on-surface-variant block font-mono">Mifflin-St Jeor</span>
                </div>

                <div className="p-3.5 bg-secondary-fixed/30 rounded-2xl border border-secondary-fixed-dim">
                  <span className="text-[10px] font-bold text-on-secondary-fixed block">Gasto Total (TDEE)</span>
                  <div className="flex items-baseline gap-1 mt-0.5">
                    <span className="text-base font-black text-on-secondary-fixed">{evaluation.tdee_kcal}</span>
                    <span className="text-[10px] text-on-secondary-fixed font-bold">kcal/día</span>
                  </div>
                  <span className="text-[10px] text-on-secondary-fixed-variant block font-mono">Factor PAL: x{evaluation.activity_factor}</span>
                </div>

                <div className="p-3.5 bg-tertiary-fixed/30 rounded-2xl border border-tertiary-fixed-dim">
                  <span className="text-[10px] font-bold text-tertiary block">% Grasa Corporal</span>
                  <div className="flex items-baseline gap-1 mt-0.5">
                    <span className="text-base font-black text-tertiary">{evaluation.body_fat_percentage}%</span>
                  </div>
                  <span className="text-[10px] text-tertiary-fixed-dim block font-mono">Masa Grasa: {evaluation.fat_mass_kg} kg</span>
                </div>
              </div>

              {/* Tables summary */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 bg-surface-container-low rounded-2xl border border-outline-variant/30 space-y-2">
                  <h5 className="font-black text-primary text-xs uppercase tracking-wider flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-sm">straighten</span>
                    <span>Pliegues Cutáneos (ISAK mm)</span>
                  </h5>
                  <div className="space-y-1 text-[11px] font-mono">
                    <div className="flex justify-between border-b border-outline-variant/20 pb-0.5">
                      <span className="text-on-surface-variant">Tríceps</span>
                      <strong className="text-on-surface">{evaluation.skinfold_triceps_mm} mm</strong>
                    </div>
                    <div className="flex justify-between border-b border-outline-variant/20 pb-0.5">
                      <span className="text-on-surface-variant">Subescapular</span>
                      <strong className="text-on-surface">{evaluation.skinfold_subscapular_mm} mm</strong>
                    </div>
                    <div className="flex justify-between border-b border-outline-variant/20 pb-0.5">
                      <span className="text-on-surface-variant">Suprailíaco</span>
                      <strong className="text-on-surface">{evaluation.skinfold_suprailiac_mm} mm</strong>
                    </div>
                    <div className="flex justify-between border-b border-outline-variant/20 pb-0.5">
                      <span className="text-on-surface-variant">Abdominal</span>
                      <strong className="text-on-surface">{evaluation.skinfold_abdominal_mm} mm</strong>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-surface-container-low rounded-2xl border border-outline-variant/30 space-y-2">
                  <h5 className="font-black text-secondary text-xs uppercase tracking-wider flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-sm">square_foot</span>
                    <span>Perímetros Corporales (cm)</span>
                  </h5>
                  <div className="space-y-1 text-[11px] font-mono">
                    <div className="flex justify-between border-b border-outline-variant/20 pb-0.5">
                      <span className="text-on-surface-variant">Cintura</span>
                      <strong className="text-on-surface">{evaluation.waist_cm} cm</strong>
                    </div>
                    <div className="flex justify-between border-b border-outline-variant/20 pb-0.5">
                      <span className="text-on-surface-variant">Cadera</span>
                      <strong className="text-on-surface">{evaluation.hip_cm} cm</strong>
                    </div>
                    <div className="flex justify-between border-b border-outline-variant/20 pb-0.5">
                      <span className="text-on-surface-variant">Índice Cintura/Cadera (ICC)</span>
                      <strong className="text-secondary">{evaluation.waist_hip_ratio}</strong>
                    </div>
                    <div className="flex justify-between border-b border-outline-variant/20 pb-0.5">
                      <span className="text-on-surface-variant">Riesgo Cardiovascular</span>
                      <strong className="uppercase text-on-surface">{evaluation.cardiovascular_risk_level}</strong>
                    </div>
                  </div>
                </div>
              </div>

              {/* History preview note */}
              {includeHistory && historyEvaluations.length > 0 && (
                <div className="p-3.5 bg-primary/5 rounded-2xl border border-primary/20 space-y-1">
                  <span className="text-[10px] font-bold text-primary uppercase tracking-wider block flex items-center gap-1">
                    <span className="material-symbols-outlined text-sm">auto_graph</span>
                    <span>Página 2 Adicional: Historial de Progreso & Comparativa Longitudinal</span>
                  </span>
                  <p className="text-[11px] text-on-surface-variant">
                    Se incluirá la matriz cronológica de los <strong>{historyEvaluations.length} controles</strong> del paciente con cálculo de deltas acumulados de masa grasa, masa magra y perímetros.
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="w-full h-full min-h-[550px] flex-1 flex flex-col">
              <PdfViewer
                generatePdf={() => getAnthropometryPdfBlob(pdfOptions)}
                title={`Informe Antropométrico Oficial - ${patient.first_name} ${patient.last_name}`}
                fileName={`Informe_Antropometria_${(patient.last_name || 'Paciente').replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`}
                height="h-full min-h-[550px] flex-1"
                showToolbar={true}
              />
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-5 border-t border-outline-variant/30 bg-surface-container-low flex flex-col sm:flex-row items-center justify-between gap-3">
          <EcoExportActions
            patient={patient}
            documentType="antropometria"
            evaluation={evaluation as any}
            historyEvaluations={includeHistory ? historyEvaluations : []}
            nutritionistName={customNutritionist}
            showPreviewOption={false}
            size="sm"
          />

          <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-surface-container-high hover:bg-surface-container-highest text-on-surface font-bold text-xs rounded-xl border border-outline-variant/40 cursor-pointer transition-colors"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
