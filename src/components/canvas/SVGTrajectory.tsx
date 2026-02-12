import React, { useMemo } from 'react';
import type { Vec2 } from '@/types';
import type { TrajectoryColorConfig } from '@/types/colors';
import { getColormapColor } from '@/utils/colormaps';

interface SVGTrajectoryProps {
  points: Vec2[];
  colorConfig: TrajectoryColorConfig;
  scale: number;
  lineWidth?: number;
  maxSegments?: number;
}

export const SVGTrajectory = React.memo(function SVGTrajectory({
  points,
  colorConfig,
  scale,
  lineWidth = 2,
  maxSegments = 5000,
}: SVGTrajectoryProps) {
  const strokeWidth = lineWidth / scale;

  const content = useMemo(() => {
    if (points.length < 2) return null;

    // Skip the first point (initial condition)
    const drawPoints = points.slice(1);
    if (drawPoints.length < 2) return null;

    if (colorConfig.mode === 'solid') {
      // Single polyline for solid color
      const d = drawPoints.map((p, i) =>
        i === 0 ? `M${p.x},${p.y}` : `L${p.x},${p.y}`
      ).join(' ');
      return (
        <path
          d={d}
          fill="none"
          stroke={colorConfig.solidColor}
          strokeWidth={strokeWidth}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      );
    }

    // Colormap mode: individual segments
    const n = drawPoints.length;
    const step = n > maxSegments ? Math.ceil(n / maxSegments) : 1;
    const segments: React.ReactElement[] = [];

    for (let i = 0; i < n - 1; i += step) {
      const j = Math.min(i + step, n - 1);
      const t = i / (n - 1);
      const color = getColormapColor(colorConfig.colormap, t);
      segments.push(
        <line
          key={i}
          x1={drawPoints[i].x}
          y1={drawPoints[i].y}
          x2={drawPoints[j].x}
          y2={drawPoints[j].y}
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />
      );
    }

    return <>{segments}</>;
  }, [points, colorConfig, strokeWidth, maxSegments]);

  return <g>{content}</g>;
});
