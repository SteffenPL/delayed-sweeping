import { useMemo, useCallback, useRef } from 'react';
import { useSimulationStore } from '@/store';
import {
  FormulaEvaluator,
  aggregate,
} from '@/formula';
import type {
  EvaluationContext,
  ParameterStudyResult,
} from '@/formula';
import { createExpressionEvaluator } from '@/shapes/expressionConstraint';
import { createAlphaFunction } from '@/utils/trajectoryFunctions';
import { SimulationFactory } from '@/simulation/SimulationFactory';
import type { SimulationConfig } from '@/types/config';
import { FormulaInput } from './FormulaInput';
import { PlotModeSelector } from './PlotModeSelector';
import { ParameterStudyConfigUI } from './ParameterStudyConfig';
import { FormulaPlotChart } from './FormulaPlotChart';
import { FormulaExportControls } from './FormulaExportControls';

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

  // Create constraint evaluator (memoized)
  const constraintEvaluator = useMemo(() => {
    return createExpressionEvaluator(constraint.expression, {
      R: constraint.R,
      r: constraint.r,
      a: constraint.a,
      b: constraint.b,
    });
  }, [constraint.expression, constraint.R, constraint.r, constraint.a, constraint.b]);

  // Create formula evaluator (memoized)
  const evaluator = useMemo(() => new FormulaEvaluator(formula), [formula]);

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
      };
      const y = evaluator.evaluate(ctx);
      data.push({ x: n * params.h, y });
    }
    return data;
  }, [
    plotMode, formula, trajectory, preProjection, constraintCenters,
    constraintAngles, projectionDistances, gradientNorms,
    classicalTrajectory, classicalGradientNorms,
    params.h, params.epsilon, constraintEvaluator, evaluator,
  ]);

  // Parameter study runner
  const runParameterStudy = useCallback(async () => {
    setParameterStudyRunning(true);
    setParameterStudyProgress(0);
    setParameterStudyResults([]);

    const { parameter, min, max, sampleCount, logScale, aggregation } = parameterStudyConfig;

    // Generate parameter values
    const values: number[] = [];
    if (logScale && min > 0 && max > 0) {
      const logMin = Math.log(min);
      const logMax = Math.log(max);
      for (let i = 0; i < sampleCount; i++) {
        const t = sampleCount > 1 ? i / (sampleCount - 1) : 0;
        values.push(Math.exp(logMin + t * (logMax - logMin)));
      }
    } else {
      for (let i = 0; i < sampleCount; i++) {
        const t = sampleCount > 1 ? i / (sampleCount - 1) : 0;
        values.push(min + t * (max - min));
      }
    }

    const results: ParameterStudyResult[] = [];

    for (let i = 0; i < values.length; i++) {
      const paramValue = values[i];

      // Build config with varied parameter
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

      try {
        const result = await SimulationFactory.runSimulation(config);
        const h = simParams.h;
        const eps = simParams.epsilon;

        // Compute constraint angles from alpha function
        const alphaFunc = createAlphaFunction(parametricTrajectory);
        const angles = result.delayed.trajectory.map((_, idx) => alphaFunc(idx * h));

        // Create evaluator for this constraint config
        const cEval = createExpressionEvaluator(constraintCfg.expression, {
          R: constraintCfg.R,
          r: constraintCfg.r,
          a: constraintCfg.a,
          b: constraintCfg.b,
        });

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
          };
          stepValues.push(ev.evaluate(ctx));
        }

        const formulaValue = aggregate(stepValues, h, aggregation);
        results.push({ paramValue, formulaValue });
      } catch (error) {
        console.error(`Study failed for ${parameter}=${paramValue}:`, error);
      }

      setParameterStudyProgress((i + 1) / values.length);
      // Yield to UI
      await new Promise((resolve) => setTimeout(resolve, 10));
    }

    setParameterStudyResults(results);
    setParameterStudyRunning(false);
  }, [
    parameterStudyConfig, params, constraint, parametricTrajectory, formula,
    setParameterStudyRunning, setParameterStudyProgress, setParameterStudyResults,
  ]);

  // Chart data and labels
  const chartData = plotMode === 'instantaneous'
    ? instantaneousData
    : parameterStudyResults.map((r) => ({ x: r.paramValue, y: r.formulaValue }));

  const xLabel = plotMode === 'instantaneous' ? 'Time t' : parameterStudyConfig.parameter;
  const yLabel = formula;
  const formulaError = evaluator.getError();

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

          <div style={{ margin: '0.5rem 0' }}>
            <PlotModeSelector value={plotMode} onChange={setPlotMode} />
          </div>

          {plotMode === 'parameter-study' && (
            <ParameterStudyConfigUI
              config={parameterStudyConfig}
              onChange={setParameterStudyConfig}
              onRun={runParameterStudy}
              running={parameterStudyRunning}
              progress={parameterStudyProgress}
            />
          )}

          {chartData.length > 0 && (
            <FormulaPlotChart
              ref={chartRef}
              data={chartData}
              xLabel={xLabel}
              yLabel={yLabel}
            />
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
