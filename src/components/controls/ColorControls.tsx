import { useSimulationStore } from '@/store';
import { COLORMAP_NAMES } from '@/utils/colormaps';
import type { TrajectoryColorConfig, MarkerColors } from '@/types/colors';

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

  const updateMarkers = (partial: Partial<MarkerColors>) => {
    setColorConfig({
      markers: { ...colorConfig.markers, ...partial },
    });
  };

  return (
    <div className="space-y-4">
      <h4 className="text-sm font-medium">Delayed Trajectory</h4>
      <TrajectoryColorPicker
        config={colorConfig.delayedTrajectory}
        onChange={updateDelayed}
      />

      <h4 className="text-sm font-medium">Classical Trajectory</h4>
      <TrajectoryColorPicker
        config={colorConfig.classicalTrajectory}
        onChange={updateClassical}
      />

      <h4 className="text-sm font-medium">Markers</h4>
      <div className="space-y-2">
        <ColorInput label="Delayed" value={colorConfig.markers.delayed} onChange={(c) => updateMarkers({ delayed: c })} />
        <ColorInput label="Classical" value={colorConfig.markers.classical} onChange={(c) => updateMarkers({ classical: c })} />
        <ColorInput label="X-bar" value={colorConfig.markers.xBar} onChange={(c) => updateMarkers({ xBar: c })} />
      </div>
    </div>
  );
}

function TrajectoryColorPicker({
  config,
  onChange,
}: {
  config: TrajectoryColorConfig;
  onChange: (partial: Partial<TrajectoryColorConfig>) => void;
}) {
  return (
    <div className="space-y-2 pl-2">
      <div className="flex items-center gap-2">
        <select
          value={config.mode}
          onChange={(e) => onChange({ mode: e.target.value as 'solid' | 'colormap' })}
          className="px-2 py-1 border rounded text-sm"
        >
          <option value="solid">Solid</option>
          <option value="colormap">Colormap</option>
        </select>

        {config.mode === 'solid' ? (
          <input
            type="color"
            value={config.solidColor}
            onChange={(e) => onChange({ solidColor: e.target.value })}
          />
        ) : (
          <select
            value={config.colormap}
            onChange={(e) => onChange({ colormap: e.target.value as typeof config.colormap })}
            className="px-2 py-1 border rounded text-sm"
          >
            {COLORMAP_NAMES.map((name) => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>
        )}
      </div>
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
    <div className="flex items-center gap-2 pl-2">
      <input type="color" value={value} onChange={(e) => onChange(e.target.value)} />
      <span className="text-sm">{label}</span>
    </div>
  );
}
