import { useSimulationStore } from '@/store';
import type { TrajectoryMode, TrajectoryType, CircularParams } from '@/types';

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

  const handleTrajectoryTypeChange = (type: TrajectoryType) => {
    switch (type) {
      case 'circular':
        setParametricTrajectory({
          type: 'circular',
          params: {
            centerX: 0,
            centerY: 0,
            radius: 2.0,
            omega: 1.0,
            phase: 0,
          },
        });
        break;
      case 'ellipse':
        setParametricTrajectory({
          type: 'ellipse',
          params: {
            centerX: 0,
            centerY: 0,
            semiMajor: 3.0,
            semiMinor: 1.5,
            omega: 1.0,
            phase: 0,
          },
        });
        break;
      case 'lissajous':
        setParametricTrajectory({
          type: 'lissajous',
          params: {
            centerX: 0,
            centerY: 0,
            amplitudeX: 2.0,
            amplitudeY: 2.0,
            freqX: 1.0,
            freqY: 2.0,
            phaseX: 0,
            phaseY: 0,
          },
        });
        break;
      case 'linear':
        setParametricTrajectory({
          type: 'linear',
          params: {
            startX: -3,
            startY: 0,
            velocityX: 0.5,
            velocityY: 0,
          },
        });
        break;
    }
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
          <div className="trajectory-type-buttons">
            <button
              className={`btn btn-small ${parametricTrajectory.type === 'circular' ? 'btn-active' : ''}`}
              onClick={() => handleTrajectoryTypeChange('circular')}
            >
              Circle
            </button>
            <button
              className={`btn btn-small ${parametricTrajectory.type === 'ellipse' ? 'btn-active' : ''}`}
              onClick={() => handleTrajectoryTypeChange('ellipse')}
            >
              Ellipse
            </button>
            <button
              className={`btn btn-small ${parametricTrajectory.type === 'lissajous' ? 'btn-active' : ''}`}
              onClick={() => handleTrajectoryTypeChange('lissajous')}
            >
              Figure-8
            </button>
            <button
              className={`btn btn-small ${parametricTrajectory.type === 'linear' ? 'btn-active' : ''}`}
              onClick={() => handleTrajectoryTypeChange('linear')}
            >
              Linear
            </button>
          </div>

          {parametricTrajectory.type === 'circular' && (
            <div className="trajectory-params">
              <label>
                Radius
                <input
                  type="number"
                  value={(parametricTrajectory.params as CircularParams).radius}
                  onChange={(e) =>
                    setParametricTrajectory({
                      ...parametricTrajectory,
                      params: {
                        ...(parametricTrajectory.params as CircularParams),
                        radius: parseFloat(e.target.value) || 1,
                      },
                    })
                  }
                  min={0.5}
                  max={5}
                  step={0.1}
                />
              </label>
              <label>
                Angular velocity &omega;
                <input
                  type="number"
                  value={(parametricTrajectory.params as CircularParams).omega}
                  onChange={(e) =>
                    setParametricTrajectory({
                      ...parametricTrajectory,
                      params: {
                        ...(parametricTrajectory.params as CircularParams),
                        omega: parseFloat(e.target.value) || 0.1,
                      },
                    })
                  }
                  min={0.1}
                  max={5}
                  step={0.1}
                />
              </label>
            </div>
          )}
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
