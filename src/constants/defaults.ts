import type { SimulationParameters, ConstraintConfig, ParametricTrajectory } from '@/types';

export const DEFAULT_PARAMS: SimulationParameters = {
  T: 12.0,
  h: 0.01,
  epsilon: 2.0,
  infiniteMode: true,
  xPastExpression: '2*cos(t)',
  yPastExpression: '2*sin(t)',
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

// Statistics metrics
export const AVAILABLE_METRICS = [
  // First row: Delayed sweeping process
  { id: 'projectionDistance', label: '||X - X̄||', color: '#3b82f6' },
  { id: 'positionX', label: 'X position', color: '#22c55e' },
  { id: 'positionY', label: 'Y position', color: '#ef4444' },
  { id: 'velocity', label: 'Velocity', color: '#f59e0b' },
  { id: 'distanceFromOrigin', label: 'Distance from origin', color: '#8b5cf6' },
  { id: 'lagrangeMultiplier', label: 'Lagrange multiplier ||λ G||', color: '#ec4899' },
  { id: 'lagrangeDotProduct', label: '⟨λₙGₙ - λₙ₋₁Gₙ₋₁, Xₙ - Xₙ₋₁⟩', color: '#06b6d4' },
  { id: 'totalEnergy', label: 'Total energy Eₙ', color: '#f97316' },
  { id: 'gradientNorm', label: 'Gradient norm ||∇g(Xₙ)||', color: '#14b8a6' },
  { id: 'lagrangeMultiplierValue', label: 'Lagrange multiplier λₙ', color: '#f472b6' },

  // Second row: Classical sweeping process
  { id: 'classicalProjectionDistance', label: 'Classical ||X - X̄||', color: '#7c3aed' },
  { id: 'classicalPositionX', label: 'Classical X position', color: '#10b981' },
  { id: 'classicalPositionY', label: 'Classical Y position', color: '#f43f5e' },
  { id: 'classicalVelocity', label: 'Classical velocity', color: '#f59e0b' },
  { id: 'classicalDistanceFromOrigin', label: 'Classical distance from origin', color: '#a855f7' },
  { id: 'classicalLagrangeMultiplier', label: 'Classical ||λ G||', color: '#db2777' },
  { id: 'classicalLagrangeDotProduct', label: 'Classical ⟨λₙGₙ - λₙ₋₁Gₙ₋₁, Xₙ - Xₙ₋₁⟩', color: '#0891b2' },
  { id: 'classicalTotalEnergy', label: 'Classical kinetic energy', color: '#ea580c' },
  { id: 'classicalGradientNorm', label: 'Classical gradient norm ||∇g(Xₙ)||', color: '#2dd4bf' },
  { id: 'classicalLagrangeMultiplierValue', label: 'Classical Lagrange multiplier λₙ', color: '#f9a8d4' },
];

// Convergence-specific metrics (computed over entire trajectory, not just terminal)
export const CONVERGENCE_METRICS = [
  // Delayed sweeping min/max
  { id: 'maxProjDistance', label: 'max ||X - X̄||', color: '#2563eb' },
  { id: 'minProjDistance', label: 'min ||X - X̄||', color: '#60a5fa' },
  { id: 'maxLagrangeDotProduct', label: 'max ⟨λₙGₙ - λₙ₋₁Gₙ₋₁, Xₙ - Xₙ₋₁⟩', color: '#0891b2' },
  { id: 'minLagrangeDotProduct', label: 'min ⟨λₙGₙ - λₙ₋₁Gₙ₋₁, Xₙ - Xₙ₋₁⟩', color: '#67e8f9' },
  { id: 'maxLagrangeMultiplier', label: 'max λₙ', color: '#be185d' },
  { id: 'minLagrangeMultiplier', label: 'min λₙ', color: '#f9a8d4' },

  // Classical sweeping min/max
  { id: 'classicalMaxProjDistance', label: 'Classical max ||X - X̄||', color: '#5b21b6' },
  { id: 'classicalMinProjDistance', label: 'Classical min ||X - X̄||', color: '#a78bfa' },
  { id: 'classicalMaxLagrangeDotProduct', label: 'Classical max ⟨λₙGₙ - λₙ₋₁Gₙ₋₁, Xₙ - Xₙ₋₁⟩', color: '#0e7490' },
  { id: 'classicalMinLagrangeDotProduct', label: 'Classical min ⟨λₙGₙ - λₙ₋₁Gₙ₋₁, Xₙ - Xₙ₋₁⟩', color: '#22d3ee' },
  { id: 'classicalMaxLagrangeMultiplier', label: 'Classical max λₙ', color: '#9d174d' },
  { id: 'classicalMinLagrangeMultiplier', label: 'Classical min λₙ', color: '#fda4af' },

  // Convergence rate metrics (computed relative to dt_min)
  { id: 'logPositionError', label: 'log₂ ||X(T) - X_ref||', color: '#dc2626' },
  { id: 'logLambdaError', label: 'log₂ |λ(T) - λ_ref|', color: '#ea580c' },
  { id: 'classicalLogPositionError', label: 'Classical log₂ ||X(T) - X_ref||', color: '#9333ea' },
  { id: 'classicalLogLambdaError', label: 'Classical log₂ |λ(T) - λ_ref|', color: '#c026d3' },
];

