import { useSimulationControls } from '@/hooks/SimulationContext';
import { TimelineSlider } from './TimelineSlider';

export function PlaybackControls() {
  const { toggle, stop, restart, isRunning } = useSimulationControls();

  return (
    <div className="playback-controls">
      <div className="button-row">
        <button onClick={toggle} className="btn btn-primary">
          {isRunning ? 'Pause' : 'Play'}
        </button>
        <button onClick={stop} className="btn btn-danger">
          Stop
        </button>
        <button onClick={restart} className="btn btn-secondary">
          Restart
        </button>
      </div>
      <TimelineSlider />
    </div>
  );
}
