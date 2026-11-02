/** Marcações do autor em 02/11/2026. Dados de runtime; export original intacto. */
export const DESTROYED_CAR = { length: 3.8, width: 2.6512672691, height: 1.8436769864, scale: 3.841533802674281 } as const;
export const SHANGHAI_CARS = [
  { id: 'wreck-northwest', x: -24, z: -40, angle: 0 },
  { id: 'wreck-north', x: 13, z: -41, angle: 0 },
  { id: 'wreck-west', x: -46, z: -12, angle: 0 },
  { id: 'wreck-northeast', x: 40, z: -26, angle: 0 },
  { id: 'wreck-west-crossing', x: -40.3, z: 12.5, angle: 0 },
  { id: 'wreck-southwest', x: -44.8, z: 21.7, angle: 0 },
  { id: 'wreck-east-crossing', x: 17, z: -1.5, angle: Math.PI / 2 },
  { id: 'wreck-southeast', x: 36.5, z: 20.5, angle: 0 },
  { id: 'wreck-south', x: 14, z: 42.3, angle: Math.PI / 2 }
] as const;
export function retainPhase01Obstacle(obstacle: { source: string }) { return !/^Carro_\d+$/.test(obstacle.source); }
export function isLegacyCarPart(name: string) { return /^Carro_(?:Cabine_)?\d+$|^Pneu_\d+_/.test(name); }
export function carObstacle(car: typeof SHANGHAI_CARS[number], floor = 0) {
  const halfX = (Math.abs(Math.cos(car.angle)) * DESTROYED_CAR.width + Math.abs(Math.sin(car.angle)) * DESTROYED_CAR.length) / 2;
  const halfZ = (Math.abs(Math.sin(car.angle)) * DESTROYED_CAR.width + Math.abs(Math.cos(car.angle)) * DESTROYED_CAR.length) / 2;
  return { minX: car.x - halfX, maxX: car.x + halfX, minZ: car.z - halfZ, maxZ: car.z + halfZ, minY: floor, maxY: floor + DESTROYED_CAR.height };
}
