export type ColormapName = 'viridis' | 'plasma' | 'inferno' | 'magma' | 'cividis' | 'grayscale';

export interface TrajectoryColorConfig {
  mode: 'solid' | 'colormap';
  solidColor: string;
  colormap: ColormapName;
  opacityExpression: string; // A(s) formula, variables: s (age), t (current time), epsilon (from params)
}

export interface PastConstraintColorConfig {
  mode: 'solid' | 'colormap';
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
  pastConstraints: PastConstraintColorConfig;
  markers: MarkerColors;
}

export const DEFAULT_COLOR_SETTINGS: ColorSettings = {
  delayedTrajectory: {
    mode: 'colormap',
    solidColor: '#3b82f6',
    colormap: 'viridis',
    opacityExpression: 'exp(-epsilon * s / T)',
  },
  classicalTrajectory: {
    mode: 'solid',
    solidColor: '#808080',
    colormap: 'grayscale',
    opacityExpression: 'exp(-epsilon * s / T)',
  },
  pastConstraints: {
    mode: 'colormap',
    solidColor: '#3b82f6',
    colormap: 'plasma',
    opacityExpression: 'exp(-epsilon * s / T)',
  },
  markers: {
    delayed: '#22c55e',
    classical: '#000000',
    xBar: '#ef4444',
  },
};
