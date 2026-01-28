import {
  LineChart as RechartsLineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

interface Metric {
  id: string;
  label: string;
  color: string;
}

interface ConvergenceChartProps {
  data: Record<string, number>[];
  metrics: Metric[];
}

export function ConvergenceChart({ data, metrics }: ConvergenceChartProps) {
  if (data.length === 0 || metrics.length === 0) {
    return (
      <div className="convergence-chart-empty">
        No data to display. Run convergence test and select metrics.
      </div>
    );
  }

  return (
    <div className="convergence-chart">
      <ResponsiveContainer width="100%" height={250}>
        <RechartsLineChart
          data={data}
          margin={{ top: 5, right: 20, left: 10, bottom: 25 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis
            dataKey="log2h"
            tick={{ fontSize: 11 }}
            tickFormatter={(v) => `2^${v.toFixed(0)}`}
            label={{ value: 'log₂(dt)', position: 'insideBottom', offset: -15 }}
            reversed
          />
          <YAxis
            tick={{ fontSize: 11 }}
            tickFormatter={(v) => {
              if (Math.abs(v) >= 1000 || (Math.abs(v) < 0.01 && v !== 0)) {
                return v.toExponential(1);
              }
              return v.toFixed(2);
            }}
            label={{ value: 'Terminal Value', angle: -90, position: 'insideLeft', offset: 5 }}
          />
          <Tooltip
            formatter={(value: number, name: string) => [value.toExponential(4), name]}
            labelFormatter={(label: number) => `dt = 2^${label.toFixed(2)} ≈ ${Math.pow(2, label).toExponential(3)}`}
          />
          <Legend wrapperStyle={{ paddingTop: '10px' }} />
          {metrics.map((metric) => (
            <Line
              key={metric.id}
              type="monotone"
              dataKey={metric.id}
              name={metric.label}
              stroke={metric.color}
              strokeWidth={2}
              dot={{ r: 4 }}
              activeDot={{ r: 6 }}
              connectNulls
            />
          ))}
        </RechartsLineChart>
      </ResponsiveContainer>
    </div>
  );
}
