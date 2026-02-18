import React, { useMemo } from 'react';
import type { Vec2 } from '@/types';
import type { TrajectoryColorConfig } from '@/types/colors';
import { getColormapColor, buildOpacityLUT, sampleOpacityLUT } from '@/utils/colormaps';
import { rdpSimplify } from '@/utils/simplify';

interface SVGTrajectoryProps {
  points: Vec2[];
  colorConfig: TrajectoryColorConfig;
  scale: number;
  lineWidth?: number;
  maxSegments?: number;
  h: number;          // time step size, to compute age s
  viewTime: number;   // current view time t
  epsilon: number;    // decay rate from simulation params
  T: number;          // terminal simulation time
}

export const SVGTrajectory = React.memo(function SVGTrajectory({
  points,
  colorConfig,
  scale,
  lineWidth = 2,
  maxSegments = 5000,
  h,
  viewTime,
  epsilon,
  T,
}: SVGTrajectoryProps) {
  const strokeWidth = lineWidth / scale;

  const content = useMemo(() => {
    if (points.length < 2) return null;

    // Skip the first point (initial condition)
    const drawPoints = points.slice(1);
    if (drawPoints.length < 2) return null;

    const n = drawPoints.length;
    const hasOpacity = colorConfig.opacityExpression !== '1';

    // RDP simplification: tolerance is sub-pixel in world coordinates
    const tolerance = 0.25 / scale;
    const keptIndices = rdpSimplify(drawPoints, tolerance);

    // If solid color with no opacity variation, use single path
    if (colorConfig.mode === 'solid' && !hasOpacity) {
      const d = keptIndices.map((idx, i) => {
        const p = drawPoints[idx];
        return i === 0 ? `M${p.x},${p.y}` : `L${p.x},${p.y}`;
      }).join(' ');
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

    // Build opacity LUT if needed
    const sMin = 0;
    const sMax = viewTime;
    const opacityLUT = hasOpacity
      ? buildOpacityLUT(colorConfig.opacityExpression, sMin, sMax, epsilon, T, viewTime)
      : null;

    // Per-segment rendering (colormap or opacity formula)
    // Use kept indices from RDP simplification
    const segments: React.ReactElement[] = [];

    for (let k = 0; k < keptIndices.length - 1; k++) {
      const i = keptIndices[k];
      const j = keptIndices[k + 1];
      const paramT = i / (n - 1); // normalized position [0,1] for colormap

      // Color
      const color = colorConfig.mode === 'colormap'
        ? getColormapColor(colorConfig.colormap, paramT)
        : colorConfig.solidColor;

      // Opacity: s = age of this segment
      const segTime = (i + 1) * h;
      const s = viewTime - segTime;
      const opacity = opacityLUT
        ? sampleOpacityLUT(opacityLUT, s, sMin, sMax)
        : 1;

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
          opacity={opacity}
        />
      );
    }

    return <>{segments}</>;
  }, [points, colorConfig, strokeWidth, maxSegments, h, viewTime, epsilon, T, scale]);

  return <g>{content}</g>;
});
