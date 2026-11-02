import { robotConfig, type RobotKind } from './config';
type Enemy = { kind?: RobotKind };
/** Tipos iguais conservam spacing próprio; mistos somam raios + 8 cm. Simétrica. */
export function enemySpacing(a: Enemy, b: Enemy) {
    const left = robotConfig(a), right = robotConfig(b);
    return a.kind === b.kind ? left.spacing : left.radius + right.radius + .08;
}
/** Influência começa na maior separation do par, nunca dentro da distância mínima. */
export function enemySeparation(a: Enemy, b: Enemy) {
    return Math.max(robotConfig(a).separation, robotConfig(b).separation, enemySpacing(a, b));
}
