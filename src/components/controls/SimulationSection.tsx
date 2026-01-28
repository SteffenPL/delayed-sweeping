import { useSimulationStore } from '@/store';
import { Collapsible, NumberInput, TextInput, Toggle, Slider } from '@/components/ui';

export function SimulationSection() {
  const { params, setParams, speed, setSpeed } = useSimulationStore();

  return (
    <Collapsible title="Simulation Parameters" defaultOpen={true}>
      <Toggle
        label="Infinite Mode"
        checked={params.infiniteMode}
        onChange={(checked) => setParams({ infiniteMode: checked })}
        description="Run indefinitely vs fixed time T"
      />

      <NumberInput
        label={params.infiniteMode ? 'Window Size (T)' : 'Final Time (T)'}
        value={params.T}
        onChange={(value) => setParams({ T: value })}
        min={0.1}
        step={0.1}
      />

      <NumberInput
        label="Time Step (h)"
        value={params.h}
        onChange={(value) => setParams({ h: value })}
        min={0.0001}
        max={0.1}
        step={0.0001}
      />

      <NumberInput
        label="Kernel Decay (ε)"
        value={params.epsilon}
        onChange={(value) => setParams({ epsilon: value })}
        min={0.1}
        step={0.1}
      />

      <TextInput
        label="Past Condition x_p(t)"
        value={params.xPastExpression}
        onChange={(value) => setParams({ xPastExpression: value })}
        placeholder="e.g., 2"
        helperText="Expression for x when t < 0"
      />

      <TextInput
        label="Past Condition y_p(t)"
        value={params.yPastExpression}
        onChange={(value) => setParams({ yPastExpression: value })}
        placeholder="e.g., 0"
        helperText="Expression for y when t < 0"
      />

      <Slider
        label="Animation Speed"
        value={speed}
        min={1}
        max={100}
        step={1}
        onChange={setSpeed}
        valueFormatter={(v) => `${v}x`}
      />
    </Collapsible>
  );
}
