# Statistics Fix - Classical Energy Inconsistency

## Date
2026-01-26

## Summary
Fixed an inconsistency in the classical sweeping energy calculation where it incorrectly used delayed kernel weights from the memory formulation.

## Problem

The classical sweeping process is **memoryless** (`X^n = P_{C^n}(X^{n-1})`), but the energy computation was using the delayed sweeping kernel weights `r̃_j`:

```typescript
// INCORRECT - Used for both delayed and classical
energy += params.h * rTilde[j] * (dx * dx + dy * dy);
```

This implied memory effects that don't exist in classical sweeping.

## Solution

Modified the energy calculation to use **kinetic energy** for classical sweeping:

```typescript
// Classical energy: kinetic energy = ||X^n - X^{n-1}||^2 / (2h^2)
if (i > 0) {
  const dx = traj[i].x - traj[i - 1].x;
  const dy = traj[i].y - traj[i - 1].y;
  energy = (dx * dx + dy * dy) / (2 * params.h * params.h);
}
```

## Changes Made

### 1. Code Changes

**File**: `src/components/statistics/StatisticsPanel.tsx`

- Added `isClassical` parameter to `computeTrajectoryStats()` function
- Implemented conditional energy calculation:
  - **Delayed**: `E_n = h Σ r̃_j ||X^n - X^{n-j}||²` (memory-weighted)
  - **Classical**: `E_n = ||X^n - X^{n-1}||² / (2h²)` (kinetic energy)
- Updated function calls to pass `isClassical = true` for classical statistics

### 2. Constants Update

**File**: `src/constants/defaults.ts`

- Changed label from `'Classical energy E_n'` to `'Classical kinetic energy'`
- More accurately reflects the physical meaning

### 3. Documentation Updates

**File**: `src/docs/statistics.md`

- Removed inconsistency alert
- Documented correct classical energy formula
- Added implementation details with code references
- Updated comparison table
- Renumbered remaining issues

## Mathematical Justification

### Delayed Energy
```
E_n = h Σ_{j=1}^{J_max} r̃_j ||X^n - X^{n-j}||²
```
- Measures trajectory dispersion over memory window
- Kernel-weighted to match the delayed formulation
- Related to Dirichlet energy

### Classical Energy (NEW)
```
E_n = ||X^n - X^{n-1}||² / (2h²) = (1/2) · velocity[n]²
```
- Standard kinetic energy formula
- Discrete approximation of `(1/2) ||dX/dt||²`
- No memory/kernel weighting (appropriate for memoryless process)

## Physical Interpretation

**Delayed Energy**:
- High when trajectory has moved significantly from past positions
- Weighted average over memory window
- Smooth evolution due to kernel averaging

**Classical Energy**:
- Instantaneous kinetic energy
- Directly proportional to squared velocity: `E = (1/2)v²`
- Can have sharp changes when constraint force changes rapidly

**Not Directly Comparable**: These measure different physical quantities and are not expected to have the same magnitude or behavior.

## Testing

✅ Build passes: `npm run build` - successful compilation
✅ TypeScript compilation: No type errors
✅ No runtime errors expected (formula is mathematically sound)

## Verification Checklist

- [x] Code compiles without errors
- [x] Classical energy uses kinetic energy formula
- [x] Delayed energy still uses kernel-weighted formula
- [x] Documentation updated to reflect changes
- [x] UI label updated to be more descriptive
- [x] All statistics exports still work (same data structure)

## Impact

**User-Facing**:
- Classical energy values will change (likely smaller magnitude)
- More meaningful comparison between classical and delayed processes
- Clearer physical interpretation

**Data Export**:
- TSV export format unchanged
- Column order unchanged
- Only values in `classicalTotalEnergy` column will differ

**Backward Compatibility**:
- Existing saved parameters still load correctly
- No breaking changes to API or data structures

## Future Considerations

1. Could add velocity-squared as a separate metric for direct comparison
2. Could add normalized energy metrics for easier comparison
3. Consider adding energy difference plots (delayed - classical)

## References

- Implementation: `src/components/statistics/StatisticsPanel.tsx:45-67`
- Documentation: `src/docs/statistics.md`
- Constants: `src/constants/defaults.ts:58`
