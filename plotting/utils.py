"""
Utility functions for running simulations and loading data.
"""
import subprocess
import tempfile
from pathlib import Path
from dataclasses import dataclass
import pandas as pd

# Handle tomllib import (tomllib in Python 3.11+, tomli for earlier versions)
try:
    import tomllib
except ImportError:
    import tomli as tomllib


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
    actual_config = config_path

    # If h override specified, create modified config
    if h is not None:
        with open(config_path, 'rb') as f:
            config_data = tomllib.load(f)

        # Convert to plain Python float to avoid numpy types in TOML
        config_data['simulation']['h'] = float(h)

        # Write to temporary file
        temp_config = tempfile.NamedTemporaryFile(mode='w', suffix='.toml', delete=False)
        import toml
        toml.dump(config_data, temp_config)
        temp_config.close()
        actual_config = temp_config.name

    try:
        # Create output directory if needed
        Path(output_path).parent.mkdir(exist_ok=True, parents=True)

        # Run simulation via npm
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

        # Check if output file exists and has content
        if not Path(output_path).exists():
            raise FileNotFoundError(f"Simulation did not create output file: {output_path}")

        # Check file size
        file_size = Path(output_path).stat().st_size
        if file_size < 200:  # Less than header size indicates empty or failed
            # Show file content for debugging
            with open(output_path) as f:
                content = f.read()
            raise ValueError(
                f"Simulation produced empty output (file size: {file_size} bytes).\n"
                f"File content:\n{content}\n"
                f"Stderr: {result.stderr if result.stderr else 'none'}"
            )

        # Load and return data
        df = pd.read_csv(output_path, sep='\t')

        if len(df) == 0:
            raise ValueError(f"Simulation produced empty DataFrame despite file size {file_size}")

        return df

    finally:
        # Clean up temp config if created
        if h is not None:
            Path(actual_config).unlink(missing_ok=True)
