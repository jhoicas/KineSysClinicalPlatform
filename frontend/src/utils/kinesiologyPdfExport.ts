import jsPDF from 'jspdf';
import type {
  HistoriaClinica,
  KinesiologyEvaluation,
  MovementGesture,
  PacienteClinico,
  PainObservation,
  PostureAssessment,
  PostureLandmark,
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
  /** PNG Base64 (sin prefijo) del mapa anatómico capturado con html2canvas */
  painMapImageBase64?: string | null;
  /** PNG Base64 del visualizador postural (3 vistas) */
  postureImageBase64?: string | null;
  physiotherapistName?: string;
  clinicName?: string;
  clinicAddress?: string;
  clinicPhone?: string;
  clinicEmail?: string;
  primaryColorHex?: string;
  evaluationDate?: string;
}

type RGB = [number, number, number];

function hexToRgb(hex?: string): RGB {
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
  if (!s || s === '') return 'Sin evaluar';
  const map: Record<string, string> = {
    normal: 'Normal',
    leve: 'Leve',
    moderada: 'Moderada',
    marcada: 'Marcada',
  };
  return map[s] || s;
}

function severityColor(s?: string): RGB {
  const key = (s || '').toLowerCase();
  if (!key || key === 'normal') return [34, 197, 94];
  if (key === 'leve') return [59, 130, 246];
  if (key === 'moderada') return [249, 115, 22];
  if (key === 'marcada') return [239, 68, 68];
  return [148, 163, 184];
}

/** Interpreta texto de limitación ROM → % estimado (0–100). */
function romPercentFromText(text?: string): number {
  const raw = (text || '').trim().toLowerCase();
  if (!raw || raw === '—' || raw === '-' || raw.includes('sin limit') || raw.includes('normal') || raw.includes('completa')) {
    return 100;
  }
  const degMatch = raw.match(/(\d{1,3})\s*°/);
  if (degMatch) {
    const deg = Math.min(180, Number(degMatch[1]));
    return Math.round((deg / 180) * 100);
  }
  const pctMatch = raw.match(/(\d{1,3})\s*%/);
  if (pctMatch) return Math.min(100, Number(pctMatch[1]));
  if (raw.includes('sever') || raw.includes('bloque') || raw.includes('ausente')) return 25;
  if (raw.includes('moder') || raw.includes('importante')) return 45;
  if (raw.includes('leve') || raw.includes('liger')) return 70;
  return 55;
}

function romBarColor(pct: number): RGB {
  if (pct >= 85) return [34, 197, 94];
  if (pct >= 60) return [234, 179, 8];
  return [239, 68, 68];
}

function controlStatus(g: MovementGesture): { label: string; color: RGB } {
  const alts = (g.alteraciones || []).filter(Boolean);
  if (alts.length === 0) return { label: 'Sin alteraciones', color: [34, 197, 94] };
  const joined = alts.join(' ').toLowerCase();
  if (joined.includes('inestab') || joined.includes('dolor') || joined.includes('fallo')) {
    return { label: 'Inestabilidad', color: [239, 68, 68] };
  }
  return { label: 'Compensación leve', color: [234, 179, 8] };
}

function wrapText(doc: jsPDF, text: string, maxWidth: number): string[] {
  return doc.splitTextToSize(text || '—', maxWidth) as string[];
}

/**
 * Captura el nodo del mapa de dolor / postura a Base64 PNG (espera 400ms + html2canvas HD).
 */
export async function capturePainMapForPdf(element: HTMLElement): Promise<string> {
  return captureElementToPngBase64(element, {
    scale: 2,
    backgroundColor: '#ffffff',
    settleMs: 400,
  });
}

export async function capturePostureForPdf(element: HTMLElement): Promise<string> {
  return captureElementToPngBase64(element, {
    scale: 2,
    backgroundColor: '#ffffff',
    settleMs: 400,
  });
}

export function generateKinesiologyPdf(options: GenerateKinesiologyPdfOptions): jsPDF {
  const {
    patient,
    historia,
    evaluation,
    painObservations = [],
    painMapImageBase64,
    postureImageBase64,
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
  const slate: RGB = [30, 41, 59];
  const muted: RGB = [100, 116, 139];
  const surface: RGB = [248, 250, 252];
  const border: RGB = [226, 232, 240];
  const orange: RGB = [249, 115, 22];
  const blue: RGB = [37, 99, 235];

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

  const drawSeverityChip = (x: number, chipY: number, label: string, color: RGB) => {
    const w = Math.max(18, doc.getTextWidth(label) + 6);
    doc.setFillColor(color[0], color[1], color[2]);
    doc.roundedRect(x, chipY, w, 5, 1.2, 1.2, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(255, 255, 255);
    doc.text(label, x + 3, chipY + 3.5);
    return w;
  };

  const drawProgressBar = (
    x: number,
    barY: number,
    maxW: number,
    pct: number,
    color: RGB,
    track: RGB = [226, 232, 240],
  ) => {
    const clamped = Math.max(0, Math.min(100, pct));
    doc.setFillColor(...track);
    doc.roundedRect(x, barY, maxW, 4.2, 1, 1, 'F');
    const fillW = Math.max(1.5, (clamped / 100) * maxW);
    doc.setFillColor(...color);
    doc.roundedRect(x, barY, fillW, 4.2, 1, 1, 'F');
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
  doc.text(
    `${clinicAddress}${clinicPhone ? ` · ${clinicPhone}` : ''}${clinicEmail ? ` · ${clinicEmail}` : ''}`,
    margin + 5,
    y + 23,
  );
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
  const h3 = labelValue(
    'Edad / Sexo',
    `${calcAge(patient.birth_date)} años · ${genderLabel(patient.gender)}`,
    margin + 3 + (colW + 2) * 2,
    colW,
  );
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

  // ── 2. Mapa de dolor (imagen grande) ──
  sectionTitle('2. Mapa de dolor anatómico');

  if (painMapImageBase64) {
    const imgW = contentWidth;
    const imgH = 108; // ≥100mm visible
    ensureSpace(imgH + 10);
    try {
      const xCentered = margin;
      doc.addImage(painMapImageBase64, 'PNG', xCentered, y, imgW, imgH);
      y += imgH + 6;
    } catch {
      paragraph('No se pudo incrustar la imagen del mapa de dolor.');
    }
  } else if (painObservations.length === 0) {
    paragraph('Sin observaciones de dolor registradas en el mapa corporal.');
  } else {
    paragraph('Mapa anatómico no disponible (captura pendiente). Se listan hallazgos abajo.');
  }

  if (painObservations.length > 0) {
    ensureSpace(16);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(...muted);
    doc.text('Intensidad EVA por región', margin, y);
    y += 5;

    const barMaxW = contentWidth - 58;
    for (const obs of painObservations.slice(0, 12)) {
      ensureSpace(9);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(...slate);
      const label = `${obs.body_region} (${obs.body_side === 'front' ? 'ant.' : 'post.'})`;
      doc.text(label.slice(0, 34), margin, y + 3);
      const pct = Math.min(10, obs.pain_level) * 10;
      const color: RGB =
        obs.pain_level <= 3
          ? [34, 197, 94]
          : obs.pain_level <= 5
            ? [245, 158, 11]
            : obs.pain_level <= 7
              ? [249, 115, 22]
              : [239, 68, 68];
      drawProgressBar(margin + 52, y, barMaxW - 18, pct, color);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(...slate);
      doc.text(`${obs.pain_level}`, margin + contentWidth - 8, y + 3.2, { align: 'right' });
      y += 7;
    }

    const notes = painObservations.filter((o) => o.clinical_notes?.trim()).slice(0, 6);
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

  // 3.1 Postura
  const postura = evaluation?.postura as PostureAssessment | undefined;
  ensureSpace(16);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...primary);
  doc.text('3.1 Postura — alineación y desviaciones', margin, y);
  y += 5;

  if (postureImageBase64) {
    const imgH = 72;
    ensureSpace(imgH + 8);
    try {
      doc.addImage(postureImageBase64, 'PNG', margin, y, contentWidth, imgH);
      y += imgH + 5;
    } catch {
      /* fallback textual abajo */
    }
  }

  const renderPostureFindings = (title: string, landmarks?: PostureLandmark[]) => {
    const list = landmarks || [];
    ensureSpace(12 + Math.max(list.length, 1) * 7);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(...slate);
    doc.text(title, margin + 2, y);
    y += 4;

    if (!list.length) {
      paragraph('Sin landmarks registrados en esta vista.');
      return;
    }

    for (const lm of list) {
      ensureSpace(8);
      const sev = String(lm.severity || '');
      const color = severityColor(sev);
      const finding = lm.finding?.trim();
      const isDeviation = sev && sev !== 'normal';

      // Indicador visual de desviación
      doc.setFillColor(...(isDeviation ? orange : blue));
      doc.circle(margin + 4, y + 1.5, 1.6, 'F');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(...slate);
      doc.text(String(lm.landmark || 'Landmark'), margin + 8, y + 2.5);

      const chipW = drawSeverityChip(margin + 72, y - 1, severityLabel(sev), color);

      if (finding) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.5);
        doc.setTextColor(...muted);
        doc.text(finding.slice(0, 42), margin + 72 + chipW + 3, y + 2.5);
      }

      // Barra de severidad (0 normal → 100 marcada)
      const sevPct =
        sev === 'marcada' ? 100 : sev === 'moderada' ? 66 : sev === 'leve' ? 33 : sev === 'normal' ? 8 : 0;
      drawProgressBar(margin + 8, y + 4, contentWidth - 20, sevPct || 5, color, [241, 245, 249]);
      y += 9;
    }
  };

  if (postura) {
    renderPostureFindings('Vista anterior', postura.anterior?.landmarks);
    renderPostureFindings('Vista lateral', postura.lateral?.landmarks);
    renderPostureFindings('Vista posterior', postura.posterior?.landmarks);
    if (postura.concepto) paragraph(`Concepto postural: ${postura.concepto}`);
  } else {
    paragraph('No hay datos de postura en esta evaluación.');
  }

  // 3.2 Movilidad ROM con barras
  ensureSpace(18);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...primary);
  doc.text('3.2 Movilidad — rangos y limitaciones (ROM)', margin, y);
  y += 5;

  const movilidad = evaluation?.movilidad || [];
  if (!movilidad.length) {
    paragraph('Sin segmentos de movilidad registrados.');
  } else {
    ensureSpace(8);
    doc.setFillColor(...surface);
    doc.rect(margin, y - 3, contentWidth, 7, 'F');
    doc.setFontSize(7);
    doc.setTextColor(...muted);
    doc.setFont('helvetica', 'bold');
    doc.text('Segmento', margin + 2, y);
    doc.text('ROM Izq.', margin + 58, y);
    doc.text('ROM Der.', margin + 120, y);
    y += 6;

    for (const row of movilidad) {
      ensureSpace(14);
      const pctL = romPercentFromText(row.limitacion_izq);
      const pctR = romPercentFromText(row.limitacion_der);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(...slate);
      doc.text(String(row.estructura || '').slice(0, 26), margin + 2, y);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.5);
      doc.setTextColor(...muted);
      doc.text((row.limitacion_izq || 'Normal').slice(0, 22), margin + 58, y);
      doc.text((row.limitacion_der || 'Normal').slice(0, 22), margin + 120, y);

      drawProgressBar(margin + 58, y + 2, 55, pctL, romBarColor(pctL));
      drawProgressBar(margin + 120, y + 2, 55, pctR, romBarColor(pctR));

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.5);
      doc.setTextColor(...slate);
      doc.text(`${pctL}%`, margin + 58 + 56, y + 5.2);
      doc.text(`${pctR}%`, margin + 120 + 56, y + 5.2);
      y += 11;
    }
  }

  // 3.3 Fuerza — barras L vs R
  ensureSpace(18);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...primary);
  doc.text('3.3 Fuerza muscular — comparación Izq. vs Der.', margin, y);
  y += 5;

  const fuerza = (evaluation?.fuerza || []) as StrengthAssessment[];
  const fuerzaConDatos = fuerza.filter((r) => r.fuerza_izq_kg != null || r.fuerza_der_kg != null);
  const rowsToShow = fuerzaConDatos.length ? fuerzaConDatos : fuerza.slice(0, 8);
  const maxForce = Math.max(
    1,
    ...rowsToShow.map((r) => Math.max(r.fuerza_izq_kg || 0, r.fuerza_der_kg || 0)),
  );

  if (!fuerza.length) {
    paragraph('Sin evaluación de fuerza registrada.');
  } else if (!fuerzaConDatos.length) {
    paragraph('Segmentos de fuerza definidos, sin valores numéricos aún. Complete la evaluación para ver gráficas L/R.');
    for (const row of fuerza.slice(0, 10)) {
      ensureSpace(6);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(...slate);
      doc.text(`· ${row.estructura}`, margin + 2, y);
      y += 5;
    }
  } else {
    for (const row of fuerzaConDatos) {
      ensureSpace(16);
      const left = row.fuerza_izq_kg ?? 0;
      const right = row.fuerza_der_kg ?? 0;
      const asym = row.asimetria_porcentaje;

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(...slate);
      doc.text(String(row.estructura || '').slice(0, 40), margin + 2, y);
      y += 3.5;

      // L bar
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(...muted);
      doc.text('Izq', margin + 2, y + 3);
      drawProgressBar(margin + 14, y, 70, (left / maxForce) * 100, blue);
      doc.setTextColor(...slate);
      doc.setFont('helvetica', 'bold');
      doc.text(left ? `${left}` : '—', margin + 86, y + 3);

      // R bar
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...muted);
      doc.text('Der', margin + 100, y + 3);
      drawProgressBar(margin + 112, y, 70, (right / maxForce) * 100, orange);
      doc.setTextColor(...slate);
      doc.setFont('helvetica', 'bold');
      doc.text(right ? `${right}` : '—', margin + contentWidth - 2, y + 3, { align: 'right' });

      y += 6;
      if (asym != null) {
        const asymColor: RGB = asym >= 15 ? [239, 68, 68] : asym >= 8 ? [234, 179, 8] : [34, 197, 94];
        drawSeverityChip(margin + 2, y, `Asimetría ${asym}%`, asymColor);
        y += 7;
      } else {
        y += 3;
      }
    }
  }

  // 3.4 Control de movimiento — badges
  ensureSpace(16);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...primary);
  doc.text('3.4 Control de movimiento — patrones motores', margin, y);
  y += 5;

  const gestos = (evaluation?.gestos_movimiento || []) as MovementGesture[];
  if (!gestos.length) {
    paragraph('Sin patrones de control de movimiento registrados.');
  } else {
    for (const g of gestos) {
      const status = controlStatus(g);
      ensureSpace(14);
      // Card background
      doc.setFillColor(...surface);
      doc.roundedRect(margin, y - 2, contentWidth, 11, 2, 2, 'F');
      doc.setDrawColor(...border);
      doc.roundedRect(margin, y - 2, contentWidth, 11, 2, 2, 'S');

      // Status dot
      doc.setFillColor(...status.color);
      doc.circle(margin + 5, y + 3.5, 2.2, 'F');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(...slate);
      doc.text(String(g.gesto || 'Patrón').slice(0, 36), margin + 10, y + 2.5);

      drawSeverityChip(margin + 95, y - 0.5, status.label, status.color);

      const detail =
        (g.alteraciones || []).filter(Boolean).join(', ') ||
        g.comentarios ||
        'Patrón motor dentro de parámetros esperados';
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(...muted);
      doc.text(detail.slice(0, 70), margin + 10, y + 6.5);
      y += 13;
    }
  }

  // 3.5 Diagnóstico / plan
  ensureSpace(20);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...primary);
  doc.text('3.5 Diagnóstico kinésico, objetivos y plan', margin, y);
  y += 5;
  paragraph(`Diagnóstico: ${evaluation?.diagnostico_kinesico || '—'}`);
  paragraph(`Observaciones generales: ${evaluation?.observaciones_generales || '—'}`);

  const plan = normalizeTreatmentPlan(evaluation?.plan_tratamiento, patient.id) as TreatmentPlan;
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
