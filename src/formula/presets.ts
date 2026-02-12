import type { FormulaPreset } from './types';

export const FORMULA_PRESETS: FormulaPreset[] = [
  {
    id: 'constraint-value',
    label: 'Constraint value g(z)',
    formula: 'g[n]',
    description: 'Value of constraint function at current position',
  },
  {
    id: 'step-size',
    label: 'Step size',
    formula: 'norm(z[n] - z[n-1])',
    description: 'Euclidean distance between consecutive positions',
  },
  {
    id: 'lagrange-multiplier',
    label: 'Lagrange multiplier',
    formula: 'lambda[n]',
    description: 'Scalar Lagrange multiplier: ||X - X_bar|| / ||grad g||',
  },
  {
    id: 'velocity',
    label: 'Velocity magnitude',
    formula: 'norm(z[n] - z[n-1]) / dt',
    description: 'Finite difference velocity',
  },
  {
    id: 'delayed-vs-classical',
    label: 'Delayed vs classical difference',
    formula: 'norm(z[n] - z_cl[n])',
    description: 'Distance between delayed and classical solutions',
  },
  {
    id: 'projection-distance',
    label: 'Projection distance',
    formula: 'norm(z[n] - zbar[n])',
    description: 'Distance moved by projection: ||X - X_bar||',
  },
  {
    id: 'gradient-norm',
    label: 'Gradient norm',
    formula: 'norm(G[n])',
    description: 'Norm of constraint gradient at current position',
  },
];
