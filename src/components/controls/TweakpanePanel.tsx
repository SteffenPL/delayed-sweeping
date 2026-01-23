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
      lambda: params.lambda,
      R: params.R,
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
      trajectoryType: parametricTrajectory.type,
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

    simFolder.addBinding(PARAMS, 'lambda', {
      min: 0.1,
      max: 10,
      step: 0.1,
      label: 'Decay λ'
    }).on('change', (ev: TweakpaneAny) => setParams({ lambda: ev.value }));

    simFolder.addBinding(PARAMS, 'R', {
      min: 0.1,
      max: 5,
      step: 0.1,
      label: 'Size R'
    }).on('change', (ev: TweakpaneAny) => setParams({ R: ev.value }));

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

    const typeBinding = trajFolder.addBinding(PARAMS, 'trajectoryType', {
      label: 'Type',
      options: {
        Circular: 'circular',
        Ellipse: 'ellipse',
        'Figure-8': 'lissajous',
        Linear: 'linear',
      }
    }).on('change', (ev: TweakpaneAny) => {
      const type = ev.value as 'circular' | 'ellipse' | 'lissajous' | 'linear';

      // Set default params for each type
      if (type === 'circular') {
        setParametricTrajectory({
          type: 'circular',
          params: { centerX: 0, centerY: 0, radius: 2.0, omega: 1.0, phase: 0 },
        });
      } else if (type === 'ellipse') {
        setParametricTrajectory({
          type: 'ellipse',
          params: { centerX: 0, centerY: 0, semiMajor: 2.0, semiMinor: 1.0, omega: 1.0, phase: 0 },
        });
      } else if (type === 'lissajous') {
        setParametricTrajectory({
          type: 'lissajous',
          params: {
            centerX: 0, centerY: 0,
            amplitudeX: 2.0, amplitudeY: 2.0,
            freqX: 1.0, freqY: 2.0,
            phaseX: 0, phaseY: 0,
          },
        });
      } else if (type === 'linear') {
        setParametricTrajectory({
          type: 'linear',
          params: { startX: -3, startY: 0, velocityX: 1.0, velocityY: 0.0 },
        });
      }
    });
    typeBinding.hidden = trajectoryMode === 'free-drag';

    // Store bindings to update visibility later
    (pane as any)._bindings = {
      trajectory: {
        type: typeBinding,
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
    bindings.trajectory.type.hidden = trajectoryMode === 'free-drag';
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
    PARAMS.lambda = params.lambda;
    PARAMS.R = params.R;
    PARAMS.speed = speed;

    // Update trajectory params
    PARAMS.trajectoryMode = trajectoryMode;
    PARAMS.trajectoryType = parametricTrajectory.type;

    // Refresh UI
    paneRef.current?.refresh();
  }, [params, constraint, constraintAngle, trajectoryMode, parametricTrajectory, speed]);

  return <div ref={containerRef} className="tweakpane-container" />;
}
