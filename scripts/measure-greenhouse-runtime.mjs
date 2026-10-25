/** Microensaio CPU isolado (Node), não é benchmark de GPU nem aprovação de jogabilidade. */
import fs from 'node:fs';
import {performance} from 'node:perf_hooks';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';
import {loadSource} from '../tests/load-source.mjs';
const {GreenhouseRuntime}=loadSource('src/scene/marsColony/greenhouseRuntime.ts');
const manifest=JSON.parse(fs.readFileSync('src/assets/greenhouse/greenhouse-v001.manifest.json'));
const bytes=fs.readFileSync('src/assets/greenhouse/greenhouse-v001.glb');
const {scene}=await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
const runtime=new GreenhouseRuntime(scene,manifest),outside={x:7.5,z:22.5},inside={x:14,z:22.5};
const report={method:'Node performance.now; 5000 passos de aquecimento + 20 lotes de 3000 atualizações; tempo médio por chamada em cada lote. Sem render/GPU.',node:process.version,states:[]};
for(const state of ['OFFLINE','ONLINE']) {
 runtime.setState(state);for(let i=0;i<5000;i++)runtime.update(i%180<90?inside:outside,1/60);
 const batches=[];
 for(let batch=0;batch<20;batch++){const start=performance.now();for(let i=0;i<3000;i++)runtime.update(i%180<90?inside:outside,1/60);batches.push((performance.now()-start)/3000);}
 batches.sort((a,b)=>a-b);report.states.push({state,p50ms:batches[10],p95ms:batches[18],maxMs:batches[19]});
}
runtime.dispose();fs.writeFileSync('art-source/greenhouse-v001/notas/custo-runtime.json',JSON.stringify(report,null,2));console.log(report.states);
