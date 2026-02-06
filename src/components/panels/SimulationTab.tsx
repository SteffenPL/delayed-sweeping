import { useSimulationStore } from '@/store';
import { DraggableNumberInput, ExpressionInput, ParameterRow } from '@/components/parameters';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { HELP_CONTENT } from '@/data/help-content';

export function SimulationTab() {
  const { params, setParams, speed, setSpeed } = useSimulationStore();

  return (
    <div className="space-y-4">
      {/* Infinite Mode */}
      <ParameterRow label="Infinite Mode" help={HELP_CONTENT.infiniteMode}>
        <Switch
          checked={params.infiniteMode}
          onCheckedChange={(checked) => setParams({ infiniteMode: checked })}
        />
      </ParameterRow>

      {/* Final Time T */}
      <DraggableNumberInput
        label={params.infiniteMode ? 'Window T' : 'Final Time T'}
        value={params.T}
        onChange={(val) => setParams({ T: val })}
        min={1}
        max={60}
        step={0.5}
        precision={1}
      />

      {/* Time Step h */}
      <DraggableNumberInput
        label="Time Step h"
        value={params.h}
        onChange={(val) => setParams({ h: val })}
        min={0.001}
        max={0.1}
        step={0.001}
        precision={4}
        exponentialFactor={0.1}
      />

      {/* Epsilon */}
      <DraggableNumberInput
        label="Decay Rate"
        value={params.epsilon}
        onChange={(val) => setParams({ epsilon: val })}
        min={0.1}
        max={10}
        step={0.1}
        precision={2}
      />

      {/* Solver Type */}
      <ParameterRow label="Solver Type" help={HELP_CONTENT.solverType}>
        <Select
          value={params.solverType}
          onValueChange={(val) => setParams({ solverType: val as typeof params.solverType })}
        >
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="norm1-sum1">norm1-sum1</SelectItem>
            <SelectItem value="norm0-sum1">norm0-sum1</SelectItem>
            <SelectItem value="trapezoidal">trapezoidal</SelectItem>
          </SelectContent>
        </Select>
      </ParameterRow>

      {/* Past Conditions */}
      <div className="space-y-3 pt-2 border-t">
        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          Past Conditions (t &lt; 0)
        </h4>
        <ExpressionInput
          label="x_p(t)"
          value={params.xPastExpression}
          onChange={(val) => setParams({ xPastExpression: val })}
          help={HELP_CONTENT.xPastExpression}
          placeholder="e.g., 2"
          rows={1}
        />
        <ExpressionInput
          label="y_p(t)"
          value={params.yPastExpression}
          onChange={(val) => setParams({ yPastExpression: val })}
          help={HELP_CONTENT.yPastExpression}
          placeholder="e.g., 0"
          rows={1}
        />
      </div>

      {/* Rendering Speed */}
      <div className="pt-2 border-t">
        <DraggableNumberInput
          label="Render Speed"
          value={speed}
          onChange={setSpeed}
          min={1}
          max={50}
          step={1}
          precision={0}
        />
      </div>
    </div>
  );
}
