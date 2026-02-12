import type { SimulationParameters, ConstraintConfig, ParametricTrajectory, TrajectoryMode } from './simulation';

/**
 * Complete simulation configuration
 * Can be saved/loaded from TOML files
 */
export interface SimulationConfig {
  // Simulation parameters
  simulation: SimulationParameters;

  // Constraint configuration
  constraint: ConstraintConfig;

  // Trajectory configuration (for parametric mode)
  trajectory: ParametricTrajectory;

  // Trajectory mode
  trajectoryMode?: TrajectoryMode;

  // Metadata
  metadata?: {
    name?: string;
    description?: string;
    author?: string;
    created?: string;
  };
}
