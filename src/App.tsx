import { useEffect } from 'react';
import { SVGSimulationCanvas } from '@/components/canvas/SVGSimulationCanvas';
import { PlaybackControls } from '@/components/controls';
import { AppearanceSection } from '@/components/panels';
import { FormulaPanel } from '@/components/formula';
import { MainLayout } from '@/components/layout';
import { ParameterPanel } from '@/components/panels';
import { useSimulationStore } from '@/store';
import { SimulationProvider } from '@/hooks/SimulationContext';
import { decodeShareState } from '@/utils/urlShare';
import './index.css';

export function App() {
  const { loadFromLocalStorage, applySharedState } = useSimulationStore();

  // Load saved parameters on mount (URL hash takes priority)
  useEffect(() => {
    const hash = window.location.hash;
    if (hash && hash.length > 1) {
      decodeShareState(hash).then((data) => {
        if (data) {
          applySharedState(data);
          history.replaceState(null, '', window.location.pathname + window.location.search);
        } else {
          loadFromLocalStorage();
        }
      });
    } else {
      loadFromLocalStorage();
    }
  }, [loadFromLocalStorage, applySharedState]);

  return (
    <SimulationProvider>
    <MainLayout>
      {/* Main content area */}
      <div className="flex flex-col lg:flex-row gap-6 justify-center">
        {/* Simulation view - left/top */}
        <div className="flex flex-col items-center">
          <div className="canvas-container">
            <SVGSimulationCanvas width={500} height={500} />
          </div>
          <PlaybackControls />
          <AppearanceSection />
        </div>

        {/* Parameter panel - right/bottom */}
        <ParameterPanel />
      </div>

      {/* Formula plot section */}
      <section className="mt-8 space-y-4">
        <FormulaPanel />
      </section>
    </MainLayout>
    </SimulationProvider>
  );
}
