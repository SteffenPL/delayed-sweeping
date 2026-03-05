import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { parse } from 'smol-toml';
import { SimulationFactory } from '../src/simulation/SimulationFactory';
import { computeDiscreteWeights } from '../src/simulation/kernel';
import { vec2 } from '../src/simulation/vec2';
import {
  createExpressionEvaluator,
  computeBoundaryPolygon,
} from '../src/shapes/expressionConstraint';
import { FormulaEvaluator } from '../src/formula/evaluator';
import { renderTrajectoryPlot, renderConvergencePlot, renderQuantitiesPlot } from '../src/cli/svg';
import type { SimulationConfig } from '../src/types/config';
import type { EvaluationContext } from '../src/formula/types';
import type { Vec2 } from '../src/types/simulation';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PLOTS_DIR = path.join(__dirname, 'plots');

function ensurePlotsDir() {
  if (!fs.existsSync(PLOTS_DIR)) {
    fs.mkdirSync(PLOTS_DIR, { recursive: true });
  }
}

/**
 * Load a TOML base config and deep-merge overrides
 */
function loadConfig(basePath: string, overrides: Record<string, any> = {}): SimulationConfig {
  const absPath = path.resolve(__dirname, basePath);
  const tomlContent = fs.readFileSync(absPath, 'utf-8');
  const base = parse(tomlContent) as Record<string, any>;

  // Deep merge overrides
  for (const section of Object.keys(overrides)) {
    if (typeof overrides[section] === 'object' && !Array.isArray(overrides[section])) {
      base[section] = { ...base[section], ...overrides[section] };
    } else {
      base[section] = overrides[section];
    }
  }

  return base as unknown as SimulationConfig;
}

function writeTSV(filePath: string, header: string[], rows: number[][]) {
  const precision = 12;
  const lines = [header.join('\t')];
  for (const row of rows) {
    lines.push(row.map((v) => v.toFixed(precision)).join('\t'));
  }
  fs.writeFileSync(filePath, lines.join('\n'), 'utf-8');
}

// ─── trajectory ──────────────────────────────────────────────────────

export interface TrajectoryOpts {
  snapshotTimes?: number[];
  showClassical?: boolean;
}

/**
 * Run delayed + classical simulation, export TSV and SVG.
 */
export async function trajectory(
  name: string,
  basePath: string,
  overrides: Record<string, any> = {},
  opts: TrajectoryOpts = {}
) {
  ensurePlotsDir();
  const config = loadConfig(basePath, overrides);
  const { h, epsilon, T } = config.simulation;

  console.log(`[trajectory] ${name}: T=${T}, h=${h}, ε=${epsilon}`);
  const results = await SimulationFactory.runSimulation(config);

  const { delayed, classical } = results;
  const N = delayed.trajectory.length;

  // TSV: time, delayed_x, delayed_y, xBar_x, xBar_y, projDist, classical_x, classical_y, center_x, center_y
  const header = [
    'time', 'delayed_x', 'delayed_y',
    'xBar_x', 'xBar_y', 'projDist',
    'classical_x', 'classical_y',
    'center_x', 'center_y',
  ];
  const rows: number[][] = [];
  for (let i = 0; i < N; i++) {
    rows.push([
      i * h,
      delayed.trajectory[i].x, delayed.trajectory[i].y,
      delayed.preProjection[i].x, delayed.preProjection[i].y,
      delayed.projectionDistances[i],
      classical.trajectory[i]?.x ?? 0, classical.trajectory[i]?.y ?? 0,
      delayed.centers[i].x, delayed.centers[i].y,
    ]);
  }
  const tsvPath = path.join(PLOTS_DIR, `${name}.tsv`);
  writeTSV(tsvPath, header, rows);
  console.log(`  → ${tsvPath} (${N} rows)`);

  // SVG
  const evaluator = createExpressionEvaluator(config.constraint.expression, {
    R: config.constraint.R,
    r: config.constraint.r,
    a: config.constraint.a,
    b: config.constraint.b,
  });

  const svg = renderTrajectoryPlot(
    {
      delayed: delayed.trajectory,
      preProjection: delayed.preProjection,
      classical: classical.trajectory,
      centers: delayed.centers,
      angles: delayed.angles,
    },
    {
      epsilon,
      T,
      h,
      constraintEvaluator: evaluator,
      snapshotTimes: opts.snapshotTimes,
      showClassical: opts.showClassical,
    }
  );

  const svgPath = path.join(PLOTS_DIR, `${name}.svg`);
  fs.writeFileSync(svgPath, svg, 'utf-8');
  console.log(`  → ${svgPath}`);
}

// ─── quantities ──────────────────────────────────────────────────────

/**
 * Run simulation and compute post-hoc quantities: KKT term, energy, projection distance.
 *
 * KKT term: (1 - h*r̃₀) * ⟨(X̄^{n+1} - X^{n+1}) - (X̄^n - X^n), δX^{n+½}⟩
 *   where δX^{n+½} = X^{n+1} - X^n
 *
 * Energy: E_n(X^n) = (h/2) * Σ_j r̃_j * |X^n - X^{n-j}|²
 */
export async function quantities(
  name: string,
  basePath: string,
  overrides: Record<string, any> = {}
) {
  ensurePlotsDir();
  const config = loadConfig(basePath, overrides);
  const { h, epsilon, T, solverType } = config.simulation;

  console.log(`[quantities] ${name}: T=${T}, h=${h}, ε=${epsilon}`);
  const results = await SimulationFactory.runSimulation(config);

  const { delayed } = results;
  const X = delayed.trajectory;
  const XBar = delayed.preProjection;
  const N = X.length;

  // Kernel weights
  const rTilde = computeDiscreteWeights(epsilon, h, solverType);

  // Compute quantities
  const header = ['time', 'kkt_term', 'energy', 'proj_dist'];
  const rows: number[][] = [];

  for (let n = 0; n < N; n++) {
    const t = n * h;

    // Projection distance
    const projDist = vec2.distance(XBar[n], X[n]);

    // KKT term: defined for n >= 1
    let kktTerm = 0;
    if (n >= 1) {
      // λ^n ∝ (X̄^n - X^n), i.e. the projection displacement
      const lambdaGn = vec2.sub(XBar[n], X[n]);
      const lambdaGn1 = vec2.sub(XBar[n - 1], X[n - 1]);
      const diff = vec2.sub(lambdaGn, lambdaGn1);

      // δX^{n-½} = X^n - X^{n-1}
      const deltaX = vec2.sub(X[n], X[n - 1]);

      const factor = 1 - h * rTilde[0];
      kktTerm = factor * vec2.dot(diff, deltaX);
    }

    // Energy: E_n = (h/2) * Σ_{j≥1} r̃_j * |X^n - X^{n-j}|²
    let energy = 0;
    for (let j = 1; j < rTilde.length; j++) {
      let xPast: Vec2;
      if (n - j >= 0) {
        xPast = X[n - j];
      } else {
        // Use past condition value (already baked into simulation, approximate with X[0])
        xPast = X[0];
      }
      energy += rTilde[j] * vec2.lengthSq(vec2.sub(X[n], xPast));
    }
    energy *= h / 2;

    rows.push([t, kktTerm, energy, projDist]);
  }

  const tsvPath = path.join(PLOTS_DIR, `${name}.tsv`);
  writeTSV(tsvPath, header, rows);
  console.log(`  → ${tsvPath} (${N} rows)`);

  // SVG
  const svgSeries = [
    { label: 'KKT term', color: '#fb923c', data: rows.map(([t, kkt]) => ({ t, value: kkt })) },
    { label: 'Energy', color: '#60a5fa', data: rows.map(([t, , e]) => ({ t, value: e })) },
    { label: 'Proj. dist.', color: '#a78bfa', data: rows.map(([t, , , pd]) => ({ t, value: pd })) },
  ];
  const svg = renderQuantitiesPlot(svgSeries, { title: name });
  const svgPath = path.join(PLOTS_DIR, `${name}.svg`);
  fs.writeFileSync(svgPath, svg, 'utf-8');
  console.log(`  → ${svgPath}`);
}

// ─── convergence ─────────────────────────────────────────────────────

export interface ConvergenceOpts {
  hValues: number[];
  hRef: number;
}

/**
 * Convergence study: run reference at hRef, then for each h compute L2 error.
 *
 * L2 error = sqrt(h * Σ |z_h(kh) - z_ref(kh)|²)
 *
 * Reference is interpolated to the coarser grid via piecewise constant (nearest sample).
 */
export async function convergence(
  name: string,
  basePath: string,
  overrides: Record<string, any> = {},
  opts: ConvergenceOpts
) {
  ensurePlotsDir();
  const config = loadConfig(basePath, overrides);
  const { T } = config.simulation;

  console.log(`[convergence] ${name}: T=${T}, hRef=${opts.hRef}, hValues=[${opts.hValues.join(', ')}]`);

  // Run reference simulation
  const refConfig = { ...config, simulation: { ...config.simulation, h: opts.hRef } };
  console.log(`  Running reference (h=${opts.hRef})...`);
  const refResults = await SimulationFactory.runSimulation(refConfig);
  const refTraj = refResults.delayed.trajectory;
  const hRef = opts.hRef;

  // For each h, run simulation and compute L2 error
  const header = ['h', 'Error'];
  const rows: number[][] = [];

  for (const h of opts.hValues) {
    const testConfig = { ...config, simulation: { ...config.simulation, h } };
    console.log(`  Running h=${h}...`);
    const testResults = await SimulationFactory.runSimulation(testConfig);
    const testTraj = testResults.delayed.trajectory;

    // Compute L2 error on the coarser grid
    let sumSq = 0;
    const Nh = Math.floor(T / h);
    for (let k = 0; k <= Nh; k++) {
      const t = k * h;
      // Find nearest reference index
      const refIdx = Math.round(t / hRef);
      if (refIdx >= refTraj.length) continue;

      const diff = vec2.sub(testTraj[k], refTraj[refIdx]);
      sumSq += vec2.lengthSq(diff);
    }
    const l2Error = Math.sqrt(h * sumSq);

    rows.push([h, l2Error]);
    console.log(`    h=${h} → L2 error = ${l2Error.toExponential(4)}`);
  }

  const tsvPath = path.join(PLOTS_DIR, `${name}.tsv`);
  writeTSV(tsvPath, header, rows);
  console.log(`  → ${tsvPath}`);

  // SVG log-log plot
  const svgData = rows.map(([h, error]) => ({ h, error }));
  const svg = renderConvergencePlot(
    [{ label: name, color: '#fb923c', data: svgData }],
    { title: name, refSlopes: [1, 2] }
  );
  const svgPath = path.join(PLOTS_DIR, `${name}.svg`);
  fs.writeFileSync(svgPath, svg, 'utf-8');
  console.log(`  → ${svgPath}`);
}

// ─── parameter scan ──────────────────────────────────────────────────

export interface ParameterScanOpts {
  formula: string;
  aggregation: 'max' | 'min' | 'final';
  paramValues: number[];
  paramOverride: (value: number) => Record<string, any>;
  paramLabel: string;
  valueLabel: string;
  refSlopes?: number[];
}

/**
 * Run a formula over a range of parameter values, aggregate per-simulation,
 * and produce a log-log plot.
 */
export async function parameterScan(
  name: string,
  basePath: string,
  overrides: Record<string, any> = {},
  opts: ParameterScanOpts
) {
  ensurePlotsDir();
  const baseConfig = loadConfig(basePath, overrides);
  const formulaEval = new FormulaEvaluator(opts.formula);

  console.log(`[parameterScan] ${name}: formula="${opts.formula}", aggregation=${opts.aggregation}, ${opts.paramLabel}=[${opts.paramValues.join(', ')}]`);

  const header = [opts.paramLabel, opts.valueLabel];
  const rows: number[][] = [];

  for (const paramValue of opts.paramValues) {
    const config = deepMergeOverrides(baseConfig, opts.paramOverride(paramValue)) as SimulationConfig;
    const { h, epsilon, T, solverType } = config.simulation;

    console.log(`  Running ${opts.paramLabel}=${paramValue}...`);
    const results = await SimulationFactory.runSimulation(config);

    const { delayed, classical } = results;
    const N = delayed.trajectory.length;

    const constraintEval = createExpressionEvaluator(config.constraint.expression, {
      R: config.constraint.R,
      r: config.constraint.r,
      a: config.constraint.a,
      b: config.constraint.b,
    });
    const kernelWeights = computeDiscreteWeights(epsilon, h, solverType);
    const constraintAngles = delayed.angles;

    // Evaluate formula at each time step
    const values: number[] = [];
    for (let n = 0; n < N; n++) {
      const ctx: EvaluationContext = {
        n,
        t: n * h,
        trajectory: delayed.trajectory,
        preProjection: delayed.preProjection,
        constraintCenters: delayed.centers,
        constraintAngles,
        projectionDistances: delayed.projectionDistances,
        gradientNorms: delayed.gradientNorms,
        classicalTrajectory: classical.trajectory,
        classicalGradientNorms: classical.gradientNorms,
        h,
        epsilon,
        constraintEvaluator: constraintEval,
        kernelWeights,
      };
      values.push(formulaEval.evaluate(ctx));
    }

    // Aggregate (filter out NaN values from e.g. division by zero at n=0)
    const finite = values.filter(v => isFinite(v));
    let aggregated: number;
    if (finite.length === 0) {
      aggregated = NaN;
    } else {
      switch (opts.aggregation) {
        case 'max':
          aggregated = Math.max(...finite);
          break;
        case 'min':
          aggregated = Math.min(...finite);
          break;
        case 'final':
          aggregated = values[values.length - 1];
          break;
      }
    }

    rows.push([paramValue, aggregated]);
    console.log(`    ${opts.paramLabel}=${paramValue} → ${opts.valueLabel} = ${aggregated.toExponential(4)}`);
  }

  // TSV
  const tsvPath = path.join(PLOTS_DIR, `${name}.tsv`);
  writeTSV(tsvPath, header, rows);
  console.log(`  → ${tsvPath}`);

  // SVG log-log plot (reuse convergence renderer)
  const svgData = rows.map(([p, v]) => ({ h: p, error: v }));
  const svg = renderConvergencePlot(
    [{ label: name, color: '#fb923c', data: svgData }],
    { title: name, refSlopes: opts.refSlopes ?? [1, 2], yLabel: opts.valueLabel }
  );
  const svgPath = path.join(PLOTS_DIR, `${name}.svg`);
  fs.writeFileSync(svgPath, svg, 'utf-8');
  console.log(`  → ${svgPath}`);
}

function deepMergeOverrides(base: any, overrides: Record<string, any>): any {
  const result = { ...base };
  for (const key of Object.keys(overrides)) {
    if (typeof overrides[key] === 'object' && !Array.isArray(overrides[key]) && typeof result[key] === 'object') {
      result[key] = { ...result[key], ...overrides[key] };
    } else {
      result[key] = overrides[key];
    }
  }
  return result;
}
