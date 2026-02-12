import { useState } from 'react';
import katex from 'katex';
import type { ParameterStudyConfig as Config, StudyParameter, AggregationMode, ScalingMode } from '@/formula';

const PARAMETERS: { value: StudyParameter; label: string }[] = [
  { value: 'epsilon', label: 'epsilon' },
  { value: 'h', label: 'h (time step)' },
  { value: 'T', label: 'T (final time)' },
  { value: 'R', label: 'R' },
  { value: 'r', label: 'r' },
  { value: 'a', label: 'a' },
  { value: 'b', label: 'b' },
];

const AGGREGATIONS: { value: AggregationMode; label: string; latex: string }[] = [
  {
    value: 'final',
    label: 'Final value',
    latex: 'A = f(N)',
  },
  {
    value: 'integral',
    label: 'Integral',
    latex: 'A = h \\sum_{n=0}^{N} f(n)',
  },
  {
    value: 'l2-integral',
    label: 'L2 integral',
    latex: 'A = \\sqrt{h \\sum_{n=0}^{N} f(n)^2}',
  },
  {
    value: 'h1-seminorm',
    label: 'H1 semi-norm',
    latex: 'A = \\sqrt{h \\sum_{n=1}^{N} \\left(\\frac{f(n) - f(n-1)}{h}\\right)^{\\!2}}',
  },
];

function renderLatex(latex: string): string {
  try {
    return katex.renderToString(latex, { throwOnError: false, displayMode: true });
  } catch {
    return latex;
  }
}

interface ParameterStudyConfigProps {
  config: Config;
  onChange: (config: Config) => void;
  onRun: () => void;
  running: boolean;
  progress: number;
}

export function ParameterStudyConfigUI({
  config,
  onChange,
  onRun,
  running,
  progress,
}: ParameterStudyConfigProps) {
  const [showAggHelp, setShowAggHelp] = useState(false);

  const update = (partial: Partial<Config>) => onChange({ ...config, ...partial });

  const currentAgg = AGGREGATIONS.find((a) => a.value === config.aggregation);

  // Compute preview of generated values
  const previewValues = (() => {
    if (config.scalingMode === 'exponential') {
      const vals: number[] = [];
      for (let e = config.expMin; e <= config.expMax; e += config.expStep) {
        vals.push(Math.pow(config.expBase, e));
      }
      return vals;
    }
    return null; // linear/log don't need preview, count is explicit
  })();

  return (
    <div className="parameter-study-config">
      <div className="convergence-params">
        <div className="param-group">
          <label>
            Parameter:
            <select
              value={config.parameter}
              onChange={(e) => update({ parameter: e.target.value as StudyParameter })}
              disabled={running}
            >
              {PARAMETERS.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        {/* Scaling mode toggle */}
        <div className="param-group">
          <label>
            Scaling:
            <select
              value={config.scalingMode}
              onChange={(e) => update({ scalingMode: e.target.value as ScalingMode })}
              disabled={running}
            >
              <option value="linear">Linear</option>
              <option value="log">Log-spaced</option>
              <option value="exponential">Exponential (base^k)</option>
            </select>
          </label>
        </div>
      </div>

      {/* Range inputs depend on scaling mode */}
      <div className="convergence-params" style={{ marginTop: '0.5rem' }}>
        {config.scalingMode !== 'exponential' ? (
          <>
            <div className="param-group">
              <label>
                Min:
                <input
                  type="number"
                  value={config.min}
                  onChange={(e) => update({ min: Number(e.target.value) })}
                  step="any"
                  disabled={running}
                />
              </label>
            </div>
            <div className="param-group">
              <label>
                Max:
                <input
                  type="number"
                  value={config.max}
                  onChange={(e) => update({ max: Number(e.target.value) })}
                  step="any"
                  disabled={running}
                />
              </label>
            </div>
            <div className="param-group">
              <label>
                Samples:
                <input
                  type="number"
                  value={config.sampleCount}
                  onChange={(e) =>
                    update({ sampleCount: Math.max(2, Math.min(50, Number(e.target.value))) })
                  }
                  min={2}
                  max={50}
                  disabled={running}
                />
              </label>
            </div>
          </>
        ) : (
          <>
            <div className="param-group">
              <label>
                Base:
                <input
                  type="number"
                  value={config.expBase}
                  onChange={(e) => update({ expBase: Number(e.target.value) })}
                  step="any"
                  disabled={running}
                  style={{ width: '60px' }}
                />
              </label>
            </div>
            <div className="param-group">
              <label>
                Exp min:
                <input
                  type="number"
                  value={config.expMin}
                  onChange={(e) => update({ expMin: Number(e.target.value) })}
                  step={config.expStep || 1}
                  disabled={running}
                  style={{ width: '70px' }}
                />
              </label>
            </div>
            <div className="param-group">
              <label>
                Exp max:
                <input
                  type="number"
                  value={config.expMax}
                  onChange={(e) => update({ expMax: Number(e.target.value) })}
                  step={config.expStep || 1}
                  disabled={running}
                  style={{ width: '70px' }}
                />
              </label>
            </div>
            <div className="param-group">
              <label>
                Exp step:
                <input
                  type="number"
                  value={config.expStep}
                  onChange={(e) => update({ expStep: Math.max(0.1, Number(e.target.value)) })}
                  step="any"
                  min={0.1}
                  disabled={running}
                  style={{ width: '60px' }}
                />
              </label>
            </div>
          </>
        )}
      </div>

      {/* Exponential preview */}
      {config.scalingMode === 'exponential' && previewValues && previewValues.length > 0 && (
        <div className="dt-values" style={{ marginTop: '0.5rem' }}>
          <span className="dt-label">Values ({previewValues.length}):</span>
          <div className="dt-list">
            {previewValues.map((v, i) => {
              const exp = config.expMin + i * config.expStep;
              return (
                <span key={i} className="dt-chip">
                  {config.expBase}^{Number.isInteger(exp) ? exp : exp.toFixed(1)} = {v.toPrecision(4)}
                </span>
              );
            })}
          </div>
        </div>
      )}

      {/* Aggregation + axis options row */}
      <div className="convergence-params" style={{ marginTop: '0.5rem' }}>
        <div className="param-group">
          <label>
            Aggregation:
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
              <select
                value={config.aggregation}
                onChange={(e) => update({ aggregation: e.target.value as AggregationMode })}
                disabled={running}
              >
                {AGGREGATIONS.map((a) => (
                  <option key={a.value} value={a.value}>
                    {a.label}
                  </option>
                ))}
              </select>
              <button
                className="btn btn-small formula-help-btn"
                onClick={() => setShowAggHelp(!showAggHelp)}
                title="Show aggregation formula"
                style={{ minWidth: '1.5rem', padding: '0.2rem' }}
              >
                ?
              </button>
            </span>
          </label>
        </div>

        <div className="param-group">
          <label className="metric-checkbox">
            <input
              type="checkbox"
              checked={config.logXAxis}
              onChange={(e) => update({ logXAxis: e.target.checked })}
              disabled={running}
            />
            Log x-axis
          </label>
        </div>

        <div className="param-group">
          <label className="metric-checkbox">
            <input
              type="checkbox"
              checked={config.logYAxis}
              onChange={(e) => update({ logYAxis: e.target.checked })}
              disabled={running}
            />
            Log y-axis
          </label>
        </div>
      </div>

      {/* Aggregation help popover */}
      {showAggHelp && currentAgg && (
        <div className="formula-help-popover" style={{ marginTop: '0.5rem' }}>
          <div style={{ fontWeight: 600, marginBottom: '0.25rem', fontSize: '0.85rem' }}>
            {currentAgg.label}
          </div>
          <div
            className="mt-2 p-2 bg-muted rounded-md overflow-x-auto"
            dangerouslySetInnerHTML={{ __html: renderLatex(currentAgg.latex) }}
          />
          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.25rem' }}>
            where f(n) is the formula evaluated at step n, N is the total number of steps.
          </div>
        </div>
      )}

      <div className="convergence-actions" style={{ marginTop: '0.5rem' }}>
        <button className="run-button" onClick={onRun} disabled={running}>
          {running ? 'Running...' : 'Run Study'}
        </button>
        {running && (
          <div className="progress-container">
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: `${progress * 100}%` }} />
            </div>
            <span className="progress-text">{Math.round(progress * 100)}%</span>
          </div>
        )}
      </div>
    </div>
  );
}
