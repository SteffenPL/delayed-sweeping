import { useEffect, useRef } from 'react';
import { Pane } from 'tweakpane';
import { useSimulationStore } from '@/store';

// Shape preset definitions
const SHAPE_PRESETS = {
  disk: { expression: 'R - sqrt(x^2 + y^2)', label: 'Disk' },
  stadium: { expression: 'r - sqrt(max(abs(x) - R/2, 0)^2 + y^2)', label: 'Stadium' },
  ellipse: { expression: '1 - sqrt((x/R)^2 + (y/r)^2)', label: 'Ellipse' },
  rectangle: { expression: 'min(R - abs(x), r - abs(y))', label: 'Rectangle' },
  diamond: { expression: 'R - abs(x) - abs(y)', label: 'Diamond' },
  custom: { expression: '', label: 'Custom' },
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type TweakpaneAny = any;

export function TweakpanePanel() {
  const containerRef = useRef<HTMLDivElement>(null);
  const paneRef = useRef<TweakpaneAny>(null);
  const paramsRef = useRef<TweakpaneAny>(null);

  const {
    params,
    setParams,
    constraint,
    setConstraint,
    constraintAngle,
    trajectoryMode,
    setTrajectoryMode,
    parametricTrajectory,
    setParametricTrajectory,
    speed,
    setSpeed,
  } = useSimulationStore();

  useEffect(() => {
    if (!containerRef.current || paneRef.current) return;

    const pane: TweakpaneAny = new Pane({
      container: containerRef.current,
      title: 'Controls',
    });
    paneRef.current = pane;

    // Determine current shape preset
    let currentPreset = 'custom';
    for (const [key, preset] of Object.entries(SHAPE_PRESETS)) {
      if (preset.expression === constraint.expression) {
        currentPreset = key;
        break;
      }
    }

    // Create bound parameters object (stored in ref for updates)
    const PARAMS = {
      // Simulation
      infiniteMode: params.infiniteMode,
      T: params.T,
      h: params.h,
      epsilon: params.epsilon,
      xPastExpression: params.xPastExpression,
      yPastExpression: params.yPastExpression,
      speed: speed,

      // Constraint
      shapePreset: currentPreset,
      expression: constraint.expression,
      constraintR: constraint.R,
      constraintR_minor: constraint.r,
      constraintA: constraint.a,
      constraintB: constraint.b,
      angle: constraintAngle * (180 / Math.PI), // Convert to degrees for display

      // Trajectory
      trajectoryMode: trajectoryMode,
      xExpression: parametricTrajectory.xExpression,
      yExpression: parametricTrajectory.yExpression,
      alphaExpression: parametricTrajectory.alphaExpression,
    };
    paramsRef.current = PARAMS;

    // ==================== SIMULATION FOLDER ====================
    const simFolder = pane.addFolder({ title: 'Simulation', expanded: true });

    simFolder.addBinding(PARAMS, 'infiniteMode', { label: 'Infinite Mode' })
      .on('change', (ev: TweakpaneAny) => setParams({ infiniteMode: ev.value }));

    simFolder.addBinding(PARAMS, 'T', {
      min: 1,
      max: 60,
      step: 0.5,
      label: params.infiniteMode ? 'Window T' : 'Final Time T'
    }).on('change', (ev: TweakpaneAny) => setParams({ T: ev.value }));

    simFolder.addBinding(PARAMS, 'h', {
      min: 0.001,
      max: 0.1,
      step: 0.001,
      label: 'Time Step h'
    }).on('change', (ev: TweakpaneAny) => setParams({ h: ev.value }));

    simFolder.addBinding(PARAMS, 'epsilon', {
      min: 0.1,
      max: 10,
      step: 0.1,
      label: 'ε'
    }).on('change', (ev: TweakpaneAny) => setParams({ epsilon: ev.value }));

    simFolder.addBinding(PARAMS, 'xPastExpression', {
      label: 'xₚ(t) (t<0)'
    }).on('change', (ev: TweakpaneAny) => setParams({ xPastExpression: ev.value }));

    simFolder.addBinding(PARAMS, 'yPastExpression', {
      label: 'yₚ(t) (t<0)'
    }).on('change', (ev: TweakpaneAny) => setParams({ yPastExpression: ev.value }));

    simFolder.addBinding(PARAMS, 'speed', {
      min: 1,
      max: 50,
      step: 1,
      label: 'Rendering Speed'
    }).on('change', (ev: TweakpaneAny) => setSpeed(ev.value));

    // ==================== CONSTRAINT FOLDER ====================
    const constraintFolder = pane.addFolder({ title: 'Constraint Shape', expanded: true });

    // Shape preset selector
    constraintFolder.addBinding(PARAMS, 'shapePreset', {
      label: 'Preset',
      options: {
        Disk: 'disk',
        Stadium: 'stadium',
        Ellipse: 'ellipse',
        Rectangle: 'rectangle',
        Diamond: 'diamond',
        Custom: 'custom',
      },
    }).on('change', (ev: TweakpaneAny) => {
      const preset = SHAPE_PRESETS[ev.value as keyof typeof SHAPE_PRESETS];
      // Only update if the expression is actually changing
      const currentConstraint = useSimulationStore.getState().constraint;
      if (preset && preset.expression && preset.expression !== currentConstraint.expression) {
        setConstraint({
          ...currentConstraint,
          expression: preset.expression,
        });
      }
    });

    // Custom expression input
    const expressionBinding = constraintFolder.addBinding(PARAMS, 'expression', {
      label: 'Expression',
    }).on('change', (ev: TweakpaneAny) => {
      const currentConstraint = useSimulationStore.getState().constraint;
      if (ev.value !== currentConstraint.expression) {
        setConstraint({
          ...currentConstraint,
          expression: ev.value,
        });
      }
    });

    // Parameter sliders
    constraintFolder.addBinding(PARAMS, 'constraintR', {
      label: 'R (major)',
      min: 0.1,
      max: 3,
      step: 0.05,
    }).on('change', (ev: TweakpaneAny) => {
      const currentConstraint = useSimulationStore.getState().constraint;
      if (ev.value !== currentConstraint.R) {
        setConstraint({
          ...currentConstraint,
          R: ev.value,
        });
      }
    });

    constraintFolder.addBinding(PARAMS, 'constraintR_minor', {
      label: 'r (minor)',
      min: 0.1,
      max: 3,
      step: 0.05,
    }).on('change', (ev: TweakpaneAny) => {
      const currentConstraint = useSimulationStore.getState().constraint;
      if (ev.value !== currentConstraint.r) {
        setConstraint({
          ...currentConstraint,
          r: ev.value,
        });
      }
    });

    constraintFolder.addBinding(PARAMS, 'constraintA', {
      label: 'a (general)',
      min: -5,
      max: 5,
      step: 0.1,
    }).on('change', (ev: TweakpaneAny) => {
      const currentConstraint = useSimulationStore.getState().constraint;
      if (ev.value !== currentConstraint.a) {
        setConstraint({
          ...currentConstraint,
          a: ev.value,
        });
      }
    });

    constraintFolder.addBinding(PARAMS, 'constraintB', {
      label: 'b (general)',
      min: -5,
      max: 5,
      step: 0.1,
    }).on('change', (ev: TweakpaneAny) => {
      const currentConstraint = useSimulationStore.getState().constraint;
      if (ev.value !== currentConstraint.b) {
        setConstraint({
          ...currentConstraint,
          b: ev.value,
        });
      }
    });

    // Angle display (read-only)
    constraintFolder.addBinding(PARAMS, 'angle', {
      label: 'Angle (°)',
      readonly: true,
    });

    constraintFolder.addButton({ title: 'Reset Angle' }).on('click', () => {
      useSimulationStore.getState().setConstraintAngle(0);
    });

    // ==================== TRAJECTORY FOLDER ====================
    const trajFolder = pane.addFolder({ title: 'Trajectory', expanded: true });

    trajFolder.addBinding(PARAMS, 'trajectoryMode', {
      label: 'Mode',
      options: {
        Parametric: 'parametric',
        'Free Drag': 'free-drag',
      }
    }).on('change', (ev: TweakpaneAny) => setTrajectoryMode(ev.value as 'parametric' | 'free-drag'));

    // Expression inputs
    const xExprBinding = trajFolder.addBinding(PARAMS, 'xExpression', {
      label: 'x(t)',
    }).on('change', (ev: TweakpaneAny) => {
      const current = useSimulationStore.getState().parametricTrajectory;
      setParametricTrajectory({ ...current, xExpression: ev.value });
    });
    xExprBinding.hidden = trajectoryMode === 'free-drag';

    const yExprBinding = trajFolder.addBinding(PARAMS, 'yExpression', {
      label: 'y(t)',
    }).on('change', (ev: TweakpaneAny) => {
      const current = useSimulationStore.getState().parametricTrajectory;
      setParametricTrajectory({ ...current, yExpression: ev.value });
    });
    yExprBinding.hidden = trajectoryMode === 'free-drag';

    const alphaExprBinding = trajFolder.addBinding(PARAMS, 'alphaExpression', {
      label: 'α(t)',
    }).on('change', (ev: TweakpaneAny) => {
      const current = useSimulationStore.getState().parametricTrajectory;
      setParametricTrajectory({ ...current, alphaExpression: ev.value });
    });
    alphaExprBinding.hidden = trajectoryMode === 'free-drag';

    // Store bindings to update visibility later
    (pane as any)._bindings = {
      trajectory: {
        xExpr: xExprBinding,
        yExpr: yExprBinding,
        alphaExpr: alphaExprBinding,
      },
      constraint: {
        expression: expressionBinding,
      },
    };

    // Cleanup
    return () => {
      pane.dispose();
      paneRef.current = null;
    };
  }, []);

  // Update visibility when trajectory mode changes
  useEffect(() => {
    const pane = paneRef.current;
    if (!pane || !(pane as any)._bindings) return;

    const bindings = (pane as any)._bindings;
    const hidden = trajectoryMode === 'free-drag';
    bindings.trajectory.xExpr.hidden = hidden;
    bindings.trajectory.yExpr.hidden = hidden;
    bindings.trajectory.alphaExpr.hidden = hidden;
  }, [trajectoryMode]);

  // Update bound params and refresh when store changes
  useEffect(() => {
    const PARAMS = paramsRef.current;
    if (!PARAMS) return;

    // Update constraint values
    let currentPreset = 'custom';
    for (const [key, preset] of Object.entries(SHAPE_PRESETS)) {
      if (preset.expression === constraint.expression) {
        currentPreset = key;
        break;
      }
    }

    PARAMS.shapePreset = currentPreset;
    PARAMS.expression = constraint.expression;
    PARAMS.constraintR = constraint.R;
    PARAMS.constraintR_minor = constraint.r;
    PARAMS.constraintA = constraint.a;
    PARAMS.constraintB = constraint.b;
    PARAMS.angle = constraintAngle * (180 / Math.PI);

    // Update simulation params
    PARAMS.infiniteMode = params.infiniteMode;
    PARAMS.T = params.T;
    PARAMS.h = params.h;
    PARAMS.epsilon = params.epsilon;
    PARAMS.xPastExpression = params.xPastExpression;
    PARAMS.yPastExpression = params.yPastExpression;
    PARAMS.speed = speed;

    // Update trajectory params
    PARAMS.trajectoryMode = trajectoryMode;
    PARAMS.xExpression = parametricTrajectory.xExpression;
    PARAMS.yExpression = parametricTrajectory.yExpression;
    PARAMS.alphaExpression = parametricTrajectory.alphaExpression;

    // Refresh UI
    paneRef.current?.refresh();
  }, [params, constraint, constraintAngle, trajectoryMode, parametricTrajectory, speed]);

  return <div ref={containerRef} className="tweakpane-container" />;
}
