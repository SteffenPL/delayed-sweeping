import type { Vec2 } from '@/types';

export type PlotMode = 'instantaneous' | 'parameter-study' | 'convergence';

export type StudyParameter = 'epsilon' | 'h' | 'T' | 'R' | 'r' | 'a' | 'b';

export type AggregationMode = 'final' | 'l2-integral' | 'h1-seminorm' | 'integral';

export type ScalingMode = 'linear' | 'exponential';

export interface ParameterStudyConfig {
  parameter: StudyParameter;
  min: number;
  max: number;
  sampleCount: number;
  scalingMode: ScalingMode;
  // Exponential scaling: values are base^(expMin), base^(expMin+expStep), ..., base^(expMax)
  expBase: number;
  expMin: number;
  expMax: number;
  expStep: number;
  aggregation: AggregationMode;
  logXAxis: boolean;
  logYAxis: boolean;
}

export interface ParameterStudyResult {
  paramValue: number;
  formulaValue: number;
}

export interface EvaluationContext {
  n: number;
  t: number;
  trajectory: Vec2[];
  preProjection: Vec2[];
  constraintCenters: Vec2[];
  constraintAngles: number[];
  projectionDistances: number[];
  gradientNorms: number[];
  classicalTrajectory: Vec2[];
  classicalGradientNorms: number[];
  h: number;
  epsilon: number;
  constraintEvaluator: (x: number, y: number) => number;
  kernelWeights: number[];  // Normalized kernel weights r̃_j (for E_adh)
}

export interface FormulaPreset {
  id: string;
  label: string;
  formula: string;
  description: string;
}
