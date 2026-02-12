import type { Vec2 } from '@/types';

/**
 * Binary search for the interval [times[lo], times[lo+1]] containing t.
 * Returns the lower index. Clamps to endpoints.
 */
function findInterval(times: number[], t: number): number {
  if (t <= times[0]) return 0;
  if (t >= times[times.length - 1]) return times.length - 2;

  let lo = 0;
  let hi = times.length - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (times[mid] <= t) lo = mid;
    else hi = mid;
  }
  return lo;
}

/**
 * Linearly interpolate a Vec2 trajectory at time t.
 * Clamps to first/last value outside the time range.
 */
export function interpolateVec2(times: number[], traj: Vec2[], t: number): Vec2 {
  if (traj.length === 0) return { x: 0, y: 0 };
  if (traj.length === 1 || t <= times[0]) return traj[0];
  if (t >= times[times.length - 1]) return traj[traj.length - 1];

  const i = findInterval(times, t);
  const dt = times[i + 1] - times[i];
  if (dt === 0) return traj[i];
  const alpha = (t - times[i]) / dt;
  return {
    x: traj[i].x + alpha * (traj[i + 1].x - traj[i].x),
    y: traj[i].y + alpha * (traj[i + 1].y - traj[i].y),
  };
}

/**
 * Linearly interpolate a scalar time series at time t.
 * Clamps to first/last value outside the time range.
 */
export function interpolateScalar(times: number[], vals: number[], t: number): number {
  if (vals.length === 0) return 0;
  if (vals.length === 1 || t <= times[0]) return vals[0];
  if (t >= times[times.length - 1]) return vals[vals.length - 1];

  const i = findInterval(times, t);
  const dt = times[i + 1] - times[i];
  if (dt === 0) return vals[i];
  const alpha = (t - times[i]) / dt;
  return vals[i] + alpha * (vals[i + 1] - vals[i]);
}
