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

interface LineChartProps {
  data: Record<string, number>[];
  metrics: Metric[];
}

export function LineChart({ data, metrics }: LineChartProps) {
  // Downsample if too many points
  const maxPoints = 500;
  const displayData =
    data.length > maxPoints
      ? data.filter((_, i) => i % Math.ceil(data.length / maxPoints) === 0)
      : data;

  return (
    <div className="line-chart">
      <ResponsiveContainer width="100%" height={200}>
        <RechartsLineChart
          data={displayData}
          margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis
            dataKey="time"
            tick={{ fontSize: 11 }}
            tickFormatter={(v) => v.toFixed(1)}
            label={{ value: 'Time t', position: 'insideBottomRight', offset: -5 }}
          />
          <YAxis tick={{ fontSize: 11 }} />
          <Tooltip
            formatter={(value: number) => value.toFixed(4)}
            labelFormatter={(label: number) => `t = ${label.toFixed(3)}`}
          />
          <Legend />
          {metrics.map((metric) => (
            <Line
              key={metric.id}
              type="monotone"
              dataKey={metric.id}
              name={metric.label}
              stroke={metric.color}
              dot={false}
              strokeWidth={1.5}
            />
          ))}
        </RechartsLineChart>
      </ResponsiveContainer>
    </div>
  );
}
