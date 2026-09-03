import React from 'react';
import { PostureAssessment, PostureLandmark } from '../../types';
import { HumanBodyVisualizer } from './HumanBodyVisualizer';

interface PostureDashboardProps {
  data: PostureAssessment;
}

function severityDot(severity: string) {
  switch (severity) {
    case 'normal':
      return 'bg-emerald-500';
    case 'leve':
      return 'bg-amber-400';
    case 'moderada':
      return 'bg-orange-500';
    case 'marcada':
      return 'bg-red-500';
    default:
      return 'bg-blue-500';
  }
}

function severityLabel(severity: string) {
  switch (severity) {
    case 'normal':
      return 'Normal';
    case 'leve':
      return 'Leve';
    case 'moderada':
      return 'Moderada';
    case 'marcada':
      return 'Marcada';
    default:
      return null;
  }
}

const LandmarkRow: React.FC<{ lm: PostureLandmark }> = ({ lm }) => {
  const hasFinding = Boolean(lm.finding?.trim());
  const label = severityLabel(lm.severity);
  if (!hasFinding && !label) return null;
  return (
    <li className="flex items-center gap-2 py-0.5">
      <span className={`w-2 h-2 rounded-full shrink-0 ${severityDot(lm.severity)}`} />
      <span className="text-xs text-on-surface font-semibold flex-1">
        {lm.landmark}
        {hasFinding ? `: ${lm.finding}` : ''}
      </span>
      {label && (
        <span className="text-[11px] font-bold text-on-surface-variant">{label}</span>
      )}
    </li>
  );
};

const ViewCard: React.FC<{ title: string; landmarks: PostureLandmark[] }> = ({ title, landmarks }) => {
  const findings = landmarks.filter((lm) => Boolean(lm.finding?.trim()) || Boolean(lm.severity));
  return (
    <div className="rounded-2xl border border-outline-variant/20 bg-surface-container-low p-3 space-y-2">
      <h5 className="text-[11px] font-black uppercase tracking-wider text-on-surface">{title}</h5>
      {findings.length === 0 ? (
        <p className="text-[11px] text-on-surface-variant italic">Sin valoración registrada.</p>
      ) : (
        <ul className="space-y-0.5">
          {findings.map((lm) => (
            <LandmarkRow key={lm.landmark} lm={lm} />
          ))}
        </ul>
      )}
    </div>
  );
};

export const PostureDashboard: React.FC<PostureDashboardProps> = ({ data }) => {
  const allLandmarks = [
    ...data.anterior.landmarks,
    ...data.lateral.landmarks,
    ...data.posterior.landmarks,
  ];
  const totalAltered = allLandmarks.filter(
    (lm) => (lm.finding && lm.finding.trim()) || (lm.severity && lm.severity !== 'normal')
  ).length;

  return (
    <div className="bg-surface-container-lowest rounded-3xl border border-outline-variant/30 p-5 clinical-shadow space-y-4">
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

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <ViewCard title="Anterior" landmarks={data.anterior.landmarks} />
        <ViewCard title="Lateral" landmarks={data.lateral.landmarks} />
        <ViewCard title="Posterior" landmarks={data.posterior.landmarks} />
      </div>

      <HumanBodyVisualizer data={data} activeView="all" hideCardWrapper />

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
