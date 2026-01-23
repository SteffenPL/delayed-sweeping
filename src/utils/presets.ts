import type { Preset } from '@/types';

export const PRESETS: Preset[] = [
  {
    id: 'circular-standard',
    name: 'Circular Standard',
    description: 'Disk on circular track (r=2, omega=1, lambda=2)',
    params: {
      T: 12.0,
      h: 0.01,
      lambda: 2.0,
      R: 0.8,
      infiniteMode: true,
    },
    constraint: {
      expression: 'R - sqrt(x^2 + y^2)',
      R: 0.8,
      r: 0.5,
      a: 0,
      b: 0,
    },
    trajectory: {
      type: 'circular',
      params: {
        centerX: 0,
        centerY: 0,
        radius: 2.0,
        omega: 1.0,
        phase: 0,
      },
    },
  },
  {
    id: 'figure8-fast',
    name: 'Figure-8 Fast',
    description: 'Lissajous curve with fast motion',
    params: {
      T: 15.0,
      h: 0.005,
      lambda: 2.5,
      R: 0.5,
      infiniteMode: true,
    },
    constraint: {
      expression: 'R - sqrt(x^2 + y^2)',
      R: 0.5,
      r: 0.3,
      a: 0,
      b: 0,
    },
    trajectory: {
      type: 'lissajous',
      params: {
        centerX: 0,
        centerY: 0,
        amplitudeX: 2.0,
        amplitudeY: 2.0,
        freqX: 1.0,
        freqY: 2.0,
        phaseX: 0,
        phaseY: 0,
      },
    },
  },
];

export function getPresetById(id: string): Preset | undefined {
  return PRESETS.find((p) => p.id === id);
}
