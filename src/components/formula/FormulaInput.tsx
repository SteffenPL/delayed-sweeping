import { useState } from 'react';
import { FORMULA_PRESETS } from '@/formula';

interface FormulaInputProps {
  value: string;
  onChange: (value: string) => void;
  error: string | null;
}

const TOKEN_HELP = [
  {
    category: 'Vectors (use inside norm() or dot())',
    tokens: [
      { token: 'z[n]', desc: 'Position at step n' },
      { token: 'z[n-1]', desc: 'Position at step n-1' },
      { token: 'z(t)', desc: 'Alias for z[n]' },
      { token: 'zbar[n]', desc: 'Pre-projection (weighted average)' },
      { token: 'v[n]', desc: 'Velocity (z[n]-z[n-1])/h' },
      { token: 'G[n]', desc: 'Gradient of g at z[n]' },
      { token: 'c[n]', desc: 'Constraint center at step n' },
      { token: 'z_cl[n]', desc: 'Classical position' },
      { token: 'v_cl[n]', desc: 'Classical velocity' },
      { token: 'G_cl[n]', desc: 'Classical gradient' },
    ],
  },
  {
    category: 'Scalars',
    tokens: [
      { token: 'g[n]', desc: 'Constraint value g(z[n])' },
      { token: 'lambda[n]', desc: 'Lagrange multiplier' },
      { token: 'g_cl[n]', desc: 'Classical constraint value' },
      { token: 'lambda_cl[n]', desc: 'Classical multiplier' },
      { token: 'dt', desc: 'Time step h' },
      { token: 'epsilon', desc: 'Kernel decay rate' },
      { token: 't', desc: 'Current time' },
      { token: 'n', desc: 'Current step index' },
    ],
  },
  {
    category: 'Functions',
    tokens: [
      { token: 'norm(...)', desc: 'Euclidean norm of vector expr' },
      { token: 'dot(a, b)', desc: 'Dot product of two vector exprs' },
    ],
  },
];

export function FormulaInput({ value, onChange, error }: FormulaInputProps) {
  const [showHelp, setShowHelp] = useState(false);

  return (
    <div className="formula-input-container">
      <div className="formula-input-row">
        <textarea
          className="formula-textarea"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={1}
          spellCheck={false}
          placeholder="e.g. norm(z[n] - z[n-1]) / dt"
        />
        <button
          className="btn btn-small formula-help-btn"
          onClick={() => setShowHelp(!showHelp)}
          title="Show available tokens"
        >
          ?
        </button>
        <select
          className="formula-preset-select"
          value=""
          onChange={(e) => {
            const preset = FORMULA_PRESETS.find((p) => p.id === e.target.value);
            if (preset) onChange(preset.formula);
          }}
        >
          <option value="" disabled>
            Presets
          </option>
          {FORMULA_PRESETS.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label}
            </option>
          ))}
        </select>
      </div>

      {error && <div className="formula-error">{error}</div>}

      {showHelp && (
        <div className="formula-help-popover">
          {TOKEN_HELP.map((group) => (
            <div key={group.category} className="formula-help-group">
              <div className="formula-help-category">{group.category}</div>
              <div className="formula-help-tokens">
                {group.tokens.map((t) => (
                  <div key={t.token} className="formula-help-token">
                    <code>{t.token}</code>
                    <span>{t.desc}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
