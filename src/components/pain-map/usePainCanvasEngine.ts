import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  AnatomicalSegment,
  getSegmentsForSide,
  findSegmentById,
} from './anatomicalData';

export interface UsePainCanvasEngineProps {
  bodySide: 'front' | 'back';
  initialCoordinates?: { x: number; y: number };
  initialRegion?: string;
  onSelectLocation?: (data: {
    coordinates: { x: number; y: number };
    bodyRegion: string;
    segmentId?: string;
    bodySide: 'front' | 'back';
  }) => void;
}

export interface TransformState {
  scale: number;
  panX: number;
  panY: number;
}

export const SVG_VIEWBOX_WIDTH = 400;
export const SVG_VIEWBOX_HEIGHT = 720;

export function usePainCanvasEngine({
  bodySide,
  initialCoordinates = { x: 50, y: 36 },
  initialRegion = 'Zona Lumbar',
  onSelectLocation,
}: UsePainCanvasEngineProps) {
  // Navigation & Zoom State
  const [transform, setTransform] = useState<TransformState>({
    scale: 1,
    panX: 0,
    panY: 0,
  });

  // Selected Pin Coordinates & Region
  const [coordinates, setCoordinates] = useState<{ x: number; y: number }>(initialCoordinates);
  const [selectedRegion, setSelectedRegion] = useState<string>(initialRegion);
  const [selectedSegmentId, setSelectedSegmentId] = useState<string | null>(null);

  // Hover & Tooltip State
  const [hoveredSegment, setHoveredSegment] = useState<AnatomicalSegment | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null);

  // Interaction References
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const isDraggingRef = useRef(false);
  const startDragPosRef = useRef({ x: 0, y: 0 });
  const startTransformRef = useRef({ panX: 0, panY: 0 });
  const didDragRef = useRef(false);

  // Synchronize when initial changes
  useEffect(() => {
    if (initialCoordinates) {
      setCoordinates(initialCoordinates);
    }
  }, [initialCoordinates.x, initialCoordinates.y]);

  useEffect(() => {
    if (initialRegion) {
      setSelectedRegion(initialRegion);
    }
  }, [initialRegion]);

  // Convert Client / Mouse Coordinates to SVG & Normalized Percent Coordinates (0 - 100)
  const clientToSvgCoordinates = useCallback(
    (clientX: number, clientY: number) => {
      if (!svgRef.current) return null;

      const svg = svgRef.current;
      const pt = svg.createSVGPoint();
      pt.x = clientX;
      pt.y = clientY;

      // Inverse SVG transform matrix
      const screenCTM = svg.getScreenCTM();
      if (!screenCTM) return null;

      const svgPoint = pt.matrixTransform(screenCTM.inverse());

      // Clamp to viewBox
      const clampedX = Math.max(0, Math.min(SVG_VIEWBOX_WIDTH, svgPoint.x));
      const clampedY = Math.max(0, Math.min(SVG_VIEWBOX_HEIGHT, svgPoint.y));

      // Calculate normalized percentages (0 - 100%)
      const xPercent = Number(((clampedX / SVG_VIEWBOX_WIDTH) * 100).toFixed(1));
      const yPercent = Number(((clampedY / SVG_VIEWBOX_HEIGHT) * 100).toFixed(1));

      return {
        svgX: clampedX,
        svgY: clampedY,
        xPercent,
        yPercent,
      };
    },
    []
  );

  // Find nearest segment by spatial proximity fallback
  const findNearestSegment = useCallback(
    (xPercent: number, yPercent: number, side: 'front' | 'back') => {
      const segments = getSegmentsForSide(side);
      let closest = segments[0];
      let minDistance = Infinity;

      for (const seg of segments) {
        const dx = seg.defaultX - xPercent;
        const dy = seg.defaultY - yPercent;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < minDistance) {
          minDistance = dist;
          closest = seg;
        }
      }
      return closest;
    },
    []
  );

  // Select Location Handler
  const selectLocation = useCallback(
    (xPercent: number, yPercent: number, segment?: AnatomicalSegment) => {
      const activeSegment = segment || findNearestSegment(xPercent, yPercent, bodySide);
      const regionName = activeSegment ? activeSegment.name : 'Zona General';

      setCoordinates({ x: xPercent, y: yPercent });
      setSelectedRegion(regionName);
      setSelectedSegmentId(activeSegment?.id || null);

      if (onSelectLocation) {
        onSelectLocation({
          coordinates: { x: xPercent, y: yPercent },
          bodyRegion: regionName,
          segmentId: activeSegment?.id,
          bodySide,
        });
      }
    },
    [bodySide, findNearestSegment, onSelectLocation]
  );

  // Zoom Controls
  const zoomIn = useCallback(() => {
    setTransform((prev) => {
      const nextScale = Math.min(4, Number((prev.scale + 0.5).toFixed(1)));
      return { ...prev, scale: nextScale };
    });
  }, []);

  const zoomOut = useCallback(() => {
    setTransform((prev) => {
      const nextScale = Math.max(1, Number((prev.scale - 0.5).toFixed(1)));
      if (nextScale === 1) {
        return { scale: 1, panX: 0, panY: 0 };
      }
      return { ...prev, scale: nextScale };
    });
  }, []);

  const resetZoom = useCallback(() => {
    setTransform({ scale: 1, panX: 0, panY: 0 });
  }, []);

  const focusSegment = useCallback(
    (segmentId: string) => {
      const seg = findSegmentById(segmentId);
      if (!seg) return;

      // Focus and center on segment
      const targetScale = 2.4;
      const svgCenterX = SVG_VIEWBOX_WIDTH / 2;
      const svgCenterY = SVG_VIEWBOX_HEIGHT / 2;

      const segSvgX = (seg.defaultX / 100) * SVG_VIEWBOX_WIDTH;
      const segSvgY = (seg.defaultY / 100) * SVG_VIEWBOX_HEIGHT;

      const panX = (svgCenterX - segSvgX) * targetScale * 0.8;
      const panY = (svgCenterY - segSvgY) * targetScale * 0.8;

      setTransform({
        scale: targetScale,
        panX: Math.max(-250, Math.min(250, panX)),
        panY: Math.max(-350, Math.min(350, panY)),
      });

      selectLocation(seg.defaultX, seg.defaultY, seg);
    },
    [selectLocation]
  );

  // Mouse wheel zoom
  const handleWheel = useCallback((e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 0.2 : -0.2;

    setTransform((prev) => {
      const nextScale = Math.max(1, Math.min(4, Number((prev.scale + zoomFactor).toFixed(2))));
      if (nextScale === 1) {
        return { scale: 1, panX: 0, panY: 0 };
      }
      return {
        ...prev,
        scale: nextScale,
      };
    });
  }, []);

  // Mouse Down -> Start Drag / Pan
  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    // Only drag with primary mouse button
    if (e.button !== 0) return;

    isDraggingRef.current = true;
    didDragRef.current = false;
    startDragPosRef.current = { x: e.clientX, y: e.clientY };
    startTransformRef.current = { panX: transform.panX, panY: transform.panY };
  }, [transform.panX, transform.panY]);

  // Mouse Move -> Handle Pan & Hover Detection
  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      // 1. If Dragging
      if (isDraggingRef.current) {
        const dx = e.clientX - startDragPosRef.current.x;
        const dy = e.clientY - startDragPosRef.current.y;

        if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
          didDragRef.current = true;
          // Apply pan limits based on scale
          const maxPan = (transform.scale - 1) * 220;
          setTransform((prev) => ({
            ...prev,
            panX: Math.max(-maxPan, Math.min(maxPan, startTransformRef.current.panX + dx)),
            panY: Math.max(-maxPan * 1.5, Math.min(maxPan * 1.5, startTransformRef.current.panY + dy)),
          }));
        }
        return;
      }

      // 2. Update Tooltip Position
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setTooltipPos({
          x: e.clientX - rect.left,
          y: e.clientY - rect.top,
        });
      }
    },
    [transform.scale]
  );

  // Mouse Up -> End Drag
  const handleMouseUp = useCallback(() => {
    isDraggingRef.current = false;
  }, []);

  // Handle Segment Hover
  const handleSegmentMouseEnter = useCallback((segment: AnatomicalSegment) => {
    setHoveredSegment(segment);
  }, []);

  const handleSegmentMouseLeave = useCallback(() => {
    setHoveredSegment(null);
  }, []);

  // Handle Click on Segment Path (100% precision)
  const handleSegmentClick = useCallback(
    (e: React.MouseEvent, segment: AnatomicalSegment) => {
      e.stopPropagation();
      if (didDragRef.current) return;

      const coords = clientToSvgCoordinates(e.clientX, e.clientY);
      if (coords) {
        selectLocation(coords.xPercent, coords.yPercent, segment);
      } else {
        selectLocation(segment.defaultX, segment.defaultY, segment);
      }
    },
    [clientToSvgCoordinates, selectLocation]
  );

  // Handle Background Stage Click
  const handleStageClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (didDragRef.current) return;

      const coords = clientToSvgCoordinates(e.clientX, e.clientY);
      if (coords) {
        const nearest = findNearestSegment(coords.xPercent, coords.yPercent, bodySide);
        selectLocation(coords.xPercent, coords.yPercent, nearest);
      }
    },
    [bodySide, clientToSvgCoordinates, findNearestSegment, selectLocation]
  );

  return {
    // Refs
    containerRef,
    svgRef,

    // Navigation / Pan-Zoom State
    transform,
    zoomIn,
    zoomOut,
    resetZoom,
    focusSegment,

    // Selected Pin State
    coordinates,
    selectedRegion,
    selectedSegmentId,
    setCoordinates,
    setSelectedRegion,
    selectLocation,

    // Hover & Tooltip State
    hoveredSegment,
    tooltipPos,
    handleSegmentMouseEnter,
    handleSegmentMouseLeave,

    // Event Handlers for Container
    handleWheel,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleStageClick,
    handleSegmentClick,
  };
}
