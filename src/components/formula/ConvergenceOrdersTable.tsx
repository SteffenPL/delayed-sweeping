import type { ConvergenceOrderPoint } from '@/formula/convergenceOrder';
import { computeAverageOrder } from '@/formula/convergenceOrder';

interface ConvergenceOrdersTableProps {
  orders: ConvergenceOrderPoint[];
}

export function ConvergenceOrdersTable({ orders }: ConvergenceOrdersTableProps) {
  if (orders.length === 0) return null;

  const avgOrder = computeAverageOrder(orders);

  return (
    <div className="convergence-orders-table">
      <table>
        <thead>
          <tr>
            <th>h₁ → h₂</th>
            <th>Error ratio</th>
            <th>Est. order</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((o, i) => (
            <tr key={i}>
              <td className="mono">{o.paramPair[0].toPrecision(3)} → {o.paramPair[1].toPrecision(3)}</td>
              <td className="mono">{(o.errorPair[1] / o.errorPair[0]).toPrecision(3)}</td>
              <td className="mono">{o.order.toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {avgOrder !== null && (
        <div className="convergence-avg-order">
          Avg. order: <strong>~{avgOrder.toFixed(2)}</strong>
        </div>
      )}
    </div>
  );
}
