import type { Vec2, SimulationParameters } from '@/types';
import { computeDiscreteWeights } from './kernel';
import { vec2 } from './vec2';

export interface SimulatorConfig {
  params: SimulationParameters;
  centerFunc: (t: number) => Vec2;
  pastFunc: (t: number) => Vec2;
  projectFunc: (point: Vec2, center: Vec2) => { projected: Vec2; gradientNorm: number };
}

/**
 * Delayed Sweeping Process Simulator
 *
 * Implements the discrete time-stepping scheme:
 *   X_bar^n = h * sum_{j>=1} r_tilde_j * X^{n-j}   (weighted average)
 *   X^n = P_{C^n}(X_bar^n)                         (projection)
 */
export class DelayedSweepingSimulator {
  private params: SimulationParameters;
  private centerFunc: (t: number) => Vec2;
  private pastFunc: (t: number) => Vec2;
  private projectFunc: (point: Vec2, center: Vec2) => { projected: Vec2; gradientNorm: number };

  private N: number; // Total number of steps
  private rTilde: number[]; // Normalized kernel weights

  // Trajectory data
  private X: Vec2[] = [];
  private XBar: Vec2[] = [];
  private centers: Vec2[] = [];
  private projDist: number[] = [];
  private gradientNorms: number[] = [];

  constructor(config: SimulatorConfig) {
    this.params = config.params;
    this.centerFunc = config.centerFunc;
    this.pastFunc = config.pastFunc;
    this.projectFunc = config.projectFunc;

    this.N = Math.floor(config.params.T / config.params.h);
    this.rTilde = computeDiscreteWeights(
      config.params.epsilon,
      config.params.h,
      config.params.solverType
    );
  }

  /**
   * Reset simulation to initial state
   */
  reset(): void {
    this.X = [];
    this.XBar = [];
    this.centers = [];
    this.projDist = [];
    this.gradientNorms = [];
  }

  /**
   * Compute a single time step
   * @param n - Current step index (0-based)
   * @returns The new position X^n
   */
  step(n: number): Vec2 {
    const { h, solverType } = this.params;
    const t_n = n * h;

    // Compute weighted average using solver-specific scheme
    let xBar: Vec2;

    if (solverType === 'trapezoidal') {
      xBar = this.computeWeightedAverageTrapezoidal(n);
    } else {
      // Both 'norm1-sum1' and 'norm0-sum1' use the same summation
      xBar = this.computeWeightedAverageExact(n);
    }

    this.XBar[n] = xBar;

    // Get constraint center at current time
    const center = this.centerFunc(t_n);
    this.centers[n] = center;

    // Project onto constraint set
    const { projected: xNew, gradientNorm } = this.projectFunc(xBar, center);
    this.X[n] = xNew;

    // Record projection distance and gradient norm
    this.projDist[n] = vec2.distance(xNew, xBar);
    this.gradientNorms[n] = gradientNorm;

    return xNew;
  }

  /**
   * Compute weighted average using exact integration schemes
   * Used by 'norm1-sum1' and 'norm0-sum1'
   * Sum: X_bar^n = h * sum_{j>=1} r_tilde_j * X^{n-j}
   */
  private computeWeightedAverageExact(n: number): Vec2 {
    const { h } = this.params;
    let xBar: Vec2 = vec2.zero();

    for (let j = 1; j < this.rTilde.length; j++) {
      let xPast: Vec2;

      if (n - j >= 0) {
        // Use computed trajectory value
        xPast = this.X[n - j];
      } else {
        // Use past condition for t < 0
        const tPast = (n - j) * h;
        xPast = this.pastFunc(tPast);
      }

      xBar = vec2.add(xBar, vec2.scale(xPast, h * this.rTilde[j]));
    }

    return xBar;
  }

  /**
   * Compute weighted average using trapezoidal rule with predictor
   * Sum: X_bar^n = w_tilde_0 * X^{n-1} + sum_{j>=1} w_tilde_j * X^{n-j}
   * Note: w_tilde_0 multiplies X^{n-1} (predictor) instead of X^n
   */
  private computeWeightedAverageTrapezoidal(n: number): Vec2 {
    const { h } = this.params;
    let xBar: Vec2 = vec2.zero();

    for (let j = 0; j < this.rTilde.length; j++) {
      let xPast: Vec2;

      if (j === 0) {
        // j=0: Use X^{n-1} as predictor
        if (n - 1 >= 0) {
          xPast = this.X[n - 1];
        } else {
          // Use past condition for t < 0
          const tPast = (n - 1) * h;
          xPast = this.pastFunc(tPast);
        }
      } else {
        // j >= 1: Use X^{n-j}
        if (n - j >= 0) {
          xPast = this.X[n - j];
        } else {
          const tPast = (n - j) * h;
          xPast = this.pastFunc(tPast);
        }
      }

      xBar = vec2.add(xBar, vec2.scale(xPast, this.rTilde[j]));
    }

    return xBar;
  }

  /**
   * Run full simulation (batch mode)
   */
  simulate(): void {
    this.reset();
    for (let n = 0; n <= this.N; n++) {
      this.step(n);
    }
  }

  /**
   * Get trajectory data
   */
  getTrajectory(): Vec2[] {
    return [...this.X];
  }

  /**
   * Get pre-projection values
   */
  getPreProjection(): Vec2[] {
    return [...this.XBar];
  }

  /**
   * Get constraint centers
   */
  getConstraintCenters(): Vec2[] {
    return [...this.centers];
  }

  /**
   * Get projection distances
   */
  getProjectionDistances(): number[] {
    return [...this.projDist];
  }

  /**
   * Get gradient norms
   */
  getGradientNorms(): number[] {
    return [...this.gradientNorms];
  }

  /**
   * Get current step count
   */
  getCurrentStep(): number {
    return this.X.length;
  }

  /**
   * Get total number of steps
   */
  get totalSteps(): number {
    return this.N;
  }

  /**
   * Get kernel length (number of weights)
   */
  get kernelLength(): number {
    return this.rTilde.length;
  }

  /**
   * Update center function (for free-drag mode)
   */
  setCenterFunc(centerFunc: (t: number) => Vec2): void {
    this.centerFunc = centerFunc;
  }

  /**
   * Update projection function (for shape changes)
   */
  setProjectFunc(projectFunc: (point: Vec2, center: Vec2) => { projected: Vec2; gradientNorm: number }): void {
    this.projectFunc = projectFunc;
  }

  /**
   * Update parameters and recompute kernel weights
   */
  updateParams(params: Partial<SimulationParameters>): void {
    this.params = { ...this.params, ...params };
    this.N = Math.floor(this.params.T / this.params.h);
    this.rTilde = computeDiscreteWeights(
      this.params.epsilon,
      this.params.h,
      this.params.solverType
    );
  }

  /**
   * Get current parameters
   */
  getParams(): SimulationParameters {
    return { ...this.params };
  }
}
