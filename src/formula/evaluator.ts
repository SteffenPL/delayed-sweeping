import { compile } from 'mathjs';
import type { Vec2 } from '@/types';
import type { EvaluationContext } from './types';
import { numericalGradient } from '@/shapes/expressionConstraint';

/**
 * Two-pass formula evaluator for the delayed sweeping process.
 *
 * Pass 1: Extract norm(...) and dot(...,...)  calls via balanced-parenthesis matching.
 *         Evaluate their inner expressions component-wise (x, y) to produce scalars.
 * Pass 2: Replace remaining scalar tokens, evaluate with math.js.
 */
export class FormulaEvaluator {
  private formula: string;
  private error: string | null = null;

  constructor(formula: string) {
    this.formula = formula.trim();
  }

  getError(): string | null {
    return this.error;
  }

  /**
   * Evaluate the formula at step n with the given context.
   */
  evaluate(ctx: EvaluationContext): number {
    this.error = null;
    try {
      return this.eval(ctx);
    } catch (e) {
      this.error = e instanceof Error ? e.message : String(e);
      return NaN;
    }
  }

  // ─── internals ───────────────────────────────────────────────

  private eval(ctx: EvaluationContext): number {
    let expr = this.formula;

    // Pass 1: replace norm(...) and dot(..., ...) with computed scalars
    expr = this.replaceVectorFunctions(expr, ctx);

    // Check for remaining vector tokens
    this.checkForRemainingVectors(expr);

    // Pass 2: replace scalar tokens, then evaluate
    expr = this.replaceScalarTokens(expr, ctx);

    const compiled = compile(expr);
    const result = compiled.evaluate({});
    if (typeof result !== 'number' || !isFinite(result)) {
      return NaN;
    }
    return result;
  }

  // ─── Pass 1: norm() and dot() ────────────────────────────────

  private replaceVectorFunctions(expr: string, ctx: EvaluationContext): string {
    // Repeatedly find and replace norm(...) and dot(...) from innermost out
    let maxIter = 50;
    while (maxIter-- > 0) {
      const normMatch = this.findFunctionCall(expr, 'norm');
      if (normMatch) {
        const inner = normMatch.inner;
        const xVal = this.evaluateComponent(inner, 'x', ctx);
        const yVal = this.evaluateComponent(inner, 'y', ctx);
        const result = Math.sqrt(xVal * xVal + yVal * yVal);
        expr = expr.slice(0, normMatch.start) + `(${result})` + expr.slice(normMatch.end);
        continue;
      }

      const dotMatch = this.findFunctionCall(expr, 'dot');
      if (dotMatch) {
        const args = this.splitDotArgs(dotMatch.inner);
        if (args.length !== 2) {
          throw new Error('dot() requires exactly 2 arguments');
        }
        const ax = this.evaluateComponent(args[0], 'x', ctx);
        const ay = this.evaluateComponent(args[0], 'y', ctx);
        const bx = this.evaluateComponent(args[1], 'x', ctx);
        const by = this.evaluateComponent(args[1], 'y', ctx);
        const result = ax * bx + ay * by;
        expr = expr.slice(0, dotMatch.start) + `(${result})` + expr.slice(dotMatch.end);
        continue;
      }

      break; // no more norm/dot found
    }
    return expr;
  }

  /**
   * Find the first occurrence of `funcName(...)` with balanced parentheses.
   */
  private findFunctionCall(expr: string, funcName: string): { start: number; end: number; inner: string } | null {
    const idx = expr.indexOf(funcName + '(');
    if (idx < 0) return null;

    // Make sure this is not part of a larger identifier (e.g. "gradnorm" shouldn't match "norm")
    if (idx > 0 && /\w/.test(expr[idx - 1])) {
      // Try to find another occurrence after this position
      const rest = expr.slice(idx + funcName.length);
      const sub = this.findFunctionCall(rest, funcName);
      if (!sub) return null;
      return {
        start: idx + funcName.length + sub.start,
        end: idx + funcName.length + sub.end,
        inner: sub.inner,
      };
    }

    const openIdx = idx + funcName.length;
    let depth = 0;
    for (let i = openIdx; i < expr.length; i++) {
      if (expr[i] === '(') depth++;
      if (expr[i] === ')') {
        depth--;
        if (depth === 0) {
          return {
            start: idx,
            end: i + 1,
            inner: expr.slice(openIdx + 1, i),
          };
        }
      }
    }
    throw new Error(`Unbalanced parentheses in ${funcName}()`);
  }

  /**
   * Split dot() arguments at the top-level comma.
   */
  private splitDotArgs(inner: string): string[] {
    let depth = 0;
    for (let i = 0; i < inner.length; i++) {
      if (inner[i] === '(') depth++;
      if (inner[i] === ')') depth--;
      if (inner[i] === ',' && depth === 0) {
        return [inner.slice(0, i).trim(), inner.slice(i + 1).trim()];
      }
    }
    return [inner.trim()];
  }

  /**
   * Evaluate an expression that may contain vector tokens,
   * extracting only the given component ('x' or 'y').
   */
  private evaluateComponent(expr: string, component: 'x' | 'y', ctx: EvaluationContext): number {
    let s = expr;
    s = this.replaceVectorTokens(s, component, ctx);
    s = this.replaceScalarTokens(s, ctx);
    const compiled = compile(s);
    const result = compiled.evaluate({});
    if (typeof result !== 'number') {
      throw new Error(`Expression "${expr}" did not evaluate to a number for component ${component}`);
    }
    return result;
  }

  // ─── Vector token replacement ────────────────────────────────

  private replaceVectorTokens(expr: string, comp: 'x' | 'y', ctx: EvaluationContext): string {
    let s = expr;

    // z[n], z[n-1], z[n-2], etc.
    s = s.replace(/z\[n(?:\s*-\s*(\d+))?\]/g, (_match, offset) => {
      const idx = ctx.n - (offset ? parseInt(offset) : 0);
      const p = this.safeVec(ctx.trajectory, idx);
      return `(${comp === 'x' ? p.x : p.y})`;
    });

    // z(t) alias for z[n]
    s = s.replace(/z\(t\)/g, () => {
      const p = this.safeVec(ctx.trajectory, ctx.n);
      return `(${comp === 'x' ? p.x : p.y})`;
    });

    // zbar[n], zbar[n-1]
    s = s.replace(/zbar\[n(?:\s*-\s*(\d+))?\]/g, (_match, offset) => {
      const idx = ctx.n - (offset ? parseInt(offset) : 0);
      const p = this.safeVec(ctx.preProjection, idx);
      return `(${comp === 'x' ? p.x : p.y})`;
    });

    // v[n] = (z[n] - z[n-1]) / h  (velocity vector)
    s = s.replace(/v\[n(?:\s*-\s*(\d+))?\]/g, (_match, offset) => {
      const idx = ctx.n - (offset ? parseInt(offset) : 0);
      const cur = this.safeVec(ctx.trajectory, idx);
      const prev = this.safeVec(ctx.trajectory, idx - 1);
      const val = (comp === 'x' ? cur.x - prev.x : cur.y - prev.y) / ctx.h;
      return `(${val})`;
    });

    // v(t) alias
    s = s.replace(/v\(t\)/g, () => {
      const cur = this.safeVec(ctx.trajectory, ctx.n);
      const prev = this.safeVec(ctx.trajectory, ctx.n - 1);
      const val = (comp === 'x' ? cur.x - prev.x : cur.y - prev.y) / ctx.h;
      return `(${val})`;
    });

    // G[n], G[n-1] (gradient vector at position, in world coords)
    s = s.replace(/G\[n(?:\s*-\s*(\d+))?\]/g, (_match, offset) => {
      const idx = ctx.n - (offset ? parseInt(offset) : 0);
      const g = this.computeGradientVector(ctx, idx);
      return `(${comp === 'x' ? g.x : g.y})`;
    });

    // Classical variants: z_cl[n], z_cl[n-1]
    s = s.replace(/z_cl\[n(?:\s*-\s*(\d+))?\]/g, (_match, offset) => {
      const idx = ctx.n - (offset ? parseInt(offset) : 0);
      const p = this.safeVec(ctx.classicalTrajectory, idx);
      return `(${comp === 'x' ? p.x : p.y})`;
    });

    // v_cl[n]
    s = s.replace(/v_cl\[n(?:\s*-\s*(\d+))?\]/g, (_match, offset) => {
      const idx = ctx.n - (offset ? parseInt(offset) : 0);
      const cur = this.safeVec(ctx.classicalTrajectory, idx);
      const prev = this.safeVec(ctx.classicalTrajectory, idx - 1);
      const val = (comp === 'x' ? cur.x - prev.x : cur.y - prev.y) / ctx.h;
      return `(${val})`;
    });

    // G_cl[n] (gradient at classical position)
    s = s.replace(/G_cl\[n(?:\s*-\s*(\d+))?\]/g, (_match, offset) => {
      const idx = ctx.n - (offset ? parseInt(offset) : 0);
      const g = this.computeGradientVectorClassical(ctx, idx);
      return `(${comp === 'x' ? g.x : g.y})`;
    });

    // c[n] (constraint center)
    s = s.replace(/c\[n(?:\s*-\s*(\d+))?\]/g, (_match, offset) => {
      const idx = ctx.n - (offset ? parseInt(offset) : 0);
      const p = this.safeVec(ctx.constraintCenters, idx);
      return `(${comp === 'x' ? p.x : p.y})`;
    });

    return s;
  }

  // ─── Pass 2: scalar token replacement ────────────────────────

  private replaceScalarTokens(expr: string, ctx: EvaluationContext): string {
    let s = expr;

    // g[n], g[n-1], g(z(t)), g(z[n])
    s = s.replace(/g\(z\(t\)\)/g, 'g[n]');
    s = s.replace(/g\(z\[n\]\)/g, 'g[n]');
    s = s.replace(/g\[n(?:\s*-\s*(\d+))?\]/g, (_match, offset) => {
      const idx = ctx.n - (offset ? parseInt(offset) : 0);
      return `(${this.evaluateConstraint(ctx, idx)})`;
    });

    // g_cl[n]
    s = s.replace(/g_cl\[n(?:\s*-\s*(\d+))?\]/g, (_match, offset) => {
      const idx = ctx.n - (offset ? parseInt(offset) : 0);
      return `(${this.evaluateConstraintClassical(ctx, idx)})`;
    });

    // lambda[n] = projDist / gradNorm
    s = s.replace(/lambda\[n(?:\s*-\s*(\d+))?\]/g, (_match, offset) => {
      const idx = ctx.n - (offset ? parseInt(offset) : 0);
      const projDist = this.safeScalar(ctx.projectionDistances, idx);
      const gradNorm = this.safeScalar(ctx.gradientNorms, idx);
      const val = gradNorm > 1e-10 ? projDist / gradNorm : 0;
      return `(${val})`;
    });

    // lambda_cl[n]
    s = s.replace(/lambda_cl\[n(?:\s*-\s*(\d+))?\]/g, (_match, offset) => {
      const idx = ctx.n - (offset ? parseInt(offset) : 0);
      // Classical projection distance: ||X_n - X_{n-1}||
      const cur = this.safeVec(ctx.classicalTrajectory, idx);
      const prev = this.safeVec(ctx.classicalTrajectory, idx - 1);
      const projDist = Math.sqrt((cur.x - prev.x) ** 2 + (cur.y - prev.y) ** 2);
      const gradNorm = this.safeScalar(ctx.classicalGradientNorms, idx);
      const val = gradNorm > 1e-10 ? projDist / gradNorm : 0;
      return `(${val})`;
    });

    // dt, epsilon, t, n
    s = s.replace(/\bdt\b/g, `(${ctx.h})`);
    s = s.replace(/\bepsilon\b/g, `(${ctx.epsilon})`);
    // Only replace standalone 't' not inside function names or other tokens
    s = s.replace(/\bt\b(?!\()/g, `(${ctx.t})`);
    // 'n' as standalone
    s = s.replace(/\bn\b(?!\[|\(|o)/g, `(${ctx.n})`);

    return s;
  }

  // ─── Check for leftover vector tokens ────────────────────────

  private checkForRemainingVectors(expr: string): void {
    const vectorPatterns = [
      /z\[n/, /z\(t\)/, /zbar\[n/, /v\[n/, /v\(t\)/,
      /G\[n/, /z_cl\[n/, /v_cl\[n/, /G_cl\[n/, /c\[n/,
    ];
    for (const pat of vectorPatterns) {
      if (pat.test(expr)) {
        throw new Error('Wrap vector expressions in norm() or dot()');
      }
    }
  }

  // ─── Helpers ─────────────────────────────────────────────────

  private safeVec(arr: Vec2[], idx: number): Vec2 {
    if (idx < 0 || idx >= arr.length) return { x: 0, y: 0 };
    return arr[idx];
  }

  private safeScalar(arr: number[], idx: number): number {
    if (idx < 0 || idx >= arr.length) return 0;
    return arr[idx];
  }

  /**
   * Evaluate constraint g(x,y) at trajectory position idx,
   * transforming to local coordinates.
   */
  private evaluateConstraint(ctx: EvaluationContext, idx: number): number {
    const pos = this.safeVec(ctx.trajectory, idx);
    const center = this.safeVec(ctx.constraintCenters, idx);
    const angle = idx >= 0 && idx < ctx.constraintAngles.length ? ctx.constraintAngles[idx] : 0;
    return this.evalConstraintAtPoint(ctx, pos, center, angle);
  }

  private evaluateConstraintClassical(ctx: EvaluationContext, idx: number): number {
    const pos = this.safeVec(ctx.classicalTrajectory, idx);
    const center = this.safeVec(ctx.constraintCenters, idx);
    const angle = idx >= 0 && idx < ctx.constraintAngles.length ? ctx.constraintAngles[idx] : 0;
    return this.evalConstraintAtPoint(ctx, pos, center, angle);
  }

  private evalConstraintAtPoint(ctx: EvaluationContext, pos: Vec2, center: Vec2, angle: number): number {
    // Transform to local coordinates
    const cosA = Math.cos(angle);
    const sinA = Math.sin(angle);
    const dx = pos.x - center.x;
    const dy = pos.y - center.y;
    const localX = cosA * dx + sinA * dy;
    const localY = -sinA * dx + cosA * dy;
    return ctx.constraintEvaluator(localX, localY);
  }

  /**
   * Compute gradient vector at trajectory position idx (in world coords).
   */
  private computeGradientVector(ctx: EvaluationContext, idx: number): Vec2 {
    const pos = this.safeVec(ctx.trajectory, idx);
    const center = this.safeVec(ctx.constraintCenters, idx);
    const angle = idx >= 0 && idx < ctx.constraintAngles.length ? ctx.constraintAngles[idx] : 0;
    return this.gradientAtPoint(ctx, pos, center, angle);
  }

  private computeGradientVectorClassical(ctx: EvaluationContext, idx: number): Vec2 {
    const pos = this.safeVec(ctx.classicalTrajectory, idx);
    const center = this.safeVec(ctx.constraintCenters, idx);
    const angle = idx >= 0 && idx < ctx.constraintAngles.length ? ctx.constraintAngles[idx] : 0;
    return this.gradientAtPoint(ctx, pos, center, angle);
  }

  private gradientAtPoint(ctx: EvaluationContext, pos: Vec2, center: Vec2, angle: number): Vec2 {
    // Transform to local coordinates
    const cosA = Math.cos(angle);
    const sinA = Math.sin(angle);
    const dx = pos.x - center.x;
    const dy = pos.y - center.y;
    const localX = cosA * dx + sinA * dy;
    const localY = -sinA * dx + cosA * dy;

    // Compute gradient in local coords
    const localGrad = numericalGradient(ctx.constraintEvaluator, localX, localY);

    // Rotate back to world coords
    return {
      x: cosA * localGrad.x - sinA * localGrad.y,
      y: sinA * localGrad.x + cosA * localGrad.y,
    };
  }
}
