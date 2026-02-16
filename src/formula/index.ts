export { FormulaEvaluator } from './evaluator';
export { aggregate } from './aggregators';
export { FORMULA_PRESETS } from './presets';
export { interpolateVec2, interpolateScalar } from './interpolation';
export { computeConvergenceOrders, computeAverageOrder } from './convergenceOrder';
export type {
  PlotMode,
  StudyParameter,
  ScalingMode,
  AggregationMode,
  ConvergenceRefMode,
  ParameterStudyConfig,
  ParameterStudyResult,
  EvaluationContext,
  FormulaPreset,
} from './types';
export type { ConvergenceOrderPoint } from './convergenceOrder';
