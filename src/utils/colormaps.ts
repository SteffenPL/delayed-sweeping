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
