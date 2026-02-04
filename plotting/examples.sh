#!/bin/bash
# Example plotting workflows

echo "Python Plotting Examples"
echo "========================"
echo ""

# Example 1: Basic trajectory plot
echo "1. Generating trajectory plot for example config..."
uv run plotting/plot_trajectory.py config/example.toml
echo ""

# Example 2: Convergence study (parallel)
echo "2. Running convergence study (6 points, h from 5e-3 to 2e-2, parallel)..."
uv run plotting/plot_convergence.py config/example.toml 5e-3 2e-2 6
echo ""

# Example 3: Custom figure
echo "3. Generating custom figure 1..."
uv run plotting/plot_fig1.py
echo ""

# Example 4: Batch process all configs
echo "4. Processing all config files..."
for config in config/*.toml; do
    name=$(basename "$config" .toml)
    echo "  - $name..."
    uv run plotting/plot_trajectory.py "$config" "trajectory_$name"
done
echo ""

echo "✓ Done! Check the figures/ directory for outputs."
echo ""
echo "Generated files:"
ls -lh figures/*.pdf 2>/dev/null | awk '{print "  " $9 " (" $5 ")"}'
