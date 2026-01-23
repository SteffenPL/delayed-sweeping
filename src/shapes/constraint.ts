import type { Vec2, ConstraintConfig } from '@/types';
import { vec2 } from '@/simulation/vec2';
import {
  createExpressionEvaluator,
  numericalGradient,
  projectToConstraint,
} from './expressionConstraint';

/**
 * Interface for a constraint in the form g(x) >= 0
 * The feasible set C = {x : g(x) >= 0}
 */
export interface Constraint {
  /**
   * Evaluate the constraint function g(x, y)
   * Returns positive if feasible (inside), negative if infeasible (outside)
   */
  evaluate(point: Vec2): number;

  /**
   * Compute the gradient ∇g(x, y)
   */
  gradient(point: Vec2): Vec2;

  /**
   * Project a point onto the constraint set
   * If point is already feasible (g(x) >= 0), returns the point itself
   * Otherwise projects to the boundary where g(x) = 0
   */
  project(point: Vec2): Vec2;

  /**
   * Update constraint transform (center and angle)
   */
  update(params: { center?: Vec2; angle?: number }): void;
}

/**
 * Expression-based constraint using math.js
 * Supports arbitrary g(x,y) formulas with parameters R, r, a, b
 */
export class ExpressionConstraint implements Constraint {
  private evaluator: (x: number, y: number) => number;
  private center: Vec2 = { x: 0, y: 0 };
  private angle: number = 0;

  constructor(config: ConstraintConfig) {
    this.evaluator = createExpressionEvaluator(config.expression, {
      R: config.R,
      r: config.r,
      a: config.a,
      b: config.b,
    });
  }

  /**
   * Transform world point to local coordinates (centered at origin, unrotated)
   */
  private toLocal(point: Vec2): Vec2 {
    const translated = vec2.sub(point, this.center);
    return vec2.rotate(translated, -this.angle);
  }

  /**
   * Transform local point back to world coordinates
   */
  private toWorld(point: Vec2): Vec2 {
    const rotated = vec2.rotate(point, this.angle);
    return vec2.add(rotated, this.center);
  }

  evaluate(point: Vec2): number {
    const local = this.toLocal(point);
    return this.evaluator(local.x, local.y);
  }

  gradient(point: Vec2): Vec2 {
    const local = this.toLocal(point);
    const localGrad = numericalGradient(this.evaluator, local.x, local.y);
    // Rotate gradient back to world coordinates
    return vec2.rotate(localGrad, this.angle);
  }

  project(point: Vec2): Vec2 {
    const local = this.toLocal(point);
    const projectedLocal = projectToConstraint(this.evaluator, local);
    return this.toWorld(projectedLocal);
  }

  update(params: { center?: Vec2; angle?: number }): void {
    if (params.center) {
      this.center = { ...params.center };
    }
    if (params.angle !== undefined) {
      this.angle = params.angle;
    }
  }

  getCenter(): Vec2 {
    return { ...this.center };
  }

  getAngle(): number {
    return this.angle;
  }
}
