# Python Plotting Setup

Minimal Python setup for creating publication-ready plots from simulation data.

## Quick Start

### 1. Setup Python Environment (using uv)

```bash
# Sync dependencies from pyproject.toml
uv sync

# Or use the setup script
./setup-plotting.sh
```

### 2. Run Simulations

**Single trajectory plot:**
```bash
uv run plotting/plot.py config/example.toml
# Output: figures/trajectory.pdf (4-panel: x(t), y(t), phase, gradient norms)
```

**Convergence analysis:**
```bash
uv run plotting/plot.py config/example.toml --convergence
# Output: figures/convergence.pdf (log-log error plot)
```

**Custom convergence range:**
```bash
uv run plotting/plot.py config/example.toml --convergence --h-min -12 --h-max -4
# Tests h from 2^-12 to 2^-4
```

Alternatively, activate the venv and use `python` directly:
```bash
source .venv/bin/activate
python plotting/plot.py config/example.toml
```

## Output

### Trajectory Plots
- **figures/trajectory.pdf**: 4-panel figure showing:
  - Top-left: x(t) vs t (delayed vs classical)
  - Top-right: y(t) vs t (delayed vs classical)
  - Bottom-left: Phase portrait (x vs y)
  - Bottom-right: Gradient norms over time

### Convergence Plots
- **figures/convergence.pdf**: Log-log plot of terminal error vs h
  - Shows convergence rate (fitted slope)
  - Reference lines for first/second order
- **output/convergence.csv**: Numerical data

## CLI Options

```
python plotting/plot.py [-h] [--convergence] [--h-min H_MIN] [--h-max H_MAX]
                        [--output-dir OUTPUT_DIR] [--figure-dir FIGURE_DIR] [-v]
                        config

positional arguments:
  config                TOML config file

options:
  --convergence         Run convergence analysis
  --h-min H_MIN         Minimum log2(h) for convergence (default: -10)
  --h-max H_MAX         Maximum log2(h) for convergence (default: -3)
  --output-dir DIR      Output directory for TSV files (default: output)
  --figure-dir DIR      Output directory for figures (default: figures)
  -v, --verbose         Verbose output
```

## How It Works

1. **Python calls CLI**: Uses `npm run simulate` to generate TSV data
2. **Loads results**: Parses TSV into pandas DataFrame
3. **Creates plots**: Uses matplotlib for publication-quality figures
4. **Convergence**: Runs multiple simulations with different h values

## Data Format

The CLI outputs TSV with 10 columns:
- `time`: Simulation time (now correctly uses h from config)
- `delayed_x`, `delayed_y`: Delayed sweeping trajectory
- `delayed_xBar`, `delayed_yBar`: Pre-projection weighted average
- `delayed_projDist`: Projection distance
- `delayed_gradNorm`: Gradient norm
- `classical_x`, `classical_y`: Classical sweeping trajectory
- `classical_gradNorm`: Classical gradient norm

## Statistics (Computed in Python)

Convergence analysis computes:
- **Terminal error**: ||X(T) - X_ref(T)|| where X_ref uses finest h
- **Convergence rate**: Slope of log2(error) vs log2(h)

This makes it easy to add more statistics without rebuilding the CLI.
