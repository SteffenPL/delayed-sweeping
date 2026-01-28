import { useMemo } from 'react';
import { useSimulationStore } from '@/store';
import { AVAILABLE_METRICS } from '@/constants/defaults';
import { MetricSelector } from './MetricSelector';
import { LineChart } from './LineChart';
import { ExportButton } from './ExportButton';
import { computeDiscreteWeights } from '@/simulation/kernel';
import type { SimulationStatistics, Vec2 } from '@/types';

export function StatisticsPanel() {
  const {
    trajectory,
    preProjection,
    classicalTrajectory,
    projectionDistances,
    gradientNorms,
    classicalGradientNorms,
    params,
    selectedMetrics,
    setSelectedMetrics,
    showStatistics,
    toggleStatistics,
  } = useSimulationStore();

  const statistics = useMemo((): SimulationStatistics => {
    const n = trajectory.length;
    const time = Array.from({ length: n }, (_, i) => i * params.h);

    const positionX = trajectory.map((p) => p.x);
    const positionY = trajectory.map((p) => p.y);
    const distanceFromOrigin = trajectory.map((p) =>
      Math.sqrt(p.x * p.x + p.y * p.y)
    );

    // Compute velocity (finite differences)
    const velocity: number[] = [0];
    for (let i = 1; i < n; i++) {
      const dx = trajectory[i].x - trajectory[i - 1].x;
      const dy = trajectory[i].y - trajectory[i - 1].y;
      velocity.push(Math.sqrt(dx * dx + dy * dy) / params.h);
    }

    // Compute kernel weights for delayed energy calculation
    const rTilde = computeDiscreteWeights(params.epsilon, params.h);

    // Helper function to compute statistics for a given trajectory
    const computeTrajectoryStats = (traj: Vec2[], xBars: Vec2[], isClassical: boolean = false) => {
      const lagrangeMultiplier: number[] = [];
      const lagrangeDotProduct: number[] = [];
      const totalEnergy: number[] = [];

      for (let i = 0; i < traj.length; i++) {
        // Lagrange multiplier magnitude: ||λ_n G_n|| = ||X_n - X̄_n||
        if (i < xBars.length) {
          const dx = traj[i].x - xBars[i].x;
          const dy = traj[i].y - xBars[i].y;
          lagrangeMultiplier.push(Math.sqrt(dx * dx + dy * dy));
        } else {
          lagrangeMultiplier.push(0);
        }

        // Lagrange dot product: <λ_n G_n - λ_{n-1} G_{n-1}, X_n - X_{n-1}>
        if (i > 0 && i < xBars.length) {
          // λ_n G_n = X_n - X̄_n
          const lambda_n_Gn_x = traj[i].x - xBars[i].x;
          const lambda_n_Gn_y = traj[i].y - xBars[i].y;

          // λ_{n-1} G_{n-1} = X_{n-1} - X̄_{n-1}
          const lambda_nm1_Gnm1_x = traj[i - 1].x - xBars[i - 1].x;
          const lambda_nm1_Gnm1_y = traj[i - 1].y - xBars[i - 1].y;

          // Difference: λ_n G_n - λ_{n-1} G_{n-1}
          const diff_x = lambda_n_Gn_x - lambda_nm1_Gnm1_x;
          const diff_y = lambda_n_Gn_y - lambda_nm1_Gnm1_y;

          // X_n - X_{n-1}
          const step_x = traj[i].x - traj[i - 1].x;
          const step_y = traj[i].y - traj[i - 1].y;

          // Dot product
          lagrangeDotProduct.push(diff_x * step_x + diff_y * step_y);
        } else {
          lagrangeDotProduct.push(0);
        }

        // Total energy computation
        let energy = 0;

        if (isClassical) {
          // Classical energy: kinetic energy = (1/2) ||X^n - X^{n-1}||^2 / h^2
          // Simplified: ||X^n - X^{n-1}||^2 / (2 * h^2)
          if (i > 0) {
            const dx = traj[i].x - traj[i - 1].x;
            const dy = traj[i].y - traj[i - 1].y;
            energy = (dx * dx + dy * dy) / (2 * params.h * params.h);
          }
        } else {
          // Delayed energy: E_n = h Σ_{j≥1} r̃_j ||X^n - X^{n-j}||^2
          for (let j = 1; j < rTilde.length && i - j >= 0; j++) {
            const dx = traj[i].x - traj[i - j].x;
            const dy = traj[i].y - traj[i - j].y;
            energy += params.h * rTilde[j] * (dx * dx + dy * dy);
          }
        }

        totalEnergy.push(energy);
      }

      return { lagrangeMultiplier, lagrangeDotProduct, totalEnergy };
    };

    // Compute delayed sweeping statistics
    const delayedStats = computeTrajectoryStats(trajectory, preProjection, false);

    // Compute classical sweeping statistics
    // For classical sweeping, X̄_n = X_{n-1}, so we need to construct this
    const classicalXBars: Vec2[] = [{ x: 0, y: 0 }]; // First point has no previous
    for (let i = 1; i < classicalTrajectory.length; i++) {
      classicalXBars.push(classicalTrajectory[i - 1]);
    }
    const classicalStats = computeTrajectoryStats(classicalTrajectory, classicalXBars, true);

    // Basic classical metrics
    const classicalPositionX = classicalTrajectory.map((p) => p.x);
    const classicalPositionY = classicalTrajectory.map((p) => p.y);
    const classicalDistanceFromOrigin = classicalTrajectory.map((p) =>
      Math.sqrt(p.x * p.x + p.y * p.y)
    );

    // Classical projection distance (||X_n - X_{n-1}||)
    const classicalProjectionDistance: number[] = [0];
    for (let i = 1; i < classicalTrajectory.length; i++) {
      const dx = classicalTrajectory[i].x - classicalTrajectory[i - 1].x;
      const dy = classicalTrajectory[i].y - classicalTrajectory[i - 1].y;
      classicalProjectionDistance.push(Math.sqrt(dx * dx + dy * dy));
    }

    // Classical velocity (finite differences)
    const classicalVelocity: number[] = [0];
    for (let i = 1; i < classicalTrajectory.length; i++) {
      const dx = classicalTrajectory[i].x - classicalTrajectory[i - 1].x;
      const dy = classicalTrajectory[i].y - classicalTrajectory[i - 1].y;
      classicalVelocity.push(Math.sqrt(dx * dx + dy * dy) / params.h);
    }

    // Compute lagrange multiplier value: λ_n = ||X_n - X̄_n|| / ||∇g(X_n)||
    const lagrangeMultiplierValue = delayedStats.lagrangeMultiplier.map((lm, i) => {
      const gn = gradientNorms[i] ?? 1;
      return gn > 1e-10 ? lm / gn : 0;
    });

    const classicalLagrangeMultiplierValue = classicalStats.lagrangeMultiplier.map((lm, i) => {
      const gn = classicalGradientNorms[i] ?? 1;
      return gn > 1e-10 ? lm / gn : 0;
    });

    return {
      time,
      projectionDistance: projectionDistances,
      velocity,
      positionX,
      positionY,
      distanceFromOrigin,
      lagrangeMultiplier: delayedStats.lagrangeMultiplier,
      lagrangeDotProduct: delayedStats.lagrangeDotProduct,
      totalEnergy: delayedStats.totalEnergy,
      gradientNorm: gradientNorms,
      lagrangeMultiplierValue,
      classicalProjectionDistance,
      classicalPositionX,
      classicalPositionY,
      classicalVelocity,
      classicalDistanceFromOrigin,
      classicalLagrangeMultiplier: classicalStats.lagrangeMultiplier,
      classicalLagrangeDotProduct: classicalStats.lagrangeDotProduct,
      classicalTotalEnergy: classicalStats.totalEnergy,
      classicalGradientNorm: classicalGradientNorms,
      classicalLagrangeMultiplierValue,
    };
  }, [trajectory, preProjection, classicalTrajectory, projectionDistances, gradientNorms, classicalGradientNorms, params.h, params.epsilon]);

  const chartData = useMemo(() => {
    return statistics.time.map((t, i) => ({
      time: t,
      projectionDistance: statistics.projectionDistance[i] ?? 0,
      positionX: statistics.positionX[i] ?? 0,
      positionY: statistics.positionY[i] ?? 0,
      velocity: statistics.velocity[i] ?? 0,
      distanceFromOrigin: statistics.distanceFromOrigin[i] ?? 0,
      lagrangeMultiplier: statistics.lagrangeMultiplier[i] ?? 0,
      lagrangeDotProduct: statistics.lagrangeDotProduct[i] ?? 0,
      totalEnergy: statistics.totalEnergy[i] ?? 0,
      gradientNorm: statistics.gradientNorm[i] ?? 0,
      lagrangeMultiplierValue: statistics.lagrangeMultiplierValue[i] ?? 0,
      classicalProjectionDistance: statistics.classicalProjectionDistance[i] ?? 0,
      classicalPositionX: statistics.classicalPositionX[i] ?? 0,
      classicalPositionY: statistics.classicalPositionY[i] ?? 0,
      classicalVelocity: statistics.classicalVelocity[i] ?? 0,
      classicalDistanceFromOrigin: statistics.classicalDistanceFromOrigin[i] ?? 0,
      classicalLagrangeMultiplier: statistics.classicalLagrangeMultiplier[i] ?? 0,
      classicalLagrangeDotProduct: statistics.classicalLagrangeDotProduct[i] ?? 0,
      classicalTotalEnergy: statistics.classicalTotalEnergy[i] ?? 0,
      classicalGradientNorm: statistics.classicalGradientNorm[i] ?? 0,
      classicalLagrangeMultiplierValue: statistics.classicalLagrangeMultiplierValue[i] ?? 0,
    }));
  }, [statistics]);

  const activeMetrics = AVAILABLE_METRICS.filter((m) =>
    selectedMetrics.includes(m.id)
  );

  return (
    <div className="statistics-panel">
      <div className="statistics-header">
        <h3>Statistics</h3>
        <div className="statistics-actions">
          <button className="btn btn-small" onClick={toggleStatistics}>
            {showStatistics ? 'Hide' : 'Show'}
          </button>
          <ExportButton statistics={statistics} />
        </div>
      </div>

      {showStatistics && (
        <>
          <MetricSelector
            metrics={AVAILABLE_METRICS}
            selected={selectedMetrics}
            onChange={setSelectedMetrics}
          />

          {chartData.length > 0 && activeMetrics.length > 0 && (
            <LineChart data={chartData} metrics={activeMetrics} />
          )}

          {chartData.length === 0 && (
            <div className="no-data">Run the simulation to see statistics</div>
          )}
        </>
      )}
    </div>
  );
}
