import type { Vec2, ParametricTrajectory } from '@/types';
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
 * Default: constant at initial constraint center
 */
export function createPastFunction(
  trajectory: ParametricTrajectory
): (t: number) => Vec2 {
  const centerFunc = createTrajectoryFunction(trajectory);
  const initialCenter = centerFunc(0);

  // Return initial center for all t < 0
  return () => initialCenter;
}
