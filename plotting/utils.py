"""
Utility functions for running simulations and loading data.
"""
import subprocess
import tempfile
from pathlib import Path
from typing import Optional

import pandas as pd

from config import Config, load_config
from solver import run_simulation as run_simulation_python
from solver import results_to_dataframe


def run_simulation(
    config_path: str,
    output_path: str,
    h: float = None,
    solver_type: Optional[str] = None,
    verbose: bool = False,
    backend: str = "python",
    use_alpha: bool = True
) -> pd.DataFrame:
    """
    Run simulation and return data as DataFrame.

    Args:
        config_path: Path to TOML config file
        output_path: Path for TSV output
        h: Optional override for time step
        solver_type: Optional override for solver type
        verbose: Print detailed output
        backend: "python" (default) or "cli"
        use_alpha: Apply alpha(t) rotation when using python backend

    Returns:
        DataFrame with simulation results
    """
    backend = backend.lower()
    if backend not in ("python", "cli"):
        raise ValueError(f"Unsupported backend: {backend}")

    if backend == "python":
        config = load_config(config_path)
        if h is not None:
            config.h = float(h)
        if solver_type is not None:
            config.solver_type = solver_type

        if verbose:
            print("Running python solver...")
            print(f"  T = {config.T}, h = {config.h}, epsilon = {config.epsilon}")
            print(f"  solver = {config.solver_type}, alpha = {'on' if use_alpha else 'off'}")

        results = run_simulation_python(config, use_alpha=use_alpha)
        df = results_to_dataframe(results, config.h)

        Path(output_path).parent.mkdir(exist_ok=True, parents=True)
        df.to_csv(output_path, sep='\t', index=False, float_format='%.12f')
        return df

    # CLI backend
    actual_config = config_path

    # If overrides specified, create modified config
    if h is not None or solver_type is not None:
        # Handle tomllib import locally for CLI path
        try:
            import tomllib
        except ImportError:
            import tomli as tomllib

        with open(config_path, 'rb') as f:
            config_data = tomllib.load(f)

        # Convert to plain Python float to avoid numpy types in TOML
        if h is not None:
            config_data['simulation']['h'] = float(h)
        if solver_type is not None:
            config_data['simulation']['solverType'] = solver_type

        # Write to temporary file
        temp_config = tempfile.NamedTemporaryFile(mode='w', suffix='.toml', delete=False)
        import toml
        toml.dump(config_data, temp_config)
        temp_config.close()
        actual_config = temp_config.name

    try:
        Path(output_path).parent.mkdir(exist_ok=True, parents=True)

        cmd = ['npm', 'run', 'simulate', '--', actual_config, '-o', output_path]
        if verbose:
            cmd.append('--verbose')

        result = subprocess.run(
            cmd,
            check=True,
            capture_output=True,
            text=True,
            cwd=Path(__file__).parent.parent  # Run from project root
        )

        if verbose:
            if result.stdout:
                print(result.stdout)
            if result.stderr:
                print("STDERR:", result.stderr)

        if not Path(output_path).exists():
            raise FileNotFoundError(f"Simulation did not create output file: {output_path}")

        file_size = Path(output_path).stat().st_size
        if file_size < 200:
            with open(output_path) as f:
                content = f.read()
            raise ValueError(
                f"Simulation produced empty output (file size: {file_size} bytes).\n"
                f"File content:\n{content}\n"
                f"Stderr: {result.stderr if result.stderr else 'none'}"
            )

        df = pd.read_csv(output_path, sep='\t')
        if len(df) == 0:
            raise ValueError(f"Simulation produced empty DataFrame despite file size {file_size}")

        return df

    finally:
        if h is not None:
            Path(actual_config).unlink(missing_ok=True)
