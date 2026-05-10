import { OrthographicCamera } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import { OrthographicCamera as ThreeOrthographicCamera, Vector3 } from "three";
import { useGameStore } from "../state/useGameStore";
import { damp, dampAngle } from "../utils/math";
import { OFFICE_MAP_BOUNDS } from "../world/mapConfig";

const CAMERA_HEIGHT = 13;
const CAMERA_RADIUS = Math.sqrt(13 * 13 + 13 * 13);
const MAP_WIDTH = OFFICE_MAP_BOUNDS.maxX - OFFICE_MAP_BOUNDS.minX;
const MAP_DEPTH = OFFICE_MAP_BOUNDS.maxZ - OFFICE_MAP_BOUNDS.minZ;
const MAP_SCREEN_WIDTH = Math.max(43, MAP_WIDTH * 0.82 + MAP_DEPTH * 0.62);
const MAP_SCREEN_HEIGHT = Math.max(28, MAP_DEPTH * 0.54 + 11);
const CAMERA_LOOK_AHEAD = 0.9;
const CAMERA_TARGET_Y = 0.55;

function computeFitZoom(viewportWidth: number, viewportHeight: number) {
  return Math.min(viewportWidth / MAP_SCREEN_WIDTH, viewportHeight / MAP_SCREEN_HEIGHT);
}

export function CameraRig() {
  const cameraRef = useRef<ThreeOrthographicCamera>(null);
  const pressedKeys = useRef(new Set<string>());
  const rotation = useRef(Math.PI / 4);
  const desiredPosition = useRef(new Vector3());
  const target = useRef(new Vector3());
  const smoothedTarget = useRef(new Vector3());
  const hasInitialised = useRef(false);
  const size = useThree((state) => state.size);
  const playerPosition = useGameStore((state) => state.playerPosition);
  const previousPlayerPosition = useRef(new Vector3(playerPosition.x, playerPosition.y, playerPosition.z));
  const targetZoom = useGameStore((state) => state.targetZoom);
  const targetRotation = useGameStore((state) => state.targetRotation);
  const adjustZoom = useGameStore((state) => state.adjustZoom);
  const setZoom = useGameStore((state) => state.setZoom);
  const setZoomBounds = useGameStore((state) => state.setZoomBounds);
  const rotateCamera = useGameStore((state) => state.rotateCamera);

  // Use the fit zoom as the farthest allowed zoom-out so the camera never
  // reveals more empty terrain than the intended presentation frame.
  useEffect(() => {
    const fitZoom = computeFitZoom(size.width, size.height);
    const zoomOutFloor = fitZoom;
    const zoomInCeiling = Math.max(fitZoom * 3.25, fitZoom + 8);
    setZoomBounds(zoomOutFloor, zoomInCeiling);
    if (!hasInitialised.current) {
      setZoom(fitZoom);
      smoothedTarget.current.set(playerPosition.x, CAMERA_TARGET_Y, playerPosition.z);
      target.current.copy(smoothedTarget.current);
      previousPlayerPosition.current.set(playerPosition.x, playerPosition.y, playerPosition.z);
      if (cameraRef.current) {
        cameraRef.current.zoom = fitZoom;
        cameraRef.current.updateProjectionMatrix();
      }
      hasInitialised.current = true;
    }
  }, [playerPosition.x, playerPosition.y, playerPosition.z, setZoom, setZoomBounds, size.width, size.height]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (["KeyQ", "KeyR", "Equal", "NumpadAdd", "Minus", "NumpadSubtract"].includes(event.code)) {
        pressedKeys.current.add(event.code);
      }
    };

    const onKeyUp = (event: KeyboardEvent) => {
      pressedKeys.current.delete(event.code);
    };

    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      const fitZoom = computeFitZoom(size.width, size.height);
      // Scale the step relative to fit zoom so it feels proportional at any viewport
      const step = fitZoom * 0.08;
      adjustZoom(Math.sign(event.deltaY) * -step);
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("wheel", onWheel, { passive: false });

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("wheel", onWheel);
    };
  }, [adjustZoom, size.width, size.height]);

  useFrame((_, delta) => {
    if (!cameraRef.current) {
      return;
    }

    if (pressedKeys.current.has("KeyQ")) {
      rotateCamera(delta * 1.75);
    }
    if (pressedKeys.current.has("KeyR")) {
      rotateCamera(-delta * 1.75);
    }
    if (pressedKeys.current.has("Equal") || pressedKeys.current.has("NumpadAdd")) {
      adjustZoom(delta * 0.9);
    }
    if (pressedKeys.current.has("Minus") || pressedKeys.current.has("NumpadSubtract")) {
      adjustZoom(-delta * 0.9);
    }

    rotation.current = dampAngle(rotation.current, targetRotation, 8, delta);
    cameraRef.current.zoom = damp(cameraRef.current.zoom, targetZoom, 8, delta);
    cameraRef.current.updateProjectionMatrix();

    const lookAheadX = playerPosition.x - previousPlayerPosition.current.x;
    const lookAheadZ = playerPosition.z - previousPlayerPosition.current.z;
    previousPlayerPosition.current.set(playerPosition.x, playerPosition.y, playerPosition.z);

    target.current.set(
      playerPosition.x + lookAheadX * CAMERA_LOOK_AHEAD,
      CAMERA_TARGET_Y,
      playerPosition.z + lookAheadZ * CAMERA_LOOK_AHEAD
    );
    smoothedTarget.current.x = damp(smoothedTarget.current.x, target.current.x, 6.5, delta);
    smoothedTarget.current.y = damp(smoothedTarget.current.y, target.current.y, 6.5, delta);
    smoothedTarget.current.z = damp(smoothedTarget.current.z, target.current.z, 6.5, delta);
    desiredPosition.current.set(
      smoothedTarget.current.x + Math.cos(rotation.current) * CAMERA_RADIUS,
      smoothedTarget.current.y + CAMERA_HEIGHT,
      smoothedTarget.current.z + Math.sin(rotation.current) * CAMERA_RADIUS
    );

    cameraRef.current.position.x = damp(cameraRef.current.position.x, desiredPosition.current.x, 5.6, delta);
    cameraRef.current.position.y = damp(cameraRef.current.position.y, desiredPosition.current.y, 5.6, delta);
    cameraRef.current.position.z = damp(cameraRef.current.position.z, desiredPosition.current.z, 5.6, delta);
    cameraRef.current.lookAt(smoothedTarget.current);
  });

  const initialZoom = computeFitZoom(size.width, size.height);

  return (
    <OrthographicCamera
      ref={cameraRef}
      makeDefault
      position={[Math.cos(Math.PI / 4) * CAMERA_RADIUS, CAMERA_HEIGHT, Math.sin(Math.PI / 4) * CAMERA_RADIUS]}
      zoom={initialZoom}
      near={0.1}
      far={100}
    />
  );
}
