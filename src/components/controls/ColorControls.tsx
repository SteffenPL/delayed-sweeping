import { useState, useRef, useCallback } from 'react';
import { useSimulationStore } from '@/store';
import { COLORMAP_NAMES } from '@/utils/colormaps';
import { parsePastConstraintTimes } from '@/utils';
import type { TrajectoryColorConfig, PastConstraintColorConfig, MarkerColors } from '@/types/colors';

export function ColorControls() {
  const timesInputRef = useRef<HTMLInputElement>(null);

  const {
    colorConfig,
    setColorConfig,
    showPastConstraints,
    setShowPastConstraints,
    setPastConstraintTimes,
    params,
  } = useSimulationStore();

  const updateDelayed = (partial: Partial<TrajectoryColorConfig>) => {
    setColorConfig({
      delayedTrajectory: { ...colorConfig.delayedTrajectory, ...partial },
    });
  };

  const updateClassical = (partial: Partial<TrajectoryColorConfig>) => {
    setColorConfig({
      classicalTrajectory: { ...colorConfig.classicalTrajectory, ...partial },
    });
  };

  const updatePreProjection = (partial: Partial<TrajectoryColorConfig>) => {
    setColorConfig({
      preProjectionTrajectory: { ...colorConfig.preProjectionTrajectory, ...partial },
    });
  };

  const updateProjectionVectors = (partial: Partial<TrajectoryColorConfig>) => {
    setColorConfig({
      projectionVectors: { ...colorConfig.projectionVectors, ...partial },
    });
  };

  const updatePastConstraints = (partial: Partial<PastConstraintColorConfig>) => {
    setColorConfig({
      pastConstraints: { ...colorConfig.pastConstraints, ...partial },
    });
  };

  const updateMarkers = (partial: Partial<MarkerColors>) => {
    setColorConfig({
      markers: { ...colorConfig.markers, ...partial },
    });
  };

  const handleTimesChange = useCallback(() => {
    const raw = timesInputRef.current?.value ?? '';
    const times = parsePastConstraintTimes(raw, params.T);
    setPastConstraintTimes(times);
  }, [setPastConstraintTimes, params.T]);

  return (
    <div className="space-y-2">
      <TrackRow
        label="Delayed"
        config={colorConfig.delayedTrajectory}
        onChange={updateDelayed}
      />
      <TrackRow
        label="Classical"
        config={colorConfig.classicalTrajectory}
        onChange={updateClassical}
      />
      <TrackRow
        label="X̄ Traj."
        config={colorConfig.preProjectionTrajectory}
        onChange={updatePreProjection}
      />
      <TrackRow
        label="Proj. V."
        config={colorConfig.projectionVectors}
        onChange={updateProjectionVectors}
      />
      <TrackRow
        label="Past C."
        config={colorConfig.pastConstraints}
        onChange={updatePastConstraints}
      />

      <div className="flex flex-wrap items-center gap-2 pt-1">
        <span className="text-xs font-medium w-14">Markers</span>
        <ColorInput label="Del" value={colorConfig.markers.delayed} onChange={(c) => updateMarkers({ delayed: c })} />
        <ColorInput label="Cls" value={colorConfig.markers.classical} onChange={(c) => updateMarkers({ classical: c })} />
        <ColorInput label="X̄" value={colorConfig.markers.xBar} onChange={(c) => updateMarkers({ xBar: c })} />
      </div>

      <div className="flex items-center gap-1.5">
        <span className="text-xs font-medium w-14 shrink-0">Arrow w</span>
        <input
          type="number"
          min={0.5}
          max={10}
          step={0.5}
          value={colorConfig.arrowLineWidth}
          onChange={(e) => setColorConfig({ arrowLineWidth: parseFloat(e.target.value) || 3.0 })}
          className="w-16 px-1.5 py-0.5 border rounded text-xs"
        />
      </div>

      <div className="border-t pt-2 mt-2">
        <div className="flex items-center gap-2 mb-2">
          <input
            type="checkbox"
            id="showPastConstraints"
            checked={showPastConstraints}
            onChange={(e) => setShowPastConstraints(e.target.checked)}
          />
          <label htmlFor="showPastConstraints" className="text-sm font-medium">
            Show past constraints
          </label>
        </div>

        {showPastConstraints && (
          <div>
            <label className="text-xs text-muted-foreground">
              Times (range: start:(step):end or comma-separated)
            </label>
            <input
              ref={timesInputRef}
              type="text"
              defaultValue="0:(T/6):T"
              onBlur={handleTimesChange}
              onKeyDown={(e) => e.key === 'Enter' && handleTimesChange()}
              placeholder="0:(T/6):T or 0, 1, 2, 3"
              className="w-full mt-1 px-2 py-1 border rounded text-xs font-mono"
            />
          </div>
        )}
      </div>

      <p className="text-[10px] text-muted-foreground mt-2">
        A(s): s = age, t = time, epsilon = decay rate, T = terminal time
      </p>
    </div>
  );
}

function TrackRow({
  label,
  config,
  onChange,
}: {
  label: string;
  config: { mode: 'none' | 'solid' | 'colormap'; solidColor: string; colormap: string; opacityExpression: string };
  onChange: (partial: Record<string, unknown>) => void;
}) {
  const [localExpr, setLocalExpr] = useState(config.opacityExpression);

  const commitExpr = () => {
    if (localExpr !== config.opacityExpression) {
      onChange({ opacityExpression: localExpr });
    }
  };

  const isNone = config.mode === 'none';

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {/* Label — fixed width */}
      <span className="text-xs font-medium w-14 shrink-0">{label}</span>

      {/* Color mode selector */}
      <select
        value={config.mode}
        onChange={(e) => onChange({ mode: e.target.value })}
        className="px-1.5 py-0.5 border rounded text-xs"
      >
        <option value="none">None</option>
        <option value="solid">Solid</option>
        <option value="colormap">Map</option>
      </select>

      {/* Color value */}
      {!isNone && (config.mode === 'solid' ? (
        <input
          type="color"
          value={config.solidColor}
          onChange={(e) => onChange({ solidColor: e.target.value })}
          className="w-7 h-6 p-0 border rounded cursor-pointer"
        />
      ) : (
        <select
          value={config.colormap}
          onChange={(e) => onChange({ colormap: e.target.value })}
          className="px-1.5 py-0.5 border rounded text-xs"
        >
          {COLORMAP_NAMES.map((name) => (
            <option key={name} value={name}>{name}</option>
          ))}
        </select>
      ))}

      {/* Opacity formula — fills remaining space */}
      {!isNone && (
        <>
          <span className="text-xs text-muted-foreground whitespace-nowrap">A(s)=</span>
          <input
            type="text"
            value={localExpr}
            onChange={(e) => setLocalExpr(e.target.value)}
            onBlur={commitExpr}
            onKeyDown={(e) => e.key === 'Enter' && commitExpr()}
            className="min-w-0 flex-1 px-1.5 py-0.5 border rounded text-xs font-mono"
            placeholder="1"
          />
        </>
      )}
    </div>
  );
}

function ColorInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (color: string) => void;
}) {
  return (
    <div className="flex items-center gap-1">
      <input
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-6 h-5 p-0 border rounded cursor-pointer"
      />
      <span className="text-xs">{label}</span>
    </div>
  );
}
