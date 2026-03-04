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

const SUPERSCRIPT_DIGITS: Record<string, string> = {
  '0': '\u2070', '1': '\u00B9', '2': '\u00B2', '3': '\u00B3', '4': '\u2074',
  '5': '\u2075', '6': '\u2076', '7': '\u2077', '8': '\u2078', '9': '\u2079',
  '-': '\u207B',
};

function toSuperscript(n: number): string {
  return String(Math.round(n)).split('').map(c => SUPERSCRIPT_DIGITS[c] ?? c).join('');
}

function formatLogTick(logVal: number): string {
  const rounded = Math.round(logVal);
  if (Math.abs(logVal - rounded) < 0.01) {
    return `10${toSuperscript(rounded)}`;
  }
  return formatTick(Math.pow(10, logVal));
}

function generateLogTicks(logMin: number, logMax: number): number[] {
  const ticks: number[] = [];
  for (let p = Math.floor(logMin); p <= Math.ceil(logMax); p++) {
    ticks.push(p);
  }
  return ticks;
}

export const FormulaPlotChart = forwardRef<HTMLDivElement, FormulaPlotChartProps>(
  function FormulaPlotChart({ data, xLabel, yLabel, logXAxis = false, logYAxis = false }, ref) {
    const { displayData, xKey, yKey, logXMin, logXMax, logYMin, logYMax } = useMemo(() => {
      // Downsample first
      const maxPoints = 500;
      const sampled =
        data.length > maxPoints
          ? data.filter((_, i) => i % Math.ceil(data.length / maxPoints) === 0)
          : data;

      if (!logXAxis && !logYAxis) {
        return { displayData: sampled, xKey: 'x' as const, yKey: 'y' as const, logXMin: 0, logXMax: 0, logYMin: 0, logYMax: 0 };
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

      // Compute log-space bounds for tick generation
      let xMin = 0, xMax = 0, yMin = 0, yMax = 0;
      if (transformed.length > 0) {
        if (logXAxis) {
          const logXVals = transformed.map(d => d.logX);
          xMin = Math.min(...logXVals);
          xMax = Math.max(...logXVals);
        }
        if (logYAxis) {
          const logYVals = transformed.map(d => d.logY);
          yMin = Math.min(...logYVals);
          yMax = Math.max(...logYVals);
        }
      }

      return {
        displayData: transformed,
        xKey: (logXAxis ? 'logX' : 'x') as string,
        yKey: (logYAxis ? 'logY' : 'y') as string,
        logXMin: xMin,
        logXMax: xMax,
        logYMin: yMin,
        logYMax: yMax,
      };
    }, [data, logXAxis, logYAxis]);

    if (displayData.length === 0) {
      return <div className="no-data">No data to display{(logXAxis || logYAxis) ? ' (log scale requires positive values)' : ''}</div>;
    }

    const xTickFormatter = logXAxis
      ? (v: number) => formatLogTick(v)
      : (v: number) => formatTick(v);

    const yTickFormatter = logYAxis
      ? (v: number) => formatLogTick(v)
      : (v: number) => formatTick(v);

    const xTicks = logXAxis ? generateLogTicks(logXMin, logXMax) : undefined;
    const yTicks = logYAxis ? generateLogTicks(logYMin, logYMax) : undefined;

    const xDomain: [number, number] | undefined = logXAxis
      ? [Math.floor(logXMin) - 0.2, Math.ceil(logXMax) + 0.2]
      : undefined;
    const yDomain: [number, number] | undefined = logYAxis
      ? [Math.floor(logYMin) - 0.2, Math.ceil(logYMax) + 0.2]
      : undefined;

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
              type="number"
              tick={{ fontSize: 11 }}
              tickFormatter={xTickFormatter}
              ticks={xTicks}
              domain={xDomain ?? ['auto', 'auto']}
              label={{
                value: xLabel + (logXAxis ? ' (log)' : ''),
                position: 'insideBottomRight',
                offset: -5,
              }}
            />
            <YAxis
              tick={{ fontSize: 11 }}
              tickFormatter={yTickFormatter}
              ticks={yTicks}
              domain={yDomain ?? ['auto', 'auto']}
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
              dot={false}
              strokeWidth={1.5}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    );
  }
);
