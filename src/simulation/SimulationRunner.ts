import type { Vec2 } from '@/types';
import type { DelayedSweepingSimulator } from './DelayedSweepingSimulator';

export type StepCallback = (
  step: number,
  position: Vec2,
  center: Vec2,
  xBar: Vec2,
  projectionDistance: number
) => void;

export type CompleteCallback = () => void;

/**
 * Animation loop controller for the simulation
 */
export class SimulationRunner {
  private simulator: DelayedSweepingSimulator;
  private currentStep: number = 0;
  private isRunning: boolean = false;
  private animationId: number | null = null;
  private stepsPerFrame: number = 1;
  private infiniteMode: boolean = false;

  private onStep: StepCallback | null = null;
  private onComplete: CompleteCallback | null = null;

  constructor(simulator: DelayedSweepingSimulator) {
    this.simulator = simulator;
  }

  /**
   * Set callback functions
   */
  setCallbacks(onStep: StepCallback, onComplete?: CompleteCallback): void {
    this.onStep = onStep;
    this.onComplete = onComplete ?? null;
  }

  /**
   * Set simulation speed (steps computed per animation frame)
   */
  setSpeed(stepsPerFrame: number): void {
    this.stepsPerFrame = Math.max(1, Math.floor(stepsPerFrame));
  }

  /**
   * Set infinite mode (run indefinitely)
   */
  setInfiniteMode(infinite: boolean): void {
    this.infiniteMode = infinite;
  }

  /**
   * Start or resume the simulation
   */
  start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this.tick();
  }

  /**
   * Pause the simulation
   */
  pause(): void {
    this.isRunning = false;
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  /**
   * Restart from the beginning
   */
  restart(): void {
    this.pause();
    this.simulator.reset();
    this.currentStep = 0;
  }

  /**
   * Check if simulation is running
   */
  get running(): boolean {
    return this.isRunning;
  }

  /**
   * Get current step index
   */
  get step(): number {
    return this.currentStep;
  }

  /**
   * Get progress as fraction (0 to 1)
   */
  get progress(): number {
    return this.currentStep / this.simulator.totalSteps;
  }

  /**
   * Animation frame tick
   */
  private tick = (): void => {
    if (!this.isRunning) return;

    for (let i = 0; i < this.stepsPerFrame; i++) {
      // Only check totalSteps if NOT in infinite mode
      if (!this.infiniteMode && this.currentStep > this.simulator.totalSteps) {
        this.isRunning = false;
        this.onComplete?.();
        return;
      }

      const position = this.simulator.step(this.currentStep);
      const centers = this.simulator.getConstraintCenters();
      const xBars = this.simulator.getPreProjection();
      const projDists = this.simulator.getProjectionDistances();

      this.onStep?.(
        this.currentStep,
        position,
        centers[this.currentStep],
        xBars[this.currentStep],
        projDists[this.currentStep]
      );

      this.currentStep++;
    }

    this.animationId = requestAnimationFrame(this.tick);
  };

  /**
   * Clean up resources
   */
  destroy(): void {
    this.pause();
    this.onStep = null;
    this.onComplete = null;
  }
}
