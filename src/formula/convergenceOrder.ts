export interface ConvergenceOrderPoint {
  paramPair: [number, number];
  errorPair: [number, number];
  order: number;
}

/**
 * Compute estimated convergence orders from consecutive (paramValue, error) pairs.
 * order_i = log(E_{i+1} / E_i) / log(p_{i+1} / p_i)
 *
 * Expects results sorted by ascending paramValue.
 * Filters out non-positive errors and non-finite orders.
 */
export function computeConvergenceOrders(
  results: { paramValue: number; formulaValue: number }[]
): ConvergenceOrderPoint[] {
  const orders: ConvergenceOrderPoint[] = [];
  for (let i = 0; i < results.length - 1; i++) {
    const p1 = results[i].paramValue;
    const p2 = results[i + 1].paramValue;
    const e1 = results[i].formulaValue;
    const e2 = results[i + 1].formulaValue;

    if (e1 <= 0 || e2 <= 0 || p1 <= 0 || p2 <= 0 || p1 === p2) continue;

    const order = Math.log(e2 / e1) / Math.log(p2 / p1);
    if (!isFinite(order)) continue;

    orders.push({
      paramPair: [p1, p2],
      errorPair: [e1, e2],
      order,
    });
  }
  return orders;
}

/**
 * Compute the average of estimated convergence orders.
 * Returns null if no valid orders.
 */
export function computeAverageOrder(orders: ConvergenceOrderPoint[]): number | null {
  if (orders.length === 0) return null;
  const sum = orders.reduce((acc, o) => acc + o.order, 0);
  return sum / orders.length;
}
