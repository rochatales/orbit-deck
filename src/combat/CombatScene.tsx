import { ChargeWarnings } from './ChargeWarnings';
import { CombatEffects } from './CombatEffects';
import { COMBAT_VFX } from './effects';
import { approachSupportHeight } from '../game/supportHeight';
import { AUDIO } from '../audio/config';
import { useExpeditionStore } from '../state/useExpeditionStore';
import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Group, Mesh, Shape, Vector3 } from 'three';
import { Billboard, useGLTF } from '@react-three/drei';
import type { OfficeWorld } from '../world/createOfficeMap';
import { useGameStore } from '../state/useGameStore';
import { playerPosition, playerFacing } from '../state/playerTransient';
import { combatRuntime, useCombatStore } from '../state/useCombatStore';
import { simulationBlocked } from '../game/simulationGate';
import { CombatSimulation, type CombatInput } from './simulation';
import { COMBAT, RIFLE_POSE, robotConfig, waveRobotKind } from './config';
import { PATROL_UNIT, LARGE_PATROL_VISUAL, SMALL_MUTANT_VISUAL, LARGE_MUTANT_VISUAL, PatrolUnitRig } from './patrolUnit';
import { ResourceDrops } from './ResourceDrops';
import largeMutantUrl from '../assets/enemies/large-mutant.glb';
import mutantUrl from '../assets/enemies/mutant-animal.glb';
import largePatrolUrl from '../assets/enemies/large-patrol-unit.glb';
import patrolUnitUrl from '../assets/enemies/patrol-unit.glb';
import { SupplyCrates } from '../game/props/SupplyCrates';
import { SHANGHAI_SUPPLY_CRATES } from '../game/props/supplyCrate';
import { isShanghaiPhase01 } from '../game/shanghai/previewMode';
export function CombatScene({ world }: {
    world: OfficeWorld;
}) {
    const run = useCombatStore(s => s.run);
    const simulation = useMemo(() => new CombatSimulation(world, useCombatStore.getState().encounter, undefined,
        isShanghaiPhase01() ? SHANGHAI_SUPPLY_CRATES : []), [world, run]);
    const { gl } = useThree();
    const robots = useRef<(Group | null)[]>([]), tracers = useRef<(Mesh | null)[]>([]), reticle = useRef<Mesh>(null);
    const rings = useRef<(Mesh | null)[]>([]), alerts = useRef<(Group | null)[]>([]);
    // S6.1: Patrol Unit do autor; um rig (esqueleto, mixer, material) por robô da rodada.
    const patrolUnit = useGLTF(patrolUnitUrl);
    const rigs = useMemo(() => simulation.robots.map(() => new PatrolUnitRig(patrolUnit.scene, patrolUnit.animations)), [simulation, patrolUnit]);
    const largePatrol = useGLTF(simulation.waves.length ? largePatrolUrl : patrolUnitUrl);
    const largeRigs = useMemo(() => simulation.robots.map((_, i) =>
        simulation.waves.some((count, wave) => i < count && waveRobotKind(wave, i) === 'largePatrol')
            ? new PatrolUnitRig(largePatrol.scene, largePatrol.animations, true) : null), [simulation, largePatrol]);
    const mutant = useGLTF(simulation.waves.length ? mutantUrl : patrolUnitUrl);
    const mutantRigs = useMemo(() => simulation.robots.map((_, i) =>
        simulation.waves.some((count, wave) => i < count && waveRobotKind(wave, i) === 'smallMutant')
            ? new PatrolUnitRig(mutant.scene, mutant.animations, 'smallMutant') : null), [simulation, mutant]);
    const largeMutant = useGLTF(simulation.waves.length ? largeMutantUrl : patrolUnitUrl);
    const largeMutantRigs = useMemo(() => simulation.robots.map((_, i) =>
        simulation.waves.some((count, wave) => i < count && waveRobotKind(wave, i) === 'largeMutant')
            ? new PatrolUnitRig(largeMutant.scene, largeMutant.animations, 'largeMutant') : null), [simulation, largeMutant]);
    // Hordas reutilizam slots: a geração muda a cada nascimento e o rig volta ao Idle.
    const generations = useMemo(() => simulation.robots.map(() => -1), [simulation]);
    useEffect(() => () => { rigs.forEach(rig => rig.dispose()); largeRigs.forEach(rig => rig?.dispose()); mutantRigs.forEach(rig => rig?.dispose()); largeMutantRigs.forEach(rig=>rig?.dispose()); }, [rigs, largeRigs, mutantRigs, largeMutantRigs]);
    const stepSlots = useMemo(() => new Int32Array(4), []), stepDistances = useMemo(() => new Float64Array(4), []);
    const hearts = useRef<(Group | null)[]>([]);
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
    const stepInput = useMemo<CombatInput>(() => ({ player: playerPosition, aim: combatRuntime.aim, facingAngle: 0, firing: false, reload: false }), []);
    const axis = useMemo(() => new Vector3(0, 1, 0), []), direction = useMemo(() => new Vector3(), []);
    useEffect(() => {
        combatRuntime.simulation = simulation;
        clock.current = 0;
        useCombatStore.getState().publish(simulation.snapshot);
        return () => { if (combatRuntime.simulation === simulation) {
            combatRuntime.simulation = null;
            useCombatStore.getState().setNearCrate(false);
        } };
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
        useCombatStore.getState().setNearCrate(!blocked && !!simulation.nearbySupplyCrate(playerPosition));
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
                stepInput.facingAngle = playerFacing.angle;
                stepInput.firing = (input.current.firing || input.current.tap) && combatRuntime.aimValid;
                stepInput.reload = input.current.reload;
                simulation.step(COMBAT.fixedStep, stepInput);
                input.current.tap = false;
                input.current.reload = false;
                clock.current -= COMBAT.fixedStep;
            }
            useCombatStore.getState().publish(simulation.snapshot);
        }
        stepSlots.fill(-1); stepDistances.fill(Infinity);
        simulation.robots.forEach((r, i) => {
            const mesh = robots.current[i];
            if (!mesh)
                return;
            const large = r.kind === 'largePatrol', bigAnimal=r.kind==='largeMutant', animal = r.kind === 'smallMutant', rig = bigAnimal ? largeMutantRigs[i]! : animal ? mutantRigs[i]! : large ? largeRigs[i]! : rigs[i];
            const R = robotConfig(r);
            rigs[i].root.visible = !large && !animal && !bigAnimal;
            if (largeRigs[i]) largeRigs[i]!.root.visible = large;
            if (largeMutantRigs[i]) largeMutantRigs[i]!.root.visible=bigAnimal;
            if (mutantRigs[i]) mutantRigs[i]!.root.visible = animal;
            if (!r.spawned) {
                mesh.visible = false;
                return;
            }
            if (generations[i] !== r.generation) {
                generations[i] = r.generation;
                rig.respawn();
                mesh.position.y = world.surfaceHeight?.(r.x, r.z) ?? 0;
            }
            rig.update(r, playerPosition.x, playerPosition.z, R.contactRange, blocked ? 0 : Math.min(delta, 0.1));
            if (!blocked && !animal && r.hp > 0 && (rig.clip === 'PatrolWalk' || rig.clip === 'ChaseRun')) {
                const d = Math.hypot(r.x - playerPosition.x, r.z - playerPosition.z);
                if (d <= AUDIO.enemyStepDistance) for (let slot = 0; slot < 4; slot++) {
                    if (d >= stepDistances[slot]) continue;
                    for (let shift = 3; shift > slot; shift--) { stepSlots[shift] = stepSlots[shift - 1]; stepDistances[shift] = stepDistances[shift - 1]; }
                    stepSlots[slot] = i; stepDistances[slot] = d; break;
                }
            }
            mesh.visible = rig.visible;
            mesh.position.set(r.x, approachSupportHeight(mesh.position.y, world.surfaceHeight?.(r.x, r.z) ?? 0,
                blocked ? 0 : Math.min(delta, .1), world.supportTransition), r.z);
            const kick=Math.sin(Math.PI*r.recoil/COMBAT_VFX.recoil);
            mesh.position.x+=r.recoilX*COMBAT_VFX.recoilDistance*kick;mesh.position.z+=r.recoilZ*COMBAT_VFX.recoilDistance*kick;
            mesh.rotation.set((r.recoilZ*Math.cos(r.angle)+r.recoilX*Math.sin(r.angle))*COMBAT_VFX.recoilTilt*kick,r.angle,
                -(r.recoilX*Math.cos(r.angle)-r.recoilZ*Math.sin(r.angle))*COMBAT_VFX.recoilTilt*kick);
            const ring = rings.current[i], alert = alerts.current[i];
            if (ring) { ring.visible = r.hp > 0; ring.scale.setScalar(R.radius / COMBAT.robot.radius); }
            if (alert) { alert.visible = r.hp > 0 && r.alertLeft > 0; alert.position.y = (bigAnimal ? LARGE_MUTANT_VISUAL.height : animal ? SMALL_MUTANT_VISUAL.height : large ? LARGE_PATROL_VISUAL.height : PATROL_UNIT.height) + .45; }
        });
        for (let slot = 0; slot < 4; slot++) {
            const i = stepSlots[slot]; if (i < 0) continue;
            const r = simulation.robots[i], rig = r.kind === 'largeMutant' ? largeMutantRigs[i]! : r.kind === 'largePatrol' ? largeRigs[i]! : rigs[i];
            if (rig.stepSound) simulation.sounds.emit('enemyStep', r.x, r.z, r.kind);
        }
        simulation.hearts.forEach((heart, i) => {
            const mesh = hearts.current[i];
            if (mesh) mesh.visible = heart.active;
        });
        tracers.current.forEach((mesh, i) => {
            if (!mesh)
                return;
            const shot = simulation.shots[i];
            mesh.visible = !!shot && Math.hypot(shot.to.x - shot.from.x, shot.to.z - shot.from.z) > 1e-8;
            if (shot) {
                direction.set(shot.to.x - shot.from.x, 0, shot.to.z - shot.from.z);
                const length = direction.length();
                mesh.position.set((shot.from.x + shot.to.x) / 2, RIFLE_POSE.height, (shot.from.z + shot.to.z) / 2);
                mesh.scale.set(1, length, 1);
                mesh.quaternion.setFromUnitVectors(axis, direction.normalize());
            }
        });
        if (reticle.current) {
            reticle.current.visible = !blocked && combatRuntime.aimValid;
            reticle.current.position.set(combatRuntime.aim.x, RIFLE_POSE.height + RIFLE_POSE.reticleLift, combatRuntime.aim.z);
        }
    });
    return <>
    <ChargeWarnings simulation={simulation}/>
    <CombatEffects effects={simulation.effects}/>
    <ResourceDrops drops={simulation.drops}/>
    {simulation.crates.length > 0 && <SupplyCrates crates={simulation.crates} surfaceHeight={world.surfaceHeight}/>}
    {simulation.robots.map((r, i) => <group key={`${run}-${r.id}`} ref={g => { robots.current[i] = g; }}>
      <primitive object={rigs[i].root}/>
      {largeRigs[i] && <primitive object={largeRigs[i]!.root}/>}
      {largeMutantRigs[i] && <primitive object={largeMutantRigs[i]!.root}/>}
      {mutantRigs[i] && <primitive object={mutantRigs[i]!.root}/>}
      <mesh ref={m => { rings.current[i] = m; }} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.025, 0]}><ringGeometry args={[0.43, 0.48, 20]}/><meshBasicMaterial color="#ff6753"/></mesh>
      <Billboard position={[0, PATROL_UNIT.height + 0.45, 0]} ref={g => { alerts.current[i] = g; }} visible={false}>
        <mesh position={[0, 0.13, 0]}><boxGeometry args={[0.12, 0.38, 0.04]}/><meshBasicMaterial color="#ffdb57"/></mesh>
        <mesh position={[0, -0.16, 0]}><sphereGeometry args={[0.075, 8, 6]}/><meshBasicMaterial color="#ffdb57"/></mesh>
      </Billboard>
    </group>)}
    {simulation.hearts.map((heart, i) => <group key={`heart-${run}-${i}`} position={[heart.x, world.surfaceHeight?.(heart.x, heart.z) ?? 0, heart.z]} ref={g => { hearts.current[i] = g; }}>
      <Billboard position={[0, 0.85, 0]}><mesh><shapeGeometry args={[heartShape]}/><meshBasicMaterial color="#ff4564"/></mesh></Billboard>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.035, 0]}><ringGeometry args={[0.5, 0.57, 24]}/><meshBasicMaterial color="#ff9bac"/></mesh>
    </group>)}
    {[0, 1, 2].map(i => <mesh key={i} visible={false} ref={m => { tracers.current[i] = m; }}><cylinderGeometry args={[0.028, 0.028, 1, 5]}/><meshBasicMaterial color="#fff7a0"/></mesh>)}
    <mesh ref={reticle} rotation={[-Math.PI / 2, 0, 0]} visible={false}><ringGeometry args={[0.2, 0.27, 24]}/><meshBasicMaterial color="#71f4ff" depthTest={false}/></mesh>
  </>;
}
