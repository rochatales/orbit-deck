import { clamp, type RectBounds } from "../../utils/math";

function fitsWalkableAreas(x: number, z: number, walkableAreas: RectBounds[], radius: number) {
  if (walkableAreas.length === 0) {
    return true;
  }

  // Treat the tile footprint as the true walkable shape and let Rapier colliders
  // handle wall/door tightness, otherwise adjacent patches create dead zones.
  for (const area of walkableAreas) if (x >= area.minX && x <= area.maxX && z >= area.minZ && z <= area.maxZ) return true;
  return false;
}

export function constrainToWalkableAreas(
  currentX: number,
  currentZ: number,
  desiredX: number,
  desiredZ: number,
  bounds: RectBounds,
  walkableAreas: RectBounds[],
  radius: number,
  out: { x: number; z: number }
) {
  const clampedTargetX = clamp(currentX + desiredX, bounds.minX + radius, bounds.maxX - radius);
  const clampedTargetZ = clamp(currentZ + desiredZ, bounds.minZ + radius, bounds.maxZ - radius);
  const combinedDeltaX = clampedTargetX - currentX;
  const combinedDeltaZ = clampedTargetZ - currentZ;

  if (fitsWalkableAreas(clampedTargetX, clampedTargetZ, walkableAreas, radius)) {
    out.x = combinedDeltaX; out.z = combinedDeltaZ; return out;
  }

  let allowedX = 0;
  let allowedZ = 0;

  if (fitsWalkableAreas(clampedTargetX, currentZ, walkableAreas, radius)) {
    allowedX = combinedDeltaX;
  }

  const zTarget = clamp(currentZ + desiredZ, bounds.minZ + radius, bounds.maxZ - radius);
  const xBase = currentX + allowedX;
  if (fitsWalkableAreas(xBase, zTarget, walkableAreas, radius)) {
    allowedZ = zTarget - currentZ;
  }

  out.x = allowedX; out.z = allowedZ; return out;
}
