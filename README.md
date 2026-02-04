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

### Web UI
- **Multiple constraint shapes**: Disk, ellipse, stadium, rectangle, diamond, and custom shapes via mathematical expressions
- **Expression-based trajectories**: Define constraint motion using `x(t)`, `y(t)`, and rotation `α(t)`
- **Trajectory modes**:
  - Parametric trajectories with expression-based motion
  - Free-drag mode (interactive constraint manipulation)
- **Real-time parameter control**: Adjust time step, kernel decay rate ε, and initial past conditions
- **Statistics & visualization**: Track and export metrics like projection distance, velocity, and gradient norms
- **Preset scenarios**: Quick-start templates for common configurations
- **Configuration management**: Save/Load configurations as TOML files

### Command Line Interface
- **Batch simulations**: Run simulations from TOML configuration files
- **Standalone execution**: No UI dependencies, perfect for parameter sweeps and convergence studies
- **Multiple output formats**: TSV (tab-separated) and JSON
- **Scriptable**: Integrate into analysis pipelines

See [CLI.md](CLI.md) for detailed CLI usage.

### Python Plotting Tools
- **Publication-ready plots**: Generate matplotlib figures from simulation data
- **Trajectory visualization**: 4-panel plots (x(t), y(t), phase portrait, metrics)
- **Convergence analysis**: Automated convergence studies with log-log error plots
- **Python-driven workflow**: Native Python solver (or CLI fallback), compute statistics, create plots

See [plotting/README.md](plotting/README.md) for plotting documentation.

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

# Start development server (Web UI)
npm run dev

# OR run a simulation via CLI
npm run simulate -- config/example.toml -o output/results.tsv -v
```

The web application will be available at `http://localhost:5173`

### Building for Production

```bash
npm run build
npm run preview
```

## Mathematical Model

The discrete time-stepping scheme implements a delayed convex sweeping process:

- **Kernel**: Exponential kernel `ρ(a) = εe^{-εa}` with memory effect
- **Constraint**: Time-varying convex set `C(t)` that can translate and rotate
- **Projection**: Closest point projection onto the constraint set via Newton's method
- **Initial past condition**: User-defined `x_p(t)`, `y_p(t)` for `t < 0`

### Key Parameters

**Simulation**:
- `T`: Final simulation time
- `h`: Time step (smaller = more accurate)
- `ε` (epsilon): Kernel decay rate (larger = shorter memory, memory time ≈ 1/ε)
- `x_p(t)`, `y_p(t)`: Initial past condition expressions

**Constraint**:
- `expression`: Signed distance function g(x,y) ≥ 0
- `R`, `r`, `a`, `b`: Parameters available in expressions

**Trajectory** (parametric mode):
- `x(t)`, `y(t)`: Constraint center motion
- `α(t)`: Constraint rotation angle

All expressions use [math.js](https://mathjs.org/) syntax.

## Project Structure

```
src/
├── simulation/          # Core simulation engine
│   ├── DelayedSweepingSimulator.ts  # Main delayed sweeping algorithm
│   ├── ClassicalSweepingSimulator.ts # Classical sweeping (no delay)
│   ├── SimulationFactory.ts          # Standalone simulation creation
│   ├── kernel.ts                     # Exponential kernel weights
│   └── vec2.ts                       # 2D vector utilities
├── cli/                 # Command-line interface
│   └── index.ts
├── shapes/              # Constraint shape definitions
├── components/          # React UI components
├── store/               # State management (Zustand)
├── utils/               # Helpers, presets, export, TOML
├── types/               # TypeScript type definitions
└── docs/                # Documentation (numerics, statistics)

config/                  # Example TOML configuration files
output/                  # CLI output directory (gitignored)
```

## Technologies

- **React** - UI framework
- **TypeScript** - Type safety
- **PixiJS** - High-performance 2D rendering
- **Zustand** - State management
- **Recharts** - Data visualization
- **math.js** - Expression parsing and evaluation
- **smol-toml** - TOML configuration format
- **tsx** - TypeScript execution for CLI
- **Vite** - Build tool

## Documentation

- [CLI.md](CLI.md) - Command-line interface usage
- [CLAUDE.md](CLAUDE.md) - Development documentation
- [src/docs/numerics.md](src/docs/numerics.md) - Mathematical formulation and numerical implementation
- [src/docs/statistics.md](src/docs/statistics.md) - Statistical quantities and metrics
- [src/docs/index.md](src/docs/index.md) - Documentation overview

## Quick Start Examples

### Web UI
1. Open http://localhost:5173 after `npm run dev`
2. Use preset buttons or adjust parameters in the sidebar
3. Click "Save Config" to export as TOML
4. Click "Load Config" to import a saved TOML file

### CLI
```bash
# Run example simulation
npm run simulate -- config/example.toml -v

# Run with custom output
npm run simulate -- config/figure8.toml -o results/figure8.tsv

# JSON output for further processing
npm run simulate -- config/rotating-ellipse.toml -f json -o data.json
```

### Python Plotting
```bash
# Setup (one-time)
uv sync

# Generate trajectory plots
uv run plotting/plot.py config/example.toml

# Run convergence analysis
uv run plotting/plot.py config/example.toml --convergence
```

## License

This project is part of ongoing mathematical research on delayed sweeping processes.

## Related Work

This simulator is based on the numerical implementation developed for a mathematical manuscript on delayed convex sweeping processes. For the theoretical background and proofs, see the associated research paper.
