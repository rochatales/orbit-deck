import {loadSource} from '../../tests/load-source.mjs';
import fs from 'node:fs';
const {Navigation}=loadSource('src/combat/navigation.ts');
const {createPhase01Terrain,SHANGHAI_PHASE01:d}=loadSource('src/game/shanghai/layout.ts');
const w=createPhase01Terrain(),t=performance.now(),nav=new Navigation(w,.42,.5),constructMs=performance.now()-t;
const waves=[];for(let i=0;i<4;i++){
 const times=[];for(const p of d.spawns){const t=performance.now();nav.path(p,{x:d.exit.x+i*.1,z:d.exit.z});times.push(performance.now()-t);}
 waves.push({totalMs:times.reduce((a,b)=>a+b,0),maxPathMs:Math.max(...times),meanPathMs:times.reduce((a,b)=>a+b,0)/32});
}
const out={node:process.version,gridCell:.5,radius:.42,agents:32,repathSeconds:.5,points:nav.points.length,constructMs,waves};
console.log(JSON.stringify(out,null,2));if(process.argv[2])fs.writeFileSync(process.argv[2],JSON.stringify(out,null,2)+'\n');
