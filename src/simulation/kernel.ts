/**
 * Compute normalized discrete kernel weights for exponential kernel.
 *
 * For the exponential kernel rho(a) = epsilon * e^(-epsilon * a):
 *
 *   R_j = (1/h) * integral from j*h to (j+1)*h of rho(a) da
 *       = (1/h) * e^(-epsilon * j * h) * (1 - e^(-epsilon * h))
 *
 *   r_tilde_j = R_j / mu_0h
 *
 * where mu_0h = h * sum(R_j) normalizes the weights.
 *
 * @param epsilon - Decay rate of exponential kernel (larger = shorter memory)
 * @param h - Time step size
 * @param tol - Truncation tolerance (default 1e-12)
 * @returns Array of normalized weights r_tilde_j for j = 0, 1, 2, ...
 */
export function computeDiscreteWeights(
  epsilon: number,
  h: number,
  tol: number = 1e-12
): number[] {
  // Truncation index: find J_max such that e^(-epsilon * J_max * h) < tol
  const J_max = Math.min(
    Math.ceil(-Math.log(tol) / (epsilon * h)),
    100000 // Safety cap to prevent memory issues
  );

  // Compute R_j values for j = 0, 1, 2, ..., J_max-1
  const R: number[] = [];
  const factor = (1 / h) * (1 - Math.exp(-epsilon * h));

  for (let j = 0; j < J_max; j++) {
    R.push(factor * Math.exp(-epsilon * j * h));
  }

  // Compute normalization: mu_0h = h * sum_{j>=1} R_j
  // NOTE: We skip j=0 because the simulation loop starts at j=1
  // (the delayed state X_bar^n depends on X^{n-1}, X^{n-2}, ..., not X^n)
  const mu_0h = h * R.slice(1).reduce((sum, r) => sum + r, 0);

  // Normalize: r_tilde_j = R_j / mu_0h
  return R.map((r) => r / mu_0h);
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
