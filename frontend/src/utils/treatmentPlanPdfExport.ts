import jsPDF from 'jspdf';
import type { Exercise, TreatmentPlan } from '../types';

interface StaticImage {
  dataUrl: string;
  width: number;
  height: number;
}

const PAGE_WIDTH = 210;
const PAGE_HEIGHT = 297;
const MARGIN = 16;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;
const PRIMARY: [number, number, number] = [0, 72, 112];
const SLATE: [number, number, number] = [30, 41, 59];
const MUTED: [number, number, number] = [100, 116, 139];
const BORDER: [number, number, number] = [226, 232, 240];
const SURFACE: [number, number, number] = [248, 250, 252];

function wrap(doc: jsPDF, value: string, width: number): string[] {
  return doc.splitTextToSize(value || '—', width) as string[];
}

function safeText(value?: string): string {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function loadStaticImage(url: string): Promise<StaticImage | null> {
  return new Promise((resolve) => {
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const width = image.naturalWidth || 640;
        const height = image.naturalHeight || 480;
        canvas.width = width;
        canvas.height = height;
        canvas.getContext('2d')?.drawImage(image, 0, 0, width, height);
        resolve({ dataUrl: canvas.toDataURL('image/png'), width, height });
      } catch {
        resolve(null);
      }
    };
    image.onerror = () => resolve(null);
    image.src = url;
  });
}

function addFooter(doc: jsPDF, pageNumber: number) {
  doc.setDrawColor(...BORDER);
  doc.line(MARGIN, PAGE_HEIGHT - 13, PAGE_WIDTH - MARGIN, PAGE_HEIGHT - 13);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(...MUTED);
  doc.text(`KineSys Clinical Platform · Plan de tratamiento kinésico · Pág. ${pageNumber}`, PAGE_WIDTH / 2, PAGE_HEIGHT - 7, {
    align: 'center',
  });
}

function addHeader(doc: jsPDF, plan: TreatmentPlan) {
  doc.setFillColor(...PRIMARY);
  doc.roundedRect(MARGIN, 14, CONTENT_WIDTH, 25, 3, 3, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('PLAN DE TRATAMIENTO KINESICO', MARGIN + 5, 24);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(`Fase: ${safeText(plan.currentPhase) || 'Sin definir'}`, MARGIN + 5, 31);
  doc.text(`Fecha de emisión: ${new Date().toLocaleDateString('es-CO')}`, PAGE_WIDTH - MARGIN - 5, 31, { align: 'right' });
}

function addExerciseCard(doc: jsPDF, exercise: Exercise, y: number, image: StaticImage | null): number {
  const description = safeText(exercise.instructions) || 'Sin indicaciones adicionales.';
  const descriptionLines = wrap(doc, description, image ? CONTENT_WIDTH - 58 : CONTENT_WIDTH - 10).slice(0, 4);
  const attribution = exercise.isSystem && exercise.authorAttribution
    ? safeText(exercise.authorAttribution)
    : '';
  const cardHeight = Math.max(image ? 54 : 38, 25 + descriptionLines.length * 3.5 + (attribution ? 8 : 0));

  doc.setFillColor(...SURFACE);
  doc.setDrawColor(...BORDER);
  doc.roundedRect(MARGIN, y, CONTENT_WIDTH, cardHeight, 2.5, 2.5, 'FD');

  if (image) {
    const imageHeight = 42;
    const imageWidth = Math.min(48, (image.width / image.height) * imageHeight);
    doc.addImage(image.dataUrl, 'PNG', MARGIN + 4, y + 5, imageWidth, imageHeight);
  }

  const textX = MARGIN + (image ? 58 : 5);
  const textWidth = CONTENT_WIDTH - (image ? 63 : 10);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...SLATE);
  doc.text(safeText(exercise.name) || 'Ejercicio', textX, y + 8);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(...MUTED);
  doc.text(`${safeText(exercise.category)} · ${safeText(exercise.targetMuscle) || 'Grupo muscular general'}`, textX, y + 13);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...PRIMARY);
  doc.text(`${exercise.sets} series · ${safeText(exercise.repsOrDuration)} · ${exercise.restSeconds}s descanso · ${exercise.frequencyDaysPerWeek} días/sem`, textX, y + 18);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(...SLATE);
  doc.text(descriptionLines, textX, y + 25);

  if (exercise.imageUrl) {
    const linkY = y + cardHeight - (attribution ? 14 : 7);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(37, 99, 235);
    doc.textWithLink('Ver animación biomecánica', textX, linkY, { url: exercise.imageUrl });
  }

  if (attribution) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(6.5);
    doc.setTextColor(...MUTED);
    doc.text(wrap(doc, attribution, textWidth).slice(0, 2), textX, y + cardHeight - 5);
  }

  return y + cardHeight + 6;
}

export async function generateTreatmentPlanPdf(plan: TreatmentPlan): Promise<jsPDF> {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  let y = 47;
  let pageNumber = 1;

  addHeader(doc, plan);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...PRIMARY);
  doc.text('OBJETIVO CLINICO', MARGIN, y);
  y += 5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...SLATE);
  const objectiveLines = wrap(doc, safeText(plan.objective) || 'Sin objetivo registrado.', CONTENT_WIDTH);
  doc.text(objectiveLines, MARGIN, y);
  y += objectiveLines.length * 4 + 8;

  doc.setFillColor(...SURFACE);
  doc.roundedRect(MARGIN, y, CONTENT_WIDTH, 16, 2, 2, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...SLATE);
  doc.text('SEGUIMIENTO DEL PLAN', MARGIN + 4, y + 6);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...MUTED);
  doc.text(`Sesiones: ${plan.sessionsCompleted} / ${plan.totalSessionsPlanned}`, MARGIN + 4, y + 11);
  doc.text(`Periodo: ${safeText(plan.startDate) || '—'} → ${safeText(plan.estimatedEndDate) || '—'}`, MARGIN + 78, y + 11);
  y += 24;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...PRIMARY);
  doc.text('EJERCICIOS PRESCRITOS', MARGIN, y);
  y += 8;

  for (const exercise of plan.exercises || []) {
    const image = exercise.imageUrl ? await loadStaticImage(exercise.imageUrl) : null;
    const estimatedHeight = Math.max(54, 25 + wrap(doc, safeText(exercise.instructions), image ? CONTENT_WIDTH - 58 : CONTENT_WIDTH - 10).slice(0, 4).length * 3.5 + (exercise.isSystem ? 8 : 0));
    if (y + estimatedHeight > PAGE_HEIGHT - 22) {
      addFooter(doc, pageNumber);
      doc.addPage();
      pageNumber += 1;
      y = 18;
    }
    y = addExerciseCard(doc, exercise, y, image);
  }

  if (plan.clinicalNotes) {
    if (y + 28 > PAGE_HEIGHT - 22) {
      addFooter(doc, pageNumber);
      doc.addPage();
      pageNumber += 1;
      y = 18;
    }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...PRIMARY);
    doc.text('NOTAS CLINICAS', MARGIN, y);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...SLATE);
    doc.text(wrap(doc, plan.clinicalNotes, CONTENT_WIDTH), MARGIN, y + 6);
  }

  addFooter(doc, pageNumber);
  return doc;
}

export async function downloadTreatmentPlanPdf(plan: TreatmentPlan): Promise<void> {
  const doc = await generateTreatmentPlanPdf(plan);
  const date = new Date().toISOString().slice(0, 10);
  doc.save(`Plan_Tratamiento_Kinesico_${date}.pdf`);
}
