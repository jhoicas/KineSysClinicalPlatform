import React from 'react';
import type { PacienteClinico } from '../../types';

function calcAge(birthDate?: string): number {
  if (!birthDate) return 0;
  const d = new Date(birthDate);
  if (Number.isNaN(d.getTime())) return 0;
  const today = new Date();
  let age = today.getFullYear() - d.getFullYear();
  const m = today.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < d.getDate())) age -= 1;
  return Math.max(0, age);
}

export interface IsakPatientHeaderProps {
  patient: PacienteClinico;
  evaluationNumber?: number;
  isakLevel?: string;
  sportActivity?: string;
  motivationQuote?: string;
  onSaveAndExit?: () => void;
  onStepNav?: (dir: 'prev' | 'next') => void;
  saving?: boolean;
}

export const IsakPatientHeader: React.FC<IsakPatientHeaderProps> = ({
  patient,
  evaluationNumber = 1,
  isakLevel = 'Certificación: ISAK Nivel 3',
  sportActivity = 'Actividad física regular',
  motivationQuote = '“La composición corporal es el lenguaje objetivo del progreso clínico.”',
  onSaveAndExit,
  onStepNav,
  saving,
}) => {
  const age = calcAge(patient.birth_date);
  const gender =
    patient.gender === 'female' ? 'Femenino' : patient.gender === 'male' ? 'Masculino' : 'Otro';
  const now = new Date();
  const dateLabel = now.toLocaleString('es-CO', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  return (
    <header className="rounded-3xl border border-slate-200/80 bg-white shadow-sm overflow-hidden">
      <div className="bg-gradient-to-r from-[#0a192f] via-[#0f2744] to-[#0284c7] px-5 py-4 text-white">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-4 min-w-0">
            <div className="w-14 h-14 rounded-2xl bg-white/15 border border-white/25 flex items-center justify-center text-lg font-black shrink-0">
              {(patient.first_name?.[0] || 'P').toUpperCase()}
              {(patient.last_name?.[0] || '').toUpperCase()}
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-black tracking-tight truncate">
                  {patient.first_name} {patient.last_name}
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-sky-400/20 border border-sky-300/30 text-[10px] font-bold">
                  {isakLevel}
                </span>
              </div>
              <p className="text-[11px] text-sky-100/90 mt-1 flex flex-wrap gap-x-3 gap-y-1">
                <span>ID: {patient.identifier_number || patient.id.slice(0, 8)}</span>
                <span>
                  {age ? `${age} años` : 'Edad —'} · {gender}
                </span>
                <span>{sportActivity}</span>
                <span>Evaluación #{evaluationNumber}</span>
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] text-sky-100/80 font-medium px-3 py-1.5 rounded-xl bg-white/10 border border-white/15">
              {dateLabel}
            </span>
            {onStepNav && (
              <>
                <button
                  type="button"
                  onClick={() => onStepNav('prev')}
                  className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold border border-white/15"
                >
                  ← Paso
                </button>
                <button
                  type="button"
                  onClick={() => onStepNav('next')}
                  className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold border border-white/15"
                >
                  Paso →
                </button>
              </>
            )}
            {onSaveAndExit && (
              <button
                type="button"
                onClick={onSaveAndExit}
                disabled={saving}
                className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white text-xs font-extrabold disabled:opacity-60 inline-flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-base">
                  {saving ? 'sync' : 'save'}
                </span>
                Guardar y salir
              </button>
            )}
          </div>
        </div>
      </div>
      <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex items-start gap-2">
        <span className="material-symbols-outlined text-[#0284c7] text-base mt-0.5">format_quote</span>
        <p className="text-xs text-slate-600 italic leading-relaxed">{motivationQuote}</p>
      </div>
    </header>
  );
};
