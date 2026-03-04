import type { AggregationMode } from './types';

/**
 * Reduce an array of per-step formula values to a single number
 */
export function aggregate(values: number[], h: number, mode: AggregationMode): number {
  if (values.length === 0) return 0;

  switch (mode) {
    case 'final':
      return values[values.length - 1];

    case 'integral': {
      // Trapezoidal rule: h * (v[0]/2 + v[1] + ... + v[N-1] + v[N]/2)
      let sum = 0;
      for (let i = 0; i < values.length; i++) {
        const w = (i === 0 || i === values.length - 1) ? 0.5 : 1;
        sum += w * values[i];
      }
      return h * sum;
    }

    case 'l2-integral': {
      // sqrt(h * sum(v_i^2))
      let sum = 0;
      for (let i = 0; i < values.length; i++) {
        sum += values[i] * values[i];
      }
      return Math.sqrt(h * sum);
    }

    case 'h1-seminorm': {
      // sqrt(h * sum(((v[i]-v[i-1])/h)^2))
      let sum = 0;
      for (let i = 1; i < values.length; i++) {
        const diff = (values[i] - values[i - 1]) / h;
        sum += diff * diff;
      }
      return Math.sqrt(h * sum);
    }

    case 'minimum': {
      let min = values[0];
      for (let i = 1; i < values.length; i++) {
        if (values[i] < min) min = values[i];
      }
      return min;
    }

    case 'maximum': {
      let max = values[0];
      for (let i = 1; i < values.length; i++) {
        if (values[i] > max) max = values[i];
      }
      return max;
    }

    default:
      return values[values.length - 1];
  }
}
