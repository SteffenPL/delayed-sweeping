import { useSimulationStore } from '@/store';
import { Collapsible, TextInput, NumberInput } from '@/components/ui';

export function ConstraintSection() {
  const { constraint, setConstraint } = useSimulationStore();

  return (
    <Collapsible title="Constraint Configuration" defaultOpen={true}>
      <TextInput
        label="SDF Expression g(x,y)"
        value={constraint.expression}
        onChange={(value) => setConstraint({ ...constraint, expression: value })}
        placeholder="e.g., R - sqrt(x^2 + y^2)"
        helperText="Signed distance function"
      />

      <div className="grid grid-cols-2 gap-3">
        <NumberInput
          label="R (Major Radius)"
          value={constraint.R}
          onChange={(value) => setConstraint({ ...constraint, R: value })}
          step={0.1}
        />

        <NumberInput
          label="r (Minor Radius)"
          value={constraint.r}
          onChange={(value) => setConstraint({ ...constraint, r: value })}
          step={0.1}
        />

        <NumberInput
          label="a (Parameter)"
          value={constraint.a}
          onChange={(value) => setConstraint({ ...constraint, a: value })}
          step={0.1}
        />

        <NumberInput
          label="b (Parameter)"
          value={constraint.b}
          onChange={(value) => setConstraint({ ...constraint, b: value })}
          step={0.1}
        />
      </div>

      <div className="mt-2 p-2 bg-[var(--color-bg-alt)] rounded text-xs text-[var(--color-text-muted)]">
        <p className="m-0">💡 Scroll wheel over canvas to rotate constraint</p>
      </div>
    </Collapsible>
  );
}
