#!/usr/bin/env python3
"""
Simple trajectory plotting script.
Generates 4-panel figure: x(t), y(t), phase portrait, gradient norms.
"""
import sys
from pathlib import Path
import numpy as np
import matplotlib.pyplot as plt
from utils import load_config, run_simulation
from solver import feasible_set_polygons, estimate_max_radius


def main():
    if len(sys.argv) < 2:
        print("Usage: python plotting/plot_trajectory.py <config.toml> [output_name]")
        sys.exit(1)

    config_file = sys.argv[1]
    output_name = sys.argv[2] if len(sys.argv) > 2 else "trajectory"

    # Load config and run simulation
    config = load_config(config_file)
    print(f"Running simulation: {config.name}")
    print(f"  T = {config.T}, h = {config.h}, ε = {config.epsilon}")

    output_dir = Path("output")
    output_dir.mkdir(exist_ok=True)

    df = run_simulation(config_file, str(output_dir / "result.tsv"))
    print(f"  Generated {len(df)} time steps")

    # Create 4-panel figure
    fig = plt.figure(figsize=(12, 8))
    gs = fig.add_gridspec(2, 2, hspace=0.3, wspace=0.3)

    # Panel 1: x(t) vs t
    ax1 = fig.add_subplot(gs[0, 0])
    ax1.plot(df['time'], df['delayed_x'], label='Delayed', linewidth=1.5)
    ax1.plot(df['time'], df['classical_x'], '--', label='Classical', linewidth=1.5, alpha=0.8)
    ax1.set_xlabel(r'$t$', fontsize=12)
    ax1.set_ylabel(r'$x(t)$', fontsize=12)
    ax1.legend(fontsize=10)
    ax1.grid(True, alpha=0.3)
    ax1.set_title(f'{config.name}: x-coordinate', fontsize=11)

    # Panel 2: y(t) vs t
    ax2 = fig.add_subplot(gs[0, 1])
    ax2.plot(df['time'], df['delayed_y'], label='Delayed', linewidth=1.5)
    ax2.plot(df['time'], df['classical_y'], '--', label='Classical', linewidth=1.5, alpha=0.8)
    ax2.set_xlabel(r'$t$', fontsize=12)
    ax2.set_ylabel(r'$y(t)$', fontsize=12)
    ax2.legend(fontsize=10)
    ax2.grid(True, alpha=0.3)
    ax2.set_title(f'{config.name}: y-coordinate', fontsize=11)

    # Panel 3: Phase portrait (x vs y)
    ax3 = fig.add_subplot(gs[1, 0])
    ax3.plot(df['delayed_x'], df['delayed_y'], label='Delayed', linewidth=1.5)
    ax3.plot(df['classical_x'], df['classical_y'], '--', label='Classical', linewidth=1.5, alpha=0.8)
    ax3.plot(df['delayed_x'].iloc[0], df['delayed_y'].iloc[0], 'go', markersize=8, label='Start')
    ax3.plot(df['delayed_x'].iloc[-1], df['delayed_y'].iloc[-1], 'ro', markersize=8, label='End')

    # Feasible set snapshots (t = 0, T/2, T)
    times = [0.0, 0.5 * config.T, config.T]
    max_radius = estimate_max_radius(config)
    polygons = feasible_set_polygons(config, times, num_rays=192, max_radius=max_radius, use_alpha=True)
    colors = plt.cm.Blues(np.linspace(0.4, 0.85, len(times)))
    for idx, t in enumerate(times):
        poly = polygons[float(t)]
        closed = np.vstack([poly, poly[0]])
        label = 'Feasible set' if idx == 0 else None
        ax3.plot(closed[:, 0], closed[:, 1], color=colors[idx], linewidth=1.0, alpha=0.6, label=label)

    ax3.set_xlabel(r'$x$', fontsize=12)
    ax3.set_ylabel(r'$y$', fontsize=12)
    ax3.legend(fontsize=10)
    ax3.grid(True, alpha=0.3)
    ax3.axis('equal')
    ax3.set_title(f'{config.name}: Phase Portrait', fontsize=11)

    # Panel 4: Gradient norms
    ax4 = fig.add_subplot(gs[1, 1])
    ax4.plot(df['time'], df['delayed_gradNorm'], label='Delayed', linewidth=1.5)
    ax4.plot(df['time'], df['classical_gradNorm'], '--', label='Classical', linewidth=1.5, alpha=0.8)
    ax4.set_xlabel(r'$t$', fontsize=12)
    ax4.set_ylabel(r'$\|\nabla g(X(t))\|$', fontsize=12)
    ax4.legend(fontsize=10)
    ax4.grid(True, alpha=0.3)
    ax4.set_title(f'{config.name}: Gradient Norm', fontsize=11)

    # Save figure
    figures_dir = Path("figures")
    figures_dir.mkdir(exist_ok=True)
    output_path = figures_dir / f"{output_name}.pdf"
    fig.savefig(output_path, bbox_inches='tight', dpi=300)
    print(f"Saved figure to {output_path}")


if __name__ == '__main__':
    main()
