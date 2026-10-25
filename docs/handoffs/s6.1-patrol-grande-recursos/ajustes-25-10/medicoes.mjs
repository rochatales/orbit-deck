// Reproduzir da raiz da worktree S2.12 B. Ensaio de parâmetros futuros, sem mutar COMBAT.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {AnimationMixer,LoopOnce,Box3,Vector3} from 'three';
import {loadSource} from '../../../../tests/load-source.mjs';
import {loadGlb} from '../../../../tests/load-glb.mjs';
const {Navigation,traversable,clearSegment,smoothPath}=loadSource('src/combat/navigation.ts');
const {hordeEdgeSpawns}=loadSource('src/combat/simulation.ts');
const {COMBAT}=loadSource('src/combat/config.ts');
const {PATROL_UNIT}=loadSource('src/combat/patrolUnit.ts');
const {createPhase01Terrain,SHANGHAI_PHASE01:d}=loadSource('src/game/shanghai/layout.ts');
const radius=.67,contactRange=1.07,terrain=createPhase01Terrain(),nav=new Navigation(terrain,radius,COMBAT.grid);
function route(start){
 const points=nav.path(start,d.exit);let previous=start,segments=0,valid=points.length>0&&traversable(start,terrain,radius);
 for(const p of points){valid&&=traversable(p,terrain,radius)&&clearSegment(previous,p,terrain,radius);previous=p;segments++;}
 const distance=points.length?Math.hypot(previous.x-d.exit.x,previous.z-d.exit.z):Infinity;
 const smoothed=smoothPath(start,[...points],terrain,radius);let smoothPrevious=start;
 for(const p of smoothed){valid&&=clearSegment(smoothPrevious,p,terrain,radius);smoothPrevious=p;}
 return{valid:valid&&distance<=contactRange+1e-8,segments,end:{...previous},distance};
}
const spawns=d.spawns.map((p,index)=>({index,...route(p)})),candidates=hordeEdgeSpawns(terrain,nav,d.exit,radius,contactRange),perimeter=candidates.map((p,index)=>({index,...p,...route(p)}));
assert.equal(spawns.filter(p=>p.valid).length,32);assert.equal(candidates.length,272);assert.ok(perimeter.every(p=>p.valid));
const fake={path:()=>[{x:0,z:-100}]};assert.equal(hordeEdgeSpawns(terrain,fake,d.exit,radius,contactRange).length,0);
const navigation={radius,contactRange,grid:COMBAT.grid,nodes:nav.points.length,obstacles:terrain.obstacles.length,arrivalFree:traversable(d.exit,terrain,radius),spawnsValid:spawns.filter(p=>p.valid).length,spawnsTotal:spawns.length,candidatesValid:perimeter.filter(p=>p.valid).length,candidatesTotal:perimeter.length,checkedSegments:perimeter.reduce((s,p)=>s+p.segments,0),maxContactDistance:Math.max(...spawns.map(p=>p.distance),...perimeter.map(p=>p.distance)),invalidCandidateRejected:true,spawns,perimeter};
const g=await loadGlb('src/assets/enemies/patrol-unit.glb');g.scene.scale.setScalar(PATROL_UNIT.scale);const mixer=new AnimationMixer(g.scene),point=new Vector3(),bounds=new Box3(),alive={};
function envelope(){g.scene.updateMatrixWorld(true);bounds.makeEmpty();g.scene.traverse(mesh=>{if(!mesh.isSkinnedMesh)return;mesh.skeleton.update();for(let i=0;i<mesh.geometry.attributes.position.count;i++){mesh.getVertexPosition(i,point).applyMatrix4(mesh.matrixWorld);bounds.expandByPoint(point);}});return{minY:bounds.min.y,maxY:bounds.max.y,width:bounds.max.x-bounds.min.x,height:bounds.max.y-bounds.min.y};}
const rest=envelope();
for(const name of ['Idle','PatrolWalk','AggressiveLunge','ShockAttack']){
 mixer.stopAllAction();const clip=g.animations.find(c=>c.name===name),a=mixer.clipAction(clip);a.reset().setLoop(LoopOnce,1).play();a.clampWhenFinished=true;let minY=Infinity,maxY=-Infinity;
 const frames=Math.ceil(clip.duration*60);for(let frame=0;frame<=frames;frame++){mixer.setTime(Math.min(clip.duration,frame/60));const e=envelope();minY=Math.min(minY,e.minY);maxY=Math.max(maxY,e.maxY);}
 alive[name]={duration:clip.duration,minY,maxY,samples:frames+1};
}
const report={base:'26fcb0f',method:'Rotas: ARES-I real, raio 0,67 e contato 1,07, todos os segmentos brutos/suavizados. Envelope: GLB real skinado, vértices em mundo a 60 Hz, escala 2,24/1,49; texturas omitidas só em memória.',runtimeRadiusUnchanged:COMBAT.robot.radius,navigation,visual:{nominalHeight:PATROL_UNIT.height,scale:PATROL_UNIT.scale,rest,alive,minY:Math.min(...Object.values(alive).map(p=>p.minY)),maxY:Math.max(...Object.values(alive).map(p=>p.maxY))}};
assert.ok(report.visual.maxY<2.31);assert.ok(Math.abs(rest.height-2.24)<.001);assert.ok(Math.abs(rest.width-1.50)<.005);
assert.equal(COMBAT.robot.radius,.42);fs.writeFileSync('docs/handoffs/s6.1-patrol-grande-recursos/ajustes-25-10/medicoes.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({...report,navigation:{...navigation,spawns:undefined,perimeter:undefined}},null,2));
