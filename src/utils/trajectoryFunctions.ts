import type {
  Vec2,
  ParametricTrajectory,
  CircularParams,
  EllipseParams,
  LissajousParams,
  LinearParams,
} from '@/types';

/**
 * Create a trajectory function from parametric configuration
 */
export function createTrajectoryFunction(
  trajectory: ParametricTrajectory
): (t: number) => Vec2 {
  switch (trajectory.type) {
    case 'circular': {
      const p = trajectory.params as CircularParams;
      return (t: number) => ({
        x: p.centerX + p.radius * Math.cos(p.omega * t + p.phase),
        y: p.centerY + p.radius * Math.sin(p.omega * t + p.phase),
      });
    }

    case 'ellipse': {
      const p = trajectory.params as EllipseParams;
      return (t: number) => ({
        x: p.centerX + p.semiMajor * Math.cos(p.omega * t + p.phase),
        y: p.centerY + p.semiMinor * Math.sin(p.omega * t + p.phase),
      });
    }

    case 'lissajous': {
      const p = trajectory.params as LissajousParams;
      return (t: number) => ({
        x: p.centerX + p.amplitudeX * Math.sin(p.freqX * t + p.phaseX),
        y: p.centerY + p.amplitudeY * Math.sin(p.freqY * t + p.phaseY),
      });
    }

    case 'linear': {
      const p = trajectory.params as LinearParams;
      return (t: number) => ({
        x: p.startX + p.velocityX * t,
        y: p.startY + p.velocityY * t,
      });
    }

    default:
      // Default: stationary at origin
      return () => ({ x: 0, y: 0 });
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
