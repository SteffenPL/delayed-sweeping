import type { ParameterStudyConfig as Config, StudyParameter, AggregationMode } from '@/formula';

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
  const update = (partial: Partial<Config>) => onChange({ ...config, ...partial });

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
              checked={config.logScale}
              onChange={(e) => update({ logScale: e.target.checked })}
              disabled={running}
            />
            Log scale
          </label>
        </div>
      </div>

      <div className="convergence-actions">
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
