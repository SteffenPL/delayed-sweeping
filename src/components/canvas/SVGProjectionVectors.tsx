import React, { useMemo } from 'react';
import type { Vec2 } from '@/types';
import type { TrajectoryColorConfig } from '@/types/colors';
import { getColormapColor, evaluateOpacity } from '@/utils/colormaps';

interface SVGProjectionVectorsProps {
  trajectory: Vec2[];       // z[n] - projected positions
  preProjection: Vec2[];    // z̄[n] - weighted averages
  snapshotTimes: number[];  // times at which to draw vectors
  colorConfig: TrajectoryColorConfig;
  scale: number;
  lineWidth?: number;
  h: number;
  viewTime: number;
  effectiveStep: number;
  epsilon: number;
  T: number;
}

export const SVGProjectionVectors = React.memo(function SVGProjectionVectors({
  trajectory,
  preProjection,
  snapshotTimes,
  colorConfig,
  scale,
  lineWidth = 1.5,
  h,
  viewTime,
  effectiveStep,
  epsilon,
  T,
}: SVGProjectionVectorsProps) {
  const strokeWidth = lineWidth / scale;
  const arrowSize = (3 * lineWidth) / scale;

  const content = useMemo(() => {
    if (trajectory.length < 1 || preProjection.length < 1) return null;

    const elements: React.ReactElement[] = [];
    const validTimes = snapshotTimes.filter((time) => {
      const step = Math.round(time / h);
      return step >= 0 && step < effectiveStep && step < trajectory.length && step < preProjection.length;
    });

    if (validTimes.length === 0) return null;

    for (let idx = 0; idx < validTimes.length; idx++) {
      const time = validTimes[idx];
      const step = Math.round(time / h);

      const zBar = preProjection[step];
      const z = trajectory[step];

      const dx = z.x - zBar.x;
      const dy = z.y - zBar.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Color based on normalized index
      const colorT = validTimes.length > 1 ? idx / (validTimes.length - 1) : 0.5;
      const color = colorConfig.mode === 'colormap'
        ? getColormapColor(colorConfig.colormap, colorT)
        : colorConfig.solidColor;

      // Opacity from formula
      const s = viewTime - time;
      const opacity = evaluateOpacity(colorConfig.opacityExpression, s, viewTime, epsilon, T);

      // Skip truly zero-length vectors (no visible arrow)
      if (dist < 1e-12) {
        // Draw a dot at zBar to indicate no projection was needed
        elements.push(
          <circle
            key={`pv-${step}`}
            cx={zBar.x}
            cy={zBar.y}
            r={strokeWidth}
            fill={color}
            opacity={opacity}
          />
        );
        continue;
      }

      // Arrow head direction
      const nx = dx / dist;
      const ny = dy / dist;
      // Perpendicular
      const px = -ny;
      const py = nx;

      // Arrow head at z[n]
      const ax1 = z.x - nx * arrowSize + px * arrowSize * 0.4;
      const ay1 = z.y - ny * arrowSize + py * arrowSize * 0.4;
      const ax2 = z.x - nx * arrowSize - px * arrowSize * 0.4;
      const ay2 = z.y - ny * arrowSize - py * arrowSize * 0.4;

      elements.push(
        <g key={`pv-${step}`} opacity={opacity}>
          <line
            x1={zBar.x}
            y1={zBar.y}
            x2={z.x}
            y2={z.y}
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />
          <polygon
            points={`${z.x},${z.y} ${ax1},${ay1} ${ax2},${ay2}`}
            fill={color}
          />
        </g>
      );
    }

    return <>{elements}</>;
  }, [trajectory, preProjection, snapshotTimes, colorConfig, strokeWidth, arrowSize, h, viewTime, effectiveStep, epsilon, T]);

  return <g>{content}</g>;
});
