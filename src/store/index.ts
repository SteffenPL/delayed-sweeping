import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import type {
  Vec2,
  SimulationParameters,
  ConstraintConfig,
  TrajectoryMode,
  ParametricTrajectory,
} from '@/types';
import { PRESETS } from '@/utils/presets';
import {
  createExpressionEvaluator,
  computeBoundaryPolygon,
} from '@/shapes/expressionConstraint';

interface SimulationStore {
  // Parameters
  params: SimulationParameters;
  setParams: (params: Partial<SimulationParameters>) => void;

  // Constraint
  constraint: ConstraintConfig;
  setConstraint: (constraint: ConstraintConfig) => void;

  // Constraint angle (controlled by mouse wheel)
  constraintAngle: number;
  setConstraintAngle: (angle: number) => void;

  // Precomputed boundary polygon (in local coordinates)
  boundaryPolygon: Vec2[];
  recomputeBoundary: () => void;

  // Trajectory mode
  trajectoryMode: TrajectoryMode;
  setTrajectoryMode: (mode: TrajectoryMode) => void;

  // Parametric trajectory settings
  parametricTrajectory: ParametricTrajectory;
  setParametricTrajectory: (traj: ParametricTrajectory) => void;

  // Free-drag position (for free-drag mode)
  dragPosition: Vec2;
  setDragPosition: (pos: Vec2) => void;

  // Simulation state (delayed sweeping)
  isRunning: boolean;
  currentStep: number;
  trajectory: Vec2[];
  preProjection: Vec2[];
  constraintCenters: Vec2[];
  projectionDistances: number[];
  gradientNorms: number[];

  // Classical sweeping state
  classicalTrajectory: Vec2[];
  classicalGradientNorms: number[];

  setRunning: (running: boolean) => void;
  setCurrentStep: (step: number) => void;
  appendTrajectoryPoint: (
    point: Vec2,
    xBar: Vec2,
    center: Vec2,
    projDist: number,
    gradNorm: number
  ) => void;
  appendClassicalPoint: (point: Vec2, gradNorm: number) => void;
  resetTrajectory: () => void;

  // UI state
  showStatistics: boolean;
  selectedMetrics: string[];
  speed: number;
  toggleStatistics: () => void;
  setSelectedMetrics: (metrics: string[]) => void;
  setSpeed: (speed: number) => void;

  // Presets
  loadPreset: (presetId: string) => void;

  // Persistence
  saveToLocalStorage: () => void;
  loadFromLocalStorage: () => void;
  exportToJSON: () => string;
  importFromJSON: (json: string) => boolean;
}

const DEFAULT_PARAMS: SimulationParameters = {
  T: 12.0,
  h: 0.01,
  epsilon: 2.0,
  infiniteMode: true,
};

const DEFAULT_CONSTRAINT: ConstraintConfig = {
  expression: 'R - sqrt(x^2 + y^2)',
  R: 0.8,
  r: 0.5,
  a: 0,
  b: 0,
};

// Helper to compute boundary from constraint config
function computeBoundaryFromConfig(config: ConstraintConfig): Vec2[] {
  try {
    const evaluator = createExpressionEvaluator(config.expression, {
      R: config.R,
      r: config.r,
      a: config.a,
      b: config.b,
    });
    return computeBoundaryPolygon(evaluator);
  } catch {
    // Return empty polygon on error
    return [];
  }
}

const DEFAULT_TRAJECTORY: ParametricTrajectory = {
  xExpression: '2 * cos(t)',
  yExpression: '2 * sin(t)',
  alphaExpression: '0',
};

export const useSimulationStore = create<SimulationStore>()(
  subscribeWithSelector((set, get) => ({
    // Default values
    params: DEFAULT_PARAMS,
    constraint: DEFAULT_CONSTRAINT,
    constraintAngle: 0,
    boundaryPolygon: computeBoundaryFromConfig(DEFAULT_CONSTRAINT),
    trajectoryMode: 'free-drag',
    parametricTrajectory: DEFAULT_TRAJECTORY,
    dragPosition: { x: 2, y: 0 },

    isRunning: false,
    currentStep: 0,
    trajectory: [],
    preProjection: [],
    constraintCenters: [],
    projectionDistances: [],
    gradientNorms: [],
    classicalTrajectory: [],
    classicalGradientNorms: [],

    showStatistics: true,
    selectedMetrics: ['projectionDistance'],
    speed: 1,

    // Actions
    setParams: (params) =>
      set((state) => ({
        params: { ...state.params, ...params },
      })),

    setConstraint: (constraint) => {
      const boundaryPolygon = computeBoundaryFromConfig(constraint);
      set({ constraint, boundaryPolygon });
    },

    setConstraintAngle: (angle) => set({ constraintAngle: angle }),

    recomputeBoundary: () => {
      const { constraint } = get();
      const boundaryPolygon = computeBoundaryFromConfig(constraint);
      set({ boundaryPolygon });
    },

    setTrajectoryMode: (mode) => set({ trajectoryMode: mode }),

    setParametricTrajectory: (traj) => set({ parametricTrajectory: traj }),

    setDragPosition: (pos) => set({ dragPosition: pos }),

    setRunning: (running) => set({ isRunning: running }),

    setCurrentStep: (step) => set({ currentStep: step }),

    appendTrajectoryPoint: (point, xBar, center, projDist, gradNorm) =>
      set((state) => ({
        trajectory: [...state.trajectory, point],
        preProjection: [...state.preProjection, xBar],
        constraintCenters: [...state.constraintCenters, center],
        projectionDistances: [...state.projectionDistances, projDist],
        gradientNorms: [...state.gradientNorms, gradNorm],
        currentStep: state.currentStep + 1,
      })),

    appendClassicalPoint: (point, gradNorm) =>
      set((state) => ({
        classicalTrajectory: [...state.classicalTrajectory, point],
        classicalGradientNorms: [...state.classicalGradientNorms, gradNorm],
      })),

    resetTrajectory: () =>
      set({
        trajectory: [],
        preProjection: [],
        constraintCenters: [],
        projectionDistances: [],
        gradientNorms: [],
        classicalTrajectory: [],
        classicalGradientNorms: [],
        currentStep: 0,
        isRunning: false,
      }),

    toggleStatistics: () =>
      set((state) => ({
        showStatistics: !state.showStatistics,
      })),

    setSelectedMetrics: (metrics) => set({ selectedMetrics: metrics }),

    setSpeed: (speed) => set({ speed: Math.max(1, Math.min(100, speed)) }),

    loadPreset: (presetId) => {
      const preset = PRESETS.find((p) => p.id === presetId);
      if (preset) {
        const boundaryPolygon = computeBoundaryFromConfig(preset.constraint);
        set({
          params: { ...preset.params },
          constraint: { ...preset.constraint },
          boundaryPolygon,
          constraintAngle: 0,
          parametricTrajectory: { ...preset.trajectory },
          trajectoryMode: 'parametric',
        });
      }
    },

    saveToLocalStorage: () => {
      const state = get();
      const data = {
        params: state.params,
        constraint: state.constraint,
        constraintAngle: state.constraintAngle,
        trajectoryMode: state.trajectoryMode,
        parametricTrajectory: state.parametricTrajectory,
        selectedMetrics: state.selectedMetrics,
        speed: state.speed,
      };
      try {
        localStorage.setItem('websim-params', JSON.stringify(data));
      } catch (e) {
        console.error('Failed to save to localStorage:', e);
      }
    },

    loadFromLocalStorage: () => {
      try {
        const stored = localStorage.getItem('websim-params');
        if (stored) {
          const data = JSON.parse(stored);
          // Migrate old constraint format if needed
          let constraint = data.constraint;
          if (constraint && !constraint.expression) {
            // Old format with just radius
            constraint = {
              ...DEFAULT_CONSTRAINT,
              R: constraint.radius ?? DEFAULT_CONSTRAINT.R,
            };
          }
          constraint = constraint ?? DEFAULT_CONSTRAINT;
          const boundaryPolygon = computeBoundaryFromConfig(constraint);
          set({
            params: data.params ?? DEFAULT_PARAMS,
            constraint,
            boundaryPolygon,
            constraintAngle: data.constraintAngle ?? 0,
            trajectoryMode: data.trajectoryMode ?? 'parametric',
            parametricTrajectory: data.parametricTrajectory ?? DEFAULT_TRAJECTORY,
            selectedMetrics: data.selectedMetrics ?? ['projectionDistance'],
            speed: data.speed ?? 1,
          });
        }
      } catch (e) {
        console.error('Failed to load from localStorage:', e);
      }
    },

    exportToJSON: () => {
      const state = get();
      return JSON.stringify(
        {
          params: state.params,
          constraint: state.constraint,
          trajectoryMode: state.trajectoryMode,
          parametricTrajectory: state.parametricTrajectory,
        },
        null,
        2
      );
    },

    importFromJSON: (json) => {
      try {
        const data = JSON.parse(json);
        // Migrate old constraint format if needed
        let constraint = data.constraint;
        if (constraint && !constraint.expression) {
          constraint = {
            ...DEFAULT_CONSTRAINT,
            R: constraint.radius ?? DEFAULT_CONSTRAINT.R,
          };
        }
        constraint = constraint ?? DEFAULT_CONSTRAINT;
        const boundaryPolygon = computeBoundaryFromConfig(constraint);
        set({
          params: data.params ?? DEFAULT_PARAMS,
          constraint,
          boundaryPolygon,
          constraintAngle: data.constraintAngle ?? 0,
          trajectoryMode: data.trajectoryMode ?? 'parametric',
          parametricTrajectory: data.parametricTrajectory ?? DEFAULT_TRAJECTORY,
        });
        return true;
      } catch (e) {
        console.error('Failed to import JSON:', e);
        return false;
      }
    },
  }))
);
