import React from 'react';
import type { Vec2 } from '@/types';
import { vec2 } from '@/simulation/vec2';

interface SVGConstraintProps {
  polygon: Vec2[];
  center: Vec2;
  angle: number;
  scale: number;
  color?: string;
  opacity?: number;
  fillOpacity?: number;
  showCenterMarker?: boolean;
}

export const SVGConstraint = React.memo(function SVGConstraint({
  polygon,
  center,
  angle,
  scale,
  color = '#3b82f6',
  opacity = 1,
  fillOpacity = 0.1,
  showCenterMarker = true,
}: SVGConstraintProps) {
  if (polygon.length === 0) return null;

  // Transform polygon: rotate then translate
  const points = polygon.map((p) => {
    const rotated = vec2.rotate(p, angle);
    const world = vec2.add(rotated, center);
    return `${world.x},${world.y}`;
  }).join(' ');

  const strokeWidth = 2 / scale;
  const centerRadius = 4 / scale;
  const indicatorLength = 0.3;
  const indicatorEnd = vec2.add(center, vec2.rotate({ x: indicatorLength, y: 0 }, angle));

  return (
    <g opacity={opacity}>
      <polygon
        points={points}
        fill={color}
        fillOpacity={fillOpacity}
        stroke={color}
        strokeWidth={strokeWidth}
      />
      {showCenterMarker && (
        <>
          <circle
            cx={center.x}
            cy={center.y}
            r={centerRadius}
            fill="#ef4444"
          />
          <line
            x1={center.x}
            y1={center.y}
            x2={indicatorEnd.x}
            y2={indicatorEnd.y}
            stroke="#ef4444"
            strokeWidth={strokeWidth}
          />
        </>
      )}
    </g>
  );
});
