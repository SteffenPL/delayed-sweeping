#!/usr/bin/env python3
"""
Convergence analysis script.
Runs simulations at multiple h values and plots log-log error convergence.
"""
import sys
from pathlib import Path
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
from utils import load_config, run_simulation


def run_convergence_study(config_file: str, h_min: float, h_max: float, num_points: int, verbose: bool = False):
    """
    Run convergence study with multiple h values.

    Args:
        config_file: Path to TOML config
        h_min: Minimum h value
        h_max: Maximum h value
        num_points: Number of h values to test (logarithmically spaced)
        verbose: Print progress

    Returns:
        DataFrame with columns: h, error, reference_h, reference_error
    """
    # Generate h values (logarithmically spaced)
    h_values = np.logspace(np.log10(h_min), np.log10(h_max), num_points)
    h_values = sorted(h_values)  # Ensure ascending order

    print(f"Running convergence study with {num_points} h values:")
    print(f"  h range: [{h_values[0]:.6e}, {h_values[-1]:.6e}]")

    # Create output directory
    output_dir = Path("output")
    output_dir.mkdir(exist_ok=True)

    # Run simulations
    results = []
    for i, h in enumerate(h_values):
        if verbose:
            print(f"  [{i+1}/{num_points}] Running with h = {h:.6e}...")

        output_path = output_dir / f"conv_h_{h:.10e}.tsv"
        df = run_simulation(config_file, str(output_path), h=h, verbose=verbose)

        if len(df) == 0:
            raise ValueError(f"Simulation with h={h:.6e} produced no data. Check if h is too large relative to T.")

        results.append(df)

    # Compute terminal errors relative to finest h (reference)
    ref = results[0]  # Finest h is reference
    x_ref = ref['delayed_x'].iloc[-1]
    y_ref = ref['delayed_y'].iloc[-1]

    if verbose:
        print(f"\nReference solution (h = {h_values[0]:.6e}):")
        print(f"  X(T) = ({x_ref:.10f}, {y_ref:.10f})")

    errors = []
    for h, df in zip(h_values, results):
        x_T = df['delayed_x'].iloc[-1]
        y_T = df['delayed_y'].iloc[-1]
        error = np.sqrt((x_T - x_ref)**2 + (y_T - y_ref)**2)
        errors.append({
            'h': h,
            'error': error,
            'reference_h': h_values[0],
            'reference_x': x_ref,
            'reference_y': y_ref
        })

    return pd.DataFrame(errors)


def plot_convergence_loglog(conv_df: pd.DataFrame, config_name: str, output_name: str = "convergence"):
    """
    Create log-log convergence plot.

    Args:
        conv_df: DataFrame with h and error columns
        config_name: Name for plot title
        output_name: Output filename (without extension)
    """
    # Filter out reference point (error = 0)
    df = conv_df[conv_df['error'] > 1e-15].copy()

    if len(df) == 0:
        print("Warning: No error data available (all errors are zero)")
        return

    # Create figure
    fig, ax = plt.subplots(figsize=(8, 6))

    # Log-log plot
    ax.loglog(df['h'], df['error'], 'o-', markersize=8, linewidth=2, label='Error')

    # Fit slope in log-log space (skip reference if included)
    if len(df) >= 2:
        log_h = np.log(df['h'])
        log_error = np.log(df['error'])
        slope, intercept = np.polyfit(log_h, log_error, 1)

        # Plot fitted line
        h_fit = df['h']
        error_fit = np.exp(intercept) * h_fit**slope
        ax.loglog(h_fit, error_fit, '--', linewidth=2, alpha=0.7,
                  label=f'Fitted slope = {slope:.2f}')

        print(f"\nConvergence rate: {slope:.3f}")

        # Add reference slopes (first and second order)
        h_range = df['h'].max() / df['h'].min()
        if h_range > 2:
            # Position reference lines
            h_mid = np.sqrt(df['h'].min() * df['h'].max())
            error_mid = np.exp(intercept) * h_mid**slope

            # First order reference
            error_order1 = error_mid * (df['h'] / h_mid)**1.0
            ax.loglog(df['h'], error_order1, ':', color='gray', alpha=0.6,
                      linewidth=1.5, label='Order 1')

            # Second order reference
            error_order2 = error_mid * (df['h'] / h_mid)**2.0
            ax.loglog(df['h'], error_order2, ':', color='gray', alpha=0.6,
                      linewidth=1.5, label='Order 2')

    ax.set_xlabel(r'$h$', fontsize=14)
    ax.set_ylabel(r'$\|X(T) - X_{\mathrm{ref}}(T)\|$', fontsize=14)
    ax.legend(fontsize=11)
    ax.grid(True, alpha=0.3, which='both')
    ax.set_title(f'{config_name}: Convergence Analysis', fontsize=12)

    # Save figure
    figures_dir = Path("figures")
    figures_dir.mkdir(exist_ok=True)
    output_path = figures_dir / f"{output_name}.pdf"
    fig.savefig(output_path, bbox_inches='tight', dpi=300)
    print(f"Saved figure to {output_path}")

    # Also save data
    data_path = Path("output") / f"{output_name}_data.csv"
    conv_df.to_csv(data_path, index=False)
    print(f"Saved data to {data_path}")


def main():
    if len(sys.argv) < 2:
        print("Usage: python plotting/plot_convergence.py <config.toml> [h_min] [h_max] [num_points] [--verbose]")
        print("\nDefaults: h_min=1e-4, h_max=1e-1, num_points=5")
        print("\nExample:")
        print("  python plotting/plot_convergence.py config/example.toml 1e-4 1e-1 8")
        print("  python plotting/plot_convergence.py config/example.toml 1e-3 1e-2 5 --verbose")
        sys.exit(1)

    # Parse arguments
    args = [a for a in sys.argv[1:] if not a.startswith('--')]
    verbose = '--verbose' in sys.argv or '-v' in sys.argv

    config_file = args[0]
    h_min = float(args[1]) if len(args) > 1 else 1e-4
    h_max = float(args[2]) if len(args) > 2 else 1e-1
    num_points = int(args[3]) if len(args) > 3 else 5

    # Load config
    config = load_config(config_file)
    print(f"Config: {config.name}")
    print(f"  T = {config.T}, ε = {config.epsilon}\n")

    # Run convergence study
    conv_df = run_convergence_study(config_file, h_min, h_max, num_points, verbose=verbose)

    # Create plot
    plot_convergence_loglog(conv_df, config.name)


if __name__ == '__main__':
    main()
