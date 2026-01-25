import type { Vec2, ConstraintConfig } from '@/types';
import { ExpressionConstraint } from './constraint';

/**
 * Create a projection function for the given constraint configuration
 * Returns a function that projects points onto the constraint boundary
 * Also returns the gradient norm at the projected point
 */
export function createProjectionFunction(
  getConstraint: () => ConstraintConfig,
  getAngle: () => number
): (point: Vec2, center: Vec2) => { projected: Vec2; gradientNorm: number } {
  return (point: Vec2, center: Vec2) => {
    const config = getConstraint();
    const angle = getAngle();
    const constraint = new ExpressionConstraint(config);
    constraint.update({ center, angle });
    const projected = constraint.project(point);
    const grad = constraint.gradient(projected);
    const gradientNorm = Math.sqrt(grad.x * grad.x + grad.y * grad.y);
    return { projected, gradientNorm };
  };
}

/**
 * Create a projection function that returns additional metadata
 * Used for classical sweeping which needs distance information
 */
export function createFullProjectionFunction(
  getConstraint: () => ConstraintConfig,
  getAngle: () => number
): (point: Vec2, center: Vec2) => { projected: Vec2; distance: number; wasOutside: boolean; gradientNorm: number } {
  return (point: Vec2, center: Vec2) => {
    const config = getConstraint();
    const angle = getAngle();
    const constraint = new ExpressionConstraint(config);
    constraint.update({ center, angle });

    const g = constraint.evaluate(point);
    const projected = constraint.project(point);
    const grad = constraint.gradient(projected);
    const gradientNorm = Math.sqrt(grad.x * grad.x + grad.y * grad.y);

    return {
      projected,
      distance: Math.abs(g),
      wasOutside: g < 0,
      gradientNorm,
    };
  };
}

// Re-export constraint types for convenience
export { ExpressionConstraint } from './constraint';
export type { Constraint } from './constraint';
