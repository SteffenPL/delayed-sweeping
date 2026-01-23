import type { Vec2, ConstraintConfig } from '@/types';
import { ExpressionConstraint } from './constraint';

/**
 * Create a projection function for the given constraint configuration
 * Returns a function that projects points onto the constraint boundary
 */
export function createProjectionFunction(
  getConstraint: () => ConstraintConfig,
  getAngle: () => number
): (point: Vec2, center: Vec2) => Vec2 {
  return (point: Vec2, center: Vec2) => {
    const config = getConstraint();
    const angle = getAngle();
    const constraint = new ExpressionConstraint(config);
    constraint.update({ center, angle });
    return constraint.project(point);
  };
}

/**
 * Create a projection function that returns additional metadata
 * Used for classical sweeping which needs distance information
 */
export function createFullProjectionFunction(
  getConstraint: () => ConstraintConfig,
  getAngle: () => number
): (point: Vec2, center: Vec2) => { projected: Vec2; distance: number; wasOutside: boolean } {
  return (point: Vec2, center: Vec2) => {
    const config = getConstraint();
    const angle = getAngle();
    const constraint = new ExpressionConstraint(config);
    constraint.update({ center, angle });

    const g = constraint.evaluate(point);
    const projected = constraint.project(point);

    return {
      projected,
      distance: Math.abs(g),
      wasOutside: g < 0,
    };
  };
}

// Re-export constraint types for convenience
export { ExpressionConstraint } from './constraint';
export type { Constraint } from './constraint';
