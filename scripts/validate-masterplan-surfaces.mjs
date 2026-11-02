import fs from 'node:fs';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { coplanarParts } from './lib/colony-geometry.mjs';
async function read(path){const b=fs.readFileSync(path);return(await new GLTFLoader().parseAsync(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),'')).scene;}
const scene=await read('src/assets/colony-v007.glb');
const deck=await read('src/assets/ares-mars/deck-mars.glb');deck.position.z=33;
deck.traverse(n=>{if(n.isMesh)n.userData.colony_name='ARES_'+n.name;});scene.add(deck);
scene.add(await read('src/assets/greenhouse/greenhouse-v001.glb'));
const result=coplanarParts(scene,name=>!name.startsWith('TER_'));
// The approved ARES asset is unchanged. Audit new geometry and its seam with the approved deck.
const pairs=result.pairs.filter(p=>!p.parts.every(n=>n.startsWith('ARES_'))&&p.projectedArea>=1e-5);
const report={method:'Sobreposição positiva de triângulos coplanares com mesma orientação; tolerância 10 mm² por par de peças; terreno excluído',triangles:result.triangles,partPairs:pairs.length,trianglePairs:pairs.reduce((n,p)=>n+p.trianglePairs,0),pairs};
fs.writeFileSync(process.argv[2]??'art-source/mars-masterplan-v007/notas/coplanaridade.json',JSON.stringify(report,null,2));
console.log(JSON.stringify({triangles:report.triangles,partPairs:report.partPairs,trianglePairs:report.trianglePairs,pairs:pairs.slice(0,15)},null,2));
if(pairs.length)process.exitCode=1;
