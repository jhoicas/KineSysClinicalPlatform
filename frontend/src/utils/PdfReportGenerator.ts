/**
 * PdfReportGenerator — Fase 5.1 (PLAN_NUTRICION)
 *
 * Reporte clínico unificado (agnóstico Manual / Withings / InBody) con jsPDF:
 *  A) Diagnóstico corporal
 *  B) Plan de nutrición (minuta por comidas)
 *  C) Lista de mercado inteligente (GroceryListService)
 */

import jsPDF from 'jspdf';
import {
  generateSmartGroceryList,
  GroceryPlanItem,
  SmartGroceryList,
} from '../services/nutrition/GroceryListService';

export type ReportSource = 'MANUAL_ISAK' | 'WITHINGS' | 'INBODY' | string;

export interface SegmentalReportValues {
  right_arm?: number | null;
  left_arm?: number | null;
  trunk?: number | null;
  right_leg?: number | null;
  left_leg?: number | null;
}

export interface BodyDiagnosisSection {
  source: ReportSource;
  evaluation_date?: string;
  weight_kg?: number | null;
  height_cm?: number | null;
  body_fat_pct?: number | null;
  visceral_fat_index?: number | null;
  bmr?: number | null;
  somatotype?: {
    endomorphy?: number | null;
    mesomorphy?: number | null;
    ectomorphy?: number | null;
    label?: string | null;
  } | null;
  segmental?: {
    fat?: SegmentalReportValues | null;
    muscle?: SegmentalReportValues | null;
  } | null;
}

export interface NutritionMealLine {
  name: string;
  portion_g: number;
  energy_kcal?: number | null;
  protein_g?: number | null;
  carbs_g?: number | null;
  lipids_g?: number | null;
}

export interface NutritionMealSection {
  name: string;
  items: NutritionMealLine[];
}

export interface NutritionPlanSection {
  plan_name: string;
  target_kcal?: number | null;
  total_kcal?: number | null;
  meals: NutritionMealSection[];
}

export interface PatientReportIdentity {
  full_name: string;
  document?: string;
  birth_date?: string;
  sex?: string;
}

export interface ClinicReportBranding {
  clinic_name?: string;
  clinic_address?: string;
  clinic_phone?: string;
  clinic_email?: string;
  professional_name?: string;
  professional_license?: string;
  primary_color_hex?: string;
}

export interface UnifiedNutritionReportInput {
  patient: PatientReportIdentity;
  clinic?: ClinicReportBranding;
  diagnosis: BodyDiagnosisSection;
  nutritionPlan: NutritionPlanSection;
  /**
   * Ítems de UN día para construir la canasta de `groceryDays` días.
   * Si se omite `groceryList`, se calcula aquí.
   */
  dailyGroceryItems?: GroceryPlanItem[];
  groceryDays?: number;
  groceryList?: SmartGroceryList;
  folio?: string;
}

function hexToRgb(hex?: string): [number, number, number] {
  if (!hex) return [0, 72, 112];
  const h = hex.replace('#', '').trim();
  const full =
    h.length === 3
      ? h
          .split('')
          .map((c) => c + c)
          .join('')
      : h;
  if (full.length !== 6) return [0, 72, 112];
  const n = Number.parseInt(full, 16);
  if (!Number.isFinite(n)) return [0, 72, 112];
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function fmt(n: number | null | undefined, digits = 1, suffix = ''): string {
  if (n == null || !Number.isFinite(n)) return '—';
  return `${n.toFixed(digits)}${suffix}`;
}

function sourceLabel(source: ReportSource): string {
  switch (source) {
    case 'MANUAL_ISAK':
      return 'Manual ISAK';
    case 'WITHINGS':
      return 'Withings';
    case 'INBODY':
      return 'InBody';
    default:
      return String(source);
  }
}

function ensureSpace(doc: jsPDF, y: number, needed: number, margin: number, pageHeight: number): number {
  if (y + needed < pageHeight - margin) return y;
  doc.addPage();
  return margin;
}

function sectionTitle(doc: jsPDF, title: string, y: number, margin: number, primary: [number, number, number]): number {
  doc.setFillColor(primary[0], primary[1], primary[2]);
  doc.roundedRect(margin, y, 210 - margin * 2, 8, 1.5, 1.5, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text(title.toUpperCase(), margin + 3, y + 5.4);
  return y + 12;
}

/**
 * Genera el PDF unificado de nutrición clínica.
 * Retorna la instancia jsPDF (caller puede `.save()` o `.output('blob')`).
 */
export function generateUnifiedNutritionReportPdf(input: UnifiedNutritionReportInput): jsPDF {
  const {
    patient,
    clinic = {},
    diagnosis,
    nutritionPlan,
    dailyGroceryItems = [],
    groceryDays = 7,
    folio,
  } = input;

  const grocery =
    input.groceryList ??
    generateSmartGroceryList(dailyGroceryItems, groceryDays);

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 14;
  const contentWidth = pageWidth - margin * 2;
  const primary = hexToRgb(clinic.primary_color_hex);
  const slate: [number, number, number] = [30, 41, 59];
  const muted: [number, number, number] = [100, 116, 139];
  const surface: [number, number, number] = [248, 250, 252];
  const border: [number, number, number] = [226, 232, 240];
  const emerald: [number, number, number] = [5, 150, 105];

  let y = 12;

  // ── Header ──────────────────────────────────────────────────────────────
  doc.setFillColor(primary[0], primary[1], primary[2]);
  doc.roundedRect(margin, y, contentWidth, 24, 3, 3, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text(clinic.clinic_name || 'KineSys · Nutrición Clínica', margin + 5, y + 9);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(220, 235, 250);
  const contact = [clinic.clinic_address, clinic.clinic_phone, clinic.clinic_email]
    .filter(Boolean)
    .join(' · ');
  doc.text(contact || 'Reporte unificado multi-hardware (ISAK / Withings / InBody)', margin + 5, y + 15);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(255, 255, 255);
  const folioText = folio || `NUT-${Date.now().toString().slice(-6)}`;
  doc.text(`Folio ${folioText}`, pageWidth - margin - 5, y + 9, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.text(new Date().toLocaleDateString('es-CO'), pageWidth - margin - 5, y + 15, { align: 'right' });
  y += 30;

  // ── Patient card ────────────────────────────────────────────────────────
  doc.setFillColor(surface[0], surface[1], surface[2]);
  doc.setDrawColor(border[0], border[1], border[2]);
  doc.roundedRect(margin, y, contentWidth, 18, 2, 2, 'FD');
  doc.setTextColor(primary[0], primary[1], primary[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('PACIENTE', margin + 4, y + 5.5);
  doc.setTextColor(slate[0], slate[1], slate[2]);
  doc.setFontSize(11);
  doc.text(patient.full_name, margin + 4, y + 11);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(muted[0], muted[1], muted[2]);
  doc.text(
    [
      patient.document ? `Doc: ${patient.document}` : null,
      patient.birth_date ? `Nac: ${patient.birth_date}` : null,
      patient.sex ? `Sexo: ${patient.sex}` : null,
      `Origen datos: ${sourceLabel(diagnosis.source)}`,
    ]
      .filter(Boolean)
      .join('  |  '),
    margin + 4,
    y + 15.5
  );
  y += 24;

  // ═══════════════════════════════════════════════════════════════════════
  // A) Diagnóstico corporal
  // ═══════════════════════════════════════════════════════════════════════
  y = sectionTitle(doc, 'A · Diagnóstico corporal', y, margin, primary);

  const kpis: { label: string; value: string }[] = [
    { label: '% Grasa', value: fmt(diagnosis.body_fat_pct, 1, '%') },
    { label: 'TMB', value: diagnosis.bmr != null ? `${fmt(diagnosis.bmr, 0)} kcal` : '—' },
    { label: 'Peso', value: diagnosis.weight_kg != null ? `${fmt(diagnosis.weight_kg, 1)} kg` : '—' },
    { label: 'Grasa visceral', value: fmt(diagnosis.visceral_fat_index, 1) },
  ];
  const boxW = (contentWidth - 9) / 4;
  kpis.forEach((kpi, i) => {
    const x = margin + i * (boxW + 3);
    doc.setFillColor(surface[0], surface[1], surface[2]);
    doc.setDrawColor(border[0], border[1], border[2]);
    doc.roundedRect(x, y, boxW, 16, 2, 2, 'FD');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(muted[0], muted[1], muted[2]);
    doc.text(kpi.label.toUpperCase(), x + 2.5, y + 5);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(slate[0], slate[1], slate[2]);
    doc.text(kpi.value, x + 2.5, y + 12);
  });
  y += 20;

  const soma = diagnosis.somatotype;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(primary[0], primary[1], primary[2]);
  doc.text('Somatotipo (Heath-Carter)', margin, y);
  y += 5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(slate[0], slate[1], slate[2]);
  if (soma && (soma.endomorphy != null || soma.label)) {
    doc.text(
      `Endo ${fmt(soma.endomorphy, 1)}  ·  Meso ${fmt(soma.mesomorphy, 1)}  ·  Ecto ${fmt(soma.ectomorphy, 1)}` +
        (soma.label ? `  →  ${soma.label}` : ''),
      margin,
      y
    );
  } else {
    doc.setTextColor(muted[0], muted[1], muted[2]);
    doc.text(
      diagnosis.source === 'MANUAL_ISAK'
        ? 'Somatotipo no calculado en esta evaluación.'
        : 'Hardware: somatotipo no aplica; se reporta composición del dispositivo.',
      margin,
      y
    );
  }
  y += 8;

  const seg = diagnosis.segmental;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(primary[0], primary[1], primary[2]);
  doc.text('Composición segmental (kg)', margin, y);
  y += 4;

  const regions: { key: keyof SegmentalReportValues; label: string }[] = [
    { key: 'right_arm', label: 'Brazo D' },
    { key: 'left_arm', label: 'Brazo I' },
    { key: 'trunk', label: 'Tronco' },
    { key: 'right_leg', label: 'Pierna D' },
    { key: 'left_leg', label: 'Pierna I' },
  ];

  doc.setFillColor(surface[0], surface[1], surface[2]);
  doc.setDrawColor(border[0], border[1], border[2]);
  doc.roundedRect(margin, y, contentWidth, 22, 2, 2, 'FD');
  doc.setFontSize(7);
  doc.setTextColor(muted[0], muted[1], muted[2]);
  doc.text('Región', margin + 3, y + 5);
  doc.text('Grasa', margin + 55, y + 5);
  doc.text('Músculo', margin + 95, y + 5);
  let rowY = y + 9;
  doc.setTextColor(slate[0], slate[1], slate[2]);
  regions.forEach((r) => {
    doc.setFont('helvetica', 'normal');
    doc.text(r.label, margin + 3, rowY);
    doc.text(fmt(seg?.fat?.[r.key] ?? null, 2), margin + 55, rowY);
    doc.text(fmt(seg?.muscle?.[r.key] ?? null, 2), margin + 95, rowY);
    rowY += 2.6;
  });
  y += 28;

  // ═══════════════════════════════════════════════════════════════════════
  // B) Plan de nutrición
  // ═══════════════════════════════════════════════════════════════════════
  y = ensureSpace(doc, y, 40, margin, pageHeight);
  y = sectionTitle(doc, 'B · Plan de nutrición', y, margin, primary);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(slate[0], slate[1], slate[2]);
  doc.text(nutritionPlan.plan_name, margin, y);
  y += 5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(muted[0], muted[1], muted[2]);
  doc.text(
    `Objetivo ${fmt(nutritionPlan.target_kcal, 0)} kcal  ·  Plan ${fmt(nutritionPlan.total_kcal, 0)} kcal`,
    margin,
    y
  );
  y += 7;

  for (const meal of nutritionPlan.meals) {
    y = ensureSpace(doc, y, 18 + meal.items.length * 5, margin, pageHeight);
    doc.setFillColor(primary[0], primary[1], primary[2]);
    doc.roundedRect(margin, y, contentWidth, 6, 1, 1, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text(meal.name.toUpperCase(), margin + 3, y + 4.2);
    const mealKcal = meal.items.reduce((s, it) => s + (it.energy_kcal || 0), 0);
    doc.text(`${mealKcal.toFixed(0)} kcal`, pageWidth - margin - 3, y + 4.2, { align: 'right' });
    y += 8;

    if (meal.items.length === 0) {
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(7.5);
      doc.setTextColor(muted[0], muted[1], muted[2]);
      doc.text('Sin alimentos en este tiempo.', margin + 2, y);
      y += 6;
      continue;
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(muted[0], muted[1], muted[2]);
    doc.text('Alimento', margin + 2, y);
    doc.text('g', margin + 95, y);
    doc.text('kcal', margin + 112, y);
    doc.text('P', margin + 132, y);
    doc.text('CHO', margin + 148, y);
    doc.text('L', margin + 168, y);
    y += 3.5;
    doc.setDrawColor(border[0], border[1], border[2]);
    doc.line(margin, y, pageWidth - margin, y);
    y += 4;

    for (const item of meal.items) {
      y = ensureSpace(doc, y, 6, margin, pageHeight);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(slate[0], slate[1], slate[2]);
      const name = doc.splitTextToSize(item.name, 88);
      doc.text(name[0], margin + 2, y);
      doc.text(fmt(item.portion_g, 0), margin + 95, y);
      doc.text(fmt(item.energy_kcal, 0), margin + 112, y);
      doc.text(fmt(item.protein_g, 1), margin + 132, y);
      doc.text(fmt(item.carbs_g, 1), margin + 148, y);
      doc.text(fmt(item.lipids_g, 1), margin + 168, y);
      y += 5;
    }
    y += 3;
  }

  // ═══════════════════════════════════════════════════════════════════════
  // C) Lista de mercado
  // ═══════════════════════════════════════════════════════════════════════
  y = ensureSpace(doc, y, 50, margin, pageHeight);
  y = sectionTitle(doc, `C · Lista de mercado inteligente (${grocery.days} días)`, y, margin, primary);

  doc.setFillColor(emerald[0], emerald[1], emerald[2]);
  doc.roundedRect(margin, y, contentWidth, 14, 2, 2, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('GRAN TOTAL CANASTA FAMILIAR', margin + 4, y + 5.5);
  doc.setFontSize(14);
  doc.text(
    `$ ${grocery.grand_total.toLocaleString('es-CO', { maximumFractionDigits: 0 })}`,
    pageWidth - margin - 4,
    y + 9,
    { align: 'right' }
  );
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.text(
    `${grocery.item_count} ingredientes · ${grocery.lines_with_price} con precio TCA · ${grocery.lines_missing_price} sin precio`,
    margin + 4,
    y + 11
  );
  y += 18;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(muted[0], muted[1], muted[2]);
  doc.text('Ingrediente', margin + 2, y);
  doc.text('Total g', margin + 88, y);
  doc.text('Unid.', margin + 112, y);
  doc.text('Precio u.', margin + 132, y);
  doc.text('Costo', margin + 168, y);
  y += 3;
  doc.setDrawColor(border[0], border[1], border[2]);
  doc.line(margin, y, pageWidth - margin, y);
  y += 4;

  for (const line of grocery.lines) {
    y = ensureSpace(doc, y, 6, margin, pageHeight);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(slate[0], slate[1], slate[2]);
    const nm = doc.splitTextToSize(line.name, 82);
    doc.text(nm[0], margin + 2, y);
    doc.text(fmt(line.total_grams, 0), margin + 88, y);
    doc.text(line.units_to_buy != null ? String(line.units_to_buy) : '—', margin + 112, y);
    doc.text(
      line.purchase_price != null
        ? `$ ${line.purchase_price.toLocaleString('es-CO', { maximumFractionDigits: 0 })}`
        : '—',
      margin + 132,
      y
    );
    doc.setFont('helvetica', 'bold');
    doc.text(
      line.line_cost != null
        ? `$ ${line.line_cost.toLocaleString('es-CO', { maximumFractionDigits: 0 })}`
        : '—',
      margin + 168,
      y
    );
    y += 5;
  }

  // ── Footer ──────────────────────────────────────────────────────────────
  y = ensureSpace(doc, y, 20, margin, pageHeight);
  y += 6;
  doc.setDrawColor(border[0], border[1], border[2]);
  doc.line(margin, y, pageWidth - margin, y);
  y += 6;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(muted[0], muted[1], muted[2]);
  doc.text(
    `Profesional: ${clinic.professional_name || '—'}  ·  Licencia: ${clinic.professional_license || '—'}`,
    margin,
    y
  );
  y += 4;
  doc.setFontSize(6.5);
  doc.text(
    'Documento generado por KineSys. Los valores de hardware (Withings/InBody) no se recalculan con ecuaciones de pliegues. Precios según TCA 2018.',
    margin,
    y,
    { maxWidth: contentWidth }
  );

  const pages = doc.getNumberOfPages();
  for (let p = 1; p <= pages; p += 1) {
    doc.setPage(p);
    doc.setFontSize(7);
    doc.setTextColor(muted[0], muted[1], muted[2]);
    doc.text(`Página ${p} / ${pages}`, pageWidth / 2, pageHeight - 8, { align: 'center' });
  }

  return doc;
}

/** Descarga el PDF en el navegador. */
export function downloadUnifiedNutritionReport(
  input: UnifiedNutritionReportInput,
  filename?: string
): void {
  const doc = generateUnifiedNutritionReportPdf(input);
  const safeName = (input.patient.full_name || 'paciente').replace(/[^\w\-]+/g, '_');
  doc.save(filename || `KineSys_Nutricion_${safeName}.pdf`);
}

export const PdfReportGenerator = {
  generateUnifiedNutritionReportPdf,
  downloadUnifiedNutritionReport,
} as const;

export default PdfReportGenerator;
