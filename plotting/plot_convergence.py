#!/usr/bin/env python3
"""
Convergence analysis script.
Runs simulations at multiple h values and plots log-log error convergence.
"""
import sys
import argparse
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
    verbose: bool = False,
    index: Optional[int] = None
):
    """
    Run a single simulation with given h value.

    Returns:
        Tuple of (h, DataFrame)
    """
    if index is None:
        output_path = output_dir / f"conv_h_{h:.10e}.tsv"
    else:
        output_path = output_dir / f"conv_{index:03d}_h_{h:.10e}.tsv"
    df = run_simulation(config_file, str(output_path), h=h, solver_type=solver_type, verbose=verbose)

    if len(df) == 0:
        raise ValueError(f"Simulation with h={h:.6e} produced no data. Check if h is too large relative to T.")

    return h, df


def build_log2_h_values(h_min: float, h_max: float, num_points: int) -> list[float]:
    """
    Build h values with linearly spaced base-2 exponents between log2(h_min) and log2(h_max).
    This yields geometric spacing without restricting to powers of two.
    """
    if h_min <= 0 or h_max <= 0:
        raise ValueError("h_min and h_max must be positive.")
    if h_min > h_max:
        raise ValueError(f"h_min ({h_min}) must be <= h_max ({h_max}).")

    if num_points < 2:
        raise ValueError("num_points must be >= 2 for convergence analysis.")

    exp_min = np.log2(h_min)
    exp_max = np.log2(h_max)
    exps = np.linspace(exp_min, exp_max, num_points)
    return [float(2.0 ** e) for e in exps]


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
        num_points: Number of h values between h_min and h_max
        t_eval: Evaluation time for error computation
        solver_type: Solver type override (None = use config/default)
        verbose: Print detailed simulation output
        parallel: Run simulations in parallel
        max_workers: Maximum parallel workers (None = use CPU count)

    Returns:
        DataFrame with columns: h, error, reference_h, reference_error
    """
    # Generate h values with linearly spaced base-2 exponents
    h_values = build_log2_h_values(h_min, h_max, num_points)
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
    print("  h values use linearly spaced base-2 exponents between h_min and h_max.")
    if parallel:
        print(f"  Running in parallel with {max_workers or 'auto'} workers")

    # Create output directory
    output_dir = Path("output")
    output_dir.mkdir(exist_ok=True)

    # Run simulations
    results_dict = {}

    all_h_values = [reference_h] + [h for h in eval_h_values if h != reference_h]
    h_jobs = list(enumerate(all_h_values))

    if parallel:
        # Parallel execution with progress bar
        with ProcessPoolExecutor(max_workers=max_workers) as executor:
            # Submit all jobs
            futures = {
                executor.submit(
                    run_single_simulation, config_file, h, output_dir, solver_type, verbose, index
                ): h
                for index, h in h_jobs
            }

            # Collect results with progress bar
            with tqdm(total=len(all_h_values), desc="Simulations", unit="sim") as pbar:
                for future in as_completed(futures):
                    h, df = future.result()
                    results_dict[h] = df
                    pbar.update(1)
    else:
        # Sequential execution with progress bar
        for index, h in tqdm(h_jobs, desc="Simulations", unit="sim"):
            _, df = run_single_simulation(config_file, h, output_dir, solver_type, verbose, index)
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
    parser = argparse.ArgumentParser(
        description="Convergence analysis script. Runs simulations at multiple h values and plots log-log error convergence."
    )
    parser.add_argument("config", help="Path to TOML config")
    parser.add_argument("h_min", nargs="?", type=float, default=1e-4, help="Minimum h value (default: 1e-4)")
    parser.add_argument("h_max", nargs="?", type=float, default=1e-1, help="Maximum h value (default: 1e-1)")
    parser.add_argument("num_points", nargs="?", type=int, default=5, help="Number of h values (default: 5)")
    parser.add_argument("--verbose", "-v", action="store_true", help="Show detailed simulation output")
    parser.add_argument("--no-parallel", action="store_true", help="Run simulations sequentially (default: parallel)")
    parser.add_argument("--workers", type=int, default=None, help="Set number of parallel workers (default: auto)")
    parser.add_argument(
        "--solver-type", "--solver", dest="solver_type",
        choices=["norm1-sum1", "norm0-sum1", "trapezoidal"],
        help="Override solver type"
    )

    args = parser.parse_args()

    if args.num_points < 2:
        parser.error("num_points must be >= 2 for convergence analysis.")

    config_file = args.config
    h_min = args.h_min
    h_max = args.h_max
    num_points = args.num_points
    verbose = args.verbose
    parallel = not args.no_parallel
    max_workers = args.workers
    solver_type = args.solver_type

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
