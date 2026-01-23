import { useSimulationStore } from '@/store';

export function ParameterPanel() {
  const { params, setParams } = useSimulationStore();

  return (
    <div className="parameter-panel">
      <h3>Parameters</h3>

      <div className="param-group">
        <label htmlFor="param-T">
          Final time T
          <input
            id="param-T"
            type="number"
            value={params.T}
            onChange={(e) => setParams({ T: parseFloat(e.target.value) || 1 })}
            min={0.1}
            step={0.5}
          />
        </label>
      </div>

      <div className="param-group">
        <label htmlFor="param-h">
          Time step h
          <input
            id="param-h"
            type="number"
            value={params.h}
            onChange={(e) => setParams({ h: parseFloat(e.target.value) || 0.001 })}
            min={0.0001}
            max={0.1}
            step={0.001}
          />
        </label>
      </div>

      <div className="param-group">
        <label htmlFor="param-lambda">
          Decay rate &lambda;
          <input
            id="param-lambda"
            type="number"
            value={params.lambda}
            onChange={(e) => setParams({ lambda: parseFloat(e.target.value) || 0.1 })}
            min={0.1}
            max={10}
            step={0.1}
          />
        </label>
      </div>

      <div className="param-group">
        <label htmlFor="param-R">
          Constraint size R
          <input
            id="param-R"
            type="number"
            value={params.R}
            onChange={(e) => setParams({ R: parseFloat(e.target.value) || 0.1 })}
            min={0.1}
            max={5}
            step={0.1}
          />
        </label>
      </div>
    </div>
  );
}
