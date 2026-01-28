import type { Vec2, ParametricTrajectory, SimulationParameters } from '@/types';
import { compile } from 'mathjs';

/**
 * Create a trajectory function from expression-based configuration
 */
export function createTrajectoryFunction(
  trajectory: ParametricTrajectory
): (t: number) => Vec2 {
  try {
    const xFunc = compile(trajectory.xExpression);
    const yFunc = compile(trajectory.yExpression);

    return (t: number) => {
      try {
        const x = xFunc.evaluate({ t });
        const y = yFunc.evaluate({ t });
        return {
          x: typeof x === 'number' ? x : 0,
          y: typeof y === 'number' ? y : 0
        };
      } catch (error) {
        console.error('Error evaluating trajectory at t =', t, error);
        return { x: 0, y: 0 };
      }
    };
  } catch (error) {
    console.error('Error compiling trajectory expressions:', error);
    return () => ({ x: 0, y: 0 });
  }
}

/**
 * Create an alpha (rotation angle) function from expression
 */
export function createAlphaFunction(
  trajectory: ParametricTrajectory
): (t: number) => number {
  try {
    const alphaFunc = compile(trajectory.alphaExpression);

    return (t: number) => {
      try {
        const alpha = alphaFunc.evaluate({ t });
        return typeof alpha === 'number' ? alpha : 0;
      } catch (error) {
        console.error('Error evaluating alpha at t =', t, error);
        return 0;
      }
    };
  } catch (error) {
    console.error('Error compiling alpha expression:', error);
    return () => 0;
  }
}

/**
 * Create a past condition function (for t < 0)
 * Uses x_p(t) and y_p(t) expressions from simulation parameters
 */
export function createPastFunction(
  params: SimulationParameters
): (t: number) => Vec2 {
  try {
    const xPastFunc = compile(params.xPastExpression);
    const yPastFunc = compile(params.yPastExpression);

    return (t: number) => {
      try {
        const x = xPastFunc.evaluate({ t });
        const y = yPastFunc.evaluate({ t });
        return {
          x: typeof x === 'number' ? x : 0,
          y: typeof y === 'number' ? y : 0
        };
      } catch (error) {
        console.error('Error evaluating past function at t =', t, error);
        return { x: 0, y: 0 };
      }
    };
  } catch (error) {
    console.error('Error compiling past expressions:', error);
    return () => ({ x: 0, y: 0 });
  }
}
