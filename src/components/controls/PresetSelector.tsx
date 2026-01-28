import { useSimulationStore } from '@/store';
import { PRESETS } from '@/utils';
import { Collapsible, Button } from '@/components/ui';

export function PresetSelector() {
  const { loadPreset } = useSimulationStore();

  return (
    <Collapsible title="Presets" defaultOpen={false}>
      <div className="flex flex-col gap-2">
        {PRESETS.map((preset) => (
          <Button
            key={preset.id}
            variant="ghost"
            size="sm"
            onClick={() => loadPreset(preset.id)}
            title={preset.description}
            className="justify-start"
          >
            <div className="flex flex-col items-start gap-0.5">
              <span className="font-medium">{preset.name}</span>
              <span className="text-xs opacity-75">{preset.description}</span>
            </div>
          </Button>
        ))}
      </div>
    </Collapsible>
  );
}
