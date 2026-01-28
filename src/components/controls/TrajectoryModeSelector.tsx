import { useSimulationStore } from '@/store';
import type { TrajectoryMode } from '@/types';

export function TrajectoryModeSelector() {
  const {
    trajectoryMode,
    setTrajectoryMode,
    parametricTrajectory,
    setParametricTrajectory,
  } = useSimulationStore();

  const handleModeChange = (mode: TrajectoryMode) => {
    setTrajectoryMode(mode);
  };

  const setPreset = (preset: { x: string; y: string; alpha: string }) => {
    setParametricTrajectory({
      xExpression: preset.x,
      yExpression: preset.y,
      alphaExpression: preset.alpha,
    });
  };

  return (
    <div className="trajectory-mode-selector">
      <h3>Trajectory Mode</h3>

      <div className="mode-buttons">
        <button
          className={`btn ${trajectoryMode === 'parametric' ? 'btn-active' : ''}`}
          onClick={() => handleModeChange('parametric')}
        >
          Parametric
        </button>
        <button
          className={`btn ${trajectoryMode === 'free-drag' ? 'btn-active' : ''}`}
          onClick={() => handleModeChange('free-drag')}
        >
          Free Drag
        </button>
      </div>

      {trajectoryMode === 'parametric' && (
        <>
          <div className="trajectory-presets">
            <label>Presets:</label>
            <div className="preset-buttons">
              <button
                className="btn btn-small"
                onClick={() => setPreset({ x: '2 * cos(t)', y: '2 * sin(t)', alpha: '0' })}
              >
                Circle
              </button>
              <button
                className="btn btn-small"
                onClick={() => setPreset({ x: '3 * cos(t)', y: '1.5 * sin(t)', alpha: '0' })}
              >
                Ellipse
              </button>
              <button
                className="btn btn-small"
                onClick={() => setPreset({ x: '2 * sin(t)', y: '2 * sin(2*t)', alpha: '0' })}
              >
                Figure-8
              </button>
              <button
                className="btn btn-small"
                onClick={() => setPreset({ x: 't', y: '0', alpha: '0' })}
              >
                Linear
              </button>
              <button
                className="btn btn-small"
                onClick={() => setPreset({ x: '2 * cos(t)', y: '2 * sin(t)', alpha: 't/2' })}
              >
                Rotating
              </button>
            </div>
          </div>

          <div className="trajectory-expressions">
            <label>
              x(t)
              <input
                type="text"
                value={parametricTrajectory.xExpression}
                onChange={(e) =>
                  setParametricTrajectory({
                    ...parametricTrajectory,
                    xExpression: e.target.value,
                  })
                }
                placeholder="e.g. 2*cos(t)"
              />
            </label>
            <label>
              y(t)
              <input
                type="text"
                value={parametricTrajectory.yExpression}
                onChange={(e) =>
                  setParametricTrajectory({
                    ...parametricTrajectory,
                    yExpression: e.target.value,
                  })
                }
                placeholder="e.g. 2*sin(t)"
              />
            </label>
            <label>
              &alpha;(t)
              <input
                type="text"
                value={parametricTrajectory.alphaExpression}
                onChange={(e) =>
                  setParametricTrajectory({
                    ...parametricTrajectory,
                    alphaExpression: e.target.value,
                  })
                }
                placeholder="e.g. 0 or t/2"
              />
            </label>
          </div>
        </>
      )}

      {trajectoryMode === 'free-drag' && (
        <div className="drag-hint">
          <p>Click and drag on the canvas to move the constraint.</p>
        </div>
      )}
    </div>
  );
}
