import { useRef, useCallback, useEffect } from 'react';
import { useSimulationStore } from '@/store';
import { DEFAULT_SCALE } from '@/constants/defaults';
import { getColormapColor } from '@/utils/colormaps';
import { SVGGrid } from './SVGGrid';
import { SVGConstraint } from './SVGConstraint';
import { SVGTrajectory } from './SVGTrajectory';
import { SVGMarkers } from './SVGMarkers';
import type { Vec2 } from '@/types';

interface SVGSimulationCanvasProps {
  width?: number;
  height?: number;
}

export function SVGSimulationCanvas({ width = 500, height = 500 }: SVGSimulationCanvasProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const isDragging = useRef(false);
  const isDragLocked = useRef(false);

  const scale = DEFAULT_SCALE;

  const {
    boundaryPolygon,
    constraintAngle,
    trajectory,
    preProjection,
    classicalTrajectory,
    constraintCenters,
    constraintAngles,
    trajectoryMode,
    dragPosition,
    setDragPosition,
    viewStep,
    colorConfig,
    showPastConstraints,
    pastConstraintTimes,
    pastConstraintColormap,
    params,
  } = useSimulationStore();

  // Screen to world
  const screenToWorld = useCallback(
    (screenX: number, screenY: number): Vec2 => ({
      x: (screenX - width / 2) / scale,
      y: -(screenY - height / 2) / scale,
    }),
    [scale, width, height]
  );

  // Get SVG-local coordinates from pointer event
  const getLocalCoords = useCallback(
    (e: React.PointerEvent<SVGSVGElement>): Vec2 => {
      const svg = svgRef.current;
      if (!svg) return { x: 0, y: 0 };
      const rect = svg.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      return screenToWorld(x, y);
    },
    [screenToWorld]
  );

  // Pointer event handlers
  const handlePointerDown = useCallback(
    (e: React.PointerEvent<SVGSVGElement>) => {
      const { trajectoryMode: mode } = useSimulationStore.getState();
      if (mode !== 'free-drag') return;

      const pos = getLocalCoords(e);

      if (e.shiftKey) {
        isDragLocked.current = !isDragLocked.current;
        if (isDragLocked.current) {
          setDragPosition(pos);
        }
      } else {
        isDragLocked.current = false;
        isDragging.current = true;
        setDragPosition(pos);
      }
    },
    [getLocalCoords, setDragPosition]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<SVGSVGElement>) => {
      const { trajectoryMode: mode } = useSimulationStore.getState();
      if (mode !== 'free-drag') return;
      if (!isDragging.current && !isDragLocked.current) return;

      const pos = getLocalCoords(e);
      setDragPosition(pos);
    },
    [getLocalCoords, setDragPosition]
  );

  const handlePointerUp = useCallback(() => {
    isDragging.current = false;
  }, []);

  // Mouse wheel rotation handler (needs native event for preventDefault)
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;

    const handleWheel = (event: WheelEvent) => {
      event.preventDefault();
      const { constraintAngle, setConstraintAngle } = useSimulationStore.getState();
      const delta = event.deltaY > 0 ? 0.05 : -0.05;
      setConstraintAngle(constraintAngle + delta);
    };

    svg.addEventListener('wheel', handleWheel, { passive: false });
    return () => svg.removeEventListener('wheel', handleWheel);
  }, []);

  // Compute the view slice based on viewStep
  const effectiveStep = Math.min(viewStep, trajectory.length);
  const delayedSlice = trajectory.slice(0, effectiveStep);
  const classicalSlice = classicalTrajectory.slice(0, effectiveStep);
  const preProjectionSlice = preProjection.slice(0, effectiveStep);

  // Current constraint center and angle
  let currentCenter: Vec2;
  if (trajectoryMode === 'free-drag') {
    currentCenter = dragPosition;
  } else if (effectiveStep > 0 && constraintCenters.length >= effectiveStep) {
    currentCenter = constraintCenters[effectiveStep - 1];
  } else {
    currentCenter = { x: 2, y: 0 };
  }

  const currentAngle =
    effectiveStep > 0 && constraintAngles.length >= effectiveStep
      ? constraintAngles[effectiveStep - 1]
      : constraintAngle;

  // Current markers
  const delayedMarker = delayedSlice.length > 0 ? delayedSlice[delayedSlice.length - 1] : null;
  const classicalMarker = classicalSlice.length > 0 ? classicalSlice[classicalSlice.length - 1] : null;
  const xBarMarker = preProjectionSlice.length > 0 ? preProjectionSlice[preProjectionSlice.length - 1] : null;

  // Past constraints
  const pastConstraints = showPastConstraints
    ? pastConstraintTimes
        .map((t, idx) => {
          const step = Math.round(t / params.h);
          if (step < 0 || step >= constraintCenters.length) return null;
          const center = constraintCenters[step];
          const angle = constraintAngles[step] ?? 0;
          const colorT = pastConstraintTimes.length > 1 ? idx / (pastConstraintTimes.length - 1) : 0.5;
          const color = getColormapColor(pastConstraintColormap, colorT);
          const opacity = 0.3 + 0.5 * (1 - colorT); // older = more transparent
          return { center, angle, color, opacity, key: `past-${step}` };
        })
        .filter(Boolean)
    : [];

  return (
    <svg
      ref={svgRef}
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      style={{
        touchAction: 'none',
        cursor: trajectoryMode === 'free-drag' ? 'grab' : 'default',
        background: '#ffffff',
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
    >
      <g transform={`translate(${width / 2},${height / 2}) scale(${scale},${-scale})`}>
        <SVGGrid scale={scale} width={width} height={height} />

        {/* Past constraints */}
        {pastConstraints.map((pc) =>
          pc ? (
            <SVGConstraint
              key={pc.key}
              polygon={boundaryPolygon}
              center={pc.center}
              angle={pc.angle}
              scale={scale}
              color={pc.color}
              opacity={pc.opacity}
            />
          ) : null
        )}

        {/* Current constraint */}
        <SVGConstraint
          polygon={boundaryPolygon}
          center={currentCenter}
          angle={currentAngle}
          scale={scale}
        />

        {/* Classical trajectory */}
        <SVGTrajectory
          points={classicalSlice}
          colorConfig={colorConfig.classicalTrajectory}
          scale={scale}
          lineWidth={1.5}
        />

        {/* Delayed trajectory */}
        <SVGTrajectory
          points={delayedSlice}
          colorConfig={colorConfig.delayedTrajectory}
          scale={scale}
        />

        {/* Markers */}
        <SVGMarkers
          delayed={delayedMarker}
          classical={classicalMarker}
          xBar={xBarMarker}
          colors={colorConfig.markers}
          scale={scale}
        />
      </g>
    </svg>
  );
}
