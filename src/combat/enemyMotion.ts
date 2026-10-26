/** Filtro visual separado da percepção/tiro; desvio físico tem compromisso curto e validado. */
export const ENEMY_MOTION = { steerHold: .25, yawDamping: 5, yawRate: 2.4, yawDeadband: .025, speedDamping: 6, locomotionHold: 1, stopConfirm: .3, footStop: .08 } as const;
export function smoothEnemyHeading(current: number, target: number, dt: number) {
    if(!Number.isFinite(current))return target;
    if(dt<=0)return current;
    const delta=Math.atan2(Math.sin(target-current),Math.cos(target-current));
    if(Math.abs(delta)<ENEMY_MOTION.yawDeadband)return current;
    const step=Math.min(Math.abs(delta)*(1-Math.exp(-ENEMY_MOTION.yawDamping*dt)),ENEMY_MOTION.yawRate*dt);
    return current+Math.sign(delta)*step;
}
