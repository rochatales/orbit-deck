// Comparação determinística, 16 s / 60 Hz. Não é benchmark nem playtest.
import {createRequire} from 'node:module';
import fs from 'node:fs';
const {chromium}=createRequire(process.env.HORDA_QA_PACKAGE)('playwright-core');
const browser=await chromium.launch({headless:true,args:['--enable-gpu','--use-angle=metal']});
try {
 const page=await browser.newPage();await page.goto(process.argv[2]??'http://127.0.0.1:5189/');
 const result=await page.evaluate(async()=>{
  const {GLTFLoader}=await import('/scripts/fixtures/colony-loader.js');
  const {Vector3}=await import('/node_modules/.vite/deps/three.js');
  const {ColonyVisibility:Before}=await import('/scripts/fixtures/colony-visibility-before.js');
  const {ColonyVisibility:After}=await import('/src/scene/marsColony/visibility.ts');
  const {applyColonyLayout}=await import('/src/scene/marsColony/layout.ts');
  const manifest=await (await fetch('/src/assets/colony-v006.manifest.json')).json();
  const gltf=await new GLTFLoader().loadAsync('/src/assets/colony-v006.glb');
  const points=[[0,0.8],[0,-8],[9.5,-10],[0,33]],camera=new Vector3(),player={x:0,z:0};
  const results=[];
  for(const rotating of [false,true]) for(const version of ['antes','depois']){
   const scene=gltf.scene.clone(true);if(version==='depois')applyColonyLayout(scene);
   const controller=new (version==='antes'?Before:After)(scene,manifest.parts);
   const nodes=[];scene.traverse(n=>{if(n.userData.colony_name)nodes.push(n);});
   const previous=nodes.map(n=>n.visible),changed=new Set();let toggles=0,maxOpacityStep=0,targetChanges=0;
   const states=controller.entries.map(e=>e.hidden),alpha=controller.entries.map(e=>e.opacity);
   const start=performance.now();
   for(let frame=0;frame<960;frame++){
    const t=frame/960*3,segment=Math.min(2,Math.floor(t)),u=t-segment;
    player.x=points[segment][0]*(1-u)+points[segment+1][0]*u;
    player.z=points[segment][1]*(1-u)+points[segment+1][1]*u;
    const angle=Math.PI/4+(rotating?frame/960*Math.PI*2:0);
    camera.set(player.x+Math.sin(angle)*60,48,player.z+Math.cos(angle)*60);
    controller.update(player,camera,1/60);
    nodes.forEach((n,i)=>{if(n.visible!==previous[i]){toggles++;changed.add(n.userData.colony_name);previous[i]=n.visible;}});
    controller.entries.forEach((e,i)=>{if(states[i]!==e.hidden){targetChanges++;states[i]=e.hidden;}if(e.opacity!==undefined){maxOpacityStep=Math.max(maxOpacityStep,Math.abs(e.opacity-alpha[i]));alpha[i]=e.opacity;}});
   }
   results.push({version,rotating,toggles,changedParts:changed.size,targetChanges,maxOpacityStep,simulationMs:performance.now()-start});
   controller.dispose?.();
  }
  return {durationSeconds:16,hz:60,points,camera:{horizontalRadius:60,height:48,initialAngle:45,rotationDegrees:360},results};
 });
 fs.writeFileSync('docs/handoffs/s6.12/evidencias/visibilidade-antes-depois.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));
}finally{await browser.close();}
