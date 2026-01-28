import type { SimulationConfig } from '@/types/config';
import type { Vec2 } from '@/types';
import { DelayedSweepingSimulator } from './DelayedSweepingSimulator';
import { ClassicalSweepingSimulator } from './ClassicalSweepingSimulator';
import { createTrajectoryFunction, createPastFunction, createAlphaFunction } from '@/utils/trajectoryFunctions';
import {
  createExpressionEvaluator,
  projectToConstraint,
  numericalGradient,
} from '@/shapes/expressionConstraint';
import { vec2 } from './vec2';

/**
 * Factory to create standalone simulations from configuration
 * No dependency on UI or store
 */
export class SimulationFactory {
  /**
   * Create a delayed sweeping simulator from configuration
   */
  static createDelayedSimulator(config: SimulationConfig): DelayedSweepingSimulator {
    const { simulation, constraint, trajectory } = config;

    // Create center function from trajectory expressions
    const centerFunc = createTrajectoryFunction(trajectory);

    // Create past function from simulation parameters
    const pastFunc = createPastFunction(simulation);

    // Create alpha function for rotation
    const alphaFunc = createAlphaFunction(trajectory);

    // Create constraint evaluator with parameters
    const evaluator = createExpressionEvaluator(constraint.expression, {
      R: constraint.R,
      r: constraint.r,
      a: constraint.a,
      b: constraint.b,
    });

    // Create projection function
    // Note: For standalone, we use a fixed angle unless we want to pass alpha dynamically
    const projectFunc = (point: Vec2, center: Vec2, angle: number = 0) => {
      // Transform to local coordinates
      const cosA = Math.cos(angle);
      const sinA = Math.sin(angle);
      const dx = point.x - center.x;
      const dy = point.y - center.y;
      const localX = cosA * dx + sinA * dy;
      const localY = -sinA * dx + cosA * dy;

      // Project in local coordinates
      const localProjected = projectToConstraint(evaluator, { x: localX, y: localY });

      // Transform back to world coordinates
      const worldX = center.x + cosA * localProjected.x - sinA * localProjected.y;
      const worldY = center.y + sinA * localProjected.x + cosA * localProjected.y;

      // Compute gradient norm
      const grad = numericalGradient(evaluator, localProjected.x, localProjected.y);
      const gradientNorm = Math.sqrt(grad.x * grad.x + grad.y * grad.y);

      return {
        projected: { x: worldX, y: worldY },
        gradientNorm,
      };
    };

    // For standalone execution, we need a wrapper that uses alpha(t)
    const projectFuncWithTime = (point: Vec2, center: Vec2, t: number = 0) => {
      const angle = alphaFunc(t);
      return projectFunc(point, center, angle);
    };

    return new DelayedSweepingSimulator({
      params: simulation,
      centerFunc,
      pastFunc,
      projectFunc: (point: Vec2, center: Vec2) => {
        // For batch mode, we don't have time available, use angle = 0
        return projectFunc(point, center, 0);
      },
    });
  }

  /**
   * Create a classical sweeping simulator from configuration
   */
  static createClassicalSimulator(config: SimulationConfig): ClassicalSweepingSimulator {
    const { simulation, constraint, trajectory } = config;

    const centerFunc = createTrajectoryFunction(trajectory);
    const pastFunc = createPastFunction(simulation);
    const alphaFunc = createAlphaFunction(trajectory);

    const evaluator = createExpressionEvaluator(constraint.expression, {
      R: constraint.R,
      r: constraint.r,
      a: constraint.a,
      b: constraint.b,
    });

    const projectFunc = (point: Vec2, center: Vec2, angle: number = 0) => {
      const cosA = Math.cos(angle);
      const sinA = Math.sin(angle);
      const dx = point.x - center.x;
      const dy = point.y - center.y;
      const localX = cosA * dx + sinA * dy;
      const localY = -sinA * dx + cosA * dy;

      const localProjected = projectToConstraint(evaluator, { x: localX, y: localY });

      const worldX = center.x + cosA * localProjected.x - sinA * localProjected.y;
      const worldY = center.y + sinA * localProjected.x + cosA * localProjected.y;

      const grad = numericalGradient(evaluator, localProjected.x, localProjected.y);
      const gradientNorm = Math.sqrt(grad.x * grad.x + grad.y * grad.y);

      // Classical also needs distance from previous point
      const distance = vec2.distance(point, { x: worldX, y: worldY });

      return {
        projected: { x: worldX, y: worldY },
        gradientNorm,
        distance,
      };
    };

    return new ClassicalSweepingSimulator({
      params: simulation,
      centerFunc,
      pastFunc,
      projectFunc: (point: Vec2, center: Vec2) => projectFunc(point, center, 0),
    });
  }

  /**
   * Run a complete simulation and return results
   */
  static async runSimulation(config: SimulationConfig): Promise<{
    delayed: {
      trajectory: Vec2[];
      preProjection: Vec2[];
      centers: Vec2[];
      projectionDistances: number[];
      gradientNorms: number[];
    };
    classical: {
      trajectory: Vec2[];
      gradientNorms: number[];
    };
  }> {
    const delayedSim = this.createDelayedSimulator(config);
    const classicalSim = this.createClassicalSimulator(config);

    // Run batch simulations
    delayedSim.simulate();
    classicalSim.simulate();

    return {
      delayed: {
        trajectory: delayedSim.getTrajectory(),
        preProjection: delayedSim.getPreProjection(),
        centers: delayedSim.getConstraintCenters(),
        projectionDistances: delayedSim.getProjectionDistances(),
        gradientNorms: delayedSim.getGradientNorms(),
      },
      classical: {
        trajectory: classicalSim.getTrajectory(),
        gradientNorms: classicalSim.getGradientNorms(),
      },
    };
  }
}
