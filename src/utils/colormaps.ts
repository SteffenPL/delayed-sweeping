import type { ColormapName } from '@/types/colors';

// Polynomial approximations of matplotlib colormaps
// t in [0, 1], returns [r, g, b] each in [0, 255]

function viridis(t: number): [number, number, number] {
  const r = 68.0 + t * (-76.0 + t * (313.0 + t * (-192.0)));
  const g = 1.0 + t * (176.0 + t * (73.0 + t * (-18.0)));
  const b = 84.0 + t * (137.0 + t * (-319.0 + t * (135.0)));
  return [clamp(r), clamp(g), clamp(b)];
}

function plasma(t: number): [number, number, number] {
  const r = 13.0 + t * (369.0 + t * (-191.0 + t * (49.0)));
  const g = 8.0 + t * (-65.0 + t * (266.0 + t * (37.0)));
  const b = 135.0 + t * (120.0 + t * (-367.0 + t * (149.0)));
  return [clamp(r), clamp(g), clamp(b)];
}

function inferno(t: number): [number, number, number] {
  const r = 0.0 + t * (217.0 + t * (209.0 + t * (-178.0)));
  const g = 0.0 + t * (-38.0 + t * (215.0 + t * (75.0)));
  const b = 4.0 + t * (326.0 + t * (-537.0 + t * (243.0)));
  return [clamp(r), clamp(g), clamp(b)];
}

function magma(t: number): [number, number, number] {
  const r = 0.0 + t * (178.0 + t * (282.0 + t * (-215.0)));
  const g = 0.0 + t * (-57.0 + t * (175.0 + t * (135.0)));
  const b = 4.0 + t * (350.0 + t * (-459.0 + t * (142.0)));
  return [clamp(r), clamp(g), clamp(b)];
}

function cividis(t: number): [number, number, number] {
  const r = 0.0 + t * (128.0 + t * (127.0));
  const g = 32.0 + t * (140.0 + t * (55.0));
  const b = 77.0 + t * (62.0 + t * (-96.0));
  return [clamp(r), clamp(g), clamp(b)];
}

function grayscale(t: number): [number, number, number] {
  const v = clamp(t * 200 + 30);
  return [v, v, v];
}

function clamp(v: number): number {
  return Math.max(0, Math.min(255, Math.round(v)));
}

const COLORMAP_FUNCS: Record<ColormapName, (t: number) => [number, number, number]> = {
  viridis,
  plasma,
  inferno,
  magma,
  cividis,
  grayscale,
};

export function getColormapColor(name: ColormapName, t: number): string {
  const clamped = Math.max(0, Math.min(1, t));
  const [r, g, b] = COLORMAP_FUNCS[name](clamped);
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

export const COLORMAP_NAMES: ColormapName[] = ['viridis', 'plasma', 'inferno', 'magma', 'cividis', 'grayscale'];

import { compile, type EvalFunction } from 'mathjs';

// Cache compiled expressions to avoid recompilation on every call
const compiledCache = new Map<string, EvalFunction>();

function getCompiled(expression: string): EvalFunction {
  let node = compiledCache.get(expression);
  if (!node) {
    node = compile(expression) as EvalFunction;
    compiledCache.set(expression, node);
  }
  return node;
}

/**
 * Evaluate opacity formula A(s) with variables:
 * - s: age (time since this point was recorded, relative to current view time)
 * - t: current view time
 * - epsilon: user-specified decay rate parameter
 * - T: terminal simulation time
 * Returns clamped value in [0, 1].
 */
export function evaluateOpacity(expression: string, s: number, t: number, epsilon: number, T: number): number {
  try {
    const node = getCompiled(expression);
    const result = node.evaluate({ s, t, epsilon, T });
    const val = typeof result === 'number' ? result : Number(result);
    if (isNaN(val)) return 1;
    return Math.max(0, Math.min(1, val));
  } catch {
    return 1;
  }
}

const LUT_SIZE = 256;

/**
 * Build a lookup table of opacity values for evenly-spaced s in [sMin, sMax].
 * Evaluates the formula LUT_SIZE times instead of once per segment.
 */
export function buildOpacityLUT(
  expression: string,
  sMin: number,
  sMax: number,
  epsilon: number,
  T: number,
  viewTime: number,
): Float64Array {
  const lut = new Float64Array(LUT_SIZE);
  try {
    const node = getCompiled(expression);
    for (let i = 0; i < LUT_SIZE; i++) {
      const s = sMin + (sMax - sMin) * (i / (LUT_SIZE - 1));
      const result = node.evaluate({ s, t: viewTime, epsilon, T });
      const val = typeof result === 'number' ? result : Number(result);
      lut[i] = isNaN(val) ? 1 : Math.max(0, Math.min(1, val));
    }
  } catch {
    lut.fill(1);
  }
  return lut;
}

/**
 * Sample the precomputed opacity LUT with linear interpolation.
 */
export function sampleOpacityLUT(lut: Float64Array, s: number, sMin: number, sMax: number): number {
  if (sMax <= sMin) return lut[0];
  const t = (s - sMin) / (sMax - sMin);
  const idx = t * (LUT_SIZE - 1);
  const lo = Math.max(0, Math.min(LUT_SIZE - 2, Math.floor(idx)));
  const frac = idx - lo;
  return lut[lo] + frac * (lut[lo + 1] - lut[lo]);
}
