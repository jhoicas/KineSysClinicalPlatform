import React, { useMemo, useState } from 'react';

export type IsakMeasureTab = 'pliegues' | 'perimetros' | 'diametros';
export type PatientSex = 'male' | 'female' | 'other';

export type IsakNodeId =
  | 'biceps'
  | 'triceps'
  | 'subscapular'
  | 'iliac_crest'
  | 'suprailiac'
  | 'abdominal'
  | 'thigh_sf'
  | 'calf_sf'
  | 'arm_relaxed'
  | 'arm_flexed'
  | 'waist'
  | 'hip'
  | 'thigh_cir'
  | 'calf_cir'
  | 'biacromial'
  | 'humerus'
  | 'femur';

export interface IsakNodeDef {
  id: IsakNodeId;
  label: string;
  unit: 'mm' | 'cm';
  tab: IsakMeasureTab;
  side: 'front' | 'back' | 'both';
  front?: { x: number; y: number };
  back?: { x: number; y: number };
  guideHint: string;
  guideImage: string;
  instrument: 'plicometro' | 'cinta' | 'calibre';
}

export const ISAK_NODES: IsakNodeDef[] = [
  {
    id: 'biceps',
    label: 'Bíceps',
    unit: 'mm',
    tab: 'pliegues',
    side: 'front',
    front: { x: 29, y: 33 },
    guideHint: 'Pliegue vertical en cara anterior del brazo (plicómetro)',
    guideImage: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=480&q=80',
    instrument: 'plicometro',
  },
  {
    id: 'triceps',
    label: 'Tríceps',
    unit: 'mm',
    tab: 'pliegues',
    side: 'back',
    back: { x: 29, y: 33 },
    guideHint: 'Pliegue vertical en cara posterior del brazo',
    guideImage: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=480&q=80',
    instrument: 'plicometro',
  },
  {
    id: 'subscapular',
    label: 'Subescapular',
    unit: 'mm',
    tab: 'pliegues',
    side: 'back',
    back: { x: 41, y: 27 },
    guideHint: 'Pliegue oblicuo bajo el ángulo inferior de la escápula',
    guideImage: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=480&q=80',
    instrument: 'plicometro',
  },
  {
    id: 'iliac_crest',
    label: 'Cresta ilíaca',
    unit: 'mm',
    tab: 'pliegues',
    side: 'front',
    front: { x: 37, y: 47 },
    guideHint: 'Pliegue cerca de la cresta ilíaca media',
    guideImage: 'https://images.unsplash.com/photo-1576678927484-cc907957088c?w=480&q=80',
    instrument: 'plicometro',
  },
  {
    id: 'suprailiac',
    label: 'Supraespinal',
    unit: 'mm',
    tab: 'pliegues',
    side: 'front',
    front: { x: 41, y: 45 },
    guideHint: 'Pliegue oblicuo en línea ilioaxilar (supraespinal ISAK)',
    guideImage: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=480&q=80',
    instrument: 'plicometro',
  },
  {
    id: 'abdominal',
    label: 'Abdominal',
    unit: 'mm',
    tab: 'pliegues',
    side: 'front',
    front: { x: 50, y: 43 },
    guideHint: 'Pliegue vertical ~5 cm lateral al ombligo',
    guideImage: 'https://images.unsplash.com/photo-1518611012118-696072aa579a?w=480&q=80',
    instrument: 'plicometro',
  },
  {
    id: 'thigh_sf',
    label: 'Muslo',
    unit: 'mm',
    tab: 'pliegues',
    side: 'front',
    front: { x: 41, y: 61 },
    guideHint: 'Pliegue vertical en cara anterior del muslo',
    guideImage: 'https://images.unsplash.com/photo-1434682881908-b43d0467b798?w=480&q=80',
    instrument: 'plicometro',
  },
  {
    id: 'calf_sf',
    label: 'Pierna',
    unit: 'mm',
    tab: 'pliegues',
    side: 'back',
    back: { x: 41, y: 77 },
    guideHint: 'Pliegue vertical en cara medial de la pierna',
    guideImage: 'https://images.unsplash.com/photo-1550345332-09e3ac987908?w=480&q=80',
    instrument: 'plicometro',
  },
  {
    id: 'arm_relaxed',
    label: 'Brazo relajado',
    unit: 'cm',
    tab: 'perimetros',
    side: 'front',
    front: { x: 26, y: 35 },
    guideHint: 'Cinta antropométrica en punto medio del brazo',
    guideImage: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=480&q=80',
    instrument: 'cinta',
  },
  {
    id: 'arm_flexed',
    label: 'Brazo contraído',
    unit: 'cm',
    tab: 'perimetros',
    side: 'front',
    front: { x: 74, y: 33 },
    guideHint: 'Perímetro máximo del bíceps en contracción',
    guideImage: 'https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?w=480&q=80',
    instrument: 'cinta',
  },
  {
    id: 'waist',
    label: 'Cintura',
    unit: 'cm',
    tab: 'perimetros',
    side: 'front',
    front: { x: 50, y: 41 },
    guideHint: 'Cinta en punto más estrecho / ombligo',
    guideImage: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=480&q=80',
    instrument: 'cinta',
  },
  {
    id: 'hip',
    label: 'Cadera',
    unit: 'cm',
    tab: 'perimetros',
    side: 'front',
    front: { x: 50, y: 52 },
    guideHint: 'Máxima circunferencia glútea',
    guideImage: 'https://images.unsplash.com/photo-1576678927484-cc907957088c?w=480&q=80',
    instrument: 'cinta',
  },
  {
    id: 'thigh_cir',
    label: 'Muslo',
    unit: 'cm',
    tab: 'perimetros',
    side: 'front',
    front: { x: 58, y: 61 },
    guideHint: 'Perímetro medio del muslo',
    guideImage: 'https://images.unsplash.com/photo-1434682881908-b43d0467b798?w=480&q=80',
    instrument: 'cinta',
  },
  {
    id: 'calf_cir',
    label: 'Pierna',
    unit: 'cm',
    tab: 'perimetros',
    side: 'front',
    front: { x: 58, y: 77 },
    guideHint: 'Máxima circunferencia de pantorrilla',
    guideImage: 'https://images.unsplash.com/photo-1550345332-09e3ac987908?w=480&q=80',
    instrument: 'cinta',
  },
  {
    id: 'biacromial',
    label: 'Biacromial',
    unit: 'cm',
    tab: 'diametros',
    side: 'front',
    front: { x: 50, y: 21 },
    guideHint: 'Calibre óseo entre acromion derecho e izquierdo',
    guideImage: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=480&q=80',
    instrument: 'calibre',
  },
  {
    id: 'humerus',
    label: 'Húmero (biepicondilar)',
    unit: 'cm',
    tab: 'diametros',
    side: 'front',
    front: { x: 24, y: 41 },
    guideHint: 'Calibre óseo en epicóndilos humerales',
    guideImage: 'https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?w=480&q=80',
    instrument: 'calibre',
  },
  {
    id: 'femur',
    label: 'Fémur (biepicondilar)',
    unit: 'cm',
    tab: 'diametros',
    side: 'front',
    front: { x: 41, y: 67 },
    guideHint: 'Calibre óseo en epicóndilos femorales',
    guideImage: 'https://images.unsplash.com/photo-1518611012118-696072aa579a?w=480&q=80',
    instrument: 'calibre',
  },
];

const NODE_COLORS: Record<IsakMeasureTab, { fill: string; ring: string; label: string }> = {
  pliegues: { fill: '#0284c7', ring: 'ring-sky-400', label: 'azules · pliegues' },
  perimetros: { fill: '#10b981', ring: 'ring-emerald-400', label: 'verdes · perímetros' },
  diametros: { fill: '#f97316', ring: 'ring-orange-400', label: 'naranjas · diámetros' },
};

function GenderedSilhouetteSvg({
  view,
  sex,
  flipped,
}: {
  view: 'front' | 'back';
  sex: PatientSex;
  flipped: boolean;
}) {
  const female = sex === 'female';
  // Proporciones: mujer → hombros más estrechos / cadera más ancha; hombre → definición muscular
  const shoulder = female ? 30 : 26;
  const hip = female ? 26 : 32;
  const torsoTop = `M${shoulder} 34 L${100 - shoulder} 34`;
  const torso =
    view === 'front'
      ? `M${shoulder} 34 L${100 - shoulder} 34 L${100 - hip + 6} 92 L${100 - hip} 128 L${hip} 128 L${hip - 6} 92 Z`
      : `M${shoulder + 2} 34 L${100 - shoulder - 2} 34 L${100 - hip + 4} 90 L${100 - hip} 128 L${hip} 128 L${hip - 4} 90 Z`;

  return (
    <svg
      viewBox="0 0 100 200"
      className="absolute inset-0 w-full h-full"
      style={{ transform: flipped ? 'scaleX(-1)' : undefined }}
    >
      <defs>
        <linearGradient id={`skin-${view}-${sex}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={female ? '#fce7f3' : '#e2e8f0'} />
          <stop offset="100%" stopColor={female ? '#fbcfe8' : '#cbd5e1'} />
        </linearGradient>
      </defs>

      {/* Cabeza */}
      <ellipse
        cx="50"
        cy={female ? 15 : 16}
        rx={female ? 10 : 11}
        ry={female ? 12 : 13}
        fill={`url(#skin-${view}-${sex})`}
        stroke="#64748b"
        strokeWidth="1"
      />
      <rect x="46" y="27" width="8" height="7" fill={`url(#skin-${view}-${sex})`} stroke="#64748b" strokeWidth="0.7" />

      {/* Torso */}
      <path d={torso} fill={`url(#skin-${view}-${sex})`} stroke="#475569" strokeWidth="1.15" />

      {/* Brazos */}
      <path
        d={`M${shoulder} 37 L${shoulder - 16} 88 L${shoulder - 10} 90 L${shoulder + 4} 50 Z`}
        fill={`url(#skin-${view}-${sex})`}
        stroke="#64748b"
        strokeWidth="0.8"
      />
      <path
        d={`M${100 - shoulder} 37 L${100 - shoulder + 16} 88 L${100 - shoulder + 10} 90 L${100 - shoulder - 4} 50 Z`}
        fill={`url(#skin-${view}-${sex})`}
        stroke="#64748b"
        strokeWidth="0.8"
      />

      {/* Piernas */}
      <path
        d={`M${hip} 128 L${hip - 4} 186 L${hip + 8} 186 L${hip + 10} 128 Z`}
        fill={`url(#skin-${view}-${sex})`}
        stroke="#64748b"
        strokeWidth="0.8"
      />
      <path
        d={`M${100 - hip - 10} 128 L${100 - hip - 8} 186 L${100 - hip + 4} 186 L${100 - hip} 128 Z`}
        fill={`url(#skin-${view}-${sex})`}
        stroke="#64748b"
        strokeWidth="0.8"
      />

      {/* Definición muscular masculina */}
      {!female && view === 'front' && (
        <g stroke="#64748b" strokeWidth="0.7" fill="none" opacity="0.55">
          <path d="M38 40 Q50 48 62 40" />
          <path d="M40 52 Q50 58 60 52" />
          <path d="M42 62 Q50 68 58 62" />
          <path d="M44 72 L44 88 M56 72 L56 88" />
          <ellipse cx="36" cy="38" rx="5" ry="7" />
          <ellipse cx="64" cy="38" rx="5" ry="7" />
          <path d="M40 130 Q44 150 42 170" />
          <path d="M60 130 Q56 150 58 170" />
        </g>
      )}
      {!female && view === 'back' && (
        <g stroke="#64748b" strokeWidth="0.7" fill="none" opacity="0.55">
          <line x1="50" y1="36" x2="50" y2="118" strokeDasharray="2 2" />
          <path d="M38 42 Q45 55 40 70" />
          <path d="M62 42 Q55 55 60 70" />
          <path d="M42 78 Q50 86 58 78" />
          <ellipse cx="40" cy="48" rx="6" ry="8" />
          <ellipse cx="60" cy="48" rx="6" ry="8" />
        </g>
      )}

      {/* Silueta femenina: cintura marcada */}
      {female && view === 'front' && (
        <g stroke="#db2777" strokeWidth="0.55" fill="none" opacity="0.35">
          <path d="M40 40 Q50 44 60 40" />
          <path d="M38 70 Q50 66 62 70" />
        </g>
      )}
      {female && view === 'back' && (
        <line x1="50" y1="36" x2="50" y2="118" stroke="#94a3b8" strokeWidth="0.8" strokeDasharray="2 2" opacity="0.5" />
      )}

      <path d={torsoTop} stroke="transparent" fill="none" />
    </svg>
  );
}

function BodyPanel({
  view,
  sex,
  nodes,
  values,
  selectedId,
  onSelect,
  flipped,
}: {
  view: 'front' | 'back';
  sex: PatientSex;
  nodes: IsakNodeDef[];
  values: Partial<Record<IsakNodeId, number>>;
  selectedId: IsakNodeId | null;
  onSelect: (n: IsakNodeDef) => void;
  flipped: boolean;
}) {
  return (
    <div className="relative w-[210px] h-[400px] mx-auto">
      <GenderedSilhouetteSvg view={view} sex={sex} flipped={flipped} />
      {nodes.map((node) => {
        const pos = view === 'front' ? node.front : node.back;
        if (!pos) return null;
        const colors = NODE_COLORS[node.tab];
        const hasVal = values[node.id] != null && values[node.id]! > 0;
        const selected = selectedId === node.id;
        return (
          <button
            key={`${view}-${node.id}`}
            type="button"
            title={node.label}
            onClick={() => onSelect(node)}
            className={`absolute w-5 h-5 -ml-2.5 -mt-2.5 rounded-full border-2 border-white shadow-md transition-transform hover:scale-125 ${
              selected ? `ring-2 ${colors.ring} scale-125 z-20` : ''
            }`}
            style={{
              left: `${pos.x}%`,
              top: `${pos.y}%`,
              backgroundColor: colors.fill,
              opacity: hasVal || selected ? 1 : 0.88,
            }}
          >
            {hasVal && (
              <span className="absolute -top-4 left-1/2 -translate-x-1/2 text-[8px] font-black text-slate-700 whitespace-nowrap bg-white/95 px-1 rounded shadow-sm">
                {values[node.id]}
              </span>
            )}
          </button>
        );
      })}
      <span className="absolute bottom-1 left-0 right-0 text-center text-[10px] font-bold uppercase tracking-wider text-slate-500">
        Vista {view === 'front' ? 'anterior' : 'posterior'} · {sex === 'female' ? '♀' : '♂'}
      </span>
    </div>
  );
}

interface IsakAnatomicalModelProps {
  gender: PatientSex;
  activeTab: IsakMeasureTab;
  values: Partial<Record<IsakNodeId, number>>;
  selectedId: IsakNodeId | null;
  onSelect: (node: IsakNodeDef) => void;
  draftValue: string;
  onDraftChange: (v: string) => void;
  onSaveMeasure: () => void;
  onRepeatMeasure: () => void;
}

export const IsakAnatomicalModel: React.FC<IsakAnatomicalModelProps> = ({
  gender,
  activeTab,
  values,
  selectedId,
  onSelect,
  draftValue,
  onDraftChange,
  onSaveMeasure,
  onRepeatMeasure,
}) => {
  const [flipped, setFlipped] = useState(false);
  const sex: PatientSex = gender === 'female' ? 'female' : 'male';

  const visibleNodes = useMemo(
    () => ISAK_NODES.filter((n) => n.tab === activeTab),
    [activeTab],
  );

  const selected = ISAK_NODES.find((n) => n.id === selectedId) || null;
  const colors = NODE_COLORS[activeTab];

  const instrumentLabel =
    selected?.instrument === 'plicometro'
      ? 'Plicómetro'
      : selected?.instrument === 'cinta'
        ? 'Cinta métrica'
        : 'Calibre óseo';

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm space-y-3 relative">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-black text-slate-800">Modelo anatómico dual ISAK</h3>
          <p className="text-[11px] text-slate-500">
            Silueta {sex === 'female' ? 'femenina' : 'masculina'} · nodos{' '}
            <span style={{ color: colors.fill }} className="font-bold">
              {colors.label}
            </span>
          </p>
        </div>
        <button
          type="button"
          onClick={() => setFlipped((f) => !f)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700"
        >
          <span className="material-symbols-outlined text-base">rotate_right</span>
          Rotar modelo
        </button>
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-center gap-4 py-2 bg-[#f8fafc] rounded-2xl border border-slate-100">
        <BodyPanel
          view="front"
          sex={sex}
          nodes={visibleNodes}
          values={values}
          selectedId={selectedId}
          onSelect={onSelect}
          flipped={flipped}
        />
        <BodyPanel
          view="back"
          sex={sex}
          nodes={visibleNodes}
          values={values}
          selectedId={selectedId}
          onSelect={onSelect}
          flipped={flipped}
        />
      </div>

      {/* Popover / tarjeta flotante de medición */}
      {selected && (
        <div className="rounded-2xl border border-slate-200 bg-white shadow-lg p-3 grid grid-cols-1 sm:grid-cols-[150px_1fr] gap-3 ring-1 ring-slate-100">
          <div className="relative">
            <img
              src={selected.guideImage}
              alt={`Guía ${selected.label}`}
              className="w-full h-32 object-cover rounded-xl border border-slate-200"
            />
            <span className="absolute bottom-2 left-2 px-2 py-0.5 rounded-lg bg-[#0a192f]/90 text-white text-[9px] font-bold">
              {instrumentLabel}
            </span>
          </div>
          <div className="space-y-2">
            <div>
              <p className="text-xs font-black text-slate-800">{selected.label}</p>
              <p className="text-[11px] text-slate-500">{selected.guideHint}</p>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="number"
                step="0.1"
                min={0}
                autoFocus
                value={draftValue}
                onChange={(e) => onDraftChange(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') onSaveMeasure();
                }}
                className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-400/40"
                placeholder={`Medida (${selected.unit})`}
              />
              <span className="text-xs font-bold text-slate-500 w-8">{selected.unit}</span>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={onSaveMeasure}
                className="px-3 py-1.5 rounded-xl bg-[#0284c7] hover:bg-sky-600 text-white text-xs font-extrabold"
              >
                Guardar medida
              </button>
              <button
                type="button"
                onClick={onRepeatMeasure}
                className="px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-700 text-xs font-bold hover:bg-slate-100"
              >
                Repetir medición
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
