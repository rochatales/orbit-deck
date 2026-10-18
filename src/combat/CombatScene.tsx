import { useExpeditionStore } from '../state/useExpeditionStore';
import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Group, Mesh, Shape, Vector3 } from 'three';
import { Billboard, useGLTF } from '@react-three/drei';
import type { OfficeWorld } from '../world/createOfficeMap';
import { useGameStore } from '../state/useGameStore';
import { playerPosition } from '../state/playerTransient';
import { combatRuntime, useCombatStore } from '../state/useCombatStore';
import { simulationBlocked } from '../game/simulationGate';
import { CombatSimulation, type CombatInput } from './simulation';
import { COMBAT } from './config';
import { PATROL_UNIT, PatrolUnitRig } from './patrolUnit';
import patrolUnitUrl from '../assets/enemies/patrol-unit.glb';
export function CombatScene({ world }: {
    world: OfficeWorld;
}) {
    const run = useCombatStore(s => s.run);
    const simulation = useMemo(() => new CombatSimulation(world, useCombatStore.getState().encounter), [world, run]);
    const { gl } = useThree();
    const robots = useRef<(Group | null)[]>([]), tracers = useRef<(Mesh | null)[]>([]), reticle = useRef<Mesh>(null);
    const rings = useRef<(Mesh | null)[]>([]), alerts = useRef<(Group | null)[]>([]);
    // S6.1: Patrol Unit do autor; um rig (esqueleto, mixer, material) por robô da rodada.
    const patrolUnit = useGLTF(patrolUnitUrl);
    const rigs = useMemo(() => simulation.robots.map(() => new PatrolUnitRig(patrolUnit.scene, patrolUnit.animations)), [simulation, patrolUnit]);
    // Hordas reutilizam slots: a geração muda a cada nascimento e o rig volta ao Idle.
    const generations = useMemo(() => simulation.robots.map(r => r.generation), [simulation]);
    useEffect(() => () => rigs.forEach(rig => rig.dispose()), [rigs]);
    const drops = useRef<(Group | null)[]>([]), hearts = useRef<(Group | null)[]>([]);
    const heartShape = useMemo(() => {
        const shape = new Shape();
        shape.moveTo(0, -0.4);
        shape.bezierCurveTo(-0.12, -0.24, -0.5, 0.02, -0.42, 0.27);
        shape.bezierCurveTo(-0.35, 0.52, -0.08, 0.48, 0, 0.25);
        shape.bezierCurveTo(0.08, 0.48, 0.35, 0.52, 0.42, 0.27);
        shape.bezierCurveTo(0.5, 0.02, 0.12, -0.24, 0, -0.4);
        return shape;
    }, []);
    const input = useRef({ firing: false, tap: false, reload: false }), clock = useRef(0);
    // Entrada do passo reutilizada: a simulação copia a posição ao registrar disparos e rotas.
    const stepInput = useMemo<CombatInput>(() => ({ player: playerPosition, aim: combatRuntime.aim, firing: false, reload: false }), []);
    const axis = useMemo(() => new Vector3(0, 1, 0), []), direction = useMemo(() => new Vector3(), []);
    useEffect(() => {
        combatRuntime.simulation = simulation;
        clock.current = 0;
        useCombatStore.getState().publish(simulation.snapshot);
        return () => { if (combatRuntime.simulation === simulation)
            combatRuntime.simulation = null; };
    }, [simulation]);
    useEffect(() => {
        const canvas = gl.domElement;
        const down = (e: PointerEvent) => { if (e.button === 0 && !simulationBlocked()) {
            input.current.firing = true;
            input.current.tap = true;
        } };
        const up = () => { input.current.firing = false; };
        const clear = () => { up(); input.current.tap = false; input.current.reload = false; };
        const key = (e: KeyboardEvent) => { if (e.code === 'KeyR' && !e.repeat && !simulationBlocked() && !(e.target instanceof HTMLInputElement) && !(e.target instanceof HTMLSelectElement) && !(e.target instanceof HTMLTextAreaElement)) {
            e.preventDefault();
            input.current.reload = true;
        } };
        const unsubscribeGame = useGameStore.subscribe(() => { if (simulationBlocked())
            clear(); });
        // Dialogues and boarding also cancel a held trigger immediately.
        const unsubscribeExpedition = useExpeditionStore.subscribe(() => { if (simulationBlocked())
            clear(); });
        canvas.addEventListener('pointerdown', down);
        canvas.addEventListener('pointerleave', clear);
        window.addEventListener('pointerup', up);
        window.addEventListener('pointercancel', clear);
        window.addEventListener('blur', clear);
        window.addEventListener('keydown', key);
        return () => { clear(); unsubscribeGame(); unsubscribeExpedition(); canvas.removeEventListener('pointerdown', down); canvas.removeEventListener('pointerleave', clear); window.removeEventListener('pointerup', up); window.removeEventListener('pointercancel', clear); window.removeEventListener('blur', clear); window.removeEventListener('keydown', key); };
    }, [gl]);
    useFrame((_, delta) => {
        const blocked = simulationBlocked();
        if (blocked) {
            input.current.firing = false;
            input.current.tap = false;
            input.current.reload = false;
            clock.current = 0;
        }
        else {
            clock.current += Math.min(delta, 0.1);
            while (clock.current >= COMBAT.fixedStep) {
                stepInput.aim = combatRuntime.aim;
                stepInput.firing = (input.current.firing || input.current.tap) && combatRuntime.aimValid;
                stepInput.reload = input.current.reload;
                simulation.step(COMBAT.fixedStep, stepInput);
                input.current.tap = false;
                input.current.reload = false;
                clock.current -= COMBAT.fixedStep;
            }
            useCombatStore.getState().publish(simulation.snapshot);
        }
        simulation.robots.forEach((r, i) => {
            const mesh = robots.current[i];
            if (!mesh)
                return;
            const rig = rigs[i];
            if (!r.spawned) {
                mesh.visible = false;
                return;
            }
            if (generations[i] !== r.generation) {
                generations[i] = r.generation;
                rig.respawn();
            }
            rig.update(r, playerPosition.x, playerPosition.z, COMBAT.robot.contactRange, blocked ? 0 : Math.min(delta, 0.1));
            mesh.visible = rig.visible;
            mesh.position.set(r.x, 0, r.z);
            mesh.rotation.y = r.angle;
            const ring = rings.current[i], alert = alerts.current[i];
            if (ring) ring.visible = r.hp > 0;
            if (alert) alert.visible = r.hp > 0 && r.alertLeft > 0;
        });
        simulation.drops.forEach((drop, i) => {
            const mesh = drops.current[i];
            if (mesh) {
                mesh.visible = drop.active;
                mesh.position.set(drop.x, 0.22, drop.z);
            }
        });
        simulation.hearts.forEach((heart, i) => {
            const mesh = hearts.current[i];
            if (mesh) mesh.visible = heart.active;
        });
        tracers.current.forEach((mesh, i) => {
            if (!mesh)
                return;
            const shot = simulation.shots[i];
            mesh.visible = !!shot;
            if (shot) {
                direction.set(shot.to.x - shot.from.x, 0, shot.to.z - shot.from.z);
                const length = direction.length();
                mesh.position.set((shot.from.x + shot.to.x) / 2, 0.9, (shot.from.z + shot.to.z) / 2);
                mesh.scale.set(1, length, 1);
                mesh.quaternion.setFromUnitVectors(axis, direction.normalize());
            }
        });
        if (reticle.current) {
            reticle.current.visible = !blocked && combatRuntime.aimValid;
            reticle.current.position.set(combatRuntime.aim.x, 0.91, combatRuntime.aim.z);
        }
    });
    return <>
    {simulation.robots.map((r, i) => <group key={`${run}-${r.id}`} ref={g => { robots.current[i] = g; }}>
      <primitive object={rigs[i].root}/>
      <mesh ref={m => { rings.current[i] = m; }} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.025, 0]}><ringGeometry args={[0.43, 0.48, 20]}/><meshBasicMaterial color="#ff6753"/></mesh>
      <Billboard position={[0, PATROL_UNIT.height + 0.45, 0]} ref={g => { alerts.current[i] = g; }} visible={false}>
        <mesh position={[0, 0.13, 0]}><boxGeometry args={[0.12, 0.38, 0.04]}/><meshBasicMaterial color="#ffdb57"/></mesh>
        <mesh position={[0, -0.16, 0]}><sphereGeometry args={[0.075, 8, 6]}/><meshBasicMaterial color="#ffdb57"/></mesh>
      </Billboard>
    </group>)}
    {simulation.drops.map((_, i) => <group key={`drop-${run}-${i}`} ref={g => { drops.current[i] = g; }} visible={false}>
      <mesh position={[-0.17, 0, 0]} rotation={[0.2, 0.4, 0.3]}><boxGeometry args={[0.32, 0.18, 0.4]}/><meshStandardMaterial color="#c4d4df" metalness={0.7} roughness={0.3}/></mesh>
      <mesh position={[0.17, 0.04, 0.04]} rotation={[0, -0.5, 0.2]}><boxGeometry args={[0.28, 0.16, 0.32]}/><meshStandardMaterial color="#d98c50" metalness={0.65} roughness={0.35}/></mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.18, 0]}><ringGeometry args={[0.35, 0.4, 16]}/><meshBasicMaterial color="#9fe5ff"/></mesh>
    </group>)}
    {simulation.hearts.map((heart, i) => <group key={`heart-${run}-${i}`} position={[heart.x, 0, heart.z]} ref={g => { hearts.current[i] = g; }}>
      <Billboard position={[0, 0.85, 0]}><mesh><shapeGeometry args={[heartShape]}/><meshBasicMaterial color="#ff4564"/></mesh></Billboard>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.035, 0]}><ringGeometry args={[0.5, 0.57, 24]}/><meshBasicMaterial color="#ff9bac"/></mesh>
    </group>)}
    {[0, 1, 2].map(i => <mesh key={i} visible={false} ref={m => { tracers.current[i] = m; }}><cylinderGeometry args={[0.028, 0.028, 1, 5]}/><meshBasicMaterial color="#fff7a0"/></mesh>)}
    <mesh ref={reticle} rotation={[-Math.PI / 2, 0, 0]} visible={false}><ringGeometry args={[0.2, 0.27, 24]}/><meshBasicMaterial color="#71f4ff" depthTest={false}/></mesh>
  </>;
}
