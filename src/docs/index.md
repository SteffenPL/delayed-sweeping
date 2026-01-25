# Documentation Index

Welcome to the Delayed Sweeping Process Simulator documentation.

## Available Documentation

### Technical Documentation

- **[Numerics](./numerics.md)** - Mathematical formulation and numerical implementation
  - Mathematical background of the delayed sweeping process
  - Discrete time-stepping scheme
  - Kernel computation and memory effects
  - Projection methods for constraint enforcement
  - Numerical parameters and stability analysis
  - Implementation architecture and performance

- **[Statistics](./statistics.md)** - Statistical quantities and metrics
  - Detailed definitions of all computed statistics
  - Implementation details and formulas
  - Physical interpretation of metrics
  - Comparison between delayed and classical sweeping
  - Inconsistencies and known issues
  - Data export format

### Code Documentation

- **[Project README](../../README.md)** - Project overview and setup instructions
- **[CLAUDE.md](../../CLAUDE.md)** - Development guidelines and project structure
- **[Shapes README](../shapes/README.md)** - Constraint shape system documentation

## Quick Start

### Understanding the Simulation

The simulator implements a **delayed convex sweeping process**, which is a differential inclusion that models systems where:

1. A point `X(t)` must remain inside a time-varying convex set `C(t)`
2. The constraint forces depend on a **delayed state** `X_ρ(t)`, which is a weighted average of past positions
3. This delay creates inertial effects and smoother dynamics compared to classical sweeping processes

### Key Concepts

**Delayed State**:
```
X_ρ(t) = weighted average of X(s) for s ≤ t
```

**Exponential Kernel**:
```
ρ(a) = λ e^{-λa}
```
- Larger λ = shorter memory
- Smaller λ = longer memory (more inertia)

**Time-Stepping**:
```
X̄^n = h · Σ r̃_j · X^{n-j}    (weighted average)
X^n = P_{C^n}(X̄^n)            (projection)
```

### Mathematical Notation

| Symbol | Meaning |
|--------|---------|
| `X(t)` | Trajectory at time t |
| `C(t)` | Time-varying constraint set |
| `X_ρ(t)` | Delayed state (weighted average) |
| `ρ(a)` | Exponential kernel function |
| `λ` | Kernel decay rate |
| `h` | Time step size |
| `r̃_j` | Normalized discrete kernel weights |
| `P_C(·)` | Projection operator onto set C |
| `N_C(·)` | Normal cone to set C |

## Documentation Sections

### 1. Mathematical Background

The delayed sweeping process is defined by the differential inclusion:

```
-dX(t) ∈ N_{C(t)}(X_ρ(t))
```

This means the velocity `-dX/dt` must lie in the normal cone to `C(t)` at the delayed position `X_ρ(t)`.

**Learn more**: [Numerics - Mathematical Background](./numerics.md#mathematical-background)

### 2. Numerical Scheme

The discrete time-stepping scheme consists of:
1. Computing the delayed state via kernel-weighted average
2. Projecting onto the current constraint set

**Learn more**: [Numerics - Discrete Time-Stepping](./numerics.md#discrete-time-stepping-scheme)

### 3. Kernel Computation

The exponential kernel `ρ(a) = λe^{-λa}` is discretized with exact integration:

```
R_j = (1/h) · e^{-λjh} · (1 - e^{-λh})
```

and normalized to satisfy `Σ h·r̃_j = 1`.

**Learn more**: [Numerics - Kernel Computation](./numerics.md#kernel-computation)

### 4. Projection Methods

Projection uses Newton's method to find the closest point on the constraint boundary:

```typescript
p* = p - [g(p) / |∇g(p)|²] · ∇g(p)
```

**Learn more**: [Numerics - Projection Methods](./numerics.md#projection-methods)

### 5. Parameters and Tuning

Key parameters:
- **h**: Time step (smaller = more accurate)
- **λ**: Decay rate (larger = shorter memory)
- **R**: Constraint size
- **T**: Total simulation time

**Learn more**: [Numerics - Numerical Parameters](./numerics.md#numerical-parameters)

### 6. Implementation Details

The codebase is organized into:
- `src/simulation/` - Core simulation engine
- `src/shapes/` - Constraint definitions and projection
- `src/components/` - React UI components
- `src/store/` - Zustand state management

**Learn more**: [Numerics - Implementation Architecture](./numerics.md#implementation-architecture)

## File Organization

```
src/
├── docs/                        # Documentation
│   ├── index.md                 # This file
│   └── numerics.md              # Numerical implementation details
├── simulation/                  # Core simulation engine
│   ├── kernel.ts                # Exponential kernel weights
│   ├── DelayedSweepingSimulator.ts  # Main simulator class
│   ├── SimulationRunner.ts      # Animation loop controller
│   └── vec2.ts                  # 2D vector utilities
├── shapes/                      # Constraint shapes
│   ├── constraint.ts            # Constraint interface
│   ├── expressionConstraint.ts  # Math expression evaluator
│   ├── index.ts                 # Shape exports
│   └── README.md                # Shape system docs
├── types/                       # TypeScript definitions
│   ├── simulation.ts            # Core types
│   └── shapes.ts                # Shape types
└── ...
```

## Common Questions

### How does the delay affect the dynamics?

The delay creates **inertial effects**:
- Classical sweeping: Point immediately snaps to boundary when violated
- Delayed sweeping: Point responds more smoothly, with memory of past states

The parameter `λ` controls the memory length: `T_memory ≈ 1/λ`

### What constraints are supported?

Any constraint definable as `g(x, y) ≥ 0` where:
- `g(x, y) > 0`: inside (feasible)
- `g(x, y) = 0`: on boundary
- `g(x, y) < 0`: outside (infeasible)

Examples: disks, ellipses, rectangles, star shapes, polygons.

**Important**: Constraints must be **convex** for theoretical guarantees.

### How accurate is the simulation?

The scheme is first-order accurate: `O(h)` error per step.

Total error after time `T`:
- Time discretization: `O(h)`
- Kernel truncation: `O(e^{-λ·J_max·h})` ≈ `10^-12` (negligible)
- Projection: `O(10^-8)` (Newton tolerance)

For most purposes, `h = 0.01` provides excellent accuracy.

### How fast is it?

Typical performance (T=10, h=0.01, λ=1.0):
- 1000 time steps
- ~3 million kernel weight lookups
- **~100ms** on modern hardware
- Real-time capable for interactive use

### What if projection fails?

Possible causes:
1. **Non-convex constraint**: Use convex shapes only
2. **Degenerate gradient**: Check constraint function definition
3. **Poor initial guess**: Point too far from boundary

Solutions:
- Increase `maxIterations` (default 50)
- Check constraint expression is valid
- Reduce time step `h`

## Further Reading

### Implementation Files

- `src/simulation/kernel.ts` - Kernel weight computation
- `src/simulation/DelayedSweepingSimulator.ts` - Main simulation loop
- `src/shapes/expressionConstraint.ts` - Projection algorithm
- `src/types/simulation.ts` - Type definitions

### Related Concepts

- **Sweeping processes**: Differential inclusions with moving constraints
- **Normal cones**: Generalization of normal vectors to sets
- **Projected dynamical systems**: Continuous-time constrained systems
- **Delay differential equations**: Systems with memory effects

## Contributing

When modifying the numerical implementation:

1. **Maintain stability**: Ensure scheme remains unconditionally stable
2. **Preserve accuracy**: Keep first-order convergence (or better)
3. **Test thoroughly**: Verify against known solutions
4. **Document changes**: Update this documentation accordingly

See `CLAUDE.md` for development workflow and testing guidelines.

## License

This project is part of the WebSim Delayed Sweeping Process Simulator.
