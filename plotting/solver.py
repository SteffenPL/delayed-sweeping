"""
Pure-Python solver for the delayed sweeping process.
Implements the same discrete scheme as the TS simulator, with optional
constraint rotation via alpha(t).
"""
from __future__ import annotations

import ast
import math
from dataclasses import dataclass
from typing import Callable, Iterable, Optional

import numpy as np
import pandas as pd

from config import Config


def _sign(x: float) -> float:
    if x > 0:
        return 1.0
    if x < 0:
        return -1.0
    return 0.0


_SAFE_NAMES = {
    # Constants
    'pi': math.pi,
    'e': math.e,
    # Basic math
    'abs': abs,
    'min': min,
    'max': max,
    'round': round,
    'floor': math.floor,
    'ceil': math.ceil,
    'sqrt': math.sqrt,
    'exp': math.exp,
    'log': math.log,
    'log10': math.log10,
    'pow': pow,
    'sign': _sign,
    # Trig
    'sin': math.sin,
    'cos': math.cos,
    'tan': math.tan,
    'asin': math.asin,
    'acos': math.acos,
    'atan': math.atan,
    'atan2': math.atan2,
    # Hyperbolic
    'sinh': math.sinh,
    'cosh': math.cosh,
    'tanh': math.tanh,
}


_ALLOWED_BINOPS = (ast.Add, ast.Sub, ast.Mult, ast.Div, ast.Pow, ast.Mod)
_ALLOWED_UNARYOPS = (ast.UAdd, ast.USub)


def _prepare_expression(expr: str) -> str:
    # math.js uses ^ for power; Python uses **
    return expr.replace('^', '**')


def _validate_ast(node: ast.AST, allowed_names: set[str]) -> None:
    if isinstance(node, ast.Expression):
        _validate_ast(node.body, allowed_names)
    elif isinstance(node, ast.Constant):
        return
    elif isinstance(node, ast.Name):
        if node.id not in allowed_names:
            raise ValueError(f"Unknown identifier '{node.id}' in expression")
    elif isinstance(node, ast.BinOp):
        if not isinstance(node.op, _ALLOWED_BINOPS):
            raise ValueError("Unsupported binary operator")
        _validate_ast(node.left, allowed_names)
        _validate_ast(node.right, allowed_names)
    elif isinstance(node, ast.UnaryOp):
        if not isinstance(node.op, _ALLOWED_UNARYOPS):
            raise ValueError("Unsupported unary operator")
        _validate_ast(node.operand, allowed_names)
    elif isinstance(node, ast.Call):
        if not isinstance(node.func, ast.Name):
            raise ValueError("Only direct function calls are allowed")
        if node.func.id not in allowed_names:
            raise ValueError(f"Unknown function '{node.func.id}' in expression")
        for arg in node.args:
            _validate_ast(arg, allowed_names)
        for kw in node.keywords:
            _validate_ast(kw.value, allowed_names)
    else:
        raise ValueError(f"Unsupported expression element: {type(node).__name__}")


def _compile_expression(expr: str, variables: Iterable[str]) -> Callable[[dict], float]:
    expr_py = _prepare_expression(expr)
    allowed_names = set(variables) | set(_SAFE_NAMES.keys())
    tree = ast.parse(expr_py, mode='eval')
    _validate_ast(tree, allowed_names)
    code = compile(tree, '<expression>', 'eval')

    def _eval(env: dict) -> float:
        return float(eval(code, {'__builtins__': {}}, env))

    return _eval


def _make_scalar_function(
    expr: str,
    variables: Iterable[str],
    constants: dict,
    default_value: float
) -> Callable:
    try:
        evaluator = _compile_expression(expr, variables)
    except Exception:
        def _fallback(*_args, **_kwargs):
            return default_value
        return _fallback

    def _fn(**kwargs):
        try:
            env = dict(_SAFE_NAMES)
            env.update(constants)
            env.update(kwargs)
            return evaluator(env)
        except Exception:
            return default_value

    return _fn


def create_trajectory_function(expr_x: str, expr_y: str) -> Callable[[float], tuple[float, float]]:
    fx = _make_scalar_function(expr_x, variables=('t',), constants={}, default_value=0.0)
    fy = _make_scalar_function(expr_y, variables=('t',), constants={}, default_value=0.0)

    def _fn(t: float) -> tuple[float, float]:
        return float(fx(t=t)), float(fy(t=t))

    return _fn


def create_alpha_function(expr: str) -> Callable[[float], float]:
    fa = _make_scalar_function(expr, variables=('t',), constants={}, default_value=0.0)

    def _fn(t: float) -> float:
        return float(fa(t=t))

    return _fn


def create_past_function(expr_x: str, expr_y: str) -> Callable[[float], tuple[float, float]]:
    fx = _make_scalar_function(expr_x, variables=('t',), constants={}, default_value=0.0)
    fy = _make_scalar_function(expr_y, variables=('t',), constants={}, default_value=0.0)

    def _fn(t: float) -> tuple[float, float]:
        return float(fx(t=t)), float(fy(t=t))

    return _fn


def create_constraint_evaluator(expr: str, params: dict) -> Callable[[float, float], float]:
    evaluator = _make_scalar_function(
        expr,
        variables=('x', 'y', 'R', 'r', 'a', 'b'),
        constants=params,
        default_value=-1.0
    )

    def _fn(x: float, y: float) -> float:
        return float(evaluator(x=x, y=y))

    return _fn


def numerical_gradient(
    evaluator: Callable[[float, float], float],
    x: float,
    y: float,
    epsilon: float = 1e-6
) -> tuple[float, float]:
    dfdx = (evaluator(x + epsilon, y) - evaluator(x - epsilon, y)) / (2 * epsilon)
    dfdy = (evaluator(x, y + epsilon) - evaluator(x, y - epsilon)) / (2 * epsilon)
    return float(dfdx), float(dfdy)


def project_to_constraint(
    evaluator: Callable[[float, float], float],
    point: tuple[float, float],
    max_iterations: int = 50,
    tolerance: float = 1e-8
) -> tuple[float, float]:
    g = evaluator(point[0], point[1])
    if g >= 0:
        return point

    px, py = point
    for _ in range(max_iterations):
        g_val = evaluator(px, py)
        if g_val >= -tolerance:
            break

        grad_x, grad_y = numerical_gradient(evaluator, px, py)
        grad_norm_sq = grad_x * grad_x + grad_y * grad_y
        if grad_norm_sq < 1e-12:
            break

        step = -g_val / grad_norm_sq
        px += step * grad_x
        py += step * grad_y

    return float(px), float(py)


def compute_discrete_weights(
    epsilon: float,
    h: float,
    solver_type: str = 'norm1-sum1',
    tol: float = 1e-12
) -> list[float]:
    if epsilon <= 0 or h <= 0:
        raise ValueError("epsilon and h must be positive")

    j_max = min(int(math.ceil(-math.log(tol) / (epsilon * h))), 100000)

    if solver_type == 'trapezoidal':
        return _compute_trapezoidal_weights(epsilon, h, j_max)

    if solver_type not in ('norm1-sum1', 'norm0-sum1'):
        raise ValueError(f"Unsupported solver type: {solver_type}")

    return _compute_exact_integration_weights(epsilon, h, j_max, solver_type)


def _compute_exact_integration_weights(
    epsilon: float,
    h: float,
    j_max: int,
    solver_type: str
) -> list[float]:
    factor = (1.0 / h) * (1.0 - math.exp(-epsilon * h))
    r_values = [factor * math.exp(-epsilon * j * h) for j in range(j_max)]

    if solver_type == 'norm1-sum1':
        mu_0h = h * sum(r_values[1:])
    else:
        mu_0h = h * sum(r_values)

    return [r / mu_0h for r in r_values]


def _compute_trapezoidal_weights(epsilon: float, h: float, j_max: int) -> list[float]:
    weights: list[float] = []
    weights.append((h / 2.0) * epsilon)

    for j in range(1, j_max - 1):
        weights.append(h * epsilon * math.exp(-epsilon * j * h))

    weights.append((h / 2.0) * epsilon * math.exp(-epsilon * (j_max - 1) * h))

    tail_den = math.exp(-epsilon * (j_max - 1) * h)
    mu_trap = sum(weights) + tail_den

    return [w / mu_trap for w in weights]


def _rotate_to_local(point: tuple[float, float], center: tuple[float, float], angle: float) -> tuple[float, float]:
    dx = point[0] - center[0]
    dy = point[1] - center[1]
    cos_a = math.cos(angle)
    sin_a = math.sin(angle)
    return (cos_a * dx + sin_a * dy, -sin_a * dx + cos_a * dy)


def _rotate_to_world(local_point: tuple[float, float], center: tuple[float, float], angle: float) -> tuple[float, float]:
    cos_a = math.cos(angle)
    sin_a = math.sin(angle)
    return (
        center[0] + cos_a * local_point[0] - sin_a * local_point[1],
        center[1] + sin_a * local_point[0] + cos_a * local_point[1],
    )


def _distance(a: tuple[float, float], b: tuple[float, float]) -> float:
    dx = a[0] - b[0]
    dy = a[1] - b[1]
    return math.sqrt(dx * dx + dy * dy)


def simulate_delayed(
    config: Config,
    use_alpha: bool = True,
    tol_kernel: float = 1e-12,
    grad_eps: float = 1e-6,
    proj_tol: float = 1e-8,
    max_iter: int = 50
) -> dict:
    n_steps = int(math.floor(config.T / config.h))
    weights = compute_discrete_weights(config.epsilon, config.h, config.solver_type, tol_kernel)

    center_func = create_trajectory_function(config.x_traj, config.y_traj)
    past_func = create_past_function(config.x_past, config.y_past)
    alpha_func = create_alpha_function(config.alpha_traj)

    evaluator = create_constraint_evaluator(
        config.constraint_expr,
        {'R': config.R, 'r': config.r, 'a': config.a, 'b': config.b}
    )

    trajectory: list[tuple[float, float]] = [(0.0, 0.0)] * (n_steps + 1)
    pre_projection: list[tuple[float, float]] = [(0.0, 0.0)] * (n_steps + 1)
    centers: list[tuple[float, float]] = [(0.0, 0.0)] * (n_steps + 1)
    proj_dist: list[float] = [0.0] * (n_steps + 1)
    grad_norms: list[float] = [0.0] * (n_steps + 1)

    if config.solver_type == 'trapezoidal':
        for n in range(n_steps + 1):
            t_n = n * config.h
            center = center_func(t_n)
            angle = alpha_func(t_n) if use_alpha else 0.0
            centers[n] = center

            x_bar = (0.0, 0.0)
            for j, weight in enumerate(weights):
                if j == 0:
                    if n - 1 >= 0:
                        x_past = trajectory[n - 1]
                    else:
                        x_past = past_func((n - 1) * config.h)
                else:
                    if n - j >= 0:
                        x_past = trajectory[n - j]
                    else:
                        x_past = past_func((n - j) * config.h)
                x_bar = (
                    x_bar[0] + weight * x_past[0],
                    x_bar[1] + weight * x_past[1],
                )

            pre_projection[n] = x_bar

            local = _rotate_to_local(x_bar, center, angle)
            projected_local = project_to_constraint(evaluator, local, max_iterations=max_iter, tolerance=proj_tol)
            projected_world = _rotate_to_world(projected_local, center, angle)

            trajectory[n] = projected_world
            proj_dist[n] = _distance(projected_world, x_bar)

            grad_x, grad_y = numerical_gradient(evaluator, projected_local[0], projected_local[1], grad_eps)
            grad_norms[n] = math.sqrt(grad_x * grad_x + grad_y * grad_y)
    else:
        # Use geometric recurrence to avoid O(N*J) inner loops for exact schemes.
        # r_tilde[j] = base * q^j, with q = exp(-epsilon * h)
        q = math.exp(-config.epsilon * config.h)
        if len(weights) > 1:
            base = weights[1] / q
        else:
            base = 0.0
        scale = config.h * base
        j_max = len(weights)
        q_pow_L = math.exp(-config.epsilon * config.h * j_max)

        # Initialize S0 = sum_{j=1}^{J-1} q^j X[-j]
        s_x = 0.0
        s_y = 0.0
        q_power = q
        for j in range(1, j_max):
            x_past = past_func(-j * config.h)
            s_x += q_power * x_past[0]
            s_y += q_power * x_past[1]
            q_power *= q

        for n in range(n_steps + 1):
            t_n = n * config.h
            center = center_func(t_n)
            angle = alpha_func(t_n) if use_alpha else 0.0
            centers[n] = center

            x_bar = (scale * s_x, scale * s_y)
            pre_projection[n] = x_bar

            local = _rotate_to_local(x_bar, center, angle)
            projected_local = project_to_constraint(evaluator, local, max_iterations=max_iter, tolerance=proj_tol)
            projected_world = _rotate_to_world(projected_local, center, angle)

            trajectory[n] = projected_world
            proj_dist[n] = _distance(projected_world, x_bar)

            grad_x, grad_y = numerical_gradient(evaluator, projected_local[0], projected_local[1], grad_eps)
            grad_norms[n] = math.sqrt(grad_x * grad_x + grad_y * grad_y)

            # Update S for next step (skip after last iteration)
            if n < n_steps:
                old_index = n - (j_max - 1)
                if old_index >= 0:
                    old_value = trajectory[old_index]
                else:
                    old_value = past_func(old_index * config.h)
                s_x = q * projected_world[0] + q * s_x - q_pow_L * old_value[0]
                s_y = q * projected_world[1] + q * s_y - q_pow_L * old_value[1]

    return {
        'trajectory': trajectory,
        'pre_projection': pre_projection,
        'centers': centers,
        'projection_distances': proj_dist,
        'gradient_norms': grad_norms,
    }


def simulate_classical(
    config: Config,
    use_alpha: bool = True,
    grad_eps: float = 1e-6,
    proj_tol: float = 1e-8,
    max_iter: int = 50
) -> dict:
    n_steps = int(math.floor(config.T / config.h))

    center_func = create_trajectory_function(config.x_traj, config.y_traj)
    past_func = create_past_function(config.x_past, config.y_past)
    alpha_func = create_alpha_function(config.alpha_traj)

    evaluator = create_constraint_evaluator(
        config.constraint_expr,
        {'R': config.R, 'r': config.r, 'a': config.a, 'b': config.b}
    )

    trajectory: list[tuple[float, float]] = [(0.0, 0.0)] * (n_steps + 1)
    centers: list[tuple[float, float]] = [(0.0, 0.0)] * (n_steps + 1)
    grad_norms: list[float] = [0.0] * (n_steps + 1)

    for n in range(n_steps + 1):
        t_n = n * config.h
        center = center_func(t_n)
        angle = alpha_func(t_n) if use_alpha else 0.0
        centers[n] = center

        if n == 0:
            x_prev = past_func(0.0)
        else:
            x_prev = trajectory[n - 1]

        local = _rotate_to_local(x_prev, center, angle)
        projected_local = project_to_constraint(evaluator, local, max_iterations=max_iter, tolerance=proj_tol)
        projected_world = _rotate_to_world(projected_local, center, angle)

        trajectory[n] = projected_world
        grad_x, grad_y = numerical_gradient(evaluator, projected_local[0], projected_local[1], grad_eps)
        grad_norms[n] = math.sqrt(grad_x * grad_x + grad_y * grad_y)

    return {
        'trajectory': trajectory,
        'centers': centers,
        'gradient_norms': grad_norms,
    }


def run_simulation(config: Config, use_alpha: bool = True) -> dict:
    delayed = simulate_delayed(config, use_alpha=use_alpha)
    classical = simulate_classical(config, use_alpha=use_alpha)

    return {
        'delayed': delayed,
        'classical': classical,
    }


def results_to_dataframe(results: dict, h: float) -> pd.DataFrame:
    delayed = results['delayed']
    classical = results['classical']
    n = len(delayed['trajectory'])

    times = np.arange(n, dtype=float) * h

    delayed_x = np.array([p[0] for p in delayed['trajectory']])
    delayed_y = np.array([p[1] for p in delayed['trajectory']])
    delayed_xbar = np.array([p[0] for p in delayed['pre_projection']])
    delayed_ybar = np.array([p[1] for p in delayed['pre_projection']])

    classical_x = np.array([p[0] for p in classical['trajectory']])
    classical_y = np.array([p[1] for p in classical['trajectory']])

    data = {
        'time': times,
        'delayed_x': delayed_x,
        'delayed_y': delayed_y,
        'delayed_xBar': delayed_xbar,
        'delayed_yBar': delayed_ybar,
        'delayed_projDist': np.array(delayed['projection_distances']),
        'delayed_gradNorm': np.array(delayed['gradient_norms']),
        'classical_x': classical_x,
        'classical_y': classical_y,
        'classical_gradNorm': np.array(classical['gradient_norms']),
    }

    return pd.DataFrame(data)


def compute_boundary_polygon(
    evaluator: Callable[[float, float], float],
    num_rays: int = 128,
    max_radius: float = 10.0
) -> np.ndarray:
    points: list[tuple[float, float]] = []

    for i in range(num_rays):
        theta = (2.0 * math.pi * i) / num_rays
        dir_x = math.cos(theta)
        dir_y = math.sin(theta)

        lo = 0.0
        hi = max_radius

        for _ in range(50):
            mid = (lo + hi) / 2.0
            g_val = evaluator(mid * dir_x, mid * dir_y)
            if g_val >= 0:
                lo = mid
            else:
                hi = mid

        radius = (lo + hi) / 2.0
        points.append((radius * dir_x, radius * dir_y))

    return np.array(points, dtype=float)


def estimate_max_radius(config: Config, scale: float = 2.5) -> float:
    base = max(1.0, abs(config.R), abs(config.r), abs(config.a), abs(config.b))
    return base * scale


def feasible_set_polygon(
    config: Config,
    t: float,
    num_rays: int = 128,
    max_radius: Optional[float] = None,
    use_alpha: bool = True
) -> np.ndarray:
    center_func = create_trajectory_function(config.x_traj, config.y_traj)
    alpha_func = create_alpha_function(config.alpha_traj)

    evaluator = create_constraint_evaluator(
        config.constraint_expr,
        {'R': config.R, 'r': config.r, 'a': config.a, 'b': config.b}
    )

    if max_radius is None:
        max_radius = estimate_max_radius(config)

    polygon_local = compute_boundary_polygon(evaluator, num_rays=num_rays, max_radius=max_radius)
    center = center_func(t)
    angle = alpha_func(t) if use_alpha else 0.0

    cos_a = math.cos(angle)
    sin_a = math.sin(angle)

    rotated = np.empty_like(polygon_local)
    rotated[:, 0] = center[0] + cos_a * polygon_local[:, 0] - sin_a * polygon_local[:, 1]
    rotated[:, 1] = center[1] + sin_a * polygon_local[:, 0] + cos_a * polygon_local[:, 1]

    return rotated


def feasible_set_polygons(
    config: Config,
    times: Iterable[float],
    num_rays: int = 128,
    max_radius: Optional[float] = None,
    use_alpha: bool = True
) -> dict[float, np.ndarray]:
    if max_radius is None:
        max_radius = estimate_max_radius(config)

    polygons = {}
    for t in times:
        polygons[float(t)] = feasible_set_polygon(
            config,
            t,
            num_rays=num_rays,
            max_radius=max_radius,
            use_alpha=use_alpha
        )

    return polygons
