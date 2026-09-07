import React from 'react';
import type { PostureAssessment } from '../../types';
import { HumanBodyVisualizer } from './HumanBodyVisualizer';

interface PosturePdfSnapshotProps {
  posture: PostureAssessment;
  captureId?: string;
}

/**
 * Snapshot visual de alineación postural (3 vistas) para captura html2canvas.
 */
export const PosturePdfSnapshot = React.forwardRef<HTMLDivElement, PosturePdfSnapshotProps>(
  function PosturePdfSnapshot({ posture, captureId = 'kinesys-posture-pdf-capture' }, ref) {
    return (
      <div
        ref={ref}
        id={captureId}
        style={{
          width: 720,
          background: '#ffffff',
          padding: 16,
          borderRadius: 16,
          border: '1px solid #e2e8f0',
          boxSizing: 'border-box',
        }}
      >
        <p
          style={{
            margin: '0 0 10px',
            fontSize: 12,
            fontWeight: 900,
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            color: '#004870',
          }}
        >
          Alineación postural — vistas anterior, lateral y posterior
        </p>
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
