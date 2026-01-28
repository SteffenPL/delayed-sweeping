import type { Preset } from '@/types';

export const PRESETS: Preset[] = [
  {
    id: 'circular-standard',
    name: 'Circular Standard',
    description: 'Disk on circular track (r=2, omega=1, epsilon=2)',
    params: {
      T: 12.0,
      h: 0.01,
      epsilon: 2.0,
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
      xExpression: '2 * cos(t)',
      yExpression: '2 * sin(t)',
      alphaExpression: '0',
    },
  },
  {
    id: 'figure8-fast',
    name: 'Figure-8 Fast',
    description: 'Lissajous curve with fast motion',
    params: {
      T: 15.0,
      h: 0.005,
      epsilon: 2.5,
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
      xExpression: '2 * sin(t)',
      yExpression: '2 * sin(2*t)',
      alphaExpression: '0',
    },
  },
];

export function getPresetById(id: string): Preset | undefined {
  return PRESETS.find((p) => p.id === id);
}
