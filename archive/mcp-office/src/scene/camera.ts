import { MathUtils, OrthographicCamera, Vector3 } from "three";
import { damp, dampAngle } from "../utils/math";

const FRUSTUM_HEIGHT = 20;
const CAMERA_HEIGHT = 12;
const CAMERA_RADIUS = Math.sqrt(12 * 12 + 12 * 12);
const INITIAL_ROTATION = Math.PI / 4;
const INITIAL_ZOOM = 1.15;
const MIN_ZOOM = 0.82;
const MAX_ZOOM = 1.75;

export function createCamera(aspect: number) {
  const camera = new OrthographicCamera(
    (-FRUSTUM_HEIGHT * aspect) / 2,
    (FRUSTUM_HEIGHT * aspect) / 2,
    FRUSTUM_HEIGHT / 2,
    -FRUSTUM_HEIGHT / 2,
    0.1,
    100
  );

  camera.position.set(
    Math.cos(INITIAL_ROTATION) * CAMERA_RADIUS,
    CAMERA_HEIGHT,
    Math.sin(INITIAL_ROTATION) * CAMERA_RADIUS
  );
  camera.zoom = INITIAL_ZOOM;
  camera.lookAt(0, 0, 0);
  camera.updateProjectionMatrix();
  return camera;
}

export class CameraController {
  private readonly target = new Vector3();
  private readonly desiredPosition = new Vector3();
  private readonly pressedKeys = new Set<string>();
  private rotation = INITIAL_ROTATION;
  private targetRotation = INITIAL_ROTATION;
  private targetZoom = INITIAL_ZOOM;

  constructor(private readonly camera: OrthographicCamera) {}

  resize(aspect: number) {
    this.camera.left = (-FRUSTUM_HEIGHT * aspect) / 2;
    this.camera.right = (FRUSTUM_HEIGHT * aspect) / 2;
    this.camera.top = FRUSTUM_HEIGHT / 2;
    this.camera.bottom = -FRUSTUM_HEIGHT / 2;
    this.camera.updateProjectionMatrix();
  }

  onKeyChange(code: string, pressed: boolean) {
    const trackedCodes = ["KeyQ", "KeyR", "Equal", "NumpadAdd", "Minus", "NumpadSubtract"];
    if (!trackedCodes.includes(code)) {
      return;
    }

    if (pressed) {
      this.pressedKeys.add(code);
    } else {
      this.pressedKeys.delete(code);
    }
  }

  onWheel(deltaY: number) {
    const direction = Math.sign(deltaY);
    if (direction === 0) {
      return;
    }

    this.targetZoom = MathUtils.clamp(this.targetZoom - direction * 0.08, MIN_ZOOM, MAX_ZOOM);
  }

  update(targetPosition: Vector3, delta: number) {
    if (this.pressedKeys.has("KeyQ")) {
      this.targetRotation += delta * 1.75;
    }

    if (this.pressedKeys.has("KeyR")) {
      this.targetRotation -= delta * 1.75;
    }

    if (this.pressedKeys.has("Equal") || this.pressedKeys.has("NumpadAdd")) {
      this.targetZoom = MathUtils.clamp(this.targetZoom + delta * 0.9, MIN_ZOOM, MAX_ZOOM);
    }

    if (this.pressedKeys.has("Minus") || this.pressedKeys.has("NumpadSubtract")) {
      this.targetZoom = MathUtils.clamp(this.targetZoom - delta * 0.9, MIN_ZOOM, MAX_ZOOM);
    }

    this.rotation = dampAngle(this.rotation, this.targetRotation, 8, delta);
    this.camera.zoom = damp(this.camera.zoom, this.targetZoom, 8, delta);
    this.camera.updateProjectionMatrix();

    this.target.set(targetPosition.x, 0.4, targetPosition.z);
    this.desiredPosition.set(
      this.target.x + Math.cos(this.rotation) * CAMERA_RADIUS,
      this.target.y + CAMERA_HEIGHT,
      this.target.z + Math.sin(this.rotation) * CAMERA_RADIUS
    );

    this.camera.position.x = damp(this.camera.position.x, this.desiredPosition.x, 5, delta);
    this.camera.position.y = damp(this.camera.position.y, this.desiredPosition.y, 5, delta);
    this.camera.position.z = damp(this.camera.position.z, this.desiredPosition.z, 5, delta);
    this.camera.lookAt(this.target);
  }
}
