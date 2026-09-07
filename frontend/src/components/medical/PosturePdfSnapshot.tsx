import React from 'react';
import type { PostureAssessment } from '../../types';
import { HumanBodyVisualizer } from './HumanBodyVisualizer';

interface PosturePdfSnapshotProps {
  posture: PostureAssessment;
  captureId?: string;
}

const PLANE_CAPTIONS = [
  {
    title: 'Vista Anterior',
    plane: 'Plano Coronal',
    detail: 'Hombros · EIAS · Rodillas (valgo/varo) · Tobillos',
  },
  {
    title: 'Vista Lateral',
    plane: 'Plano Sagital',
    detail: 'Cabeza · Lordosis C/L · Cifosis dorsal · Inclinación pélvica',
  },
  {
    title: 'Vista Posterior',
    plane: 'Plano Dorsal',
    detail: 'Escápulas · Columna (escoliosis) · Pliegues glúteos/poplíteos',
  },
] as const;

/**
 * Snapshot visual de alineación postural (3 vistas + plomada) para captura html2canvas.
 */
export const PosturePdfSnapshot = React.forwardRef<HTMLDivElement, PosturePdfSnapshotProps>(
  function PosturePdfSnapshot({ posture, captureId = 'kinesys-posture-pdf-capture' }, ref) {
    return (
      <div
        ref={ref}
        id={captureId}
        style={{
          width: 760,
          background: '#ffffff',
          padding: 18,
          borderRadius: 16,
          border: '1px solid #e2e8f0',
          boxSizing: 'border-box',
          fontFamily: 'Segoe UI, Roboto, Helvetica, Arial, sans-serif',
        }}
      >
        <p
          style={{
            margin: '0 0 6px',
            fontSize: 12,
            fontWeight: 900,
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            color: '#004870',
          }}
        >
          Valoración postural por planos anatómicos
        </p>
        <p style={{ margin: '0 0 12px', fontSize: 10, color: '#64748b', fontWeight: 600 }}>
          Tres vistas con líneas de plomada / ejes de referencia clínica
        </p>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr 1fr',
            gap: 8,
            marginBottom: 10,
          }}
        >
          {PLANE_CAPTIONS.map((cap) => (
            <div
              key={cap.title}
              style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: 10,
                padding: '8px 10px',
              }}
            >
              <div style={{ fontSize: 10, fontWeight: 800, color: '#0f172a' }}>{cap.title}</div>
              <div style={{ fontSize: 9, fontWeight: 700, color: '#004870', marginTop: 2 }}>
                {cap.plane}
              </div>
              <div style={{ fontSize: 8, color: '#64748b', marginTop: 3, lineHeight: 1.35 }}>
                {cap.detail}
              </div>
            </div>
          ))}
        </div>

        <HumanBodyVisualizer
          data={posture}
          activeView="all"
          hideToolbar
          hideCardWrapper
          showPlumbLine
          showAngles
          showGhostIdeal={false}
        />
      </div>
    );
  },
);
