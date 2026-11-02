import { HealthPickups } from './HealthPickups';
import { useWeaponStore } from '../state/useWeaponStore';
import { EnemyIndicators } from './enemyIndicators';
import { playerActions } from '../state/playerActions';
import { playerWeaponPose } from '../state/playerWeaponPose';
import { AdditiveBlending } from 'three';
import { ChargeWarnings } from './ChargeWarnings';
import { CombatEffects } from './CombatEffects';
import { COMBAT_VFX } from './effects';
import { approachSupportHeight } from '../game/supportHeight';
import { AUDIO } from '../audio/config';
import { useExpeditionStore } from '../state/useExpeditionStore';
import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Group, Mesh, Vector3 } from 'three';
import { Billboard, useGLTF } from '@react-three/drei';
import type { OfficeWorld } from '../world/createOfficeMap';
import { useGameStore } from '../state/useGameStore';
import { playerPosition, playerFacing } from '../state/playerTransient';
import { combatRuntime, useCombatStore } from '../state/useCombatStore';
import { simulationBlocked } from '../game/simulationGate';
import { CombatSimulation, type CombatInput } from './simulation';
import { COMBAT, robotConfig, waveRobotKind, type RobotKind } from './config';
import { PATROL_UNIT, PatrolUnitRig } from './patrolUnit';
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
    const indicators = useMemo(() => new EnemyIndicators(simulation.robots.length), [simulation]);
    useEffect(() => () => indicators.dispose(), [indicators]);
    const { gl } = useThree();
    const robots = useRef<(Group | null)[]>([]), tracers = useRef<(Mesh | null)[]>([]);
    const rings = useRef<(Mesh | null)[]>([]), alerts = useRef<(Group | null)[]>([]);
    // S6.1: Patrol Unit do autor; um rig (esqueleto, mixer, material) por robô da rodada.
    const patrolUnit = useGLTF(patrolUnitUrl);
    const rigs = useMemo(() => simulation.robots.map(() => new PatrolUnitRig(patrolUnit.scene, patrolUnit.animations)), [simulation, patrolUnit]);
    // Hordas usam o tipo nos slots das ondas; a patrulha de teste usa o tipo escolhido em cada robô.
    const usesKind = (kind: RobotKind, i: number) => simulation.waves.length
        ? simulation.waves.some((count, wave) => i < count && waveRobotKind(wave, i) === kind)
        : simulation.robots[i].kind === kind;
    const loads = (kind: RobotKind) => simulation.waves.length > 0 || simulation.robots.some(r => r.kind === kind);
    const largePatrol = useGLTF(loads('largePatrol') ? largePatrolUrl : patrolUnitUrl);
    const largeRigs = useMemo(() => simulation.robots.map((_, i) =>
        usesKind('largePatrol', i)
            ? new PatrolUnitRig(largePatrol.scene, largePatrol.animations, true) : null), [simulation, largePatrol]);
    const mutant = useGLTF(loads('smallMutant') ? mutantUrl : patrolUnitUrl);
    const mutantRigs = useMemo(() => simulation.robots.map((_, i) =>
        usesKind('smallMutant', i)
            ? new PatrolUnitRig(mutant.scene, mutant.animations, 'smallMutant') : null), [simulation, mutant]);
    const largeMutant = useGLTF(loads('largeMutant') ? largeMutantUrl : patrolUnitUrl);
    const largeMutantRigs = useMemo(() => simulation.robots.map((_, i) =>
        usesKind('largeMutant', i)
            ? new PatrolUnitRig(largeMutant.scene, largeMutant.animations, 'largeMutant') : null), [simulation, largeMutant]);
    // Hordas reutilizam slots: a geração muda a cada nascimento e o rig volta ao Idle.
    const generations = useMemo(() => simulation.robots.map(() => -1), [simulation]);
    useEffect(() => () => { rigs.forEach(rig => rig.dispose()); largeRigs.forEach(rig => rig?.dispose()); mutantRigs.forEach(rig => rig?.dispose()); largeMutantRigs.forEach(rig=>rig?.dispose()); }, [rigs, largeRigs, mutantRigs, largeMutantRigs]);
    const stepSlots = useMemo(() => new Int32Array(4), []), stepDistances = useMemo(() => new Float64Array(4), []);
    const heavySlots=useMemo(()=>new Int32Array(2),[]),heavyDistances=useMemo(()=>new Float64Array(2),[]);
    const input = useRef({ firing: false, tap: false, reload: false }), clock = useRef(0);
    // Entrada do passo reutilizada: a simulação copia a posição ao registrar disparos e rotas.
    const stepInput = useMemo<CombatInput>(() => ({ player: playerPosition, muzzle: playerWeaponPose, aim: combatRuntime.aim, facingAngle: 0, firing: false, reload: false }), []);
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
        const unsubscribeWeapon = useWeaponStore.subscribe(() => clear());
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
        return () => { clear(); unsubscribeWeapon(); unsubscribeGame(); unsubscribeExpedition(); canvas.removeEventListener('pointerdown', down); canvas.removeEventListener('pointerleave', clear); window.removeEventListener('pointerup', up); window.removeEventListener('pointercancel', clear); window.removeEventListener('blur', clear); window.removeEventListener('keydown', key); };
    }, [gl]);
    useFrame(({ camera, size }, delta) => {
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
                stepInput.weapon = useWeaponStore.getState().weapon;
                stepInput.dashing = playerActions.dashing;
                stepInput.aim = combatRuntime.aim;
                stepInput.facingAngle = playerFacing.angle;
                stepInput.firing = (input.current.firing || input.current.tap) && combatRuntime.aimValid && !playerActions.dashing;
                stepInput.reload = input.current.reload && !playerActions.dashing;
                simulation.step(COMBAT.fixedStep, stepInput);
                input.current.tap = false;
                input.current.reload = false;
                clock.current -= COMBAT.fixedStep;
            }
            useCombatStore.getState().publish(simulation.snapshot);
        }
        stepSlots.fill(-1); stepDistances.fill(Infinity);heavySlots.fill(-1);heavyDistances.fill(Infinity);
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
                const heavy=large||bigAnimal,slots=heavy?heavySlots:stepSlots,distances=heavy?heavyDistances:stepDistances;
                if (d <= (heavy?AUDIO.heavyStepDistance:AUDIO.enemyStepDistance)) for (let slot = 0; slot < slots.length; slot++) {
                    if (d >= distances[slot]) continue;
                    for (let shift = slots.length-1; shift > slot; shift--) { slots[shift] = slots[shift - 1]; distances[shift] = distances[shift - 1]; }
                    slots[slot] = i; distances[slot] = d; break;
                }
            }
            mesh.visible = rig.visible;
            mesh.position.set(r.x, approachSupportHeight(mesh.position.y, world.surfaceHeight?.(r.x, r.z) ?? 0,
                blocked ? 0 : Math.min(delta, .1), world.supportTransition), r.z);
            const kick=Math.sin(Math.PI*r.recoil/COMBAT_VFX.recoil);
            mesh.position.x+=r.recoilX*COMBAT_VFX.recoilDistance*kick;mesh.position.z+=r.recoilZ*COMBAT_VFX.recoilDistance*kick;
            mesh.rotation.set((r.recoilZ*Math.cos(rig.visualAngle)+r.recoilX*Math.sin(rig.visualAngle))*COMBAT_VFX.recoilTilt*kick,rig.visualAngle,
                -(r.recoilX*Math.cos(rig.visualAngle)-r.recoilZ*Math.sin(rig.visualAngle))*COMBAT_VFX.recoilTilt*kick);
            const ring = rings.current[i], alert = alerts.current[i];
            if (ring) { ring.visible = r.hp > 0; ring.scale.setScalar(R.radius / COMBAT.robot.radius); }
            if (alert) alert.visible = r.hp > 0 && r.alertLeft > 0;
        });
        for (let slot = 0; slot < stepSlots.length+heavySlots.length; slot++) {
            const i = slot<stepSlots.length?stepSlots[slot]:heavySlots[slot-stepSlots.length]; if (i < 0) continue;
            const r = simulation.robots[i], rig = r.kind === 'largeMutant' ? largeMutantRigs[i]! : r.kind === 'largePatrol' ? largeRigs[i]! : rigs[i];
            if (rig.stepSound) simulation.sounds.emit('enemyStep', r.x, r.z, r.kind);
        }

        indicators.root.visible = !simulation.dead;
        indicators.update(simulation.robots, robots.current, camera, size.height, blocked ? 0 : Math.min(delta, .1), alerts.current);
        tracers.current.forEach((mesh, i) => {
            if (!mesh)
                return;
            const shot = simulation.shots[i];
            mesh.visible = !!shot && Math.hypot(shot.to.x - shot.from.x, shot.to.z - shot.from.z) > 1e-8;
            if (shot) {
                direction.set(shot.to.x - shot.from.x, 0, shot.to.z - shot.from.z);
                const length = direction.length();
                mesh.position.set((shot.from.x + shot.to.x) / 2, shot.height, (shot.from.z + shot.to.z) / 2);
                mesh.scale.set(1, length, 1);
                mesh.quaternion.setFromUnitVectors(axis, direction.normalize());
            }
        });

    });
    return <>
    <primitive object={indicators.root} dispose={null}/>
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
    <HealthPickups pickups={simulation.hearts} surfaceHeight={world.surfaceHeight}/>
    {[0, 1, 2].map(i => <mesh key={i} visible={false} ref={m => { tracers.current[i] = m; }}><cylinderGeometry args={[COMBAT_VFX.tracerRadius, COMBAT_VFX.tracerRadius, 1, 8]}/><meshBasicMaterial color={[2,2,2]} toneMapped={false}/><mesh><cylinderGeometry args={[COMBAT_VFX.tracerHaloRadius,COMBAT_VFX.tracerHaloRadius,1,8]}/><meshBasicMaterial color="#ffe052" toneMapped={false} transparent opacity={COMBAT_VFX.tracerHaloOpacity} blending={AdditiveBlending} depthWrite={false}/></mesh></mesh>)}
  </>;
}
