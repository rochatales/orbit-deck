/** Chega a 95% do degrau em `seconds`, sem ultrapassar o piso nem criar objetos. */
export function approachSupportHeight(current: number, target: number, dt: number, seconds = 0) {
    if (seconds <= 0) return target;
    const next = target + (current - target) * Math.exp(-3 * Math.max(0, dt) / seconds);
    return Math.abs(next - target) < 1e-5 ? target : next;
}
