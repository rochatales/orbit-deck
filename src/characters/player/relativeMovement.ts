/** Character looks along local +Z. Its right is forward × world-up. */
export function relativeMovement(facing: number, sideways: number, forward: number) {
  const magnitude = Math.max(1, Math.hypot(sideways, forward));
  return {
    x: (Math.sin(facing) * forward - Math.cos(facing) * sideways) / magnitude,
    z: (Math.cos(facing) * forward + Math.sin(facing) * sideways) / magnitude
  };
}
