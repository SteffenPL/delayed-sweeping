import type { Vec2, SimulationParameters } from '@/types';

export type CenterFunction = (t: number) => Vec2;
export type ProjectionFunction = (point: Vec2, center: Vec2) => { projected: Vec2; distance: number };

export interface ClassicalSweepingConfig {
  params: SimulationParameters;
  centerFunc: CenterFunction;
  pastFunc: (t: number) => Vec2;
  projectFunc: ProjectionFunction;
}

/**
 * Classical sweeping process: X_n = P_{C(t_n)}(X_{n-1})
 *
 * This is the standard sweeping process without delay/memory.
 * Each step only depends on the previous position.
 */
export class ClassicalSweepingSimulator {
  private params: SimulationParameters;
  private centerFunc: CenterFunction;
  private pastFunc: (t: number) => Vec2;
  private projectFunc: ProjectionFunction;

  // Storage
  private X: Vec2[] = [];
  private constraintCenters: Vec2[] = [];
  private projectionDistances: number[] = [];

  public readonly totalSteps: number;

  constructor(config: ClassicalSweepingConfig) {
    this.params = config.params;
    this.centerFunc = config.centerFunc;
    this.pastFunc = config.pastFunc;
    this.projectFunc = config.projectFunc;

    const { T, h } = this.params;
    this.totalSteps = Math.floor(T / h);
  }

  /**
   * Compute step n
   */
  step(n: number): Vec2 {
    const { h } = this.params;
    const t_n = n * h;

    // Get constraint center at time t_n
    const center = this.centerFunc(t_n);
    this.constraintCenters[n] = center;

    // Get previous position
    let x_prev: Vec2;
    if (n === 0) {
      // Use past function for initial condition
      x_prev = this.pastFunc(0);
    } else {
      x_prev = this.X[n - 1];
    }

    // Project onto current constraint: X_n = P_{C(t_n)}(X_{n-1})
    const { projected, distance } = this.projectFunc(x_prev, center);

    this.X[n] = projected;
    this.projectionDistances[n] = distance;

    return projected;
  }

  /**
   * Get trajectory
   */
  getTrajectory(): Vec2[] {
    return this.X;
  }

  /**
   * Get constraint centers
   */
  getConstraintCenters(): Vec2[] {
    return this.constraintCenters;
  }

  /**
   * Get projection distances
   */
  getProjectionDistances(): number[] {
    return this.projectionDistances;
  }

  /**
   * Reset simulation
   */
  reset(): void {
    this.X = [];
    this.constraintCenters = [];
    this.projectionDistances = [];
  }

  /**
   * Update parameters
   */
  updateParams(params: SimulationParameters): void {
    this.params = params;
  }

  /**
   * Update center function
   */
  setCenterFunc(centerFunc: CenterFunction): void {
    this.centerFunc = centerFunc;
  }

  /**
   * Update projection function
   */
  setProjectFunc(projectFunc: ProjectionFunction): void {
    this.projectFunc = projectFunc;
  }
}
