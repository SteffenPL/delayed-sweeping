import katex from 'katex';
import type { ParameterStudyConfig as Config, StudyParameter, AggregationMode, ScalingMode, ConvergenceRefMode } from '@/formula';

const PARAMETERS: { value: StudyParameter; label: string }[] = [
  { value: 'epsilon', label: 'epsilon' },
  { value: 'h', label: 'h (time step)' },
  { value: 'T', label: 'T (final time)' },
  { value: 'R', label: 'R' },
  { value: 'r', label: 'r' },
  { value: 'a', label: 'a' },
  { value: 'b', label: 'b' },
];

const AGGREGATIONS: { value: AggregationMode; label: string }[] = [
  { value: 'final', label: 'Final value' },
  { value: 'integral', label: 'Integral' },
  { value: 'l2-integral', label: 'L2 integral' },
  { value: 'h1-seminorm', label: 'H1 semi-norm' },
];

function escapeLatex(s: string): string {
  return s.replace(/_/g, '\\_');
}

/** Build the LaTeX formula for parameter study aggregation with user formula inserted. */
function buildStudyLatex(aggregation: AggregationMode, formula: string, isVector: boolean): string {
  const f = `\\texttt{${escapeLatex(formula)}}`;
  // For vector formulas, the per-step quantity is ||f_n||; for scalars, just f_n
  const fn = isVector ? `\\|\\mathbf{f}_n\\|` : `f_n`;
  const fnm1 = isVector ? `\\|\\mathbf{f}_{n-1}\\|` : `f_{n-1}`;
  const fN = isVector ? `\\|\\mathbf{f}_N\\|` : `f_N`;
  const def = isVector ? `\\mathbf{f}_n = ${f}` : `f_n = ${f}`;
  switch (aggregation) {
    case 'final':
      return `A = ${fN}, \\quad ${def}`;
    case 'integral':
      return `A = h \\sum_{n=0}^{N} ${fn}, \\quad ${def}`;
    case 'l2-integral':
      return `A = \\sqrt{h \\sum_{n=0}^{N} ${fn}^{\\,2}}, \\quad ${def}`;
    case 'h1-seminorm':
      return `A = \\sqrt{h \\sum_{n=1}^{N} \\left(\\frac{${fn} - ${fnm1}}{h}\\right)^{\\!2}}, \\quad ${def}`;
  }
}

/** Build the LaTeX formula for convergence error with ^{ref} notation. */
function buildConvergenceLatex(aggregation: AggregationMode, formula: string, isVector: boolean): string {
  const f = `\\texttt{${escapeLatex(formula)}}`;
  if (isVector) {
    // Vector: e_n = ||f_n - f_n^{ref}||
    const en = `e_n`;
    const def = `e_n = \\|${f} - ${f}^{\\mathrm{ref}}\\|`;
    switch (aggregation) {
      case 'final':
        return `E = e_N, \\quad ${def}`;
      case 'integral':
        return `E = h \\sum_{n=0}^{N} ${en}, \\quad ${def}`;
      case 'l2-integral':
        return `E = \\sqrt{h \\sum_{n=0}^{N} ${en}^{\\,2}}, \\quad ${def}`;
      case 'h1-seminorm':
        return `E = \\sqrt{h \\sum_{n=1}^{N} \\left(\\frac{e_n - e_{n-1}}{h}\\right)^{\\!2}}, \\quad ${def}`;
    }
  } else {
    // Scalar: e_n = |f_n - f_n^{ref}|
    const en = `e_n`;
    const def = `e_n = |${f} - ${f}^{\\mathrm{ref}}|`;
    switch (aggregation) {
      case 'final':
        return `E = e_N, \\quad ${def}`;
      case 'integral':
        return `E = h \\sum_{n=0}^{N} ${en}, \\quad ${def}`;
      case 'l2-integral':
        return `E = \\sqrt{h \\sum_{n=0}^{N} ${en}^{\\,2}}, \\quad ${def}`;
      case 'h1-seminorm':
        return `E = \\sqrt{h \\sum_{n=1}^{N} \\left(\\frac{e_n - e_{n-1}}{h}\\right)^{\\!2}}, \\quad ${def}`;
    }
  }
}

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
  isConvergenceMode?: boolean;
  formula: string;
  isVector?: boolean;
}

export function ParameterStudyConfigUI({
  config,
  onChange,
  onRun,
  running,
  progress,
  isConvergenceMode = false,
  formula,
  isVector = false,
}: ParameterStudyConfigProps) {
  const update = (partial: Partial<Config>) => onChange({ ...config, ...partial });

  // Compute preview of generated values
  const previewValues = (() => {
    if (config.scalingMode === 'exponential') {
      const vals: number[] = [];
      for (let e = config.expMin; e <= config.expMax; e += config.expStep) {
        vals.push(Math.pow(config.expBase, e));
      }
      return vals;
    }
    return null;
  })();

  // Build the LaTeX string for the current aggregation + formula
  const latexFormula = isConvergenceMode
    ? buildConvergenceLatex(config.aggregation, formula, isVector)
    : buildStudyLatex(config.aggregation, formula, isVector);

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
              <option value="exponential">Exponential (base^k)</option>
            </select>
          </label>
        </div>
      </div>

      {/* Range inputs depend on scaling mode */}
      <div className="convergence-params mt-half">
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
                  className="input-narrow"
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
                  className="input-medium"
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
                  className="input-medium"
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
                  className="input-narrow"
                />
              </label>
            </div>
          </>
        )}
      </div>

      {/* Exponential preview */}
      {config.scalingMode === 'exponential' && previewValues && previewValues.length > 0 && (
        <div className="dt-values mt-half">
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
      <div className="convergence-params mt-half">
        <div className="param-group">
          <label>
            Aggregation:
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

      {/* Always show aggregation formula with current user formula inserted */}
      <div
        className="aggregation-formula mt-half"
        dangerouslySetInnerHTML={{ __html: renderLatex(latexFormula) }}
      />

      {/* Convergence reference value */}
      {isConvergenceMode && (
        <div className="convergence-params mt-half">
          <div className="param-group">
            <label>
              Reference:
              <select
                value={config.convergenceRefMode}
                onChange={(e) => update({ convergenceRefMode: e.target.value as ConvergenceRefMode })}
                disabled={running}
              >
                <option value="finest">Finest (smallest)</option>
                <option value="coarsest">Coarsest (largest)</option>
                <option value="custom">Custom value</option>
              </select>
            </label>
          </div>
          {config.convergenceRefMode === 'custom' && (
            config.scalingMode === 'exponential' ? (
              <div className="param-group">
                <label>
                  Ref exp:
                  <input
                    type="number"
                    value={config.convergenceRefValue}
                    onChange={(e) => update({ convergenceRefValue: Number(e.target.value) })}
                    step={config.expStep || 1}
                    disabled={running}
                    className="input-medium"
                  />
                </label>
                <span className="dt-chip">
                  {config.expBase}^{Number.isInteger(config.convergenceRefValue)
                    ? config.convergenceRefValue
                    : config.convergenceRefValue.toFixed(1)} = {Math.pow(config.expBase, config.convergenceRefValue).toPrecision(4)}
                </span>
              </div>
            ) : (
              <div className="param-group">
                <label>
                  Ref value:
                  <input
                    type="number"
                    value={config.convergenceRefValue}
                    onChange={(e) => update({ convergenceRefValue: Number(e.target.value) })}
                    step="any"
                    disabled={running}
                  />
                </label>
              </div>
            )
          )}
        </div>
      )}

      <div className="convergence-actions mt-half">
        <button className="run-button" onClick={onRun} disabled={running}>
          {running ? 'Running...' : isConvergenceMode ? 'Run Convergence' : 'Run Study'}
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
