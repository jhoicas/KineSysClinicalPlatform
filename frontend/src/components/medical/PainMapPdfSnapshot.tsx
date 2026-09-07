import React from 'react';
import type { PainObservation } from '../../types';
import { getSegmentsForSide } from '../pain-map/anatomicalData';
import { SVG_VIEWBOX_WIDTH, SVG_VIEWBOX_HEIGHT } from '../pain-map/usePainCanvasEngine';
import { groupPainBySide, painLevelHex } from '../../utils/painMapCapture';

interface PainMapPdfSnapshotProps {
  observations: PainObservation[];
  captureId?: string;
}

const FRONT_SILHOUETTE =
  'M 200,20 C 235,20 235,65 220,95 L 230,120 C 255,120 275,135 275,160 C 275,210 260,250 280,265 C 310,325 310,360 295,385 C 285,370 280,330 260,250 L 245,170 C 245,260 240,290 240,330 C 255,420 255,540 260,650 C 275,680 230,705 230,650 L 220,490 C 215,440 205,350 200,345 C 195,350 185,440 180,490 L 170,650 C 170,705 125,680 140,650 C 145,540 145,420 160,330 C 160,290 155,260 155,170 L 140,250 C 120,330 115,370 105,385 C 90,360 90,325 120,265 C 140,250 125,210 125,160 C 125,135 145,120 170,120 L 180,95 C 165,65 165,20 200,20 Z';

const BACK_SILHOUETTE =
  'M 200,20 C 235,20 235,65 215,85 L 265,135 C 275,155 270,185 260,195 L 280,265 C 310,325 310,360 295,385 C 285,370 280,330 260,250 L 240,165 C 240,260 245,330 245,335 C 255,420 255,540 260,640 C 270,685 230,700 230,640 L 220,495 C 215,440 205,350 200,350 C 195,350 185,440 180,495 L 170,640 C 170,700 130,685 140,640 C 145,540 145,420 155,335 C 155,330 160,260 160,165 L 140,250 C 120,330 115,370 105,385 C 90,360 90,325 120,265 L 140,195 C 130,185 125,155 135,135 L 185,85 C 165,65 165,20 200,20 Z';

function AnatomicalSideView({
  side,
  points,
}: {
  side: 'front' | 'back';
  points: PainObservation[];
}) {
  const segments = getSegmentsForSide(side);
  const silhouette = side === 'front' ? FRONT_SILHOUETTE : BACK_SILHOUETTE;

  return (
    <div className="flex flex-col items-center" style={{ width: 280 }}>
      <p
        style={{
          margin: '0 0 8px',
          fontSize: 11,
          fontWeight: 800,
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
          color: '#0f766e',
        }}
      >
        {side === 'front' ? 'Vista anterior' : 'Vista posterior'}
      </p>
      <div
        style={{
          width: 260,
          height: 468,
          background: '#f8fafc',
          border: '1px solid #e2e8f0',
          borderRadius: 16,
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        <svg
          viewBox={`0 0 ${SVG_VIEWBOX_WIDTH} ${SVG_VIEWBOX_HEIGHT}`}
          width="260"
          height="468"
          style={{ display: 'block' }}
        >
          <defs>
            <linearGradient id={`body-grad-${side}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#f1f5f9" />
              <stop offset="100%" stopColor="#e2e8f0" />
            </linearGradient>
          </defs>

          <path
            d={silhouette}
            fill={`url(#body-grad-${side})`}
            stroke="#94a3b8"
            strokeWidth="1.5"
            opacity="0.45"
          />

          {segments.map((segment) => (
            <path
              key={segment.id}
              d={segment.path}
              fill="#f8fafc"
              stroke="#94a3b8"
              strokeWidth="1.15"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          ))}

          {side === 'front' ? (
            <g stroke="#0f766e" strokeOpacity="0.28" strokeWidth="1" strokeDasharray="2 3" fill="none">
              <line x1="200" y1="120" x2="200" y2="340" />
              <line x1="165" y1="120" x2="235" y2="120" />
              <circle cx="165" cy="470" r="10" />
              <circle cx="235" cy="470" r="10" />
            </g>
          ) : (
            <g stroke="#0f766e" strokeOpacity="0.35" strokeWidth="1.2" fill="none">
              <line x1="200" y1="85" x2="200" y2="340" />
              <path d="M 165,140 Q 185,160 170,180" />
              <path d="M 235,140 Q 215,160 230,180" />
              <circle cx="165" cy="470" r="9" />
              <circle cx="235" cy="470" r="9" />
            </g>
          )}

          {/* Marcadores EVA "n/10" — círculos cromáticos (fiables con html2canvas) */}
          {points.map((obs) => {
            const cx = (Math.min(95, Math.max(5, obs.coordinates_x)) / 100) * SVG_VIEWBOX_WIDTH;
            const cy = (Math.min(95, Math.max(5, obs.coordinates_y)) / 100) * SVG_VIEWBOX_HEIGHT;
            const fill = painLevelHex(obs.pain_level);
            return (
              <g key={obs.id}>
                <circle cx={cx} cy={cy} r="20" fill={fill} opacity="0.22" />
                <circle
                  cx={cx}
                  cy={cy}
                  r="15"
                  fill={fill}
                  stroke="#ffffff"
                  strokeWidth="2.5"
                />
                <text
                  x={cx}
                  y={cy + 1}
                  textAnchor="middle"
                  fill="#ffffff"
                  fontSize="9"
                  fontWeight="800"
                  fontFamily="Segoe UI, Roboto, Helvetica, Arial, sans-serif"
                >
                  {obs.pain_level}/10
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}

/**
 * Lienzo de captura para PDF: siluetas anatómicas reales (mismos paths que PainCanvas)
 * + marcadores EVA numerados en coordenadas clínicas.
 */
export const PainMapPdfSnapshot = React.forwardRef<HTMLDivElement, PainMapPdfSnapshotProps>(
  function PainMapPdfSnapshot({ observations, captureId = 'kinesys-pain-map-capture' }, ref) {
    const { front, back } = groupPainBySide(observations);

    return (
      <div
        ref={ref}
        id={captureId}
        style={{
          width: 620,
          background: '#ffffff',
          padding: 20,
          borderRadius: 16,
          border: '1px solid #e2e8f0',
          fontFamily: 'Segoe UI, Roboto, Helvetica, Arial, sans-serif',
          boxSizing: 'border-box',
        }}
      >
        <p
          style={{
            margin: '0 0 14px',
            fontSize: 13,
            fontWeight: 900,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: '#004870',
          }}
        >
          Mapa anatómico corporal de dolor (EVA)
        </p>

        <div style={{ display: 'flex', gap: 24, justifyContent: 'center' }}>
          <AnatomicalSideView side="front" points={front} />
          <AnatomicalSideView side="back" points={back} />
        </div>

        <div
          style={{
            marginTop: 14,
            display: 'flex',
            flexWrap: 'wrap',
            gap: 8,
            justifyContent: 'center',
          }}
        >
          {[
            { label: 'EVA 1–3 Leve', color: '#22c55e' },
            { label: 'EVA 4–6 Moderado', color: '#f97316' },
            { label: 'EVA 7–10 Severo', color: '#ef4444' },
          ].map((item) => (
            <span
              key={item.label}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                fontSize: 10,
                fontWeight: 700,
                color: '#475569',
                background: '#f1f5f9',
                borderRadius: 999,
                padding: '4px 10px',
              }}
            >
              <span
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: '50%',
                  background: item.color,
                  display: 'inline-block',
                }}
              />
              {item.label}
            </span>
          ))}
        </div>

        {observations.length === 0 ? (
          <p style={{ marginTop: 12, textAlign: 'center', fontSize: 11, color: '#94a3b8' }}>
            Sin puntos de dolor registrados en el expediente.
          </p>
        ) : (
          <div style={{ marginTop: 12 }}>
            {observations.slice(0, 10).map((obs) => (
              <div
                key={obs.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  fontSize: 10,
                  color: '#334155',
                  marginBottom: 4,
                }}
              >
                <span
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: '50%',
                    background: painLevelHex(obs.pain_level),
                    flexShrink: 0,
                  }}
                />
                <strong>{obs.body_region}</strong>
                <span style={{ color: '#94a3b8' }}>·</span>
                <span>
                  EVA {obs.pain_level}/10 ({obs.body_side === 'front' ? 'anterior' : 'posterior'})
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  },
);
