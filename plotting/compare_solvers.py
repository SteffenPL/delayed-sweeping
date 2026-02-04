#!/usr/bin/env python3
"""
Compare Python vs TypeScript (CLI) solver outputs for the same config.
Exits with non-zero status if max absolute error exceeds tolerance.
"""
from __future__ import annotations

import argparse
from pathlib import Path

import numpy as np

from utils import run_simulation


DEFAULT_COLUMNS = [
    'delayed_x',
    'delayed_y',
    'delayed_xBar',
    'delayed_yBar',
    'delayed_projDist',
    'delayed_gradNorm',
    'classical_x',
    'classical_y',
    'classical_gradNorm',
]


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Compare Python vs TS solver outputs.")
    parser.add_argument("config", help="Path to TOML config")
    parser.add_argument("--h", type=float, default=None, help="Override time step size")
    parser.add_argument("--solver-type", default=None, help="Override solver type")
    parser.add_argument("--tol", type=float, default=1e-4, help="Max absolute error tolerance")
    parser.add_argument(
        "--columns",
        default=",".join(DEFAULT_COLUMNS),
        help="Comma-separated columns to compare"
    )
    parser.add_argument("--verbose", action="store_true", help="Verbose output")
    return parser.parse_args()


def compare_columns(df_py, df_ts, columns: list[str], tol: float) -> tuple[bool, dict[str, float]]:
    diffs: dict[str, float] = {}
    ok = True
    for col in columns:
        if col not in df_py.columns or col not in df_ts.columns:
            continue
        s_py = df_py[col].astype(float).to_numpy()
        s_ts = df_ts[col].astype(float).to_numpy()
        n = min(len(s_py), len(s_ts))
        if n == 0:
            continue
        diff = np.nanmax(np.abs(s_py[:n] - s_ts[:n]))
        diffs[col] = float(diff)
        if diff > tol:
            ok = False
    return ok, diffs


def main() -> int:
    args = parse_args()
    output_dir = Path("output")
    output_dir.mkdir(exist_ok=True)

    df_py = run_simulation(
        args.config,
        str(output_dir / "compare_python.tsv"),
        h=args.h,
        solver_type=args.solver_type,
        verbose=args.verbose,
        backend="python",
    )
    df_ts = run_simulation(
        args.config,
        str(output_dir / "compare_ts.tsv"),
        h=args.h,
        solver_type=args.solver_type,
        verbose=args.verbose,
        backend="cli",
    )

    columns = [c.strip() for c in args.columns.split(",") if c.strip()]
    ok, diffs = compare_columns(df_py, df_ts, columns, args.tol)

    print("Comparison results:")
    for col in columns:
        if col in diffs:
            print(f"  {col}: max |Δ| = {diffs[col]:.6e}")

    if not ok:
        print(f"\nFAILED: max error exceeds tolerance {args.tol}")
        return 1

    print(f"\nOK: all compared columns within tolerance {args.tol}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
