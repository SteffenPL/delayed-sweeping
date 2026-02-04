#!/bin/bash
# Example plotting workflows

# Example 1: Basic trajectory plots
echo "Generating trajectory plots for example config..."
uv run plotting/plot.py config/example.toml

# Example 2: All config files
echo ""
echo "Generating plots for all configs..."
for config in config/*.toml; do
    name=$(basename "$config" .toml)
    echo "  Processing $name..."
    uv run plotting/plot.py "$config" --figure-dir "figures/$name"
done

# Example 3: Convergence study (small range for quick test)
echo ""
echo "Running quick convergence study..."
uv run plotting/plot.py config/example.toml --convergence --h-min -7 --h-max -4

echo ""
echo "✓ Done! Check the figures/ directory for outputs."
