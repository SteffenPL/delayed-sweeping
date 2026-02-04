Use 'bd' for task tracking

# WebSim - Delayed Sweeping Process Simulator

Interactive web-based simulator for the delayed convex sweeping process.

## Project Structure

```
root
├── src/
│   ├── main.tsx                 # React entry point
│   ├── App.tsx                  # Root component
│   ├── types/                   # TypeScript type definitions
│   │   ├── simulation.ts        # Vec2, SimulationParameters, etc.
│   │   └── shapes.ts            # SDF types, ProjectionResult
│   ├── simulation/              # Core simulation engine
│   │   ├── vec2.ts              # 2D vector utilities
│   │   ├── kernel.ts            # Exponential kernel weights
│   │   ├── DelayedSweepingSimulator.ts  # Main simulation class
│   │   └── SimulationRunner.ts  # Animation loop controller
│   ├── shapes/                  # Constraint shapes
│   │   ├── sdf.ts               # Signed distance functions
│   │   └── projection.ts        # SDF-based projection
│   ├── components/              # React components
│   │   ├── canvas/              # PixiJS rendering
│   │   ├── controls/            # Parameter inputs, playback
│   │   ├── statistics/          # Charts and export
│   │   ├── layout/              # App layout
│   │   └── ui/                  # Reusable UI components
│   ├── hooks/                   # Custom React hooks
│   ├── store/                   # Zustand state management
│   └── utils/                   # Helpers, presets, export
├── public/                      # Static assets
├── index.html                   # HTML entry
├── package.json                 # Dependencies
├── tsconfig.json                # TypeScript config
└── vite.config.ts               # Vite build config
```
## Documentation

```
src/docs/*    # contains .md files of numerics and statistics details
```

ALWAYS update the numerics and statistics documentation
after changes to numerical or statistics details.

## Development 

This project uses **bd** (beads) for issue tracking. 

## Running the App

```bash
# Install dependencies
npm install

# Development server
npm run dev

# Production build
npm run build

# Preview production build
npm run preview
```

## Mathematical Model

Discrete time-stepping scheme:

1. **Kernel weights**: `r̃_j = R_j / μ₀ₕ` where `R_j = (1/h)e^{-εjh}(1 - e^{-εh})`
2. **Weighted average**: `X̄ⁿ = h Σ_{j≥1} r̃_j X^{n-j}` (uses past condition for n-j < 0)
3. **Projection**: `Xⁿ = P_{Cⁿ}(X̄ⁿ)` where C^n can translate and rotate

Core implementation in:
- `src/simulation/kernel.ts` - weight computation
- `src/simulation/DelayedSweepingSimulator.ts` - simulation loop
- `src/utils/trajectoryFunctions.ts` - expression-based trajectories

## Key Parameters

### Simulation Parameters
- `T`: Final simulation time (or window size in infinite mode)
- `h`: Time step (smaller = more accurate, slower)
- `ε` (epsilon): Kernel decay rate (larger = shorter memory)
- `x_p(t)`, `y_p(t)`: Initial past condition expressions for t < 0
- `infiniteMode`: Run indefinitely vs fixed time T

### Constraint Configuration
- `expression`: SDF expression (e.g., `R - sqrt(x^2 + y^2)` for disk)
- `R`, `r`, `a`, `b`: Parameters available in expressions

### Trajectory Configuration (Parametric Mode)
- `x(t)`, `y(t)`: Expressions for constraint center motion
- `α(t)`: Expression for constraint rotation angle
- All use math.js syntax with variable `t`

## Shape System

Constraints use Signed Distance Functions (SDF) for flexible projection:
- Expression-based: user defines `g(x,y)` using math.js
- Projection via Newton's method with numerical gradients
- Coordinate transforms for translation and rotation

See:
- `src/shapes/expressionConstraint.ts` - main constraint system
- `src/shapes/sdf.ts` - legacy SDF utilities
- `src/shapes/projection.ts` - projection algorithms

## State Management

Zustand store in `src/store/index.ts` manages:
- **Simulation parameters**: T, h, ε, x_p(t), y_p(t), infiniteMode
- **Constraint configuration**: expression, R, r, a, b, angle
- **Trajectory settings**: mode (parametric/free-drag), expressions x(t), y(t), α(t)
- **Running state**: isRunning, trajectory data, statistics
- **UI preferences**: showStatistics, selectedMetrics, speed

Expression-based system:
- Trajectories use math.js to evaluate x(t), y(t), α(t)
- Past conditions use math.js to evaluate x_p(t), y_p(t)
- See `src/utils/trajectoryFunctions.ts` for implementation

## Testing Changes

1. Run `npm run dev` to start dev server
2. Open browser to localhost URL
3. Verify simulation renders and animates
4. Test parameter changes update simulation in real-time
5. Test touch/mouse interactions work
