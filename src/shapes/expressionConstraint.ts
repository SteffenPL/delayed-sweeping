import { compile, EvalFunction } from 'mathjs';
import type { Vec2 } from '@/types';

export interface ExpressionContext {
  R: number;
  r: number;
  a: number;
  b: number;
}

/**
 * Create an evaluator function for a constraint expression g(x, y)
 * The expression can use variables: x, y, R, r, a, b
 * Convention: g(x,y) >= 0 means feasible (inside), g(x,y) < 0 means infeasible (outside)
 */
export function createExpressionEvaluator(
  expression: string,
  context: ExpressionContext
): (x: number, y: number) => number {
  let compiled: EvalFunction;
  try {
    compiled = compile(expression);
  } catch {
    // Fallback to disk if expression is invalid
    compiled = compile('R - sqrt(x^2 + y^2)');
  }

  return (x: number, y: number) => {
    try {
      return compiled.evaluate({ x, y, ...context }) as number;
    } catch {
      return -1; // Return infeasible on evaluation error
    }
  };
}

/**
 * Compute the gradient of g(x, y) using central finite differences
 */
export function numericalGradient(
  evaluator: (x: number, y: number) => number,
  x: number,
  y: number,
  epsilon = 1e-6
): Vec2 {
  const dfdx = (evaluator(x + epsilon, y) - evaluator(x - epsilon, y)) / (2 * epsilon);
  const dfdy = (evaluator(x, y + epsilon) - evaluator(x, y - epsilon)) / (2 * epsilon);
  return { x: dfdx, y: dfdy };
}

/**
 * Project a point onto the constraint boundary using Newton's method
 * Finds the closest point where g(x, y) = 0
 */
export function projectToConstraint(
  evaluator: (x: number, y: number) => number,
  point: Vec2,
  maxIterations = 50,
  tolerance = 1e-8
): Vec2 {
  const g = evaluator(point.x, point.y);

  // Already feasible (inside the constraint)
  if (g >= 0) {
    return { ...point };
  }

  // Newton's method to project onto boundary
  let p = { ...point };

  for (let i = 0; i < maxIterations; i++) {
    const gVal = evaluator(p.x, p.y);

    // Close enough to boundary
    if (gVal >= -tolerance) {
      break;
    }

    const grad = numericalGradient(evaluator, p.x, p.y);
    const gradNormSq = grad.x * grad.x + grad.y * grad.y;

    // Gradient too small, can't proceed
    if (gradNormSq < 1e-12) {
      break;
    }

    // Step along gradient direction to boundary
    // Newton step: p_new = p - g(p) * grad(p) / |grad(p)|^2
    const step = -gVal / gradNormSq;
    p = {
      x: p.x + step * grad.x,
      y: p.y + step * grad.y,
    };
  }

  return p;
}

/**
 * Compute boundary polygon by ray-casting from origin
 * Uses binary search along each ray to find where g(x, y) = 0
 * Works well for star-shaped domains (shapes visible from origin)
 */
export function computeBoundaryPolygon(
  evaluator: (x: number, y: number) => number,
  numRays = 128,
  maxRadius = 10
): Vec2[] {
  const points: Vec2[] = [];

  for (let i = 0; i < numRays; i++) {
    const theta = (2 * Math.PI * i) / numRays;
    const dir = { x: Math.cos(theta), y: Math.sin(theta) };

    // Binary search along ray to find g = 0
    let lo = 0;
    let hi = maxRadius;

    // First check if origin is inside
    const gAtOrigin = evaluator(0, 0);
    if (gAtOrigin < 0) {
      // Origin is outside, shape doesn't contain origin
      // Try to find where ray enters the shape
      lo = 0;
      hi = maxRadius;
    }

    for (let j = 0; j < 50; j++) {
      const mid = (lo + hi) / 2;
      const p = { x: mid * dir.x, y: mid * dir.y };
      const gVal = evaluator(p.x, p.y);

      if (gVal >= 0) {
        // Inside, look further out
        lo = mid;
      } else {
        // Outside, look closer
        hi = mid;
      }
    }

    const radius = (lo + hi) / 2;
    points.push({ x: radius * dir.x, y: radius * dir.y });
  }

  return points;
}
