import React from 'react';

interface SVGGridProps {
  scale: number;
  width: number;
  height: number;
}

export const SVGGrid = React.memo(function SVGGrid({ scale, width, height }: SVGGridProps) {
  const halfW = width / 2 / scale;
  const halfH = height / 2 / scale;
  const minX = Math.floor(-halfW);
  const maxX = Math.ceil(halfW);
  const minY = Math.floor(-halfH);
  const maxY = Math.ceil(halfH);

  const strokeWidth = 1 / scale; // 1px in screen coords
  const axisWidth = 1.5 / scale;

  const lines: React.ReactElement[] = [];

  for (let x = minX; x <= maxX; x++) {
    const isAxis = x === 0;
    lines.push(
      <line
        key={`v${x}`}
        x1={x} y1={-halfH} x2={x} y2={halfH}
        stroke={isAxis ? '#cccccc' : '#e5e5e5'}
        strokeWidth={isAxis ? axisWidth : strokeWidth * 0.5}
      />
    );
  }

  for (let y = minY; y <= maxY; y++) {
    const isAxis = y === 0;
    lines.push(
      <line
        key={`h${y}`}
        x1={-halfW} y1={y} x2={halfW} y2={y}
        stroke={isAxis ? '#cccccc' : '#e5e5e5'}
        strokeWidth={isAxis ? axisWidth : strokeWidth * 0.5}
      />
    );
  }

  return <g>{lines}</g>;
});
