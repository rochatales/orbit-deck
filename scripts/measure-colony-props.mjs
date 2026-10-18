// Mede GLB derivado ou uma referência explícita: node ... antes /tmp/referencia.glb
import fs from 'node:fs';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { coplanarProps } from './lib/colony-geometry.mjs';
const phase=process.argv[2]??'depois',path=process.argv[3]??'src/assets/colony-v006.glb';
const bytes=fs.readFileSync(path);
const {scene}=await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
const report=coplanarProps(scene),out='docs/handoffs/s6.12/evidencias/props';
fs.mkdirSync(out,{recursive:true});fs.writeFileSync(`${out}/${phase}.json`,JSON.stringify(report,null,2));
console.log(JSON.stringify({phase,props:report.props,triangles:report.triangles,trianglePairs:report.trianglePairs}));
