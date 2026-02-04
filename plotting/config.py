"""
Config loading for Python solver and plotting utilities.
"""
from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

# Handle tomllib import (tomllib in Python 3.11+, tomli for earlier versions)
try:
    import tomllib
except ImportError:  # pragma: no cover - fallback for <3.11
    import tomli as tomllib


@dataclass
class Config:
    """Configuration loaded from TOML file."""
    name: str
    T: float
    h: float
    epsilon: float
    infinite_mode: bool
    x_past: str
    y_past: str
    constraint_expr: str
    R: float
    r: float
    a: float
    b: float
    x_traj: str
    y_traj: str
    alpha_traj: str
    solver_type: str


def load_config(path: str) -> Config:
    """Load TOML config file."""
    with open(path, 'rb') as f:
        data = tomllib.load(f)

    simulation = data['simulation']
    constraint = data['constraint']
    trajectory = data['trajectory']

    return Config(
        name=data.get('metadata', {}).get('name', Path(path).stem),
        T=float(simulation['T']),
        h=float(simulation['h']),
        epsilon=float(simulation['epsilon']),
        infinite_mode=bool(simulation.get('infiniteMode', False)),
        x_past=str(simulation['xPastExpression']),
        y_past=str(simulation['yPastExpression']),
        constraint_expr=str(constraint['expression']),
        R=float(constraint.get('R', 0.0)),
        r=float(constraint.get('r', 0.0)),
        a=float(constraint.get('a', 0.0)),
        b=float(constraint.get('b', 0.0)),
        x_traj=str(trajectory['xExpression']),
        y_traj=str(trajectory['yExpression']),
        alpha_traj=str(trajectory.get('alphaExpression', '0')),
        solver_type=str(simulation.get('solverType', 'norm1-sum1')),
    )
