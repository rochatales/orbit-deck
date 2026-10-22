import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { Box3 } from 'three';
import { loadSource } from './load-source.mjs';
const { addMarsLanding, MARS_ARES } = loadSource('src/game/marsLanding.ts');
const { prepareAresVisual } = loadSource('src/game/aresVisual.ts');
const { ARES_COLLIDERS } = loadSource('src/game/aresCollisions.ts');
const { MAPS } = loadSource('src/game/config.ts');
const { circleIntersectsRect } = loadSource('src/utils/math.ts');
async function readAsset(path) {
 const bytes=fs.readFileSync(path);
 return (await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'')).scene;
}
test('Marte ARES: mesma nave, sem impacto urbano, marcador no desembarque e deck plano',async()=>{
 const scene=await readAsset('src/assets/ares-lander/ares-lander.glb');
 prepareAresVisual(scene,{position:MARS_ARES.position,name:'MarsARES',impact:false});
 let shipTriangles=0,impactVisible=0;
 scene.traverse(n=>{if(!n.isMesh)return;if(n.userData.conjunto==='nave')shipTriangles+=n.geometry.index.count/3;else if(n.visible)impactVisible++;});
 assert.equal(shipTriangles,98202);assert.equal(impactVisible,0);
 assert.deepEqual({...MARS_ARES.boarding},{...MAPS.mars.exit});
 assert.ok(Math.abs(scene.position.x-.72)<1e-9);
 assert.ok(Math.abs(scene.position.z-4.02-MAPS.mars.exit.z)<1e-9);
 const bytes=fs.readFileSync('src/assets/ares-mars/deck-mars.glb');
 const manifest=JSON.parse(fs.readFileSync('src/assets/ares-mars/manifesto.json'));
 assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),manifest.glb_sha256);
 const deck=await readAsset('src/assets/ares-mars/deck-mars.glb'),ids=new Set();let triangles=0;
 deck.traverse(n=>{assert.ok(!n.isLight&&!n.isCamera);if(!n.isMesh)return;assert.ok(n.userData.id_estavel&&!ids.has(n.userData.id_estavel));ids.add(n.userData.id_estavel);triangles+=n.geometry.index.count/3;});
 assert.equal(ids.size,8);assert.equal(triangles,37828);
 const box=new Box3().setFromObject(deck);
 assert.ok(box.min.x>=-6.1&&box.max.x<=6.1);
 assert.ok(box.min.z>=-8.1&&box.max.z<=6.1);
 assert.ok(box.max.y<.05,'piso não enterra os pés nem exige subir degraus no controller');
});
test('Marte ARES: área caminhável fica dentro do octógono e acesso/contorno ficam livres',()=>{
 const world={obstacles:[],walkableAreas:[]};addMarsLanding(world);
 assert.equal(world.obstacles.length,ARES_COLLIDERS.length);
 for(const r of world.walkableAreas.slice(1))for(const x of [r.minX,r.maxX])for(const z of [r.minZ,r.maxZ]){
  assert.ok(Math.abs(x)<=6&&Math.abs(z-33)<=6);
  assert.ok(Math.abs(x)+Math.abs(z-33)<=9.75+1e-9);
 }
 const onFloor=(x,z)=>world.walkableAreas.some(r=>x>=r.minX&&x<=r.maxX&&z>=r.minZ&&z<=r.maxZ);
 for(const z of [25,26,27,28,29.5]){assert.ok(onFloor(0,z));assert.ok(!world.obstacles.some(r=>circleIntersectsRect(0,z,.42,r)));}
 for(const [x,z] of [[-4,33],[5.5,33],[0,37],[3.5,38.5]])assert.ok(onFloor(x,z)&&!world.obstacles.some(r=>circleIntersectsRect(x,z,.36,r)));
 for(const [x,z] of [[6.3,33],[5.9,38.9],[-5.9,27.1]])assert.equal(onFloor(x,z),false);
});
