#!/usr/bin/env python3
"""
Minimal plotting script for delayed sweeping simulations.
Calls CLI to generate data, then creates matplotlib plots.
"""
import subprocess
import sys
from pathlib import Path
from dataclasses import dataclass
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt

# Handle tomllib import (tomllib in Python 3.11+, tomli for earlier versions)
try:
    import tomllib
except ImportError:
    import tomli as tomllib


# ============== Config Loading ==============

@dataclass
class Config:
    """Configuration loaded from TOML file."""
    name: str
    T: float
    h: float
    epsilon: float
    x_past: str
    y_past: str
    constraint_expr: str
    x_traj: str
    y_traj: str
    alpha_traj: str


def load_config(path: str) -> Config:
    """Load TOML config file."""
    with open(path, 'rb') as f:
        data = tomllib.load(f)

    return Config(
        name=data.get('metadata', {}).get('name', Path(path).stem),
        T=data['simulation']['T'],
        h=data['simulation']['h'],
        epsilon=data['simulation']['epsilon'],
        x_past=data['simulation']['xPastExpression'],
        y_past=data['simulation']['yPastExpression'],
        constraint_expr=data['constraint']['expression'],
        x_traj=data['trajectory']['xExpression'],
        y_traj=data['trajectory']['yExpression'],
        alpha_traj=data['trajectory']['alphaExpression'],
    )


# ============== CLI Interface ==============

def run_simulation(config_path: str, output_path: str, h: float = None, verbose: bool = False) -> pd.DataFrame:
    """
    Run CLI simulation and return data as DataFrame.

    Args:
        config_path: Path to TOML config file
        output_path: Path for TSV output
        h: Optional override for time step (creates temp config)
        verbose: Print CLI output

    Returns:
        DataFrame with simulation results
    """
    import tempfile
    import shutil

    actual_config = config_path

    # If h override specified, create modified config
    if h is not None:
        with open(config_path, 'rb') as f:
            config_data = tomllib.load(f)

        config_data['simulation']['h'] = h

        # Write to temporary file
        temp_config = tempfile.NamedTemporaryFile(mode='w', suffix='.toml', delete=False)
        import toml
        toml.dump(config_data, temp_config)
        temp_config.close()
        actual_config = temp_config.name

    try:
        # Run simulation via npm
        cmd = ['npm', 'run', 'simulate', '--', actual_config, '-o', output_path]
        if verbose:
            cmd.append('--verbose')

        result = subprocess.run(
            cmd,
            check=True,
            capture_output=not verbose,
            text=True
        )

        if verbose and result.stdout:
            print(result.stdout)

        # Load and return data
        return pd.read_csv(output_path, sep='\t')

    finally:
        # Clean up temp config if created
        if h is not None:
            Path(actual_config).unlink(missing_ok=True)


# ============== Trajectory Plots ==============

def plot_trajectory_x(df: pd.DataFrame, config: Config, ax=None):
    """Plot t vs x for delayed and classical."""
    if ax is None:
        fig, ax = plt.subplots(figsize=(6, 4))

    ax.plot(df['time'], df['delayed_x'], label='Delayed', linewidth=1.5)
    ax.plot(df['time'], df['classical_x'], '--', label='Classical', linewidth=1.5, alpha=0.8)

    ax.set_xlabel(r'$t$', fontsize=12)
    ax.set_ylabel(r'$x(t)$', fontsize=12)
    ax.legend(fontsize=10)
    ax.grid(True, alpha=0.3)
    ax.set_title(f'{config.name}: x-coordinate', fontsize=11)

    return ax


def plot_trajectory_y(df: pd.DataFrame, config: Config, ax=None):
    """Plot t vs y for delayed and classical."""
    if ax is None:
        fig, ax = plt.subplots(figsize=(6, 4))

    ax.plot(df['time'], df['delayed_y'], label='Delayed', linewidth=1.5)
    ax.plot(df['time'], df['classical_y'], '--', label='Classical', linewidth=1.5, alpha=0.8)

    ax.set_xlabel(r'$t$', fontsize=12)
    ax.set_ylabel(r'$y(t)$', fontsize=12)
    ax.legend(fontsize=10)
    ax.grid(True, alpha=0.3)
    ax.set_title(f'{config.name}: y-coordinate', fontsize=11)

    return ax


def plot_trajectory_2d(df: pd.DataFrame, config: Config, ax=None):
    """Plot x-y phase portrait for delayed and classical."""
    if ax is None:
        fig, ax = plt.subplots(figsize=(6, 6))

    ax.plot(df['delayed_x'], df['delayed_y'], label='Delayed', linewidth=1.5)
    ax.plot(df['classical_x'], df['classical_y'], '--', label='Classical', linewidth=1.5, alpha=0.8)

    # Mark start and end points
    ax.plot(df['delayed_x'].iloc[0], df['delayed_y'].iloc[0], 'go', markersize=8, label='Start')
    ax.plot(df['delayed_x'].iloc[-1], df['delayed_y'].iloc[-1], 'ro', markersize=8, label='End')

    ax.set_xlabel(r'$x$', fontsize=12)
    ax.set_ylabel(r'$y$', fontsize=12)
    ax.legend(fontsize=10)
    ax.grid(True, alpha=0.3)
    ax.axis('equal')
    ax.set_title(f'{config.name}: Phase Portrait', fontsize=11)

    return ax


def plot_metrics(df: pd.DataFrame, config: Config, ax=None):
    """Plot gradient norms over time."""
    if ax is None:
        fig, ax = plt.subplots(figsize=(6, 4))

    ax.plot(df['time'], df['delayed_gradNorm'], label='Delayed', linewidth=1.5)
    ax.plot(df['time'], df['classical_gradNorm'], '--', label='Classical', linewidth=1.5, alpha=0.8)

    ax.set_xlabel(r'$t$', fontsize=12)
    ax.set_ylabel(r'$\|\nabla g(X(t))\|$', fontsize=12)
    ax.legend(fontsize=10)
    ax.grid(True, alpha=0.3)
    ax.set_title(f'{config.name}: Gradient Norm', fontsize=11)

    return ax


# ============== Convergence Analysis ==============

def run_convergence(
    config_path: str,
    h_values: list,
    output_dir: str = 'output',
    verbose: bool = False
) -> tuple[list[pd.DataFrame], list[float]]:
    """
    Run simulations at multiple h values for convergence study.

    Args:
        config_path: Path to TOML config
        h_values: List of time steps to test
        output_dir: Directory for output files
        verbose: Print progress

    Returns:
        Tuple of (list of DataFrames, list of h values)
    """
    Path(output_dir).mkdir(exist_ok=True, parents=True)

    results = []
    for i, h in enumerate(h_values):
        if verbose:
            print(f"Running simulation {i+1}/{len(h_values)} with h = {h:.6f}...")

        output_path = f"{output_dir}/h_{h:.10f}.tsv"
        df = run_simulation(config_path, output_path, h=h, verbose=False)
        results.append(df)

    return results, h_values


def compute_terminal_error(
    results: list[pd.DataFrame],
    h_values: list[float],
    reference_idx: int = 0
) -> pd.DataFrame:
    """
    Compute terminal position error vs reference solution.

    Args:
        results: List of DataFrames from convergence runs
        h_values: Corresponding h values
        reference_idx: Index of reference solution (finest h)

    Returns:
        DataFrame with columns: h, log2_h, error, log2_error
    """
    ref = results[reference_idx]
    x_ref = ref['delayed_x'].iloc[-1]
    y_ref = ref['delayed_y'].iloc[-1]

    errors = []
    for df, h in zip(results, h_values):
        x_T = df['delayed_x'].iloc[-1]
        y_T = df['delayed_y'].iloc[-1]
        error = np.sqrt((x_T - x_ref)**2 + (y_T - y_ref)**2)

        errors.append({
            'h': h,
            'log2_h': np.log2(h),
            'error': error,
            'log2_error': np.log2(error) if error > 1e-15 else -50
        })

    return pd.DataFrame(errors)


def plot_convergence(conv_df: pd.DataFrame, ax=None, fit_range=None):
    """
    Plot convergence: log2(error) vs log2(h).

    Args:
        conv_df: DataFrame from compute_terminal_error
        ax: Matplotlib axis (creates new if None)
        fit_range: Tuple (start_idx, end_idx) for fitting slope

    Returns:
        Matplotlib axis
    """
    if ax is None:
        fig, ax = plt.subplots(figsize=(6, 5))

    # Skip reference point (error ≈ 0)
    df = conv_df[conv_df['error'] > 1e-15].copy()

    if len(df) == 0:
        ax.text(0.5, 0.5, 'No error data available',
                ha='center', va='center', transform=ax.transAxes)
        return ax

    # Plot data points
    ax.plot(df['log2_h'], df['log2_error'], 'o-',
            markersize=6, linewidth=1.5, label=r'$\|X(T) - X_{\mathrm{ref}}(T)\|$')

    # Fit line for convergence rate
    if len(df) >= 2:
        if fit_range is not None:
            start, end = fit_range
            fit_data = df.iloc[start:end]
        else:
            fit_data = df

        if len(fit_data) >= 2:
            slope, intercept = np.polyfit(fit_data['log2_h'], fit_data['log2_error'], 1)

            # Plot fitted line
            x_fit = df['log2_h']
            y_fit = slope * x_fit + intercept
            ax.plot(x_fit, y_fit, '--', linewidth=1.5, alpha=0.7,
                    label=f'Slope = {slope:.2f}')

            # Add reference slopes
            x_range = df['log2_h'].max() - df['log2_h'].min()
            if x_range > 1:
                y_mid = df['log2_error'].mean()
                x_mid = df['log2_h'].mean()

                # First-order reference line
                ax.plot(df['log2_h'], y_mid + 1.0 * (df['log2_h'] - x_mid),
                        ':', color='gray', alpha=0.5, linewidth=1, label='Slope = 1')

                # Second-order reference line
                ax.plot(df['log2_h'], y_mid + 2.0 * (df['log2_h'] - x_mid),
                        ':', color='gray', alpha=0.5, linewidth=1, label='Slope = 2')

    ax.set_xlabel(r'$\log_2(h)$', fontsize=12)
    ax.set_ylabel(r'$\log_2(\mathrm{error})$', fontsize=12)
    ax.legend(fontsize=9)
    ax.grid(True, alpha=0.3)
    ax.set_title('Convergence Analysis', fontsize=11)

    return ax


# ============== Main ==============

def main():
    import argparse

    parser = argparse.ArgumentParser(
        description='Plot delayed sweeping simulation results',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Single simulation with trajectory plots
  python plotting/plot.py config/example.toml

  # Convergence analysis
  python plotting/plot.py config/example.toml --convergence

  # Custom h range for convergence
  python plotting/plot.py config/example.toml --convergence --h-min -12 --h-max -4
        """
    )

    parser.add_argument('config', help='TOML config file')
    parser.add_argument('--convergence', action='store_true',
                        help='Run convergence analysis')
    parser.add_argument('--h-min', type=int, default=-10,
                        help='Minimum log2(h) for convergence (default: -10)')
    parser.add_argument('--h-max', type=int, default=-3,
                        help='Maximum log2(h) for convergence (default: -3)')
    parser.add_argument('--output-dir', default='output',
                        help='Output directory for TSV files (default: output)')
    parser.add_argument('--figure-dir', default='figures',
                        help='Output directory for figures (default: figures)')
    parser.add_argument('-v', '--verbose', action='store_true',
                        help='Verbose output')

    args = parser.parse_args()

    # Load config
    try:
        config = load_config(args.config)
    except Exception as e:
        print(f"Error loading config: {e}", file=sys.stderr)
        return 1

    if args.verbose:
        print(f"Loaded config: {config.name}")
        print(f"  T = {config.T}, h = {config.h}, ε = {config.epsilon}")

    # Create figure directory
    Path(args.figure_dir).mkdir(exist_ok=True, parents=True)

    if args.convergence:
        # Convergence analysis
        h_values = [2.0**i for i in range(args.h_min, args.h_max + 1)]

        if args.verbose:
            print(f"\nRunning convergence analysis with {len(h_values)} h values:")
            print(f"  h range: [{h_values[0]:.6f}, {h_values[-1]:.6f}]")

        results, h_vals = run_convergence(
            args.config,
            h_values,
            output_dir=args.output_dir,
            verbose=args.verbose
        )

        conv_df = compute_terminal_error(results, h_vals)

        # Plot convergence
        fig, ax = plt.subplots(figsize=(8, 6))
        plot_convergence(conv_df, ax)

        output_path = Path(args.figure_dir) / 'convergence.pdf'
        fig.savefig(output_path, bbox_inches='tight', dpi=300)
        print(f"Saved convergence plot to {output_path}")

        # Also save convergence data
        conv_data_path = Path(args.output_dir) / 'convergence.csv'
        conv_df.to_csv(conv_data_path, index=False)
        if args.verbose:
            print(f"Saved convergence data to {conv_data_path}")

    else:
        # Single simulation with trajectory plots
        if args.verbose:
            print("\nRunning simulation...")

        output_path = Path(args.output_dir) / 'result.tsv'
        df = run_simulation(args.config, str(output_path), verbose=args.verbose)

        if args.verbose:
            print(f"  Generated {len(df)} time steps")

        # Create multi-panel figure
        fig = plt.figure(figsize=(12, 8))
        gs = fig.add_gridspec(2, 2, hspace=0.3, wspace=0.3)

        ax1 = fig.add_subplot(gs[0, 0])
        ax2 = fig.add_subplot(gs[0, 1])
        ax3 = fig.add_subplot(gs[1, 0])
        ax4 = fig.add_subplot(gs[1, 1])

        plot_trajectory_x(df, config, ax1)
        plot_trajectory_y(df, config, ax2)
        plot_trajectory_2d(df, config, ax3)
        plot_metrics(df, config, ax4)

        output_path = Path(args.figure_dir) / 'trajectory.pdf'
        fig.savefig(output_path, bbox_inches='tight', dpi=300)
        print(f"Saved trajectory plots to {output_path}")

    return 0


if __name__ == '__main__':
    sys.exit(main())
