#!/usr/bin/env python3
"""
Convergence analysis script.
Runs simulations at multiple h values and plots log-log error convergence.
"""
import sys
from pathlib import Path
from concurrent.futures import ProcessPoolExecutor, as_completed
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
from tqdm import tqdm
from utils import load_config, run_simulation
from typing import Optional


def run_single_simulation(
    config_file: str,
    h: float,
    output_dir: Path,
    solver_type: Optional[str] = None,
    verbose: bool = False
):
    """
    Run a single simulation with given h value.

    Returns:
        Tuple of (h, DataFrame)
    """
    output_path = output_dir / f"conv_h_{h:.10e}.tsv"
    df = run_simulation(config_file, str(output_path), h=h, solver_type=solver_type, verbose=verbose)

    if len(df) == 0:
        raise ValueError(f"Simulation with h={h:.6e} produced no data. Check if h is too large relative to T.")

    return h, df


def build_dyadic_h_values(h_min: float, h_max: float, num_points: int) -> list[float]:
    """
    Build dyadic h values: h_min * 2^k, k >= 0.
    Stops when h exceeds h_max or num_points is reached.
    """
    if h_min <= 0 or h_max <= 0:
        raise ValueError("h_min and h_max must be positive.")
    if h_min > h_max:
        raise ValueError(f"h_min ({h_min}) must be <= h_max ({h_max}).")

    h_values: list[float] = [h_min]
    while len(h_values) < num_points:
        next_h = h_values[-1] * 2.0
        if next_h > h_max:
            break
        h_values.append(next_h)

    return h_values


def run_convergence_study(
    config_file: str,
    h_min: float,
    h_max: float,
    num_points: int,
    t_eval: float,
    solver_type: Optional[str],
    verbose: bool = False,
    parallel: bool = True,
    max_workers: int = None
):
    """
    Run convergence study with multiple h values.

    Args:
        config_file: Path to TOML config
        h_min: Minimum h value
        h_max: Maximum h value
        num_points: Number of dyadic h values starting from h_min
        t_eval: Evaluation time for error computation
        solver_type: Solver type override (None = use config/default)
        verbose: Print detailed simulation output
        parallel: Run simulations in parallel
        max_workers: Maximum parallel workers (None = use CPU count)

    Returns:
        DataFrame with columns: h, error, reference_h, reference_error
    """
    # Generate dyadic h values (powers of 2 multiples of h_min)
    h_values = build_dyadic_h_values(h_min, h_max, num_points)
    if len(h_values) < 1:
        raise ValueError(
            "Need at least one h value for convergence analysis. "
            "Increase h_max or num_points."
        )

    reference_h = h_values[0]
    eval_min = reference_h * 4.0
    eval_h_values = [h for h in h_values if h >= eval_min]
    if len(eval_h_values) < 1:
        raise ValueError(
            "Need at least one evaluation h >= 4*h_min. "
            "Increase h_max or num_points."
        )

    print(f"Running convergence study with {len(eval_h_values)} evaluation h values:")
    print(f"  reference h: {reference_h:.6e}")
    print(f"  h range: [{eval_h_values[0]:.6e}, {eval_h_values[-1]:.6e}]")
    print("  h values are dyadic multiples of the smallest h (powers of 2).")
    if parallel:
        print(f"  Running in parallel with {max_workers or 'auto'} workers")

    # Create output directory
    output_dir = Path("output")
    output_dir.mkdir(exist_ok=True)

    # Run simulations
    results_dict = {}

    all_h_values = [reference_h] + [h for h in eval_h_values if h != reference_h]

    if parallel:
        # Parallel execution with progress bar
        with ProcessPoolExecutor(max_workers=max_workers) as executor:
            # Submit all jobs
            futures = {
                executor.submit(run_single_simulation, config_file, h, output_dir, solver_type, verbose): h
                for h in all_h_values
            }

            # Collect results with progress bar
            with tqdm(total=len(all_h_values), desc="Simulations", unit="sim") as pbar:
                for future in as_completed(futures):
                    h, df = future.result()
                    results_dict[h] = df
                    pbar.update(1)
    else:
        # Sequential execution with progress bar
        for h in tqdm(all_h_values, desc="Simulations", unit="sim"):
            _, df = run_single_simulation(config_file, h, output_dir, solver_type, verbose)
            results_dict[h] = df

    # Compute errors relative to finest h (reference) at t_eval
    ref = results_dict[reference_h]
    x_ref, y_ref = sample_delayed_at_time(ref, t_eval)

    print(f"\nReference solution (h = {reference_h:.6e}):")
    print(f"  X(t_eval={t_eval:.6f}) = ({x_ref:.10f}, {y_ref:.10f})")

    errors = []
    for h in eval_h_values:
        df = results_dict[h]
        x_eval, y_eval = sample_delayed_at_time(df, t_eval)
        error = np.sqrt((x_eval - x_ref)**2 + (y_eval - y_ref)**2)
        errors.append({
            'h': h,
            'error': error,
            'reference_h': reference_h,
            'reference_x': x_ref,
            'reference_y': y_ref
        })

    return pd.DataFrame(errors)


def sample_delayed_at_time(df: pd.DataFrame, t_eval: float) -> tuple[float, float]:
    """
    Sample delayed trajectory at time t_eval using linear interpolation.
    Assumes df has columns: time, delayed_x, delayed_y.
    """
    times = df['time'].to_numpy()
    if t_eval < times[0] or t_eval > times[-1]:
        raise ValueError(
            f"t_eval={t_eval:.6f} outside data range "
            f"[{times[0]:.6f}, {times[-1]:.6f}]"
        )

    idx = np.searchsorted(times, t_eval)
    if idx == 0:
        return float(df['delayed_x'].iloc[0]), float(df['delayed_y'].iloc[0])
    if idx >= len(times):
        return float(df['delayed_x'].iloc[-1]), float(df['delayed_y'].iloc[-1])

    t1 = times[idx]
    t0 = times[idx - 1]
    if np.isclose(t1, t_eval):
        return float(df['delayed_x'].iloc[idx]), float(df['delayed_y'].iloc[idx])

    x0 = df['delayed_x'].iloc[idx - 1]
    y0 = df['delayed_y'].iloc[idx - 1]
    x1 = df['delayed_x'].iloc[idx]
    y1 = df['delayed_y'].iloc[idx]

    w = (t_eval - t0) / (t1 - t0)
    x = x0 + w * (x1 - x0)
    y = y0 + w * (y1 - y0)
    return float(x), float(y)


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
        print("Usage: python plotting/plot_convergence.py <config.toml> [h_min] [h_max] [num_points] [options]")
        print("\nDefaults: h_min=1e-4, h_max=1e-1, num_points=5")
        print("\nNotes:")
        print("  - h values are dyadic multiples of h_min (h_min * 2^k) up to h_max.")
        print("  - h_min is used as the reference; evaluation uses h >= 4*h_min.")
        print("  - errors are evaluated at t_eval = T * 7/8 using linear interpolation.")
        print("\nOptions:")
        print("  --verbose, -v       Show detailed simulation output")
        print("  --no-parallel       Run simulations sequentially (default: parallel)")
        print("  --workers N         Set number of parallel workers (default: auto)")
        print("  --solver-type TYPE  Override solver type (norm1-sum1, norm0-sum1, trapezoidal)")
        print("  --solver TYPE       Alias for --solver-type")
        print("\nExamples:")
        print("  python plotting/plot_convergence.py config/example.toml 1e-4 1e-1 8")
        print("  python plotting/plot_convergence.py config/example.toml 1e-6 1e-3 10 --workers 4")
        print("  python plotting/plot_convergence.py config/example.toml 0.001 0.01 5 --no-parallel")
        print("  python plotting/plot_convergence.py config/example.toml 1e-4 1e-1 8 --solver-type trapezoidal")
        sys.exit(1)

    # Parse arguments
    args = [a for a in sys.argv[1:] if not a.startswith('--') and not a.startswith('-')]
    verbose = '--verbose' in sys.argv or '-v' in sys.argv
    parallel = '--no-parallel' not in sys.argv
    solver_type = None

    # Parse max_workers
    max_workers = None
    if '--workers' in sys.argv:
        idx = sys.argv.index('--workers')
        if idx + 1 < len(sys.argv):
            max_workers = int(sys.argv[idx + 1])
            # Remove from args list if it was added
            args = [a for a in args if a != str(max_workers)]

    # Parse solver type
    solver_flags = ['--solver-type', '--solver']
    for flag in solver_flags:
        if flag in sys.argv:
            idx = sys.argv.index(flag)
            if idx + 1 < len(sys.argv):
                solver_type = sys.argv[idx + 1]
                args = [a for a in args if a != solver_type]
            break

    if solver_type is not None:
        valid_solvers = {'norm1-sum1', 'norm0-sum1', 'trapezoidal'}
        if solver_type not in valid_solvers:
            raise ValueError(
                f"Invalid solver type: {solver_type}. "
                f"Choose one of {sorted(valid_solvers)}."
            )

    config_file = args[0]
    h_min = float(args[1]) if len(args) > 1 else 1e-4
    h_max = float(args[2]) if len(args) > 2 else 1e-1
    num_points = int(args[3]) if len(args) > 3 else 5

    # Load config
    config = load_config(config_file)
    effective_solver = solver_type or config.solver_type
    print(f"Config: {config.name}")
    print(f"  T = {config.T}, ε = {config.epsilon}")
    print(f"  solverType = {effective_solver}\n")
    t_eval = config.T * (1.0 - 1.0 / 8.0)
    print(f"  t_eval = {t_eval} (T * 7/8)\n")

    # Run convergence study
    conv_df = run_convergence_study(
        config_file, h_min, h_max, num_points, t_eval, solver_type,
        verbose=verbose, parallel=parallel, max_workers=max_workers
    )

    # Create plot
    plot_convergence_loglog(conv_df, config.name)


if __name__ == '__main__':
    main()
