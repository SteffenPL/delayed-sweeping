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
        <label htmlFor="param-epsilon">
          Decay rate &epsilon;
          <input
            id="param-epsilon"
            type="number"
            value={params.epsilon}
            onChange={(e) => setParams({ epsilon: parseFloat(e.target.value) || 0.1 })}
            min={0.1}
            max={10}
            step={0.1}
          />
        </label>
      </div>

      <div className="param-group">
        <label htmlFor="param-xPast">
          Initial past x<sub>p</sub>(t)
          <input
            id="param-xPast"
            type="text"
            value={params.xPastExpression}
            onChange={(e) => setParams({ xPastExpression: e.target.value })}
            placeholder="e.g. 2"
          />
        </label>
      </div>

      <div className="param-group">
        <label htmlFor="param-yPast">
          Initial past y<sub>p</sub>(t)
          <input
            id="param-yPast"
            type="text"
            value={params.yPastExpression}
            onChange={(e) => setParams({ yPastExpression: e.target.value })}
            placeholder="e.g. 0"
          />
        </label>
      </div>
    </div>
  );
}
