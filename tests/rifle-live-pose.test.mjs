import test from 'node:test';
import assert from 'node:assert/strict';
import { AnimationMixer, Group, OrthographicCamera, Plane, Raycaster, Vector2, Vector3 } from 'three';
import { loadGlb } from './load-glb.mjs';
import { loadSource } from './load-source.mjs';
const { attachRifle, RifleAimRig } = loadSource('src/characters/player/rifleAttachment.ts');
const { writeRifleMuzzle, patrolChoice } = loadSource('src/combat/config.ts');
const { CombatSimulation } = loadSource('src/combat/simulation.ts');
const state = loadSource('src/state/playerWeaponPose.ts');
const close = (a,b,tol=1e-5) => assert.ok(Math.abs(a-b)<tol,`${a} != ${b}`);
async function setup() {
    const g=await loadGlb('src/assets/characters/player/explorador-astronauta.glb'),r=await loadGlb('src/assets/weapons/rifle-laser-v001.glb');
    attachRifle(g.scene,r.scene);
    const body=new Group();body.add(g.scene);
    return {g,body,mixer:new AnimationMixer(g.scene),rig:new RifleAimRig(g.scene,r.scene,.02)};
}
function play(s,name){s.mixer.stopAllAction();s.mixer.clipAction(s.g.animations.find(c=>c.name===name)).play();}

test('Mira viva: tronco alinha cano e alvo parado; boca real rege XYZ em todos os giros',async()=>{
    const s=await setup();play(s,'Aim_Rifle');
    const out={valid:false,side:0,forward:0,height:0},player={x:7,y:.12,z:-4},physical={x:0,z:0};
    for(const angle of [0,.4,Math.PI/2,Math.PI,-Math.PI+.01])for(const time of [0,.15,.3,.5]){
        s.body.position.set(player.x+10,player.y+.02,player.z-20);s.body.rotation.y=angle;
        s.mixer.setTime(time);
        const aim={x:player.x+Math.sin(angle)*12,z:player.z+Math.cos(angle)*12};
        s.rig.update(out,player,angle,aim,true);assert.equal(out.valid,true);
        const muzzle=s.rig.muzzle.getWorldPosition(new Vector3()),dir=s.rig.muzzle.getWorldDirection(new Vector3());
        const target=new Vector3(aim.x+10,muzzle.y,aim.z-20).sub(muzzle).normalize();
        assert.ok(dir.dot(target)>.99999,`alinhamento ${dir.dot(target)}`);
        close(dir.y,0,.002);
        writeRifleMuzzle(physical,player.x,player.z,angle,out);
        close(physical.x,muzzle.x-10);close(physical.z,muzzle.z+20);
        close(player.y+out.height,muzzle.y);
    }
});

test('Mira viva: corrida armada usa a boca animada, com calçada e sem contaminar pela interpolação',async()=>{
    const s=await setup();play(s,'Run');
    const player={x:-3,y:.25,z:5},angle=.8,out={valid:false,side:0,forward:0,height:0},physical={x:0,z:0};
    s.body.position.set(20,player.y+.02,40);s.body.rotation.y=angle;
    let min=Infinity,max=-Infinity;
    for(let f=0;f<21;f++){
        s.mixer.setTime(f/30);s.rig.update(out,player,angle,null,false);
        const m=s.rig.muzzle.getWorldPosition(new Vector3());writeRifleMuzzle(physical,player.x,player.z,angle,out);
        close(physical.x,m.x-23);close(physical.z,m.z-35);close(player.y+out.height,m.y);
        min=Math.min(min,out.height);max=Math.max(max,out.height);
    }
    // A boca segue o ciclo natural (~4 cm); o degrau antigo do Hips acrescentava ~11 cm.
    assert.ok(max-min>.02 && max-min<.05,'boca animada, sem offset fixo nem salto do corpo');
});

test('Mira viva: retícula e raycaster compartilham o plano da boca em rua/calçada/canteiro/grama',()=>{
    const camera=new OrthographicCamera(-12,12,8,-8,.1,200);camera.position.set(18,14,18);camera.lookAt(0,.55,0);camera.updateProjectionMatrix();camera.updateMatrixWorld();
    const ray=new Raycaster(),plane=new Plane(new Vector3(0,1,0)),result=new Vector3();
    for(const floor of[0,.12,.148,.25]){
        Object.assign(state.playerWeaponPose,{valid:true,side:.1,forward:.7,height:1.12});
        const height=state.weaponShotHeight(floor,1.09),target=new Vector3(2,height,-3),pixel=target.clone().project(camera);
        plane.constant=-height;ray.setFromCamera(new Vector2(pixel.x,pixel.y),camera);ray.ray.intersectPlane(plane,result);
        assert.ok(target.distanceTo(result)<1e-6);
    }
    state.resetPlayerWeaponPose();close(state.weaponShotHeight(.25,1.09),1.09);
});

const b={minX:-15,maxX:15,minZ:-15,maxZ:15};
function fire({height=1.15,floor=0,maxY,kind='smallMutant'}={}){
    const terrain={bounds:b,walkableAreas:[b],obstacles:maxY===undefined?[]:[{minX:-1,maxX:1,minZ:.3,maxZ:.4,minY:0,maxY}],surfaceHeight:()=>floor};
    const s=new CombatSimulation(terrain,patrolChoice(kind,1));Object.assign(s.robots[0],{kind,x:0,z:4,hp:50});
    const muzzle={valid:true,side:0,forward:.7,height};
    s.step(1/60,{player:{x:0,y:floor,z:0},muzzle,aim:{x:0,z:8},facingAngle:0,firing:true,reload:false});return s;
}
test('Mira viva: disparo, clarão e impacto usam boca real e mesma altura; sólido centro→cano continua válido',()=>{
    const clear=fire();assert.deepEqual(clear.shots[0].from,{x:0,z:.7});close(clear.shots[0].height,1.15);
    assert.equal(clear.robots[0].hp,25);close(clear.effects.muzzle.x,0);close(clear.effects.muzzle.z,.7);close(clear.effects.muzzle.y,1.15);
    assert.ok(clear.effects.particles.filter(p=>p.life>0).every(p=>p.y===1.15));
    const blocked=fire({maxY:1.15});assert.equal(blocked.robots[0].hp,50);assert.deepEqual(blocked.shots[0].from,{x:0,z:0});close(blocked.shots[0].to.z,.3);
    const below=fire({maxY:1.15-1e-6});assert.equal(below.robots[0].hp,25);
    const raised=fire({floor:.25});assert.equal(raised.robots[0].hp,25);close(raised.shots[0].height,1.4);
    const high=fire({height:1.21,floor:.25});assert.equal(high.robots[0].hp,50,'tiro acima do envelope elevado não acerta');
});

test('Mira viva: retry/viagem invalidam a amostra, sem reaproveitar pose da rodada anterior',()=>{
    const {placePlayer}=loadSource('src/state/playerTransient.ts');
    Object.assign(state.playerWeaponPose,{valid:true,side:20,forward:50,height:5});
    placePlayer({x:0,y:0,z:9.5});assert.equal(state.playerWeaponPose.valid,false);
});

test('Mira viva: disparo perto/atrás usa direção segura, sem inverter o cano',()=>{
    const {writeRifleAimTarget}=loadSource('src/combat/config.ts');
    const player={x:0,z:0},muzzle={x:.2,z:.7},out={x:0,z:0};
    for(const aim of[{x:0,z:0},{x:0,z:.5},{x:-2,z:-3}]){
        writeRifleAimTarget(out,player,aim,0,muzzle);
        close(out.x,muzzle.x);close(out.z,muzzle.z+1);
    }
    writeRifleAimTarget(out,player,{x:3,z:10},0,muzzle);assert.deepEqual(out,{x:3,z:10});
});
