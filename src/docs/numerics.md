# Numerical Implementation of the Delayed Sweeping Process

This document details the mathematical formulation and numerical implementation of the delayed convex sweeping process simulator.

## Table of Contents

1. [Mathematical Background](#mathematical-background)
2. [Discrete Time-Stepping Scheme](#discrete-time-stepping-scheme)
3. [Kernel Computation](#kernel-computation)
4. [Projection Methods](#projection-methods)
5. [Numerical Parameters](#numerical-parameters)
6. [Implementation Architecture](#implementation-architecture)
7. [Stability and Convergence](#stability-and-convergence)

---

## Mathematical Background

The **delayed convex sweeping process** is a differential inclusion of the form:

```
-dX(t) ∈ N_{C(t)}(X_ρ(t))    for t ∈ [0, T]
X(t) = X_0(t)                 for t < 0
```

where:
- `X(t) ∈ ℝ²` is the trajectory
- `C(t) ⊂ ℝ²` is a time-varying convex constraint set
- `N_{C(t)}(·)` is the normal cone operator to the set `C(t)`
- `X_ρ(t)` is the **delayed state**, defined as a weighted average of past states:

```
X_ρ(t) = ∫_{-∞}^{t} ρ(t - s) X(s) ds / ∫_{-∞}^{t} ρ(t - s) ds
```

The kernel `ρ(a)` determines the memory effect. We use the **exponential kernel**:

```
ρ(a) = λ e^{-λa}    for a ≥ 0
```

where `λ > 0` is the decay rate (larger λ = shorter memory).

### Physical Interpretation

- When `X_ρ(t)` lies outside `C(t)`, the system experiences a restoring force normal to the constraint boundary
- The delay creates inertial effects and smoother trajectories compared to classical sweeping processes
- The exponential kernel gives exponentially decaying memory of past states

---

## Discrete Time-Stepping Scheme

### Time Discretization

We discretize time with uniform step size `h > 0`:

```
t_n = n·h    for n = 0, 1, 2, ..., N
```

where `N = ⌊T/h⌋` is the total number of steps.

### Update Rule

At each time step `n`, we compute `X^n ≈ X(t_n)` via a two-stage process:

1. **Weighted Average** (delayed state):
   ```
   X̄^n = h · ∑_{j≥1} r̃_j · X^{n-j}
   ```

2. **Projection** (constraint enforcement):
   ```
   X^n = P_{C^n}(X̄^n)
   ```

where:
- `X̄^n` is the pre-projection (delayed) state
- `r̃_j` are the normalized discrete kernel weights
- `P_{C^n}(·)` is the projection operator onto `C(t_n)`
- For `n - j < 0`, we use the initial condition: `X^{n-j} = X_0((n-j)·h)`

### Implementation

See `src/simulation/DelayedSweepingSimulator.ts:59-94`:

```typescript
step(n: number): Vec2 {
  // 1. Compute weighted average
  let xBar = vec2.zero();
  for (let j = 1; j < rTilde.length; j++) {
    let xPast = (n - j >= 0) ? X[n - j] : pastFunc((n - j) * h);
    xBar = vec2.add(xBar, vec2.scale(xPast, h * rTilde[j]));
  }

  // 2. Project onto constraint
  const center = centerFunc(t_n);
  const xNew = projectFunc(xBar, center);

  return xNew;
}
```

---

## Kernel Computation

### Discrete Kernel Weights

The continuous exponential kernel `ρ(a) = λe^{-λa}` is discretized via exact integration over time intervals:

```
R_j = (1/h) · ∫_{jh}^{(j+1)h} ρ(a) da
    = (1/h) · e^{-λjh} · (1 - e^{-λh})
```

This gives the unnormalized weights `R_j` for `j = 0, 1, 2, ...`

### Normalization

The weights are normalized to ensure the delayed average is a proper convex combination:

```
μ₀ₕ = h · ∑_{j≥0} R_j

r̃_j = R_j / μ₀ₕ
```

This ensures `∑_{j≥0} h·r̃_j = 1`.

### Truncation

In practice, we truncate the sum at index `J_max` where:

```
e^{-λ·J_max·h} < tol
```

Solving for `J_max`:

```
J_max = ⌈-ln(tol) / (λh)⌉
```

Default tolerance: `tol = 1e-12`

### Implementation

See `src/simulation/kernel.ts:18-42`:

```typescript
export function computeDiscreteWeights(
  lambda: number,
  h: number,
  tol: number = 1e-12
): number[] {
  // Compute truncation index
  const J_max = Math.ceil(-Math.log(tol) / (lambda * h));

  // Compute R_j values
  const factor = (1 / h) * (1 - Math.exp(-lambda * h));
  const R = [];
  for (let j = 0; j < J_max; j++) {
    R.push(factor * Math.exp(-lambda * j * h));
  }

  // Normalize
  const mu_0h = h * R.reduce((sum, r) => sum + r, 0);
  return R.map(r => r / mu_0h);
}
```

### Memory Length

The effective memory length (time span with significant weights) is:

```
T_memory ≈ -ln(tol) / λ
```

For default `tol = 0.01`, this gives `T_memory ≈ 4.6/λ`.

---

## Projection Methods

### Constraint Representation

Constraints are represented using **signed distance functions** (SDF) in the form:

```
g(x, y) ≥ 0    ⟺    (x, y) ∈ C
```

where:
- `g(x, y) > 0`: point is strictly inside (feasible)
- `g(x, y) = 0`: point is on the boundary
- `g(x, y) < 0`: point is outside (infeasible)

### Expression-Based Constraints

The simulator uses `math.js` to parse and evaluate arbitrary constraint expressions.

**Standard parameters**:
- `R`: Primary radius/size
- `r`: Secondary radius/size
- `a`, `b`: General parameters
- `x`, `y`: Spatial coordinates

**Example expressions**:
- Disk: `R - sqrt(x^2 + y^2)`
- Ellipse: `1 - (x^2/R^2 + y^2/r^2)`
- Rectangle: `min(R - abs(x), r - abs(y))`

### Projection Algorithm

For a point `p` that violates the constraint (`g(p) < 0`), we compute the projection `P_C(p)` using **Newton's method** to find the closest point on the boundary.

**Algorithm**:

```
Input: point p, evaluator g(x,y)
Output: projected point p* on boundary

1. If g(p) ≥ 0, return p (already feasible)

2. Initialize p* ← p

3. For i = 1 to maxIterations:
   a. Evaluate g(p*) and ∇g(p*)
   b. If g(p*) ≥ -tol, break (close enough to boundary)
   c. If |∇g(p*)| < ε, break (gradient too small)
   d. Compute Newton step: α = -g(p*) / |∇g(p*)|²
   e. Update: p* ← p* + α·∇g(p*)

4. Return p*
```

**Parameters**:
- `maxIterations = 50`
- `tolerance = 1e-8` (boundary proximity)
- `ε = 1e-12` (gradient magnitude threshold)

### Gradient Computation

Gradients are computed using **central finite differences**:

```
∂g/∂x ≈ [g(x+ε, y) - g(x-ε, y)] / (2ε)
∂g/∂y ≈ [g(x, y+ε) - g(x, y-ε)] / (2ε)
```

where `ε = 1e-6`.

### Coordinate Transforms

Constraints support translation and rotation via coordinate transforms:

**World to Local**:
```
p_local = R(-θ) · (p_world - c)
```

**Local to World**:
```
p_world = R(θ) · p_local + c
```

where `c` is the center position and `θ` is the rotation angle.

### Implementation

See `src/shapes/expressionConstraint.ts:55-97` for the projection implementation:

```typescript
export function projectToConstraint(
  evaluator: (x: number, y: number) => number,
  point: Vec2,
  maxIterations = 50,
  tolerance = 1e-8
): Vec2 {
  const g = evaluator(point.x, point.y);

  // Already feasible
  if (g >= 0) return { ...point };

  // Newton's method
  let p = { ...point };
  for (let i = 0; i < maxIterations; i++) {
    const gVal = evaluator(p.x, p.y);
    if (gVal >= -tolerance) break;

    const grad = numericalGradient(evaluator, p.x, p.y);
    const gradNormSq = grad.x * grad.x + grad.y * grad.y;
    if (gradNormSq < 1e-12) break;

    const step = -gVal / gradNormSq;
    p = {
      x: p.x + step * grad.x,
      y: p.y + step * grad.y,
    };
  }

  return p;
}
```

---

## Numerical Parameters

### Time Step (`h`)

**Range**: Typically `0.001` to `0.1`

**Trade-offs**:
- Smaller `h` → Higher accuracy, more computation
- Larger `h` → Faster simulation, potential instability

**Guidelines**:
- For smooth trajectories: `h = 0.01` to `0.05`
- For fast-moving constraints: `h < 0.01`
- Ensure `h < 1/λ` for kernel accuracy

### Decay Rate (`λ`)

**Range**: Typically `0.1` to `10.0`

**Physical meaning**:
- Memory time scale: `τ_memory ≈ 1/λ`
- `λ = 1.0`: Memory of ~5 time units
- `λ = 10.0`: Short memory (~0.5 time units)
- `λ = 0.1`: Long memory (~50 time units)

**Trade-offs**:
- Larger `λ` → Less delay, behaves more like classical sweeping
- Smaller `λ` → More inertia, smoother trajectories

### Constraint Size (`R`)

**Range**: Typically `0.1` to `5.0`

**Considerations**:
- Should match the scale of the trajectory motion
- Visualization viewport is typically `-10` to `+10`

### Total Time (`T`)

**Range**: `1.0` to `100.0` (or infinite mode)

**Guidelines**:
- For periodic trajectories: `T ≥ few periods`
- For transient behavior: `T ≥ 5·τ_memory`
- Number of steps: `N = T/h`

### Kernel Truncation

**Parameter**: `tol = 1e-12`

**Effect**:
- Controls kernel memory array length: `J_max ≈ -ln(tol)/(λh)`
- Example: `λ = 1.0`, `h = 0.01` → `J_max ≈ 2764` weights
- Memory usage: `O(J_max)` per simulation run

---

## Implementation Architecture

### Core Components

1. **Kernel Module** (`src/simulation/kernel.ts`)
   - Computes discrete exponential kernel weights
   - Handles truncation and normalization

2. **Simulator Class** (`src/simulation/DelayedSweepingSimulator.ts`)
   - Main time-stepping loop
   - Manages trajectory history
   - Provides step-by-step and batch execution

3. **Vector Utilities** (`src/simulation/vec2.ts`)
   - 2D vector operations (add, scale, dot, etc.)
   - Geometric utilities (distance, rotation, normalization)

4. **Constraint System** (`src/shapes/`)
   - Expression-based constraint definitions
   - Numerical projection via Newton's method
   - Coordinate transformation support

### Data Flow

```
Parameters (T, h, λ, R)
    ↓
Kernel Weights (r̃_j)
    ↓
Time Loop (n = 0 to N):
    Past States (X^{n-j})
        ↓
    Weighted Average (X̄^n)
        ↓
    Constraint Center (c_n)
        ↓
    Projection (X^n = P_{C^n}(X̄^n))
        ↓
    Store (X^n, X̄^n, distance)
    ↓
Trajectory Output
```

### Performance Characteristics

**Time Complexity**: `O(N · J_max)` where:
- `N = T/h` (number of time steps)
- `J_max ≈ -ln(tol)/(λh)` (kernel length)

**Space Complexity**: `O(N + J_max)`
- Storage for `N` trajectory points
- Storage for `J_max` kernel weights

**Typical Performance**:
- `T = 10`, `h = 0.01`, `λ = 1.0`
- `N = 1000`, `J_max ≈ 2764`
- ~3 million weight lookups
- Runs in <100ms on modern hardware

---

## Stability and Convergence

### Numerical Stability

The scheme is **unconditionally stable** for convex constraints due to:

1. **Contraction property**: Projection onto convex sets is non-expansive
2. **Convex combination**: Weighted average preserves boundedness
3. **Exact kernel integration**: No accumulation of truncation errors

### Convergence Analysis

As `h → 0`, the discrete scheme converges to the continuous solution with:

**Order of accuracy**: `O(h)` (first-order scheme)

**Convergence requirements**:
- Constraint sets `C(t)` must be uniformly convex
- Trajectory `c(t)` must be Lipschitz continuous
- Kernel truncation error must be negligible: `e^{-λ·J_max·h} ≪ 1`

### Error Sources

1. **Time discretization**: `O(h)` per step
2. **Kernel truncation**: `O(e^{-λ·J_max·h})`
3. **Projection error**: `O(tol_proj)` (Newton tolerance)
4. **Gradient approximation**: `O(ε²)` (finite difference)

**Recommended tolerances**:
- Projection: `tol_proj = 1e-8`
- Kernel truncation: `tol_kernel = 1e-12`
- Gradient epsilon: `ε = 1e-6`

### Practical Considerations

**When to reduce `h`**:
- Trajectory exhibits oscillations or instability
- Constraint moves very rapidly
- High-frequency trajectory components

**When to reduce `λ`**:
- More inertial behavior desired
- Smoother trajectories needed
- Study long-memory effects

**When projection fails**:
- Check constraint function is well-defined
- Verify gradient is non-zero near boundary
- Increase `maxIterations` or reduce `tolerance`
- Check for non-convex constraints (not supported)

---

## References

This implementation is based on the mathematical framework of delayed sweeping processes as studied in:

- Delayed differential inclusions with convex constraints
- Exponential kernel memory effects in dynamical systems
- Numerical methods for sweeping processes

For algorithm details, see:
- Newton's method for projection onto implicitly defined sets
- Finite difference gradient approximation
- Discrete kernel weight computation for exponential kernels
