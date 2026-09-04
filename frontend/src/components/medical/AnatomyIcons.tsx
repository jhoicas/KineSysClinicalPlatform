import React from 'react';

const ANATOMY_KEYS = ['Cuello', 'Hombros', 'Codos', 'Muñecas', 'Tronco', 'Caderas', 'Rodillas', 'Tobillos'] as const;
type AnatomyKey = (typeof ANATOMY_KEYS)[number];

interface AnatomyIconProps {
  structure: string;
  className?: string;
  size?: number;
}

function resolveStructure(structure: string): AnatomyKey {
  const trimmed = structure.trim();
  const exact = ANATOMY_KEYS.find((k) => k.toLowerCase() === trimmed.toLowerCase());
  if (exact) return exact;

  const lower = trimmed
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  if (lower.includes('hombro')) return 'Hombros';
  if (lower.includes('cadera')) return 'Caderas';
  if (lower.includes('cuello')) return 'Cuello';
  if (lower.includes('codo')) return 'Codos';
  if (lower.includes('muneca') || lower.includes('carpo')) return 'Muñecas';
  if (lower.includes('tronco') || lower.includes('columna')) return 'Tronco';
  if (
    lower.includes('rodilla') ||
    lower.includes('cuadriceps') ||
    lower.includes('isquio')
  ) {
    return 'Rodillas';
  }
  if (lower.includes('tobillo') || lower.includes('gemelo') || lower.includes('pie')) {
    return 'Tobillos';
  }
  return 'Tronco';
}

export const AnatomyIcon: React.FC<AnatomyIconProps> = ({
  structure,
  className = 'w-14 h-14',
  size = 56,
}) => {
  const key = resolveStructure(structure);
  return (
    <div
      className={`rounded-full overflow-hidden bg-gradient-to-b from-slate-100 to-slate-200 border-2 border-slate-300/80 flex items-center justify-center p-1.5 shadow-sm shrink-0 ${className}`}
      style={{ width: size, height: size }}
    >
      {key === 'Cuello' && (
        <svg viewBox="0 0 64 64" className="w-full h-full text-slate-700">
          {/* Head & Cervical spine / trapezius */}
          <path d="M32 10 A12 12 0 0 1 44 22 C44 28 39 32 37 36 L48 54 L16 54 L27 36 C25 32 20 28 20 22 A12 12 0 0 1 32 10 Z" fill="#cbd5e1" stroke="#475569" strokeWidth="2" />
          {/* Cervical vertebrae highlight */}
          <path d="M32 30 L32 46" stroke="#d97706" strokeWidth="3" strokeLinecap="round" strokeDasharray="3 3" />
          {/* Trapezius lines */}
          <path d="M29 36 L20 48" stroke="#64748b" strokeWidth="1.5" />
          <path d="M35 36 L44 48" stroke="#64748b" strokeWidth="1.5" />
        </svg>
      )}

      {key === 'Hombros' && (
        <svg viewBox="0 0 64 64" className="w-full h-full text-slate-700">
          {/* Shoulders / Upper torso & Deltoids */}
          <path d="M32 16 L32 30 M24 20 Q32 24 40 20" stroke="#64748b" strokeWidth="1.5" />
          <path d="M22 22 C14 26 10 36 12 48 L22 46 C20 38 24 32 28 32 L36 32 C40 32 44 38 42 46 L52 48 C54 36 50 26 42 22 Z" fill="#cbd5e1" stroke="#475569" strokeWidth="2" />
          {/* Left deltoid muscle highlight */}
          <path d="M12 28 Q18 30 18 42" stroke="#d97706" strokeWidth="2.5" fill="none" strokeLinecap="round" />
          {/* Right deltoid muscle highlight */}
          <path d="M52 28 Q46 30 46 42" stroke="#d97706" strokeWidth="2.5" fill="none" strokeLinecap="round" />
        </svg>
      )}

      {key === 'Codos' && (
        <svg viewBox="0 0 64 64" className="w-full h-full text-slate-700">
          {/* Arm & elbow joint */}
          <path d="M18 16 L28 32 L46 36 L48 46 L24 42 L12 20 Z" fill="#cbd5e1" stroke="#475569" strokeWidth="2" />
          {/* Olecranon highlight */}
          <circle cx="27" cy="38" r="4.5" fill="#f59e0b" stroke="#b45309" strokeWidth="1.5" />
          <path d="M16 22 L24 34" stroke="#64748b" strokeWidth="1.5" />
          <path d="M28 38 L42 40" stroke="#64748b" strokeWidth="1.5" />
        </svg>
      )}

      {key === 'Muñecas' && (
        <svg viewBox="0 0 64 64" className="w-full h-full text-slate-700">
          {/* Forearm and wrist / hand bones */}
          <path d="M26 52 L26 38 L22 34 L22 20 L26 20 L26 32 L30 14 L34 14 L34 32 L38 16 L42 16 L42 32 L46 22 L49 24 L44 36 L38 38 L38 52 Z" fill="#cbd5e1" stroke="#475569" strokeWidth="1.5" />
          {/* Carpal zone highlight */}
          <rect x="25" y="36" width="14" height="6" rx="2" fill="#f59e0b" stroke="#b45309" strokeWidth="1" />
        </svg>
      )}

      {key === 'Tronco' && (
        <svg viewBox="0 0 64 64" className="w-full h-full text-slate-700">
          {/* Spine and ribcage / trunk */}
          <path d="M24 16 C16 26 18 42 22 52 L42 52 C46 42 48 26 40 16 Z" fill="#cbd5e1" stroke="#475569" strokeWidth="2" />
          {/* Vertebral column vertebrae */}
          <line x1="32" y1="14" x2="32" y2="52" stroke="#d97706" strokeWidth="3.5" strokeDasharray="3 3" />
          <path d="M26 24 Q32 26 38 24" stroke="#64748b" strokeWidth="1.5" fill="none" />
          <path d="M24 32 Q32 34 40 32" stroke="#64748b" strokeWidth="1.5" fill="none" />
          <path d="M25 40 Q32 42 39 40" stroke="#64748b" strokeWidth="1.5" fill="none" />
        </svg>
      )}

      {key === 'Caderas' && (
        <svg viewBox="0 0 64 64" className="w-full h-full text-slate-700">
          {/* Pelvis and hip joints */}
          <path d="M16 24 C14 36 22 42 26 42 C30 42 30 36 32 36 C34 36 34 42 38 42 C42 42 50 36 48 24 C44 20 38 20 32 24 C26 20 20 20 16 24 Z" fill="#cbd5e1" stroke="#475569" strokeWidth="2" />
          {/* Left femoral head */}
          <circle cx="20" cy="38" r="4.5" fill="#f59e0b" stroke="#b45309" strokeWidth="1.5" />
          {/* Right femoral head */}
          <circle cx="44" cy="38" r="4.5" fill="#f59e0b" stroke="#b45309" strokeWidth="1.5" />
          <line x1="20" y1="42" x2="18" y2="54" stroke="#475569" strokeWidth="3" strokeLinecap="round" />
          <line x1="44" y1="42" x2="46" y2="54" stroke="#475569" strokeWidth="3" strokeLinecap="round" />
        </svg>
      )}

      {key === 'Rodillas' && (
        <svg viewBox="0 0 64 64" className="w-full h-full text-slate-700">
          {/* Femur, patella, tibia */}
          <path d="M28 12 L36 12 L38 26 L42 30 L40 52 L36 52 L36 38 L28 38 L28 52 L24 52 L22 30 L26 26 Z" fill="#cbd5e1" stroke="#475569" strokeWidth="1.5" />
          {/* Patella bone */}
          <ellipse cx="32" cy="31" rx="5.5" ry="6" fill="#f59e0b" stroke="#b45309" strokeWidth="1.5" />
          {/* Joint space line */}
          <line x1="24" y1="36" x2="40" y2="36" stroke="#475569" strokeWidth="1.5" strokeDasharray="2 2" />
        </svg>
      )}

      {key === 'Tobillos' && (
        <svg viewBox="0 0 64 64" className="w-full h-full text-slate-700">
          {/* Lower leg & ankle / foot */}
          <path d="M26 14 L34 14 L35 34 L48 40 L50 48 L22 48 L20 42 L25 34 Z" fill="#cbd5e1" stroke="#475569" strokeWidth="2" />
          {/* Lateral/Medial Malleolus highlight */}
          <circle cx="29" cy="36" r="4" fill="#f59e0b" stroke="#b45309" strokeWidth="1.5" />
          {/* Achilles tendon line */}
          <path d="M22 28 L20 42" stroke="#64748b" strokeWidth="2" />
        </svg>
      )}
    </div>
  );
};
