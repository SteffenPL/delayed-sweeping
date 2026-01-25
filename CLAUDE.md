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

Discrete time-stepping scheme (ported from Python):

1. **Kernel weights**: `r̃_j = R_j / μ₀ₕ` where `R_j = (1/h)e^{-λjh}(1 - e^{-λh})`
2. **Weighted average**: `X̄ⁿ = h Σ_{j≥1} r̃_j X^{n-j}`
3. **Projection**: `Xⁿ = P_{Cⁿ}(X̄ⁿ)`

Core implementation in:
- `src/simulation/kernel.ts` - weight computation
- `src/simulation/DelayedSweepingSimulator.ts` - simulation loop

## Key Parameters

- `T`: Final simulation time
- `h`: Time step (smaller = more accurate, slower)
- `lambda`: Kernel decay rate (larger = shorter memory)
- `R`: Constraint size (radius for ball)

## Shape System

Shapes use Signed Distance Functions (SDF) for flexible projection:
- Ball: Analytical projection (fast)
- Star/Polygon: Numerical gradient descent on SDF

See `src/shapes/sdf.ts` and `src/shapes/projection.ts`.

## State Management

Zustand store in `src/store/index.ts` manages:
- Simulation parameters
- Shape configuration
- Trajectory mode (parametric vs free-drag)
- Running state and trajectory data
- UI preferences

## Testing Changes

1. Run `npm run dev` to start dev server
2. Open browser to localhost URL
3. Verify simulation renders and animates
4. Test parameter changes update simulation in real-time
5. Test touch/mouse interactions work
