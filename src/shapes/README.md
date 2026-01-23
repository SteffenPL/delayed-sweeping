# Shape Projection System

This directory contains the implementation of signed distance functions (SDFs) and projection operations for various geometric shapes.

## Files

- **sdf.ts**: Signed distance functions for ball, star, and polygon shapes
- **projection.ts**: Projection operations onto shape boundaries
- **test-star.ts**: Manual diagnostic tests for star projection

## Star Shape Implementation

### Issue Fixed (2026-01-22)

The star SDF had an inverted interpolation parameter that caused incorrect boundary calculations.

**Problem**:
- Points at outer vertices (0°, 72°, 144°, etc.) were incorrectly mapped to `innerRadius`
- Points at inner vertices (36°, 108°, 180°, etc.) were incorrectly mapped to `outerRadius`

**Solution**:
Inverted the interpolation parameter `t` by computing `t = 1 - t_raw` before interpolation.

### Testing the Fix

1. **In Browser Console**:
   ```javascript
   // Run the diagnostic tests
   testStar()
   ```

2. **In the App**:
   - Select "Star" shape in the shape selector
   - Set outer radius = 1.0, inner radius = 0.5, points = 5
   - Run the simulation with free-drag mode
   - Drag the constraint around - the trajectory should correctly project onto the star boundary
   - The projection should snap to the star tips (outer vertices) when dragging radially outward

### Expected Behavior

For a 5-pointed star with outer radius 1.0 and inner radius 0.5:

- **Outer vertices** (at angles 0°, 72°, 144°, 216°, 288°):
  - Distance should be ≈ 0 when evaluated at radius 1.0
  - Projection from radially outward should land here

- **Inner vertices** (at angles 36°, 108°, 180°, 252°, 324°):
  - Distance should be ≈ 0 when evaluated at radius 0.5
  - These form the "valleys" between the points

- **Center** (0, 0):
  - Should have negative distance (inside the shape)

## SDF Properties

All SDFs follow the convention:
- **Negative distance**: Point is inside the shape
- **Zero distance**: Point is on the boundary
- **Positive distance**: Point is outside the shape

The magnitude of the distance approximates the Euclidean distance to the boundary.
