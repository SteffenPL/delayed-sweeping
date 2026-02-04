# Statistics Documentation

This document describes all the statistical quantities computed by the simulator, their mathematical definitions, implementation details, and physical interpretation.

## Table of Contents

1. [Overview](#overview)
2. [Delayed Sweeping Statistics](#delayed-sweeping-statistics)
3. [Classical Sweeping Statistics](#classical-sweeping-statistics)
4. [Implementation Details](#implementation-details)
5. [Inconsistencies and Issues](#inconsistencies-and-issues)
6. [Physical Interpretation](#physical-interpretation)

---

## Overview

The simulator computes statistics for **two processes** running in parallel:

1. **Delayed Sweeping Process**: The main process with memory effects
   - Update rule: `X̄^n = h Σ r̃_j X^{n-j}`, then `X^n = P_{C^n}(X̄^n)`

2. **Classical Sweeping Process**: Standard sweeping without delay
   - Update rule: `X^n = P_{C^n}(X^{n-1})`

All statistics are computed from the discrete trajectories using finite difference approximations.

**Location**: Statistics computation is in `src/components/statistics/StatisticsPanel.tsx:23-150`

---

## Delayed Sweeping Statistics

### Time Array

**Definition**:
```
t_n = n · h    for n = 0, 1, 2, ..., N
```

**Implementation** (line 25):
```typescript
const time = Array.from({ length: n }, (_, i) => i * params.h);
```

**Units**: Simulation time units

---

### Position Coordinates

**Definition**:
- `positionX[n] = X^n.x`
- `positionY[n] = X^n.y`

**Implementation** (lines 27-28):
```typescript
const positionX = trajectory.map((p) => p.x);
const positionY = trajectory.map((p) => p.y);
```

**Units**: Spatial units (same as constraint size)

**Usage**: Track the trajectory path, visualize x vs t or y vs t

---

### Distance from Origin

**Definition**:
```
d_n = ||X^n|| = √(X^n.x² + X^n.y²)
```

**Implementation** (lines 29-31):
```typescript
const distanceFromOrigin = trajectory.map((p) =>
  Math.sqrt(p.x * p.x + p.y * p.y)
);
```

**Units**: Spatial units

**Physical meaning**: Radial distance from the origin

**Expected behavior**:
- For circular constraints centered at origin: oscillates around the constraint radius
- For moving constraints: tracks the constraint center motion

---

### Velocity (Magnitude)

**Definition** (first-order finite difference):
```
v_n = ||X^n - X^{n-1}|| / h    for n ≥ 1
v_0 = 0                         (initial condition)
```

**Implementation** (lines 34-39):
```typescript
const velocity: number[] = [0];
for (let i = 1; i < n; i++) {
  const dx = trajectory[i].x - trajectory[i - 1].x;
  const dy = trajectory[i].y - trajectory[i - 1].y;
  velocity.push(Math.sqrt(dx * dx + dy * dy) / params.h);
}
```

**Units**: Spatial units per time unit

**Physical meaning**: Instantaneous speed (magnitude of velocity vector)

**Accuracy**: O(h) approximation to `||dX/dt||`

**Note**: This computes the **magnitude** of velocity, not the vector components

---

### Projection Distance

**Definition**:
```
d_proj,n = ||X^n - X̄^n||
```

where `X̄^n` is the pre-projection (delayed) state.

**Implementation**: Computed directly in `DelayedSweepingSimulator.ts:92` and stored
```typescript
this.projDist[n] = vec2.distance(xNew, xBar);
```

**Units**: Spatial units

**Physical meaning**:
- Measures how much the constraint projection corrects the delayed state
- Zero when `X̄^n` is already feasible (inside the constraint)
- Positive when projection is needed
- Larger values indicate stronger constraint violation

**Expected behavior**:
- Small for slow-moving constraints
- Spikes when constraint moves rapidly or direction changes
- Zero when trajectory is inside constraint and moving freely

---

### Lagrange Multiplier Magnitude

**Definition**:
```
||λ_n G_n|| = ||X^n - X̄^n||
```

**Implementation** (lines 51-58):
```typescript
if (i < xBars.length) {
  const dx = traj[i].x - xBars[i].x;
  const dy = traj[i].y - xBars[i].y;
  lagrangeMultiplier.push(Math.sqrt(dx * dx + dy * dy));
} else {
  lagrangeMultiplier.push(0);
}
```

**Units**: Spatial units

**Physical meaning**:
- Represents the magnitude of the constraint force
- In the continuous formulation: `λ_n G_n` is the discrete approximation to the normal cone element
- `G_n` would be the constraint gradient (unit normal to the boundary)
- `λ_n` is the multiplier magnitude

**Relationship**: `||λ_n G_n|| = d_proj,n` (identical to projection distance)

**Note**: This is measuring the same quantity as projection distance from a different perspective (Lagrange multiplier vs geometric projection)

---

### Lagrange Dot Product

**Definition**:
```
⟨λ_n G_n - λ_{n-1} G_{n-1}, X^n - X^{n-1}⟩
```

where `λ_n G_n = X^n - X̄^n`

**Expanded form**:
```
⟨(X^n - X̄^n) - (X^{n-1} - X̄^{n-1}), X^n - X^{n-1}⟩
```

**Implementation** (lines 60-82):
```typescript
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
```

**Units**: Spatial units squared

**Physical meaning**:
- Measures the **work** done by the changing constraint force
- Related to discrete variational inequalities
- Negative values indicate **dissipation** (constraint force opposes motion)
- Positive values indicate constraint force assists motion
- Zero when constraint force is constant or perpendicular to motion

**Expected behavior**:
- Mostly negative (dissipative) for typical sweeping processes
- Can be positive during transitions
- Related to energy balance

---

### Gradient Norm

**Definition**:
```
||∇g(X^n)||
```

where `∇g` is the gradient of the constraint function `g(x,y)` evaluated at the projected point `X^n`.

**Implementation**: Computed during projection in `src/shapes/constraint.ts:77-82` using numerical finite differences:
```typescript
const grad = constraint.gradient(projected);
const gradientNorm = Math.sqrt(grad.x * grad.x + grad.y * grad.y);
```

**Units**: Dimensionless (gradient of dimensionless constraint function)

**Physical meaning**:
- Measures the **steepness** of the constraint boundary at the projected point
- For well-behaved constraints (like circles), this is approximately constant (≈ 1 for normalized constraints)
- For star-shaped or irregular constraints, this varies around the boundary
- Related to the curvature and local geometry of the constraint set

**Expected behavior**:
- Nearly constant for circular constraints (gradient has unit norm)
- Varies for non-circular shapes (star, polygon, etc.)
- Should never be zero on the constraint boundary
- Larger values indicate steeper boundaries

**Note**: This is used to compute the Lagrange multiplier value (next section)

---

### Lagrange Multiplier Value

**Definition**:
```
λ_n = ||X^n - X̄^n|| / ||∇g(X^n)||
```

where:
- `||X^n - X̄^n||` is the projection distance (Lagrange multiplier magnitude)
- `||∇g(X^n)||` is the gradient norm at the projected point

**Implementation** (in `StatisticsPanel.tsx`):
```typescript
const lagrangeMultiplierValue = delayedStats.lagrangeMultiplier.map((lm, i) => {
  const gn = gradientNorms[i] ?? 1;
  return gn > 1e-10 ? lm / gn : 0;
});
```

**Units**: Spatial units (same as projection distance)

**Physical meaning**:
- Represents the **magnitude** of the Lagrange multiplier in the KKT conditions
- In the projection formulation: `X^n = X̄^n - λ_n · ∇g(X^n)`
- Measures the constraint force normalized by the gradient steepness
- For circular constraints (where `||∇g|| ≈ 1`), this equals the projection distance
- For irregular constraints, this accounts for varying boundary steepness

**Expected behavior**:
- Similar to projection distance for circular constraints
- Different from projection distance for non-circular constraints
- Zero when no projection is needed (point already inside constraint)
- Larger values indicate stronger constraint forces

**Relationship**:
```
||λ_n G_n|| = ||X^n - X̄^n|| = λ_n · ||∇g(X^n)||
```

where `G_n = ∇g(X^n)` is the constraint gradient.

---

### Total Energy

**Definition**:
```
E_n = h Σ_{j=1}^{J_max} r̃_j ||X^n - X^{n-j}||²
```

where:
- `r̃_j` are the normalized kernel weights
- The sum is over all j such that `n - j ≥ 0`

**Implementation** (lines 84-91):
```typescript
let energy = 0;
for (let j = 1; j < rTilde.length && i - j >= 0; j++) {
  const dx = traj[i].x - traj[i - j].x;
  const dy = traj[i].y - traj[i - j].y;
  energy += params.h * rTilde[j] * (dx * dx + dy * dy);
}
totalEnergy.push(energy);
```

**Units**: Spatial units squared

**Physical meaning**:
- Quadratic form measuring the **dispersion** of the trajectory in the memory window
- Larger values indicate the trajectory has moved significantly from past positions
- Related to kinetic energy in the delayed formulation
- Weighted by kernel: recent differences weighted more heavily

**Expected behavior**:
- Low when trajectory is nearly stationary
- High during rapid motion or direction changes
- Periodic for periodic trajectories

**Mathematical note**: This is essentially a discrete **Dirichlet energy** weighted by the memory kernel

---

## Classical Sweeping Statistics

The classical sweeping process has NO memory/delay:
```
X^n = P_{C^n}(X^{n-1})
```

This means `X̄^n = X^{n-1}` (the pre-projection state is simply the previous position).

### Classical Position

Same as delayed sweeping:
- `classicalPositionX[n] = X^n.x`
- `classicalPositionY[n] = X^n.y`
- `classicalDistanceFromOrigin[n] = ||X^n||`

---

### Classical Velocity

**Definition**:
```
v_n = ||X^n - X^{n-1}|| / h
```

**Implementation** (lines 123-129):
```typescript
const classicalVelocity: number[] = [0];
for (let i = 1; i < classicalTrajectory.length; i++) {
  const dx = classicalTrajectory[i].x - classicalTrajectory[i - 1].x;
  const dy = classicalTrajectory[i].y - classicalTrajectory[i - 1].y;
  classicalVelocity.push(Math.sqrt(dx * dx + dy * dy) / params.h);
}
```

**Note**: Identical formula to delayed velocity, but computed on classical trajectory

---

### Classical Projection Distance

**Definition**:
```
d_proj,n = ||X^n - X^{n-1}||
```

**Implementation** (lines 116-121):
```typescript
const classicalProjectionDistance: number[] = [0];
for (let i = 1; i < classicalTrajectory.length; i++) {
  const dx = classicalTrajectory[i].x - classicalTrajectory[i - 1].x;
  const dy = classicalTrajectory[i].y - classicalTrajectory[i - 1].y;
  classicalProjectionDistance.push(Math.sqrt(dx * dx + dy * dy));
}
```

**Physical meaning**: Distance from previous position to projected position

**Note**: For classical sweeping, this equals the velocity times h:
```
d_proj,n = h · v_n
```

---

### Classical Lagrange Multiplier

**Definition**:
```
||λ_n G_n|| = ||X^n - X̄^n|| = ||X^n - X^{n-1}||
```

**Implementation** (lines 102-106, then used in line 146):
```typescript
const classicalXBars: Vec2[] = [{ x: 0, y: 0 }];
for (let i = 1; i < classicalTrajectory.length; i++) {
  classicalXBars.push(classicalTrajectory[i - 1]);
}
const classicalStats = computeTrajectoryStats(classicalTrajectory, classicalXBars);
```

**Important observation**: For classical sweeping:
```
classicalLagrangeMultiplier[n] = ||X^n - X^{n-1}|| = classicalProjectionDistance[n]
```

These are **mathematically identical** because `X̄^n = X^{n-1}` in classical sweeping.

---

### Classical Lagrange Dot Product

**Definition**: Same formula as delayed sweeping:
```
⟨λ_n G_n - λ_{n-1} G_{n-1}, X^n - X^{n-1}⟩
= ⟨(X^n - X^{n-1}) - (X^{n-1} - X^{n-2}), X^n - X^{n-1}⟩
```

**Physical meaning**: Work done by changing constraint force in classical sweeping

---

### Classical Gradient Norm

**Definition**:
```
||∇g(X^n)||
```

Same as delayed sweeping - computed at the classical trajectory's projected points.

**Implementation**: Identical to delayed sweeping, but evaluated at classical trajectory points.

**Physical meaning**: Same as delayed sweeping gradient norm.

---

### Classical Lagrange Multiplier Value

**Definition**:
```
λ_n = ||X^n - X^{n-1}|| / ||∇g(X^n)||
```

For classical sweeping, `X̄^n = X^{n-1}`, so this is the projection distance from the previous point normalized by the gradient.

**Implementation**: Same formula as delayed sweeping:
```typescript
const classicalLagrangeMultiplierValue = classicalStats.lagrangeMultiplier.map((lm, i) => {
  const gn = classicalGradientNorms[i] ?? 1;
  return gn > 1e-10 ? lm / gn : 0;
});
```

**Physical meaning**: Magnitude of the constraint force in the classical sweeping process, normalized by gradient steepness.

---

### Classical Total Energy

**Definition**:
```
E_n^classical = ||X^n - X^{n-1}||² / (2h²)
```

This represents the **kinetic energy** of the classical sweeping process.

**Implementation** (lines 48-54):
```typescript
// Classical energy: kinetic energy = ||X^n - X^{n-1}||^2 / (2 * h^2)
if (i > 0) {
  const dx = traj[i].x - traj[i - 1].x;
  const dy = traj[i].y - traj[i - 1].y;
  energy = (dx * dx + dy * dy) / (2 * params.h * params.h);
}
```

**Units**: Spatial units squared per time unit squared (velocity squared)

**Physical meaning**:
- Discrete approximation of `(1/2) ||v||²` where `v = dX/dt`
- Measures the instantaneous kinetic energy
- Zero when the system is stationary
- Larger values indicate faster motion

**Relationship to velocity**:
```
E_n^classical = (1/2) · velocity[n]²
```

**Expected behavior**:
- Proportional to squared velocity
- Peaks when system moves fastest
- Related to rate of change of projection distance

---

## Implementation Details

### Computation Flow

1. **Raw data** is collected during simulation:
   - `trajectory: Vec2[]` - delayed sweeping positions
   - `preProjection: Vec2[]` - delayed states `X̄^n`
   - `classicalTrajectory: Vec2[]` - classical sweeping positions
   - `projectionDistances: number[]` - pre-computed in simulator

2. **Statistics computation** (useMemo hook):
   - Triggered when trajectory data or parameters change
   - Computes derived quantities via finite differences
   - Returns `SimulationStatistics` object

3. **Chart rendering**:
   - Statistics converted to chart data format
   - Metrics selected by user are displayed
   - Time on x-axis, metric values on y-axis

### Helper Function

The `computeTrajectoryStats` function (lines 44-95) computes:
- Lagrange multiplier
- Lagrange dot product
- Total energy

for both delayed and classical trajectories using the same code.

**Parameters**:
- `traj: Vec2[]` - the trajectory positions
- `xBars: Vec2[]` - the pre-projection states

**For delayed sweeping**:
- `traj = trajectory`
- `xBars = preProjection`

**For classical sweeping**:
- `traj = classicalTrajectory`
- `xBars = [X^{-1}, X^0, X^1, ..., X^{n-1}]` (shifted trajectory)
- `isClassical = true` (uses kinetic energy formula)

---

## Inconsistencies and Issues

### Issue 1: Classical Lagrange Multiplier = Projection Distance

**Location**: Both `classicalLagrangeMultiplier` and `classicalProjectionDistance`

**Observation**: These are mathematically **identical** for classical sweeping:
```
classicalLagrangeMultiplier[n] = ||X^n - X̄^n|| = ||X^n - X^{n-1}||
classicalProjectionDistance[n] = ||X^n - X^{n-1}||
```

**Is this a problem?**: No, but it could be confusing.

**Explanation**:
- For delayed sweeping, these are different because `X̄^n ≠ X^{n-1}`
- For classical sweeping, `X̄^n = X^{n-1}` by definition
- So they measure the same quantity from different perspectives

**Recommendation**: Document this clearly in the UI or help text

---

### Issue 2: Velocity vs Projection Distance Relationship

**Observation**: For classical sweeping:
```
classicalProjectionDistance[n] = h · classicalVelocity[n]
```

This is a simple scaling relationship and could be confusing to users.

**Recommendation**: Consider showing only one of these for classical sweeping, or document the relationship.

---

## Physical Interpretation

### Comparison: Delayed vs Classical

| Metric | Delayed Sweeping | Classical Sweeping | Typical Relationship |
|--------|------------------|--------------------|--------------------|
| **Trajectory smoothness** | Smoother due to averaging | Can be jerky | Delayed has less high-frequency content |
| **Projection distance** | Generally smaller | Can be larger | Averaging reduces constraint violations |
| **Velocity** | More gradual changes | Sharper changes | Delayed acts as low-pass filter |
| **Lagrange multiplier** | Smaller on average | Can spike | Delayed distributes forces over time |
| **Energy** | Weighted memory spread | Kinetic energy | Different formulations, not directly comparable |

### Expected Patterns

**For periodic trajectories**:
- All metrics should show periodic behavior
- Period should match trajectory period
- Delayed process typically has smoother oscillations

**For rapidly moving constraints**:
- Projection distance increases
- Lagrange multiplier spikes
- Energy increases
- Delayed process "lags behind" constraint

**For slow constraints**:
- Small projection distances
- Low Lagrange multipliers
- Trajectories nearly coincide with constraint center
- Low energy

### Diagnostic Use

**High projection distance**:
- Time step `h` may be too large
- Constraint moving very rapidly
- Initial condition far from constraint

**Negative Lagrange dot product**:
- Normal dissipative behavior
- Constraint force opposes motion
- Energy being removed from system

**Growing energy**:
- Trajectory becoming more dispersed
- Acceleration phase
- May indicate numerical instability (if unbounded)

**Energy equilibrium**:
- Steady-state periodic motion
- Balance between injection and dissipation
- Typical for circular trajectories with circular constraints

---

## Data Export

All statistics can be exported to TSV (Tab-Separated Values) format via the Export button.

**File format**: `src/utils/export.ts:6-56`

**Columns** (in order):
1. time
2. projectionDistance
3. positionX
4. positionY
5. velocity
6. distanceFromOrigin
7. lagrangeMultiplier
8. lagrangeDotProduct
9. totalEnergy
10. gradientNorm
11. lagrangeMultiplierValue
12. classicalProjectionDistance
13. classicalPositionX
14. classicalPositionY
15. classicalVelocity
16. classicalDistanceFromOrigin
17. classicalLagrangeMultiplier
18. classicalLagrangeDotProduct
19. classicalTotalEnergy
20. classicalGradientNorm
21. classicalLagrangeMultiplierValue

**Precision**: All values formatted to 6 decimal places

**Usage**:
- Import into MATLAB, Python, R, or other analysis tools
- Create custom visualizations
- Perform statistical analysis
- Compare multiple simulation runs

---

## References

**Implementation files**:
- Statistics computation: `src/components/statistics/StatisticsPanel.tsx`
- Type definitions: `src/types/simulation.ts:83-101`
- Export utilities: `src/utils/export.ts`
- Metric definitions: `src/constants/defaults.ts:39-59`

**Related documentation**:
- [Numerics](./numerics.md) - Mathematical formulation and discretization
- [Index](./index.md) - Documentation overview
