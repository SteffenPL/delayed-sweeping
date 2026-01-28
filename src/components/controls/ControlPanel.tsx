import { SimulationSection } from './SimulationSection';
import { ConstraintSection } from './ConstraintSection';
import { TrajectorySection } from './TrajectorySection';
import { PlaybackControls } from './PlaybackControls';
import { PresetSelector } from './PresetSelector';
import { ConfigControls } from './ConfigControls';

export function ControlPanel() {
  return (
    <div className="controls-sidebar">
      <PlaybackControls />
      <PresetSelector />
      <SimulationSection />
      <ConstraintSection />
      <TrajectorySection />
      <ConfigControls />
    </div>
  );
}
