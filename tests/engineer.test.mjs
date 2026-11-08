import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import { loadSource, createSourceLoader } from './load-source.mjs';
import { loadGlb } from './load-glb.mjs';
import { AnimationMixer, Box3, Vector3, Group } from 'three';
import path from 'node:path';
import vm from 'node:vm';
import ts from 'typescript';
import { createRequire } from 'node:module';
import React from 'react';
const { EngineerRoutine, ENGINEER, engineerIsCalm, engineerPreviewMood, engineerDoorClear, engineerHasStandingRoom } = loadSource('src/npcs/engineerRoutine.ts');
const { createWorld } = loadSource('src/game/marsWorld.ts');
const { traversable, clearSegment, segmentBox } = loadSource('src/combat/navigation.ts');
const { ColonyBuildingRuntime } = loadSource('src/scene/marsColony/colonyBuildingRuntime.ts');
const { COLONY_BUILDINGS } = loadSource('src/game/colonyBuildingsLayout.ts');
const far = { x: 20, z: -18 };
const file = 'src/assets/characters/npcs/engenheiro-v001.glb';
const hash = path => createHash('sha256').update(fs.readFileSync(path)).digest('hex');

test('Engenheiro: GLB próprio, dez clipes, 33 ossos e fontes preservadas pelo manifesto', async () => {
    const info = JSON.parse(fs.readFileSync('art-source/personagens/engenheiro/notas/export-v001.json'));
    assert.equal(hash(file), info.output.sha256);
    for (const s of info.sources) assert.equal(hash(`art-source/personagens/engenheiro/fontes/${s.file}`), s.sha256);
    const g = await loadGlb(file);
    assert.deepEqual(g.animations.map(a => a.name).sort(), ['Idle','Acknowledging','Yelling','Sitting','CrouchToStand','CrouchDown','Crouch','ShovedReaction','StartWalking','Walk'].sort());
    let skeleton, triangles = 0;
    g.scene.traverse(o => { if (o.isSkinnedMesh) { skeleton = o.skeleton; triangles += o.geometry.index.count / 3; } });
    assert.equal(skeleton.bones.length, 33); assert.equal(triangles, 3214);
    assert.ok(fs.statSync(file).size < 4_000_000);
    assert.ok(info.walk.speed_m_s > .7 && info.walk.speed_m_s < .9);
});

test('Engenheiro: altura e largura no runtime equivalem ao astronauta ativo do player', async () => {
    const { EngineerRig } = loadSource('src/npcs/engineerRig.ts');
    const npc = await loadGlb(file), player = await loadGlb('src/assets/characters/player/explorador-astronauta.glb');
    const rig = new EngineerRig(npc.scene, npc.animations), mixer = new AnimationMixer(player.scene);
    mixer.clipAction(player.animations.find(clip => clip.name === 'Idle')).play(); mixer.update(0);
    const size = scene => {
        scene.updateMatrixWorld(true); scene.traverse(o => { if(o.isSkinnedMesh)o.computeBoundingBox(); });
        return new Box3().setFromObject(scene).getSize(new Vector3());
    };
    const a = size(npc.scene), b = size(player.scene);
    assert.ok(Math.abs(a.y - b.y) < .002, `alturas: Engenheiro ${a.y}, player ${b.y}`);
    assert.ok(Math.abs(a.x / b.x - 1) < .05, `larguras: Engenheiro ${a.x}, player ${b.x}`);
    const {PLAYER_MOVEMENT} = loadSource('src/characters/player/playerConfig.ts');
    assert.equal(ENGINEER.colliderHeight, PLAYER_MOVEMENT.colliderHeight);
    assert.equal(ENGINEER.radius, PLAYER_MOVEMENT.colliderRadius);
    rig.dispose(); mixer.stopAllAction(); mixer.uncacheRoot(player.scene);
});

test('Engenheiro: banco reduzido barra o autostep real do player pelos quatro lados', async () => {
    const require=createRequire(import.meta.url),R=createRequire(require.resolve('@react-three/rapier'))('@dimforge/rapier3d-compat');await R.init();
    const {PLAYER_MOVEMENT:M,PLAYER_PHYSICS:P,PLAYER_COLLIDER_HALF_HEIGHT:H,PLAYER_COLLIDER_CENTER_Y:Y}=loadSource('src/characters/player/playerConfig.ts');
    for(const [dx,dz]of [[1,0],[-1,0],[0,1],[0,-1]]) {
        const world=new R.World({x:0,y:0,z:0});
        try {
            world.createCollider(R.ColliderDesc.cuboid(10,.1,10).setTranslation(0,-.1,0));
            world.createCollider(R.ColliderDesc.cuboid(.27*ENGINEER.seat.scale,.225*ENGINEER.seat.scale,.27*ENGINEER.seat.scale).setTranslation(0,.225*ENGINEER.seat.scale,0));
            const body=world.createRigidBody(R.RigidBodyDesc.kinematicPositionBased().setTranslation(-dx*2,Y,-dz*2));
            const capsule=world.createCollider(R.ColliderDesc.capsule(H,M.colliderRadius),body),controller=world.createCharacterController(P.controllerOffset);
            controller.enableAutostep(P.autostepMaxHeight,P.autostepMinWidth,false);controller.enableSnapToGround(P.snapToGroundDistance);
            controller.setMaxSlopeClimbAngle(Math.PI*.34);controller.setMinSlopeSlideAngle(Math.PI*.45);world.step();
            for(let f=0;f<120;f++) {
                const p=body.translation();controller.computeColliderMovement(capsule,{x:dx*M.runSpeed/60,y:Y-p.y,z:dz*M.runSpeed/60});
                const d=controller.computedMovement();body.setNextKinematicTranslation({x:p.x+d.x,y:Y,z:p.z+d.z});world.step();
            }
            const end=body.translation(),along=end.x*dx+end.z*dz;
            assert.ok(along<-.5&&along>-.65,`banco bloqueia ${dx}/${dz}: ${JSON.stringify(end)}`);
            controller.free();
        } finally { world.free(); }
    }
});

test('Engenheiro: animações reais sem deriva horizontal ou pés abaixo do piso', async () => {
    const g = await loadGlb(file), mixer = new AnimationMixer(g.scene), p = new Vector3(), box = new Box3();
    const hip = g.scene.getObjectByName('mixamorigHips') ?? g.scene.getObjectByName('mixamorig:Hips');
    assert.ok(hip);
    for (const clip of g.animations) {
        mixer.stopAllAction(); const action = mixer.clipAction(clip); action.play(); let origin;
        for (const fraction of [0, .25, .5, .75, .999]) {
            mixer.setTime(clip.duration * fraction); g.scene.updateMatrixWorld(true);
            hip.getWorldPosition(p);
            if (!origin) origin = [p.x, p.z];
            assert.ok(Math.hypot(p.x - origin[0], p.z - origin[1]) < .002, `${clip.name}: quadril sem deslocamento XZ`);
            g.scene.traverse(o => { if (o.isSkinnedMesh) o.computeBoundingBox(); });
            box.setFromObject(g.scene);
            assert.ok(box.min.y > -.015, `${clip.name}: apoio ${box.min.y}`);
            assert.ok(box.max.y < 2.7, `${clip.name}: altura ${box.max.y}`);
        }
    }
});

test('Engenheiro: caminhada fecha o corpo inteiro a 60/144 Hz sem alterar o clipe de origem', async () => {
    const {EngineerRig}=loadSource('src/npcs/engineerRig.ts'),g=await loadGlb(file);
    const source=g.animations.find(c=>c.name==='Walk'),original=JSON.stringify(source.toJSON());
    const rig=new EngineerRig(g.scene,g.animations),action=rig.actions.get('Walk'),clip=action.getClip(),bones=[];
    assert.notEqual(clip,source); assert.equal(clip.duration,source.duration);
    assert.equal(JSON.stringify(source.toJSON()),original,'GLB compartilhado preservado');
    g.scene.traverse(o=>{if(o.isBone)bones.push(o);});
    rig.mixer.stopAllAction();action.reset().setEffectiveWeight(1).play();
    const sample=time=>{
        rig.mixer.setTime(time);g.scene.updateMatrixWorld(true);
        return bones.map(b=>b.getWorldPosition(new Vector3()));
    };
    const first=sample(0),last=sample(clip.duration-1e-7);
    assert.ok(Math.max(...first.map((p,i)=>p.distanceTo(last[i])))<.0005,'emenda do esqueleto inteiro abaixo de 0,5 mm');
    for(const fps of [60,144]) {
        let previous=sample(0),lastCycle=0;
        for(let frame=1;frame<clip.duration*fps*3;frame++) {
            const time=frame/fps,points=sample(time),cycle=Math.floor(time/clip.duration);
            if(cycle!==lastCycle) assert.ok(Math.max(...points.map((p,i)=>p.distanceTo(previous[i])))<(fps===60?.04:.02),`sem salto na emenda a ${fps} Hz`);
            g.scene.traverse(o=>{if(o.isSkinnedMesh)o.computeBoundingBox();});
            assert.ok(new Box3().setFromObject(g.scene).min.y>-.001,'apoio sem penetrar mais de 1 mm no piso');
            previous=points;lastCycle=cycle;
        }
    }
    assert.equal(JSON.stringify(source.toJSON()),original);rig.dispose();
});

test('Engenheiro: parada curta não reinicia os pesos nem provoca salto ao retomar', async () => {
    const {EngineerRig}=loadSource('src/npcs/engineerRig.ts');
    for(const fps of [60,144]) {
        const g=await loadGlb(file),rig=new EngineerRig(g.scene,g.animations),bones=[];
        g.scene.traverse(o=>{if(o.isBone)bones.push(o);});
        const state={x:0,y:0,z:0,angle:0,phase:'walk',animation:'StartWalking',moving:true,cycles:0,seated:0,clipTime:0};
        let clock=0,previous;
        for(let frame=0;frame<8*fps;frame++) {
            const time=frame/fps,waiting=time>=4&&time<4.1;
            clock+=waiting?0:1/fps;state.animation=waiting?'Idle':clock<88/30?'StartWalking':'Walk';
            state.clipTime=waiting?null:clock-(state.animation==='Walk'?88/30:0);
            rig.update(state,1/fps);g.scene.updateMatrixWorld(true);
            const pose=bones.map(b=>b.getWorldPosition(new Vector3()));
            if(previous)assert.ok(Math.max(...pose.map((p,i)=>p.distanceTo(previous[i])))<(fps===60?.05:.025),`transição contínua a ${fps} Hz no instante ${time}`);
            const sum=[...rig.actions.values()].reduce((n,a)=>n+a.getEffectiveWeight(),0);
            assert.ok(Math.abs(sum-1)<1e-6,'pesos continuam normalizados durante a interrupção');
            previous=pose;
        }
        rig.dispose();
    }
});

test('Engenheiro: nova reação de esbarrão começa do início mesmo durante a mistura anterior', async () => {
    const {EngineerRig}=loadSource('src/npcs/engineerRig.ts');
    for(const seconds of [2,ENGINEER.bumpDuration+.05]) {
        const g=await loadGlb(file),rig=new EngineerRig(g.scene,g.animations);
        const state={x:0,y:0,z:0,angle:0,phase:'walk',animation:'ShovedReaction',moving:false,cycles:0,seated:0,clipTime:null};
        for(let i=0;i<seconds*60;i++)rig.update(state,1/60);
        state.animation=seconds===2?'Yelling':'Idle';for(let i=0;i<6;i++)rig.update(state,1/60);
        const reaction=rig.actions.get('ShovedReaction');
        assert.ok(reaction.getEffectiveWeight()>.5,'reação anterior ainda visível');
        state.animation='ShovedReaction';rig.update(state,1/60);
        assert.ok(reaction.time<.02,'uma nova reação não herda o tempo da anterior');
        for(let i=0;i<6;i++)rig.update(state,1/60);
        assert.ok(reaction.time>.1&&!reaction.paused,'nova reação continua avançando, inclusive após a anterior terminar');
        rig.dispose();
    }
});

test('Engenheiro: Oficina/Data Center/assento com caminhos livres e loop contínuo', () => {
    const world = createWorld(), routine = new EngineerRoutine({ ...world, movingCuboids: [] }), phases = new Set();
    for (let i = 0; i < routine.paths.length; i++) {
        let prev = i === 0 ? ENGINEER.start : ENGINEER.stops[i === 1 ? 0 : i === 2 ? 1 : 2];
        for (const p of routine.paths[i]) {
            assert.ok(clearSegment(prev, p, { ...world, obstacles:[...world.obstacles,ENGINEER.seatObstacle] }, ENGINEER.radius)); prev = p;
        }
    }
    for (let f = 0; f < 240 / ENGINEER.visualScale * 60; f++) {
        routine.update(1/60, far); phases.add(routine.state.phase);
        assert.ok(traversable(routine.state, world, ENGINEER.radius));
    }
    assert.ok(routine.state.cycles >= 2, `ciclos: ${routine.state.cycles}`);
    assert.deepEqual([...phases].sort(), ['walk','crouch-down','crouch','stand-up','sit'].sort());
});

test('Engenheiro: portas reais abrem para o NPC e ele não atravessa folhas fechadas', async () => {
    const world = createWorld(), routine = new EngineerRoutine(world), doors = [];
    for (const id of ['data-center','workshop']) {
        const g = await loadGlb(`src/assets/buildings/${id}.glb`);
        doors.push(new ColonyBuildingRuntime(g.scene, g.animations, COLONY_BUILDINGS.find(b => b.id === id), world.movingCuboids));
    }
    const doorBox = { minX:0,maxX:0,minZ:0,maxZ:0 };
    assert.equal(engineerDoorClear({x:-6,z:11.2},{x:-10.3,z:11.2},world.movingCuboids,doorBox),false,'folha real fechada bloqueia a travessia');
    for(let f=0;f<120;f++) doors[1].update(far,1/60,{x:-7,z:11.2});
    assert.equal(engineerDoorClear({x:-6,z:11.2},{x:-10.3,z:11.2},world.movingCuboids,doorBox),true,'mesma travessia livre após abertura');
    for (let f = 0; f < 240 / ENGINEER.visualScale * 60; f++) {
        for (const door of doors) door.update(far, 1/60, routine.state);
        const x = routine.state.x, z = routine.state.z;
        routine.update(1/60, far);
        if (routine.state.moving) assert.ok(engineerDoorClear({ x, z }, routine.state, world.movingCuboids, { minX:0,maxX:0,minZ:0,maxZ:0 }));
    }
    assert.ok(routine.state.cycles >= 2, `ciclos com portas: ${routine.state.cycles}`);
    doors.forEach(d => d.dispose());
});

test('S5.1: Engenheiro aguarda a entrega na Oficina e retoma a rota depois', () => {
    const routine = new EngineerRoutine({ ...createWorld(), movingCuboids: [] });
    const shelfStop = ENGINEER.stops[0];
    for (let frame = 0; frame < 120 * 60; frame++) routine.update(1 / 60, far, false, true, false, true);
    assert.ok(Math.hypot(routine.position.x - shelfStop.x, routine.position.z - shelfStop.z) < .08);
    assert.equal(routine.state.animation, 'Idle');
    for (let frame = 0; frame < 10 * 60; frame++) routine.update(1 / 60, far, false, true);
    assert.ok(Math.hypot(routine.position.x - shelfStop.x, routine.position.z - shelfStop.z) > 1);
});

test('Engenheiro: começa a agachar de frente para a estante e retoma essa direção após conversar', () => {
    const routine = new EngineerRoutine({ ...createWorld(), movingCuboids: [] });
    const shelf = COLONY_BUILDINGS.find(b => b.id === 'workshop').staticCuboids.find(c => c.node === 'COL_Shelf_0');
    const facesShelf = () => {
        const { x, z, angle } = routine.state;
        return segmentBox({ x, z }, { x: x + 1.5 * Math.sin(angle), z: z + 1.5 * Math.cos(angle) }, shelf.bounds, 0) !== null;
    };
    for (let frame = 0; frame < 60 * 60 && routine.state.animation !== 'CrouchDown'; frame++) routine.update(1 / 60, far);
    assert.equal(routine.state.animation, 'CrouchDown');
    assert.ok(facesShelf());
    const player = { x: routine.state.x + 1.2, z: routine.state.z };
    for (let frame = 0; frame < 60; frame++) routine.update(1 / 60, player, true);
    assert.equal(routine.state.animation, 'Yelling');
    assert.equal(facesShelf(), false);
    routine.update(1 / 60, player);
    assert.equal(routine.state.animation, 'CrouchDown');
    assert.ok(facesShelf());
});

test('Engenheiro: para diante do banco e só recua para ele com a pose sentada', () => {
    const world = createWorld(), r = new EngineerRoutine({ ...world, movingCuboids: [] });
    const bench = COLONY_BUILDINGS.find(b => b.id === 'workshop').staticCuboids.find(c => c.node === 'COL_Workbench_0');
    assert.ok(ENGINEER.seat.z > bench.bounds.minZ && ENGINEER.seat.z < bench.bounds.maxZ);
    assert.ok(ENGINEER.seatObstacle.minX > bench.bounds.maxX && ENGINEER.seat.x - bench.bounds.maxX < .6);
    let sawSeat=false, sawRise=false;
    for(let f=0;f<200*60;f++) {
        r.update(1/60,far);
        if(!sawSeat && r.state.animation==='Sitting' && r.state.seated===1) {
            sawSeat=true; assert.ok(Math.abs(r.position.x-ENGINEER.seat.x)<.07);
            assert.ok(Math.abs(r.position.z-ENGINEER.seat.z)<.07);
            assert.ok(traversable(r.position, world, ENGINEER.radius), 'pose sentada livre da bancada e das paredes');
            const anchor=r.state.x;
            for(let n=0;n<30;n++) r.update(1/60,far,true,false);
            assert.equal(r.state.seated,0); assert.equal(r.position.x,anchor,'conversa em pé no ponto de aproximação');
            assert.ok(r.position.x>ENGINEER.seatObstacle.maxX+ENGINEER.radius);
            for(let n=0;n<30;n++) r.update(1/60,far);
            assert.equal(r.state.seated,1,'retoma a pose no banco');
        }
        if(sawSeat && r.state.animation==='CrouchToStand' && r.state.seated===0) { sawRise=true; break; }
    }
    assert.ok(sawSeat && sawRise,'sentou e voltou ao apoio livre');
});

test('Engenheiro: distância da arrancada corresponde ao deslocamento do FBX', () => {
    const r = new EngineerRoutine({ ...createWorld(), movingCuboids: [] });
    let distance=0;
    for(let f=0;f<88;f++) {
        const x=r.state.x,z=r.state.z; r.update(1/30,far);
        distance+=Math.hypot(r.state.x-x,r.state.z-z);
    }
    assert.ok(Math.abs(distance-1.628464 * ENGINEER.visualScale)<.04,`distância da arrancada: ${distance}`);
});

test('Engenheiro: jogador diante do banco adia levantar/esbarrão/conversa sem sobrepor cápsulas', () => {
    const r=new EngineerRoutine({...createWorld(),movingCuboids:[]});
    for(let f=0;f<200*60;f++) {
        r.update(1/60,far);
        if(r.state.animation==='Sitting' && r.state.seated===1) break;
    }
    assert.equal(r.state.seated,1);
    assert.equal(engineerHasStandingRoom(r.state,{x:r.state.x-.7,z:r.state.z+.69}),false,'protege também o percurso lateral entre banco e apoio');
    const player={x:r.state.x,z:r.state.z};
    for(let f=0;f<20*60;f++) {
        r.update(1/60,player);
        assert.equal(r.state.animation,'Sitting'); assert.equal(r.state.seated,1);
        assert.ok(Math.hypot(player.x-r.position.x,player.z-r.position.z)>.8);
    }
    r.update(1/60,player,true,false); assert.equal(r.state.animation,'Sitting');
    for(let f=0;f<25*60;f++)r.update(1/60,far);
    assert.notEqual(r.state.phase,'sit','retoma quando o jogador libera a saída');
});

test('Engenheiro: não inicia o recuo para um banco ocupado pelo jogador', () => {
    for(const offset of [{x:0,z:.65},{x:-.65,z:0}]) {
        const r=new EngineerRoutine({...createWorld(),movingCuboids:[]});
        for(let f=0;f<200*60;f++) {r.update(1/60,far);if(r.state.phase==='sit')break;}
        // Chegada ao apoio livre, antes do primeiro frame do blend.
        r.state.seated=0; r.position.x=r.state.x;
        const player={x:ENGINEER.seat.x+offset.x,z:ENGINEER.seat.z+offset.z};
        for(let f=0;f<120;f++) {
            r.update(1/60,player); assert.equal(r.state.seated,0); assert.equal(r.state.animation,'Idle');
        }
        for(let f=0;f<30;f++)r.update(1/60,far);
        assert.equal(r.state.seated,1,'senta depois que o espaço é liberado');
    }
});

test('Escape: pausa retoma o diálogo antes de fechá-lo, com cabine/viagem preservadas', () => {
    const {sessionEscape}=loadSource('src/game/sessionEscape.ts');
    for(const panel of ['engineer','eden']) {
        assert.equal(sessionEscape('walking',true,panel),'resume');
        assert.equal(sessionEscape('walking',false,panel),'close-dialogue');
    }
    assert.equal(sessionEscape('walking',true,null),'resume');
    assert.equal(sessionEscape('walking',false,null),'pause');
    assert.equal(sessionEscape('aboard',false,'ship'),'exit');
    assert.equal(sessionEscape('travelling',true,'ship'),null);
});

test('Engenheiro: esbarrão uma vez por aproximação, sem dano ou deslocamento da reação', () => {
    const world = createWorld(), r = new EngineerRoutine({ ...world, movingCuboids: [] }), s = r.state;
    r.update(1/60, { x:s.x + 2, z:s.z });
    const x = s.x, z = s.z;
    r.update(1/60, { x:x + .75, z });
    assert.equal(s.animation, 'ShovedReaction');
    for (let f = 0; f < 60; f++) r.update(1/60, { x:x + .75, z });
    assert.equal(s.x, x); assert.equal(s.z, z);
    for (let f = 0; f < 5 * 60; f++) r.update(1/60, { x:x + .75, z });
    assert.equal(s.animation, 'Idle', 'não repete enquanto encostado');
    r.update(1/60, { x:x + 2, z }); r.update(1/60, { x:s.x + .75, z:s.z });
    assert.equal(s.animation, 'ShovedReaction', 'rearma depois de afastar');
});

test('Engenheiro: conversa interrompe tarefa, escolhe Yelling/Acknowledging e pausa congela', () => {
    const r = new EngineerRoutine({ ...createWorld(), movingCuboids: [] });
    for (let f = 0; f < 120; f++) r.update(1/60, far);
    const before = { x:r.state.x, z:r.state.z, phase:r.state.phase };
    r.update(1/60, far, true, false); assert.equal(r.state.animation, 'Yelling');
    for (let f = 0; f < 120; f++) r.update(1/60, far, true, true);
    assert.equal(r.state.animation, 'Acknowledging'); assert.equal(r.state.x, before.x); assert.equal(r.state.z, before.z); assert.equal(r.state.phase, before.phase);
    const paused = JSON.stringify(r.state); r.update(10, far, false, false, true); assert.equal(JSON.stringify(r.state), paused);
    for (let f = 0; f < 120; f++) r.update(1/60, far);
    assert.ok(Math.hypot(r.state.x-before.x,r.state.z-before.z) > .2);
    assert.equal(engineerIsCalm('campaign', false, true), false, 'prévia não desbloqueia campanha');
    assert.equal(engineerIsCalm('campaign', true, false), true);
    assert.equal(engineerIsCalm('development', false, null), true);
    assert.equal(engineerIsCalm('development', false, engineerPreviewMood('?engineerEden=0')), false);
});

test('Engenheiro: E valida mapa, distância e paredes; briefing avança uma vez só em campanha', () => {
    const values = new Map(); globalThis.localStorage = { getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,v) };
    const load = createSourceLoader(), { useExpeditionStore:s } = load('src/state/useExpeditionStore.ts'), { engineerPresence:p } = load('src/npcs/engineerPresence.ts');
    const { placePlayer } = load('src/state/playerTransient.ts');
    s.getState().enterCampaign({displayName:'QA',color:'#abcdef'}); const raw = values.get('exoden:campaign:v1');
    const world = createWorld(); Object.assign(p,{active:true,world,x:-6.1,y:0,z:6});
    s.getState().setReady(true); placePlayer({x:0,y:0,z:6}); s.getState().openEngineer(); assert.equal(s.getState().panel,null);
    placePlayer({x:-5,y:0,z:6}); s.getState().openEngineer(); assert.equal(s.getState().panel,'engineer');
    s.getState().closePanel(); assert.equal(s.getState().panel,'acquisition');
    s.getState().finishAcquisition('rifle'); s.getState().finishAcquisition('sonar');
    assert.equal(s.getState().panel,null); assert.notEqual(values.get('exoden:campaign:v1'),raw);
    const afterBriefing = values.get('exoden:campaign:v1');
    assert.equal(JSON.parse(afterBriefing).campaign.stage,'expedition-copper');
    Object.assign(p,{seated:true,approach:{x:-5,z:6}});
    s.getState().openEngineer(); assert.equal(s.getState().panel,null,'não levanta para falar sobre o jogador');
    placePlayer({x:-4,y:0,z:6}); s.getState().openEngineer(); assert.equal(s.getState().panel,'engineer','conversa com saída livre');
    s.getState().closePanel(); assert.equal(values.get('exoden:campaign:v1'),afterBriefing); p.seated=false; placePlayer({x:-5,y:0,z:6});
    world.obstacles.push({minX:-5.8,maxX:-5.6,minZ:4,maxZ:8}); s.getState().openEngineer(); assert.equal(s.getState().panel,null);
    s.getState().returnHome(); s.getState().start('Dev QA','#abcdef');
    const development=new Map(values);
    world.obstacles.pop(); s.getState().setReady(true); placePlayer({x:-5,y:0,z:6});
    s.getState().openEngineer(); assert.equal(s.getState().panel,'engineer'); s.getState().closePanel();
    assert.deepEqual(values,development,'conversa no desenvolvimento preserva hub/carga/campanha byte a byte');
    Object.assign(p,{active:false,world:null});
});

test('Engenheiro: cena real mantém visual fora do corpo e atualiza conversa sem step físico', async () => {
    const {clone}=await import('three/examples/jsm/utils/SkeletonUtils.js');
    const gltf=await loadGlb(file),load=createSourceLoader(),nativeRequire=createRequire(import.meta.url);
    let frame,layout,r;
    const Bubble=()=>null, previousWindow=globalThis.window;
    globalThis.window={location:{search:'?engineerEden=0'}};
    const filename=path.resolve('src/npcs/EngineerScene.tsx'),module={exports:{}};
    const code=ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true,module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
    const require=spec=>{
        if(spec==='react')return {useMemo:fn=>{const v=fn();if(v?.paths)r=v;return v;},useRef:()=>({current:null}),useLayoutEffect:fn=>{layout=fn;}};
        if(spec==='@react-three/fiber')return {useFrame:fn=>{frame=fn;}};
        if(spec==='@react-three/drei')return {useGLTF:()=>gltf};
        if(spec==='@react-three/rapier')return {RigidBody:'rigid-body',CapsuleCollider:'capsule',CuboidCollider:'cuboid'};
        if(spec==='three/examples/jsm/utils/SkeletonUtils.js')return {clone};
        if(spec.endsWith('/useCampaignStore')) { const actual=load('src/state/useCampaignStore.ts'); return {useCampaignStore:Object.assign(selector=>selector(actual.useCampaignStore.getState()),actual.useCampaignStore)}; }
        if(spec.endsWith('/InteractionBubble'))return {InteractionBubble:Bubble};
        if(spec.endsWith('.glb'))return 'engineer.glb';
        return spec.startsWith('.')?load(path.resolve(path.dirname(filename),spec)+'.ts'):nativeRequire(spec);
    };
    vm.runInThisContext('(function(require,module,exports){'+code+'\n})',{filename})(require,module,module.exports);
    const tree=module.exports.EngineerScene({world:{...createWorld(),movingCuboids:[]}}),children=React.Children.toArray(tree.props.children);
    const view=children.find(node=>node.type==='group'&&node.props.name==='EngenheiroVisual');
    const body=children.find(node=>node.type==='rigid-body'&&node.props.name==='Engenheiro');
    assert.ok(view&&body,'visual e corpo são irmãos no JSX real, sem herdar o step do corpo');
    const capsule=React.Children.toArray(body.props.children).find(node=>node.type==='capsule');
    const {PLAYER_COLLIDER_HALF_HEIGHT,PLAYER_MOVEMENT}=load('src/characters/player/playerConfig.ts');
    assert.deepEqual(capsule.props.args,[PLAYER_COLLIDER_HALF_HEIGHT,PLAYER_MOVEMENT.colliderRadius],'mesma cápsula do player');
    assert.ok(React.Children.toArray(view.props.children).some(node=>node.type===Bubble),'bolha acompanha o grupo visual');
    const placement=new Group();view.ref.current=placement;
    let commands=0;body.ref.current={setNextKinematicTranslation:()=>{commands++;}};
    const cleanup=layout();
    load('src/state/useExpeditionStore.ts').useExpeditionStore.setState({ready:true,panel:'engineer'});
    for(let f=0;f<200*60;f++) {
        r.update(1/60,far);
        if(r.state.animation==='Sitting' && r.state.seated===1) break;
    }
    frame(null,0); const seatedX=placement.position.x;
    for(let f=0;f<30;f++)frame(null,1/60);
    assert.ok(commands>0,'corpo recebe apenas comandos para o próximo step, sem simular Rapier neste teste');
    assert.equal(placement.position.x,r.state.x,'callback real posiciona o visual no apoio livre');
    assert.ok(Math.abs(placement.position.x-seatedX)>.8);
    assert.equal(r.state.animation,'Yelling');cleanup();globalThis.window=previousWindow;
});

test('Engenheiro: rig retoma o instante da transição após conversa e esbarrão', async () => {
    const { clone } = await import('three/examples/jsm/utils/SkeletonUtils.js');
    const { EngineerRig } = loadSource('src/npcs/engineerRig.ts');
    const g=await loadGlb(file);
    for(const phase of ['crouch-down','stand-up']) for(const interruption of ['conversation','bump']) {
        const r=new EngineerRoutine({...createWorld(),movingCuboids:[]}),rig=new EngineerRig(clone(g.scene),g.animations);
        for(let f=0;f<100*60;f++) {
            r.update(1/60,far); rig.update(r.state,1/60);
            if(r.state.phase===phase && r.state.clipTime>2.1 && r.state.clipTime<2.3) break;
        }
        assert.equal(r.state.phase,phase); const time=r.state.clipTime;
        if(interruption==='conversation') {
            for(let f=0;f<60;f++){r.update(1/60,far,true,false);rig.update(r.state,1/60);}
        } else {
            const player={x:r.position.x+.75,z:r.position.z};
            r.update(1/60,player); rig.update(r.state,1/60);
            assert.equal(r.state.animation,'ShovedReaction');
            for(let f=0;f<300;f++){
                r.update(1/60,player);rig.update(r.state,1/60);
                if(r.state.animation!=='ShovedReaction') break;
            }
        }
        r.update(1/60,far); rig.update(r.state,1/60);
        assert.ok(Math.abs(rig.actions.get(r.state.animation).time-time)<.08,`${phase}/${interruption}: clipe retoma ${time}`);
        rig.dispose();
    }
});

test('Interação móvel: balão e E leem a posição atual, sem registro por passo', () => {
    const { InteractionRegistry } = loadSource('src/interactions/interactionRegistry.ts'), registry = new InteractionRegistry(), point = { x:0,z:0 };
    let calls=0; const target={id:'engineer',x:0,z:0,point,radius:2,priority:30,onInteract:()=>calls++};
    const release=registry.register(target); assert.equal(registry.activate({x:1,z:0}),true);
    point.x=10; assert.equal(registry.activate({x:1,z:0}),false); assert.equal(registry.activate({x:9,z:0}),true); assert.equal(calls,2);
    release(); assert.equal(registry.select({x:9,z:0}),null);
});

test('Engenheiro: mixer e materiais próprios, descarte sem invalidar geometria compartilhada', async () => {
    const { clone } = await import('three/examples/jsm/utils/SkeletonUtils.js');
    const { EngineerRig } = loadSource('src/npcs/engineerRig.ts');
    const g = await loadGlb(file), a = new EngineerRig(clone(g.scene), g.animations), b = new EngineerRig(clone(g.scene), g.animations);
    const meshes = root => { const out=[]; root.traverse(o=>{if(o.isSkinnedMesh)out.push(o);}); return out; };
    const source=meshes(g.scene)[0], own=meshes(a.root)[0], second=meshes(b.root)[0];
    assert.notEqual(own.material, source.material); assert.notEqual(own.material, second.material); assert.equal(own.geometry, source.geometry);
    const state = { ...ENGINEER.start, y:0, angle:.5, phase:'walk', animation:'Yelling', moving:false, cycles:0 };
    for (let i=0;i<60;i++) a.update(state,1/60);
    assert.ok(a.actions.get('Yelling').time > .9); assert.equal(b.actions.get('Yelling').time,0);
    const frozen=a.actions.get('Yelling').time; a.update(state,0); assert.equal(a.actions.get('Yelling').time,frozen);
    let geometryDisposed=0, materialDisposed=0, boneTextureDisposed=0, sourceBoneDisposed=0;
    assert.notEqual(own.skeleton, source.skeleton);
    own.skeleton.computeBoneTexture(); source.skeleton.computeBoneTexture();
    own.skeleton.boneTexture.addEventListener('dispose',()=>boneTextureDisposed++);
    source.skeleton.boneTexture.addEventListener('dispose',()=>sourceBoneDisposed++);
    source.geometry.addEventListener('dispose',()=>geometryDisposed++); own.material.addEventListener('dispose',()=>materialDisposed++);
    a.dispose(); a.dispose(); assert.equal(materialDisposed,1); assert.equal(geometryDisposed,0);
    assert.equal(boneTextureDisposed,1); assert.equal(sourceBoneDisposed,0);
    b.dispose(); source.skeleton.dispose();
});
