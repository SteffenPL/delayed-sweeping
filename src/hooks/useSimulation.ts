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
    isRunning,
    speed,
    setRunning,
    appendTrajectoryPoint,
    appendClassicalPoint,
    resetTrajectory,
  } = useSimulationStore();

  // Read fresh state from the store (avoids stale closures)
  const getState = useSimulationStore.getState;

  // Create center function based on current store state
  const createCenterFunc = useCallback(() => {
    const { trajectoryMode, parametricTrajectory } = getState();
    if (trajectoryMode === 'free-drag') {
      return () => getState().dragPosition;
    } else {
      return createTrajectoryFunction(parametricTrajectory);
    }
  }, [getState]);

  // Initialize simulator using fresh store state
  const initializeSimulator = useCallback(() => {
    const { params, parametricTrajectory, trajectoryMode, speed } = getState();

    const centerFunc = createCenterFunc();
    const pastFunc = createPastFunction(params);
    const alphaFunc = createAlphaFunction(parametricTrajectory);

    const getConstraint = () => getState().constraint;
    const getAngle = () => getState().constraintAngle;
    const getTolerance = () => getState().params.projectionTolerance;
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
          getState().setConstraintAngle(alpha);
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
  }, [getState, createCenterFunc, appendTrajectoryPoint, appendClassicalPoint, setRunning]);

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
      const state = getState();
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
  }, [getState, stopScrub, initializeSimulator]);

  // Start simulation
  const start = useCallback(() => {
    const { viewStep, trajectory } = getState();

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
  }, [getState, initializeSimulator, setRunning, startScrub]);

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

  // Restart simulation (reads fresh state, safe to call right after store updates)
  const restart = useCallback(() => {
    stopScrub();

    // Destroy old runner/simulator
    runnerRef.current?.pause();
    runnerRef.current?.destroy();
    runnerRef.current = null;
    simulatorRef.current = null;
    classicalSimulatorRef.current = null;

    resetTrajectory();

    // Reset constraint angle and drag position to t=0 values
    const { trajectoryMode, parametricTrajectory, setConstraintAngle, setDragPosition } = getState();

    if (trajectoryMode === 'parametric') {
      const centerFunc = createTrajectoryFunction(parametricTrajectory);
      const alphaFunc = createAlphaFunction(parametricTrajectory);

      const center0 = centerFunc(0);
      const alpha0 = alphaFunc(0);

      setConstraintAngle(alpha0);
      setDragPosition(center0);
    }

    // Create fresh simulator with current store state
    initializeSimulator();
  }, [getState, resetTrajectory, initializeSimulator, stopScrub]);

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
    const { params } = getState();
    if (runnerRef.current) {
      runnerRef.current.setInfiniteMode(params.infiniteMode);
    }
  }, [getState]);

  // Update center function when mode or trajectory changes
  useEffect(() => {
    const centerFunc = createCenterFunc();
    if (simulatorRef.current) {
      simulatorRef.current.setCenterFunc(centerFunc);
    }
    if (classicalSimulatorRef.current) {
      classicalSimulatorRef.current.setCenterFunc(centerFunc);
    }
  }, [createCenterFunc]);

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
