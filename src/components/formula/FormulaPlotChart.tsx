import { forwardRef, useMemo } from 'react';
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
  logXAxis?: boolean;
  logYAxis?: boolean;
}

function formatTick(v: unknown): string {
  if (typeof v !== 'number') return String(v);
  if (v === 0) return '0';
  if (Math.abs(v) < 0.01 || Math.abs(v) >= 1000) return v.toExponential(2);
  return v.toPrecision(4);
}

export const FormulaPlotChart = forwardRef<HTMLDivElement, FormulaPlotChartProps>(
  function FormulaPlotChart({ data, xLabel, yLabel, logXAxis = false, logYAxis = false }, ref) {
    // For log axes, transform the data: use log10 of the values as plot coordinates
    // and show original values in ticks/tooltips
    const { displayData, xKey, yKey } = useMemo(() => {
      // Downsample first
      const maxPoints = 500;
      const sampled =
        data.length > maxPoints
          ? data.filter((_, i) => i % Math.ceil(data.length / maxPoints) === 0)
          : data;

      if (!logXAxis && !logYAxis) {
        return { displayData: sampled, xKey: 'x' as const, yKey: 'y' as const };
      }

      // Transform data for log axes
      const transformed = sampled
        .filter((d) => {
          if (logXAxis && d.x <= 0) return false;
          if (logYAxis && d.y <= 0) return false;
          return true;
        })
        .map((d) => ({
          x: d.x,
          y: d.y,
          logX: logXAxis ? Math.log10(d.x) : d.x,
          logY: logYAxis ? Math.log10(d.y) : d.y,
        }));

      return {
        displayData: transformed,
        xKey: (logXAxis ? 'logX' : 'x') as string,
        yKey: (logYAxis ? 'logY' : 'y') as string,
      };
    }, [data, logXAxis, logYAxis]);

    if (displayData.length === 0) {
      return <div className="no-data">No data to display{(logXAxis || logYAxis) ? ' (log scale requires positive values)' : ''}</div>;
    }

    const xTickFormatter = logXAxis
      ? (v: number) => formatTick(Math.pow(10, v))
      : (v: number) => formatTick(v);

    const yTickFormatter = logYAxis
      ? (v: number) => formatTick(Math.pow(10, v))
      : (v: number) => formatTick(v);

    const tooltipLabelFormatter = logXAxis
      ? (v: number) => `${xLabel} = ${Math.pow(10, v).toPrecision(4)}`
      : (v: number) => `${xLabel} = ${(typeof v === 'number' ? v : Number(v)).toPrecision(4)}`;

    const tooltipValueFormatter = (value: number) => {
      const actual = logYAxis ? Math.pow(10, value) : value;
      return [actual.toFixed(6), yLabel];
    };

    return (
      <div className="formula-chart-container" ref={ref}>
        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={displayData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              dataKey={xKey}
              tick={{ fontSize: 11 }}
              tickFormatter={xTickFormatter}
              label={{
                value: xLabel + (logXAxis ? ' (log)' : ''),
                position: 'insideBottomRight',
                offset: -5,
              }}
            />
            <YAxis
              tick={{ fontSize: 11 }}
              tickFormatter={yTickFormatter}
              label={logYAxis ? { value: 'log', angle: -90, position: 'insideLeft', offset: 5, style: { fontSize: 10 } } : undefined}
            />
            <Tooltip
              formatter={tooltipValueFormatter}
              labelFormatter={tooltipLabelFormatter}
            />
            <Line
              type="monotone"
              dataKey={yKey}
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
