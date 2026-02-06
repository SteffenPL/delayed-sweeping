export interface HelpContent {
  title: string;
  description: string;
  formula?: string;
}

export const HELP_CONTENT: Record<string, HelpContent> = {
  // Simulation parameters
  infiniteMode: {
    title: 'Infinite Mode',
    description: 'When enabled, the simulation runs indefinitely with a sliding time window. When disabled, the simulation runs until time T.',
  },
  T: {
    title: 'Final Time / Window Size',
    description: 'In standard mode, this is the final simulation time. In infinite mode, this defines the size of the sliding time window for visualization.',
  },
  h: {
    title: 'Time Step (h)',
    description: 'The discrete time step used for numerical integration. Smaller values give more accurate results but slower simulation.',
    formula: 't_n = n \\cdot h',
  },
  epsilon: {
    title: 'Kernel Decay Rate',
    description: 'Controls how quickly past values decay in influence. Larger epsilon means shorter memory (faster decay).',
    formula: 'R_j = \\frac{1}{h} e^{-\\varepsilon j h}(1 - e^{-\\varepsilon h})',
  },
  solverType: {
    title: 'Solver Type',
    description: 'The numerical scheme used for discretization. "norm1-sum1" normalizes weights to sum to 1, "norm0-sum1" uses unnormalized weights, "trapezoidal" uses trapezoidal quadrature.',
  },
  xPastExpression: {
    title: 'Past Condition x_p(t)',
    description: 'The x-coordinate of the trajectory for t < 0. Use math.js syntax with variable t.',
    formula: 'x_p(t) \\text{ for } t < 0',
  },
  yPastExpression: {
    title: 'Past Condition y_p(t)',
    description: 'The y-coordinate of the trajectory for t < 0. Use math.js syntax with variable t.',
    formula: 'y_p(t) \\text{ for } t < 0',
  },
  speed: {
    title: 'Rendering Speed',
    description: 'Number of simulation steps computed per animation frame. Higher values make the simulation run faster.',
  },

  // Constraint parameters
  shapePreset: {
    title: 'Shape Preset',
    description: 'Select a predefined constraint shape or choose "Custom" to define your own using a signed distance function.',
  },
  expression: {
    title: 'SDF Expression',
    description: 'The signed distance function defining the constraint set. The constraint is the set where this expression is non-negative.',
    formula: 'C = \\{(x,y) : g(x,y) \\geq 0\\}',
  },
  R: {
    title: 'R (Major Radius)',
    description: 'Primary size parameter used in shape expressions. For a disk, this is the radius.',
  },
  r: {
    title: 'r (Minor Radius)',
    description: 'Secondary size parameter for shapes like ellipses, stadiums, and rectangles.',
  },
  a: {
    title: 'a (General Parameter)',
    description: 'General-purpose parameter available in custom expressions.',
  },
  b: {
    title: 'b (General Parameter)',
    description: 'General-purpose parameter available in custom expressions.',
  },
  angle: {
    title: 'Rotation Angle',
    description: 'Current rotation angle of the constraint in degrees. Use mouse wheel on canvas to rotate.',
  },

  // Trajectory parameters
  trajectoryMode: {
    title: 'Trajectory Mode',
    description: 'Choose between parametric mode (constraint center follows a defined path) or free-drag mode (manually drag the constraint).',
  },
  xExpression: {
    title: 'x(t) Expression',
    description: 'The x-coordinate of the constraint center as a function of time. Use math.js syntax.',
    formula: 'c_x(t) = x(t)',
  },
  yExpression: {
    title: 'y(t) Expression',
    description: 'The y-coordinate of the constraint center as a function of time. Use math.js syntax.',
    formula: 'c_y(t) = y(t)',
  },
  alphaExpression: {
    title: 'Rotation Expression',
    description: 'The rotation angle of the constraint as a function of time (in radians). Use math.js syntax.',
    formula: '\\alpha(t)',
  },
};
