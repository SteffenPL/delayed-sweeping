import type { SolverType } from '@/types';

/**
 * Compute normalized discrete kernel weights for exponential kernel.
 *
 * Supports three solver types:
 * - 'norm1-sum1': Normalize with j>=1, sum with j>=1 (default)
 * - 'norm0-sum1': Normalize with j>=0, sum with j>=1
 * - 'trapezoidal': Trapezoidal rule with predictor-corrector
 *
 * @param epsilon - Decay rate of exponential kernel (larger = shorter memory)
 * @param h - Time step size
 * @param solverType - Discretization scheme to use
 * @param tol - Truncation tolerance (default 1e-12)
 * @returns Array of normalized weights for j = 0, 1, 2, ...
 */
export function computeDiscreteWeights(
  epsilon: number,
  h: number,
  solverType: SolverType = 'norm1-sum1',
  tol: number = 1e-12
): number[] {
  // Truncation index: find J_max such that e^(-epsilon * J_max * h) < tol
  const J_max = Math.min(
    Math.ceil(-Math.log(tol) / (epsilon * h)),
    100000 // Safety cap to prevent memory issues
  );

  if (solverType === 'trapezoidal') {
    return computeTrapezoidalWeights(epsilon, h, J_max);
  } else {
    return computeExactIntegrationWeights(epsilon, h, J_max, solverType);
  }
}

/**
 * Compute weights using exact integration over intervals
 * Used by 'norm1-sum1' and 'norm0-sum1' solvers
 */
function computeExactIntegrationWeights(
  epsilon: number,
  h: number,
  J_max: number,
  solverType: 'norm1-sum1' | 'norm0-sum1'
): number[] {
  // Compute R_j = (1/h) * integral from j*h to (j+1)*h of rho(a) da
  //             = (1/h) * e^(-epsilon * j * h) * (1 - e^(-epsilon * h))
  const R: number[] = [];
  const factor = (1 / h) * (1 - Math.exp(-epsilon * h));

  for (let j = 0; j < J_max; j++) {
    R.push(factor * Math.exp(-epsilon * j * h));
  }

  // Compute normalization
  let mu_0h: number;
  if (solverType === 'norm1-sum1') {
    // Normalize over j >= 1 (exclude j=0)
    mu_0h = h * R.slice(1).reduce((sum, r) => sum + r, 0);
  } else {
    // norm0-sum1: Normalize over j >= 0 (include j=0)
    mu_0h = h * R.reduce((sum, r) => sum + r, 0);
  }

  // Normalize: r_tilde_j = R_j / mu_0h
  return R.map((r) => r / mu_0h);
}

/**
 * Compute weights using trapezoidal rule
 * Used by 'trapezoidal' solver
 */
function computeTrapezoidalWeights(
  epsilon: number,
  h: number,
  J_max: number
): number[] {
  // Trapezoidal weights: W_j = h * epsilon * e^(-epsilon * j * h)
  // with endpoint corrections (factor 1/2)
  const W: number[] = [];

  // j = 0: endpoint with factor 1/2
  W.push((h / 2) * epsilon);

  // j = 1, 2, ..., J_max-2: interior points
  for (let j = 1; j < J_max - 1; j++) {
    W.push(h * epsilon * Math.exp(-epsilon * j * h));
  }

  // j = J_max-1: endpoint with factor 1/2
  W.push((h / 2) * epsilon * Math.exp(-epsilon * (J_max - 1) * h));

  // Compute normalization: mu_trap = sum of weights + tail contribution
  // Tail: integral from J_max*h to infinity = e^(-epsilon * J_max * h)
  const tail_den = Math.exp(-epsilon * (J_max - 1) * h);
  const mu_trap = W.reduce((sum, w) => sum + w, 0) + tail_den;

  // Normalize: w_tilde_j = W_j / mu_trap
  return W.map((w) => w / mu_trap);
}

/**
 * Get the effective memory length (time span with significant weights)
 * @param epsilon - Decay rate
 * @param tol - Threshold for "significant"
 * @returns Time span in simulation time units
 */
export function getMemoryLength(epsilon: number, tol: number = 0.01): number {
  return -Math.log(tol) / epsilon;
}
