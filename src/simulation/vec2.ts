import type { Vec2 } from '@/types';

/**
 * 2D vector utility functions
 */
export const vec2 = {
  /** Create a zero vector */
  zero(): Vec2 {
    return { x: 0, y: 0 };
  },

  /** Create a vector from components */
  create(x: number, y: number): Vec2 {
    return { x, y };
  },

  /** Add two vectors */
  add(a: Vec2, b: Vec2): Vec2 {
    return { x: a.x + b.x, y: a.y + b.y };
  },

  /** Subtract b from a */
  sub(a: Vec2, b: Vec2): Vec2 {
    return { x: a.x - b.x, y: a.y - b.y };
  },

  /** Scale a vector by a scalar */
  scale(v: Vec2, s: number): Vec2 {
    return { x: v.x * s, y: v.y * s };
  },

  /** Compute the length (magnitude) of a vector */
  length(v: Vec2): number {
    return Math.sqrt(v.x * v.x + v.y * v.y);
  },

  /** Compute the squared length of a vector */
  lengthSq(v: Vec2): number {
    return v.x * v.x + v.y * v.y;
  },

  /** Normalize a vector to unit length */
  normalize(v: Vec2): Vec2 {
    const len = vec2.length(v);
    if (len < 1e-10) return { x: 0, y: 0 };
    return { x: v.x / len, y: v.y / len };
  },

  /** Dot product of two vectors */
  dot(a: Vec2, b: Vec2): number {
    return a.x * b.x + a.y * b.y;
  },

  /** 2D cross product (returns scalar) */
  cross(a: Vec2, b: Vec2): number {
    return a.x * b.y - a.y * b.x;
  },

  /** Distance between two points */
  distance(a: Vec2, b: Vec2): number {
    return vec2.length(vec2.sub(a, b));
  },

  /** Rotate a vector by angle (radians) */
  rotate(v: Vec2, angle: number): Vec2 {
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    return {
      x: v.x * cos - v.y * sin,
      y: v.x * sin + v.y * cos,
    };
  },

  /** Linear interpolation between two vectors */
  lerp(a: Vec2, b: Vec2, t: number): Vec2 {
    return {
      x: a.x + (b.x - a.x) * t,
      y: a.y + (b.y - a.y) * t,
    };
  },

  /** Clamp a vector's length to a maximum */
  clampLength(v: Vec2, maxLen: number): Vec2 {
    const len = vec2.length(v);
    if (len <= maxLen) return v;
    return vec2.scale(v, maxLen / len);
  },

  /** Copy a vector */
  copy(v: Vec2): Vec2 {
    return { x: v.x, y: v.y };
  },
};
