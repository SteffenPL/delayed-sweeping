import { forwardRef } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

interface FormulaPlotChartProps {
  data: { x: number; y: number }[];
  xLabel: string;
  yLabel: string;
}

export const FormulaPlotChart = forwardRef<HTMLDivElement, FormulaPlotChartProps>(
  function FormulaPlotChart({ data, xLabel, yLabel }, ref) {
    // Downsample if too many points
    const maxPoints = 500;
    const displayData =
      data.length > maxPoints
        ? data.filter((_, i) => i % Math.ceil(data.length / maxPoints) === 0)
        : data;

    if (displayData.length === 0) {
      return <div className="no-data">No data to display</div>;
    }

    return (
      <div className="formula-chart-container" ref={ref}>
        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={displayData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              dataKey="x"
              tick={{ fontSize: 11 }}
              tickFormatter={(v) => typeof v === 'number' ? (Math.abs(v) < 0.01 || Math.abs(v) >= 1000 ? v.toExponential(2) : v.toPrecision(4)) : v}
              label={{ value: xLabel, position: 'insideBottomRight', offset: -5 }}
            />
            <YAxis
              tick={{ fontSize: 11 }}
              tickFormatter={(v) => typeof v === 'number' ? (Math.abs(v) < 0.01 || Math.abs(v) >= 1000 ? v.toExponential(2) : v.toPrecision(4)) : v}
            />
            <Tooltip
              formatter={(value: number) => [value.toFixed(6), yLabel]}
              labelFormatter={(label: number) => `${xLabel} = ${label.toPrecision(4)}`}
            />
            <Line
              type="monotone"
              dataKey="y"
              name={yLabel}
              stroke="#3b82f6"
              dot={displayData.length <= 30}
              strokeWidth={1.5}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    );
  }
);
