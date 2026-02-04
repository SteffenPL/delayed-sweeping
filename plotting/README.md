# Python Plotting

Simple Python scripts for creating publication-ready plots from simulation data.

## Philosophy

- **Simple scripts**: Each figure has its own script (e.g., `plot_fig1.py`)
- **No abstractions**: Direct plotting code, no complex CLI or classes
- **Easy to modify**: Copy a script and customize for your needs
- **Shared utilities**: Common functions in `utils.py`

## Quick Start

### 1. Setup (one-time)

```bash
# Sync dependencies from pyproject.toml
uv sync
```

### 2. Run Scripts

**Generic trajectory plot:**
```bash
uv run plotting/plot_trajectory.py config/example.toml
# Output: figures/trajectory.pdf (4-panel standard plot)
```

**Convergence analysis:**
```bash
uv run plotting/plot_convergence.py config/example.toml 1e-4 1e-1 8
# Arguments: config_file h_min h_max num_points
# Output: figures/convergence.pdf (log-log error plot)
```

**Custom figure (example):**
```bash
uv run plotting/plot_fig1.py
# Output: figures/fig1_circular.pdf
```

## Available Scripts

### `plot_trajectory.py`

Standard 4-panel trajectory visualization:
- x(t) vs t
- y(t) vs t
- Phase portrait (x vs y)
- Gradient norms
- Feasible set snapshots (t = 0, T/2, T) in the phase portrait

**Usage:**
```bash
uv run plotting/plot_trajectory.py <config.toml> [output_name]
```

### `plot_convergence.py`

Convergence study with log-log error plot:
- Runs multiple simulations with different h values (in parallel by default)
- Computes terminal error ||X(T) - X_ref(T)||
- Plots log-log convergence with fitted slope
- Shows reference lines for order 1 and 2
- Progress bars with tqdm

**Usage:**
```bash
uv run plotting/plot_convergence.py <config.toml> [h_min] [h_max] [num_points] [options]

# Examples:
uv run plotting/plot_convergence.py config/example.toml 1e-4 1e-1 8
uv run plotting/plot_convergence.py config/example.toml 1e-6 1e-3 10 --workers 4
uv run plotting/plot_convergence.py config/example.toml 5e-3 2e-2 6 --no-parallel
```

**Parameters:**
- `h_min`: Reference time step (default: 1e-4, supports scientific notation)
- `h_max`: Maximum time step (default: 1e-1, supports scientific notation)
- `num_points`: Number of dyadic h values starting at `h_min` (default: 5)

**Notes:**
- h values are chosen as dyadic multiples of `h_min` (i.e., `h_min * 2^k`) up to `h_max`.
- `h_min` is used as the reference solution; evaluation uses `h >= 4*h_min`.
- Errors are evaluated at `t_eval = T * 7/8` using linear interpolation in time.

**Options:**
- `--verbose, -v`: Show detailed simulation output
- `--no-parallel`: Run simulations sequentially (default: parallel)
- `--workers N`: Set number of parallel workers (default: auto)
- `--solver-type TYPE`: Override solver type (`norm1-sum1`, `norm0-sum1`, `trapezoidal`)
- `--solver TYPE`: Alias for `--solver-type`

### `plot_fig1.py`

Example custom figure script showing:
- How to create specialized plots
- Custom layout and styling
- Combining multiple metrics

**To create your own figure:**
1. Copy `plot_fig1.py` to `plot_figN.py`
2. Modify the config file, layout, and plots
3. Run directly: `uv run plotting/plot_figN.py`

## Utility Functions (`utils.py`)

Shared functions for all scripts:

- `load_config(path)`: Load TOML configuration
- `run_simulation(config_path, output_path, h=None, backend="python")`: Run Python solver (default) or CLI

## How It Works

1. **Python solver (default)**: Runs the delayed + classical schemes directly in Python
2. **Optional CLI fallback**: Use `backend="cli"` to call `npm run simulate`
3. **Loads results**: Parses TSV into pandas DataFrame
4. **Creates plots**: Uses matplotlib for publication-quality figures
5. **Saves outputs**: PDFs in `figures/`, data in `output/`

## Data Format

CLI outputs TSV with 10 columns:
- `time`: Simulation time (uses h from config)
- `delayed_x`, `delayed_y`: Delayed sweeping trajectory
- `delayed_xBar`, `delayed_yBar`: Pre-projection weighted average
- `delayed_projDist`: Projection distance
- `delayed_gradNorm`: Gradient norm
- `classical_x`, `classical_y`: Classical sweeping trajectory
- `classical_gradNorm`: Classical gradient norm

## Creating Custom Figures

Copy and modify an existing script:

```python
#!/usr/bin/env python3
from pathlib import Path
import matplotlib.pyplot as plt
from utils import load_config, run_simulation

# Your config and output name
CONFIG_FILE = "config/myconfig.toml"
OUTPUT_NAME = "my_figure"

def main():
    config = load_config(CONFIG_FILE)
    df = run_simulation(CONFIG_FILE, "output/mydata.tsv")

    # Create your custom plot
    fig, ax = plt.subplots(figsize=(8, 6))
    ax.plot(df['time'], df['delayed_x'], label='x(t)')
    ax.set_xlabel(r'$t$')
    ax.set_ylabel(r'$x$')
    ax.legend()

    # Save
    Path("figures").mkdir(exist_ok=True)
    fig.savefig(f"figures/{OUTPUT_NAME}.pdf", dpi=300)

if __name__ == '__main__':
    main()
```

## Examples

See `examples.sh` for batch processing examples.
