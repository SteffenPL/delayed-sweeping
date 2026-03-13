import type { Preset } from '@/types';

export const PRESETS: Preset[] = [
  {
    id: 'circle-long-memory',
    name: 'Circle — Disk',
    description: 'Circular trajectory with disk constraint (ε = 2.5)',
    params: {
      T: 6.0,
      h: 0.005,
      epsilon: 2.5,
      infiniteMode: false,
      xPastExpression: '0',
      yPastExpression: '2',
      solverType: 'norm1-sum1',
      projectionTolerance: 1e-8,
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
      yExpression: '2 * cos(t)',
      alphaExpression: '0',
    },
  },
  {
    id: 'lissajous-disk',
    name: 'Lissajous — Disk',
    description: 'Lissajous curve with disk constraint (ε = 0.75)',
    params: {
      T: 9.0,
      h: 0.005,
      epsilon: 0.75,
      infiniteMode: false,
      xPastExpression: '0',
      yPastExpression: '0',
      solverType: 'norm1-sum1',
      projectionTolerance: 1e-8,
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
  {
    id: 'lissajous-stadium',
    name: 'Lissajous — Stadium',
    description: 'Lissajous curve with rotating stadium constraint (ε = 0.75)',
    params: {
      T: 9.0,
      h: 0.005,
      epsilon: 0.75,
      infiniteMode: false,
      xPastExpression: '0',
      yPastExpression: '0',
      solverType: 'norm1-sum1',
      projectionTolerance: 1e-8,
    },
    constraint: {
      expression: 'r - sqrt(max(abs(x) - R/2, 0)^2 + y^2)',
      R: 0.72,
      r: 0.3,
      a: 0,
      b: 0,
    },
    trajectory: {
      xExpression: '2 * sin(t)',
      yExpression: '2 * sin(2*t)',
      alphaExpression: '4*t',
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
      xPastExpression: '0',
      yPastExpression: '0',
      solverType: 'norm1-sum1',
      projectionTolerance: 1e-8,
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
  {
    id: 'circular-standard',
    name: 'Circular Standard',
    description: 'Disk on circular track (r=2, omega=1, epsilon=2)',
    params: {
      T: 12.0,
      h: 0.01,
      epsilon: 2.0,
      infiniteMode: true,
      xPastExpression: '2',
      yPastExpression: '0',
      solverType: 'norm1-sum1',
      projectionTolerance: 1e-8,
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
];

export function getPresetById(id: string): Preset | undefined {
  return PRESETS.find((p) => p.id === id);
}
