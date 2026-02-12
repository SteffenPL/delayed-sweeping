import type { Vec2 } from '@/types';

export type PlotMode = 'instantaneous' | 'parameter-study';

export type StudyParameter = 'epsilon' | 'h' | 'T' | 'R' | 'r' | 'a' | 'b';

export type AggregationMode = 'final' | 'l2-integral' | 'h1-seminorm' | 'integral';

export interface ParameterStudyConfig {
  parameter: StudyParameter;
  min: number;
  max: number;
  sampleCount: number;
  logScale: boolean;
  aggregation: AggregationMode;
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
}

export interface FormulaPreset {
  id: string;
  label: string;
  formula: string;
  description: string;
}
