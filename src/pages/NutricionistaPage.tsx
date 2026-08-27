import React from 'react';
import { NutritionistDashboard } from './NutritionistDashboard';
import {
  generateAnthropometryPdf,
  downloadAnthropometryPdf,
  getAnthropometryPdfBlob,
  getAnthropometryPdfDataUrl,
  GenerateAnthropometryPdfOptions,
} from '../utils/anthropometryPdfExport';
import { PacienteClinico, EvaluacionAntropometrica } from '../types';

export interface ExportAnthropometryPdfParams {
  patient: PacienteClinico;
  evaluation: Partial<EvaluacionAntropometrica>;
  historyEvaluations?: EvaluacionAntropometrica[];
  nutritionistName?: string;
  clinicName?: string;
  clinicAddress?: string;
  clinicPhone?: string;
  clinicLogoBase64?: string;
  includeHistory?: boolean;
}

/**
 * Función de exportación a PDF para el módulo de Evaluación Antropométrica en NutricionistaPage.
 * Captura el contenido de la evaluación antropométrica y genera un reporte profesional usando jsPDF,
 * incluyendo el logotipo de la clínica, la estrategia metabólica y el histórico de progreso longitudinal del paciente.
 */
export function exportAnthropometryPdf(params: ExportAnthropometryPdfParams): void {
  downloadAnthropometryPdf({
    patient: params.patient,
    evaluation: params.evaluation,
    historyEvaluations: params.historyEvaluations || [],
    nutritionistName: params.nutritionistName || 'Lic. Nutrición Clínica',
    clinicName: params.clinicName || 'KineSys Salud - Centro Clínico & Nutricional',
    clinicAddress: params.clinicAddress || 'Av. Medicina Integral 1050, Piso 4',
    clinicPhone: params.clinicPhone || '+56 9 8765 4321',
    clinicLogoBase64: params.clinicLogoBase64,
    includeHistory: params.includeHistory ?? true,
  });
}

/**
 * Genera el documento jsPDF para previsualizaciones directas o integración clínica.
 */
export function generateAnthropometryPdfDoc(params: ExportAnthropometryPdfParams) {
  return generateAnthropometryPdf({
    patient: params.patient,
    evaluation: params.evaluation,
    historyEvaluations: params.historyEvaluations || [],
    nutritionistName: params.nutritionistName,
    clinicName: params.clinicName,
    clinicAddress: params.clinicAddress,
    clinicPhone: params.clinicPhone,
    clinicLogoBase64: params.clinicLogoBase64,
    includeHistory: params.includeHistory ?? true,
  });
}

/**
 * Obtiene el Blob binario del PDF para visores interactivos (PdfViewer).
 */
export function getAnthropometryPdfBlobPreview(params: ExportAnthropometryPdfParams): Blob {
  return getAnthropometryPdfBlob({
    patient: params.patient,
    evaluation: params.evaluation,
    historyEvaluations: params.historyEvaluations || [],
    nutritionistName: params.nutritionistName,
    clinicName: params.clinicName,
    clinicAddress: params.clinicAddress,
    clinicPhone: params.clinicPhone,
    clinicLogoBase64: params.clinicLogoBase64,
    includeHistory: params.includeHistory ?? true,
  });
}

/**
 * Obtiene el Data URL del PDF generado para ser consumido en visores modales o iframes.
 */
export function getAnthropometryPdfDataUrlPreview(params: ExportAnthropometryPdfParams): string {
  return getAnthropometryPdfDataUrl({
    patient: params.patient,
    evaluation: params.evaluation,
    historyEvaluations: params.historyEvaluations || [],
    nutritionistName: params.nutritionistName,
    clinicName: params.clinicName,
    clinicAddress: params.clinicAddress,
    clinicPhone: params.clinicPhone,
    clinicLogoBase64: params.clinicLogoBase64,
    includeHistory: params.includeHistory ?? true,
  });
}

interface NutricionistaPageProps {
  onNavigate: (path: string) => void;
}

export const NutricionistaPage: React.FC<NutricionistaPageProps> = ({ onNavigate }) => {
  return <NutritionistDashboard onNavigate={onNavigate} />;
};

export default NutricionistaPage;
