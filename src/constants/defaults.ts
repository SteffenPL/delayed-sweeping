import type { SimulationParameters, ConstraintConfig, ParametricTrajectory } from '@/types';

export const DEFAULT_PARAMS: SimulationParameters = {
  T: 12.0,
  h: 0.01,
  epsilon: 2.0,
  infiniteMode: true,
  xPastExpression: '2*cos(t)',
  yPastExpression: '2*sin(t)',
  solverType: 'norm1-sum1',
};

export const DEFAULT_CONSTRAINT: ConstraintConfig = {
  expression: 'R - sqrt(x^2 + y^2)',
  R: 0.8,
  r: 0.5,
  a: 0,
  b: 0,
};

export const DEFAULT_TRAJECTORY: ParametricTrajectory = {
  xExpression: '2*cos(t)',
  yExpression: '2*sin(t)',
  alphaExpression: '0',
};

// Viewport defaults
export const DEFAULT_SCALE = 60; // pixels per unit
export const DEFAULT_VIEW_CENTER = { x: 0, y: 0 };

// Rendering defaults
export const MAX_TRAJECTORY_POINTS = 10000;
export const TRAJECTORY_LINE_WIDTH = 2;
