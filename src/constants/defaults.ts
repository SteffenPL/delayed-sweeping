import type { SimulationParameters, ConstraintConfig, ParametricTrajectory } from '@/types';

export const DEFAULT_PARAMS: SimulationParameters = {
  T: 12.0,
  h: 0.01,
  lambda: 2.0,
  R: 0.8,
  infiniteMode: true,
};

export const DEFAULT_CONSTRAINT: ConstraintConfig = {
  expression: 'R - sqrt(x^2 + y^2)',
  R: 0.8,
  r: 0.5,
  a: 0,
  b: 0,
};

export const DEFAULT_TRAJECTORY: ParametricTrajectory = {
  type: 'circular',
  params: {
    centerX: 0,
    centerY: 0,
    radius: 2.0,
    omega: 1.0,
    phase: 0,
  },
};

// Viewport defaults
export const DEFAULT_SCALE = 60; // pixels per unit
export const DEFAULT_VIEW_CENTER = { x: 0, y: 0 };

// Rendering defaults
export const MAX_TRAJECTORY_POINTS = 10000;
export const TRAJECTORY_LINE_WIDTH = 2;

// Statistics metrics
export const AVAILABLE_METRICS = [
  // First row: Delayed sweeping process
  { id: 'projectionDistance', label: '||X - X\u0304||', color: '#3b82f6' },
  { id: 'positionX', label: 'X position', color: '#22c55e' },
  { id: 'positionY', label: 'Y position', color: '#ef4444' },
  { id: 'velocity', label: 'Velocity', color: '#f59e0b' },
  { id: 'distanceFromOrigin', label: 'Distance from origin', color: '#8b5cf6' },
  { id: 'lagrangeMultiplier', label: 'Lagrange multiplier ||\u03BB G||', color: '#ec4899' },
  { id: 'lagrangeDotProduct', label: '\u27E8\u03BB\u2099G\u2099 - \u03BB\u2099\u208B\u2081G\u2099\u208B\u2081, X\u2099 - X\u2099\u208B\u2081\u27E9', color: '#06b6d4' },
  { id: 'totalEnergy', label: 'Total energy E\u2099', color: '#f97316' },

  // Second row: Classical sweeping process
  { id: 'classicalProjectionDistance', label: 'Classical ||X - X\u0304||', color: '#7c3aed' },
  { id: 'classicalPositionX', label: 'Classical X position', color: '#10b981' },
  { id: 'classicalPositionY', label: 'Classical Y position', color: '#f43f5e' },
  { id: 'classicalVelocity', label: 'Classical velocity', color: '#f59e0b' },
  { id: 'classicalDistanceFromOrigin', label: 'Classical distance from origin', color: '#a855f7' },
  { id: 'classicalLagrangeMultiplier', label: 'Classical ||\u03BB G||', color: '#db2777' },
  { id: 'classicalLagrangeDotProduct', label: 'Classical \u27E8\u03BB\u2099G\u2099 - \u03BB\u2099\u208B\u2081G\u2099\u208B\u2081, X\u2099 - X\u2099\u208B\u2081\u27E9', color: '#0891b2' },
  { id: 'classicalTotalEnergy', label: 'Classical kinetic energy', color: '#ea580c' },
];
