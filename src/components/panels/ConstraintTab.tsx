import { useSimulationStore } from '@/store';
import { DraggableNumberInput, ExpressionInput, ParameterRow } from '@/components/parameters';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { HELP_CONTENT } from '@/data/help-content';

// Shape preset definitions
const SHAPE_PRESETS = {
  disk: { expression: 'R - sqrt(x^2 + y^2)', label: 'Disk' },
  stadium: { expression: 'r - sqrt(max(abs(x) - R/2, 0)^2 + y^2)', label: 'Stadium' },
  ellipse: { expression: '1 - sqrt((x/R)^2 + (y/r)^2)', label: 'Ellipse' },
  rectangle: { expression: 'min(R - abs(x), r - abs(y))', label: 'Rectangle' },
  diamond: { expression: 'R - abs(x) - abs(y)', label: 'Diamond' },
  custom: { expression: '', label: 'Custom' },
};

export function ConstraintTab() {
  const { constraint, setConstraint, constraintAngle, setConstraintAngle } = useSimulationStore();

  // Determine current preset
  let currentPreset = 'custom';
  for (const [key, preset] of Object.entries(SHAPE_PRESETS)) {
    if (preset.expression === constraint.expression) {
      currentPreset = key;
      break;
    }
  }

  const handlePresetChange = (preset: string) => {
    const presetData = SHAPE_PRESETS[preset as keyof typeof SHAPE_PRESETS];
    if (presetData && presetData.expression) {
      setConstraint({ ...constraint, expression: presetData.expression });
    }
  };

  return (
    <div className="space-y-4">
      {/* Shape Preset */}
      <ParameterRow label="Preset" help={HELP_CONTENT.shapePreset}>
        <Select value={currentPreset} onValueChange={handlePresetChange}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(SHAPE_PRESETS).map(([key, preset]) => (
              <SelectItem key={key} value={key}>
                {preset.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </ParameterRow>

      {/* Expression */}
      <ExpressionInput
        label="Expression g(x,y)"
        value={constraint.expression}
        onChange={(val) => setConstraint({ ...constraint, expression: val })}
        help={HELP_CONTENT.expression}
        placeholder="e.g., R - sqrt(x^2 + y^2)"
        rows={2}
      />

      {/* Parameters */}
      <div className="space-y-2 pt-2 border-t">
        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          Shape Parameters
        </h4>
        <DraggableNumberInput
          label="R (major)"
          value={constraint.R}
          onChange={(val) => setConstraint({ ...constraint, R: val })}
          min={0.1}
          max={3}
          step={0.05}
          precision={2}
        />
        <DraggableNumberInput
          label="r (minor)"
          value={constraint.r}
          onChange={(val) => setConstraint({ ...constraint, r: val })}
          min={0.1}
          max={3}
          step={0.05}
          precision={2}
        />
        <DraggableNumberInput
          label="a"
          value={constraint.a}
          onChange={(val) => setConstraint({ ...constraint, a: val })}
          min={-5}
          max={5}
          step={0.1}
          precision={2}
        />
        <DraggableNumberInput
          label="b"
          value={constraint.b}
          onChange={(val) => setConstraint({ ...constraint, b: val })}
          min={-5}
          max={5}
          step={0.1}
          precision={2}
        />
      </div>

      {/* Rotation */}
      <div className="space-y-2 pt-2 border-t">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-muted-foreground">Angle</span>
            <span className="text-sm font-mono">
              {(constraintAngle * (180 / Math.PI)).toFixed(1)}
            </span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setConstraintAngle(0)}
          >
            Reset
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Use mouse wheel on canvas to rotate
        </p>
      </div>
    </div>
  );
}
