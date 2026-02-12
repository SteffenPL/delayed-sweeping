import { useState } from 'react';
import { useSimulationStore } from '@/store';
import { COLORMAP_NAMES } from '@/utils/colormaps';
import type { TrajectoryColorConfig, PastConstraintColorConfig, MarkerColors } from '@/types/colors';

export function ColorControls() {
  const { colorConfig, setColorConfig } = useSimulationStore();

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

      <p className="text-[10px] text-muted-foreground">
        A(s): s = age, t = time, epsilon = decay rate (from params)
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
  config: { mode: 'solid' | 'colormap'; solidColor: string; colormap: string; opacityExpression: string };
  onChange: (partial: Record<string, unknown>) => void;
}) {
  const [localExpr, setLocalExpr] = useState(config.opacityExpression);

  const commitExpr = () => {
    if (localExpr !== config.opacityExpression) {
      onChange({ opacityExpression: localExpr });
    }
  };

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
        <option value="solid">Solid</option>
        <option value="colormap">Map</option>
      </select>

      {/* Color value */}
      {config.mode === 'solid' ? (
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
      )}

      {/* Opacity formula */}
      <span className="text-xs text-muted-foreground whitespace-nowrap">A(s)=</span>
      <input
        type="text"
        value={localExpr}
        onChange={(e) => setLocalExpr(e.target.value)}
        onBlur={commitExpr}
        onKeyDown={(e) => e.key === 'Enter' && commitExpr()}
        className="w-28 min-w-0 flex-1 px-1.5 py-0.5 border rounded text-xs font-mono"
        placeholder="1"
      />
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
