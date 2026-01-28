// Core 2D vector type
export interface Vec2 {
  x: number;
  y: number;
}

// Simulation parameters
export interface SimulationParameters {
  T: number;           // Final simulation time (or window size in infinite mode)
  h: number;           // Time step size
  epsilon: number;     // Kernel decay rate
  infiniteMode: boolean; // Run indefinitely until manually stopped
  xPastExpression: string;  // Initial past condition x_p(t) for t < 0
  yPastExpression: string;  // Initial past condition y_p(t) for t < 0
}

// Constraint configuration - expression-based with standardized parameters
export interface ConstraintConfig {
  expression: string;  // g(x,y) formula, e.g., "R - sqrt(x^2 + y^2)"
  R: number;           // Major radius / main size
  r: number;           // Minor radius / secondary size
  a: number;           // General parameter
  b: number;           // General parameter
}

// Trajectory mode
export type TrajectoryMode = 'free-drag' | 'parametric';

// Expression-based parametric trajectory
export interface ParametricTrajectory {
  xExpression: string;  // Expression for x(t)
  yExpression: string;  // Expression for y(t)
  alphaExpression: string;  // Expression for alpha(t) - constraint rotation angle
}

// Simulation state
export interface SimulationState {
  isRunning: boolean;
  currentTime: number;
  currentStep: number;
  trajectory: Vec2[];
  preProjection: Vec2[];
  constraintCenters: Vec2[];
  projectionDistances: number[];
}

// Statistics
export interface SimulationStatistics {
  time: number[];
  projectionDistance: number[];
  velocity: number[];
  positionX: number[];
  positionY: number[];
  distanceFromOrigin: number[];
  lagrangeMultiplier: number[];
  lagrangeDotProduct: number[];
  totalEnergy: number[];
  gradientNorm: number[];
  lagrangeMultiplierValue: number[];
  classicalProjectionDistance: number[];
  classicalPositionX: number[];
  classicalPositionY: number[];
  classicalVelocity: number[];
  classicalDistanceFromOrigin: number[];
  classicalLagrangeMultiplier: number[];
  classicalLagrangeDotProduct: number[];
  classicalTotalEnergy: number[];
  classicalGradientNorm: number[];
  classicalLagrangeMultiplierValue: number[];
}

// Preset configuration
export interface Preset {
  id: string;
  name: string;
  description: string;
  params: SimulationParameters;
  constraint: ConstraintConfig;
  trajectory: ParametricTrajectory;
}
