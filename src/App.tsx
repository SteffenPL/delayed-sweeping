import { useEffect } from 'react';
import { SimulationCanvas } from '@/components/canvas/SimulationCanvas';
import { PlaybackControls } from '@/components/controls';
import { StatisticsPanel, ConvergencePanel } from '@/components/statistics';
import { MainLayout } from '@/components/layout';
import { ParameterPanel } from '@/components/panels';
import { useSimulationStore } from '@/store';
import './index.css';

export function App() {
  const { loadFromLocalStorage } = useSimulationStore();

  // Load saved parameters on mount
  useEffect(() => {
    loadFromLocalStorage();
  }, [loadFromLocalStorage]);

  return (
    <MainLayout>
      {/* Main content area */}
      <div className="flex flex-col lg:flex-row gap-6 justify-center">
        {/* Simulation view - left/top */}
        <div className="flex flex-col items-center">
          <div className="canvas-container">
            <SimulationCanvas width={500} height={500} />
          </div>
          <PlaybackControls />
        </div>

        {/* Parameter panel - right/bottom */}
        <ParameterPanel />
      </div>

      {/* Statistics section */}
      <section className="mt-8 space-y-4">
        <StatisticsPanel />
        <ConvergencePanel />
      </section>
    </MainLayout>
  );
}
