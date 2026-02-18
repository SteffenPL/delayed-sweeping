import { describe, it, expect } from 'vitest';
import {
  createExpressionEvaluator,
  projectToConstraint,
} from '../expressionConstraint';
import type { Vec2 } from '@/types';

/**
 * Brute-force closest point on ellipse boundary.
 * Samples the ellipse boundary densely and returns the closest point.
 */
function bruteForceProjectEllipse(
  point: Vec2,
  a: number,
  b: number,
  numSamples = 100_000
): Vec2 {
  let bestDist = Infinity;
  let bestPoint: Vec2 = { x: 0, y: 0 };

  for (let i = 0; i < numSamples; i++) {
    const theta = (2 * Math.PI * i) / numSamples;
    const bx = a * Math.cos(theta);
    const by = b * Math.sin(theta);
    const dx = bx - point.x;
    const dy = by - point.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < bestDist) {
      bestDist = dist;
      bestPoint = { x: bx, y: by };
    }
  }

  return bestPoint;
}

function dist(a: Vec2, b: Vec2): number {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}

/**
 * Check if a point lies on the ellipse boundary (x/a)^2 + (y/b)^2 ≈ 1
 */
function ellipseValue(p: Vec2, a: number, b: number): number {
  return (p.x / a) ** 2 + (p.y / b) ** 2;
}

describe('Ellipse projection', () => {
  // Ellipse: (x/a)^2 + (y/b)^2 <= 1, i.e. g(x,y) = 1 - (x/a)^2 - (y/b)^2 >= 0
  const a = 2;
  const b = 1;
  const context = { R: 1, r: 1, a, b };
  const expression = '1 - (x/a)^2 - (y/b)^2';
  const evaluator = createExpressionEvaluator(expression, context);

  it('should return the point itself when inside the ellipse', () => {
    const point: Vec2 = { x: 0.5, y: 0.3 };
    const result = projectToConstraint(evaluator, point);
    expect(result.x).toBeCloseTo(point.x, 10);
    expect(result.y).toBeCloseTo(point.y, 10);
  });

  it('should project to the boundary (g ≈ 0)', () => {
    const point: Vec2 = { x: 3, y: 0 };
    const result = projectToConstraint(evaluator, point);
    const gVal = evaluator(result.x, result.y);
    expect(Math.abs(gVal)).toBeLessThan(1e-6);
  });

  it('should project points on the major axis correctly', () => {
    // Point on the x-axis outside: closest boundary point is (a, 0)
    const point: Vec2 = { x: 4, y: 0 };
    const result = projectToConstraint(evaluator, point);
    const bruteForce = bruteForceProjectEllipse(point, a, b);

    expect(result.x).toBeCloseTo(bruteForce.x, 2);
    expect(result.y).toBeCloseTo(bruteForce.y, 2);
  });

  it('should project points on the minor axis correctly', () => {
    // Point on the y-axis outside: closest boundary point is (0, b)
    const point: Vec2 = { x: 0, y: 3 };
    const result = projectToConstraint(evaluator, point);
    const bruteForce = bruteForceProjectEllipse(point, a, b);

    expect(result.x).toBeCloseTo(bruteForce.x, 2);
    expect(result.y).toBeCloseTo(bruteForce.y, 2);
  });

  describe('off-axis points: Newton vs brute-force closest point', () => {
    // These test cases expose the core issue: Newton's method projects along
    // the gradient to reach g=0, but this is NOT the metric projection
    // (closest point). For ellipses with a != b, these differ.

    const testPoints: { label: string; point: Vec2 }[] = [
      { label: 'diagonal far', point: { x: 3, y: 2 } },
      { label: 'near major axis', point: { x: 2.5, y: 0.5 } },
      { label: 'near minor axis', point: { x: 0.5, y: 1.5 } },
      { label: 'quadrant II', point: { x: -2, y: 1.5 } },
      { label: 'quadrant III', point: { x: -3, y: -1 } },
      { label: '45 degrees', point: { x: 2, y: 2 } },
      { label: 'barely outside', point: { x: 1.5, y: 0.8 } },
    ];

    for (const { label, point } of testPoints) {
      it(`should project to closest boundary point: ${label}`, () => {
        const result = projectToConstraint(evaluator, point);
        const bruteForce = bruteForceProjectEllipse(point, a, b);

        // Result should be on the boundary
        const gVal = evaluator(result.x, result.y);
        expect(
          Math.abs(gVal),
          `Newton result should be on boundary (g=${gVal})`
        ).toBeLessThan(1e-4);

        // Distance from Newton projection to the point
        const newtonDist = dist(result, point);
        // Distance from brute-force closest point to the point
        const bruteDist = dist(bruteForce, point);

        // The Newton projection should achieve a distance close to the
        // brute-force minimum distance (metric projection).
        // A large discrepancy means Newton is NOT finding the closest point.
        const relativeError =
          bruteDist > 1e-10
            ? Math.abs(newtonDist - bruteDist) / bruteDist
            : Math.abs(newtonDist - bruteDist);

        expect(
          relativeError,
          `Newton dist=${newtonDist.toFixed(6)}, ` +
            `brute-force dist=${bruteDist.toFixed(6)}, ` +
            `Newton point=(${result.x.toFixed(4)}, ${result.y.toFixed(4)}), ` +
            `brute-force point=(${bruteForce.x.toFixed(4)}, ${bruteForce.y.toFixed(4)})`
        ).toBeLessThan(0.01); // 1% relative error tolerance
      });
    }
  });

  describe('circle (a = b): Newton should match closest point', () => {
    // For circles, gradient projection coincides with metric projection
    const R = 1.5;
    const circleEvaluator = createExpressionEvaluator(
      'R - sqrt(x^2 + y^2)',
      { R, r: 1, a: 1, b: 1 }
    );

    const circlePoints: Vec2[] = [
      { x: 3, y: 0 },
      { x: 0, y: 3 },
      { x: 2, y: 2 },
      { x: -1, y: -2 },
    ];

    for (const point of circlePoints) {
      it(`should match closest point for circle at (${point.x}, ${point.y})`, () => {
        const result = projectToConstraint(circleEvaluator, point);

        // For a circle, the closest boundary point is R * normalize(point)
        const len = Math.sqrt(point.x ** 2 + point.y ** 2);
        const expected: Vec2 = {
          x: (R * point.x) / len,
          y: (R * point.y) / len,
        };

        expect(result.x).toBeCloseTo(expected.x, 4);
        expect(result.y).toBeCloseTo(expected.y, 4);
      });
    }
  });

  describe('highly eccentric ellipse (a >> b)', () => {
    const bigA = 5;
    const smallB = 0.5;
    const eccentricEvaluator = createExpressionEvaluator(
      '1 - (x/a)^2 - (y/b)^2',
      { R: 1, r: 1, a: bigA, b: smallB }
    );

    it('should find closest point for eccentric ellipse', () => {
      const point: Vec2 = { x: 1, y: 2 };
      const result = projectToConstraint(eccentricEvaluator, point);
      const bruteForce = bruteForceProjectEllipse(point, bigA, smallB);

      const newtonDist = dist(result, point);
      const bruteDist = dist(bruteForce, point);
      const relativeError =
        bruteDist > 1e-10
          ? Math.abs(newtonDist - bruteDist) / bruteDist
          : Math.abs(newtonDist - bruteDist);

      expect(
        relativeError,
        `Eccentric ellipse: Newton dist=${newtonDist.toFixed(6)}, ` +
          `brute-force dist=${bruteDist.toFixed(6)}`
      ).toBeLessThan(0.01);
    });
  });
});
