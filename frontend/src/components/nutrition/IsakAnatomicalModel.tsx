import React, { useMemo, useState } from 'react';

export type IsakMeasureTab = 'pliegues' | 'perimetros' | 'diametros';

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
  /** % position on front silhouette */
  front?: { x: number; y: number };
  /** % position on back silhouette */
  back?: { x: number; y: number };
  guideHint: string;
  /** Unsplash / guide image */
  guideImage: string;
}

export const ISAK_NODES: IsakNodeDef[] = [
  {
    id: 'biceps',
    label: 'Bíceps',
    unit: 'mm',
    tab: 'pliegues',
    side: 'front',
    front: { x: 28, y: 34 },
    guideHint: 'Pliegue vertical en cara anterior del brazo',
    guideImage: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=400&q=80',
  },
  {
    id: 'triceps',
    label: 'Tríceps',
    unit: 'mm',
    tab: 'pliegues',
    side: 'back',
    back: { x: 28, y: 34 },
    guideHint: 'Pliegue vertical en cara posterior del brazo',
    guideImage: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=400&q=80',
  },
  {
    id: 'subscapular',
    label: 'Subescapular',
    unit: 'mm',
    tab: 'pliegues',
    side: 'back',
    back: { x: 42, y: 28 },
    guideHint: 'Pliegue oblicuo bajo el ángulo inferior de la escápula',
    guideImage: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400&q=80',
  },
  {
    id: 'iliac_crest',
    label: 'Cresta ilíaca',
    unit: 'mm',
    tab: 'pliegues',
    side: 'front',
    front: { x: 38, y: 48 },
    guideHint: 'Pliegue cerca de la cresta ilíaca media',
    guideImage: 'https://images.unsplash.com/photo-1576678927484-cc907957088c?w=400&q=80',
  },
  {
    id: 'suprailiac',
    label: 'Supraespinal',
    unit: 'mm',
    tab: 'pliegues',
    side: 'front',
    front: { x: 42, y: 46 },
    guideHint: 'Pliegue oblicuo en línea ilioaxilar',
    guideImage: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=400&q=80',
  },
  {
    id: 'abdominal',
    label: 'Abdominal',
    unit: 'mm',
    tab: 'pliegues',
    side: 'front',
    front: { x: 50, y: 44 },
    guideHint: 'Pliegue vertical a 5 cm lateral del ombligo',
    guideImage: 'https://images.unsplash.com/photo-1518611012118-696072aa579a?w=400&q=80',
  },
  {
    id: 'thigh_sf',
    label: 'Muslo',
    unit: 'mm',
    tab: 'pliegues',
    side: 'front',
    front: { x: 42, y: 62 },
    guideHint: 'Pliegue vertical en cara anterior del muslo',
    guideImage: 'https://images.unsplash.com/photo-1434682881908-b43d0467b798?w=400&q=80',
  },
  {
    id: 'calf_sf',
    label: 'Pierna',
    unit: 'mm',
    tab: 'pliegues',
    side: 'back',
    back: { x: 42, y: 78 },
    guideHint: 'Pliegue vertical en cara medial de la pierna',
    guideImage: 'https://images.unsplash.com/photo-1550345332-09e3ac987908?w=400&q=80',
  },
  {
    id: 'arm_relaxed',
    label: 'Brazo relajado',
    unit: 'cm',
    tab: 'perimetros',
    side: 'front',
    front: { x: 26, y: 36 },
    guideHint: 'Cinta en punto medio del brazo, relajado',
    guideImage: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=400&q=80',
  },
  {
    id: 'arm_flexed',
    label: 'Brazo contraído',
    unit: 'cm',
    tab: 'perimetros',
    side: 'front',
    front: { x: 74, y: 34 },
    guideHint: 'Perímetro máximo del bíceps en contracción',
    guideImage: 'https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?w=400&q=80',
  },
  {
    id: 'waist',
    label: 'Cintura',
    unit: 'cm',
    tab: 'perimetros',
    side: 'front',
    front: { x: 50, y: 42 },
    guideHint: 'Cinta en punto más estrecho / ombligo (protocolo clínico)',
    guideImage: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=400&q=80',
  },
  {
    id: 'hip',
    label: 'Cadera',
    unit: 'cm',
    tab: 'perimetros',
    side: 'front',
    front: { x: 50, y: 52 },
    guideHint: 'Máxima circunferencia glútea',
    guideImage: 'https://images.unsplash.com/photo-1576678927484-cc907957088c?w=400&q=80',
  },
  {
    id: 'thigh_cir',
    label: 'Muslo',
    unit: 'cm',
    tab: 'perimetros',
    side: 'front',
    front: { x: 58, y: 62 },
    guideHint: 'Perímetro medio del muslo',
    guideImage: 'https://images.unsplash.com/photo-1434682881908-b43d0467b798?w=400&q=80',
  },
  {
    id: 'calf_cir',
    label: 'Pierna',
    unit: 'cm',
    tab: 'perimetros',
    side: 'front',
    front: { x: 58, y: 78 },
    guideHint: 'Máxima circunferencia de pantorrilla',
    guideImage: 'https://images.unsplash.com/photo-1550345332-09e3ac987908?w=400&q=80',
  },
  {
    id: 'biacromial',
    label: 'Biacromial',
    unit: 'cm',
    tab: 'diametros',
    side: 'front',
    front: { x: 50, y: 22 },
    guideHint: 'Diámetro entre acromion derecho e izquierdo',
    guideImage: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=400&q=80',
  },
  {
    id: 'humerus',
    label: 'Húmero (biepicondilar)',
    unit: 'cm',
    tab: 'diametros',
    side: 'front',
    front: { x: 24, y: 42 },
    guideHint: 'Calibre óseo en epicóndilos humerales',
    guideImage: 'https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?w=400&q=80',
  },
  {
    id: 'femur',
    label: 'Fémur (biepicondilar)',
    unit: 'cm',
    tab: 'diametros',
    side: 'front',
    front: { x: 42, y: 68 },
    guideHint: 'Calibre óseo en epicóndilos femorales',
    guideImage: 'https://images.unsplash.com/photo-1518611012118-696072aa579a?w=400&q=80',
  },
];

const NODE_COLORS: Record<IsakMeasureTab, { fill: string; ring: string }> = {
  pliegues: { fill: '#0284c7', ring: 'ring-sky-400' },
  perimetros: { fill: '#10b981', ring: 'ring-emerald-400' },
  diametros: { fill: '#f97316', ring: 'ring-orange-400' },
};

interface IsakAnatomicalModelProps {
  activeTab: IsakMeasureTab;
  values: Partial<Record<IsakNodeId, number>>;
  selectedId: IsakNodeId | null;
  onSelect: (node: IsakNodeDef) => void;
  draftValue: string;
  onDraftChange: (v: string) => void;
  onSaveMeasure: () => void;
  onRepeatMeasure: () => void;
}

function BodySilhouette({
  view,
  nodes,
  values,
  selectedId,
  onSelect,
  flipped,
}: {
  view: 'front' | 'back';
  nodes: IsakNodeDef[];
  values: Partial<Record<IsakNodeId, number>>;
  selectedId: IsakNodeId | null;
  onSelect: (n: IsakNodeDef) => void;
  flipped: boolean;
}) {
  return (
    <div className="relative w-[200px] h-[380px] mx-auto">
      <svg
        viewBox="0 0 100 200"
        className="absolute inset-0 w-full h-full"
        style={{ transform: flipped ? 'scaleX(-1)' : undefined }}
      >
        <ellipse cx="50" cy="16" rx="11" ry="13" fill="#e2e8f0" stroke="#94a3b8" strokeWidth="1" />
        <rect x="46" y="28" width="8" height="7" fill="#e2e8f0" stroke="#94a3b8" strokeWidth="0.8" />
        <path
          d={
            view === 'front'
              ? 'M32 35 L68 35 L74 92 L62 128 L38 128 L26 92 Z'
              : 'M34 35 L66 35 L72 90 L60 128 L40 128 L28 90 Z'
          }
          fill="#f1f5f9"
          stroke="#64748b"
          strokeWidth="1.2"
        />
        <path d="M32 38 L16 88 L22 90 L36 52 Z" fill="#e2e8f0" stroke="#94a3b8" strokeWidth="0.8" />
        <path d="M68 38 L84 88 L78 90 L64 52 Z" fill="#e2e8f0" stroke="#94a3b8" strokeWidth="0.8" />
        <path d="M40 128 L36 185 L46 185 L48 128 Z" fill="#e2e8f0" stroke="#94a3b8" strokeWidth="0.8" />
        <path d="M52 128 L54 185 L64 185 L60 128 Z" fill="#e2e8f0" stroke="#94a3b8" strokeWidth="0.8" />
        {view === 'back' && (
          <line x1="50" y1="38" x2="50" y2="118" stroke="#94a3b8" strokeWidth="1" strokeDasharray="2 2" />
        )}
      </svg>

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
              selected ? `ring-2 ${colors.ring} scale-125 z-10` : ''
            }`}
            style={{
              left: `${pos.x}%`,
              top: `${pos.y}%`,
              backgroundColor: colors.fill,
              opacity: hasVal || selected ? 1 : 0.85,
            }}
          >
            {hasVal && (
              <span className="absolute -top-4 left-1/2 -translate-x-1/2 text-[8px] font-black text-slate-700 whitespace-nowrap bg-white/90 px-1 rounded">
                {values[node.id]}
              </span>
            )}
          </button>
        );
      })}

      <span className="absolute bottom-1 left-0 right-0 text-center text-[10px] font-bold uppercase tracking-wider text-slate-500">
        Vista {view === 'front' ? 'anterior' : 'posterior'}
      </span>
    </div>
  );
}

export const IsakAnatomicalModel: React.FC<IsakAnatomicalModelProps> = ({
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

  const visibleNodes = useMemo(
    () => ISAK_NODES.filter((n) => n.tab === activeTab),
    [activeTab],
  );

  const selected = ISAK_NODES.find((n) => n.id === selectedId) || null;
  const colors = NODE_COLORS[activeTab];

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-black text-slate-800">Modelo anatómico dual ISAK</h3>
          <p className="text-[11px] text-slate-500">
            Nodos{' '}
            <span style={{ color: colors.fill }} className="font-bold">
              {activeTab === 'pliegues' ? 'azules · pliegues' : activeTab === 'perimetros' ? 'verdes · perímetros' : 'naranjas · diámetros'}
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

      <div className="flex flex-col sm:flex-row items-center justify-center gap-4 py-2 bg-slate-50 rounded-2xl border border-slate-100">
        <BodySilhouette
          view="front"
          nodes={visibleNodes}
          values={values}
          selectedId={selectedId}
          onSelect={onSelect}
          flipped={flipped}
        />
        <BodySilhouette
          view="back"
          nodes={visibleNodes}
          values={values}
          selectedId={selectedId}
          onSelect={onSelect}
          flipped={flipped}
        />
      </div>

      {selected && (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 grid grid-cols-1 sm:grid-cols-[140px_1fr] gap-3 animate-in fade-in">
          <img
            src={selected.guideImage}
            alt={`Guía ${selected.label}`}
            className="w-full h-28 object-cover rounded-xl border border-slate-200"
          />
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
                value={draftValue}
                onChange={(e) => onDraftChange(e.target.value)}
                className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-400/40"
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
                className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-slate-700 text-xs font-bold hover:bg-slate-100"
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
