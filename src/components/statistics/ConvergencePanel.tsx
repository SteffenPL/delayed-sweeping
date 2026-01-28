import { useState, useMemo, useCallback } from 'react';
import { useSimulationStore } from '@/store';
import { AVAILABLE_METRICS, CONVERGENCE_METRICS } from '@/constants/defaults';
import { SimulationFactory } from '@/simulation/SimulationFactory';
import { ConvergenceChart } from './ConvergenceChart';
import type { Vec2 } from '@/types';
import type { SimulationConfig } from '@/types/config';

interface ConvergenceResult {
  h: number;
  log2h: number;
  terminalValues: Record<string, number>;
  // Store terminal position and lambda for convergence rate calculation
  terminalPosition: Vec2;
  terminalLambda: number;
  classicalTerminalPosition: Vec2;
  classicalTerminalLambda: number;
}

// Combined metrics for convergence panel
const ALL_CONVERGENCE_METRICS = [...AVAILABLE_METRICS, ...CONVERGENCE_METRICS];

/**
 * Generate log-spaced values between min and max
 * exp(linspace(log(min), log(max), steps))
 */
function logspace(min: number, max: number, steps: number): number[] {
  if (steps <= 1) return [min];
  const logMin = Math.log(min);
  const logMax = Math.log(max);
  const result: number[] = [];
  for (let i = 0; i < steps; i++) {
    const t = i / (steps - 1);
    result.push(Math.exp(logMin + t * (logMax - logMin)));
  }
  return result;
}

/**
 * Compute terminal and aggregate statistics for a simulation result
 * Returns both terminal values and min/max over the trajectory
 */
function computeTerminalStatistics(
  trajectory: Vec2[],
  preProjection: Vec2[],
  classicalTrajectory: Vec2[],
  projectionDistances: number[],
  gradientNorms: number[],
  classicalGradientNorms: number[],
  h: number
): { stats: Record<string, number>; terminalPosition: Vec2; terminalLambda: number; classicalTerminalPosition: Vec2; classicalTerminalLambda: number } {
  const n = trajectory.length;
  if (n === 0) {
    return {
      stats: {},
      terminalPosition: { x: 0, y: 0 },
      terminalLambda: 0,
      classicalTerminalPosition: { x: 0, y: 0 },
      classicalTerminalLambda: 0,
    };
  }

  // Get terminal index
  const termIdx = n - 1;

  // Position metrics
  const positionX = trajectory[termIdx].x;
  const positionY = trajectory[termIdx].y;
  const distanceFromOrigin = Math.sqrt(positionX * positionX + positionY * positionY);

  // Velocity (use last step)
  let velocity = 0;
  if (termIdx > 0) {
    const dx = trajectory[termIdx].x - trajectory[termIdx - 1].x;
    const dy = trajectory[termIdx].y - trajectory[termIdx - 1].y;
    velocity = Math.sqrt(dx * dx + dy * dy) / h;
  }

  // Projection distance
  const projectionDistance = projectionDistances[termIdx] ?? 0;
  const gradientNorm = gradientNorms[termIdx] ?? 0;

  // Min/Max projection distance (delayed)
  const maxProjDistance = projectionDistances.length > 0 ? Math.max(...projectionDistances) : 0;
  const minProjDistance = projectionDistances.length > 0 ? Math.min(...projectionDistances.filter(d => d > 0)) : 0;

  // Compute full Lagrange stats arrays for min/max
  const computeFullLagrangeStats = (traj: Vec2[], xBars: Vec2[], grads: number[]) => {
    const lagrangeMultipliers: number[] = [];
    const dotProducts: number[] = [];
    let terminalLambda = 0;
    let terminalEnergy = 0;
    let terminalLagrangeMultiplier = 0;
    let terminalDotProduct = 0;

    for (let idx = 1; idx < traj.length; idx++) {
      // Use the passed xBars (preProjection) for X̄ values
      // This is consistent with StatisticsPanel
      const xBarCurrent = xBars[idx] ?? { x: 0, y: 0 };
      const xBarPrev = xBars[idx - 1] ?? { x: 0, y: 0 };

      // λₙGₙ = Xₙ - X̄ₙ (displacement from delayed average to current position)
      const lambda_n_Gn_x = traj[idx].x - xBarCurrent.x;
      const lambda_n_Gn_y = traj[idx].y - xBarCurrent.y;
      const lambdaG = Math.sqrt(lambda_n_Gn_x * lambda_n_Gn_x + lambda_n_Gn_y * lambda_n_Gn_y);
      
      // Compute lambda value (scalar): λₙ = ||Xₙ - X̄ₙ|| / ||∇g(Xₙ)||
      const gNorm = grads[idx] ?? 1;
      const lambdaValue = gNorm > 1e-10 ? lambdaG / gNorm : 0;
      lagrangeMultipliers.push(lambdaValue);

      // Compute dot product: ⟨λₙGₙ - λₙ₋₁Gₙ₋₁, Xₙ - Xₙ₋₁⟩
      // where λₙGₙ = Xₙ - X̄ₙ
      let dotProduct = 0;
      
      // λₙ₋₁Gₙ₋₁ = Xₙ₋₁ - X̄ₙ₋₁
      const lambda_nm1_Gnm1_x = traj[idx - 1].x - xBarPrev.x;
      const lambda_nm1_Gnm1_y = traj[idx - 1].y - xBarPrev.y;

      // Difference: λₙGₙ - λₙ₋₁Gₙ₋₁
      const diff_x = lambda_n_Gn_x - lambda_nm1_Gnm1_x;
      const diff_y = lambda_n_Gn_y - lambda_nm1_Gnm1_y;

      // Xₙ - Xₙ₋₁
      const step_x = traj[idx].x - traj[idx - 1].x;
      const step_y = traj[idx].y - traj[idx - 1].y;

      // Dot product: ⟨λₙGₙ - λₙ₋₁Gₙ₋₁, Xₙ - Xₙ₋₁⟩
      dotProduct = diff_x * step_x + diff_y * step_y;
      dotProducts.push(dotProduct);

      // Store terminal values
      if (idx === traj.length - 1) {
        terminalLambda = lambdaValue;
        terminalLagrangeMultiplier = lambdaG;
        terminalDotProduct = dotProduct;
        const vx = (traj[idx].x - traj[idx - 1].x) / h;
        const vy = (traj[idx].y - traj[idx - 1].y) / h;
        terminalEnergy = 0.5 * (vx * vx + vy * vy);
      }
    }

    return {
      lagrangeMultipliers,
      dotProducts,
      terminalLambda,
      terminalEnergy,
      terminalLagrangeMultiplier,
      terminalDotProduct,
      maxLagrangeMultiplier: lagrangeMultipliers.length > 0 ? Math.max(...lagrangeMultipliers) : 0,
      minLagrangeMultiplier: lagrangeMultipliers.length > 0 ? Math.min(...lagrangeMultipliers) : 0,
      maxDotProduct: dotProducts.length > 0 ? Math.max(...dotProducts) : 0,
      minDotProduct: dotProducts.length > 0 ? Math.min(...dotProducts) : 0,
    };
  };

  const delayedStats = computeFullLagrangeStats(trajectory, preProjection, gradientNorms);

  // Classical metrics
  const cn = classicalTrajectory.length;
  let classicalPositionX = 0, classicalPositionY = 0, classicalVelocity = 0;
  let classicalDistanceFromOrigin = 0, classicalProjectionDistance = 0;
  let classicalGradientNorm = 0;

  // Compute classical projection distances for min/max
  const classicalProjDistances: number[] = [];
  for (let i = 1; i < cn && i < preProjection.length; i++) {
    const px = preProjection[i].x - classicalTrajectory[i].x;
    const py = preProjection[i].y - classicalTrajectory[i].y;
    classicalProjDistances.push(Math.sqrt(px * px + py * py));
  }

  if (cn > 0) {
    const cIdx = cn - 1;
    classicalPositionX = classicalTrajectory[cIdx].x;
    classicalPositionY = classicalTrajectory[cIdx].y;
    classicalDistanceFromOrigin = Math.sqrt(classicalPositionX * classicalPositionX + classicalPositionY * classicalPositionY);
    classicalGradientNorm = classicalGradientNorms[cIdx] ?? 0;

    if (cIdx > 0) {
      const dx = classicalTrajectory[cIdx].x - classicalTrajectory[cIdx - 1].x;
      const dy = classicalTrajectory[cIdx].y - classicalTrajectory[cIdx - 1].y;
      classicalVelocity = Math.sqrt(dx * dx + dy * dy) / h;
    }

    // Classical projection distance (distance moved in last projection)
    if (classicalProjDistances.length > 0) {
      classicalProjectionDistance = classicalProjDistances[classicalProjDistances.length - 1];
    }
  }

  const classicalStats = computeFullLagrangeStats(classicalTrajectory, preProjection, classicalGradientNorms);

  const stats = {
    // Terminal values (original metrics)
    projectionDistance,
    positionX,
    positionY,
    velocity,
    distanceFromOrigin,
    lagrangeMultiplier: delayedStats.terminalLagrangeMultiplier,
    lagrangeDotProduct: delayedStats.terminalDotProduct,
    totalEnergy: delayedStats.terminalEnergy,
    gradientNorm,
    lagrangeMultiplierValue: delayedStats.terminalLambda,
    classicalProjectionDistance,
    classicalPositionX,
    classicalPositionY,
    classicalVelocity,
    classicalDistanceFromOrigin,
    classicalLagrangeMultiplier: classicalStats.terminalLagrangeMultiplier,
    classicalLagrangeDotProduct: classicalStats.terminalDotProduct,
    classicalTotalEnergy: classicalStats.terminalEnergy,
    classicalGradientNorm,
    classicalLagrangeMultiplierValue: classicalStats.terminalLambda,

    // Min/Max metrics (convergence-specific)
    maxProjDistance,
    minProjDistance,
    maxLagrangeDotProduct: delayedStats.maxDotProduct,
    minLagrangeDotProduct: delayedStats.minDotProduct,
    maxLagrangeMultiplier: delayedStats.maxLagrangeMultiplier,
    minLagrangeMultiplier: delayedStats.minLagrangeMultiplier,

    classicalMaxProjDistance: classicalProjDistances.length > 0 ? Math.max(...classicalProjDistances) : 0,
    classicalMinProjDistance: classicalProjDistances.length > 0 ? Math.min(...classicalProjDistances.filter(d => d > 0)) : 0,
    classicalMaxLagrangeDotProduct: classicalStats.maxDotProduct,
    classicalMinLagrangeDotProduct: classicalStats.minDotProduct,
    classicalMaxLagrangeMultiplier: classicalStats.maxLagrangeMultiplier,
    classicalMinLagrangeMultiplier: classicalStats.minLagrangeMultiplier,
  };

  return {
    stats,
    terminalPosition: { x: positionX, y: positionY },
    terminalLambda: delayedStats.terminalLambda,
    classicalTerminalPosition: { x: classicalPositionX, y: classicalPositionY },
    classicalTerminalLambda: classicalStats.terminalLambda,
  };
}


export function ConvergencePanel() {
  const { params, constraint, parametricTrajectory } = useSimulationStore();

  // Panel state
  const [isExpanded, setIsExpanded] = useState(false);
  const [log2DtMin, setLog2DtMin] = useState(-8); // 2^-8 ≈ 0.0039
  const [log2DtMax, setLog2DtMax] = useState(-4); // 2^-4 = 0.0625
  const [numSteps, setNumSteps] = useState(5);
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<ConvergenceResult[]>([]);
  const [selectedMetrics, setSelectedMetrics] = useState<string[]>(['projectionDistance']);

  // Compute dt values to display
  const dtValues = useMemo(() => {
    const dtMin = Math.pow(2, log2DtMin);
    const dtMax = Math.pow(2, log2DtMax);
    return logspace(dtMin, dtMax, numSteps);
  }, [log2DtMin, log2DtMax, numSteps]);

  // Run convergence analysis
  const runConvergence = useCallback(async () => {
    setIsRunning(true);
    setProgress(0);
    setResults([]);

    const newResults: ConvergenceResult[] = [];

    // First pass: run all simulations and collect results
    for (let i = 0; i < dtValues.length; i++) {
      const h = dtValues[i];

      // Create config with this h value
      const config: SimulationConfig = {
        simulation: {
          ...params,
          h,
          infiniteMode: false, // Must be finite for convergence test
        },
        constraint,
        trajectory: parametricTrajectory,
      };

      try {
        // Run simulation
        const result = await SimulationFactory.runSimulation(config);

        // Compute terminal statistics
        const computed = computeTerminalStatistics(
          result.delayed.trajectory,
          result.delayed.preProjection,
          result.classical.trajectory,
          result.delayed.projectionDistances,
          result.delayed.gradientNorms,
          result.classical.gradientNorms,
          h
        );

        newResults.push({
          h,
          log2h: Math.log2(h),
          terminalValues: computed.stats,
          terminalPosition: computed.terminalPosition,
          terminalLambda: computed.terminalLambda,
          classicalTerminalPosition: computed.classicalTerminalPosition,
          classicalTerminalLambda: computed.classicalTerminalLambda,
        });
      } catch (error) {
        console.error(`Simulation failed for h=${h}:`, error);
      }

      // Update progress
      setProgress((i + 1) / dtValues.length);

      // Yield to UI
      await new Promise((resolve) => setTimeout(resolve, 10));
    }

    // Second pass: compute convergence rate metrics relative to finest resolution (dt_min)
    // The finest resolution is the first result (smallest dt)
    // Skip the reference result itself (first one) - only compute errors for larger dt values
    if (newResults.length > 1) {
      const refResult = newResults[0]; // dt_min result (reference)
      const refPos = refResult.terminalPosition;
      const refLambda = refResult.terminalLambda;
      const refClassicalPos = refResult.classicalTerminalPosition;
      const refClassicalLambda = refResult.classicalTerminalLambda;

      // Start from index 1 to skip the reference
      for (let i = 1; i < newResults.length; i++) {
        const result = newResults[i];
        
        // Compute position error relative to reference
        const posError = Math.sqrt(
          Math.pow(result.terminalPosition.x - refPos.x, 2) +
          Math.pow(result.terminalPosition.y - refPos.y, 2)
        );
        result.terminalValues.logPositionError = posError > 1e-16 ? Math.log2(posError) : -50;

        // Compute lambda error relative to reference
        const lambdaError = Math.abs(result.terminalLambda - refLambda);
        result.terminalValues.logLambdaError = lambdaError > 1e-16 ? Math.log2(lambdaError) : -50;

        // Classical position error
        const classicalPosError = Math.sqrt(
          Math.pow(result.classicalTerminalPosition.x - refClassicalPos.x, 2) +
          Math.pow(result.classicalTerminalPosition.y - refClassicalPos.y, 2)
        );
        result.terminalValues.classicalLogPositionError = classicalPosError > 1e-16 ? Math.log2(classicalPosError) : -50;

        // Classical lambda error
        const classicalLambdaError = Math.abs(result.classicalTerminalLambda - refClassicalLambda);
        result.terminalValues.classicalLogLambdaError = classicalLambdaError > 1e-16 ? Math.log2(classicalLambdaError) : -50;
      }
    }

    setResults(newResults);
    setIsRunning(false);
  }, [dtValues, params, constraint, parametricTrajectory]);

  // Chart data
  const chartData = useMemo(() => {
    return results.map((r) => ({
      log2h: r.log2h,
      ...r.terminalValues,
    }));
  }, [results]);

  // Available metrics for selection (use combined list)
  const activeMetrics = useMemo(() => {
    return ALL_CONVERGENCE_METRICS.filter((m) => selectedMetrics.includes(m.id));
  }, [selectedMetrics]);

  const handleMetricToggle = (id: string) => {
    if (selectedMetrics.includes(id)) {
      setSelectedMetrics(selectedMetrics.filter((m) => m !== id));
    } else {
      setSelectedMetrics([...selectedMetrics, id]);
    }
  };

  // Split metrics into categories for display
  const terminalDelayedMetrics = AVAILABLE_METRICS.filter((m) => !m.id.startsWith('classical'));
  const terminalClassicalMetrics = AVAILABLE_METRICS.filter((m) => m.id.startsWith('classical'));
  const convergenceDelayedMetrics = CONVERGENCE_METRICS.filter((m) => !m.id.startsWith('classical'));
  const convergenceClassicalMetrics = CONVERGENCE_METRICS.filter((m) => m.id.startsWith('classical'));

  return (
    <div className="convergence-panel">
      <div className="convergence-header" onClick={() => setIsExpanded(!isExpanded)}>
        <h3>
          <span className="collapse-icon">{isExpanded ? '▼' : '▶'}</span>
          Convergence Analysis
        </h3>
        <span className="convergence-subtitle">
          Test how terminal statistics converge as dt → 0
        </span>
      </div>

      {isExpanded && (
        <div className="convergence-content">
          {/* Parameter inputs */}
          <div className="convergence-params">
            <div className="param-group">
              <label>
                log₂(dt_min):
                <input
                  type="number"
                  value={log2DtMin}
                  onChange={(e) => setLog2DtMin(Number(e.target.value))}
                  step={1}
                  disabled={isRunning}
                />
              </label>
              <span className="param-value">dt = {Math.pow(2, log2DtMin).toExponential(3)}</span>
            </div>

            <div className="param-group">
              <label>
                log₂(dt_max):
                <input
                  type="number"
                  value={log2DtMax}
                  onChange={(e) => setLog2DtMax(Number(e.target.value))}
                  step={1}
                  disabled={isRunning}
                />
              </label>
              <span className="param-value">dt = {Math.pow(2, log2DtMax).toExponential(3)}</span>
            </div>

            <div className="param-group">
              <label>
                Steps:
                <input
                  type="number"
                  value={numSteps}
                  onChange={(e) => setNumSteps(Math.max(2, Number(e.target.value)))}
                  min={2}
                  max={20}
                  disabled={isRunning}
                />
              </label>
            </div>
          </div>

          {/* Display selected dt values */}
          <div className="dt-values">
            <span className="dt-label">dt values:</span>
            <div className="dt-list">
              {dtValues.map((dt, i) => (
                <span key={i} className="dt-chip">
                  2^{Math.log2(dt).toFixed(1)} ≈ {dt.toFixed(5)}
                </span>
              ))}
            </div>
          </div>

          {/* Run button and progress */}
          <div className="convergence-actions">
            <button
              className="run-button"
              onClick={runConvergence}
              disabled={isRunning}
            >
              {isRunning ? 'Running...' : 'Run Convergence Test'}
            </button>

            {isRunning && (
              <div className="progress-container">
                <div className="progress-bar">
                  <div
                    className="progress-fill"
                    style={{ width: `${progress * 100}%` }}
                  />
                </div>
                <span className="progress-text">
                  {Math.round(progress * 100)}%
                </span>
              </div>
            )}
          </div>

          {/* Metric selector */}
          <div className="convergence-metrics">
            <h4>Select Metrics to Plot:</h4>
            
            {/* Terminal metrics (original) */}
            <div className="metric-category">
              <div className="metric-category-label">Terminal Values</div>
              <div className="metric-selector-container">
                <div className="metric-selector">
                  <div className="metric-row-label">Delayed:</div>
                  {terminalDelayedMetrics.map((metric) => (
                    <label key={metric.id} className="metric-checkbox">
                      <input
                        type="checkbox"
                        checked={selectedMetrics.includes(metric.id)}
                        onChange={() => handleMetricToggle(metric.id)}
                      />
                      <span
                        className="metric-label"
                        style={{ borderColor: metric.color }}
                      >
                        {metric.label}
                      </span>
                    </label>
                  ))}
                </div>
                <div className="metric-selector">
                  <div className="metric-row-label">Classical:</div>
                  {terminalClassicalMetrics.map((metric) => (
                    <label key={metric.id} className="metric-checkbox">
                      <input
                        type="checkbox"
                        checked={selectedMetrics.includes(metric.id)}
                        onChange={() => handleMetricToggle(metric.id)}
                      />
                      <span
                        className="metric-label"
                        style={{ borderColor: metric.color }}
                      >
                        {metric.label}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            {/* Min/Max and Convergence Rate metrics */}
            <div className="metric-category">
              <div className="metric-category-label">Convergence Metrics (min/max over trajectory, error vs dt_min)</div>
              <div className="metric-selector-container">
                <div className="metric-selector">
                  <div className="metric-row-label">Delayed:</div>
                  {convergenceDelayedMetrics.map((metric) => (
                    <label key={metric.id} className="metric-checkbox">
                      <input
                        type="checkbox"
                        checked={selectedMetrics.includes(metric.id)}
                        onChange={() => handleMetricToggle(metric.id)}
                      />
                      <span
                        className="metric-label"
                        style={{ borderColor: metric.color }}
                      >
                        {metric.label}
                      </span>
                    </label>
                  ))}
                </div>
                <div className="metric-selector">
                  <div className="metric-row-label">Classical:</div>
                  {convergenceClassicalMetrics.map((metric) => (
                    <label key={metric.id} className="metric-checkbox">
                      <input
                        type="checkbox"
                        checked={selectedMetrics.includes(metric.id)}
                        onChange={() => handleMetricToggle(metric.id)}
                      />
                      <span
                        className="metric-label"
                        style={{ borderColor: metric.color }}
                      >
                        {metric.label}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Results chart */}
          {results.length > 0 && (
            <div className="convergence-results">
              <h4>Convergence Plot (log₂(dt) vs Terminal Value)</h4>
              <ConvergenceChart data={chartData} metrics={activeMetrics} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
