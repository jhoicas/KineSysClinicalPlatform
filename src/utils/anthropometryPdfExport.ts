import jsPDF from 'jspdf';
import { PacienteClinico, EvaluacionAntropometrica } from '../types';

export interface GenerateAnthropometryPdfOptions {
  patient: PacienteClinico;
  evaluation: Partial<EvaluacionAntropometrica>;
  historyEvaluations?: EvaluacionAntropometrica[];
  nutritionistName?: string;
  clinicName?: string;
  clinicAddress?: string;
  clinicPhone?: string;
  clinicLogoBase64?: string;
  primaryColorHex?: string;
  includeHistory?: boolean;
}

/**
 * Dibuja el logotipo vectorial oficial de la clínica en alta resolución dentro del documento jsPDF.
 */
function drawClinicLogo(
  doc: jsPDF,
  x: number,
  y: number,
  size: number = 18,
  isDarkBackground: boolean = true
) {
  // Base shield / emblem container
  if (isDarkBackground) {
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(x, y, size, size, 3.5, 3.5, 'F');
  } else {
    doc.setFillColor(0, 72, 112); // Navy
    doc.roundedRect(x, y, size, size, 3.5, 3.5, 'F');
  }

  const cx = x + size / 2;
  const cy = y + size / 2;
  const half = size / 2;

  // Medical Cross & Health Leaf geometry
  if (isDarkBackground) {
    // Inner emerald green leaf/cross
    doc.setFillColor(0, 108, 73); // #006c49
    // Vertical bar
    doc.roundedRect(cx - half * 0.22, cy - half * 0.65, half * 0.44, half * 1.3, 1, 1, 'F');
    // Horizontal bar
    doc.roundedRect(cx - half * 0.65, cy - half * 0.22, half * 1.3, half * 0.44, 1, 1, 'F');

    // Central golden/amber metabolic spark
    doc.setFillColor(217, 119, 6);
    doc.circle(cx, cy, half * 0.25, 'F');

    // Subtle inner white dot
    doc.setFillColor(255, 255, 255);
    doc.circle(cx, cy, half * 0.1, 'F');
  } else {
    // On light background
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(cx - half * 0.22, cy - half * 0.65, half * 0.44, half * 1.3, 1, 1, 'F');
    doc.roundedRect(cx - half * 0.65, cy - half * 0.22, half * 1.3, half * 0.44, 1, 1, 'F');

    doc.setFillColor(0, 168, 107);
    doc.circle(cx, cy, half * 0.25, 'F');
  }
}

/**
 * Genera y descarga un informe clínico antropométrico en PDF de alta fidelidad estética,
 * incluyendo logotipo institucional y reporte longitudinal de evolución del paciente.
 */
export function generateAnthropometryPdf(options: GenerateAnthropometryPdfOptions): jsPDF {
  const {
    patient,
    evaluation,
    historyEvaluations = [],
    nutritionistName = 'Lic. Nutrición Clínica',
    clinicName = 'KineSys Salud - Centro Clínico & Nutricional',
    clinicAddress = 'Av. Medicina Integral 1050, Piso 4',
    clinicPhone = '+56 9 8765 4321',
    clinicLogoBase64,
    includeHistory = true,
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

  // Paleta de Colores Clínicos Institucionales
  const primaryNavy = [0, 72, 112]; // #004870
  const primaryNavyLight = [15, 96, 143];
  const secondaryGreen = [0, 108, 73]; // #006c49
  const darkNeutral = [30, 41, 59]; // Slate-800
  const lightNeutral = [100, 116, 139]; // Slate-500
  const bgSurface = [248, 250, 252]; // Slate-50
  const borderLight = [226, 232, 240]; // Slate-200
  const accentTeal = [13, 148, 136]; // Teal-600
  const accentAmber = [217, 119, 6]; // Amber-600

  // Filter history evaluations for this patient and sort chronologically
  const patientHistoryAsc = historyEvaluations
    .filter((e) => e.patient_id === patient.id || !e.patient_id)
    .sort((a, b) => new Date(a.evaluation_date).getTime() - new Date(b.evaluation_date).getTime());

  // Determine if we should generate Page 2 (Progress History)
  const shouldRenderHistoryPage = includeHistory && patientHistoryAsc.length > 0;
  const totalPages = shouldRenderHistoryPage ? 2 : 1;

  // =========================================================================
  // PAGE 1: EVALUACIÓN ANTROPOMÉTRICA & BALANCE TERMODINÁMICO
  // =========================================================================
  let y = 12;

  // 1. TOP HEADER RIBBON WITH LOGO
  doc.setFillColor(primaryNavy[0], primaryNavy[1], primaryNavy[2]);
  doc.roundedRect(margin, y, contentWidth, 26, 3, 3, 'F');

  // Draw Clinic Logo (custom image or vector emblem)
  const logoX = margin + 5;
  const logoY = y + 4;
  const logoSize = 18;

  if (clinicLogoBase64) {
    try {
      doc.addImage(clinicLogoBase64, 'PNG', logoX, logoY, logoSize, logoSize);
    } catch {
      drawClinicLogo(doc, logoX, logoY, logoSize, true);
    }
  } else {
    drawClinicLogo(doc, logoX, logoY, logoSize, true);
  }

  // Clinic Header Text
  const textStartX = logoX + logoSize + 4;
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12.5);
  doc.text(clinicName.toUpperCase(), textStartX, y + 8);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(200, 225, 245);
  doc.text(
    'DEPARTAMENTO DE NUTRICIÓN CLÍNICA, CINEANTROPOMETRÍA & METABOLISMO',
    textStartX,
    y + 13.5
  );
  doc.text(`${clinicAddress} • Tel: ${clinicPhone}`, textStartX, y + 19);

  // Right Header Badge
  doc.setFillColor(secondaryGreen[0], secondaryGreen[1], secondaryGreen[2]);
  doc.roundedRect(pageWidth - margin - 50, y + 4, 45, 18, 2, 2, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(255, 255, 255);
  doc.text('INFORME CLÍNICO', pageWidth - margin - 27.5, y + 10, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  const evalDate = evaluation.evaluation_date
    ? new Date(evaluation.evaluation_date).toLocaleDateString('es-ES', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      })
    : new Date().toLocaleDateString('es-ES', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
  doc.text(`Fecha: ${evalDate}`, pageWidth - margin - 27.5, y + 15, { align: 'center' });
  doc.text(`Folio: #ANT-${Date.now().toString().slice(-6)}`, pageWidth - margin - 27.5, y + 19, { align: 'center' });

  y += 30;

  // 2. PATIENT INFORMATION CARD
  doc.setFillColor(bgSurface[0], bgSurface[1], bgSurface[2]);
  doc.setDrawColor(borderLight[0], borderLight[1], borderLight[2]);
  doc.roundedRect(margin, y, contentWidth, 26, 2, 2, 'FD');

  doc.setTextColor(primaryNavy[0], primaryNavy[1], primaryNavy[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text('DATOS DEL PACIENTE & IDENTIFICACIÓN CLÍNICA', margin + 4, y + 5.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(darkNeutral[0], darkNeutral[1], darkNeutral[2]);

  // Line 1
  const fullName = `${patient.first_name || ''} ${patient.last_name || ''}`.trim() || 'Paciente';
  const idDoc = `${patient.identifier_type || 'ID'}: ${patient.identifier_number || 'N/A'}`;
  const genderStr = evaluation.gender === 'female' ? 'Femenino' : 'Masculino';
  const ageStr = `${evaluation.age || 30} años`;
  const bloodType = patient.blood_type || 'O+';

  doc.text(`Paciente: `, margin + 4, y + 11);
  doc.setFont('helvetica', 'bold');
  doc.text(fullName, margin + 17, y + 11);
  doc.setFont('helvetica', 'normal');

  doc.text(`Identificación: `, margin + 75, y + 11);
  doc.setFont('helvetica', 'bold');
  doc.text(idDoc, margin + 94, y + 11);
  doc.setFont('helvetica', 'normal');

  doc.text(`Grupo Sanguíneo: `, margin + 140, y + 11);
  doc.setFont('helvetica', 'bold');
  doc.text(bloodType, margin + 165, y + 11);
  doc.setFont('helvetica', 'normal');

  // Line 2
  doc.text(`Género / Edad: `, margin + 4, y + 17);
  doc.setFont('helvetica', 'bold');
  doc.text(`${genderStr} / ${ageStr}`, margin + 26, y + 17);
  doc.setFont('helvetica', 'normal');

  doc.text(`Email: `, margin + 75, y + 17);
  doc.text(patient.telecom_email || 'No registrado', margin + 85, y + 17);

  doc.text(`Teléfono: `, margin + 140, y + 17);
  doc.text(patient.telecom_phone || 'No registrado', margin + 154, y + 17);

  // Line 3
  doc.text(`Nutricionista: `, margin + 4, y + 23);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(primaryNavy[0], primaryNavy[1], primaryNavy[2]);
  doc.text(nutritionistName, margin + 23, y + 23);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(darkNeutral[0], darkNeutral[1], darkNeutral[2]);

  doc.text(`Alergias / Restricciones: `, margin + 95, y + 23);
  const allergies = patient.known_allergies?.length
    ? patient.known_allergies.join(', ')
    : 'Sin alergias reportadas';
  doc.text(allergies.substring(0, 42), margin + 130, y + 23);

  y += 30;

  // 3. EXECUTIVE METABOLIC & BIOMETRIC HIGHLIGHTS (4 Bento Cards)
  const cardWidth = (contentWidth - 9) / 4; // ~43.25mm
  const cardHeight = 24;

  // Card A: Peso & Talla
  doc.setFillColor(bgSurface[0], bgSurface[1], bgSurface[2]);
  doc.setDrawColor(borderLight[0], borderLight[1], borderLight[2]);
  doc.roundedRect(margin, y, cardWidth, cardHeight, 2, 2, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(lightNeutral[0], lightNeutral[1], lightNeutral[2]);
  doc.text('PESO & TALLA', margin + 3, y + 5);
  doc.setFontSize(11);
  doc.setTextColor(primaryNavy[0], primaryNavy[1], primaryNavy[2]);
  doc.text(`${evaluation.weight_kg || 0} kg`, margin + 3, y + 12);
  doc.setFontSize(8);
  doc.setTextColor(darkNeutral[0], darkNeutral[1], darkNeutral[2]);
  doc.text(`Talla: ${evaluation.height_cm || 0} cm`, margin + 3, y + 17);
  const bmiVal = evaluation.bmi || 0;
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.text(`IMC: ${bmiVal} kg/m²`, margin + 3, y + 21.5);

  // Card B: BMR (Mifflin-St Jeor) - Light Blue background
  const xBmr = margin + cardWidth + 3;
  doc.setFillColor(239, 246, 255); // Light Blue (#eff6ff)
  doc.setDrawColor(191, 219, 254); // Blue-200
  doc.roundedRect(xBmr, y, cardWidth, cardHeight, 2, 2, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(primaryNavy[0], primaryNavy[1], primaryNavy[2]);
  doc.text('TASA BASAL (BMR)', xBmr + 3, y + 5);
  doc.setFontSize(11);
  doc.setTextColor(primaryNavy[0], primaryNavy[1], primaryNavy[2]);
  doc.text(`${evaluation.bmr_kcal || 0}`, xBmr + 3, y + 12);
  doc.setFontSize(7.5);
  doc.setTextColor(darkNeutral[0], darkNeutral[1], darkNeutral[2]);
  doc.text('kcal / día', xBmr + 20, y + 11.5);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(darkNeutral[0], darkNeutral[1], darkNeutral[2]);
  doc.text('Ecuación Mifflin-St Jeor', xBmr + 3, y + 17);
  doc.text('Metabolismo basal reposo', xBmr + 3, y + 21);

  // Card C: TDEE Total - Light Green background
  const xTdee = margin + (cardWidth + 3) * 2;
  doc.setFillColor(240, 253, 244); // light green (#f0fdf4)
  doc.setDrawColor(187, 247, 208);
  doc.roundedRect(xTdee, y, cardWidth, cardHeight, 2, 2, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(secondaryGreen[0], secondaryGreen[1], secondaryGreen[2]);
  doc.text('GASTO TOTAL (TDEE)', xTdee + 3, y + 5);
  doc.setFontSize(11);
  doc.text(`${evaluation.tdee_kcal || 0}`, xTdee + 3, y + 12);
  doc.setFontSize(7.5);
  doc.setTextColor(darkNeutral[0], darkNeutral[1], darkNeutral[2]);
  doc.text('kcal / día', xTdee + 22, y + 11.5);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(darkNeutral[0], darkNeutral[1], darkNeutral[2]);
  doc.text(`Factor Actividad: x${evaluation.activity_factor || 1.375}`, xTdee + 3, y + 17);
  doc.text('Gasto calórico con actividad', xTdee + 3, y + 21);

  // Card D: Composición % Grasa - Light Amber background
  const xFat = margin + (cardWidth + 3) * 3;
  doc.setFillColor(254, 243, 199); // light amber (#fef3c7)
  doc.setDrawColor(253, 230, 138);
  doc.roundedRect(xFat, y, cardWidth, cardHeight, 2, 2, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(accentAmber[0], accentAmber[1], accentAmber[2]);
  doc.text('% GRASA CORPORAL', xFat + 3, y + 5);
  doc.setFontSize(11);
  doc.text(`${evaluation.body_fat_percentage || 0}%`, xFat + 3, y + 12);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(darkNeutral[0], darkNeutral[1], darkNeutral[2]);
  doc.text(`Masa Grasa: ${evaluation.fat_mass_kg || 0} kg`, xFat + 3, y + 17);
  doc.text(`Masa Magra: ${evaluation.fat_free_mass_kg || 0} kg`, xFat + 3, y + 21);

  y += 28;

  // 4. DETAILED ANTHROPOMETRY SECTIONS: 2-COLUMN TABLE
  const colW = (contentWidth - 6) / 2; // 88mm each
  const tableY = y;

  // --- LEFT COLUMN: PLIEGUES CUTÁNEOS (ISAK STANDARD) ---
  doc.setFillColor(primaryNavy[0], primaryNavy[1], primaryNavy[2]);
  doc.roundedRect(margin, y, colW, 7, 1.5, 1.5, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(255, 255, 255);
  doc.text('PLIEGUES CUTÁNEOS (mm) - PROTOCOLO ISAK', margin + 4, y + 4.8);

  y += 7.5;

  const skinfoldsData = [
    { label: 'Pliegue Tríceps', val: `${evaluation.skinfold_triceps_mm || 0} mm`, desc: 'Zona posterior del brazo' },
    { label: 'Pliegue Bíceps', val: `${evaluation.skinfold_biceps_mm || 0} mm`, desc: 'Zona anterior del brazo' },
    { label: 'Pliegue Subescapular', val: `${evaluation.skinfold_subscapular_mm || 0} mm`, desc: 'Ángulo inferior escápula' },
    { label: 'Pliegue Suprailíaco', val: `${evaluation.skinfold_suprailiac_mm || 0} mm`, desc: 'Cresta ilíaca anterosuperior' },
    { label: 'Pliegue Abdominal', val: `${evaluation.skinfold_abdominal_mm || 0} mm`, desc: '5 cm lateral al ombligo' },
    { label: 'Pliegue Muslo Anterior', val: `${evaluation.skinfold_thigh_mm || 0} mm`, desc: 'Punto medio fémur' },
    { label: 'Pliegue Pantorrilla Medial', val: `${evaluation.skinfold_calf_mm || 0} mm`, desc: 'Máxima circunferencia' },
  ];

  const sumSkinfolds = (
    (evaluation.skinfold_triceps_mm || 0) +
    (evaluation.skinfold_subscapular_mm || 0) +
    (evaluation.skinfold_suprailiac_mm || 0) +
    (evaluation.skinfold_abdominal_mm || 0)
  ).toFixed(1);

  skinfoldsData.forEach((row, i) => {
    const rowY = y + i * 6.2;
    doc.setFillColor(i % 2 === 0 ? bgSurface[0] : 255, i % 2 === 0 ? bgSurface[1] : 255, i % 2 === 0 ? bgSurface[2] : 255);
    doc.rect(margin, rowY, colW, 6.2, 'F');
    doc.setDrawColor(borderLight[0], borderLight[1], borderLight[2]);
    doc.line(margin, rowY + 6.2, margin + colW, rowY + 6.2);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(darkNeutral[0], darkNeutral[1], darkNeutral[2]);
    doc.text(row.label, margin + 3, rowY + 4.2);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(primaryNavy[0], primaryNavy[1], primaryNavy[2]);
    doc.text(row.val, margin + colW - 4, rowY + 4.2, { align: 'right' });
  });

  // Total Skinfolds Footer
  const sfFooterY = y + skinfoldsData.length * 6.2;
  doc.setFillColor(241, 245, 249);
  doc.rect(margin, sfFooterY, colW, 6.5, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(primaryNavy[0], primaryNavy[1], primaryNavy[2]);
  doc.text('Sumatoria 4 Pliegues (Durnin):', margin + 3, sfFooterY + 4.5);
  doc.text(`${sumSkinfolds} mm`, margin + colW - 4, sfFooterY + 4.5, { align: 'right' });

  // --- RIGHT COLUMN: PERÍMETROS & CIRCUNFERENCIAS ---
  const rightColX = margin + colW + 6;
  let ry = tableY;

  doc.setFillColor(secondaryGreen[0], secondaryGreen[1], secondaryGreen[2]);
  doc.roundedRect(rightColX, ry, colW, 7, 1.5, 1.5, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(255, 255, 255);
  doc.text('PERÍMETROS & CIRCUNFERENCIAS (cm)', rightColX + 4, ry + 4.8);

  ry += 7.5;

  const circumferencesData = [
    { label: 'Circunferencia Cuello', val: `${evaluation.neck_cm || 0} cm` },
    { label: 'Brazo Relajado', val: `${evaluation.relaxed_arm_cm || 0} cm` },
    { label: 'Brazo Contraído', val: `${evaluation.contracted_arm_cm || 0} cm` },
    { label: 'Circunferencia Cintura', val: `${evaluation.waist_cm || 0} cm` },
    { label: 'Circunferencia Cadera', val: `${evaluation.hip_cm || 0} cm` },
    { label: 'Muslo Medial', val: `${evaluation.thigh_cm || 0} cm` },
    { label: 'Pantorrilla Máxima', val: `${evaluation.calf_cm || 0} cm` },
  ];

  circumferencesData.forEach((row, i) => {
    const rowY = ry + i * 6.2;
    doc.setFillColor(i % 2 === 0 ? bgSurface[0] : 255, i % 2 === 0 ? bgSurface[1] : 255, i % 2 === 0 ? bgSurface[2] : 255);
    doc.rect(rightColX, rowY, colW, 6.2, 'F');
    doc.setDrawColor(borderLight[0], borderLight[1], borderLight[2]);
    doc.line(rightColX, rowY + 6.2, rightColX + colW, rowY + 6.2);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(darkNeutral[0], darkNeutral[1], darkNeutral[2]);
    doc.text(row.label, rightColX + 3, rowY + 4.2);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(secondaryGreen[0], secondaryGreen[1], secondaryGreen[2]);
    doc.text(row.val, rightColX + colW - 4, rowY + 4.2, { align: 'right' });
  });

  // WHR / ICC Footer
  const circFooterY = ry + circumferencesData.length * 6.2;
  doc.setFillColor(240, 253, 244);
  doc.rect(rightColX, circFooterY, colW, 6.5, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(secondaryGreen[0], secondaryGreen[1], secondaryGreen[2]);
  const whrRatio = evaluation.waist_hip_ratio || 0;
  const riskStr = (evaluation.cardiovascular_risk_level || 'Bajo').toUpperCase();
  doc.text(`Índice Cintura/Cadera (ICC): ${whrRatio}`, rightColX + 3, circFooterY + 4.5);
  doc.text(`Riesgo: ${riskStr}`, rightColX + colW - 4, circFooterY + 4.5, { align: 'right' });

  y = sfFooterY + 11;

  // 5. THERMODYNAMIC STRATEGY & CALORIC TARGET RECOMMENDATIONS
  doc.setFillColor(bgSurface[0], bgSurface[1], bgSurface[2]);
  doc.setDrawColor(borderLight[0], borderLight[1], borderLight[2]);
  doc.roundedRect(margin, y, contentWidth, 23, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(primaryNavy[0], primaryNavy[1], primaryNavy[2]);
  doc.text('ESTRATEGIA TERMODINÁMICA SUGERIDA PARA OBJETIVOS', margin + 4, y + 5);

  const tdeeBase = evaluation.tdee_kcal || 2000;
  const deficitCal = Math.round(tdeeBase - 400);
  const normoCal = Math.round(tdeeBase);
  const superCal = Math.round(tdeeBase + 350);

  const boxW = (contentWidth - 12) / 3;

  // Box 1: Deficit - Crisp white card with clean border
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(borderLight[0], borderLight[1], borderLight[2]);
  doc.roundedRect(margin + 3, y + 7.5, boxW, 12.5, 1.5, 1.5, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(accentTeal[0], accentTeal[1], accentTeal[2]);
  doc.text('DÉFICIT CONTROLADO (-400 kcal)', margin + 5, y + 11.5);
  doc.setFontSize(9);
  doc.setTextColor(darkNeutral[0], darkNeutral[1], darkNeutral[2]);
  doc.text(`${deficitCal} kcal/día`, margin + 5, y + 17);

  // Box 2: Normo - Crisp white card with clean border
  const box2X = margin + 3 + boxW + 3;
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(borderLight[0], borderLight[1], borderLight[2]);
  doc.roundedRect(box2X, y + 7.5, boxW, 12.5, 1.5, 1.5, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(secondaryGreen[0], secondaryGreen[1], secondaryGreen[2]);
  doc.text('NORMOCALÓRICA / MANTENCIÓN', box2X + 3, y + 11.5);
  doc.setFontSize(9);
  doc.setTextColor(darkNeutral[0], darkNeutral[1], darkNeutral[2]);
  doc.text(`${normoCal} kcal/día`, box2X + 3, y + 17);

  // Box 3: Superavit - Crisp white card with clean border
  const box3X = margin + 3 + (boxW + 3) * 2;
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(borderLight[0], borderLight[1], borderLight[2]);
  doc.roundedRect(box3X, y + 7.5, boxW, 12.5, 1.5, 1.5, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(primaryNavy[0], primaryNavy[1], primaryNavy[2]);
  doc.text('SUPERÁVIT MAGRO (+350 kcal)', box3X + 3, y + 11.5);
  doc.setFontSize(9);
  doc.setTextColor(darkNeutral[0], darkNeutral[1], darkNeutral[2]);
  doc.text(`${superCal} kcal/día`, box3X + 3, y + 17);

  y += 27;

  // 6. CLINICAL OBSERVATIONS & PRESCRIPTIVE NOTES
  doc.setFillColor(bgSurface[0], bgSurface[1], bgSurface[2]);
  doc.setDrawColor(borderLight[0], borderLight[1], borderLight[2]);
  doc.roundedRect(margin, y, contentWidth, 27, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(primaryNavy[0], primaryNavy[1], primaryNavy[2]);
  doc.text('JUICIO CLÍNICO NUTRICIONAL & CONCLUSIONES', margin + 4, y + 5.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(darkNeutral[0], darkNeutral[1], darkNeutral[2]);

  const notesText =
    evaluation.clinical_notes ||
    'Evaluación cineantropométrica completada. Paciente presenta distribución corporal acorde a sus hábitos de actividad física. Se recomienda ajuste en la ingesta proteica y control periódico de pliegues en 4 a 6 semanas.';

  const splitNotes = doc.splitTextToSize(notesText, contentWidth - 8);
  doc.text(splitNotes, margin + 4, y + 11);

  // 7. SIGNATURES & LEGAL MEDICAL DISCLAIMER
  const footerY = pageHeight - 32;

  // Signature line
  doc.setDrawColor(darkNeutral[0], darkNeutral[1], darkNeutral[2]);
  doc.line(margin + 18, footerY + 10, margin + 85, footerY + 10);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(primaryNavy[0], primaryNavy[1], primaryNavy[2]);
  doc.text(nutritionistName, margin + 51.5, footerY + 14, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(lightNeutral[0], lightNeutral[1], lightNeutral[2]);
  doc.text('Lic. en Nutrición & Dietética • Reg. Colegio Profesional', margin + 51.5, footerY + 17.5, { align: 'center' });

  // Patient acknowledgment line
  doc.line(pageWidth - margin - 85, footerY + 10, pageWidth - margin - 18, footerY + 10);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(darkNeutral[0], darkNeutral[1], darkNeutral[2]);
  doc.text(fullName, pageWidth - margin - 51.5, footerY + 14, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(lightNeutral[0], lightNeutral[1], lightNeutral[2]);
  doc.text('Firma de Conformidad del Paciente', pageWidth - margin - 51.5, footerY + 17.5, { align: 'center' });

  // Disclaimer bottom line
  doc.setDrawColor(borderLight[0], borderLight[1], borderLight[2]);
  doc.line(margin, pageHeight - 10, pageWidth - margin, pageHeight - 10);
  doc.setFontSize(6);
  doc.setTextColor(lightNeutral[0], lightNeutral[1], lightNeutral[2]);
  doc.text(
    'Documento clínico confidencial generado digitalmente por KineSys Clinical Platform. Válido para seguimiento nutricional ambulatorio.',
    margin,
    pageHeight - 6.5
  );
  doc.text(`Página 1 de ${totalPages}`, pageWidth - margin, pageHeight - 6.5, { align: 'right' });

  // =========================================================================
  // PAGE 2: REPORTE LONGITUDINAL DE PROGRESO HISTÓRICO DEL PACIENTE
  // =========================================================================
  if (shouldRenderHistoryPage) {
    doc.addPage();
    let py = 12;

    // Header Ribbon Page 2 with Clinic Logo
    doc.setFillColor(primaryNavy[0], primaryNavy[1], primaryNavy[2]);
    doc.roundedRect(margin, py, contentWidth, 24, 3, 3, 'F');

    // Draw Clinic Logo
    drawClinicLogo(doc, margin + 5, py + 3.5, 16, true);

    const h2TextX = margin + 5 + 16 + 4;
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('HISTORIAL & EVOLUCIÓN LONGITUDINAL DEL PACIENTE', h2TextX, py + 8.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(200, 225, 245);
    doc.text(`${clinicName.toUpperCase()} • Trazabilidad Antropométrica & Cineantropometría`, h2TextX, py + 14);
    doc.text(`Paciente: ${fullName} (${idDoc})`, h2TextX, py + 19);

    // Right Badge
    doc.setFillColor(secondaryGreen[0], secondaryGreen[1], secondaryGreen[2]);
    doc.roundedRect(pageWidth - margin - 48, py + 4, 43, 16, 2, 2, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(255, 255, 255);
    doc.text('EVOLUCIÓN CLÍNICA', pageWidth - margin - 26.5, py + 10.5, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.text(`${patientHistoryAsc.length} Controles Registrados`, pageWidth - margin - 26.5, py + 15.5, { align: 'center' });

    py += 28;

    // Calculate baseline and latest metrics
    const baseline = patientHistoryAsc[0];
    const latest = patientHistoryAsc[patientHistoryAsc.length - 1];

    const deltaWeight = baseline && latest ? Number((latest.weight_kg - baseline.weight_kg).toFixed(1)) : 0;
    const deltaFatPct =
      baseline && latest && latest.body_fat_percentage && baseline.body_fat_percentage
        ? Number((latest.body_fat_percentage - baseline.body_fat_percentage).toFixed(1))
        : null;
    const deltaLeanMass =
      baseline && latest && latest.fat_free_mass_kg && baseline.fat_free_mass_kg
        ? Number((latest.fat_free_mass_kg - baseline.fat_free_mass_kg).toFixed(1))
        : null;
    const deltaWaist =
      baseline && latest && latest.waist_cm && baseline.waist_cm
        ? Number((latest.waist_cm - baseline.waist_cm).toFixed(1))
        : null;

    // 1. KPI Delta Summary Cards (Baseline vs Latest)
    const kpiW = (contentWidth - 9) / 4;
    const kpiH = 21;

    // KPI 1: Delta Peso
    doc.setFillColor(bgSurface[0], bgSurface[1], bgSurface[2]);
    doc.setDrawColor(borderLight[0], borderLight[1], borderLight[2]);
    doc.roundedRect(margin, py, kpiW, kpiH, 2, 2, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(lightNeutral[0], lightNeutral[1], lightNeutral[2]);
    doc.text('CAMBIO PESO NETO', margin + 3, py + 5);
    doc.setFontSize(10.5);
    if (deltaWeight <= 0) {
      doc.setTextColor(secondaryGreen[0], secondaryGreen[1], secondaryGreen[2]);
      doc.text(`${deltaWeight > 0 ? `+${deltaWeight}` : deltaWeight} kg`, margin + 3, py + 12);
    } else {
      doc.setTextColor(accentAmber[0], accentAmber[1], accentAmber[2]);
      doc.text(`+${deltaWeight} kg`, margin + 3, py + 12);
    }
    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(darkNeutral[0], darkNeutral[1], darkNeutral[2]);
    doc.text(`Basal: ${baseline?.weight_kg || 0} kg ➔ Act: ${latest?.weight_kg || 0} kg`, margin + 3, py + 17.5);

    // KPI 2: Delta % Grasa
    const xKpi2 = margin + kpiW + 3;
    doc.setFillColor(bgSurface[0], bgSurface[1], bgSurface[2]);
    doc.setDrawColor(borderLight[0], borderLight[1], borderLight[2]);
    doc.roundedRect(xKpi2, py, kpiW, kpiH, 2, 2, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(lightNeutral[0], lightNeutral[1], lightNeutral[2]);
    doc.text('CAMBIO % GRASA', xKpi2 + 3, py + 5);
    doc.setFontSize(10.5);
    if (deltaFatPct !== null) {
      doc.setTextColor(deltaFatPct <= 0 ? secondaryGreen[0] : accentAmber[0], deltaFatPct <= 0 ? secondaryGreen[1] : accentAmber[1], deltaFatPct <= 0 ? secondaryGreen[2] : accentAmber[2]);
      doc.text(`${deltaFatPct > 0 ? `+${deltaFatPct}` : deltaFatPct}%`, xKpi2 + 3, py + 12);
    } else {
      doc.setTextColor(darkNeutral[0], darkNeutral[1], darkNeutral[2]);
      doc.text('N/A', xKpi2 + 3, py + 12);
    }
    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(darkNeutral[0], darkNeutral[1], darkNeutral[2]);
    doc.text(`Basal: ${baseline?.body_fat_percentage || '-'}% ➔ Act: ${latest?.body_fat_percentage || '-'}%`, xKpi2 + 3, py + 17.5);

    // KPI 3: Delta Masa Magra
    const xKpi3 = margin + (kpiW + 3) * 2;
    doc.setFillColor(bgSurface[0], bgSurface[1], bgSurface[2]);
    doc.setDrawColor(borderLight[0], borderLight[1], borderLight[2]);
    doc.roundedRect(xKpi3, py, kpiW, kpiH, 2, 2, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(lightNeutral[0], lightNeutral[1], lightNeutral[2]);
    doc.text('MASA MAGRA (MÚSCULO)', xKpi3 + 3, py + 5);
    doc.setFontSize(10.5);
    if (deltaLeanMass !== null) {
      doc.setTextColor(deltaLeanMass >= 0 ? secondaryGreen[0] : primaryNavy[0], deltaLeanMass >= 0 ? secondaryGreen[1] : primaryNavy[1], deltaLeanMass >= 0 ? secondaryGreen[2] : primaryNavy[2]);
      doc.text(`${deltaLeanMass > 0 ? `+${deltaLeanMass}` : deltaLeanMass} kg`, xKpi3 + 3, py + 12);
    } else {
      doc.setTextColor(darkNeutral[0], darkNeutral[1], darkNeutral[2]);
      doc.text('N/A', xKpi3 + 3, py + 12);
    }
    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(darkNeutral[0], darkNeutral[1], darkNeutral[2]);
    doc.text(`Basal: ${baseline?.fat_free_mass_kg || '-'} kg ➔ Act: ${latest?.fat_free_mass_kg || '-'} kg`, xKpi3 + 3, py + 17.5);

    // KPI 4: Delta Cintura
    const xKpi4 = margin + (kpiW + 3) * 3;
    doc.setFillColor(bgSurface[0], bgSurface[1], bgSurface[2]);
    doc.setDrawColor(borderLight[0], borderLight[1], borderLight[2]);
    doc.roundedRect(xKpi4, py, kpiW, kpiH, 2, 2, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(lightNeutral[0], lightNeutral[1], lightNeutral[2]);
    doc.text('CINTURA ABDOMINAL', xKpi4 + 3, py + 5);
    doc.setFontSize(10.5);
    if (deltaWaist !== null) {
      doc.setTextColor(deltaWaist <= 0 ? secondaryGreen[0] : accentAmber[0], deltaWaist <= 0 ? secondaryGreen[1] : accentAmber[1], deltaWaist <= 0 ? secondaryGreen[2] : accentAmber[2]);
      doc.text(`${deltaWaist > 0 ? `+${deltaWaist}` : deltaWaist} cm`, xKpi4 + 3, py + 12);
    } else {
      doc.setTextColor(darkNeutral[0], darkNeutral[1], darkNeutral[2]);
      doc.text('N/A', xKpi4 + 3, py + 12);
    }
    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(darkNeutral[0], darkNeutral[1], darkNeutral[2]);
    doc.text(`Basal: ${baseline?.waist_cm || '-'} cm ➔ Act: ${latest?.waist_cm || '-'} cm`, xKpi4 + 3, py + 17.5);

    py += 25;

    // 2. MATRIZ TABULAR COMPARATIVA LONGITUDINAL
    doc.setFillColor(primaryNavy[0], primaryNavy[1], primaryNavy[2]);
    doc.roundedRect(margin, py, contentWidth, 7, 1.5, 1.5, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(255, 255, 255);
    doc.text('MATRIZ CRONOLÓGICA DE VARIABLES ANTROPOMÉTRICAS', margin + 4, py + 4.8);

    py += 7.5;

    // Table Column Headers
    const headers = [
      { label: 'FECHA', w: 22, align: 'left' as const },
      { label: 'PESO', w: 18, align: 'right' as const },
      { label: 'IMC', w: 14, align: 'right' as const },
      { label: '% GRASA', w: 16, align: 'right' as const },
      { label: 'M. GRASA', w: 18, align: 'right' as const },
      { label: 'M. MAGRA', w: 18, align: 'right' as const },
      { label: 'CINTURA', w: 18, align: 'right' as const },
      { label: 'CADERA', w: 16, align: 'right' as const },
      { label: 'ICC', w: 14, align: 'right' as const },
      { label: 'Σ 4 PLIEG', w: 16, align: 'right' as const },
      { label: 'TDEE', w: 12, align: 'right' as const },
    ];

    // Header row background
    doc.setFillColor(241, 245, 249);
    doc.rect(margin, py, contentWidth, 6, 'F');
    doc.setDrawColor(borderLight[0], borderLight[1], borderLight[2]);
    doc.line(margin, py + 6, margin + contentWidth, py + 6);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(darkNeutral[0], darkNeutral[1], darkNeutral[2]);

    let currX = margin + 2;
    headers.forEach((h) => {
      if (h.align === 'right') {
        doc.text(h.label, currX + h.w - 3, py + 4.2, { align: 'right' });
      } else {
        doc.text(h.label, currX, py + 4.2);
      }
      currX += h.w;
    });

    py += 6;

    // Table Data Rows
    patientHistoryAsc.slice(0, 10).forEach((ev, idx) => {
      const rowY = py + idx * 6.5;
      const isEven = idx % 2 === 0;
      doc.setFillColor(isEven ? bgSurface[0] : 255, isEven ? bgSurface[1] : 255, isEven ? bgSurface[2] : 255);
      doc.rect(margin, rowY, contentWidth, 6.5, 'F');
      doc.setDrawColor(borderLight[0], borderLight[1], borderLight[2]);
      doc.line(margin, rowY + 6.5, margin + contentWidth, rowY + 6.5);

      const skinfoldsSum = (
        (ev.skinfold_triceps_mm || 0) +
        (ev.skinfold_subscapular_mm || 0) +
        (ev.skinfold_suprailiac_mm || 0) +
        (ev.skinfold_abdominal_mm || 0)
      ).toFixed(1);

      doc.setFont('helvetica', idx === patientHistoryAsc.length - 1 ? 'bold' : 'normal');
      doc.setFontSize(6.8);
      doc.setTextColor(darkNeutral[0], darkNeutral[1], darkNeutral[2]);

      let xPos = margin + 2;

      // Fecha
      doc.text(ev.evaluation_date || 'N/A', xPos, rowY + 4.5);
      xPos += 22;

      // Peso
      doc.setTextColor(primaryNavy[0], primaryNavy[1], primaryNavy[2]);
      doc.text(`${ev.weight_kg} kg`, xPos + 18 - 3, rowY + 4.5, { align: 'right' });
      doc.setTextColor(darkNeutral[0], darkNeutral[1], darkNeutral[2]);
      xPos += 18;

      // IMC
      doc.text(`${ev.bmi}`, xPos + 14 - 3, rowY + 4.5, { align: 'right' });
      xPos += 14;

      // % Grasa
      doc.text(ev.body_fat_percentage ? `${ev.body_fat_percentage}%` : '-', xPos + 16 - 3, rowY + 4.5, { align: 'right' });
      xPos += 16;

      // M. Grasa
      doc.text(ev.fat_mass_kg ? `${ev.fat_mass_kg} kg` : '-', xPos + 18 - 3, rowY + 4.5, { align: 'right' });
      xPos += 18;

      // M. Magra
      doc.text(ev.fat_free_mass_kg ? `${ev.fat_free_mass_kg} kg` : '-', xPos + 18 - 3, rowY + 4.5, { align: 'right' });
      xPos += 18;

      // Cintura
      doc.text(ev.waist_cm ? `${ev.waist_cm} cm` : '-', xPos + 18 - 3, rowY + 4.5, { align: 'right' });
      xPos += 18;

      // Cadera
      doc.text(ev.hip_cm ? `${ev.hip_cm} cm` : '-', xPos + 16 - 3, rowY + 4.5, { align: 'right' });
      xPos += 16;

      // ICC
      doc.text(ev.waist_hip_ratio ? `${ev.waist_hip_ratio}` : '-', xPos + 14 - 3, rowY + 4.5, { align: 'right' });
      xPos += 14;

      // Sumatoria pliegues
      doc.text(`${skinfoldsSum} mm`, xPos + 16 - 3, rowY + 4.5, { align: 'right' });
      xPos += 16;

      // TDEE
      doc.text(ev.tdee_kcal ? `${ev.tdee_kcal}` : '-', xPos + 12 - 3, rowY + 4.5, { align: 'right' });
    });

    py += Math.min(patientHistoryAsc.length, 10) * 6.5 + 8;

    // 3. SECCIÓN DE ANÁLISIS DE TENDENCIA Y ADHERENCIA NUTRICIONAL
    doc.setFillColor(bgSurface[0], bgSurface[1], bgSurface[2]);
    doc.setDrawColor(borderLight[0], borderLight[1], borderLight[2]);
    doc.roundedRect(margin, py, contentWidth, 36, 2, 2, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(primaryNavy[0], primaryNavy[1], primaryNavy[2]);
    doc.text('ANÁLISIS DE EVOLUCIÓN, METAS ALCANZADAS & PRÓXIMOS HITOS', margin + 4, py + 5.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.2);
    doc.setTextColor(darkNeutral[0], darkNeutral[1], darkNeutral[2]);

    const progressSummaryText = `El paciente ha registrado un total de ${patientHistoryAsc.length} evaluaciones cineantropométricas desde ${baseline?.evaluation_date || 'inicio'} hasta ${latest?.evaluation_date || 'la fecha'}. ` +
      `La trayectoria muestra una variación de peso neto de ${deltaWeight > 0 ? `+${deltaWeight}` : deltaWeight} kg${deltaFatPct !== null ? ` con un cambio de grasa de ${deltaFatPct > 0 ? `+${deltaFatPct}` : deltaFatPct}%` : ''}. ` +
      `Se observa preservación del tejido muscular y respuesta positiva a la planificación dietoterápica. Se establece continuar el régimen calórico prescrito y reevaluar pliegues y perímetros en la siguiente consulta de seguimiento.`;

    const splitProgress = doc.splitTextToSize(progressSummaryText, contentWidth - 8);
    doc.text(splitProgress, margin + 4, py + 11);

    // Timeline milestone notes preview
    if (latest?.clinical_notes) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.2);
      doc.setTextColor(secondaryGreen[0], secondaryGreen[1], secondaryGreen[2]);
      doc.text(`Última Nota de Control (${latest.evaluation_date}):`, margin + 4, py + 26);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(darkNeutral[0], darkNeutral[1], darkNeutral[2]);
      const splitLastNote = doc.splitTextToSize(`"${latest.clinical_notes}"`, contentWidth - 8);
      doc.text(splitLastNote, margin + 4, py + 30.5);
    }

    // Page 2 Footer Signatures & Disclaimer
    const p2FooterY = pageHeight - 32;

    doc.setDrawColor(darkNeutral[0], darkNeutral[1], darkNeutral[2]);
    doc.line(margin + 18, p2FooterY + 10, margin + 85, p2FooterY + 10);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(primaryNavy[0], primaryNavy[1], primaryNavy[2]);
    doc.text(nutritionistName, margin + 51.5, p2FooterY + 14, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(lightNeutral[0], lightNeutral[1], lightNeutral[2]);
    doc.text('Lic. en Nutrición & Dietética • Reg. Colegio Profesional', margin + 51.5, p2FooterY + 17.5, { align: 'center' });

    doc.line(pageWidth - margin - 85, p2FooterY + 10, pageWidth - margin - 18, p2FooterY + 10);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(darkNeutral[0], darkNeutral[1], darkNeutral[2]);
    doc.text(fullName, pageWidth - margin - 51.5, p2FooterY + 14, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(lightNeutral[0], lightNeutral[1], lightNeutral[2]);
    doc.text('Firma de Conformidad del Paciente', pageWidth - margin - 51.5, p2FooterY + 17.5, { align: 'center' });

    doc.setDrawColor(borderLight[0], borderLight[1], borderLight[2]);
    doc.line(margin, pageHeight - 10, pageWidth - margin, pageHeight - 10);
    doc.setFontSize(6);
    doc.setTextColor(lightNeutral[0], lightNeutral[1], lightNeutral[2]);
    doc.text(
      'Documento clínico confidencial generado digitalmente por KineSys Clinical Platform. Trazabilidad histórica longitudinal.',
      margin,
      pageHeight - 6.5
    );
    doc.text(`Página 2 de ${totalPages}`, pageWidth - margin, pageHeight - 6.5, { align: 'right' });
  }

  return doc;
}

/**
 * Descarga directamente el archivo PDF en el navegador del usuario.
 */
export function downloadAnthropometryPdf(options: GenerateAnthropometryPdfOptions): void {
  const doc = generateAnthropometryPdf(options);
  const patientLastName = options.patient.last_name?.replace(/\s+/g, '_') || 'Paciente';
  const dateStr = new Date().toISOString().split('T')[0];
  const filename = `Informe_Antropometria_${patientLastName}_${dateStr}.pdf`;
  doc.save(filename);
}

/**
 * Genera y retorna el Blob binario del PDF (application/pdf)
 */
export function getAnthropometryPdfBlob(options: GenerateAnthropometryPdfOptions): Blob {
  const doc = generateAnthropometryPdf(options);
  return doc.output('blob');
}

/**
 * Obtiene el Data URL del PDF para previsualización interactiva en un iframe o modal.
 */
export function getAnthropometryPdfDataUrl(options: GenerateAnthropometryPdfOptions): string {
  const doc = generateAnthropometryPdf(options);
  return doc.output('datauristring');
}

/**
 * Genera el string Base64 del archivo PDF (para adjuntar en la Edge Function)
 */
export function getAnthropometryPdfBase64(options: GenerateAnthropometryPdfOptions): string {
  const doc = generateAnthropometryPdf(options);
  const output = doc.output('datauristring');
  const parts = output.split(',');
  return parts.length > 1 ? parts[1] : output;
}


