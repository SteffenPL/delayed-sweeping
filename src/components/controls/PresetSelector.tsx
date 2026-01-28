import { useSimulationStore } from '@/store';
import { PRESETS } from '@/utils';

export function PresetSelector() {
  const { loadPreset } = useSimulationStore();

  return (
    <div className="preset-selector">
      <h3>Presets</h3>
      <div className="preset-buttons">
        {PRESETS.map((preset) => (
          <button
            key={preset.id}
            className="btn btn-preset"
            onClick={() => loadPreset(preset.id)}
            title={preset.description}
          >
            {preset.name}
          </button>
        ))}
      </div>
    </div>
  );
}
