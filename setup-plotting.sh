#!/bin/bash
# Setup Python plotting environment using uv

set -e

echo "Setting up Python plotting environment..."

# Check if uv is installed
if ! command -v uv &> /dev/null; then
    echo "Error: uv is not installed. Install it first:"
    echo "  curl -LsSf https://astral.sh/uv/install.sh | sh"
    exit 1
fi

# Sync dependencies from pyproject.toml
echo "Syncing dependencies from pyproject.toml..."
uv sync

echo ""
echo "✓ Setup complete!"
echo ""
echo "To use the plotting tools:"
echo "  1. Run with uv:"
echo "     uv run plotting/plot.py config/example.toml"
echo ""
echo "  2. Or run convergence analysis:"
echo "     uv run plotting/plot.py config/example.toml --convergence"
echo ""
echo "  3. Or activate the venv manually:"
echo "     source .venv/bin/activate"
echo "     python plotting/plot.py config/example.toml"
