import {
  BoxGeometry,
  CylinderGeometry,
  Group,
  MathUtils,
  Mesh,
  MeshStandardMaterial,
  OrthographicCamera,
  SphereGeometry,
  Vector2,
  Vector3
} from "three";
import { circleIntersectsRect, clamp, damp, type RectBounds } from "../utils/math";

function createPlayerAvatar() {
  const group = new Group();

  const jacket = new MeshStandardMaterial({
    color: "#ef6f51",
    roughness: 0.72
  });
  const neutral = new MeshStandardMaterial({
    color: "#f7f2eb",
    roughness: 0.84
  });
  const dark = new MeshStandardMaterial({
    color: "#31465f",
    roughness: 0.62
  });

  const body = new Mesh(new CylinderGeometry(0.32, 0.36, 0.8, 8), jacket);
  body.position.y = 0.84;
  body.castShadow = true;
  body.receiveShadow = true;
  group.add(body);

  const head = new Mesh(new SphereGeometry(0.25, 16, 16), neutral);
  head.position.y = 1.42;
  head.castShadow = true;
  group.add(head);

  const leftLeg = new Mesh(new BoxGeometry(0.14, 0.42, 0.14), dark);
  leftLeg.position.set(-0.1, 0.26, 0);
  leftLeg.castShadow = true;
  group.add(leftLeg);

  const rightLeg = leftLeg.clone();
  rightLeg.position.x = 0.1;
  group.add(rightLeg);

  const visor = new Mesh(new BoxGeometry(0.34, 0.08, 0.1), dark);
  visor.position.set(0, 1.42, 0.22);
  visor.castShadow = true;
  group.add(visor);

  return group;
}

export interface PlayerCollisionWorld {
  bounds: RectBounds;
  obstacles: RectBounds[];
  walkableAreas?: RectBounds[];
}

export class PlayerController {
  readonly object: Group;
  readonly radius = 0.42;
  readonly position: Vector3;

  private readonly input = new Vector2();
  private readonly pressedKeys = new Set<string>();
  private readonly velocity = new Vector3();
  private readonly movement = new Vector3();
  private readonly moveForward = new Vector3();
  private readonly moveRight = new Vector3();
  private readonly upAxis = new Vector3(0, 1, 0);
  private enabled = true;
  private walkTime = 0;

  constructor(spawnPosition = new Vector3(0, 0, 0)) {
    this.position = spawnPosition.clone();
    this.object = createPlayerAvatar();
    this.object.position.set(this.position.x, 0, this.position.z);
  }

  setEnabled(enabled: boolean) {
    this.enabled = enabled;
  }

  onKeyChange(code: string, pressed: boolean) {
    const trackedCodes = ["KeyW", "ArrowUp", "KeyS", "ArrowDown", "KeyA", "ArrowLeft", "KeyD", "ArrowRight"];
    if (!trackedCodes.includes(code)) {
      return;
    }

    if (pressed) {
      this.pressedKeys.add(code);
    } else {
      this.pressedKeys.delete(code);
    }

    const up = this.pressedKeys.has("KeyW") || this.pressedKeys.has("ArrowUp");
    const down = this.pressedKeys.has("KeyS") || this.pressedKeys.has("ArrowDown");
    const left = this.pressedKeys.has("KeyA") || this.pressedKeys.has("ArrowLeft");
    const right = this.pressedKeys.has("KeyD") || this.pressedKeys.has("ArrowRight");

    this.input.x = (right ? 1 : 0) - (left ? 1 : 0);
    this.input.y = (up ? 1 : 0) - (down ? 1 : 0);
  }

  update(delta: number, collisionWorld: PlayerCollisionWorld, camera: OrthographicCamera) {
    const desiredSpeed = this.enabled && this.input.lengthSq() > 0 ? 4.6 : 0;

    camera.getWorldDirection(this.moveForward);
    this.moveForward.y = 0;
    this.moveForward.normalize();

    this.moveRight.crossVectors(this.moveForward, this.upAxis).normalize();

    const direction = this.movement
      .copy(this.moveRight)
      .multiplyScalar(this.input.x)
      .addScaledVector(this.moveForward, this.input.y);

    if (direction.lengthSq() > 1) {
      direction.normalize();
    }

    this.velocity.x = damp(this.velocity.x, direction.x * desiredSpeed, 14, delta);
    this.velocity.z = damp(this.velocity.z, direction.z * desiredSpeed, 14, delta);

    this.tryMoveAxis("x", this.velocity.x * delta, collisionWorld);
    this.tryMoveAxis("z", this.velocity.z * delta, collisionWorld);

    this.object.position.set(this.position.x, 0, this.position.z);

    const planarSpeed = Math.abs(this.velocity.x) + Math.abs(this.velocity.z);
    if (planarSpeed > 0.05) {
      const targetAngle = Math.atan2(this.velocity.x, this.velocity.z);
      this.object.rotation.y = MathUtils.lerp(this.object.rotation.y, targetAngle, 1 - Math.exp(-12 * delta));
      this.walkTime += delta * 8;
    }

    const bob = planarSpeed > 0.1 ? Math.sin(this.walkTime) * 0.06 : 0;
    this.object.position.y = bob;
  }

  private tryMoveAxis(axis: "x" | "z", amount: number, collisionWorld: PlayerCollisionWorld) {
    if (Math.abs(amount) < 0.0001) {
      return;
    }

    const nextX = axis === "x" ? clamp(this.position.x + amount, collisionWorld.bounds.minX, collisionWorld.bounds.maxX) : this.position.x;
    const nextZ = axis === "z" ? clamp(this.position.z + amount, collisionWorld.bounds.minZ, collisionWorld.bounds.maxZ) : this.position.z;

    const insideWalkableArea =
      !collisionWorld.walkableAreas ||
      collisionWorld.walkableAreas.some(
        (area) =>
          nextX >= area.minX &&
          nextX <= area.maxX &&
          nextZ >= area.minZ &&
          nextZ <= area.maxZ
      );

    if (!insideWalkableArea) {
      return;
    }

    const colliding = collisionWorld.obstacles.some((obstacle) =>
      circleIntersectsRect(nextX, nextZ, this.radius, obstacle)
    );

    if (!colliding) {
      this.position.set(nextX, 0, nextZ);
    }
  }
}
