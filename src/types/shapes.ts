import type { Vec2 } from './simulation';

// Projection result with metadata
export interface ProjectionResult {
  projected: Vec2;
  distance: number;
  wasOutside: boolean;
}
