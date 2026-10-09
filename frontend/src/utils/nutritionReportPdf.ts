import jsPDF from 'jspdf';
import type { EvaluacionAntropometrica, PacienteClinico, PlanNutricional } from '../types';
import { hexToRgb } from './themeUtils';
import {
  type Badge,
  type BadgeTone,
  EQUATION_LABELS,
  bmiBadge,
  fatPctBadge,
  isFemale,
  planTotals,
  visceralBadge,
  whrBadge,
  whtrBadge,
} from './nutritionReportSummary';

export interface GenerateNutritionReportPdfOptions {
  patient: PacienteClinico;
  isak?: EvaluacionAntropometrica | null;
  withings?: EvaluacionAntropometrica | null;
  plan?: PlanNutricional | null;
  nutritionistName?: string;
  clinicName?: string;
  clinicAddress?: string;
  clinicPhone?: string;
  clinicEmail?: string;
  clinicLogoBase64?: string;
  primaryColorHex?: string;
}

type RGB = [number, number, number];

const INK: RGB = [30, 41, 59];
const MUTED: RGB = [100, 116, 139];
const LINE: RGB = [226, 232, 240];
const SOFT: RGB = [248, 250, 252];
const TONES: Record<BadgeTone, { bg: RGB; fg: RGB }> = {
  ok: { bg: [220, 252, 231], fg: [22, 101, 52] },
  warn: { bg: [254, 243, 199], fg: [146, 64, 14] },
  alert: { bg: [254, 226, 226], fg: [153, 27, 27] },
  neutral: { bg: [241, 245, 249], fg: [71, 85, 105] },
};

const PAGE_W = 210;
const PAGE_H = 297;
const MARGIN = 14;
const CONTENT_W = PAGE_W - MARGIN * 2;
const BODY_TOP = 34;
const BODY_BOTTOM = PAGE_H - 18;

function mix(c: RGB, amount: number): RGB {
  return [
    Math.round(c[0] + (255 - c[0]) * amount),
    Math.round(c[1] + (255 - c[1]) * amount),
    Math.round(c[2] + (255 - c[2]) * amount),
  ];
}

const num = (v: unknown, digits = 1): string => {
  const n = Number(v);
  if (!Number.isFinite(n) || n === 0) return '-';
  return String(Math.round(n * 10 ** digits) / 10 ** digits);
};

const fmtDate = (v?: string): string => {
  if (!v) return '-';
  const d = new Date(v);
  return Number.isNaN(d.getTime())
    ? String(v).slice(0, 10)
    : d.toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric' });
};

const calcAge = (birth?: string): string => {
  if (!birth) return '-';
  const b = new Date(birth);
  if (Number.isNaN(b.getTime())) return '-';
  const now = new Date();
  let age = now.getFullYear() - b.getFullYear();
  if (now < new Date(now.getFullYear(), b.getMonth(), b.getDate())) age -= 1;
  return `${age} años`;
};

export async function generateNutritionReportPdf(options: GenerateNutritionReportPdfOptions): Promise<jsPDF> {
  const {
    patient,
    isak,
    withings,
    plan,
    nutritionistName = 'Nutricionista KineSys',
    clinicName = 'KineSys Salud',
    clinicAddress = '',
    clinicPhone = '',
    clinicEmail = '',
    clinicLogoBase64,
    primaryColorHex = '#004870',
  } = options;

  const brandRgb = hexToRgb(primaryColorHex);
  const brand: RGB = brandRgb ? [brandRgb.r, brandRgb.g, brandRgb.b] : [0, 72, 112];
  const brandSoft = mix(brand, 0.9);
  const brandMid = mix(brand, 0.7);

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const female = isFemale(patient, isak ?? withings);
  const patientName = `${patient.first_name ?? ''} ${patient.last_name ?? ''}`.trim() || 'Paciente';
  let y = BODY_TOP;

  // ---------- primitivas ----------
  const text = (
    s: string,
    x: number,
    yy: number,
    opts: { size?: number; bold?: boolean; color?: RGB; align?: 'left' | 'center' | 'right'; maxWidth?: number } = {},
  ) => {
    doc.setFont('helvetica', opts.bold ? 'bold' : 'normal');
    doc.setFontSize(opts.size ?? 9);
    const c = opts.color ?? INK;
    doc.setTextColor(c[0], c[1], c[2]);
    doc.text(s, x, yy, { align: opts.align ?? 'left', maxWidth: opts.maxWidth });
  };

  const drawPageChrome = () => {
    doc.setFillColor(brand[0], brand[1], brand[2]);
    doc.rect(0, 0, PAGE_W, 24, 'F');
    doc.setFillColor(brandMid[0], brandMid[1], brandMid[2]);
    doc.rect(0, 24, PAGE_W, 1.2, 'F');
    let tx = MARGIN;
    if (clinicLogoBase64) {
      try {
        doc.addImage(clinicLogoBase64, 'PNG', MARGIN, 5, 14, 14);
        tx = MARGIN + 18;
      } catch {
        tx = MARGIN;
      }
    }
    text(clinicName.toUpperCase(), tx, 11, { size: 12, bold: true, color: [255, 255, 255], maxWidth: 110 });
    text('INFORME NUTRICIONAL INTEGRAL', tx, 17, { size: 7.5, color: mix(brand, 0.85) });
    text(patientName, PAGE_W - MARGIN, 11, { size: 9, bold: true, color: [255, 255, 255], align: 'right' });
    text(fmtDate(new Date().toISOString()), PAGE_W - MARGIN, 17, {
      size: 7.5,
      color: mix(brand, 0.85),
      align: 'right',
    });
  };

  const newPage = () => {
    doc.addPage();
    drawPageChrome();
    y = BODY_TOP;
  };

  const ensure = (h: number) => {
    if (y + h > BODY_BOTTOM) newPage();
  };

  const badge = (b: Badge, x: number, yy: number, align: 'left' | 'right' = 'left') => {
    const tone = TONES[b.tone];
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    const w = doc.getTextWidth(b.label) + 4;
    const bx = align === 'right' ? x - w : x;
    doc.setFillColor(tone.bg[0], tone.bg[1], tone.bg[2]);
    doc.roundedRect(bx, yy - 3.1, w, 4.4, 2.2, 2.2, 'F');
    text(b.label, bx + w / 2, yy, { size: 6.5, bold: true, color: tone.fg, align: 'center' });
    return w;
  };

  const sectionTitle = (index: string, title: string, subtitle?: string) => {
    ensure(18);
    doc.setFillColor(brandSoft[0], brandSoft[1], brandSoft[2]);
    doc.roundedRect(MARGIN, y, CONTENT_W, 11, 2.5, 2.5, 'F');
    doc.setFillColor(brand[0], brand[1], brand[2]);
    doc.roundedRect(MARGIN, y, 11, 11, 2.5, 2.5, 'F');
    text(index, MARGIN + 5.5, y + 7.2, { size: 10, bold: true, color: [255, 255, 255], align: 'center' });
    text(title, MARGIN + 15, y + 6.9, { size: 11, bold: true, color: brand });
    if (subtitle) {
      text(subtitle, PAGE_W - MARGIN - 3, y + 6.9, { size: 7.5, color: MUTED, align: 'right' });
    }
    y += 15;
  };

  const subTitle = (title: string, x = MARGIN, width = CONTENT_W) => {
    text(title.toUpperCase(), x, y + 3, { size: 7.5, bold: true, color: brand });
    doc.setDrawColor(brandMid[0], brandMid[1], brandMid[2]);
    doc.setLineWidth(0.3);
    doc.line(x, y + 4.6, x + width, y + 4.6);
  };

  const emptyBox = (message: string) => {
    ensure(16);
    doc.setDrawColor(LINE[0], LINE[1], LINE[2]);
    doc.setLineDashPattern([1.5, 1.5], 0);
    doc.roundedRect(MARGIN, y, CONTENT_W, 12, 2.5, 2.5, 'S');
    doc.setLineDashPattern([], 0);
    text(message, PAGE_W / 2, y + 7.4, { size: 8.5, color: MUTED, align: 'center' });
    y += 17;
  };

  /** Tabla simple: cabecera de color suave + filas zebra. */
  const table = (
    x: number,
    width: number,
    head: string[],
    widths: number[],
    rows: (string | Badge)[][],
    opts: { rightAlignFrom?: number } = {},
  ): number => {
    const rowH = 6.2;
    const total = widths.reduce((s, w) => s + w, 0);
    const colW = widths.map((w) => (w / total) * width);
    const right = opts.rightAlignFrom ?? 1;
    let yy = y;
    const drawHead = () => {
      doc.setFillColor(brand[0], brand[1], brand[2]);
      doc.roundedRect(x, yy, width, 6.4, 1.6, 1.6, 'F');
      let cx = x;
      head.forEach((h, i) => {
        const al = i >= right ? 'right' : 'left';
        text(h, al === 'right' ? cx + colW[i] - 2 : cx + 2.5, yy + 4.4, {
          size: 7,
          bold: true,
          color: [255, 255, 255],
          align: al,
        });
        cx += colW[i];
      });
      yy += 7;
    };
    if (yy + 6.4 + rowH > BODY_BOTTOM) {
      newPage();
      yy = y;
    }
    drawHead();
    rows.forEach((row, ri) => {
      if (yy + rowH > BODY_BOTTOM) {
        newPage();
        yy = y;
        drawHead();
      }
      if (ri % 2 === 0) {
        doc.setFillColor(SOFT[0], SOFT[1], SOFT[2]);
        doc.rect(x, yy - 0.6, width, rowH, 'F');
      }
      let cx = x;
      row.forEach((cell, i) => {
        const al = i >= right ? 'right' : 'left';
        if (typeof cell === 'string') {
          text(cell, al === 'right' ? cx + colW[i] - 2 : cx + 2.5, yy + 3.6, {
            size: 8,
            bold: i === 0 ? false : i === 1,
            color: i === 0 ? INK : INK,
            align: al,
            maxWidth: colW[i] - 4,
          });
        } else {
          badge(cell, al === 'right' ? cx + colW[i] - 2 : cx + 2.5, yy + 3.6, al);
        }
        cx += colW[i];
      });
      yy += rowH;
    });
    doc.setDrawColor(LINE[0], LINE[1], LINE[2]);
    doc.setLineWidth(0.2);
    doc.line(x, yy - 0.6, x + width, yy - 0.6);
    return yy;
  };

  const tiles = (items: { label: string; value: string; unit?: string; badge?: Badge }[]) => {
    ensure(22);
    const gap = 3;
    const w = (CONTENT_W - gap * (items.length - 1)) / items.length;
    items.forEach((it, i) => {
      const x = MARGIN + i * (w + gap);
      doc.setFillColor(255, 255, 255);
      doc.setDrawColor(LINE[0], LINE[1], LINE[2]);
      doc.setLineWidth(0.3);
      doc.roundedRect(x, y, w, 19, 2.5, 2.5, 'FD');
      doc.setFillColor(brand[0], brand[1], brand[2]);
      doc.roundedRect(x, y, 1.6, 19, 0.8, 0.8, 'F');
      text(it.label.toUpperCase(), x + 5, y + 5, { size: 6.5, bold: true, color: MUTED, maxWidth: w - 7 });
      text(it.value, x + 5, y + 12.5, { size: 14, bold: true, color: INK });
      if (it.unit) {
        const vw = (doc.setFontSize(14), doc.setFont('helvetica', 'bold'), doc.getTextWidth(it.value));
        text(it.unit, x + 5 + vw + 1, y + 12.5, { size: 7.5, color: MUTED });
      }
      if (it.badge) badge(it.badge, x + 5, y + 16.8);
    });
    y += 24;
  };

  // ---------- portada / paciente ----------
  drawPageChrome();

  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(LINE[0], LINE[1], LINE[2]);
  doc.roundedRect(MARGIN, y, CONTENT_W, 27, 3, 3, 'FD');
  text('PACIENTE', MARGIN + 5, y + 6, { size: 6.5, bold: true, color: MUTED });
  text(patientName, MARGIN + 5, y + 13, { size: 15, bold: true, color: INK });
  const fields: [string, string][] = [
    ['Documento', patient.identifier_number || '-'],
    ['Edad', calcAge(patient.birth_date)],
    ['Sexo', female ? 'Femenino' : String(patient.gender || '').toLowerCase() === 'other' ? 'Otro' : 'Masculino'],
    ['Contacto', patient.telecom_phone || patient.telecom_email || '-'],
  ];
  const fw = (CONTENT_W - 10) / fields.length;
  fields.forEach(([k, v], i) => {
    text(k.toUpperCase(), MARGIN + 5 + i * fw, y + 19, { size: 6, bold: true, color: MUTED });
    text(v, MARGIN + 5 + i * fw, y + 23.4, { size: 8.5, bold: true, color: INK, maxWidth: fw - 3 });
  });
  y += 33;

  // resumen ejecutivo
  const totals = plan ? planTotals(plan) : null;
  const wRef = withings ?? isak;
  const bmi = Number(wRef?.bmi) || 0;
  const fatPct = Number(withings?.body_fat_percentage) || Number(isak?.body_fat_percentage) || 0;
  tiles([
    { label: 'Peso', value: num(wRef?.weight_kg), unit: 'kg' },
    { label: 'IMC', value: num(bmi), badge: bmiBadge(bmi) },
    { label: '% Grasa corporal', value: num(fatPct), unit: '%', badge: fatPctBadge(fatPct, female) },
    {
      label: 'Meta calórica',
      value: num(plan?.caloric_target_kcal || totals?.kcal, 0),
      unit: 'kcal',
    },
  ]);

  // ================= 1. ISAK =================
  sectionTitle(
    '1',
    'Antropometría Clínica · Protocolo ISAK',
    isak ? `Evaluación del ${fmtDate(isak.evaluation_date)}` : undefined,
  );
  if (!isak) {
    emptyBox('Sin evaluación antropométrica ISAK registrada para este paciente.');
  } else {
    const metaBits = [
      ['Evaluador', isak.evaluator_name || nutritionistName],
      ['Certificación', isak.evaluator_certification || '-'],
      ['Ecuación', EQUATION_LABELS[isak.isak_equation ?? ''] ?? isak.isak_equation ?? '-'],
      ['Evaluación N°', isak.evaluation_number || '-'],
    ];
    const mw = CONTENT_W / metaBits.length;
    metaBits.forEach(([k, v], i) => {
      text(k.toUpperCase(), MARGIN + i * mw, y + 2, { size: 6, bold: true, color: MUTED });
      text(v, MARGIN + i * mw, y + 6.4, { size: 8.5, bold: true, maxWidth: mw - 3 });
    });
    y += 11;

    const colW = (CONTENT_W - 6) / 2;
    const leftX = MARGIN;
    const rightX = MARGIN + colW + 6;

    ensure(70);
    const top = y;
    subTitle('Pliegues cutáneos', leftX, colW);
    y = top + 7;
    const skinfolds: [string, unknown][] = [
      ['Tríceps', isak.skinfold_triceps_mm],
      ['Subescapular', isak.skinfold_subscapular_mm],
      ['Bíceps', isak.skinfold_biceps_mm],
      ['Cresta ilíaca', isak.skinfold_iliac_crest_mm],
      ['Supraespinal', isak.skinfold_suprailiac_mm],
      ['Abdominal', isak.skinfold_abdominal_mm],
      ['Pecho', isak.skinfold_chest_mm],
      ['Muslo anterior', isak.skinfold_thigh_mm],
      ['Pierna medial', isak.skinfold_calf_mm],
    ];
    const leftEnd = table(
      leftX,
      colW,
      ['Sitio', 'mm'],
      [3, 1.4],
      skinfolds.map(([k, v]) => [k, num(v)]),
    );
    const sumSf = skinfolds.reduce((s, [, v]) => s + (Number(v) || 0), 0);
    text(`Suma pliegues: ${num(sumSf)} mm`, leftX + colW, leftEnd + 3.2, { size: 7.5, bold: true, color: brand, align: 'right' });

    y = top;
    subTitle('Perímetros', rightX, colW);
    y = top + 7;
    const perimeters: [string, unknown][] = [
      ['Brazo relajado', isak.relaxed_arm_cm],
      ['Brazo contraído', isak.contracted_arm_cm],
      ['Cintura', isak.waist_cm],
      ['Cadera', isak.hip_cm],
      ['Muslo', isak.thigh_cm],
      ['Pierna', isak.calf_cm],
      ['Cuello', isak.neck_cm],
    ];
    const rightMid = table(
      rightX,
      colW,
      ['Perímetro', 'cm'],
      [3, 1.4],
      perimeters.map(([k, v]) => [k, num(v)]),
    );
    y = rightMid + 4;
    // diámetros óseos bajo perímetros
    subTitle('Diámetros óseos', rightX, colW);
    y += 7;
    const diamEnd = table(
      rightX,
      colW,
      ['Diámetro', 'cm'],
      [3, 1.4],
      [
        ['Biacromial', num(isak.diameter_biacromial_cm)],
        ['Húmero (biepicondilar)', num(isak.diameter_humerus_cm)],
        ['Fémur (biepicondilar)', num(isak.diameter_femur_cm)],
      ],
    );
    y = Math.max(leftEnd + 7, diamEnd) + 5;

    // índices y composición
    ensure(48);
    subTitle('Composición e índices derivados');
    y += 7;
    const whtr = Number(isak.waist_height_ratio) || 0;
    const whr = Number(isak.waist_hip_ratio) || 0;
    y =
      table(
        MARGIN,
        CONTENT_W,
        ['Indicador', 'Valor', 'Interpretación'],
        [3, 1.4, 2.2],
        [
          ['Índice de masa corporal', num(isak.bmi), bmiBadge(Number(isak.bmi) || 0)],
          ['% Grasa corporal', `${num(isak.body_fat_percentage)} %`, fatPctBadge(Number(isak.body_fat_percentage) || 0, female)],
          ['Masa grasa', `${num(isak.fat_mass_kg)} kg`, { label: isak.fat_status || 'Sin dato', tone: 'neutral' }],
          ['Masa libre de grasa', `${num(isak.fat_free_mass_kg)} kg`, { label: 'Referencia', tone: 'neutral' }],
          ['Relación cintura/cadera', num(whr, 2), whrBadge(whr, female)],
          ['Relación cintura/talla', num(whtr, 2), whtrBadge(whtr)],
          ['Relación brazo contraído/relajado', num(isak.arm_ratio, 2), { label: 'Referencia', tone: 'neutral' }],
          ['Tasa metabólica basal (Mifflin-St Jeor)', `${num(isak.bmr_kcal, 0)} kcal`, { label: 'Estimada', tone: 'neutral' }],
        ],
        { rightAlignFrom: 1 },
      ) + 5;

    // somatotipo
    ensure(28);
    subTitle('Somatotipo');
    y += 7;
    const parts: [string, unknown][] = [
      ['Endomorfia', isak.somatotype_endomorphy],
      ['Mesomorfia', isak.somatotype_mesomorphy],
      ['Ectomorfia', isak.somatotype_ectomorphy],
    ];
    const sw = 28;
    parts.forEach(([k, v], i) => {
      const x = MARGIN + i * (sw + 3);
      doc.setFillColor(brandSoft[0], brandSoft[1], brandSoft[2]);
      doc.roundedRect(x, y, sw, 14, 2.5, 2.5, 'F');
      text(k.toUpperCase(), x + sw / 2, y + 4.5, { size: 6, bold: true, color: MUTED, align: 'center' });
      text(num(v), x + sw / 2, y + 11, { size: 12, bold: true, color: brand, align: 'center' });
    });
    const sx = MARGIN + 3 * (sw + 3) + 2;
    text(isak.somatotype_category || 'Sin clasificar', sx, y + 5.5, { size: 10, bold: true });
    if (isak.somatotype_interpretation) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      const lines = doc.splitTextToSize(isak.somatotype_interpretation, PAGE_W - MARGIN - sx) as string[];
      text(lines.slice(0, 3).join('\n'), sx, y + 10, { size: 8, color: MUTED });
    }
    y += 20;

    const notes = [isak.perimeters_interpretation, isak.clinical_notes].filter(Boolean).join('\n');
    if (notes) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      const lines = doc.splitTextToSize(notes, CONTENT_W - 8) as string[];
      const h = lines.length * 3.8 + 8;
      ensure(h + 4);
      doc.setFillColor(SOFT[0], SOFT[1], SOFT[2]);
      doc.roundedRect(MARGIN, y, CONTENT_W, h, 2.5, 2.5, 'F');
      text('OBSERVACIONES CLÍNICAS', MARGIN + 4, y + 5, { size: 6.5, bold: true, color: MUTED });
      text(lines.join('\n'), MARGIN + 4, y + 9.5, { size: 8, color: INK });
      y += h + 6;
    }
  }

  // ================= 2. WITHINGS =================
  sectionTitle(
    '2',
    'Composición Corporal · Withings Body Scan',
    withings ? `Medición del ${fmtDate(withings.evaluation_date)}` : undefined,
  );
  if (!withings) {
    emptyBox('Sin mediciones de la báscula Withings Body Scan para este paciente.');
  } else {
    const w = withings;
    const wFat = Number(w.body_fat_percentage) || Number(w.fat_ratio_percent) || 0;
    const wBmi = Number(w.bmi) || 0;
    const visceral = Number(w.visceral_fat_index) || 0;
    y =
      table(
        MARGIN,
        CONTENT_W,
        ['Indicador', 'Valor', 'Estado'],
        [3, 1.6, 2],
        [
          ['Peso corporal', `${num(w.weight_kg)} kg`, { label: 'Medido', tone: 'neutral' }],
          ['Estatura', `${num(w.height_cm)} cm`, { label: 'Registrada', tone: 'neutral' }],
          ['Índice de masa corporal', num(wBmi), bmiBadge(wBmi)],
          ['% Grasa corporal', `${num(wFat)} %`, fatPctBadge(wFat, female)],
          ['Masa grasa', `${num(w.fat_mass_kg)} kg`, { label: 'Medido', tone: 'neutral' }],
          ['Masa libre de grasa', `${num(w.fat_free_mass_kg)} kg`, { label: 'Calculada', tone: 'neutral' }],
          ['Masa muscular', `${num(w.muscle_mass_kg)} kg`, { label: 'Medido', tone: 'neutral' }],
          ['Agua corporal', `${num(w.hydration_kg)} kg`, { label: 'Medido', tone: 'neutral' }],
          ['Proteína', `${num(w.protein_kg)} kg`, { label: 'Derivada', tone: 'neutral' }],
          ['Masa ósea', `${num(w.bone_mass_kg)} kg`, { label: 'Medido', tone: 'neutral' }],
          ['Grasa visceral', num(visceral, 0), visceralBadge(visceral)],
          ['Frecuencia cardiaca', w.heart_rate_bpm ? `${num(w.heart_rate_bpm, 0)} lpm` : '-', { label: 'Reposo', tone: 'neutral' }],
          ['Tasa metabólica basal', w.bmr_kcal ? `${num(w.bmr_kcal, 0)} kcal` : '-', { label: 'Estimada', tone: 'neutral' }],
        ],
      ) + 5;

    const seg = w.segmental;
    const segRows: [string, { muscleKg: number; fatKg: number; fatPct?: number } | undefined][] = [
      ['Brazo izquierdo', seg?.brazoIzq],
      ['Brazo derecho', seg?.brazoDer],
      ['Tronco', seg?.tronco],
      ['Pierna izquierda', seg?.piernaIzq],
      ['Pierna derecha', seg?.piernaDer],
    ];
    if (segRows.some(([, v]) => v && (v.muscleKg > 0 || v.fatKg > 0))) {
      ensure(48);
      subTitle('Composición segmental');
      y += 7;
      y =
        table(
          MARGIN,
          CONTENT_W,
          ['Segmento', 'Músculo (kg)', 'Grasa (kg)', 'Grasa (%)'],
          [3, 1.5, 1.5, 1.5],
          segRows.map(([k, v]) => [k, num(v?.muscleKg), num(v?.fatKg), v?.fatPct ? num(v.fatPct) : '-']),
        ) + 5;
    }
    if (w.clinical_notes) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      const lines = doc.splitTextToSize(w.clinical_notes, CONTENT_W - 8) as string[];
      const h = lines.length * 3.8 + 8;
      ensure(h + 4);
      doc.setFillColor(SOFT[0], SOFT[1], SOFT[2]);
      doc.roundedRect(MARGIN, y, CONTENT_W, h, 2.5, 2.5, 'F');
      text('NOTAS DE LA MEDICIÓN', MARGIN + 4, y + 5, { size: 6.5, bold: true, color: MUTED });
      text(lines.join('\n'), MARGIN + 4, y + 9.5, { size: 8 });
      y += h + 6;
    }
  }

  // ================= 3. PLAN DIETÉTICO =================
  ensure(70);
  sectionTitle(
    '3',
    'Planificación Dietética · TCA 2018 Colombia',
    plan ? `Plan del ${fmtDate(plan.created_at)}` : undefined,
  );
  if (!plan) {
    emptyBox('Sin plan dietético activo para este paciente.');
  } else {
    const t = planTotals(plan);
    const targetKcal = Number(plan.caloric_target_kcal) || t.kcal;
    text(plan.plan_name, MARGIN, y + 2, { size: 10.5, bold: true });
    if (plan.objective) text(`Objetivo: ${plan.objective}`, MARGIN, y + 7.5, { size: 8.5, color: MUTED });
    badge({ label: 'PLAN ACTIVO', tone: 'ok' }, PAGE_W - MARGIN, y + 2, 'right');
    y += 12;

    tiles([
      { label: 'TMB', value: num(plan.bmr_kcal, 0), unit: 'kcal' },
      { label: 'Gasto energético total', value: num(plan.tdee_kcal, 0), unit: 'kcal' },
      { label: 'Meta calórica', value: num(targetKcal, 0), unit: 'kcal' },
      { label: 'Planificado', value: num(t.kcal, 0), unit: 'kcal' },
    ]);

    // macros
    const mt = plan.macros_target;
    const prot = Number(mt?.protein_grams) || t.protein;
    const carb = Number(mt?.carbs_grams) || t.carbs;
    const fat = Number(mt?.fats_grams) || t.fats;
    const kP = prot * 4;
    const kC = carb * 4;
    const kF = fat * 9;
    const kT = kP + kC + kF || 1;
    subTitle('Distribución de macronutrientes');
    y += 7;
    const barY = y;
    const segs: { v: number; c: RGB }[] = [
      { v: kP / kT, c: [59, 130, 246] },
      { v: kC / kT, c: [245, 158, 11] },
      { v: kF / kT, c: [249, 115, 22] },
    ];
    let bx = MARGIN;
    segs.forEach((s) => {
      const bw = CONTENT_W * s.v;
      if (bw > 0) {
        doc.setFillColor(s.c[0], s.c[1], s.c[2]);
        doc.rect(bx, barY, bw, 4.5, 'F');
        bx += bw;
      }
    });
    y += 8;
    y =
      table(
        MARGIN,
        CONTENT_W,
        ['Macronutriente', 'Gramos', '% del aporte', 'kcal'],
        [3, 1.5, 1.5, 1.5],
        [
          ['Proteínas', `${num(prot)} g`, `${Math.round((kP / kT) * 100)} %`, num(kP, 0)],
          ['Carbohidratos', `${num(carb)} g`, `${Math.round((kC / kT) * 100)} %`, num(kC, 0)],
          ['Grasas', `${num(fat)} g`, `${Math.round((kF / kT) * 100)} %`, num(kF, 0)],
        ],
      ) + 5;

    // requerimientos adicionales
    const extras: [string, string][] = [];
    if (plan.hydration_target_liters) extras.push(['Hidratación', `${num(plan.hydration_target_liters)} L/día`]);
    if (mt?.fiber_grams_target) extras.push(['Fibra', `${num(mt.fiber_grams_target)} g`]);
    if (mt?.sodium_mg_max || plan.micronutrient_targets?.sodium_mg)
      extras.push(['Sodio máx.', `${num(mt?.sodium_mg_max || plan.micronutrient_targets?.sodium_mg, 0)} mg`]);
    if (plan.micronutrient_targets?.calcium_mg)
      extras.push(['Calcio', `${num(plan.micronutrient_targets.calcium_mg, 0)} mg`]);
    if (plan.micronutrient_targets?.iron_mg) extras.push(['Hierro', `${num(plan.micronutrient_targets.iron_mg, 0)} mg`]);
    if (plan.daily_cost_cop) extras.push(['Costo diario est.', `$${Math.round(plan.daily_cost_cop).toLocaleString('es-CO')} COP`]);
    if (extras.length > 0) {
      ensure(14);
      const ew = CONTENT_W / extras.length;
      extras.forEach(([k, v], i) => {
        const x = MARGIN + i * ew;
        text(k.toUpperCase(), x, y + 2, { size: 6, bold: true, color: MUTED });
        text(v, x, y + 6.6, { size: 8.5, bold: true, maxWidth: ew - 2 });
      });
      y += 12;
    }

    // menú
    subTitle('Menú diario asignado');
    y += 8;
    (plan.meals ?? []).forEach((meal) => {
      // Mantiene cabecera y tabla de la comida juntas cuando caben en una página.
      ensure(Math.min(9 + 7 + 6.2 * (meal.items?.length ?? 1) + 4, BODY_BOTTOM - BODY_TOP));
      doc.setFillColor(brandSoft[0], brandSoft[1], brandSoft[2]);
      doc.roundedRect(MARGIN, y, CONTENT_W, 7, 2, 2, 'F');
      text(meal.name, MARGIN + 3, y + 4.8, { size: 9, bold: true, color: brand });
      if (meal.time_suggestion) text(meal.time_suggestion, MARGIN + 3 + 42, y + 4.8, { size: 8, color: MUTED });
      text(
        `${Math.round(meal.total_calories || 0)} kcal  ·  P ${num(meal.total_protein)} g  ·  C ${num(meal.total_carbs)} g  ·  G ${num(meal.total_fats)} g`,
        PAGE_W - MARGIN - 3,
        y + 4.8,
        { size: 7.5, bold: true, color: INK, align: 'right' },
      );
      y += 9;
      if (!meal.items || meal.items.length === 0) {
        text('Sin alimentos asignados.', MARGIN + 3, y + 3, { size: 8, color: MUTED });
        y += 7;
      } else {
        y =
          table(
            MARGIN,
            CONTENT_W,
            ['Alimento', 'Cantidad', 'kcal', 'Prot (g)', 'CHO (g)', 'Grasa (g)'],
            [4.2, 1.5, 1.1, 1.2, 1.2, 1.3],
            meal.items.map((it) => [
              it.name,
              `${num(it.portion_size, 0)} ${it.unit}`,
              num(it.calories_kcal, 0),
              num(it.protein_g),
              num(it.carbs_g),
              num(it.fats_g),
            ]),
          ) + 2;
      }
      if (meal.clinical_tip) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.5);
        const lines = doc.splitTextToSize(`Nota clínica: ${meal.clinical_tip}`, CONTENT_W - 6) as string[];
        ensure(lines.length * 3.6 + 2);
        text(lines.join('\n'), MARGIN + 3, y + 3, { size: 7.5, color: MUTED });
        y += lines.length * 3.6 + 2;
      }
      y += 4;
    });

    const indications = [plan.notes_and_recommendations, ...(plan.clinical_restrictions ?? []).map((r) => `Restricción: ${r}`)]
      .filter(Boolean)
      .join('\n');
    if (indications) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      const lines = doc.splitTextToSize(indications, CONTENT_W - 8) as string[];
      const h = lines.length * 4 + 9;
      ensure(h + 4);
      doc.setFillColor(brandSoft[0], brandSoft[1], brandSoft[2]);
      doc.roundedRect(MARGIN, y, CONTENT_W, h, 2.5, 2.5, 'F');
      text('INDICACIONES Y RECOMENDACIONES', MARGIN + 4, y + 5.2, { size: 6.5, bold: true, color: brand });
      text(lines.join('\n'), MARGIN + 4, y + 10, { size: 8.5, color: INK });
      y += h + 6;
    }
  }

  // ---------- firma ----------
  ensure(26);
  y += 6;
  doc.setDrawColor(MUTED[0], MUTED[1], MUTED[2]);
  doc.setLineWidth(0.3);
  doc.line(PAGE_W - MARGIN - 62, y + 10, PAGE_W - MARGIN, y + 10);
  text(nutritionistName, PAGE_W - MARGIN - 31, y + 14.5, { size: 9, bold: true, align: 'center' });
  text('Profesional tratante', PAGE_W - MARGIN - 31, y + 18.5, { size: 7, color: MUTED, align: 'center' });

  // ---------- pie en todas las páginas ----------
  const pages = doc.getNumberOfPages();
  for (let p = 1; p <= pages; p += 1) {
    doc.setPage(p);
    doc.setDrawColor(LINE[0], LINE[1], LINE[2]);
    doc.setLineWidth(0.3);
    doc.line(MARGIN, PAGE_H - 14, PAGE_W - MARGIN, PAGE_H - 14);
    const contact = [clinicAddress, clinicPhone, clinicEmail].filter(Boolean).join('  ·  ');
    text(contact || clinicName, MARGIN, PAGE_H - 9, { size: 6.5, color: MUTED, maxWidth: 140 });
    text('Documento clínico confidencial. Uso exclusivo del paciente y su equipo tratante.', MARGIN, PAGE_H - 5.5, {
      size: 6,
      color: MUTED,
    });
    text(`Página ${p} de ${pages}`, PAGE_W - MARGIN, PAGE_H - 9, { size: 7, bold: true, color: brand, align: 'right' });
  }

  return doc;
}

export async function downloadNutritionReportPdf(options: GenerateNutritionReportPdfOptions): Promise<void> {
  const doc = await generateNutritionReportPdf(options);
  const last = options.patient.last_name?.replace(/\s+/g, '_') || 'Paciente';
  doc.save(`Informe_Nutricional_${last}_${new Date().toISOString().split('T')[0]}.pdf`);
}

export async function getNutritionReportPdfBlob(options: GenerateNutritionReportPdfOptions): Promise<Blob> {
  return (await generateNutritionReportPdf(options)).output('blob');
}

export async function getNutritionReportPdfBase64(options: GenerateNutritionReportPdfOptions): Promise<string> {
  const output = (await generateNutritionReportPdf(options)).output('datauristring');
  const parts = output.split(',');
  return parts.length > 1 ? parts[1] : output;
}

export async function getNutritionReportPdfDataUrl(options: GenerateNutritionReportPdfOptions): Promise<string> {
  return (await generateNutritionReportPdf(options)).output('datauristring');
}
