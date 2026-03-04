import type { Vec2 } from '@/types';
import { computeBoundaryPolygon } from '@/shapes/expressionConstraint';

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
}

/**
 * Render a log-log convergence plot as standalone SVG.
 */
export function renderConvergencePlot(
  series: ConvergenceSeries[],
  config: ConvergencePlotConfig = {}
): string {
  const { width = 500, height = 400, title, refSlopes = [1, 2] } = config;

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
  lines.push(`<text x="16" y="${mt + ph / 2}" text-anchor="middle" font-size="12" transform="rotate(-90, 16, ${mt + ph / 2})">L2 error</text>`);
  lines.push('</g>');

  // Reference slope lines (dashed)
  const slopeColors = ['#bbbbbb', '#bbbbbb', '#bbbbbb'];
  for (let si = 0; si < refSlopes.length; si++) {
    const slope = refSlopes[si];
    const col = slopeColors[si % slopeColors.length];
    // Draw through the midpoint of the data range
    const midLogH = (logHMin + logHMax) / 2;
    const midLogE = (logEMin + logEMax) / 2;
    // Line: logE = slope * logH + c, where c = midLogE - slope * midLogH
    const c = midLogE - slope * midLogH;
    const eAtHMin = slope * logHMin + c;
    const eAtHMax = slope * logHMax + c;

    // Clip to plot area
    const clipLogE = (logH: number) => Math.max(logEMin, Math.min(logEMax, slope * logH + c));
    const lh0 = logHMin;
    const lh1 = logHMax;
    const le0 = clipLogE(lh0);
    const le1 = clipLogE(lh1);

    lines.push(`<line x1="${toX(lh0)}" y1="${toY(le0)}" x2="${toX(lh1)}" y2="${toY(le1)}" stroke="${col}" stroke-width="1" stroke-dasharray="6,3"/>`);

    // Label the slope
    const labelLogH = logHMax - 0.3;
    const labelLogE = clipLogE(labelLogH);
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
}

export interface TrajectoryPlotConfig {
  epsilon: number;
  T: number;
  h: number;
  width?: number;
  height?: number;
  scale?: number;
  constraintEvaluator: (x: number, y: number) => number;
}

/**
 * Render a trajectory plot as standalone SVG string (no DOM dependency).
 *
 * Coordinate system: center origin, scale px/unit, Y flipped for math convention.
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
  } = config;

  const cx = width / 2;
  const cy = height / 2;

  // Transform from world to SVG coordinates
  const toSvg = (p: Vec2) => ({
    x: cx + p.x * scale,
    y: cy - p.y * scale, // flip Y
  });

  const lines: string[] = [];
  lines.push(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`
  );
  lines.push(`<rect width="${width}" height="${height}" fill="white"/>`);

  // 1. Grid lines
  lines.push(renderGrid(width, height, cx, cy, scale));

  // 2. Past constraint boundaries with fading opacity
  const N = data.delayed.length;
  const nConstraints = Math.min(N, Math.floor(T / h));
  const constraintStep = Math.max(1, Math.floor(nConstraints / 60)); // limit to ~60 ghosts

  for (let i = 0; i < nConstraints; i += constraintStep) {
    const s = i * h;
    const opacity = Math.exp(-epsilon * s / T);
    if (opacity < 0.02) continue;

    const center = data.centers[i];
    if (!center) continue;

    const boundary = computeBoundaryPolygon(constraintEvaluator, 64, 5);
    const translated = boundary.map((p) => ({ x: p.x + center.x, y: p.y + center.y }));
    lines.push(renderPolygon(translated, toSvg, 'none', '#d4d4d4', 0.8, opacity * 0.5));
  }

  // 3. Current constraint boundary (last time step)
  const lastCenter = data.centers[N - 1];
  if (lastCenter) {
    const boundary = computeBoundaryPolygon(constraintEvaluator, 128, 5);
    const translated = boundary.map((p) => ({ x: p.x + lastCenter.x, y: p.y + lastCenter.y }));
    lines.push(renderPolygon(translated, toSvg, 'rgba(200,200,200,0.1)', '#888888', 1.5, 1));
  }

  // 4. Classical trajectory (#60a5fa blue)
  lines.push(renderPolyline(data.classical, toSvg, '#60a5fa', 1.5, epsilon, T, h));

  // 5. Pre-projection trajectory (#000000 black)
  lines.push(renderPolyline(data.preProjection, toSvg, '#000000', 1, epsilon, T, h));

  // 6. Delayed trajectory (#fb923c orange)
  lines.push(renderPolyline(data.delayed, toSvg, '#fb923c', 2, epsilon, T, h));

  lines.push('</svg>');
  return lines.join('\n');
}

function renderGrid(
  width: number,
  height: number,
  cx: number,
  cy: number,
  scale: number
): string {
  const lines: string[] = [];
  lines.push('<g>');

  // Determine grid range
  const xMin = -cx / scale;
  const xMax = (width - cx) / scale;
  const yMin = -(height - cy) / scale;
  const yMax = cy / scale;

  // Grid lines every 1 unit
  for (let x = Math.ceil(xMin); x <= Math.floor(xMax); x++) {
    const sx = cx + x * scale;
    const color = x === 0 ? '#cccccc' : '#e5e5e5';
    const sw = x === 0 ? 1 : 0.5;
    lines.push(`<line x1="${sx}" y1="0" x2="${sx}" y2="${height}" stroke="${color}" stroke-width="${sw}"/>`);
  }
  for (let y = Math.ceil(yMin); y <= Math.floor(yMax); y++) {
    const sy = cy - y * scale;
    const color = y === 0 ? '#cccccc' : '#e5e5e5';
    const sw = y === 0 ? 1 : 0.5;
    lines.push(`<line x1="0" y1="${sy}" x2="${width}" y2="${sy}" stroke="${color}" stroke-width="${sw}"/>`);
  }

  lines.push('</g>');
  return lines.join('\n');
}

function renderPolygon(
  points: Vec2[],
  toSvg: (p: Vec2) => Vec2,
  fill: string,
  stroke: string,
  strokeWidth: number,
  opacity: number
): string {
  if (points.length === 0) return '';
  const pts = points.map((p) => {
    const s = toSvg(p);
    return `${s.x.toFixed(1)},${s.y.toFixed(1)}`;
  });
  return `<polygon points="${pts.join(' ')}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}" opacity="${opacity.toFixed(3)}"/>`;
}

function renderPolyline(
  points: Vec2[],
  toSvg: (p: Vec2) => Vec2,
  color: string,
  strokeWidth: number,
  epsilon: number,
  T: number,
  h: number
): string {
  if (points.length < 2) return '';

  // Render as segmented path with opacity fade
  const segments: string[] = [];
  segments.push('<g>');

  // Group segments by similar opacity to reduce SVG size
  const batchSize = Math.max(1, Math.floor(points.length / 200));

  for (let i = 0; i < points.length - 1; i += batchSize) {
    const end = Math.min(i + batchSize + 1, points.length);
    const s = i * h;
    const opacity = Math.max(0.05, Math.exp(-epsilon * s / T));

    const pts = [];
    for (let j = i; j < end; j++) {
      const sv = toSvg(points[j]);
      pts.push(`${sv.x.toFixed(1)},${sv.y.toFixed(1)}`);
    }
    segments.push(
      `<polyline points="${pts.join(' ')}" fill="none" stroke="${color}" stroke-width="${strokeWidth}" opacity="${opacity.toFixed(3)}"/>`
    );
  }

  segments.push('</g>');
  return segments.join('\n');
}
