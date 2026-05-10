import { MathUtils } from "three";

export interface RectBounds {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

export const clamp = MathUtils.clamp;

export function damp(current: number, target: number, smoothing: number, delta: number) {
  return MathUtils.damp(current, target, smoothing, delta);
}

export function dampAngle(current: number, target: number, smoothing: number, delta: number) {
  return MathUtils.damp(current, target, smoothing, delta);
}

export function circleIntersectsRect(x: number, z: number, radius: number, rect: RectBounds) {
  const nearestX = clamp(x, rect.minX, rect.maxX);
  const nearestZ = clamp(z, rect.minZ, rect.maxZ);
  const dx = x - nearestX;
  const dz = z - nearestZ;
  return dx * dx + dz * dz < radius * radius;
}
