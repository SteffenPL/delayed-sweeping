export type ColormapName = 'viridis' | 'plasma' | 'inferno' | 'magma' | 'cividis' | 'grayscale';

export interface TrajectoryColorConfig {
  mode: 'none' | 'solid' | 'colormap';
  solidColor: string;
  colormap: ColormapName;
  opacityExpression: string; // A(s) formula, variables: s (age), t (current time), epsilon (from params)
}

export interface PastConstraintColorConfig {
  mode: 'none' | 'solid' | 'colormap';
  solidColor: string;
  colormap: ColormapName;
  opacityExpression: string;
}

export interface MarkerColors {
  delayed: string;
  classical: string;
  xBar: string;
}

export interface ColorSettings {
  delayedTrajectory: TrajectoryColorConfig;
  classicalTrajectory: TrajectoryColorConfig;
  preProjectionTrajectory: TrajectoryColorConfig;
  projectionVectors: TrajectoryColorConfig;
  pastConstraints: PastConstraintColorConfig;
  markers: MarkerColors;
  arrowLineWidth: number;
}

export const DEFAULT_COLOR_SETTINGS: ColorSettings = {
  delayedTrajectory: {
    mode: 'solid',
    solidColor: '#f97316',
    colormap: 'viridis',
    opacityExpression: 'exp(-epsilon * s / T)',
  },
  classicalTrajectory: {
    mode: 'solid',
    solidColor: '#60a5fa',
    colormap: 'grayscale',
    opacityExpression: 'exp(-epsilon * s / T)',
  },
  preProjectionTrajectory: {
    mode: 'solid',
    solidColor: '#000000',
    colormap: 'inferno',
    opacityExpression: 'exp(-epsilon * s / T)',
  },
  projectionVectors: {
    mode: 'solid',
    solidColor: '#ef4444',
    colormap: 'plasma',
    opacityExpression: '1',
  },
  pastConstraints: {
    mode: 'colormap',
    solidColor: '#3b82f6',
    colormap: 'plasma',
    opacityExpression: 'exp(-epsilon * s / T)',
  },
  markers: {
    delayed: '#f97316',
    classical: '#60a5fa',
    xBar: '#000000',
  },
  arrowLineWidth: 3.0,
};
