import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Plane, Raycaster, Vector2, Vector3 } from 'three';
import { RIFLE_POSE } from '../../combat/config';
import { combatRuntime } from '../../state/useCombatStore';
import { useGameStore } from '../../state/useGameStore';
import { useExpeditionStore } from '../../state/useExpeditionStore';
import { playerPosition } from '../../state/playerTransient';
import { simulationBlocked } from '../../game/simulationGate';

/** Shared mouse-facing in both hub and combat; firing remains Shanghai-only. */
export function PlayerAim() {
  const { gl, camera } = useThree();
  const pointer = useRef(new Vector2()), inside = useRef(false);
  const ray = useMemo(() => new Raycaster(), []);
  const plane = useMemo(() => new Plane(new Vector3(0, 1, 0), -RIFLE_POSE.height), []);
  const point = useMemo(() => new Vector3(), []);
  useEffect(() => {
    const canvas = gl.domElement;
    const clear = () => { inside.current = false; combatRuntime.aimValid = false; };
    const move = (event: PointerEvent) => {
      if (simulationBlocked()) return;
      const bounds = canvas.getBoundingClientRect();
      pointer.current.set((event.clientX - bounds.left) / bounds.width * 2 - 1, -(event.clientY - bounds.top) / bounds.height * 2 + 1);
      inside.current = true;
    };
    const offGame = useGameStore.subscribe(() => { if (simulationBlocked()) clear(); });
    const offExpedition = useExpeditionStore.subscribe(() => { if (simulationBlocked()) clear(); });
    clear();
    canvas.addEventListener('pointermove', move);
    canvas.addEventListener('pointerdown', move);
    canvas.addEventListener('pointerleave', clear);
    window.addEventListener('blur', clear);
    window.addEventListener('pointercancel', clear);
    return () => {
      clear(); offGame(); offExpedition();
      canvas.removeEventListener('pointermove', move);
      canvas.removeEventListener('pointerdown', move);
      canvas.removeEventListener('pointerleave', clear);
      window.removeEventListener('blur', clear);
      window.removeEventListener('pointercancel', clear);
    };
  }, [gl]);
  useFrame(() => {
    if (simulationBlocked() || !inside.current) { combatRuntime.aimValid = false; return; }
    ray.setFromCamera(pointer.current, camera);
    if (ray.ray.intersectPlane(plane, point)) {
      if (Math.hypot(point.x - playerPosition.x, point.z - playerPosition.z) > 0.1) {
        combatRuntime.aim.x = point.x;
        combatRuntime.aim.z = point.z;
        combatRuntime.aimValid = true;
      }
    }
  });
  return null;
}
