/** Mede só apoio VISUAL no solo exportado; não cria nem altera colisores. */
import fs from 'node:fs';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { Matrix3, Raycaster, Vector3 } from 'three';
import { loadGlb } from '../../tests/load-glb.mjs';
import { loadSource } from '../../tests/load-source.mjs';
const hash=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
const source='src/assets/colony-v007.glb',{createWorld}=loadSource('src/game/marsWorld.ts'),world=createWorld();
const {perimeterLightPositions}=loadSource('src/scene/marsColony/perimeterLights.ts');
const g=await loadGlb(source),ground=g.scene.getObjectByName('TER_Solo');
if(!ground)throw new Error('TER_Solo ausente');g.scene.updateMatrixWorld(true);
const ray=new Raycaster(),origin=new Vector3(),down=new Vector3(0,-1,0),normal=new Vector3(),matrix=new Matrix3().getNormalMatrix(ground.matrixWorld);
const positions=perimeterLightPositions(world.walkableAreas,world.obstacles).map(p=>{
    origin.set(p.x,20,p.z);ray.set(origin,down);const hit=ray.intersectObject(ground,true)[0];
    if(!hit?.face)throw new Error(`Sem areia em ${p.x}/${p.z}`);
    normal.copy(hit.face.normal).applyMatrix3(matrix).normalize();if(normal.y<0)normal.negate();
    return {...p,y:+hit.point.y.toFixed(7),normal:normal.toArray().map(v=>+v.toFixed(7))};
});
const report={generator:'scripts/arte/gerar-balizas-marte.mjs',generatorSha256:hash(fs.readFileSync(fileURLToPath(import.meta.url))),source,sourceSha256:hash(fs.readFileSync(source)),layoutSha256:hash(JSON.stringify({areas:world.walkableAreas,obstacles:world.obstacles})),positions};
fs.writeFileSync('src/assets/colony-perimeter-lights.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({count:positions.length,minY:Math.min(...positions.map(p=>p.y)),maxY:Math.max(...positions.map(p=>p.y))}));
