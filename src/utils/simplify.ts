import type { Vec2 } from '@/types';

/**
 * Ramer-Douglas-Peucker line simplification.
 * Returns the indices of kept points (always includes first and last).
 */
export function rdpSimplify(points: Vec2[], tolerance: number): number[] {
  const n = points.length;
  if (n <= 2) {
    return n === 0 ? [] : n === 1 ? [0] : [0, 1];
  }

  const keep = new Uint8Array(n);
  keep[0] = 1;
  keep[n - 1] = 1;

  // Iterative stack-based implementation to avoid stack overflow on large inputs
  const stack: [number, number][] = [[0, n - 1]];

  while (stack.length > 0) {
    const [start, end] = stack.pop()!;
    if (end - start < 2) continue;

    const ax = points[start].x, ay = points[start].y;
    const bx = points[end].x, by = points[end].y;
    const dx = bx - ax, dy = by - ay;
    const lenSq = dx * dx + dy * dy;

    let maxDist = 0;
    let maxIdx = start;

    for (let i = start + 1; i < end; i++) {
      let dist: number;
      if (lenSq === 0) {
        const ex = points[i].x - ax, ey = points[i].y - ay;
        dist = Math.sqrt(ex * ex + ey * ey);
      } else {
        const t = Math.max(0, Math.min(1, ((points[i].x - ax) * dx + (points[i].y - ay) * dy) / lenSq));
        const px = ax + t * dx - points[i].x;
        const py = ay + t * dy - points[i].y;
        dist = Math.sqrt(px * px + py * py);
      }
      if (dist > maxDist) {
        maxDist = dist;
        maxIdx = i;
      }
    }

    if (maxDist > tolerance) {
      keep[maxIdx] = 1;
      stack.push([start, maxIdx], [maxIdx, end]);
    }
  }

  const result: number[] = [];
  for (let i = 0; i < n; i++) {
    if (keep[i]) result.push(i);
  }
  return result;
}
