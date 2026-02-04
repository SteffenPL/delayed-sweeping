#!/usr/bin/env python3
"""
Example figure 1: Circular trajectory comparison.

This script creates a custom figure showing delayed vs classical sweeping
for a circular constraint trajectory.
"""
from pathlib import Path
import matplotlib.pyplot as plt
from utils import load_config, run_simulation


# Configuration
CONFIG_FILE = "config/example.toml"
OUTPUT_NAME = "fig1_circular"


def main():
    # Load config and run simulation
    config = load_config(CONFIG_FILE)
    print(f"Generating Figure 1: {config.name}")

    output_dir = Path("output")
    output_dir.mkdir(exist_ok=True)

    df = run_simulation(CONFIG_FILE, str(output_dir / "fig1_data.tsv"))
    print(f"  Simulation: {len(df)} steps, T={config.T}, h={config.h}")

    # Create custom figure layout
    fig, axes = plt.subplots(1, 2, figsize=(12, 5))

    # Left panel: Phase portrait
    ax1 = axes[0]
    ax1.plot(df['delayed_x'], df['delayed_y'], 'b-', linewidth=2, label='Delayed')
    ax1.plot(df['classical_x'], df['classical_y'], 'r--', linewidth=2, alpha=0.7, label='Classical')
    ax1.plot(df['delayed_x'].iloc[0], df['delayed_y'].iloc[0], 'go', markersize=10)
    ax1.plot(df['delayed_x'].iloc[-1], df['delayed_y'].iloc[-1], 'ro', markersize=10)
    ax1.set_xlabel(r'$x$', fontsize=14)
    ax1.set_ylabel(r'$y$', fontsize=14)
    ax1.set_title('Phase Portrait', fontsize=13)
    ax1.legend(fontsize=12)
    ax1.grid(True, alpha=0.3)
    ax1.axis('equal')

    # Right panel: Distance comparison
    ax2 = axes[1]
    ax2.plot(df['time'], df['delayed_projDist'], 'b-', linewidth=2, label='Delayed')
    # Classical has zero projection distance (always on constraint)
    ax2.axhline(0, color='r', linestyle='--', linewidth=2, alpha=0.7, label='Classical')
    ax2.set_xlabel(r'$t$', fontsize=14)
    ax2.set_ylabel(r'Projection Distance', fontsize=14)
    ax2.set_title('Distance to Constraint', fontsize=13)
    ax2.legend(fontsize=12)
    ax2.grid(True, alpha=0.3)

    plt.tight_layout()

    # Save
    figures_dir = Path("figures")
    figures_dir.mkdir(exist_ok=True)
    output_path = figures_dir / f"{OUTPUT_NAME}.pdf"
    fig.savefig(output_path, bbox_inches='tight', dpi=300)
    print(f"Saved: {output_path}")


if __name__ == '__main__':
    main()
