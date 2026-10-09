// Supabase Edge Function: send-patient-document
// Deno TypeScript runtime with Resend / SMTP integration

import { corsHeaders, jsonResponse, optionsResponse } from '../_shared/cors.ts';

interface SendDocumentPayload {
  to_email: string;
  patient_name: string;
  document_type:
    | 'Plan Nutricional'
    | 'Informe Nutricional Integral'
    | 'Evaluación Antropométrica'
    | 'Historia Clínica'
    | 'Receta Médica'
    | string;
  subject?: string;
  pdf_base64: string;
  filename?: string;
  clinic_name?: string;
  clinic_phone?: string;
  clinic_email?: string;
  nutritionist_name?: string;
  primary_color?: string;
  custom_message?: string;
  tenant_id?: string;
  report_summary?: ReportSummary;
}

interface ReportSummary {
  patientName?: string;
  isak?: {
    date: string; fatPct: number; fatMassKg: number; fatFreeMassKg: number;
    whr: number; somatotype: string; equation: string;
  } | null;
  withings?: {
    date: string; weightKg: number; bmi: number; fatPct: number;
    muscleKg: number; hydrationKg: number; visceral: number;
  } | null;
  plan?: {
    name: string; objective: string; targetKcal: number; plannedKcal: number;
    proteinG: number; carbsG: number; fatsG: number; meals: number; hydrationLiters: number;
  } | null;
}

const escapeHtml = (v: unknown): string =>
  String(v ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const safeColor = (v: string): string => (/^#[0-9a-fA-F]{6}$/.test(v) ? v : '#004870');
const n = (v: unknown, d = 1): string => {
  const x = Number(v);
  return Number.isFinite(x) && x !== 0 ? String(Math.round(x * 10 ** d) / 10 ** d) : '-';
};

function summaryBlock(title: string, color: string, rows: [string, string][]): string {
  const cells = rows
    .map(
      ([k, v]) => `
        <td style="padding:8px 6px;text-align:center;border-right:1px solid #e2e8f0;">
          <div style="font-size:10px;letter-spacing:.06em;text-transform:uppercase;color:#64748b;">${escapeHtml(k)}</div>
          <div style="font-size:16px;font-weight:700;color:#0f172a;margin-top:2px;">${escapeHtml(v)}</div>
        </td>`,
    )
    .join('');
  return `
    <tr><td style="padding:0 32px 18px;">
      <div style="border:1px solid #e2e8f0;border-radius:14px;overflow:hidden;">
        <div style="background:${color}1a;padding:10px 16px;font-size:12px;font-weight:700;letter-spacing:.05em;text-transform:uppercase;color:${color};">${escapeHtml(title)}</div>
        <table width="100%" cellpadding="0" cellspacing="0"><tr>${cells}</tr></table>
      </div>
    </td></tr>`;
}

function buildSummaryHtml(s: ReportSummary | undefined, color: string): string {
  if (!s) return '';
  const blocks: string[] = [];
  if (s.isak) {
    blocks.push(
      summaryBlock(`1 · Antropometría ISAK · ${s.isak.date}`, color, [
        ['% Grasa', `${n(s.isak.fatPct)} %`],
        ['Masa grasa', `${n(s.isak.fatMassKg)} kg`],
        ['Masa libre', `${n(s.isak.fatFreeMassKg)} kg`],
        ['Cintura/cadera', n(s.isak.whr, 2)],
        ['Somatotipo', s.isak.somatotype || '-'],
      ]),
    );
  }
  if (s.withings) {
    blocks.push(
      summaryBlock(`2 · Withings Body Scan · ${s.withings.date}`, '#0f766e', [
        ['Peso', `${n(s.withings.weightKg)} kg`],
        ['IMC', n(s.withings.bmi)],
        ['% Grasa', `${n(s.withings.fatPct)} %`],
        ['Músculo', `${n(s.withings.muscleKg)} kg`],
        ['Grasa visceral', n(s.withings.visceral, 0)],
      ]),
    );
  }
  if (s.plan) {
    blocks.push(
      summaryBlock(`3 · Plan dietético TCA 2018 · ${s.plan.objective || s.plan.name}`, '#b45309', [
        ['Meta', `${n(s.plan.targetKcal, 0)} kcal`],
        ['Proteína', `${n(s.plan.proteinG, 0)} g`],
        ['Carbohidratos', `${n(s.plan.carbsG, 0)} g`],
        ['Grasas', `${n(s.plan.fatsG, 0)} g`],
        ['Comidas', String(s.plan.meals)],
      ]),
    );
  }
  return blocks.join('');
}

Deno.serve(async (req: Request) => {
  // Preflight CORS — respuesta limpia con corsHeaders antes de auth/JWT
  if (req.method === 'OPTIONS') {
    return optionsResponse();
  }

  if (req.method !== 'POST') {
    return jsonResponse({ success: false, error: 'Method not allowed' }, 405);
  }

  try {
    const payload: SendDocumentPayload = await req.json();

    const {
      to_email,
      patient_name,
      document_type = 'Plan Nutricional',
      subject = `Tu ${document_type} - ${payload.clinic_name || 'KineSys Salud'}`,
      pdf_base64,
      filename = `${document_type.replace(/\s+/g, '_')}_${Date.now()}.pdf`,
      clinic_name = 'KineSys Salud & Centro Clínico',
      clinic_phone = '+56 9 8765 4321',
      clinic_email = 'contacto@kinesys.health',
      nutritionist_name = 'Equipo de Nutrición Clínica',
      primary_color = '#004870',
      custom_message,
    } = payload;

    if (!to_email || !to_email.includes('@')) {
      return jsonResponse(
        {
          success: false,
          error: 'Dirección de correo electrónico inválida o no provista.',
        },
        400,
      );
    }

    if (!pdf_base64) {
      return jsonResponse(
        {
          success: false,
          error: 'El archivo PDF en Base64 es requerido para el envío.',
        },
        400,
      );
    }

    // Resend exige Base64 puro (sin prefijo data:application/pdf;base64,)
    const attachmentContent = pdf_base64.includes(',')
      ? pdf_base64.split(',')[1]
      : pdf_base64;

    const brand = safeColor(primary_color);
    const summaryHtml = buildSummaryHtml(payload.report_summary, brand);

    const emailHtml = `
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${escapeHtml(subject)}</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #1e293b;">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 30px auto; background-color: #ffffff; border-radius: 20px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
          <tr>
            <td style="background-color: ${brand}; padding: 28px 32px;">
              <p style="margin: 0; font-size: 12px; letter-spacing: 0.08em; text-transform: uppercase; color: rgba(255,255,255,0.85);">KineSys Clinical Platform</p>
              <h1 style="margin: 8px 0 0; font-size: 22px; color: #ffffff;">${escapeHtml(clinic_name)}</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 32px;">
              <p style="margin: 0 0 12px; font-size: 16px;">Hola <strong>${escapeHtml(patient_name || 'paciente')}</strong>,</p>
              <p style="margin: 0 0 16px; font-size: 14px; line-height: 1.6; color: #475569;">
                ${custom_message ? escapeHtml(custom_message) : `Te compartimos tu documento clínico: <strong>${escapeHtml(document_type)}</strong>.`}
              </p>
              <p style="margin: 0 0 8px; font-size: 13px; color: #64748b;">
                Preparado por: <strong>${escapeHtml(nutritionist_name)}</strong>
              </p>
              <p style="margin: 0; font-size: 12px; color: #94a3b8;">
                El informe completo en PDF va adjunto a este correo. Conserva este mensaje para tu historial.
              </p>
            </td>
          </tr>
          ${summaryHtml}
          <tr>
            <td style="background-color: #f1f5f9; padding: 20px 32px; border-top: 1px solid #e2e8f0;">
              <p style="margin: 0 0 6px; font-size: 12px; color: #64748b;">
                Teléfono: ${escapeHtml(clinic_phone)} • Email: ${escapeHtml(clinic_email)}
              </p>
              <p style="margin: 0; font-size: 10px; color: #94a3b8;">
                Este correo contiene información médica y nutricional confidencial destinada únicamente al paciente indicado.
              </p>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;

    const resendApiKey = Deno.env.get('RESEND_API_KEY');

    if (!resendApiKey) {
      return jsonResponse(
        {
          success: false,
          error: 'RESEND_API_KEY no está configurada en el entorno de Supabase.',
        },
        500,
      );
    }

    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'KineSys Clinical Platform <noresponder@clinicalplatform.ludoia.com>',
        to: [to_email],
        subject,
        html: emailHtml,
        attachments: [
          {
            filename,
            content: attachmentContent,
          },
        ],
      }),
    });

    const responseData = await resendResponse.json();

    if (!resendResponse.ok) {
      return jsonResponse({ success: false, error: responseData }, 400);
    }

    return jsonResponse(
      {
        success: true,
        messageId: responseData.id || `resend_${Date.now()}`,
        recipient: to_email,
        eco_impact: { paper_saved_sheets: 2, water_saved_liters: 20 },
      },
      200,
    );
  } catch (error: unknown) {
    console.error('[send-patient-document] Error processing request:', error);
    const message =
      error instanceof Error ? error.message : 'Error interno al enviar el documento por correo.';
    return jsonResponse({ success: false, error: message }, 500);
  }
});

export { corsHeaders };
