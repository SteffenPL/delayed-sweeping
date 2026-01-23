# Delayed Sweeping Process Simulator

Interactive web-based simulator for the delayed convex sweeping process. This application provides a visual and interactive way to explore the dynamics of delayed sweeping processes with various constraint shapes and trajectory modes.

## Live Demo

🚀 **[Try the simulator here](https://steffenpl.github.io/delayed-sweeping/)**

## About

This simulator implements the numerical time-stepping scheme for delayed convex sweeping processes as described in the mathematical framework:

1. **Kernel weights**: `r̃_j = R_j / μ₀h` where `R_j = (1/h)e^{-λjh}(1 - e^{-λh})`
2. **Weighted average**: `X̄ⁿ = h Σ_{j≥1} r̃_j X^{n-j}`
3. **Projection**: `Xⁿ = P_{Cⁿ}(X̄ⁿ)`

## Features

- **Multiple constraint shapes**: Ball, star, polygon, and custom shapes via mathematical expressions
- **Trajectory modes**:
  - Parametric trajectories (predefined motion paths)
  - Free-drag mode (interactive constraint manipulation)
- **Real-time parameter control**: Adjust time step, kernel decay rate, constraint size, and more
- **Statistics & visualization**: Track and export metrics like distance, speed, and constraint violations
- **Preset scenarios**: Quick-start templates for common configurations
- **Export capabilities**: Save simulation data for further analysis

## Running Locally

### Prerequisites

- Node.js (v20 or higher)
- npm

### Installation

```bash
# Clone the repository
git clone https://github.com/SteffenPL/delayed-sweeping.git
cd delayed-sweeping

# Install dependencies
npm install

# Start development server
npm run dev
```

The application will be available at `http://localhost:5173`

### Building for Production

```bash
npm run build
npm run preview
```

## Mathematical Model

The discrete time-stepping scheme implements a delayed convex sweeping process:

- **Kernel**: Exponential kernel `ρ(a) = λe^{-λa}` with memory effect
- **Constraint**: Time-varying convex set `C(t)` (ball, star, polygon, or custom)
- **Projection**: Closest point projection onto the constraint set

Key parameters:
- `T`: Final simulation time
- `h`: Time step (smaller = more accurate, slower)
- `lambda`: Kernel decay rate (larger = shorter memory)
- `R`: Constraint size (radius for ball)

## Project Structure

```
src/
├── simulation/          # Core simulation engine
│   ├── DelayedSweepingSimulator.ts
│   ├── kernel.ts
│   └── vec2.ts
├── shapes/              # Constraint shape definitions
├── components/          # React UI components
├── store/               # State management (Zustand)
└── utils/               # Helpers, presets, export
```

## Technologies

- **React** - UI framework
- **TypeScript** - Type safety
- **PixiJS** - High-performance 2D rendering
- **Zustand** - State management
- **Recharts** - Data visualization
- **Vite** - Build tool

## License

This project is part of ongoing mathematical research on delayed sweeping processes.

## Related Work

This simulator is based on the numerical implementation developed for a mathematical manuscript on delayed convex sweeping processes. For the theoretical background and proofs, see the associated research paper.
