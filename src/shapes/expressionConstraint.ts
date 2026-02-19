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
 * Move a point onto the boundary g=0 via Newton steps along the gradient.
 */
function newtonToBoundary(
  evaluator: (x: number, y: number) => number,
  p: Vec2,
  maxIterations = 20,
  tolerance = 1e-10
): Vec2 {
  let x = { ...p };
  for (let i = 0; i < maxIterations; i++) {
    const gVal = evaluator(x.x, x.y);
    if (Math.abs(gVal) < tolerance) break;

    const grad = numericalGradient(evaluator, x.x, x.y);
    const gradNormSq = grad.x * grad.x + grad.y * grad.y;
    if (gradNormSq < 1e-12) break;

    const step = -gVal / gradNormSq;
    x = { x: x.x + step * grad.x, y: x.y + step * grad.y };
  }
  return x;
}

/**
 * Project a point onto the constraint set {g >= 0}.
 *
 * If the point is feasible (g >= 0), returns it unchanged.
 * Otherwise finds the closest boundary point where g = 0.
 *
 * Uses Newton steps to reach the boundary, then refines by removing the
 * tangential component of (x - point) so that the displacement is purely
 * normal — the optimality condition for the metric projection.
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

  // Phase 1: Newton steps along gradient to reach boundary g=0
  let x = newtonToBoundary(evaluator, point);

  // Phase 2: Refine to closest boundary point.
  // At the metric projection x*, the vector (x* - point) must be parallel
  // to ∇g(x*), i.e. its tangential component must vanish.
  // We iteratively remove the tangential component and re-project to boundary.
  let currentDistSq = (x.x - point.x) ** 2 + (x.y - point.y) ** 2;

  for (let i = 0; i < maxIterations; i++) {
    const grad = numericalGradient(evaluator, x.x, x.y);
    const gradNormSq = grad.x * grad.x + grad.y * grad.y;
    if (gradNormSq < 1e-12) break;

    // Displacement from original point to current boundary point
    const dx = x.x - point.x;
    const dy = x.y - point.y;

    // Tangential component: d_t = d - (d·n)n  where n = grad/|grad|
    const dDotGrad = dx * grad.x + dy * grad.y;
    const tx = dx - (dDotGrad / gradNormSq) * grad.x;
    const ty = dy - (dDotGrad / gradNormSq) * grad.y;

    const tangentNormSq = tx * tx + ty * ty;
    if (tangentNormSq < tolerance * tolerance) break;

    // Backtracking line search: reduce step until distance decreases
    let alpha = 1.0;
    let candidate: Vec2;
    let candidateDistSq: number;

    for (let k = 0; k < 10; k++) {
      candidate = { x: x.x - alpha * tx, y: x.y - alpha * ty };
      candidate = newtonToBoundary(evaluator, candidate);
      candidateDistSq = (candidate.x - point.x) ** 2 + (candidate.y - point.y) ** 2;

      if (candidateDistSq < currentDistSq - 1e-14) {
        x = candidate;
        currentDistSq = candidateDistSq;
        break;
      }
      alpha *= 0.5;

      // If step is too small, accept and continue
      if (k === 9) {
        // No improvement found — converged
        return x;
      }
    }
  }

  return x;
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
