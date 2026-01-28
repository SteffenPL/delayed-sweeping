import { useSimulationStore } from '@/store';
import { Collapsible, Button, TextInput } from '@/components/ui';
import type { TrajectoryMode } from '@/types';

export function TrajectorySection() {
  const { trajectoryMode, setTrajectoryMode, parametricTrajectory, setParametricTrajectory } =
    useSimulationStore();

  return (
    <Collapsible title="Trajectory Configuration" defaultOpen={true}>
      <div className="flex flex-col gap-2">
        <label className="text-xs font-medium text-[var(--color-text-muted)]">Mode</label>
        <div className="flex gap-2">
          <Button
            variant={trajectoryMode === 'free-drag' ? 'primary' : 'ghost'}
            size="sm"
            onClick={() => setTrajectoryMode('free-drag' as TrajectoryMode)}
            className="flex-1"
          >
            Free Drag
          </Button>
          <Button
            variant={trajectoryMode === 'parametric' ? 'primary' : 'ghost'}
            size="sm"
            onClick={() => setTrajectoryMode('parametric' as TrajectoryMode)}
            className="flex-1"
          >
            Parametric
          </Button>
        </div>
      </div>

      {trajectoryMode === 'free-drag' ? (
        <div className="p-3 bg-[var(--color-bg-alt)] rounded text-sm text-[var(--color-text-muted)]">
          <p className="m-0">🖱️ Click and drag the constraint center on the canvas</p>
        </div>
      ) : (
        <>
          <TextInput
            label="x(t) Expression"
            value={parametricTrajectory.xExpression}
            onChange={(value) =>
              setParametricTrajectory({ ...parametricTrajectory, xExpression: value })
            }
            placeholder="e.g., 2 * cos(t)"
            helperText="Center x-coordinate as function of time"
          />

          <TextInput
            label="y(t) Expression"
            value={parametricTrajectory.yExpression}
            onChange={(value) =>
              setParametricTrajectory({ ...parametricTrajectory, yExpression: value })
            }
            placeholder="e.g., 2 * sin(t)"
            helperText="Center y-coordinate as function of time"
          />

          <TextInput
            label="α(t) Expression"
            value={parametricTrajectory.alphaExpression}
            onChange={(value) =>
              setParametricTrajectory({ ...parametricTrajectory, alphaExpression: value })
            }
            placeholder="e.g., 0"
            helperText="Rotation angle as function of time"
          />
        </>
      )}
    </Collapsible>
  );
}
