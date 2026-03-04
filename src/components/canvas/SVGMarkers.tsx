import React from 'react';
import type { Vec2 } from '@/types';
import type { MarkerColors } from '@/types/colors';

interface SVGMarkersProps {
  delayed: Vec2 | null;
  classical: Vec2 | null;
  xBar: Vec2 | null;
  colors: MarkerColors;
  scale: number;
}

export const SVGMarkers = React.memo(function SVGMarkers({
  delayed,
  classical,
  xBar,
  colors,
  scale,
}: SVGMarkersProps) {
  const xBarRadius = 7 / scale;
  const classicalRadius = 5 / scale;
  const delayedRadius = 8 / scale;

  return (
    <g>
      {xBar && colors.showXBar !== false && (
        <circle cx={xBar.x} cy={xBar.y} r={xBarRadius} fill={colors.xBar} />
      )}
      {classical && colors.showClassical !== false && (
        <circle cx={classical.x} cy={classical.y} r={classicalRadius} fill={colors.classical} />
      )}
      {delayed && colors.showDelayed !== false && (
        <circle cx={delayed.x} cy={delayed.y} r={delayedRadius} fill={colors.delayed} />
      )}
    </g>
  );
});
