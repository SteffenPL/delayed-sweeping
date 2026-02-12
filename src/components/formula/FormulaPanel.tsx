import { useMemo, useCallback, useRef, useState } from 'react';
import { useSimulationStore } from '@/store';
import {
  FormulaEvaluator,
  aggregate,
} from '@/formula';
import type {
  EvaluationContext,
  ParameterStudyResult,
  PlotMode,
} from '@/formula';
import { interpolateVec2, interpolateScalar } from '@/formula/interpolation';
import { computeConvergenceOrders } from '@/formula/convergenceOrder';
import type { ConvergenceOrderPoint } from '@/formula/convergenceOrder';
import { createExpressionEvaluator } from '@/shapes/expressionConstraint';
import { createAlphaFunction } from '@/utils/trajectoryFunctions';
import { computeDiscreteWeights } from '@/simulation/kernel';
import { SimulationFactory } from '@/simulation/SimulationFactory';
import type { SimulationConfig } from '@/types/config';
import type { Vec2 } from '@/types';
import { FormulaInput } from './FormulaInput';
import { PlotModeSelector } from './PlotModeSelector';
import { ParameterStudyConfigUI } from './ParameterStudyConfig';
import { FormulaPlotChart } from './FormulaPlotChart';
import { FormulaExportControls } from './FormulaExportControls';
import { ConvergenceOrdersTable } from './ConvergenceOrdersTable';

const CONVERGENCE_DEFAULTS = {
  parameter: 'h' as const,
  scalingMode: 'exponential' as const,
  expBase: 2,
  expMin: -8,
  expMax: -3,
  expStep: 1,
  aggregation: 'l2-integral' as const,
  logXAxis: true,
  logYAxis: true,
};

export function FormulaPanel() {
  const {
    trajectory,
    preProjection,
    constraintCenters,
    constraintAngles,
    projectionDistances,
    gradientNorms,
    classicalTrajectory,
    classicalGradientNorms,
    params,
    constraint,
    parametricTrajectory,
    formula,
    plotMode,
    showPlot,
    parameterStudyConfig,
    parameterStudyResults,
    parameterStudyRunning,
    parameterStudyProgress,
    setFormula,
    setPlotMode,
    setShowPlot,
    setParameterStudyConfig,
    setParameterStudyResults,
    setParameterStudyRunning,
    setParameterStudyProgress,
  } = useSimulationStore();

  const chartRef = useRef<HTMLDivElement>(null);
  const [convergenceOrders, setConvergenceOrders] = useState<ConvergenceOrderPoint[]>([]);

  // Create constraint evaluator (memoized)
  const constraintEvaluator = useMemo(() => {
    return createExpressionEvaluator(constraint.expression, {
      R: constraint.R,
      r: constraint.r,
      a: constraint.a,
      b: constraint.b,
    });
  }, [constraint.expression, constraint.R, constraint.r, constraint.a, constraint.b]);

  // Compute kernel weights (memoized)
  const kernelWeights = useMemo(
    () => computeDiscreteWeights(params.epsilon, params.h, params.solverType),
    [params.epsilon, params.h, params.solverType]
  );

  // Create formula evaluator (memoized)
  const evaluator = useMemo(() => new FormulaEvaluator(formula), [formula]);

  // Handle plot mode change with convergence defaults
  const handlePlotModeChange = useCallback((mode: PlotMode) => {
    if (mode === 'convergence') {
      setParameterStudyConfig({
        ...parameterStudyConfig,
        ...CONVERGENCE_DEFAULTS,
      });
      if (formula === 'g[n]') {
        setFormula('z[n]');
      }
    }
    setPlotMode(mode);
  }, [parameterStudyConfig, formula, setParameterStudyConfig, setFormula, setPlotMode]);

  // Instantaneous mode: evaluate formula at each step
  const instantaneousData = useMemo(() => {
    if (plotMode !== 'instantaneous' || trajectory.length === 0) return [];

    const data: { x: number; y: number }[] = [];
    for (let n = 0; n < trajectory.length; n++) {
      const ctx: EvaluationContext = {
        n,
        t: n * params.h,
        trajectory,
        preProjection,
        constraintCenters,
        constraintAngles,
        projectionDistances,
        gradientNorms,
        classicalTrajectory,
        classicalGradientNorms,
        h: params.h,
        epsilon: params.epsilon,
        constraintEvaluator,
        kernelWeights,
      };
      const y = evaluator.evaluate(ctx);
      data.push({ x: n * params.h, y });
    }
    return data;
  }, [
    plotMode, formula, trajectory, preProjection, constraintCenters,
    constraintAngles, projectionDistances, gradientNorms,
    classicalTrajectory, classicalGradientNorms,
    params.h, params.epsilon, constraintEvaluator, kernelWeights, evaluator,
  ]);

  // Helper: generate parameter values from config
  const generateParamValues = useCallback(() => {
    const { scalingMode, min, max, sampleCount, expBase, expMin, expMax, expStep } = parameterStudyConfig;
    const values: number[] = [];
    if (scalingMode === 'exponential') {
      for (let e = expMin; e <= expMax; e += expStep) {
        values.push(Math.pow(expBase, e));
      }
    } else {
      for (let i = 0; i < sampleCount; i++) {
        const t = sampleCount > 1 ? i / (sampleCount - 1) : 0;
        values.push(min + t * (max - min));
      }
    }
    return values;
  }, [parameterStudyConfig]);

  // Helper: run a simulation for a given parameter value
  const runSingleSim = useCallback(async (paramValue: number) => {
    const { parameter } = parameterStudyConfig;
    const simParams = { ...params, infiniteMode: false };
    const constraintCfg = { ...constraint };

    if (parameter === 'epsilon') simParams.epsilon = paramValue;
    else if (parameter === 'h') simParams.h = paramValue;
    else if (parameter === 'T') simParams.T = paramValue;
    else if (parameter === 'R') constraintCfg.R = paramValue;
    else if (parameter === 'r') constraintCfg.r = paramValue;
    else if (parameter === 'a') constraintCfg.a = paramValue;
    else if (parameter === 'b') constraintCfg.b = paramValue;

    const config: SimulationConfig = {
      simulation: simParams,
      constraint: constraintCfg,
      trajectory: parametricTrajectory,
    };

    const result = await SimulationFactory.runSimulation(config);
    const h = simParams.h;
    const eps = simParams.epsilon;

    const alphaFunc = createAlphaFunction(parametricTrajectory);
    const angles = result.delayed.trajectory.map((_, idx) => alphaFunc(idx * h));

    const cEval = createExpressionEvaluator(constraintCfg.expression, {
      R: constraintCfg.R,
      r: constraintCfg.r,
      a: constraintCfg.a,
      b: constraintCfg.b,
    });

    const studyWeights = computeDiscreteWeights(eps, h, simParams.solverType);

    return { result, h, eps, angles, cEval, studyWeights, simParams };
  }, [parameterStudyConfig, params, constraint, parametricTrajectory]);

  // Parameter study runner
  const runParameterStudy = useCallback(async () => {
    setParameterStudyRunning(true);
    setParameterStudyProgress(0);
    setParameterStudyResults([]);
    setConvergenceOrders([]);

    const values = generateParamValues();
    const { aggregation } = parameterStudyConfig;
    const results: ParameterStudyResult[] = [];

    for (let i = 0; i < values.length; i++) {
      const paramValue = values[i];

      try {
        const { result, h, eps, angles, cEval, studyWeights } = await runSingleSim(paramValue);
        const ev = new FormulaEvaluator(formula);
        const stepValues: number[] = [];

        for (let n = 0; n < result.delayed.trajectory.length; n++) {
          const ctx: EvaluationContext = {
            n,
            t: n * h,
            trajectory: result.delayed.trajectory,
            preProjection: result.delayed.preProjection,
            constraintCenters: result.delayed.centers,
            constraintAngles: angles,
            projectionDistances: result.delayed.projectionDistances,
            gradientNorms: result.delayed.gradientNorms,
            classicalTrajectory: result.classical.trajectory,
            classicalGradientNorms: result.classical.gradientNorms,
            h,
            epsilon: eps,
            constraintEvaluator: cEval,
            kernelWeights: studyWeights,
          };
          stepValues.push(ev.evaluate(ctx));
        }

        const formulaValue = aggregate(stepValues, h, aggregation);
        results.push({ paramValue, formulaValue });
      } catch (error) {
        console.error(`Study failed for ${parameterStudyConfig.parameter}=${paramValue}:`, error);
      }

      setParameterStudyProgress((i + 1) / values.length);
      await new Promise((resolve) => setTimeout(resolve, 10));
    }

    setParameterStudyResults(results);
    setParameterStudyRunning(false);
  }, [
    parameterStudyConfig, params, constraint, parametricTrajectory, formula,
    generateParamValues, runSingleSim,
    setParameterStudyRunning, setParameterStudyProgress, setParameterStudyResults,
  ]);

  // Convergence study runner
  const runConvergenceStudy = useCallback(async () => {
    setParameterStudyRunning(true);
    setParameterStudyProgress(0);
    setParameterStudyResults([]);
    setConvergenceOrders([]);

    const values = generateParamValues();
    const { aggregation } = parameterStudyConfig;

    // Sort so finest (smallest h) is first
    const sorted = [...values].sort((a, b) => a - b);

    const ev = new FormulaEvaluator(formula);
    const isVector = ev.isVectorFormula();

    // Run reference (finest)
    let refTimes: number[] = [];
    let refVec: Vec2[] = [];
    let refScalar: number[] = [];

    try {
      const ref = await runSingleSim(sorted[0]);
      const refH = ref.h;
      const alphaFunc = createAlphaFunction(parametricTrajectory);
      const refAngles = ref.result.delayed.trajectory.map((_, idx) => alphaFunc(idx * refH));

      refTimes = ref.result.delayed.trajectory.map((_, idx) => idx * refH);

      for (let n = 0; n < ref.result.delayed.trajectory.length; n++) {
        const ctx: EvaluationContext = {
          n,
          t: n * refH,
          trajectory: ref.result.delayed.trajectory,
          preProjection: ref.result.delayed.preProjection,
          constraintCenters: ref.result.delayed.centers,
          constraintAngles: refAngles,
          projectionDistances: ref.result.delayed.projectionDistances,
          gradientNorms: ref.result.delayed.gradientNorms,
          classicalTrajectory: ref.result.classical.trajectory,
          classicalGradientNorms: ref.result.classical.gradientNorms,
          h: refH,
          epsilon: ref.eps,
          constraintEvaluator: ref.cEval,
          kernelWeights: ref.studyWeights,
        };
        if (isVector) {
          refVec.push(ev.evaluateVec2(ctx));
        } else {
          refScalar.push(ev.evaluate(ctx));
        }
      }
    } catch (error) {
      console.error('Reference simulation failed:', error);
      setParameterStudyRunning(false);
      return;
    }

    setParameterStudyProgress(1 / sorted.length);
    await new Promise((resolve) => setTimeout(resolve, 10));

    // Run coarser values and compute errors
    const results: ParameterStudyResult[] = [];

    for (let i = 1; i < sorted.length; i++) {
      const paramValue = sorted[i];

      try {
        const sim = await runSingleSim(paramValue);
        const coarseH = sim.h;
        const coarseEv = new FormulaEvaluator(formula);
        const stepErrors: number[] = [];

        for (let n = 0; n < sim.result.delayed.trajectory.length; n++) {
          const t = n * coarseH;
          const ctx: EvaluationContext = {
            n,
            t,
            trajectory: sim.result.delayed.trajectory,
            preProjection: sim.result.delayed.preProjection,
            constraintCenters: sim.result.delayed.centers,
            constraintAngles: sim.angles,
            projectionDistances: sim.result.delayed.projectionDistances,
            gradientNorms: sim.result.delayed.gradientNorms,
            classicalTrajectory: sim.result.classical.trajectory,
            classicalGradientNorms: sim.result.classical.gradientNorms,
            h: coarseH,
            epsilon: sim.eps,
            constraintEvaluator: sim.cEval,
            kernelWeights: sim.studyWeights,
          };

          if (isVector) {
            const coarseVal = coarseEv.evaluateVec2(ctx);
            const refVal = interpolateVec2(refTimes, refVec, t);
            const dx = coarseVal.x - refVal.x;
            const dy = coarseVal.y - refVal.y;
            stepErrors.push(Math.sqrt(dx * dx + dy * dy));
          } else {
            const coarseVal = coarseEv.evaluate(ctx);
            const refVal = interpolateScalar(refTimes, refScalar, t);
            stepErrors.push(Math.abs(coarseVal - refVal));
          }
        }

        const formulaValue = aggregate(stepErrors, coarseH, aggregation);
        results.push({ paramValue, formulaValue });
      } catch (error) {
        console.error(`Convergence study failed for ${parameterStudyConfig.parameter}=${paramValue}:`, error);
      }

      setParameterStudyProgress((i + 1) / sorted.length);
      await new Promise((resolve) => setTimeout(resolve, 10));
    }

    // Sort results by paramValue for proper ordering
    results.sort((a, b) => a.paramValue - b.paramValue);

    setParameterStudyResults(results);
    setConvergenceOrders(computeConvergenceOrders(results));
    setParameterStudyRunning(false);
  }, [
    parameterStudyConfig, params, constraint, parametricTrajectory, formula,
    generateParamValues, runSingleSim,
    setParameterStudyRunning, setParameterStudyProgress, setParameterStudyResults,
  ]);

  const handleRun = plotMode === 'convergence' ? runConvergenceStudy : runParameterStudy;

  // Chart data and labels
  const chartData = plotMode === 'instantaneous'
    ? instantaneousData
    : parameterStudyResults.map((r) => ({ x: r.paramValue, y: r.formulaValue }));

  const xLabel = plotMode === 'instantaneous' ? 'Time t' : parameterStudyConfig.parameter;
  const yLabel = plotMode === 'convergence' ? 'Error' : formula;
  const formulaError = evaluator.getError();

  const showStudyConfig = plotMode === 'parameter-study' || plotMode === 'convergence';
  const showLogAxes = plotMode === 'parameter-study' || plotMode === 'convergence';

  return (
    <div className="statistics-panel">
      <div className="statistics-header">
        <h3>Formula Plot</h3>
        <button className="btn btn-small" onClick={() => setShowPlot(!showPlot)}>
          {showPlot ? 'Hide' : 'Show'}
        </button>
      </div>

      {showPlot && (
        <>
          <FormulaInput value={formula} onChange={setFormula} error={formulaError} />

          <div className="mt-half">
            <PlotModeSelector value={plotMode} onChange={handlePlotModeChange} />
          </div>

          {showStudyConfig && (
            <ParameterStudyConfigUI
              config={parameterStudyConfig}
              onChange={setParameterStudyConfig}
              onRun={handleRun}
              running={parameterStudyRunning}
              progress={parameterStudyProgress}
              isConvergenceMode={plotMode === 'convergence'}
            />
          )}

          {chartData.length > 0 && (
            <FormulaPlotChart
              ref={chartRef}
              data={chartData}
              xLabel={xLabel}
              yLabel={yLabel}
              logXAxis={showLogAxes ? parameterStudyConfig.logXAxis : false}
              logYAxis={showLogAxes ? parameterStudyConfig.logYAxis : false}
            />
          )}

          {plotMode === 'convergence' && convergenceOrders.length > 0 && (
            <ConvergenceOrdersTable orders={convergenceOrders} />
          )}

          {plotMode === 'instantaneous' && trajectory.length === 0 && (
            <div className="no-data">Run the simulation to see the plot</div>
          )}

          <FormulaExportControls
            data={chartData}
            xLabel={xLabel}
            yLabel={yLabel}
            chartRef={chartRef}
          />
        </>
      )}
    </div>
  );
}
