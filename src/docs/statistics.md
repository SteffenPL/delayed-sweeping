# Formula-Based Plotting System

The simulator uses a formula-based plotting system that replaces the previous fixed-metric statistics and convergence panels. Users type mathematical expressions referencing simulation quantities, and the system evaluates and plots them.

## Three Modes

### Instantaneous Mode
Evaluates the formula at each simulation step `n = 0, 1, ..., N` and plots the result as a time series (time `t` on x-axis, formula value on y-axis).

### Parameter Study Mode
Varies a chosen parameter (e.g., `epsilon`, `h`, `T`, `R`, `r`, `a`, `b`) over a range, runs a full simulation for each value, aggregates the per-step formula results into a single number, and plots the result (parameter value on x-axis, aggregated formula value on y-axis).

### Convergence Mode
A specialized parameter study mode designed for convergence analysis. It:

1. **Generates parameter values** from the same config as parameter study
2. **Uses the finest run as reference**: sorts values so the smallest (finest) value is run first and used as the ground-truth reference trajectory
3. **Supports vector-valued formulas**: if the formula contains unwrapped vector tokens (e.g. `z[n]`, `z[n] - z_cl[n]`), it evaluates component-wise and takes the norm of the difference automatically
4. **Interpolates reference to coarser grids**: uses linear interpolation to sample the reference time series at coarser time points
5. **Computes per-step errors**: `|f(t) - f_ref(t)|` for scalars, `‖f(t) - f_ref(t)‖` for vectors
6. **Aggregates errors** using the selected aggregation mode (default: L² integral)
7. **Estimates convergence orders**: `order_i = log(E_{i+1}/E_i) / log(p_{i+1}/p_i)` between consecutive pairs
8. **Defaults**: parameter=h, exponential scaling 2^-8..2^-3, log-log axes, L² aggregation, formula `z[n]`

#### Scaling Modes

| Mode | Description |
|------|-------------|
| Linear | Uniformly spaced values between min and max |
| Exponential | Values are `base^k` for `k = expMin, expMin+step, ..., expMax` (e.g., `2^{-10}, 2^{-9}, ...`) |

#### Log Axes
Both x-axis and y-axis can be switched to logarithmic scale independently. When enabled, the data is transformed to log₁₀ space for plotting, with original values shown on tick labels and tooltips.

## Formula Syntax

Formulas use [math.js](https://mathjs.org/) syntax with custom tokens for simulation quantities.

### Available Tokens

#### Vector Tokens (must be wrapped in `norm()` or `dot()`)

| Token | Description |
|-------|-------------|
| `z[n]` | Position at step n |
| `z[n-1]` | Position at step n-1 (general: `z[n-k]`) |
| `z(t)` | Alias for `z[n]` |
| `zbar[n]` | Pre-projection weighted average X̄ⁿ |
| `z_avg[n]` | Alias for `zbar[n]` |
| `v[n]` | Velocity vector `(z[n] - z[n-1]) / h` |
| `G[n]` | Gradient ∇g at position z[n] (world coords) |
| `G_pre[n]` | Gradient ∇g at pre-projection point zbar[n] |
| `c[n]` | Constraint center at step n |
| `z_cl[n]` | Classical sweeping position |
| `v_cl[n]` | Classical velocity |
| `G_cl[n]` | Classical gradient |

#### Scalar Tokens (used directly in expressions)

| Token | Description |
|-------|-------------|
| `g[n]` | Constraint value g(z[n]) in local coords |
| `g(z(t))`, `g(z[n])` | Aliases for `g[n]` |
| `g_pre[n]` | Constraint value g(zbar[n]) at pre-projection point |
| `lambda[n]` | Lagrange multiplier: `‖z[n] - zbar[n]‖ / ‖∇g(z[n])‖` |
| `E_adh[n]` | Adhesion energy: `h · Σ_{j≥1} r̃_j · ‖z[n] - z[n-j]‖²` |
| `E_kin[n]` | Kinetic energy: `(1/2) · ‖(z[n] - z[n-1]) / h‖²` |
| `g_cl[n]` | Classical constraint value |
| `lambda_cl[n]` | Classical Lagrange multiplier |
| `dt` | Time step h |
| `epsilon` | Kernel decay rate ε |
| `t` | Current time `n * h` |
| `n` | Current step index |

#### Functions

| Function | Description |
|----------|-------------|
| `norm(expr)` | Euclidean norm of a vector expression |
| `dot(a, b)` | Dot product of two vector expressions |

### Examples

```
g[n]                          # Constraint value at current position
norm(z[n] - z[n-1])           # Step size (displacement)
norm(z[n] - z[n-1]) / dt      # Velocity magnitude
lambda[n]                     # Lagrange multiplier
norm(z[n] - z_cl[n])          # Delayed vs classical difference
norm(G[n])                    # Gradient norm
dot(v[n], G[n])               # Velocity-gradient alignment
norm(z[n] - zbar[n])          # Projection distance ‖X - X̄‖
g_pre[n]                      # Constraint value before projection
E_adh[n]                      # Adhesion energy (kernel-weighted)
E_kin[n]                      # Kinetic energy
E_adh[n] + E_kin[n]           # Total energy
```

## Two-Pass Evaluation

The formula evaluator uses a two-pass approach to handle the 2D vector nature of the simulation:

### Pass 1: Vector Function Extraction
1. Find `norm(...)` and `dot(...)` calls using balanced-parenthesis matching
2. For each call, evaluate the inner expression component-wise (x and y separately)
3. Compute the scalar result: `norm` → `√(x² + y²)`, `dot` → `ax*bx + ay*by`
4. Replace the function call with the computed scalar value

### Pass 2: Scalar Evaluation
1. Replace remaining scalar tokens (`g[n]`, `lambda[n]`, `dt`, etc.) with their numeric values
2. Evaluate the resulting expression using math.js

### Error Handling
If vector tokens remain after Pass 1 (i.e., used outside `norm()` or `dot()`), the evaluator throws an error: "Wrap vector expressions in norm() or dot()".

## Aggregation Modes (Parameter Study)

When running a parameter study, per-step formula values must be reduced to a single number. A help button (?) next to the aggregation dropdown shows the LaTeX-rendered formula for the selected mode.

| Mode | Formula | Description |
|------|---------|-------------|
| Final value | `values[N]` | Last step's value |
| Integral | `h · Σ values[i]` | Trapezoidal quadrature |
| L² integral | `√(h · Σ values[i]²)` | L² norm of the time series |
| H¹ semi-norm | `√(h · Σ ((v[i]-v[i-1])/h)²)` | Measures oscillation |

## Implementation

### Core Files

| File | Purpose |
|------|---------|
| `src/formula/types.ts` | Type definitions (PlotMode, EvaluationContext, etc.) |
| `src/formula/evaluator.ts` | Two-pass FormulaEvaluator class (scalar + vector evaluation) |
| `src/formula/aggregators.ts` | Aggregation functions for parameter study |
| `src/formula/presets.ts` | Preset formula definitions |
| `src/formula/interpolation.ts` | Linear interpolation for Vec2 and scalar time series |
| `src/formula/convergenceOrder.ts` | Convergence order estimation from error-parameter pairs |

### UI Components

| File | Purpose |
|------|---------|
| `src/components/formula/FormulaPanel.tsx` | Main orchestrator (incl. convergence runner) |
| `src/components/formula/FormulaInput.tsx` | Text input with help popover and presets |
| `src/components/formula/PlotModeSelector.tsx` | Instantaneous / Parameter Study / Convergence toggle |
| `src/components/formula/ParameterStudyConfig.tsx` | Parameter range and aggregation controls |
| `src/components/formula/FormulaPlotChart.tsx` | Recharts line chart (with log-scale tick fixes) |
| `src/components/formula/FormulaExportControls.tsx` | TSV and SVG export |
| `src/components/formula/ConvergenceOrdersTable.tsx` | Convergence orders display table |

### Store State

Formula-related state in `src/store/index.ts`:

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `formula` | `string` | `'g[n]'` | Current formula expression |
| `plotMode` | `PlotMode` | `'instantaneous'` | Display mode |
| `showPlot` | `boolean` | `true` | Panel visibility |
| `parameterStudyConfig` | `ParameterStudyConfig` | See defaults | Study parameters |
| `parameterStudyResults` | `ParameterStudyResult[]` | `[]` | Study results |
| `parameterStudyRunning` | `boolean` | `false` | Running flag |
| `parameterStudyProgress` | `number` | `0` | Progress 0-1 |

### Data Flow

**Instantaneous mode:**
```
Store (trajectory, preProjection, ...) updates
  → FormulaPanel useMemo recomputes
    → FormulaEvaluator.evaluate() at each step n
  → FormulaPlotChart renders {time, value} series
```

**Parameter study mode:**
```
User clicks "Run Study"
  → For each parameter sample:
    → SimulationFactory.runSimulation(config)
    → FormulaEvaluator.evaluate() at each step
    → aggregate(values, h, mode) → single number
  → FormulaPlotChart renders {param, value} series
```

**Convergence mode:**
```
User clicks "Run Convergence"
  → Sort param values, run finest as reference
  → Evaluate reference formula at each step (scalar or Vec2)
  → For each coarser run:
    → Evaluate formula at each step
    → Interpolate reference to coarse time grid
    → Compute per-step error (|diff| or ||diff||)
    → aggregate(errors, h, mode) → single error number
  → Compute convergence orders between consecutive pairs
  → FormulaPlotChart renders {param, error} on log-log axes
  → ConvergenceOrdersTable shows estimated orders
```

## Export

- **TSV**: Two-column tab-separated file with headers (x-label, y-label)
- **SVG**: Serialized SVG element from the Recharts chart container
