import { useEffect, useRef, useCallback } from 'react';
import { useSimulationStore } from '@/store';
import { DelayedSweepingSimulator, ClassicalSweepingSimulator, SimulationRunner } from '@/simulation';
import { createProjectionFunction, createFullProjectionFunction } from '@/shapes';
import { createTrajectoryFunction, createPastFunction } from '@/utils';

/**
 * Hook to manage simulation lifecycle
 */
export function useSimulation() {
  const simulatorRef = useRef<DelayedSweepingSimulator | null>(null);
  const classicalSimulatorRef = useRef<ClassicalSweepingSimulator | null>(null);
  const runnerRef = useRef<SimulationRunner | null>(null);

  const {
    params,
    trajectoryMode,
    parametricTrajectory,
    isRunning,
    speed,
    setRunning,
    appendTrajectoryPoint,
    appendClassicalPoint,
    resetTrajectory,
  } = useSimulationStore();

  // Create center function based on mode
  const createCenterFunc = useCallback(() => {
    if (trajectoryMode === 'free-drag') {
      // In free-drag mode, return current drag position
      return () => useSimulationStore.getState().dragPosition;
    } else {
      return createTrajectoryFunction(parametricTrajectory);
    }
  }, [trajectoryMode, parametricTrajectory]);

  // Initialize simulator
  const initializeSimulator = useCallback(() => {
    const centerFunc = createCenterFunc();
    const pastFunc = createPastFunction(parametricTrajectory);
    // Use getter functions to access current constraint state dynamically
    const getConstraint = () => useSimulationStore.getState().constraint;
    const getAngle = () => useSimulationStore.getState().constraintAngle;
    const projectFunc = createProjectionFunction(getConstraint, getAngle);
    const fullProjectFunc = createFullProjectionFunction(getConstraint, getAngle);

    // Initialize delayed sweeping simulator
    simulatorRef.current = new DelayedSweepingSimulator({
      params,
      centerFunc,
      pastFunc,
      projectFunc,
    });

    // Initialize classical sweeping simulator (needs full projection with distance)
    classicalSimulatorRef.current = new ClassicalSweepingSimulator({
      params,
      centerFunc,
      pastFunc,
      projectFunc: fullProjectFunc,
    });

    runnerRef.current = new SimulationRunner(simulatorRef.current);

    runnerRef.current.setCallbacks(
      (step, position, center, xBar, projDist, gradNorm) => {
        appendTrajectoryPoint(position, xBar, center, projDist, gradNorm);

        // Also run classical sweeping step
        if (classicalSimulatorRef.current) {
          const classicalPos = classicalSimulatorRef.current.step(step);
          const classicalGradNorms = classicalSimulatorRef.current.getGradientNorms();
          appendClassicalPoint(classicalPos, classicalGradNorms[step]);
        }
      },
      () => {
        setRunning(false);
      }
    );

    runnerRef.current.setSpeed(speed);
    runnerRef.current.setInfiniteMode(params.infiniteMode);
  }, [params, parametricTrajectory, speed, createCenterFunc, appendTrajectoryPoint, appendClassicalPoint, setRunning]);

  // Start simulation
  const start = useCallback(() => {
    if (!runnerRef.current) {
      initializeSimulator();
    }
    runnerRef.current?.start();
    setRunning(true);
  }, [initializeSimulator, setRunning]);

  // Pause simulation
  const pause = useCallback(() => {
    runnerRef.current?.pause();
    setRunning(false);
  }, [setRunning]);

  // Stop simulation (pause and destroy)
  const stop = useCallback(() => {
    runnerRef.current?.pause();
    runnerRef.current?.destroy();
    runnerRef.current = null;
    simulatorRef.current = null;
    classicalSimulatorRef.current = null;
    setRunning(false);
  }, [setRunning]);

  // Restart simulation
  const restart = useCallback(() => {
    resetTrajectory();

    // Reinitialize simulator with current settings
    initializeSimulator();
  }, [resetTrajectory, initializeSimulator]);

  // Toggle play/pause
  const toggle = useCallback(() => {
    if (isRunning) {
      pause();
    } else {
      start();
    }
  }, [isRunning, start, pause]);

  // Update speed
  useEffect(() => {
    if (runnerRef.current) {
      runnerRef.current.setSpeed(speed);
    }
  }, [speed]);

  // Update infinite mode
  useEffect(() => {
    if (runnerRef.current) {
      runnerRef.current.setInfiniteMode(params.infiniteMode);
    }
  }, [params.infiniteMode]);

  // Note: Projection function uses getter, so it automatically sees constraint changes.

  // Update center function when mode or trajectory changes
  useEffect(() => {
    const centerFunc = createCenterFunc();
    if (simulatorRef.current) {
      simulatorRef.current.setCenterFunc(centerFunc);
    }
    if (classicalSimulatorRef.current) {
      classicalSimulatorRef.current.setCenterFunc(centerFunc);
    }
  }, [trajectoryMode, parametricTrajectory, createCenterFunc]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      runnerRef.current?.destroy();
    };
  }, []);

  return {
    start,
    pause,
    stop,
    restart,
    toggle,
    isRunning,
  };
}
