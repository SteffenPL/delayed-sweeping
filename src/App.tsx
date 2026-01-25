import { useEffect } from 'react';
import { SimulationCanvas } from '@/components/canvas/SimulationCanvas';
import {
  PlaybackControls,
  TweakpanePanel,
} from '@/components/controls';
import { StatisticsPanel } from '@/components/statistics';
import { useSimulationStore } from '@/store';
import './index.css';

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
          </div>
          <PlaybackControls />
        </div>

        <aside className="controls-sidebar">
          <TweakpanePanel />
        </aside>
      </main>

      <section className="statistics-section">
        <StatisticsPanel />
      </section>

      <footer className="app-footer">
        <p>
          Based on the mathematical model from the delayed sweeping process manuscript.
          <br />
          <small>Use mouse wheel on canvas to rotate shapes. Drag in free-drag mode to move constraint.</small>
        </p>
      </footer>
    </div>
  );
}
