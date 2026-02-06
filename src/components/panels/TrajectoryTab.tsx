import { useSimulationStore } from '@/store';
import { ExpressionInput, ParameterRow } from '@/components/parameters';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { HELP_CONTENT } from '@/data/help-content';

export function TrajectoryTab() {
  const {
    trajectoryMode,
    setTrajectoryMode,
    parametricTrajectory,
    setParametricTrajectory,
  } = useSimulationStore();

  const isParametric = trajectoryMode === 'parametric';

  return (
    <div className="space-y-4">
      {/* Mode Selector */}
      <ParameterRow label="Mode" help={HELP_CONTENT.trajectoryMode}>
        <Select
          value={trajectoryMode}
          onValueChange={(val) => setTrajectoryMode(val as 'parametric' | 'free-drag')}
        >
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="parametric">Parametric</SelectItem>
            <SelectItem value="free-drag">Free Drag</SelectItem>
          </SelectContent>
        </Select>
      </ParameterRow>

      {/* Parametric expressions */}
      {isParametric ? (
        <div className="space-y-3 pt-2 border-t">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Center Trajectory
          </h4>
          <ExpressionInput
            label="x(t)"
            value={parametricTrajectory.xExpression}
            onChange={(val) =>
              setParametricTrajectory({ ...parametricTrajectory, xExpression: val })
            }
            help={HELP_CONTENT.xExpression}
            placeholder="e.g., 2 * cos(t)"
            rows={1}
          />
          <ExpressionInput
            label="y(t)"
            value={parametricTrajectory.yExpression}
            onChange={(val) =>
              setParametricTrajectory({ ...parametricTrajectory, yExpression: val })
            }
            help={HELP_CONTENT.yExpression}
            placeholder="e.g., 2 * sin(t)"
            rows={1}
          />
          <ExpressionInput
            label="alpha(t)"
            value={parametricTrajectory.alphaExpression}
            onChange={(val) =>
              setParametricTrajectory({ ...parametricTrajectory, alphaExpression: val })
            }
            help={HELP_CONTENT.alphaExpression}
            placeholder="e.g., 0"
            rows={1}
          />
        </div>
      ) : (
        <div className="p-3 bg-muted rounded-md">
          <p className="text-sm text-muted-foreground">
            Click and drag on the canvas to move the constraint center.
          </p>
        </div>
      )}
    </div>
  );
}
