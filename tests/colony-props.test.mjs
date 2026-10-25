import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { Group, Mesh, BoxGeometry, MeshStandardMaterial } from 'three';

test('S6.12: props exportados não têm área coplanar sobreposta, incluindo caixas, rótulos e bases', async () => {
 const {coplanarProps}=await import('../scripts/lib/colony-geometry.mjs');
 const {GLTFLoader}=await import('three/examples/jsm/loaders/GLTFLoader.js');
 const bytes=fs.readFileSync('src/assets/colony-v006.glb');
 const {scene}=await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
 const report=coplanarProps(scene);
 assert.equal(report.props,132);
 assert.equal(report.trianglePairs,0,JSON.stringify(report.pairs));
 // A auditoria diferencia uma junta legítima de uma face sobreposta de área positiva.
 const a=new Group();a.userData.colony_name='PROP_Auditoria';a.name='PROP_Auditoria';
 a.add(new Mesh(new BoxGeometry(1,1,1),new MeshStandardMaterial()));
 const group=new Group();group.add(a);
 const b=a.children[0].clone();a.add(b);
 assert.ok(coplanarProps(group).trianglePairs>0);
 b.position.x=1;assert.equal(coplanarProps(group).trianglePairs,0);
});

test('S6.12: molduras de porta não dividem plano com a parede (z-fighting dos batentes verdes)', async () => {
 // Causa documentada em scripts/colony_arch_geometry.py: batente, verga e portal tinham
 // faces nos mesmos planos do painel/vidro da parede; com DoubleSide, a cor alternava
 // verde/bege conforme a câmera seguia o jogador.
 const {coplanarDoorFrames,isDoorFrame}=await import('../scripts/lib/colony-geometry.mjs');
 const {GLTFLoader}=await import('three/examples/jsm/loaders/GLTFLoader.js');
 const bytes=fs.readFileSync('src/assets/colony-v006.glb');
 const {scene}=await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
 const report=coplanarDoorFrames(scene);
 assert.equal(report.parts,91);
 assert.equal(report.trianglePairs,0,JSON.stringify(report.pairs));
 assert.ok(isDoorFrame('ARQ_Hub_Porta_S')&&isDoorFrame('ARQ_Hub_Porta_S_Verga')&&isDoorFrame('ARQ_Laboratorio_Portal_L'));
 assert.ok(!isDoorFrame('ARQ_Laboratorio_Porta_Folhas')&&!isDoorFrame('ARQ_Hub_Parede_S_1'));
 // A auditoria pega o defeito original: batente rente ao painel de outra cor.
 const wall=new Group();wall.userData.colony_name='ARQ_Teste_Parede_S_1';
 wall.add(new Mesh(new BoxGeometry(3,2,0.28),new MeshStandardMaterial({name:'M_Painel'})));
 const frame=new Group();frame.userData.colony_name='ARQ_Teste_Porta_S';
 const post=new Mesh(new BoxGeometry(0.2,2,0.28),new MeshStandardMaterial({name:'M_Estrutura'}));post.position.x=-1.4;frame.add(post);
 const group=new Group();group.add(wall,frame);
 assert.ok(coplanarDoorFrames(group).trianglePairs>0);
 post.scale.set(1.02,1.02,1.02);assert.equal(coplanarDoorFrames(group).trianglePairs,0);
});

test('estufa v001: geometria real sem faces coplanares nos dois estados; vidros separados por pelo menos 2 mm', async () => {
 const {auditGreenhouse,collectGreenhouseTriangles,greenhouseCoplanarity,triangleDistanceSquared}=await import('../scripts/validate-greenhouse-geometry.mjs');
 const report=await auditGreenhouse();
 assert.equal(report.coplanarity.pairs.length,0,JSON.stringify(report.coplanarity.pairs));
 assert.equal(report.clearance.interfaces.length,39*7,'todas as 39 placas contra os sete conjuntos estruturais');
 assert.equal(report.clearance.failures.length,0,JSON.stringify(report.clearance.failures));
 // Testemunhas: peças ocultas e normais invertidas também contam na auditoria.
 const root=new Group(),a=new Mesh(new BoxGeometry(1,1,1),new MeshStandardMaterial());a.userData.id_estavel='teste';root.add(a);const b=a.clone();b.visible=false;root.add(b);
 assert.ok(greenhouseCoplanarity(collectGreenhouseTriangles(root).triangles).trianglePairs>0);
 const tri=[[0,0,0],[1,0,0],[0,1,0]];
 assert.ok(Math.abs(triangleDistanceSquared(tri,tri.map(([x,y,z])=>[x,y,z+.002]))-.002**2)<1e-10);
});

test('estufa v001: implantação oeste, contagens, colisores simples constantes e corredor acessível', async () => {
 const {loadSource}=await import('./load-source.mjs');
 const {createWorld}=loadSource('src/game/marsWorld.ts'),{circleIntersectsRect}=loadSource('src/utils/math.ts');
 const manifest=JSON.parse(fs.readFileSync('src/assets/greenhouse/greenhouse-v001.manifest.json'));
 const colony=JSON.parse(fs.readFileSync('src/assets/colony-v007.manifest.json'));
 assert.deepEqual(manifest.position,{x:14,z:22.5});assert.deepEqual(manifest.size,{width:11,depth:7});assert.equal(manifest.entrance,'west');assert.equal(manifest.initialState,'OFFLINE');
 for(const [key,value]of Object.entries({ribs:5,bays:4,lowerPlanters:8,upperPlanters:4,growBars:8}))assert.equal(manifest.stats[key],value,key);
 assert.equal(manifest.colliders.length,8);assert.equal(colony.parts.some(p=>p.ambiente==='orbit-garden'),false);assert.equal(colony.doors.some(d=>d.owner==='orbit-garden'),false);
 const world=createWorld(),radius=.36;
 // Toda a faixa útil da porta e o eixo até o fundo, incluindo piso sob a esfera do jogador.
 for(let x=7.5;x<=18.6;x+=.1)for(let z=22.5-.7;z<=22.5+.7;z+=.1){
  assert.ok(!world.obstacles.some(b=>circleIntersectsRect(x,z,radius,b)),`colisão no corredor ${x},${z}`);
  for(const dx of[-radius,0,radius])for(const dz of[-radius,0,radius])assert.ok(world.walkableAreas.some(b=>x+dx>=b.minX&&x+dx<=b.maxX&&z+dz>=b.minZ&&z+dz<=b.maxZ),`falta piso ${x},${z}`);
 }
 for(const col of manifest.colliders)assert.ok(world.obstacles.some(b=>['minX','maxX','minZ','maxZ'].every(k=>b[k]===col[k])),col.id);
});
