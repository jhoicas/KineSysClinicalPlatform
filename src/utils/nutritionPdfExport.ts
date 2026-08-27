import jsPDF from 'jspdf';
import { PacienteClinico, PlanNutricional, EvaluacionAntropometrica } from '../types';
import { hexToRgb, adjustColorBrightness } from './themeUtils';

export interface GenerateNutritionPlanPdfOptions {
  patient: PacienteClinico;
  plan: PlanNutricional;
  evaluation?: EvaluacionAntropometrica | null;
  nutritionistName?: string;
  nutritionistLicense?: string;
  clinicName?: string;
  clinicAddress?: string;
  clinicPhone?: string;
  clinicEmail?: string;
  clinicLogoBase64?: string;
  primaryColorHex?: string; // e.g. '#004870' or tenant.primary_color
}

/**
 * Dibuja un emblema institucional o logotipo con la paleta dinámica del tenant
 */
function drawBrandedClinicLogo(
  doc: jsPDF,
  x: number,
  y: number,
  size: number = 18,
  primaryRgb: [number, number, number]
) {
  // Base white container
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(x, y, size, size, 3.5, 3.5, 'F');

  const cx = x + size / 2;
  const cy = y + size / 2;
  const half = size / 2;

  // Cross / Leaf geometry using primary brand color
  doc.setFillColor(primaryRgb[0], primaryRgb[1], primaryRgb[2]);
  doc.roundedRect(cx - half * 0.22, cy - half * 0.65, half * 0.44, half * 1.3, 1, 1, 'F');
  doc.roundedRect(cx - half * 0.65, cy - half * 0.22, half * 1.3, half * 0.44, 1, 1, 'F');

  // Emerald center spark
  doc.setFillColor(5, 150, 105); // #059669
  doc.circle(cx, cy, half * 0.25, 'F');

  doc.setFillColor(255, 255, 255);
  doc.circle(cx, cy, half * 0.1, 'F');
}

/**
 * Genera un documento PDF de alta fidelidad estética para el Plan Nutricional,
 * inyectando dinámicamente el color primario, logotipo y datos clínicos del tenant.
 */
export function generateNutritionPlanPdf(options: GenerateNutritionPlanPdfOptions): jsPDF {
  const {
    patient,
    plan,
    evaluation,
    nutritionistName = plan.nutritionist_name || 'Nut. Andrea Soler',
    nutritionistLicense = 'COL-NUT-3199',
    clinicName = 'KineSys Salud - Centro Clínico & Nutricional',
    clinicAddress = 'Av. Medicina Integral 1050, Piso 4',
    clinicPhone = '+56 9 8765 4321',
    clinicEmail = 'contacto@kinesys.health',
    clinicLogoBase64,
    primaryColorHex = '#004870',
  } = options;

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 14;
  const contentWidth = pageWidth - margin * 2; // 182mm

  // Convert tenant primary color to RGB
  const rgbObj = hexToRgb(primaryColorHex) || { r: 0, g: 72, b: 112 };
  const primaryRgb: [number, number, number] = [rgbObj.r, rgbObj.g, rgbObj.b];

  // Secondary & Neutral tones
  const emeraldGreen: [number, number, number] = [5, 150, 105]; // #059669 (Eco Green)
  const darkNeutral: [number, number, number] = [30, 41, 59]; // Slate-800
  const lightNeutral: [number, number, number] = [100, 116, 139]; // Slate-500
  const bgSurface: [number, number, number] = [248, 250, 252]; // Slate-50
  const borderLight: [number, number, number] = [226, 232, 240]; // Slate-200
  const accentAmber: [number, number, number] = [217, 119, 6];

  let y = 12;

  // =========================================================================
  // 1. TOP BRANDED HEADER RIBBON
  // =========================================================================
  doc.setFillColor(primaryRgb[0], primaryRgb[1], primaryRgb[2]);
  doc.roundedRect(margin, y, contentWidth, 26, 3, 3, 'F');

  // Clinic Logo
  const logoX = margin + 5;
  const logoY = y + 4;
  const logoSize = 18;

  if (clinicLogoBase64) {
    try {
      doc.addImage(clinicLogoBase64, 'PNG', logoX, logoY, logoSize, logoSize);
    } catch {
      drawBrandedClinicLogo(doc, logoX, logoY, logoSize, primaryRgb);
    }
  } else {
    drawBrandedClinicLogo(doc, logoX, logoY, logoSize, primaryRgb);
  }

  // Clinic Header Text
  const textStartX = logoX + logoSize + 4;
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text(clinicName.toUpperCase(), textStartX, y + 8);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(220, 235, 250);
  doc.text('DEPARTAMENTO DE NUTRICIÓN CLÍNICA & DIETÉTICA PERSONALIZADA', textStartX, y + 13.5);
  doc.text(`${clinicAddress} • Tel: ${clinicPhone} • ${clinicEmail}`, textStartX, y + 19);

  // Right Header Badge (Plan Info)
  doc.setFillColor(emeraldGreen[0], emeraldGreen[1], emeraldGreen[2]);
  doc.roundedRect(pageWidth - margin - 52, y + 4, 47, 18, 2, 2, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(255, 255, 255);
  doc.text('PLAN NUTRICIONAL', pageWidth - margin - 28.5, y + 10, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  const planDate = new Date().toLocaleDateString('es-ES', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
  doc.text(`Fecha: ${planDate}`, pageWidth - margin - 28.5, y + 15, { align: 'center' });
  doc.text(`Folio: #NUT-${plan.id ? plan.id.slice(-6).toUpperCase() : Date.now().toString().slice(-6)}`, pageWidth - margin - 28.5, y + 19, { align: 'center' });

  y += 30;

  // =========================================================================
  // 2. PATIENT INFORMATION CARD
  // =========================================================================
  doc.setFillColor(bgSurface[0], bgSurface[1], bgSurface[2]);
  doc.setDrawColor(borderLight[0], borderLight[1], borderLight[2]);
  doc.roundedRect(margin, y, contentWidth, 25, 2, 2, 'FD');

  doc.setTextColor(primaryRgb[0], primaryRgb[1], primaryRgb[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text('INFORMACIÓN DEL PACIENTE & EXPEDIENTE CLÍNICO', margin + 4, y + 5.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(darkNeutral[0], darkNeutral[1], darkNeutral[2]);

  const fullName = `${patient.first_name || ''} ${patient.last_name || ''}`.trim() || 'Paciente';
  const idDoc = `${patient.identifier_type || 'ID'}: ${patient.identifier_number || 'N/A'}`;
  const genderStr = patient.gender === 'female' ? 'Femenino' : patient.gender === 'male' ? 'Masculino' : 'Otro';
  const ageStr = evaluation?.age ? `${evaluation.age} años` : '30 años';

  // Line 1
  doc.text('Paciente: ', margin + 4, y + 11);
  doc.setFont('helvetica', 'bold');
  doc.text(fullName, margin + 17, y + 11);
  doc.setFont('helvetica', 'normal');

  doc.text('Identificación: ', margin + 75, y + 11);
  doc.setFont('helvetica', 'bold');
  doc.text(idDoc, margin + 94, y + 11);
  doc.setFont('helvetica', 'normal');

  doc.text('Género/Edad: ', margin + 140, y + 11);
  doc.setFont('helvetica', 'bold');
  doc.text(`${genderStr} / ${ageStr}`, margin + 158, y + 11);
  doc.setFont('helvetica', 'normal');

  // Line 2
  doc.text('Nutricionista: ', margin + 4, y + 17);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(primaryRgb[0], primaryRgb[1], primaryRgb[2]);
  doc.text(nutritionistName, margin + 22, y + 17);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(darkNeutral[0], darkNeutral[1], darkNeutral[2]);

  doc.text('Email Paciente: ', margin + 75, y + 17);
  doc.text(patient.telecom_email || 'No registrado', margin + 95, y + 17);

  doc.text('Teléfono: ', margin + 140, y + 17);
  doc.text(patient.telecom_phone || 'No registrado', margin + 153, y + 17);

  // Line 3: Clinical Alerts / Restrictions
  doc.text('Alergias / Restricciones: ', margin + 4, y + 22.5);
  const allergies = patient.known_allergies?.length
    ? patient.known_allergies.join(', ')
    : 'Sin alergias reportadas';
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(patient.known_allergies?.length ? accentAmber[0] : darkNeutral[0], patient.known_allergies?.length ? accentAmber[1] : darkNeutral[1], patient.known_allergies?.length ? accentAmber[2] : darkNeutral[2]);
  doc.text(allergies.substring(0, 75), margin + 37, y + 22.5);

  y += 29;

  // =========================================================================
  // 3. TARGET METRICS & MACRONUTRIENT BENTO CARDS (4 Columns)
  // =========================================================================
  const cardW = (contentWidth - 9) / 4; // ~43.25mm
  const cardH = 22;

  // Card 1: Caloric Target
  doc.setFillColor(bgSurface[0], bgSurface[1], bgSurface[2]);
  doc.setDrawColor(borderLight[0], borderLight[1], borderLight[2]);
  doc.roundedRect(margin, y, cardW, cardH, 2, 2, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(lightNeutral[0], lightNeutral[1], lightNeutral[2]);
  doc.text('OBJETIVO CALÓRICO', margin + 3, y + 5);
  doc.setFontSize(11.5);
  doc.setTextColor(primaryRgb[0], primaryRgb[1], primaryRgb[2]);
  doc.text(`${plan.caloric_target_kcal}`, margin + 3, y + 12);
  doc.setFontSize(7);
  doc.text('kcal / día', margin + 24, y + 11.5);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(darkNeutral[0], darkNeutral[1], darkNeutral[2]);
  doc.text(plan.plan_type.replace('_', ' ').toUpperCase(), margin + 3, y + 18);

  // Card 2: Proteínas
  const xProt = margin + cardW + 3;
  doc.setFillColor(bgSurface[0], bgSurface[1], bgSurface[2]);
  doc.setDrawColor(borderLight[0], borderLight[1], borderLight[2]);
  doc.roundedRect(xProt, y, cardW, cardH, 2, 2, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(lightNeutral[0], lightNeutral[1], lightNeutral[2]);
  doc.text(`PROTEÍNA (${plan.macros_target.protein_pct}%)`, xProt + 3, y + 5);
  doc.setFontSize(11.5);
  doc.setTextColor(primaryRgb[0], primaryRgb[1], primaryRgb[2]);
  doc.text(`${plan.macros_target.protein_grams} g`, xProt + 3, y + 12);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(darkNeutral[0], darkNeutral[1], darkNeutral[2]);
  const gPerKg = evaluation?.weight_kg ? (plan.macros_target.protein_grams / evaluation.weight_kg).toFixed(1) : '1.6';
  doc.text(`${gPerKg} g / kg peso corporal`, xProt + 3, y + 18);

  // Card 3: Carbohidratos
  const xCarb = margin + (cardW + 3) * 2;
  doc.setFillColor(bgSurface[0], bgSurface[1], bgSurface[2]);
  doc.setDrawColor(borderLight[0], borderLight[1], borderLight[2]);
  doc.roundedRect(xCarb, y, cardW, cardH, 2, 2, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(lightNeutral[0], lightNeutral[1], lightNeutral[2]);
  doc.text(`CARBOHIDRATOS (${plan.macros_target.carbs_pct}%)`, xCarb + 3, y + 5);
  doc.setFontSize(11.5);
  doc.setTextColor(emeraldGreen[0], emeraldGreen[1], emeraldGreen[2]);
  doc.text(`${plan.macros_target.carbs_grams} g`, xCarb + 3, y + 12);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(darkNeutral[0], darkNeutral[1], darkNeutral[2]);
  doc.text('Complejos & ricos en fibra', xCarb + 3, y + 18);

  // Card 4: Grasas & Hidratación
  const xFat = margin + (cardW + 3) * 3;
  doc.setFillColor(bgSurface[0], bgSurface[1], bgSurface[2]);
  doc.setDrawColor(borderLight[0], borderLight[1], borderLight[2]);
  doc.roundedRect(xFat, y, cardW, cardH, 2, 2, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(lightNeutral[0], lightNeutral[1], lightNeutral[2]);
  doc.text(`GRASAS (${plan.macros_target.fats_pct}%)`, xFat + 3, y + 5);
  doc.setFontSize(11.5);
  doc.setTextColor(accentAmber[0], accentAmber[1], accentAmber[2]);
  doc.text(`${plan.macros_target.fats_grams} g`, xFat + 3, y + 12);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(darkNeutral[0], darkNeutral[1], darkNeutral[2]);
  doc.text(`Agua: ${plan.hydration_target_liters || 2.5} L/día`, xFat + 3, y + 18);

  y += 26;

  // =========================================================================
  // 4. MEAL SCHEDULE & DETAILED FOOD MENUS
  // =========================================================================
  doc.setFillColor(primaryRgb[0], primaryRgb[1], primaryRgb[2]);
  doc.roundedRect(margin, y, contentWidth, 7, 1.5, 1.5, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(255, 255, 255);
  doc.text('PAUTA DETALLADA DE TIEMPOS DE COMIDA & PORCIONES', margin + 4, y + 4.8);

  y += 8.5;

  // Render each meal
  plan.meals.forEach((meal, mealIdx) => {
    // Meal Header Bar
    doc.setFillColor(241, 245, 249);
    doc.setDrawColor(borderLight[0], borderLight[1], borderLight[2]);
    doc.roundedRect(margin, y, contentWidth, 6.5, 1, 1, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(primaryRgb[0], primaryRgb[1], primaryRgb[2]);
    doc.text(`${meal.name.toUpperCase()} (${meal.time_suggestion || 'Horario flexible'})`, margin + 3, y + 4.5);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(darkNeutral[0], darkNeutral[1], darkNeutral[2]);
    doc.text(
      `Total: ${meal.total_calories} kcal  |  P: ${meal.total_protein.toFixed(1)}g  |  C: ${meal.total_carbs.toFixed(1)}g  |  G: ${meal.total_fats.toFixed(1)}g  |  Na: ${meal.total_sodium}mg`,
      pageWidth - margin - 3,
      y + 4.5,
      { align: 'right' }
    );

    y += 7.5;

    // Meal Food Items Table
    meal.items.forEach((item, itemIdx) => {
      const isEven = itemIdx % 2 === 0;
      doc.setFillColor(isEven ? bgSurface[0] : 255, isEven ? bgSurface[1] : 255, isEven ? bgSurface[2] : 255);
      doc.rect(margin, y, contentWidth, 5.8, 'F');
      doc.setDrawColor(borderLight[0], borderLight[1], borderLight[2]);
      doc.line(margin, y + 5.8, margin + contentWidth, y + 5.8);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.2);
      doc.setTextColor(darkNeutral[0], darkNeutral[1], darkNeutral[2]);

      // Bullet & item name
      doc.text(`• ${item.name}`, margin + 4, y + 4);

      // Portion size
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(lightNeutral[0], lightNeutral[1], lightNeutral[2]);
      doc.text(`${item.portion_size} ${item.unit}`, margin + 85, y + 4);

      // Calories & Macros breakdown
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(darkNeutral[0], darkNeutral[1], darkNeutral[2]);
      doc.text(
        `${item.calories_kcal} kcal  (P:${item.protein_g}g  C:${item.carbs_g}g  G:${item.fats_g}g)`,
        pageWidth - margin - 4,
        y + 4,
        { align: 'right' }
      );

      y += 5.8;
    });

    y += 3;
  });

  y += 2;

  // =========================================================================
  // 5. CLINICAL RECOMMENDATIONS & COOKING GUIDELINES
  // =========================================================================
  if (y < 235) {
    const recBoxH = Math.min(28, pageHeight - 45 - y);
    doc.setFillColor(bgSurface[0], bgSurface[1], bgSurface[2]);
    doc.setDrawColor(borderLight[0], borderLight[1], borderLight[2]);
    doc.roundedRect(margin, y, contentWidth, recBoxH, 2, 2, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(primaryRgb[0], primaryRgb[1], primaryRgb[2]);
    doc.text('INDICACIONES CLÍNICAS & RECOMENDACIONES DE COCCIÓN', margin + 4, y + 5.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.2);
    doc.setTextColor(darkNeutral[0], darkNeutral[1], darkNeutral[2]);

    const notes =
      plan.notes_and_recommendations ||
      'Preferir cocciones al vapor, plancha u horno. Mantener consumo regular de agua distribuido durante la jornada. Evitar agregar sal de mesa a las preparaciones y priorizar hierbas aromáticas y especias naturales.';

    const splitNotes = doc.splitTextToSize(notes, contentWidth - 8);
    doc.text(splitNotes, margin + 4, y + 11);

    y += recBoxH + 4;
  }

  // =========================================================================
  // 6. SIGNATURES & ECO-FRIENDLY DISCLAIMER
  // =========================================================================
  const footerY = pageHeight - 30;

  // Professional signature line
  doc.setDrawColor(darkNeutral[0], darkNeutral[1], darkNeutral[2]);
  doc.line(margin + 18, footerY + 8, margin + 85, footerY + 8);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(primaryRgb[0], primaryRgb[1], primaryRgb[2]);
  doc.text(nutritionistName, margin + 51.5, footerY + 12, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(lightNeutral[0], lightNeutral[1], lightNeutral[2]);
  doc.text(`Lic. en Nutrición & Dietética • Reg: ${nutritionistLicense}`, margin + 51.5, footerY + 15.5, { align: 'center' });

  // Patient acknowledgment line
  doc.line(pageWidth - margin - 85, footerY + 8, pageWidth - margin - 18, footerY + 8);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(darkNeutral[0], darkNeutral[1], darkNeutral[2]);
  doc.text(fullName, pageWidth - margin - 51.5, footerY + 12, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(lightNeutral[0], lightNeutral[1], lightNeutral[2]);
  doc.text('Firma de Conformidad del Paciente', pageWidth - margin - 51.5, footerY + 15.5, { align: 'center' });

  // Eco-Friendly Green Footer Banner
  doc.setDrawColor(borderLight[0], borderLight[1], borderLight[2]);
  doc.line(margin, pageHeight - 10, pageWidth - margin, pageHeight - 10);
  doc.setFontSize(6);
  doc.setTextColor(emeraldGreen[0], emeraldGreen[1], emeraldGreen[2]);
  doc.setFont('helvetica', 'bold');
  doc.text(
    '🍃 Documento Digital Eco-Friendly • Cero Papel • Generado y emitido por KineSys Clinical Platform',
    margin,
    pageHeight - 6
  );
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(lightNeutral[0], lightNeutral[1], lightNeutral[2]);
  doc.text(`Página 1 de 1`, pageWidth - margin, pageHeight - 6, { align: 'right' });

  return doc;
}

/**
 * Descarga el PDF localmente en el navegador
 */
export function downloadNutritionPlanPdf(options: GenerateNutritionPlanPdfOptions): void {
  const doc = generateNutritionPlanPdf(options);
  const patientLastName = options.patient.last_name?.replace(/\s+/g, '_') || 'Paciente';
  const dateStr = new Date().toISOString().split('T')[0];
  const filename = `Plan_Nutricional_${patientLastName}_${dateStr}.pdf`;
  doc.save(filename);
}

/**
 * Genera y retorna el Blob binario del PDF (application/pdf)
 */
export function getNutritionPlanPdfBlob(options: GenerateNutritionPlanPdfOptions): Blob {
  const doc = generateNutritionPlanPdf(options);
  return doc.output('blob');
}

/**
 * Genera el string Base64 del archivo PDF (para adjuntar en la Edge Function)
 */
export function getNutritionPlanPdfBase64(options: GenerateNutritionPlanPdfOptions): string {
  const doc = generateNutritionPlanPdf(options);
  const output = doc.output('datauristring');
  // Strip the "data:application/pdf;filename=generated.pdf;base64," prefix
  const parts = output.split(',');
  return parts.length > 1 ? parts[1] : output;
}

/**
 * Obtiene el Data URL para previsualización interactiva
 */
export function getNutritionPlanPdfDataUrl(options: GenerateNutritionPlanPdfOptions): string {
  const doc = generateNutritionPlanPdf(options);
  return doc.output('datauristring');
}
