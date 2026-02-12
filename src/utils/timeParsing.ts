import { compile } from 'mathjs';

/**
 * Parse past constraint times from string input.
 * Supports two formats:
 * 1. Comma-separated list: "0.5, 1.0, 2.0"
 * 2. Range notation: "start:(step):end" where start, step, and end can be expressions with T
 *    Example: "0:(T/6):T" generates [0, T/6, 2*T/6, ..., T]
 *
 * @param input - Input string
 * @param T - Terminal time value for evaluating expressions
 * @returns Array of time values, sorted and deduplicated
 */
export function parsePastConstraintTimes(input: string, T: number): number[] {
  const trimmed = input.trim();
  if (!trimmed) return [];

  // Check if it's range notation: contains exactly two colons
  const colonCount = (trimmed.match(/:/g) || []).length;
  if (colonCount === 2) {
    return parseRangeNotation(trimmed, T);
  } else {
    return parseCommaSeparated(trimmed, T);
  }
}

/**
 * Parse comma-separated values
 * Each value can be an expression with T
 * Example: "0, T/2, T"
 */
function parseCommaSeparated(input: string, T: number): number[] {
  const times: number[] = [];

  for (const part of input.split(',')) {
    const trimmedPart = part.trim();
    if (!trimmedPart) continue;

    try {
      // Try to evaluate as expression with T
      const expr = compile(trimmedPart);
      const value = expr.evaluate({ T });
      const num = typeof value === 'number' ? value : Number(value);

      if (!isNaN(num) && num >= 0) {
        times.push(num);
      }
    } catch {
      // Fallback: try direct number parsing
      const num = parseFloat(trimmedPart);
      if (!isNaN(num) && num >= 0) {
        times.push(num);
      }
    }
  }

  return sortAndDeduplicate(times);
}

/**
 * Parse range notation: "start:(step):end"
 * Example: "0:(T/6):T" with T=12 generates [0, 2, 4, 6, 8, 10, 12]
 */
function parseRangeNotation(input: string, T: number): number[] {
  const parts = input.split(':');
  if (parts.length !== 3) return [];

  try {
    // Evaluate start, step, and end expressions
    const startExpr = compile(parts[0].trim());
    const stepExpr = compile(parts[1].trim());
    const endExpr = compile(parts[2].trim());

    const start = evaluateExpr(startExpr, T);
    const step = evaluateExpr(stepExpr, T);
    const end = evaluateExpr(endExpr, T);

    if (isNaN(start) || isNaN(step) || isNaN(end)) return [];
    if (step <= 0) return []; // Step must be positive
    if (start > end) return []; // Start must be <= end

    // Generate sequence
    const times: number[] = [];
    for (let t = start; t <= end + 1e-10; t += step) {
      // Add small epsilon for floating point comparison
      times.push(t);
    }

    return sortAndDeduplicate(times);
  } catch {
    return [];
  }
}

/**
 * Evaluate a mathjs expression with T variable
 */
function evaluateExpr(expr: any, T: number): number {
  const result = expr.evaluate({ T });
  return typeof result === 'number' ? result : Number(result);
}

/**
 * Sort and remove duplicate times
 */
function sortAndDeduplicate(times: number[]): number[] {
  if (times.length === 0) return [];

  // Sort
  times.sort((a, b) => a - b);

  // Remove duplicates (within small epsilon)
  const epsilon = 1e-9;
  const unique: number[] = [times[0]];

  for (let i = 1; i < times.length; i++) {
    if (Math.abs(times[i] - unique[unique.length - 1]) > epsilon) {
      unique.push(times[i]);
    }
  }

  return unique;
}

/**
 * Format past constraint times for display
 * If it looks like a simple range, format as range notation
 * Otherwise, format as comma-separated list
 */
export function formatPastConstraintTimes(times: number[], T: number): string {
  if (times.length === 0) return '';
  if (times.length === 1) return times[0].toString();

  // Check if it's a uniform range that can be represented as start:(step):end
  if (times.length >= 3) {
    const step = times[1] - times[0];
    const isUniform = times.every((t, i) => i === 0 || Math.abs((t - times[i - 1]) - step) < 1e-9);

    if (isUniform) {
      const start = times[0];
      const end = times[times.length - 1];

      // Check if we can express these in terms of T
      if (Math.abs(start) < 1e-9 && Math.abs(end - T) < 1e-9) {
        // It's 0:(...):T, try to express step in terms of T
        const stepsCount = times.length - 1;
        const expectedStep = T / stepsCount;

        if (Math.abs(step - expectedStep) < 1e-9) {
          return `0:(T/${stepsCount}):T`;
        }
      }

      return `${start}:${step}:${end}`;
    }
  }

  // Fallback: comma-separated list
  return times.map(t => t.toString()).join(', ');
}
