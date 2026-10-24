import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {Box3,Vector3,Raycaster,DoubleSide} from 'three';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';
const {loadSource}=await import(pathToFileURL(process.cwd()+'/tests/load-source.mjs'));
const {applyColonyLayout,MARS_CONSOLE_WEST_COLLIDER}=loadSource('src/scene/marsColony/layout.ts');
const {MARS_ARES}=loadSource('src/game/marsLanding.ts');
async function read(file){const b=fs.readFileSync(file);return {scene:(await new GLTFLoader().parseAsync(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),'')).scene,sha256:createHash('sha256').update(b).digest('hex')};}
const colony=await read('src/assets/colony-v006.glb'),deck=await read('src/assets/ares-mars/deck-mars.glb');
const original=colony.scene.clone(true);applyColonyLayout(colony.scene);
deck.scene.position.set(MARS_ARES.deck.x,MARS_ARES.deck.y,MARS_ARES.deck.z);deck.scene.updateMatrixWorld(true);
function info(scene,name){const n=scene.getObjectByName(name),b=new Box3().setFromObject(n);return {min:b.min.toArray(),max:b.max.toArray(),center:b.getCenter(new Vector3()).toArray(),size:b.getSize(new Vector3()).toArray(),rotation:n.rotation.toArray()};}
const names=['PLAT_Console_Oeste','PLAT_Console_Leste','PLAT_Rack_Cilindros','PROP_Tanques'];
const before=Object.fromEntries(names.map(n=>[n,info(original,n)])),after=Object.fromEntries(names.map(n=>[n,info(colony.scene,n)]));
// Recorta triângulos reais na faixa da pegada, evitando perder arestas sem vértice na faixa.
function clip(poly,axis,bound,sign){const out=[];for(let i=0;i<poly.length;i++){
 const a=poly[i],b=poly[(i+1)%poly.length],ia=sign*(a[axis]-bound)>=-1e-10,ib=sign*(b[axis]-bound)>=-1e-10;
 if(ia)out.push(a);if(ia!==ib){const t=(bound-a[axis])/(b[axis]-a[axis]);out.push({x:a.x+(b.x-a.x)*t,z:a.z+(b.z-a.z)*t});}
}return out;}
function bandExtent(axis,min,max,resultAxis,extreme){let value=extreme==='min'?Infinity:-Infinity;
 deck.scene.traverse(n=>{if(!n.isMesh)return;const pos=n.geometry.attributes.position,idx=n.geometry.index;
 for(let i=0;i<(idx?idx.count:pos.count);i+=3){let poly=[];for(let k=0;k<3;k++){
  const p=new Vector3().fromBufferAttribute(pos,idx?idx.getX(i+k):i+k).applyMatrix4(n.matrixWorld);poly.push({x:p.x,z:p.z});
 }poly=clip(clip(poly,axis,min,1),axis,max,-1);for(const p of poly)value=extreme==='min'?Math.min(value,p[resultAxis]):Math.max(value,p[resultAxis]);}
 });return value;
}
const west=after.PLAT_Console_Oeste,east=after.PLAT_Console_Leste;
const deckSouthAtWest=bandExtent('x',west.min[0],west.max[0],'z','min');
const deckEastAtConsole=bandExtent('z',east.min[2],east.max[2],'x','max');
const rack=after.PLAT_Rack_Cilindros;
const deckWestAtRack=bandExtent('z',rack.min[2],rack.max[2],'x','min');
original.updateMatrixWorld(true);
const pipe=original.getObjectByName('PROP_Tanques_2'),vertices=pipe.geometry.attributes.position,tipBox=new Box3();
const pipeEndX=new Box3().setFromObject(pipe).max.x;
for(let i=0;i<vertices.count;i++){
 const p=new Vector3().fromBufferAttribute(vertices,i).applyMatrix4(pipe.matrixWorld);
 if(Math.abs(p.x-pipeEndX)<1e-6)tipBox.expandByPoint(p);
}
const tip=tipBox.getCenter(new Vector3()),cylinders=[];
colony.scene.getObjectByName('PLAT_Rack_Cilindros').traverse(n=>{
 if(n.isMesh&&['M_Painel','M_Foguete_Casco'].includes(n.material.name)){
  n.material=n.material.clone();n.material.side=DoubleSide;cylinders.push(n);
 }
});
const pipeInsideCylinder=[-1,1].map(sign=>new Raycaster(tip,new Vector3(sign,0,0)).intersectObjects(cylinders,false)[0]?.distance??null);
// A clonagem pode normalizar −0 da rotação para 0; geometria/transformação são iguais.
assert.equal(JSON.stringify(after.PROP_Tanques),JSON.stringify(before.PROP_Tanques));
assert.ok(deckWestAtRack-rack.max[0]>=.05);
assert.ok(pipeInsideCylinder.every(d=>d!==null&&d>0&&d<.24),'ponta dentro do primeiro cilindro, testada nos dois sentidos de X');
const report={colonySha256:colony.sha256,deckSha256:deck.sha256,before,after,collider:{...MARS_CONSOLE_WEST_COLLIDER},
 deckSouthAtWest,deckEastAtConsole,westDeckGap:deckSouthAtWest-west.max[2],eastDeckGap:east.min[0]-deckEastAtConsole,
 westAccessGap:-2-west.max[0],westBoardingGap:Math.hypot(-west.max[0],29.5-west.max[2]),
 rack:{center:rack.center,bounds:{min:rack.min,max:rack.max},deckWestAtRack,deckGap:deckWestAtRack-rack.max[0],pipeTip:tip.toArray(),pipeInsideCylinder,largeTanksUnchanged:true,tubeMoved:false},
 floorTopY:0,westBottomY:west.min[1],method:'Faixas da pegada recortadas contra todos os triângulos do GLB real do deck; só leitura, sem usar malha na física.'};
assert.ok(report.westDeckGap>=.5);assert.ok(report.eastDeckGap>=.4);
assert.ok(report.westAccessGap>=.5);assert.ok(report.westBoardingGap>=.5);
assert.equal(report.westBottomY,report.floorTopY);
fs.writeFileSync(new URL('medidas.json',import.meta.url),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
