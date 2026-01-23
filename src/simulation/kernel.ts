/**
 * Compute normalized discrete kernel weights for exponential kernel.
 *
 * For the exponential kernel rho(a) = lambda * e^(-lambda * a):
 *
 *   R_j = (1/h) * integral from j*h to (j+1)*h of rho(a) da
 *       = (1/h) * e^(-lambda * j * h) * (1 - e^(-lambda * h))
 *
 *   r_tilde_j = R_j / mu_0h
 *
 * where mu_0h = h * sum(R_j) normalizes the weights.
 *
 * @param lambda - Decay rate of exponential kernel (larger = shorter memory)
 * @param h - Time step size
 * @param tol - Truncation tolerance (default 1e-12)
 * @returns Array of normalized weights r_tilde_j for j = 0, 1, 2, ...
 */
export function computeDiscreteWeights(
  lambda: number,
  h: number,
  tol: number = 1e-12
): number[] {
  // Truncation index: find J_max such that e^(-lambda * J_max * h) < tol
  const J_max = Math.min(
    Math.ceil(-Math.log(tol) / (lambda * h)),
    100000 // Safety cap to prevent memory issues
  );

  // Compute R_j values
  const R: number[] = [];
  const factor = (1 / h) * (1 - Math.exp(-lambda * h));

  for (let j = 0; j < J_max; j++) {
    R.push(factor * Math.exp(-lambda * j * h));
  }

  // Compute normalization: mu_0h = h * sum(R_j)
  const mu_0h = h * R.reduce((sum, r) => sum + r, 0);

  // Normalize: r_tilde_j = R_j / mu_0h
  return R.map((r) => r / mu_0h);
}

/**
 * Get the effective memory length (time span with significant weights)
 * @param lambda - Decay rate
 * @param tol - Threshold for "significant"
 * @returns Time span in simulation time units
 */
export function getMemoryLength(lambda: number, tol: number = 0.01): number {
  return -Math.log(tol) / lambda;
}
