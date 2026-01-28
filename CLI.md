# CLI Usage

Command-line interface for running delayed sweeping process simulations.

## Quick Start

```bash
# Run simulation with example configuration
npm run simulate -- config/example.toml

# Specify output file and format
npm run simulate -- config/example.toml -o output/results.tsv -f tsv

# Verbose output
npm run simulate -- config/example.toml -v

# JSON output
npm run simulate -- config/figure8.toml -o output/figure8.json -f json
```

## Command Line Options

```
Usage:
  npm run simulate -- <config.toml> [options]

Options:
  -o, --output <file>    Output file (default: results.tsv)
  -f, --format <format>  Output format: tsv, json (default: tsv)
  -v, --verbose          Verbose output
  -h, --help             Show help
```

## Configuration File Format

Configuration files use TOML format with the following sections:

### [simulation]
- `T` - Final simulation time (seconds)
- `h` - Time step size
- `epsilon` - Kernel decay rate (larger = shorter memory)
- `infiniteMode` - Run indefinitely (true) or fixed time (false)
- `xPastExpression` - Initial condition x_p(t) for t < 0 (math expression)
- `yPastExpression` - Initial condition y_p(t) for t < 0 (math expression)

### [constraint]
- `expression` - Constraint SDF: g(x,y) >= 0 (math expression)
- `R`, `r`, `a`, `b` - Parameters available in expression

### [trajectory]
- `xExpression` - Constraint center x(t) (math expression)
- `yExpression` - Constraint center y(t) (math expression)
- `alphaExpression` - Constraint rotation α(t) (math expression)

### [metadata] (optional)
- `name` - Configuration name
- `description` - Description
- `author` - Author name

## Expression Syntax

Expressions use math.js syntax with variable `t` for time:

**Functions**: `sin`, `cos`, `tan`, `sqrt`, `abs`, `min`, `max`, `exp`, `log`, etc.

**Examples**:
```toml
xExpression = "2 * cos(t)"           # Circular motion
yExpression = "2 * sin(t)"
alphaExpression = "t/2"              # Constant rotation
xPastExpression = "2"                # Constant past
```

## Output Formats

### TSV (Tab-Separated Values)
Columns:
- `time` - Simulation time
- `delayed_x`, `delayed_y` - Delayed sweeping trajectory
- `delayed_xBar`, `delayed_yBar` - Pre-projection state
- `delayed_projDist` - Projection distance
- `delayed_gradNorm` - Constraint gradient norm
- `classical_x`, `classical_y` - Classical sweeping trajectory
- `classical_gradNorm` - Classical gradient norm

### JSON
Complete simulation results with all arrays:
```json
{
  "delayed": {
    "trajectory": [{"x": ..., "y": ...}, ...],
    "preProjection": [...],
    "centers": [...],
    "projectionDistances": [...],
    "gradientNorms": [...]
  },
  "classical": {
    "trajectory": [...],
    "gradientNorms": [...]
  }
}
```

## Examples

### Example 1: Circular Motion
```bash
npm run simulate -- config/example.toml -o output/circular.tsv -v
```

### Example 2: Rotating Ellipse
```bash
npm run simulate -- config/rotating-ellipse.toml -o output/rotating.json -f json
```

### Example 3: Figure-8 Path
```bash
npm run simulate -- config/figure8.toml -o output/figure8.tsv
```

## Creating Custom Configurations

1. Copy an example config:
```bash
cp config/example.toml config/my-sim.toml
```

2. Edit parameters:
```toml
[simulation]
T = 20.0
h = 0.01
epsilon = 3.0
# ... etc
```

3. Run:
```bash
npm run simulate -- config/my-sim.toml -o output/my-results.tsv -v
```

## Importing/Exporting from UI

The web UI now has Save/Load buttons that export/import TOML configurations:

1. **Save Config** - Download current simulation as TOML file
2. **Load Config** - Load TOML file into the UI
3. **Copy TOML** - Copy configuration to clipboard

These files are compatible with the CLI tool!

## Programmatic Usage

You can also use the SimulationFactory directly in your code:

```typescript
import { SimulationFactory } from './src/simulation/SimulationFactory';
import { tomlToConfig } from './src/utils/toml';
import * as fs from 'fs';

// Load config
const toml = fs.readFileSync('config/example.toml', 'utf-8');
const config = tomlToConfig(toml);

// Run simulation
const results = await SimulationFactory.runSimulation(config);

// Process results
console.log(`Computed ${results.delayed.trajectory.length} steps`);
```

## Future Enhancements

Planned features for convergence analysis:
- Parameter sweeps: `--sweep h 0.1,0.05,0.01`
- Convergence plots: automatic h→0 analysis
- Parallel execution for multiple configurations
- Error analysis between delayed and classical sweeping
