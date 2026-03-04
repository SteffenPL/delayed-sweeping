import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import type { Vec2 } from '@/types';
import { computeBoundaryPolygon } from '@/shapes/expressionConstraint';
import { SVGGrid } from '@/components/canvas/SVGGrid';
import { SVGTrajectory } from '@/components/canvas/SVGTrajectory';
import { SVGMarkers } from '@/components/canvas/SVGMarkers';
import { SVGProjectionVectors } from '@/components/canvas/SVGProjectionVectors';
import { SVGConstraint } from '@/components/canvas/SVGConstraint';
import { DEFAULT_COLOR_SETTINGS } from '@/types/colors';
import { getColormapColor, evaluateOpacity } from '@/utils/colormaps';

// ─── Convergence (log-log) plot ──────────────────────────────────────

export interface ConvergenceSeries {
  label: string;
  color: string;
  data: { h: number; error: number }[];
}

export interface ConvergencePlotConfig {
  width?: number;
  height?: number;
  title?: string;
  /** Reference slope lines to draw, e.g. [1, 2] for O(h) and O(h²) */
  refSlopes?: number[];
  /** Y-axis label (default: "L2 error") */
  yLabel?: string;
}

/**
 * Render a log-log convergence plot as standalone SVG.
 */
export function renderConvergencePlot(
  series: ConvergenceSeries[],
  config: ConvergencePlotConfig = {}
): string {
  const { width = 500, height = 400, title, refSlopes = [1, 2], yLabel = 'L2 error' } = config;

  // Margins
  const ml = 70, mr = 30, mt = title ? 40 : 20, mb = 50;
  const pw = width - ml - mr;   // plot width
  const ph = height - mt - mb;  // plot height

  // Gather all data points to determine axis range (filter out non-positive values for log scale)
  const allH: number[] = [];
  const allE: number[] = [];
  for (const s of series) {
    for (const d of s.data) {
      if (d.h > 0) allH.push(d.h);
      if (d.error > 0) allE.push(d.error);
    }
  }

  // Guard against empty or degenerate data
  if (allH.length === 0) allH.push(1);
  if (allE.length === 0) allE.push(1);

  const logHMin = Math.floor(Math.log10(Math.min(...allH)));
  const logHMax = Math.max(logHMin + 1, Math.ceil(Math.log10(Math.max(...allH))));
  const logEMin = Math.floor(Math.log10(Math.min(...allE)));
  const logEMax = Math.max(logEMin + 1, Math.ceil(Math.log10(Math.max(...allE))));

  // Map log10 values to pixel coordinates
  const toX = (logH: number) => ml + ((logH - logHMin) / (logHMax - logHMin)) * pw;
  const toY = (logE: number) => mt + ph - ((logE - logEMin) / (logEMax - logEMin)) * ph;

  const lines: string[] = [];
  lines.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`);
  lines.push(`<rect width="${width}" height="${height}" fill="white"/>`);
  lines.push(`<style>text { font-family: sans-serif; }</style>`);

  // Title
  if (title) {
    lines.push(`<text x="${width / 2}" y="${mt - 12}" text-anchor="middle" font-size="14" font-weight="bold">${title}</text>`);
  }

  // Grid + axes
  lines.push('<g>');
  // Vertical grid (h values)
  for (let p = logHMin; p <= logHMax; p++) {
    const x = toX(p);
    lines.push(`<line x1="${x}" y1="${mt}" x2="${x}" y2="${mt + ph}" stroke="#e5e5e5" stroke-width="0.5"/>`);
    lines.push(`<text x="${x}" y="${mt + ph + 16}" text-anchor="middle" font-size="10">10<tspan baseline-shift="super" font-size="7">${p}</tspan></text>`);
  }
  // Horizontal grid (error values)
  for (let p = logEMin; p <= logEMax; p++) {
    const y = toY(p);
    lines.push(`<line x1="${ml}" y1="${y}" x2="${ml + pw}" y2="${y}" stroke="#e5e5e5" stroke-width="0.5"/>`);
    lines.push(`<text x="${ml - 6}" y="${y + 4}" text-anchor="end" font-size="10">10<tspan baseline-shift="super" font-size="7">${p}</tspan></text>`);
  }
  // Axis frame
  lines.push(`<rect x="${ml}" y="${mt}" width="${pw}" height="${ph}" fill="none" stroke="#aaaaaa" stroke-width="1"/>`);
  // Axis labels
  lines.push(`<text x="${ml + pw / 2}" y="${height - 6}" text-anchor="middle" font-size="12">h</text>`);
  lines.push(`<text x="16" y="${mt + ph / 2}" text-anchor="middle" font-size="12" transform="rotate(-90, 16, ${mt + ph / 2})">${yLabel}</text>`);
  lines.push('</g>');

  // Reference slope lines (dashed)
  // Each slope line passes through the center of the plot vertically,
  // offset horizontally so labels don't overlap.
  const slopeColors = ['#bbbbbb', '#bbbbbb', '#bbbbbb'];
  const midLogH = (logHMin + logHMax) / 2;
  const midLogE = (logEMin + logEMax) / 2;

  for (let si = 0; si < refSlopes.length; si++) {
    const slope = refSlopes[si];
    const col = slopeColors[si % slopeColors.length];
    // Line: logE = slope * (logH - midLogH) + midLogE
    const c = midLogE - slope * midLogH;

    // Clip to plot area
    const clipLogE = (logH: number) => Math.max(logEMin, Math.min(logEMax, slope * logH + c));

    // Find visible h-range where the line is within the plot
    // logE = slope * logH + c; visible when logEMin <= slope*logH+c <= logEMax
    let visH0 = logHMin;
    let visH1 = logHMax;
    if (slope > 0) {
      visH0 = Math.max(visH0, (logEMin - c) / slope);
      visH1 = Math.min(visH1, (logEMax - c) / slope);
    }
    if (visH0 >= visH1) continue; // slope line fully outside plot

    const le0 = clipLogE(visH0);
    const le1 = clipLogE(visH1);

    lines.push(`<line x1="${toX(visH0)}" y1="${toY(le0)}" x2="${toX(visH1)}" y2="${toY(le1)}" stroke="${col}" stroke-width="1" stroke-dasharray="6,3"/>`);

    // Label near the right end of the visible segment
    const labelLogH = visH1 - 0.15;
    const labelLogE = slope * labelLogH + c;
    if (labelLogE >= logEMin && labelLogE <= logEMax) {
      lines.push(`<text x="${toX(labelLogH) + 4}" y="${toY(labelLogE) - 6}" font-size="10" fill="${col}">O(h<tspan baseline-shift="super" font-size="7">${slope}</tspan>)</text>`);
    }
  }

  // Data series
  for (const s of series) {
    const sorted = [...s.data].sort((a, b) => a.h - b.h);
    // Line
    const pts = sorted.map((d) => `${toX(Math.log10(d.h)).toFixed(1)},${toY(Math.log10(d.error)).toFixed(1)}`);
    lines.push(`<polyline points="${pts.join(' ')}" fill="none" stroke="${s.color}" stroke-width="2"/>`);
    // Markers
    for (const d of sorted) {
      const x = toX(Math.log10(d.h));
      const y = toY(Math.log10(d.error));
      lines.push(`<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="3.5" fill="${s.color}" stroke="white" stroke-width="1"/>`);
    }
  }

  // Legend
  if (series.length > 1) {
    const lx = ml + 12;
    let ly = mt + 16;
    for (const s of series) {
      lines.push(`<line x1="${lx}" y1="${ly}" x2="${lx + 18}" y2="${ly}" stroke="${s.color}" stroke-width="2"/>`);
      lines.push(`<circle cx="${lx + 9}" cy="${ly}" r="3" fill="${s.color}"/>`);
      lines.push(`<text x="${lx + 24}" y="${ly + 4}" font-size="11">${s.label}</text>`);
      ly += 18;
    }
  }

  lines.push('</svg>');
  return lines.join('\n');
}

// ─── Quantities (time-series) plot ──────────────────────────────────

export interface QuantitiesSeries {
  label: string;
  color: string;
  data: { t: number; value: number }[];
}

export interface QuantitiesPlotConfig {
  width?: number;
  height?: number;
  title?: string;
}

/**
 * Render a multi-series time-series plot as standalone SVG.
 */
export function renderQuantitiesPlot(
  series: QuantitiesSeries[],
  config: QuantitiesPlotConfig = {}
): string {
  const { width = 600, height = 400, title } = config;

  const ml = 70, mr = 20, mt = title ? 40 : 20, mb = 50;
  const pw = width - ml - mr;
  const ph = height - mt - mb;

  // Axis ranges
  let tMin = Infinity, tMax = -Infinity;
  let vMin = Infinity, vMax = -Infinity;
  for (const s of series) {
    for (const d of s.data) {
      if (d.t < tMin) tMin = d.t;
      if (d.t > tMax) tMax = d.t;
      if (d.value < vMin) vMin = d.value;
      if (d.value > vMax) vMax = d.value;
    }
  }

  // Add padding to value range
  const vRange = vMax - vMin || 1;
  vMin -= vRange * 0.05;
  vMax += vRange * 0.05;

  const toX = (t: number) => ml + ((t - tMin) / (tMax - tMin || 1)) * pw;
  const toY = (v: number) => mt + ph - ((v - vMin) / (vMax - vMin)) * ph;

  const lines: string[] = [];
  lines.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`);
  lines.push(`<rect width="${width}" height="${height}" fill="white"/>`);
  lines.push(`<style>text { font-family: sans-serif; }</style>`);

  if (title) {
    lines.push(`<text x="${width / 2}" y="${mt - 12}" text-anchor="middle" font-size="14" font-weight="bold">${title}</text>`);
  }

  // Grid + axes
  lines.push('<g>');
  const nTicksX = 5;
  for (let i = 0; i <= nTicksX; i++) {
    const t = tMin + (i / nTicksX) * (tMax - tMin);
    const x = toX(t);
    lines.push(`<line x1="${x}" y1="${mt}" x2="${x}" y2="${mt + ph}" stroke="#e5e5e5" stroke-width="0.5"/>`);
    lines.push(`<text x="${x}" y="${mt + ph + 16}" text-anchor="middle" font-size="10">${t.toFixed(1)}</text>`);
  }
  const nTicksY = 5;
  for (let i = 0; i <= nTicksY; i++) {
    const v = vMin + (i / nTicksY) * (vMax - vMin);
    const y = toY(v);
    lines.push(`<line x1="${ml}" y1="${y}" x2="${ml + pw}" y2="${y}" stroke="#e5e5e5" stroke-width="0.5"/>`);
    lines.push(`<text x="${ml - 6}" y="${y + 4}" text-anchor="end" font-size="10">${v.toExponential(1)}</text>`);
  }
  lines.push(`<rect x="${ml}" y="${mt}" width="${pw}" height="${ph}" fill="none" stroke="#aaaaaa" stroke-width="1"/>`);
  lines.push(`<text x="${ml + pw / 2}" y="${height - 6}" text-anchor="middle" font-size="12">t</text>`);
  lines.push('</g>');

  // Zero line if in range
  if (vMin < 0 && vMax > 0) {
    const y0 = toY(0);
    lines.push(`<line x1="${ml}" y1="${y0}" x2="${ml + pw}" y2="${y0}" stroke="#aaaaaa" stroke-width="0.5" stroke-dasharray="4,2"/>`);
  }

  // Data series
  for (const s of series) {
    const sorted = [...s.data].sort((a, b) => a.t - b.t);
    // Downsample if too many points
    const maxPts = 2000;
    const step = Math.max(1, Math.floor(sorted.length / maxPts));
    const pts: string[] = [];
    for (let i = 0; i < sorted.length; i += step) {
      pts.push(`${toX(sorted[i].t).toFixed(1)},${toY(sorted[i].value).toFixed(1)}`);
    }
    lines.push(`<polyline points="${pts.join(' ')}" fill="none" stroke="${s.color}" stroke-width="1.5"/>`);
  }

  // Legend
  if (series.length > 0) {
    const lx = ml + 12;
    let ly = mt + 16;
    for (const s of series) {
      lines.push(`<line x1="${lx}" y1="${ly}" x2="${lx + 18}" y2="${ly}" stroke="${s.color}" stroke-width="2"/>`);
      lines.push(`<text x="${lx + 24}" y="${ly + 4}" font-size="11">${s.label}</text>`);
      ly += 18;
    }
  }

  lines.push('</svg>');
  return lines.join('\n');
}

// ─── Trajectory plot ────────────────────────────────────────────────

export interface TrajectoryPlotData {
  delayed: Vec2[];
  preProjection: Vec2[];
  classical: Vec2[];
  centers: Vec2[];
  angles?: number[];
}

export interface TrajectoryPlotConfig {
  epsilon: number;
  T: number;
  h: number;
  width?: number;
  height?: number;
  scale?: number;
  constraintEvaluator: (x: number, y: number) => number;
  /**
   * If provided, render constraint outlines and projection arrows only at these
   * specific times instead of the current constraint.
   */
  snapshotTimes?: number[];
  /** Show the classical trajectory (default: false) */
  showClassical?: boolean;
}

/**
 * Render a trajectory plot as standalone SVG string using the same React
 * components as the web view (SVGGrid, SVGTrajectory, SVGMarkers, etc.).
 */
export function renderTrajectoryPlot(
  data: TrajectoryPlotData,
  config: TrajectoryPlotConfig
): string {
  const {
    epsilon,
    T,
    h,
    width = 500,
    height = 500,
    scale = 60,
    constraintEvaluator,
    snapshotTimes,
    showClassical = false,
  } = config;

  const N = data.delayed.length;
  const effectiveStep = N;
  const viewTime = T;
  const colors = DEFAULT_COLOR_SETTINGS;

  // Boundary polygon in local (constraint-centred) coordinates
  const boundary = computeBoundaryPolygon(constraintEvaluator, 128, 5);

  // Past / snapshot constraints — same logic as SVGSimulationCanvas
  const pcConfig = colors.pastConstraints;
  const snapshotConstraints = (snapshotTimes ?? []).map((snapT, idx) => {
    const stepIdx = Math.min(Math.round(snapT / h), N - 1);
    const center = data.centers[stepIdx];
    if (!center) return null;
    const angle = data.angles?.[stepIdx] ?? 0;
    const colorT = snapshotTimes!.length > 1 ? idx / (snapshotTimes!.length - 1) : 0.5;
    const color = pcConfig.mode === 'colormap'
      ? getColormapColor(pcConfig.colormap, colorT)
      : pcConfig.solidColor;
    const s = viewTime - snapT;
    const opacity = evaluateOpacity(pcConfig.opacityExpression, s, viewTime, epsilon, T);
    return { center, angle, color, opacity };
  }).filter(Boolean) as { center: Vec2; angle: number; color: string; opacity: number }[];

  // Final constraint
  const lastCenter = data.centers[N - 1];
  const lastAngle = data.angles?.[N - 1] ?? 0;

  // Marker colors: hide classical unless requested
  const markerColors = {
    ...colors.markers,
    showClassical: showClassical && colors.markers.showClassical,
  };

  const jsx = React.createElement(
    'svg',
    {
      xmlns: 'http://www.w3.org/2000/svg',
      width,
      height,
      viewBox: `0 0 ${width} ${height}`,
    },
    React.createElement('rect', { width, height, fill: 'white' }),
    React.createElement(
      'g',
      { transform: `translate(${width / 2},${height / 2}) scale(${scale},${-scale})` },

      // Grid
      React.createElement(SVGGrid, { scale, width, height }),

      // Snapshot constraints (past positions)
      ...snapshotConstraints.map((sc, i) =>
        React.createElement(SVGConstraint, {
          key: `snap-${i}`,
          polygon: boundary,
          center: sc.center,
          angle: sc.angle,
          scale,
          color: sc.color,
          opacity: sc.opacity,
          fillOpacity: 0,
        })
      ),

      // Current constraint (only when no snapshot times)
      !snapshotTimes && lastCenter
        ? React.createElement(SVGConstraint, {
            key: 'current',
            polygon: boundary,
            center: lastCenter,
            angle: lastAngle,
            scale,
          })
        : null,

      // Classical trajectory (optional)
      showClassical && colors.classicalTrajectory.mode !== 'none'
        ? React.createElement(SVGTrajectory, {
            key: 'classical',
            points: data.classical,
            colorConfig: colors.classicalTrajectory,
            scale,
            lineWidth: 3,
            h,
            viewTime,
            epsilon,
            T,
          })
        : null,

      // Pre-projection trajectory (avg / X̄)
      colors.preProjectionTrajectory.mode !== 'none'
        ? React.createElement(SVGTrajectory, {
            key: 'avg',
            points: data.preProjection,
            colorConfig: colors.preProjectionTrajectory,
            scale,
            lineWidth: 4,
            h,
            viewTime,
            epsilon,
            T,
          })
        : null,

      // Delayed trajectory
      colors.delayedTrajectory.mode !== 'none'
        ? React.createElement(SVGTrajectory, {
            key: 'delayed',
            points: data.delayed,
            colorConfig: colors.delayedTrajectory,
            scale,
            lineWidth: 4,
            h,
            viewTime,
            epsilon,
            T,
          })
        : null,

      // Projection arrows at snapshot times
      snapshotTimes && colors.projectionVectors.mode !== 'none'
        ? React.createElement(SVGProjectionVectors, {
            key: 'arrows',
            trajectory: data.delayed,
            preProjection: data.preProjection,
            snapshotTimes,
            colorConfig: colors.projectionVectors,
            scale,
            lineWidth: colors.arrowLineWidth,
            h,
            viewTime,
            effectiveStep,
            epsilon,
            T,
          })
        : null,

      // Endpoint markers
      React.createElement(SVGMarkers, {
        key: 'markers',
        delayed: data.delayed[N - 1] ?? null,
        classical: showClassical ? (data.classical[N - 1] ?? null) : null,
        xBar: data.preProjection[N - 1] ?? null,
        colors: markerColors,
        scale,
      })
    )
  );

  return renderToStaticMarkup(jsx);
}
