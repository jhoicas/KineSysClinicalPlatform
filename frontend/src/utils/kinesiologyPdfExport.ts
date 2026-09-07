import jsPDF from 'jspdf';
import type {
  HistoriaClinica,
  KinesiologyEvaluation,
  MovementGesture,
  PacienteClinico,
  PainObservation,
  PostureAssessment,
  StrengthAssessment,
  TreatmentPlan,
} from '../types';
import { normalizeTreatmentPlan } from '../data/kinesiologyCatalog';
import { captureElementToPngBase64 } from './painMapCapture';

export interface GenerateKinesiologyPdfOptions {
  patient: PacienteClinico;
  historia?: HistoriaClinica | null;
  evaluation: Partial<KinesiologyEvaluation> | null;
  painObservations?: PainObservation[];
  /** PNG Base64 (sin prefijo data:) del mapa capturado con html2canvas */
  painMapImageBase64?: string | null;
  physiotherapistName?: string;
  clinicName?: string;
  clinicAddress?: string;
  clinicPhone?: string;
  clinicEmail?: string;
  primaryColorHex?: string;
  evaluationDate?: string;
}

function hexToRgb(hex?: string): [number, number, number] {
  if (!hex) return [0, 72, 112];
  const cleaned = hex.replace('#', '');
  if (cleaned.length !== 6) return [0, 72, 112];
  return [
    parseInt(cleaned.slice(0, 2), 16),
    parseInt(cleaned.slice(2, 4), 16),
    parseInt(cleaned.slice(4, 6), 16),
  ];
}

function calcAge(birthDate?: string): string {
  if (!birthDate) return '—';
  const d = new Date(birthDate);
  if (Number.isNaN(d.getTime())) return '—';
  const today = new Date();
  let age = today.getFullYear() - d.getFullYear();
  const m = today.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < d.getDate())) age -= 1;
  return age >= 0 ? String(age) : '—';
}

function genderLabel(gender?: string): string {
  if (gender === 'female') return 'Femenino';
  if (gender === 'male') return 'Masculino';
  if (gender === 'other') return 'Otro';
  return gender || '—';
}

function severityLabel(s?: string): string {
  if (!s) return '—';
  const map: Record<string, string> = {
    normal: 'Normal',
    leve: 'Leve',
    moderada: 'Moderada',
    marcada: 'Marcada',
  };
  return map[s] || s;
}

function wrapText(doc: jsPDF, text: string, maxWidth: number): string[] {
  return doc.splitTextToSize(text || '—', maxWidth) as string[];
}

/**
 * Captura el nodo del mapa de dolor (p. ej. `#kinesys-pain-map-capture`) a Base64 PNG.
 */
export async function capturePainMapForPdf(element: HTMLElement): Promise<string> {
  return captureElementToPngBase64(element, { scale: 2, backgroundColor: '#ffffff' });
}

export function generateKinesiologyPdf(options: GenerateKinesiologyPdfOptions): jsPDF {
  const {
    patient,
    historia,
    evaluation,
    painObservations = [],
    painMapImageBase64,
    physiotherapistName = 'Fisioterapeuta KineSys',
    clinicName = 'KineSys Clinical Platform',
    clinicAddress = 'Centro Clínico',
    clinicPhone = '',
    clinicEmail = '',
    primaryColorHex = '#004870',
    evaluationDate,
  } = options;

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 14;
  const contentWidth = pageWidth - margin * 2;
  const primary = hexToRgb(primaryColorHex);
  const slate = [30, 41, 59] as [number, number, number];
  const muted = [100, 116, 139] as [number, number, number];
  const surface = [248, 250, 252] as [number, number, number];
  const border = [226, 232, 240] as [number, number, number];

  let y = 12;
  let pageNum = 1;

  const dateStr =
    evaluationDate ||
    evaluation?.created_at?.slice(0, 10) ||
    new Date().toISOString().slice(0, 10);

  const footer = () => {
    doc.setFontSize(8);
    doc.setTextColor(...muted);
    doc.text(
      `${clinicName} · Informe de Evaluación Kinésica · Pág. ${pageNum}`,
      pageWidth / 2,
      pageHeight - 8,
      { align: 'center' },
    );
  };

  const newPage = () => {
    footer();
    doc.addPage();
    pageNum += 1;
    y = 16;
  };

  const ensureSpace = (needed: number) => {
    if (y + needed > pageHeight - 18) newPage();
  };

  const sectionTitle = (title: string) => {
    ensureSpace(14);
    doc.setFillColor(...primary);
    doc.roundedRect(margin, y, contentWidth, 8, 1.5, 1.5, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(255, 255, 255);
    doc.text(title, margin + 3, y + 5.5);
    y += 12;
  };

  const labelValue = (label: string, value: string, x: number, width: number) => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(...muted);
    doc.text(label.toUpperCase(), x, y);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...slate);
    const lines = wrapText(doc, value || '—', width);
    doc.text(lines, x, y + 4);
    return 4 + lines.length * 4;
  };

  const paragraph = (text: string) => {
    const lines = wrapText(doc, text || 'Sin registro.', contentWidth - 4);
    ensureSpace(lines.length * 4.2 + 4);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...slate);
    doc.text(lines, margin + 2, y);
    y += lines.length * 4.2 + 3;
  };

  // ── Header ──
  doc.setFillColor(...primary);
  doc.roundedRect(margin, y, contentWidth, 28, 3, 3, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text(clinicName, margin + 5, y + 10);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('Informe de Evaluación Kinésica Integral / Fisioterapia', margin + 5, y + 17);
  doc.setFontSize(8);
  doc.text(`${clinicAddress}${clinicPhone ? ` · ${clinicPhone}` : ''}${clinicEmail ? ` · ${clinicEmail}` : ''}`, margin + 5, y + 23);
  y += 34;

  // ── 1. Paciente + Historia ──
  sectionTitle('1. Datos del paciente e historia clínica');

  doc.setFillColor(...surface);
  doc.roundedRect(margin, y, contentWidth, 28, 2, 2, 'F');
  doc.setDrawColor(...border);
  doc.roundedRect(margin, y, contentWidth, 28, 2, 2, 'S');

  const colW = contentWidth / 3 - 2;
  const row1Y = y + 5;
  y = row1Y;
  const h1 = labelValue('Paciente', `${patient.first_name} ${patient.last_name}`.trim(), margin + 3, colW);
  y = row1Y;
  const h2 = labelValue(
    'Identificación',
    `${patient.identifier_type || 'ID'}: ${patient.identifier_number || '—'}`,
    margin + 3 + colW + 2,
    colW,
  );
  y = row1Y;
  const h3 = labelValue('Edad / Sexo', `${calcAge(patient.birth_date)} años · ${genderLabel(patient.gender)}`, margin + 3 + (colW + 2) * 2, colW);
  y = row1Y + Math.max(h1, h2, h3) + 2;

  const row2Y = y;
  y = row2Y;
  const h4 = labelValue('Fecha evaluación', dateStr, margin + 3, colW);
  y = row2Y;
  const h5 = labelValue('Fisioterapeuta', physiotherapistName, margin + 3 + colW + 2, colW * 2);
  y = row2Y + Math.max(h4, h5) + 6;

  if (historia) {
    ensureSpace(40);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...primary);
    doc.text('Antecedentes y motivo de consulta', margin, y);
    y += 5;
    paragraph(`Ocupación: ${historia.ocupacion || '—'}`);
    paragraph(`Motivo de consulta: ${historia.motivo_consulta || '—'}`);
    paragraph(
      `Deporte: ${historia.deporte_practica || '—'} · Nivel: ${historia.nivel_deporte || '—'} · Frecuencia: ${historia.frecuencia_semanal || '—'}`,
    );
    paragraph(`Lesiones anteriores: ${historia.lesiones_anteriores || '—'}`);
    paragraph(`Hábitos / estilo de vida: ${historia.habitos_estilo_vida || '—'}`);
  } else {
    paragraph('No hay historia clínica asociada al paciente en el expediente.');
  }

  // ── 2. Mapa de dolor ──
  sectionTitle('2. Mapa de dolor');

  if (painMapImageBase64) {
    const imgW = contentWidth;
    const imgH = 72;
    ensureSpace(imgH + 8);
    try {
      doc.addImage(painMapImageBase64, 'PNG', margin, y, imgW, imgH);
      y += imgH + 6;
    } catch {
      paragraph('No se pudo incrustar la imagen del mapa de dolor.');
    }
  } else if (painObservations.length === 0) {
    paragraph('Sin observaciones de dolor registradas en el mapa corporal.');
  }

  if (painObservations.length > 0) {
    ensureSpace(16);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(...muted);
    doc.text('Hallazgos por región (intensidad EVA)', margin, y);
    y += 5;

    // Mini gráfica de barras EVA
    const barMaxW = contentWidth - 55;
    for (const obs of painObservations.slice(0, 12)) {
      ensureSpace(9);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(...slate);
      const label = `${obs.body_region} (${obs.body_side === 'front' ? 'ant.' : 'post.'})`;
      doc.text(label.slice(0, 36), margin, y + 3);
      const barW = Math.max(2, (Math.min(10, obs.pain_level) / 10) * barMaxW);
      const r = obs.pain_level <= 3 ? [34, 197, 94] : obs.pain_level <= 6 ? [245, 158, 11] : [239, 68, 68];
      doc.setFillColor(r[0], r[1], r[2]);
      doc.roundedRect(margin + 52, y, barW, 4.5, 1, 1, 'F');
      doc.setFont('helvetica', 'bold');
      doc.text(`${obs.pain_level}/10`, margin + 52 + barW + 2, y + 3.5);
      y += 7;
    }

    const notes = painObservations
      .filter((o) => o.clinical_notes?.trim())
      .slice(0, 6);
    if (notes.length) {
      ensureSpace(12);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(...primary);
      doc.text('Notas clínicas del mapa de dolor', margin, y);
      y += 4;
      for (const n of notes) {
        paragraph(`• ${n.body_region}: ${n.clinical_notes}`);
      }
    }
  }

  // ── 3. Evaluación kinésica ──
  sectionTitle('3. Evaluación kinésica integral');

  const postura = evaluation?.postura as PostureAssessment | undefined;
  if (postura) {
    ensureSpace(20);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...primary);
    doc.text('3.1 Postura — alineación y desviaciones', margin, y);
    y += 5;

    const renderView = (title: string, view?: PostureAssessment['anterior']) => {
      if (!view?.landmarks?.length) return;
      ensureSpace(10 + view.landmarks.length * 4);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(...slate);
      doc.text(title, margin + 2, y);
      y += 4;
      for (const lm of view.landmarks) {
        if (!lm.severity && !lm.finding) continue;
        ensureSpace(5);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(...slate);
        doc.text(
          `· ${lm.landmark}: ${severityLabel(String(lm.severity || ''))}${lm.finding ? ` — ${lm.finding}` : ''}`,
          margin + 4,
          y,
        );
        y += 4;
      }
    };

    renderView('Vista anterior', postura.anterior);
    renderView('Vista lateral', postura.lateral);
    renderView('Vista posterior', postura.posterior);
    if (postura.concepto) {
      paragraph(`Concepto postural: ${postura.concepto}`);
    }
  }

  const movilidad = evaluation?.movilidad || [];
  if (movilidad.length) {
    ensureSpace(18);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...primary);
    doc.text('3.2 Movilidad — rangos y limitaciones (ROM)', margin, y);
    y += 5;

    // Table header
    ensureSpace(8);
    doc.setFillColor(...surface);
    doc.rect(margin, y - 3, contentWidth, 7, 'F');
    doc.setFontSize(7);
    doc.setTextColor(...muted);
    doc.setFont('helvetica', 'bold');
    doc.text('Segmento', margin + 2, y);
    doc.text('Limitación izq.', margin + 70, y);
    doc.text('Limitación der.', margin + 130, y);
    y += 5;

    for (const row of movilidad) {
      if (!row.limitacion_izq && !row.limitacion_der) continue;
      ensureSpace(6);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(...slate);
      doc.text(String(row.estructura || '').slice(0, 32), margin + 2, y);
      doc.text(String(row.limitacion_izq || '—').slice(0, 28), margin + 70, y);
      doc.text(String(row.limitacion_der || '—').slice(0, 28), margin + 130, y);
      y += 5;
    }
  }

  const fuerza = (evaluation?.fuerza || []) as StrengthAssessment[];
  if (fuerza.length) {
    ensureSpace(18);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...primary);
    doc.text('3.3 Fuerza — evaluación muscular / funcional', margin, y);
    y += 5;

    ensureSpace(8);
    doc.setFillColor(...surface);
    doc.rect(margin, y - 3, contentWidth, 7, 'F');
    doc.setFontSize(7);
    doc.setTextColor(...muted);
    doc.setFont('helvetica', 'bold');
    doc.text('Grupo', margin + 2, y);
    doc.text('Izq.', margin + 80, y);
    doc.text('Der.', margin + 110, y);
    doc.text('Asimetría %', margin + 140, y);
    y += 5;

    for (const row of fuerza) {
      if (row.fuerza_izq_kg == null && row.fuerza_der_kg == null) continue;
      ensureSpace(6);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(...slate);
      doc.text(String(row.estructura || '').slice(0, 34), margin + 2, y);
      doc.text(row.fuerza_izq_kg != null ? String(row.fuerza_izq_kg) : '—', margin + 80, y);
      doc.text(row.fuerza_der_kg != null ? String(row.fuerza_der_kg) : '—', margin + 110, y);
      doc.text(
        row.asimetria_porcentaje != null ? `${row.asimetria_porcentaje}%` : '—',
        margin + 140,
        y,
      );
      y += 5;
    }
  }

  const gestos = (evaluation?.gestos_movimiento || []) as MovementGesture[];
  if (gestos.length) {
    ensureSpace(16);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...primary);
    doc.text('3.4 Control de movimiento — patrones e inestabilidades', margin, y);
    y += 5;
    for (const g of gestos) {
      const alts = (g.alteraciones || []).filter(Boolean).join(', ') || 'Sin alteraciones registradas';
      paragraph(`• ${g.gesto}: ${alts}${g.comentarios ? ` — ${g.comentarios}` : ''}`);
    }
  }

  // Diagnóstico / plan
  ensureSpace(20);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...primary);
  doc.text('3.5 Diagnóstico kinésico, objetivos y plan', margin, y);
  y += 5;
  paragraph(`Diagnóstico: ${evaluation?.diagnostico_kinesico || '—'}`);
  paragraph(`Observaciones generales: ${evaluation?.observaciones_generales || '—'}`);

  const plan = normalizeTreatmentPlan(
    evaluation?.plan_tratamiento,
    patient.id,
  ) as TreatmentPlan;
  if (plan) {
    paragraph(
      `Plan: ${plan.objective || '—'} · Fase: ${plan.currentPhase || '—'} · Sesiones: ${plan.sessionsCompleted ?? 0}/${plan.totalSessionsPlanned ?? 0}`,
    );
    if (plan.clinicalNotes) paragraph(`Notas del plan: ${plan.clinicalNotes}`);
    const exercises = plan.exercises || [];
    if (exercises.length) {
      ensureSpace(10);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(...muted);
      doc.text('Ejercicios prescritos', margin + 2, y);
      y += 4;
      for (const ex of exercises.slice(0, 15)) {
        paragraph(
          `· ${ex.name} (${ex.category}) — ${ex.sets}×${ex.repsOrDuration}, descanso ${ex.restSeconds}s, ${ex.frequencyDaysPerWeek}×/sem`,
        );
      }
    }
  }

  footer();
  return doc;
}

export function downloadKinesiologyPdf(options: GenerateKinesiologyPdfOptions): void {
  const doc = generateKinesiologyPdf(options);
  const last = options.patient.last_name?.replace(/\s+/g, '_') || 'Paciente';
  const date = new Date().toISOString().slice(0, 10);
  doc.save(`Evaluacion_Kinesica_${last}_${date}.pdf`);
}

export function getKinesiologyPdfBlob(options: GenerateKinesiologyPdfOptions): Blob {
  return generateKinesiologyPdf(options).output('blob');
}

export function getKinesiologyPdfDataUrl(options: GenerateKinesiologyPdfOptions): string {
  return generateKinesiologyPdf(options).output('datauristring');
}

export function getKinesiologyPdfBase64(options: GenerateKinesiologyPdfOptions): string {
  const output = generateKinesiologyPdf(options).output('datauristring');
  const parts = output.split(',');
  return parts.length > 1 ? parts[1] : output;
}
