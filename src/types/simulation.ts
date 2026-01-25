// Core 2D vector type
export interface Vec2 {
  x: number;
  y: number;
}

// Simulation parameters
export interface SimulationParameters {
  T: number;           // Final simulation time (or window size in infinite mode)
  h: number;           // Time step size
  lambda: number;      // Kernel decay rate
  R: number;           // Constraint radius (disk radius)
  infiniteMode: boolean; // Run indefinitely until manually stopped
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

// Parametric trajectory types
export type TrajectoryType = 'circular' | 'ellipse' | 'lissajous' | 'linear';

export interface CircularParams {
  centerX: number;
  centerY: number;
  radius: number;
  omega: number;
  phase: number;
}

export interface EllipseParams {
  centerX: number;
  centerY: number;
  semiMajor: number;
  semiMinor: number;
  omega: number;
  phase: number;
}

export interface LissajousParams {
  centerX: number;
  centerY: number;
  amplitudeX: number;
  amplitudeY: number;
  freqX: number;
  freqY: number;
  phaseX: number;
  phaseY: number;
}

export interface LinearParams {
  startX: number;
  startY: number;
  velocityX: number;
  velocityY: number;
}

export interface ParametricTrajectory {
  type: TrajectoryType;
  params: CircularParams | EllipseParams | LissajousParams | LinearParams;
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
