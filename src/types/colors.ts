export type ColormapName = 'viridis' | 'plasma' | 'inferno' | 'magma' | 'cividis' | 'grayscale';

export interface TrajectoryColorConfig {
  mode: 'solid' | 'colormap';
  solidColor: string;
  colormap: ColormapName;
}

export interface MarkerColors {
  delayed: string;
  classical: string;
  xBar: string;
}

export interface ColorSettings {
  delayedTrajectory: TrajectoryColorConfig;
  classicalTrajectory: TrajectoryColorConfig;
  markers: MarkerColors;
}

export const DEFAULT_COLOR_SETTINGS: ColorSettings = {
  delayedTrajectory: {
    mode: 'colormap',
    solidColor: '#3b82f6',
    colormap: 'viridis',
  },
  classicalTrajectory: {
    mode: 'solid',
    solidColor: '#808080',
    colormap: 'grayscale',
  },
  markers: {
    delayed: '#22c55e',
    classical: '#000000',
    xBar: '#ef4444',
  },
};
