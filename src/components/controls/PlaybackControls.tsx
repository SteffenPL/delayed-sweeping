import { useSimulation } from '@/hooks/useSimulation';
import { Button } from '@/components/ui';
import { Play, Pause, Square, RotateCcw } from 'lucide-react';

export function PlaybackControls() {
  const { toggle, stop, restart, isRunning } = useSimulation();

  return (
    <div className="panel">
      <div className="flex gap-2">
        <Button onClick={toggle} variant="primary" className="flex-1 gap-2">
          {isRunning ? (
            <>
              <Pause className="w-4 h-4" /> Pause
            </>
          ) : (
            <>
              <Play className="w-4 h-4" /> Play
            </>
          )}
        </Button>
        <Button onClick={stop} variant="danger" className="gap-2">
          <Square className="w-4 h-4" /> Stop
        </Button>
        <Button onClick={restart} variant="secondary" className="gap-2">
          <RotateCcw className="w-4 h-4" /> Restart
        </Button>
      </div>
    </div>
  );
}
