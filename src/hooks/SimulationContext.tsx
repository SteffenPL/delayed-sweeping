import { createContext, useContext, type ReactNode } from 'react';
import { useSimulation } from './useSimulation';

type SimulationControls = ReturnType<typeof useSimulation>;

const SimulationContext = createContext<SimulationControls | null>(null);

export function SimulationProvider({ children }: { children: ReactNode }) {
  const controls = useSimulation();
  return (
    <SimulationContext.Provider value={controls}>
      {children}
    </SimulationContext.Provider>
  );
}

export function useSimulationControls(): SimulationControls {
  const ctx = useContext(SimulationContext);
  if (!ctx) throw new Error('useSimulationControls must be used within SimulationProvider');
  return ctx;
}
