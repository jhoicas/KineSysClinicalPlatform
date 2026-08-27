import jsPDF from 'jspdf';
import { ConsultaSOP, PacienteClinico } from '../types';

export interface GenerateSoapPdfOptions {
  patient: PacienteClinico;
  encounter: ConsultaSOP;
  doctorName?: string;
  doctorLicense?: string;
  clinicName?: string;
  clinicAddress?: string;
  clinicPhone?: string;
  primaryColorHex?: string;
}

export function generateSoapPdf(options: GenerateSoapPdfOptions): jsPDF {
  const {
    patient,
    encounter,
    doctorName = 'Dr. Médico Tratante',
    doctorLicense = 'COL-MED-8420',
    clinicName = 'KineSys Salud - Centro Clínico Integral',
    clinicAddress = 'Av. Medicina Integral 1050, Piso 4',
    clinicPhone = '+56 9 8765 4321',
  } = options;

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 15;
  const contentWidth = pageWidth - margin * 2;

  // Header background
  doc.setFillColor(0, 72, 112); // Primary Navy
  doc.rect(0, 0, pageWidth, 38, 'F');

  // Decorative accent line
  doc.setFillColor(0, 108, 73); // Emerald
  doc.rect(0, 38, pageWidth, 2.5, 'F');

  // Clinic Title
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text(clinicName.toUpperCase(), margin, 16);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(200, 220, 240);
  doc.text(`${clinicAddress} • Tel: ${clinicPhone}`, margin, 23);

  // Document Badge
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(pageWidth - margin - 50, 10, 50, 18, 2, 2, 'F');
  doc.setTextColor(0, 72, 112);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('INFORME CLÍNICO SOAP', pageWidth - margin - 48, 17);
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text(`Fecha: ${encounter.encounter_date || new Date().toISOString().split('T')[0]}`, pageWidth - margin - 48, 24);

  let currentY = 48;

  // Patient info box
  doc.setFillColor(245, 248, 252);
  doc.setDrawColor(210, 225, 240);
  doc.roundedRect(margin, currentY, contentWidth, 24, 3, 3, 'FD');

  doc.setTextColor(0, 72, 112);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('DATOS DEL PACIENTE', margin + 4, currentY + 6);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(30, 41, 59);

  const fullName = `${patient.first_name || ''} ${patient.last_name || ''}`.trim() || 'Paciente';
  const idStr = `${patient.identifier_type || 'RUT'}: ${patient.identifier_number || 'S/N'}`;
  const genderAge = `${patient.gender === 'female' ? 'Femenino' : 'Masculino'} • Nac: ${patient.birth_date || 'S/R'}`;
  const phone = `Tel: ${patient.telecom_phone || 'S/R'}`;

  doc.text(`Nombre: ${fullName}`, margin + 4, currentY + 13);
  doc.text(`Doc: ${idStr}`, margin + 70, currentY + 13);
  doc.text(`Género/Edad: ${genderAge}`, margin + 4, currentY + 19);
  doc.text(phone, margin + 70, currentY + 19);

  // Professional Box
  doc.text(`Médico: ${doctorName}`, margin + 120, currentY + 13);
  doc.text(`Registro: ${doctorLicense}`, margin + 120, currentY + 19);

  currentY += 30;

  // Helper section renderer
  const renderSection = (
    badgeLetter: string,
    title: string,
    badgeColor: [number, number, number],
    contentBuilder: () => void
  ) => {
    // Section Header
    doc.setFillColor(...badgeColor);
    doc.roundedRect(margin, currentY, 8, 8, 2, 2, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text(badgeLetter, margin + 2.5, currentY + 5.8);

    doc.setTextColor(...badgeColor);
    doc.setFontSize(10);
    doc.text(title, margin + 12, currentY + 6);

    currentY += 11;
    contentBuilder();
    currentY += 6;
  };

  // S - Subjetivo
  renderSection('S', 'SUBJETIVO (Anamnesis & Motivo de Consulta)', [3, 105, 161], () => {
    doc.setFillColor(250, 252, 255);
    doc.setDrawColor(220, 235, 250);
    doc.roundedRect(margin, currentY, contentWidth, 22, 2, 2, 'FD');

    doc.setTextColor(30, 41, 59);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.text('Motivo Principal:', margin + 4, currentY + 6);
    doc.setFont('helvetica', 'normal');
    doc.text(encounter.subjective?.chief_complaint || 'Control clínico general', margin + 34, currentY + 6);

    doc.setFont('helvetica', 'bold');
    doc.text('Historia Actual:', margin + 4, currentY + 13);
    doc.setFont('helvetica', 'normal');
    const historyLines = doc.splitTextToSize(
      encounter.subjective?.current_illness_history || 'Paciente refiere evolución favorable sin signos de alarma.',
      contentWidth - 36
    );
    doc.text(historyLines, margin + 34, currentY + 13);

    currentY += 22;
  });

  // O - Objetivo
  renderSection('O', 'OBJETIVO (Signos Vitales & Examen Físico)', [4, 120, 87], () => {
    doc.setFillColor(245, 253, 248);
    doc.setDrawColor(200, 240, 215);
    doc.roundedRect(margin, currentY, contentWidth, 24, 2, 2, 'FD');

    const vitals = encounter.objective?.vitals;
    const pa = `${vitals?.blood_pressure_systolic || 120}/${vitals?.blood_pressure_diastolic || 80} mmHg`;
    const fc = `${vitals?.heart_rate_bpm || 72} lpm`;
    const sat = `${vitals?.oxygen_saturation_pct || 98}%`;
    const temp = `${vitals?.temp_celsius || 36.5} °C`;

    doc.setTextColor(4, 120, 87);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.text(`PA: ${pa}   •   FC: ${fc}   •   SatO2: ${sat}   •   Temp: ${temp}`, margin + 4, currentY + 6);

    doc.setTextColor(30, 41, 59);
    doc.text('Examen Físico:', margin + 4, currentY + 13);
    doc.setFont('helvetica', 'normal');
    const examLines = doc.splitTextToSize(
      encounter.objective?.physical_exam || 'Paciente en buen estado general, vigil, orientado en tiempo y espacio.',
      contentWidth - 32
    );
    doc.text(examLines, margin + 30, currentY + 13);

    currentY += 24;
  });

  // A - Análisis
  renderSection('A', 'ANÁLISIS & DIAGNÓSTICO (CIE-10)', [180, 83, 9], () => {
    doc.setFillColor(255, 252, 245);
    doc.setDrawColor(250, 230, 190);
    doc.roundedRect(margin, currentY, contentWidth, 24, 2, 2, 'FD');

    doc.setTextColor(180, 83, 9);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    const diagList = encounter.assessment?.diagnoses?.map((d) => `${d.code} - ${d.description}`).join(' | ') || 'Z00.0 - Examen médico general';
    doc.text(`Diagnósticos: ${diagList}`, margin + 4, currentY + 6);

    doc.setTextColor(30, 41, 59);
    doc.text('Razonamiento:', margin + 4, currentY + 13);
    doc.setFont('helvetica', 'normal');
    const reasonLines = doc.splitTextToSize(
      encounter.assessment?.clinical_reasoning || 'Evolución clínica dentro de parámetros esperados para su grupo etario.',
      contentWidth - 32
    );
    doc.text(reasonLines, margin + 30, currentY + 13);

    currentY += 24;
  });

  // P - Plan
  renderSection('P', 'PLAN TERAPÉUTICO & INDICACIONES', [126, 34, 206], () => {
    doc.setFillColor(252, 248, 255);
    doc.setDrawColor(235, 215, 255);
    doc.roundedRect(margin, currentY, contentWidth, 26, 2, 2, 'FD');

    doc.setTextColor(126, 34, 206);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.text('Objetivos:', margin + 4, currentY + 6);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(30, 41, 59);
    doc.text(encounter.plan?.treatment_goals || 'Mantenimiento preventivo y seguimiento ambulatorio.', margin + 26, currentY + 6);

    doc.setFont('helvetica', 'bold');
    doc.text('Indicaciones:', margin + 4, currentY + 13);
    doc.setFont('helvetica', 'normal');
    const instLines = doc.splitTextToSize(
      encounter.plan?.patient_instructions || 'Mantener adherencia a indicaciones y consultar en caso de síntomas de alerta.',
      contentWidth - 30
    );
    doc.text(instLines, margin + 28, currentY + 13);

    currentY += 26;
  });

  // Digital Signature Block at bottom
  const sigY = pageHeight - 35;
  doc.setDrawColor(180, 190, 205);
  doc.line(pageWidth - margin - 60, sigY, pageWidth - margin, sigY);

  doc.setTextColor(0, 72, 112);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text(doctorName, pageWidth - margin - 60, sigY + 5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text(`Reg. Médico: ${doctorLicense}`, pageWidth - margin - 60, sigY + 9);
  doc.text('Firma Digitalizada / KineSys Cloud EMR', pageWidth - margin - 60, sigY + 13);

  // Footer note
  doc.setFontSize(7);
  doc.setTextColor(140, 155, 170);
  doc.text('Documento médico oficial generado bajo estándares de interoperabilidad y confidencialidad clínica.', margin, pageHeight - 10);

  return doc;
}

export function getSoapPdfBlob(options: GenerateSoapPdfOptions): Blob {
  const doc = generateSoapPdf(options);
  return doc.output('blob');
}

export function downloadSoapPdf(options: GenerateSoapPdfOptions): void {
  const doc = generateSoapPdf(options);
  const patientLastName = options.patient.last_name?.replace(/\s+/g, '_') || 'Paciente';
  const dateStr = new Date().toISOString().split('T')[0];
  doc.save(`Consulta_SOAP_${patientLastName}_${dateStr}.pdf`);
}
