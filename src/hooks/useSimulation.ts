import { useEffect, useRef, useCallback } from 'react';
import { useSimulationStore } from '@/store';
import { DelayedSweepingSimulator, ClassicalSweepingSimulator, SimulationRunner } from '@/simulation';
import { createProjectionFunction, createFullProjectionFunction } from '@/shapes';
import { createTrajectoryFunction, createPastFunction, createAlphaFunction } from '@/utils';

/**
 * Hook to manage simulation lifecycle.
 * Supports three modes:
 * - idle: no animation running
 * - scrubbing: advancing viewStep through existing history
 * - simulating: computing new simulation steps
 */
export function useSimulation() {
  const simulatorRef = useRef<DelayedSweepingSimulator | null>(null);
  const classicalSimulatorRef = useRef<ClassicalSweepingSimulator | null>(null);
  const runnerRef = useRef<SimulationRunner | null>(null);
  const scrubRafRef = useRef<number | null>(null);

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
      return () => useSimulationStore.getState().dragPosition;
    } else {
      return createTrajectoryFunction(parametricTrajectory);
    }
  }, [trajectoryMode, parametricTrajectory]);

  // Initialize simulator
  const initializeSimulator = useCallback(() => {
    const centerFunc = createCenterFunc();
    const pastFunc = createPastFunction(params);
    const alphaFunc = createAlphaFunction(parametricTrajectory);

    const getConstraint = () => useSimulationStore.getState().constraint;
    const getAngle = () => useSimulationStore.getState().constraintAngle;
    const getTolerance = () => useSimulationStore.getState().params.projectionTolerance;
    const projectFunc = createProjectionFunction(getConstraint, getAngle, getTolerance);
    const fullProjectFunc = createFullProjectionFunction(getConstraint, getAngle, getTolerance);

    simulatorRef.current = new DelayedSweepingSimulator({
      params,
      centerFunc,
      pastFunc,
      projectFunc,
    });

    classicalSimulatorRef.current = new ClassicalSweepingSimulator({
      params,
      centerFunc,
      pastFunc,
      projectFunc: fullProjectFunc,
    });

    runnerRef.current = new SimulationRunner(simulatorRef.current);

    runnerRef.current.setCallbacks(
      (step, position, center, xBar, projDist, gradNorm) => {
        if (trajectoryMode === 'parametric') {
          const t = step * params.h;
          const alpha = alphaFunc(t);
          useSimulationStore.getState().setConstraintAngle(alpha);
        }

        appendTrajectoryPoint(position, xBar, center, projDist, gradNorm);

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
  }, [params, parametricTrajectory, trajectoryMode, speed, createCenterFunc, appendTrajectoryPoint, appendClassicalPoint, setRunning]);

  // Stop any scrubbing animation
  const stopScrub = useCallback(() => {
    if (scrubRafRef.current !== null) {
      cancelAnimationFrame(scrubRafRef.current);
      scrubRafRef.current = null;
    }
  }, []);

  // Start scrubbing through history, then transition to simulation
  const startScrub = useCallback(() => {
    const scrubLoop = () => {
      const state = useSimulationStore.getState();
      const { viewStep, trajectory, speed } = state;

      if (viewStep >= trajectory.length) {
        // Reached end of history, transition to simulation mode
        stopScrub();
        if (!runnerRef.current) {
          initializeSimulator();
        }
        runnerRef.current?.start();
        return;
      }

      // Advance viewStep
      const newStep = Math.min(viewStep + speed, trajectory.length);
      state.setViewStep(newStep);
      scrubRafRef.current = requestAnimationFrame(scrubLoop);
    };

    scrubRafRef.current = requestAnimationFrame(scrubLoop);
  }, [stopScrub, initializeSimulator]);

  // Start simulation
  const start = useCallback(() => {
    const { viewStep, trajectory } = useSimulationStore.getState();

    if (viewStep < trajectory.length) {
      // Viewing history — start scrubbing first
      startScrub();
    } else {
      // At the end — start simulation directly
      if (!runnerRef.current) {
        initializeSimulator();
      }
      runnerRef.current?.start();
    }
    setRunning(true);
  }, [initializeSimulator, setRunning, startScrub]);

  // Pause simulation
  const pause = useCallback(() => {
    stopScrub();
    runnerRef.current?.pause();
    setRunning(false);
  }, [setRunning, stopScrub]);

  // Stop simulation (pause and destroy)
  const stop = useCallback(() => {
    stopScrub();
    runnerRef.current?.pause();
    runnerRef.current?.destroy();
    runnerRef.current = null;
    simulatorRef.current = null;
    classicalSimulatorRef.current = null;
    setRunning(false);
  }, [setRunning, stopScrub]);

  // Restart simulation
  const restart = useCallback(() => {
    stopScrub();
    resetTrajectory();

    // Reset constraint angle and drag position to t=0 values
    const { trajectoryMode, parametricTrajectory, setConstraintAngle, setDragPosition } = useSimulationStore.getState();

    if (trajectoryMode === 'parametric') {
      // Evaluate trajectory and angle at t=0
      const centerFunc = createTrajectoryFunction(parametricTrajectory);
      const alphaFunc = createAlphaFunction(parametricTrajectory);

      const center0 = centerFunc(0);
      const alpha0 = alphaFunc(0);

      setConstraintAngle(alpha0);
      setDragPosition(center0);
    }

    initializeSimulator();
  }, [resetTrajectory, initializeSimulator, stopScrub]);

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
      stopScrub();
      runnerRef.current?.destroy();
    };
  }, [stopScrub]);

  return {
    start,
    pause,
    stop,
    restart,
    toggle,
    isRunning,
  };
}
