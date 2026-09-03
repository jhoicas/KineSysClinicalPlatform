import React from 'react';
import { PostureAssessment, PostureLandmark } from '../../types';

interface PostureDashboardProps {
  data: PostureAssessment;
}

// ── severity helpers ──────────────────────────────────────────────────────────

function severityDot(severity: string) {
  switch (severity) {
    case 'normal':   return 'bg-emerald-500';
    case 'leve':     return 'bg-amber-400';
    case 'moderada': return 'bg-orange-500';
    case 'marcada':  return 'bg-red-500';
    default:         return 'bg-outline-variant/30';
  }
}

function severityLabel(severity: string) {
  switch (severity) {
    case 'normal':   return 'Normal';
    case 'leve':     return 'Leve';
    case 'moderada': return 'Moderada';
    case 'marcada':  return 'Marcada';
    default:         return null;
  }
}

function severityTextColor(severity: string) {
  switch (severity) {
    case 'normal':   return 'text-emerald-700';
    case 'leve':     return 'text-amber-700';
    case 'moderada': return 'text-orange-700';
    case 'marcada':  return 'text-red-700';
    default:         return 'text-on-surface-variant';
  }
}

// ── landmark row ──────────────────────────────────────────────────────────────

const LandmarkRow: React.FC<{ lm: PostureLandmark }> = ({ lm }) => {
  const label = severityLabel(lm.severity);
  if (!label) return null;
  return (
    <li className="flex items-center gap-2 py-0.5">
      <span className={`w-2 h-2 rounded-full shrink-0 ${severityDot(lm.severity)}`} />
      <span className="text-xs text-on-surface font-semibold flex-1">{lm.landmark}</span>
      <span className={`text-[11px] font-bold ${severityTextColor(lm.severity)}`}>{label}</span>
    </li>
  );
};

// ── view card ─────────────────────────────────────────────────────────────────

const ViewCard: React.FC<{ title: string; icon: string; landmarks: PostureLandmark[] }> = ({
  title, icon, landmarks,
}) => {
  const findings = landmarks.filter((lm) => !!lm.severity);
  const normal   = findings.filter((lm) => lm.severity === 'normal').length;
  const altered  = findings.filter((lm) => lm.severity && lm.severity !== 'normal').length;

  return (
    <div className="rounded-2xl border border-outline-variant/20 bg-surface-container-low p-4 space-y-3 flex-1">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className="material-symbols-outlined text-primary text-base">{icon}</span>
          <h5 className="text-[11px] font-black uppercase tracking-wider text-on-surface">{title}</h5>
        </div>
        <div className="flex gap-1.5">
          {altered > 0 && (
            <span className="text-[10px] font-bold bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded-full">
              {altered} hal.
            </span>
          )}
          {normal > 0 && (
            <span className="text-[10px] font-bold bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded-full">
              {normal} ok
            </span>
          )}
        </div>
      </div>

      {findings.length === 0 ? (
        <p className="text-[11px] text-on-surface-variant italic">Sin valoración registrada.</p>
      ) : (
        <ul className="space-y-0.5">
          {findings.map((lm) => <LandmarkRow key={lm.landmark} lm={lm} />)}
        </ul>
      )}
    </div>
  );
};

// ── silhouette SVG ────────────────────────────────────────────────────────────

const BodySilhouette: React.FC = () => (
  <svg
    viewBox="0 0 80 200"
    className="w-full max-w-[80px] mx-auto"
    fill="none"
    aria-label="Silueta anatómica"
  >
    {/* head */}
    <ellipse cx="40" cy="18" rx="12" ry="14" fill="#e2e8f0" stroke="#cbd5e1" strokeWidth="1.5" />
    {/* neck */}
    <rect x="36" y="30" width="8" height="10" rx="2" fill="#e2e8f0" stroke="#cbd5e1" strokeWidth="1.2" />
    {/* torso */}
    <path d="M22 40 Q18 56 20 80 L60 80 Q62 56 58 40 Z" fill="#e2e8f0" stroke="#cbd5e1" strokeWidth="1.5" />
    {/* left arm */}
    <path d="M22 42 Q10 55 12 80" stroke="#cbd5e1" strokeWidth="6" strokeLinecap="round" fill="none" />
    {/* right arm */}
    <path d="M58 42 Q70 55 68 80" stroke="#cbd5e1" strokeWidth="6" strokeLinecap="round" fill="none" />
    {/* pelvis */}
    <path d="M20 80 Q18 92 20 98 L60 98 Q62 92 60 80 Z" fill="#d1d5db" stroke="#cbd5e1" strokeWidth="1.5" />
    {/* left leg */}
    <path d="M30 98 Q26 130 28 165" stroke="#cbd5e1" strokeWidth="7" strokeLinecap="round" fill="none" />
    {/* right leg */}
    <path d="M50 98 Q54 130 52 165" stroke="#cbd5e1" strokeWidth="7" strokeLinecap="round" fill="none" />
    {/* left foot */}
    <ellipse cx="27" cy="168" rx="7" ry="4" fill="#cbd5e1" />
    {/* right foot */}
    <ellipse cx="53" cy="168" rx="7" ry="4" fill="#cbd5e1" />

    {/* spine line hint */}
    <line x1="40" y1="38" x2="40" y2="98" stroke="#6366f1" strokeWidth="1" strokeDasharray="3 2" opacity="0.5" />
    {/* shoulder line hint */}
    <line x1="22" y1="46" x2="58" y2="46" stroke="#6366f1" strokeWidth="0.8" strokeDasharray="2 2" opacity="0.4" />
    {/* hip line hint */}
    <line x1="22" y1="88" x2="58" y2="88" stroke="#6366f1" strokeWidth="0.8" strokeDasharray="2 2" opacity="0.4" />
  </svg>
);

// ── legend ────────────────────────────────────────────────────────────────────

const LEGEND = [
  { color: 'bg-emerald-500', label: 'Normal' },
  { color: 'bg-amber-400',   label: 'Leve' },
  { color: 'bg-orange-500',  label: 'Moderada' },
  { color: 'bg-red-500',     label: 'Marcada' },
];

// ── main component ────────────────────────────────────────────────────────────

export const PostureDashboard: React.FC<PostureDashboardProps> = ({ data }) => {
  // count total altered landmarks across all views
  const allLandmarks = [
    ...data.anterior.landmarks,
    ...data.lateral.landmarks,
    ...data.posterior.landmarks,
  ];
  const totalAltered = allLandmarks.filter((lm) => lm.severity && lm.severity !== 'normal').length;

  return (
    <div className="bg-surface-container-lowest rounded-3xl border border-outline-variant/30 p-5 clinical-shadow space-y-4">
      {/* header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-primary text-xl">accessibility_new</span>
          <h3 className="text-sm font-extrabold text-on-surface">Valoración Postural</h3>
        </div>
        {totalAltered > 0 && (
          <span className="text-[11px] font-black px-2.5 py-0.5 bg-orange-100 text-orange-700 rounded-full">
            {totalAltered} hallazgo{totalAltered !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* legend */}
      <div className="flex flex-wrap gap-3">
        {LEGEND.map(({ color, label }) => (
          <span key={label} className="flex items-center gap-1.5 text-[10px] font-bold text-on-surface-variant">
            <span className={`w-2.5 h-2.5 rounded-full ${color}`} />
            {label}
          </span>
        ))}
      </div>

      {/* two-column layout: findings (left) + silhouette (right) */}
      <div className="flex gap-4 items-start">
        {/* views list */}
        <div className="flex-1 space-y-3">
          <ViewCard title="Anterior" icon="face" landmarks={data.anterior.landmarks} />
          <ViewCard title="Lateral"  icon="person" landmarks={data.lateral.landmarks} />
          <ViewCard title="Posterior" icon="person_outline" landmarks={data.posterior.landmarks} />
        </div>

        {/* silhouette */}
        <div className="w-24 shrink-0 flex flex-col items-center gap-3 pt-2">
          <BodySilhouette />
          <p className="text-[9px] font-bold uppercase tracking-wider text-on-surface-variant text-center">
            Ref. anatómica
          </p>
        </div>
      </div>

      {/* concepto postural */}
      {data.concepto && (
        <div className="rounded-2xl bg-surface-container-low border border-outline-variant/20 px-4 py-3">
          <p className="text-[11px] font-black uppercase tracking-wider text-on-surface-variant mb-1">
            Concepto postural
          </p>
          <p className="text-xs text-on-surface leading-relaxed">{data.concepto}</p>
        </div>
      )}
    </div>
  );
};
