import { useEffect } from 'react';
import { SimulationCanvas, ZoomControls } from '@/components/canvas';
import { ControlPanel } from '@/components/controls';
import { StatisticsPanel } from '@/components/statistics';
import { useSimulationStore } from '@/store';

export function App() {
  const { loadFromLocalStorage } = useSimulationStore();

  // Load saved parameters on mount
  useEffect(() => {
    loadFromLocalStorage();
  }, [loadFromLocalStorage]);

  return (
    <div className="app">
      <header className="app-header">
        <h1>Delayed Sweeping Simulator</h1>
        <p className="subtitle">Interactive visualization of the delayed convex sweeping process</p>
      </header>

      <main className="app-main">
        <div className="simulation-section">
          <div className="canvas-container">
            <SimulationCanvas width={500} height={500} />
            <ZoomControls />
          </div>
        </div>

        <aside className="controls-sidebar">
          <ControlPanel />
        </aside>
      </main>

      <section className="statistics-section">
        <StatisticsPanel />
      </section>

      <footer className="app-footer">
        <p>
          Based on the mathematical model from the delayed sweeping process manuscript.
          <br />
          <small>
            💡 Controls: Wheel = rotate • Ctrl/Cmd+Wheel = zoom • Middle mouse or Space+Drag = pan • Drag = move constraint
          </small>
        </p>
      </footer>
    </div>
  );
}
