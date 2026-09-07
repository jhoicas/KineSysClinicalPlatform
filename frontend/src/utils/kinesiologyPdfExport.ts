import jsPDF from 'jspdf';
import type {
  HistoriaClinica,
  KinesiologyEvaluation,
  MobilityAssessment,
  MovementGesture,
  PacienteClinico,
  PainObservation,
  PostureAssessment,
  PostureLandmark,
  StrengthAssessment,
  TreatmentPlan,
} from '../types';
import { MOVEMENT_GESTURES, normalizeTreatmentPlan } from '../data/kinesiologyCatalog';
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

function painTypeLabel(t?: string): string {
  if (!t) return '—';
  const map: Record<string, string> = {
    punzante: 'Punzante',
    urente: 'Urente / Quemante',
    sordo: 'Sordo',
    opresivo: 'Opresivo',
    irradiado: 'Irradiado',
    pulsatil: 'Pulsátil',
    agudo: 'Agudo',
  };
  return map[t] || t;
}

/** Interpreta texto de limitación ROM → % estimado (0–100). */
function romPercentFromText(text?: string): number {
  const raw = (text || '').trim().toLowerCase();
  if (
    !raw ||
    raw === '—' ||
    raw === '-' ||
    raw.includes('sin limit') ||
    raw.includes('normal') ||
    raw.includes('completa')
  ) {
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

function evaColor(level: number): RGB {
  if (level <= 3) return [34, 197, 94];
  if (level <= 6) return [249, 115, 22];
  return [239, 68, 68];
}

function controlStatus(g: MovementGesture): { label: string; color: RGB } {
  const alts = (g.alteraciones || []).filter(Boolean);
  if (alts.length === 0) return { label: 'Sin Alteraciones', color: [34, 197, 94] };
  const joined = alts.join(' ').toLowerCase();
  if (
    joined.includes('inestab') ||
    joined.includes('dolor') ||
    joined.includes('fallo') ||
    joined.includes('sever')
  ) {
    return { label: 'Inestabilidad Severa', color: [239, 68, 68] };
  }
  return { label: 'Compensación Leve', color: [234, 179, 8] };
}

function wrapText(doc: jsPDF, text: string, maxWidth: number): string[] {
  return doc.splitTextToSize(text || '—', maxWidth) as string[];
}

function verificationCode(patientId: string, dateStr: string): string {
  const raw = `${patientId}|${dateStr}|kinesys`;
  let hash = 0;
  for (let i = 0; i < raw.length; i++) hash = (hash * 31 + raw.charCodeAt(i)) >>> 0;
  return `KS-${hash.toString(16).toUpperCase().padStart(8, '0')}`;
}

/** Escala Daniels 0–5 si el valor está en rango; si no, muestra kg. */
function danielsOrKg(value: number | null | undefined): { label: string; daniels: number | null } {
  if (value == null || !Number.isFinite(value)) return { label: '—', daniels: null };
  if (value >= 0 && value <= 5) {
    return { label: `${value}/5`, daniels: value };
  }
  return { label: `${value} kg`, daniels: null };
}

/**
 * Captura HD del mapa de dolor (settle 450ms + html2canvas).
 */
export async function capturePainMapForPdf(element: HTMLElement): Promise<string> {
  return captureElementToPngBase64(element, {
    scale: 2.5,
    backgroundColor: '#ffffff',
    settleMs: 450,
  });
}

export async function capturePostureForPdf(element: HTMLElement): Promise<string> {
  return captureElementToPngBase64(element, {
    scale: 2.5,
    backgroundColor: '#ffffff',
    settleMs: 450,
  });
}

function drawMotorIcon(doc: jsPDF, x: number, y: number, gesto: string, color: RGB) {
  doc.setDrawColor(...color);
  doc.setFillColor(...color);
  doc.setLineWidth(0.6);
  const g = gesto.toLowerCase();
  // Cabeza
  doc.circle(x + 6, y + 3, 2, 'S');
  if (g.includes('sentadilla') || g.includes('squat')) {
    doc.line(x + 6, y + 5, x + 6, y + 10);
    doc.line(x + 6, y + 7, x + 2, y + 9);
    doc.line(x + 6, y + 7, x + 10, y + 9);
    doc.line(x + 6, y + 10, x + 3, y + 15);
    doc.line(x + 6, y + 10, x + 9, y + 15);
  } else if (g.includes('estocada') || g.includes('lunge')) {
    doc.line(x + 6, y + 5, x + 6, y + 10);
    doc.line(x + 6, y + 7, x + 11, y + 8);
    doc.line(x + 6, y + 10, x + 2, y + 15);
    doc.line(x + 6, y + 10, x + 11, y + 13);
  } else if (g.includes('peso muerto') || g.includes('dead')) {
    doc.line(x + 6, y + 5, x + 6, y + 11);
    doc.line(x + 2, y + 8, x + 10, y + 8);
    doc.line(x + 6, y + 11, x + 3, y + 15);
    doc.line(x + 6, y + 11, x + 9, y + 15);
  } else if (g.includes('salto')) {
    doc.line(x + 6, y + 5, x + 6, y + 9);
    doc.line(x + 6, y + 7, x + 2, y + 5);
    doc.line(x + 6, y + 7, x + 10, y + 5);
    doc.line(x + 6, y + 9, x + 3, y + 14);
    doc.line(x + 6, y + 9, x + 9, y + 14);
    doc.setFillColor(...color);
    doc.circle(x + 6, y + 1.5, 0.8, 'F');
  } else if (g.includes('plancha') || g.includes('plank')) {
    doc.line(x + 1, y + 8, x + 12, y + 8);
    doc.line(x + 2, y + 8, x + 2, y + 12);
    doc.line(x + 11, y + 8, x + 11, y + 12);
    doc.circle(x + 12.5, y + 7, 1.5, 'S');
  } else {
    doc.line(x + 6, y + 5, x + 6, y + 12);
    doc.line(x + 6, y + 7, x + 2, y + 10);
    doc.line(x + 6, y + 7, x + 10, y + 10);
    doc.line(x + 6, y + 12, x + 3, y + 15);
    doc.line(x + 6, y + 12, x + 9, y + 15);
  }
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
    clinicName = 'Clínica KineSys Demo',
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

  const docCode = verificationCode(patient.id || 'anon', dateStr);

  const footer = () => {
    doc.setDrawColor(...border);
    doc.line(margin, pageHeight - 12, pageWidth - margin, pageHeight - 12);
    doc.setFontSize(7.5);
    doc.setTextColor(...muted);
    doc.text(
      `Clínica KineSys Demo · KineSys Clinical Platform · ${docCode} · Pág. ${pageNum}`,
      pageWidth / 2,
      pageHeight - 7,
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

  const sectionTitle = (num: number, title: string) => {
    ensureSpace(16);
    doc.setFillColor(...primary);
    doc.roundedRect(margin, y, contentWidth, 9, 1.5, 1.5, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(255, 255, 255);
    doc.text(`${num}. ${title}`, margin + 3.5, y + 6);
    y += 13;
  };

  const labelValue = (label: string, value: string, x: number, width: number) => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(...muted);
    doc.text(label.toUpperCase(), x, y);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...slate);
    const lines = wrapText(doc, value || '—', width);
    doc.text(lines, x, y + 4);
    return 4 + lines.length * 4;
  };

  const paragraph = (text: string, indent = 2) => {
    const lines = wrapText(doc, text || 'Sin registro.', contentWidth - indent - 2);
    ensureSpace(lines.length * 4.2 + 4);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...slate);
    doc.text(lines, margin + indent, y);
    y += lines.length * 4.2 + 3;
  };

  const subHead = (text: string) => {
    ensureSpace(10);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...primary);
    doc.text(text, margin, y);
    y += 5;
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

  // ═══════════════════════════════════════════════════════════
  // CABECERA DE MARCA
  // ═══════════════════════════════════════════════════════════
  doc.setFillColor(...primary);
  doc.roundedRect(margin, y, contentWidth, 30, 3, 3, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.text('Clínica KineSys Demo', margin + 5, y + 10);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('KineSys Clinical Platform', margin + 5, y + 16);
  doc.setFontSize(8.5);
  doc.text('Informe de Evaluación Kinésica Integral / Fisioterapia', margin + 5, y + 22);
  doc.setFontSize(7.5);
  doc.text(
    `${clinicAddress}${clinicPhone ? ` · ${clinicPhone}` : ''}${clinicEmail ? ` · ${clinicEmail}` : ''}`,
    margin + 5,
    y + 27,
  );
  y += 36;

  // ═══════════════════════════════════════════════════════════
  // 1. DATOS DEL PACIENTE E HISTORIA CLÍNICA
  // ═══════════════════════════════════════════════════════════
  sectionTitle(1, 'Datos del Paciente e Historia Clínica');

  doc.setFillColor(...surface);
  doc.roundedRect(margin, y, contentWidth, 32, 2, 2, 'F');
  doc.setDrawColor(...border);
  doc.roundedRect(margin, y, contentWidth, 32, 2, 2, 'S');

  const colW = contentWidth / 3 - 2;
  const row1Y = y + 5;
  y = row1Y;
  const h1 = labelValue(
    'Paciente',
    `${patient.first_name} ${patient.last_name}`.trim(),
    margin + 3,
    colW,
  );
  y = row1Y;
  const h2 = labelValue(
    'Documento / RUT',
    `${patient.identifier_type || 'ID'}: ${patient.identifier_number || '—'}`,
    margin + 3 + colW + 2,
    colW,
  );
  y = row1Y;
  const h3 = labelValue(
    'Edad / Género',
    `${calcAge(patient.birth_date)} años · ${genderLabel(patient.gender)}`,
    margin + 3 + (colW + 2) * 2,
    colW,
  );
  y = row1Y + Math.max(h1, h2, h3) + 3;

  const row2Y = y;
  y = row2Y;
  const h4 = labelValue('Fecha de evaluación', dateStr, margin + 3, colW);
  y = row2Y;
  const h5 = labelValue(
    'Fisioterapeuta evaluador',
    physiotherapistName,
    margin + 3 + colW + 2,
    colW * 2,
  );
  y = row2Y + Math.max(h4, h5) + 8;

  subHead('Resumen de Historia Clínica y Antecedentes Relevantes');
  if (historia) {
    paragraph(`Ocupación: ${historia.ocupacion || '—'}`);
    paragraph(`Motivo de consulta: ${historia.motivo_consulta || '—'}`);
    paragraph(
      `Deporte / actividad: ${historia.deporte_practica || '—'} · Nivel: ${historia.nivel_deporte || '—'} · Frecuencia: ${historia.frecuencia_semanal || '—'}`,
    );
    paragraph(`Lesiones anteriores: ${historia.lesiones_anteriores || '—'}`);
    paragraph(`Hábitos y estilo de vida: ${historia.habitos_estilo_vida || '—'}`);
  } else {
    paragraph('No hay historia clínica asociada al paciente en el expediente.');
  }

  // ═══════════════════════════════════════════════════════════
  // 2. MAPA ANATÓMICO 2D DE DOLOR
  // ═══════════════════════════════════════════════════════════
  sectionTitle(2, 'Mapa Anatómico 2D de Dolor (Lienzo Vectorial SVG)');

  if (painMapImageBase64) {
    const imgH = 112;
    ensureSpace(imgH + 8);
    try {
      doc.addImage(painMapImageBase64, 'PNG', margin, y, contentWidth, imgH);
      y += imgH + 6;
    } catch {
      paragraph('No se pudo incrustar la captura del mapa anatómico de dolor.');
    }
  } else if (painObservations.length === 0) {
    paragraph('Sin observaciones de dolor registradas en el mapa corporal.');
  } else {
    paragraph('Captura gráfica pendiente. Se detallan hallazgos en la tabla inferior.');
  }

  // Leyenda EVA
  ensureSpace(10);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(...muted);
  doc.text('Escala cromática EVA:', margin, y);
  const legend: { label: string; color: RGB }[] = [
    { label: '1–3 Leve', color: [34, 197, 94] },
    { label: '4–6 Moderado', color: [249, 115, 22] },
    { label: '7–10 Severo', color: [239, 68, 68] },
  ];
  let lx = margin + 38;
  for (const item of legend) {
    doc.setFillColor(...item.color);
    doc.circle(lx, y - 1, 2, 'F');
    doc.setTextColor(...slate);
    doc.setFont('helvetica', 'normal');
    doc.text(item.label, lx + 4, y);
    lx += 38;
  }
  y += 7;

  if (painObservations.length > 0) {
    ensureSpace(18);
    // Table header
    doc.setFillColor(...primary);
    doc.rect(margin, y, contentWidth, 7, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(255, 255, 255);
    doc.text('Región afectada', margin + 2, y + 4.5);
    doc.text('EVA', margin + 62, y + 4.5);
    doc.text('Vista', margin + 78, y + 4.5);
    doc.text('Tipo de dolor', margin + 98, y + 4.5);
    doc.text('Notas clínicas', margin + 130, y + 4.5);
    y += 8;

    for (const obs of painObservations.slice(0, 14)) {
      ensureSpace(9);
      const c = evaColor(obs.pain_level);
      doc.setFillColor(c[0], c[1], c[2]);
      doc.circle(margin + 66, y + 1.5, 2.2, 'F');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(...slate);
      doc.text(String(obs.body_region || '—').slice(0, 28), margin + 2, y + 2.5);

      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...c);
      doc.text(`${obs.pain_level}/10`, margin + 70, y + 2.5);

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...muted);
      doc.text(obs.body_side === 'front' ? 'Ant.' : 'Post.', margin + 78, y + 2.5);
      doc.text(painTypeLabel(obs.pain_type).slice(0, 14), margin + 98, y + 2.5);
      doc.text((obs.clinical_notes || '—').slice(0, 32), margin + 130, y + 2.5);
      y += 7;
    }
  }

  // ═══════════════════════════════════════════════════════════
  // 3. VALORACIÓN POSTURAL (3 VISTAS)
  // ═══════════════════════════════════════════════════════════
  sectionTitle(3, 'Valoración Postural por Planos Anatómicos (3 Vistas)');

  if (postureImageBase64) {
    const imgH = 78;
    ensureSpace(imgH + 8);
    try {
      doc.addImage(postureImageBase64, 'PNG', margin, y, contentWidth, imgH);
      y += imgH + 5;
    } catch {
      paragraph('No se pudo incrustar la captura postural.');
    }
  }

  ensureSpace(14);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(...muted);
  const planeNotes = [
    'Anterior (coronal): hombros, EIAS, rodillas (valgo/varo), tobillos.',
    'Lateral (sagital): cabeza, lordosis C/L, cifosis dorsal, inclinación pélvica.',
    'Posterior (dorsal): escápulas, escoliosis, pliegues glúteos/poplíteos.',
  ];
  for (const note of planeNotes) {
    ensureSpace(5);
    doc.text(`· ${note}`, margin + 2, y);
    y += 4;
  }
  y += 2;

  const postura = evaluation?.postura as PostureAssessment | undefined;

  const renderPostureFindings = (title: string, landmarks?: PostureLandmark[]) => {
    const list = (landmarks || []).filter((lm) => lm.severity || lm.finding);
    ensureSpace(10);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(...primary);
    doc.text(title, margin + 2, y);
    y += 5;

    const rows = list.length ? list : landmarks || [];
    if (!rows.length) {
      paragraph('Sin landmarks registrados en esta vista.');
      return;
    }

    for (const lm of rows) {
      ensureSpace(9);
      const sev = String(lm.severity || '');
      const color = severityColor(sev);
      const finding = lm.finding?.trim();
      const isDeviation = Boolean(sev && sev !== 'normal');

      doc.setFillColor(...(isDeviation ? orange : blue));
      doc.circle(margin + 4, y + 1.5, 1.5, 'F');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(...slate);
      doc.text(String(lm.landmark || 'Landmark').slice(0, 36), margin + 8, y + 2.5);

      const chipW = drawSeverityChip(margin + 78, y - 1, severityLabel(sev), color);
      if (finding) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        doc.setTextColor(...muted);
        doc.text(finding.slice(0, 40), margin + 78 + chipW + 3, y + 2.5);
      }
      y += 7;
    }
  };

  subHead('Observaciones Fisioterapéuticas Posturales');
  if (postura) {
    renderPostureFindings('Vista Anterior (Plano Coronal)', postura.anterior?.landmarks);
    renderPostureFindings('Vista Lateral (Plano Sagital)', postura.lateral?.landmarks);
    renderPostureFindings('Vista Posterior (Plano Dorsal)', postura.posterior?.landmarks);
    if (postura.concepto) paragraph(`Concepto clínico postural: ${postura.concepto}`);
  } else {
    paragraph('No hay datos de postura en esta evaluación.');
  }

  // ═══════════════════════════════════════════════════════════
  // 4. MOVILIDAD / ROM
  // ═══════════════════════════════════════════════════════════
  sectionTitle(4, 'Evaluación de Movilidad (ROM — Rangos de Movimiento)');

  const movilidad = (evaluation?.movilidad || []) as MobilityAssessment[];
  if (!movilidad.length) {
    paragraph('Sin segmentos de movilidad (goniometría) registrados.');
  } else {
    ensureSpace(10);
    doc.setFillColor(...surface);
    doc.rect(margin, y - 3, contentWidth, 7, 'F');
    doc.setFontSize(7);
    doc.setTextColor(...muted);
    doc.setFont('helvetica', 'bold');
    doc.text('Segmento', margin + 2, y);
    doc.text('ROM Izquierdo', margin + 55, y);
    doc.text('ROM Derecho', margin + 118, y);
    y += 6;

    for (const row of movilidad) {
      ensureSpace(14);
      const pctL = romPercentFromText(row.limitacion_izq);
      const pctR = romPercentFromText(row.limitacion_der);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(...slate);
      doc.text(String(row.estructura || '').slice(0, 24), margin + 2, y);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.5);
      doc.setTextColor(...muted);
      doc.text((row.limitacion_izq || 'Normal / Completo').slice(0, 24), margin + 55, y);
      doc.text((row.limitacion_der || 'Normal / Completo').slice(0, 24), margin + 118, y);

      drawProgressBar(margin + 55, y + 2, 52, pctL, romBarColor(pctL));
      drawProgressBar(margin + 118, y + 2, 52, pctR, romBarColor(pctR));

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.5);
      doc.setTextColor(...slate);
      doc.text(`${pctL}%`, margin + 55 + 53, y + 5.2);
      doc.text(`${pctR}%`, margin + 118 + 53, y + 5.2);
      y += 11;
    }

    ensureSpace(8);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(...muted);
    doc.text(
      'Verde ≥85% · Amarillo 60–84% (limitación leve) · Rojo <60% (limitación severa)',
      margin + 2,
      y,
    );
    y += 6;
  }

  // ═══════════════════════════════════════════════════════════
  // 5. FUERZA MUSCULAR / DANIELS
  // ═══════════════════════════════════════════════════════════
  sectionTitle(5, 'Fuerza Muscular y Evaluación Funcional (Daniels / Asimetría)');

  const fuerza = (evaluation?.fuerza || []) as StrengthAssessment[];
  const fuerzaConDatos = fuerza.filter((r) => r.fuerza_izq_kg != null || r.fuerza_der_kg != null);

  if (!fuerza.length) {
    paragraph('Sin evaluación de fuerza registrada.');
  } else if (!fuerzaConDatos.length) {
    paragraph(
      'Grupos musculares definidos sin valores numéricos. Complete la evaluación para ver gráficas L/R.',
    );
  } else {
    const maxForce = Math.max(
      1,
      ...fuerzaConDatos.map((r) => Math.max(r.fuerza_izq_kg || 0, r.fuerza_der_kg || 0, 5)),
    );

    for (const row of fuerzaConDatos) {
      ensureSpace(18);
      const left = row.fuerza_izq_kg;
      const right = row.fuerza_der_kg;
      const leftD = danielsOrKg(left);
      const rightD = danielsOrKg(right);
      const asym =
        row.asimetria_porcentaje ??
        (left != null && right != null
          ? Math.round((Math.abs(left - right) / Math.max(left, right, 0.01)) * 1000) / 10
          : null);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(...slate);
      doc.text(String(row.estructura || '').slice(0, 42), margin + 2, y);
      y += 4;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(...muted);
      doc.text('Izq (Daniels/kg)', margin + 2, y + 3);
      drawProgressBar(
        margin + 28,
        y,
        55,
        left != null ? (left / maxForce) * 100 : 0,
        blue,
      );
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...slate);
      doc.text(leftD.label, margin + 86, y + 3);

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...muted);
      doc.text('Der', margin + 108, y + 3);
      drawProgressBar(
        margin + 118,
        y,
        55,
        right != null ? (right / maxForce) * 100 : 0,
        orange,
      );
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...slate);
      doc.text(rightD.label, margin + contentWidth - 2, y + 3, { align: 'right' });

      y += 7;
      if (asym != null) {
        const asymColor: RGB =
          asym >= 15 ? [239, 68, 68] : asym >= 8 ? [234, 179, 8] : [34, 197, 94];
        drawSeverityChip(margin + 2, y, `% Asimetría muscular: ${asym}%`, asymColor);
        y += 8;
      } else {
        y += 3;
      }
    }
  }

  // ═══════════════════════════════════════════════════════════
  // 6. CONTROL DE MOVIMIENTO
  // ═══════════════════════════════════════════════════════════
  sectionTitle(6, 'Control de Movimiento y Patrones Motores');

  const gestosRaw = (evaluation?.gestos_movimiento || []) as MovementGesture[];
  const gestosMap = new Map(gestosRaw.map((g) => [g.gesto, g]));
  const gestosOrdered: MovementGesture[] = MOVEMENT_GESTURES.map(
    (name) => gestosMap.get(name) || { gesto: name, alteraciones: [], comentarios: '' },
  );
  // Incluir gestos extra no estándar
  for (const g of gestosRaw) {
    if (!MOVEMENT_GESTURES.includes(g.gesto as (typeof MOVEMENT_GESTURES)[number])) {
      gestosOrdered.push(g);
    }
  }

  if (!gestosRaw.length) {
    paragraph('Sin patrones de control de movimiento registrados.');
  } else {
    for (const g of gestosOrdered.filter((x) => gestosMap.has(x.gesto) || (x.alteraciones || []).length || x.comentarios)) {
      const status = controlStatus(g);
      ensureSpace(28);

      doc.setFillColor(...surface);
      doc.roundedRect(margin, y, contentWidth, 24, 2.5, 2.5, 'F');
      doc.setDrawColor(...border);
      doc.roundedRect(margin, y, contentWidth, 24, 2.5, 2.5, 'S');

      // Icon box
      doc.setFillColor(255, 255, 255);
      doc.roundedRect(margin + 3, y + 3, 16, 16, 2, 2, 'F');
      drawMotorIcon(doc, margin + 5, y + 3.5, String(g.gesto || ''), status.color);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(...slate);
      doc.text(String(g.gesto || 'Patrón motor'), margin + 23, y + 7);

      drawSeverityChip(margin + 23, y + 9, status.label, status.color);

      const evidence =
        (g.alteraciones || []).filter(Boolean).join(' · ') ||
        g.comentarios ||
        'Patrón motor dentro de parámetros esperados; sin evidencia de compensación.';

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.5);
      doc.setTextColor(...muted);
      doc.text('Evidencia / observación clínica:', margin + 23, y + 17);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(...slate);
      const evLines = wrapText(doc, evidence, contentWidth - 30);
      doc.text(evLines.slice(0, 2), margin + 23, y + 20.5);

      y += 27;
    }
  }

  // ═══════════════════════════════════════════════════════════
  // 7. DIAGNÓSTICO, OBJETIVOS Y PLAN
  // ═══════════════════════════════════════════════════════════
  sectionTitle(7, 'Diagnóstico Kinésico, Objetivos y Plan Terapéutico');

  subHead('Diagnóstico Fisioterapéutico');
  paragraph(evaluation?.diagnostico_kinesico || 'Sin diagnóstico kinésico registrado.');

  const plan = normalizeTreatmentPlan(evaluation?.plan_tratamiento, patient.id) as TreatmentPlan;

  subHead('Objetivos Terapéuticos');
  if (plan?.objective) {
    paragraph(plan.objective);
  } else {
    paragraph(
      'Objetivos a corto plazo: control del dolor, restauración de movilidad y educación postural. Objetivos a largo plazo: readaptación funcional y prevención de recidivas.',
    );
  }

  subHead('Plan de Tratamiento');
  if (plan) {
    paragraph(
      `Fase actual: ${plan.currentPhase || '—'} · Sesiones ejecutadas: ${plan.sessionsCompleted ?? 0} / programadas: ${plan.totalSessionsPlanned ?? 0}`,
    );
    if (plan.startDate || plan.estimatedEndDate) {
      paragraph(
        `Periodo estimado: ${plan.startDate || '—'} → ${plan.estimatedEndDate || '—'}`,
      );
    }
    const exercises = plan.exercises || [];
    if (exercises.length) {
      ensureSpace(8);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(...muted);
      doc.text('Ejercicios prescritos', margin + 2, y);
      y += 4;
      for (const ex of exercises.slice(0, 12)) {
        paragraph(
          `· ${ex.name} (${ex.category}) — ${ex.sets}×${ex.repsOrDuration}, descanso ${ex.restSeconds}s, ${ex.frequencyDaysPerWeek}×/sem`,
        );
      }
    }
    if (plan.clinicalNotes) paragraph(`Notas del plan: ${plan.clinicalNotes}`);
  } else {
    paragraph('Plan terapéutico no estructurado en esta evaluación.');
  }

  subHead('Observaciones Generales y Recomendaciones');
  paragraph(evaluation?.observaciones_generales || 'Sin observaciones generales adicionales.');

  // Firma digital + QR de verificación
  ensureSpace(48);
  y += 4;
  doc.setDrawColor(...border);
  doc.line(margin, y, pageWidth - margin, y);
  y += 8;

  // QR-like verification grid
  const qrX = margin;
  const qrY = y;
  const cell = 1.4;
  const size = 18;
  doc.setFillColor(...surface);
  doc.roundedRect(qrX - 1, qrY - 1, size + 8, size + 10, 2, 2, 'F');
  doc.setDrawColor(...primary);
  doc.roundedRect(qrX - 1, qrY - 1, size + 8, size + 10, 2, 2, 'S');

  // Pseudo-QR pattern determinista
  let seed = 0;
  for (let i = 0; i < docCode.length; i++) seed = (seed + docCode.charCodeAt(i) * (i + 1)) % 9973;
  for (let row = 0; row < 12; row++) {
    for (let col = 0; col < 12; col++) {
      seed = (seed * 1103515245 + 12345) >>> 0;
      if (seed % 3 !== 0) {
        doc.setFillColor(...primary);
        doc.rect(qrX + 2 + col * cell, qrY + 2 + row * cell, cell * 0.85, cell * 0.85, 'F');
      }
    }
  }
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6);
  doc.setTextColor(...muted);
  doc.text('Verificación', qrX + 1, qrY + size + 6);
  doc.setFontSize(6.5);
  doc.setTextColor(...slate);
  doc.text(docCode, qrX + 1, qrY + size + 9);

  // Signature block
  const sigX = margin + 55;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...slate);
  doc.text('Firma digital del profesional', sigX, y + 4);
  doc.setDrawColor(...slate);
  doc.line(sigX, y + 18, sigX + 90, y + 18);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(physiotherapistName, sigX, y + 16);
  doc.setFontSize(7);
  doc.setTextColor(...muted);
  doc.text(`Documento clínico verificado · ${dateStr}`, sigX, y + 23);
  doc.text('KineSys Clinical Platform — Informe confidencial', sigX, y + 27);

  y += 40;
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
