// Replay técnico de todas as portas: animação real, GLB real, câmera orbital.
// Não substitui navegação física nem aceite do autor.
import {createRequire} from 'node:module';
import fs from 'node:fs';
const {chromium}=createRequire(process.env.HORDA_QA_PACKAGE)('playwright-core');
const phase=process.argv[2]??'antes';
const out=`docs/handoffs/s6.12/evidencias/portas/${phase}`;fs.mkdirSync(out,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:process.env.HORDA_QA_CHROMIUM,args:['--enable-gpu','--use-angle=metal']});
const context=await browser.newContext({viewport:{width:960,height:720},recordVideo:{dir:out,size:{width:960,height:720}}});
const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(String(e)));
try {
 await page.goto(process.argv[3]??'http://127.0.0.1:5189/');
 await page.evaluate(async(fast)=>{
 const T=await import('/node_modules/.vite/deps/three.js');
 const {GLTFLoader}=await import('/scripts/fixtures/colony-loader.js');
 const {createWorld}=await import('/src/game/marsWorld.ts');
 const {ColonyVisibility}=await import('/src/scene/marsColony/visibility.ts');
 const {applyColonyLayout}=await import('/src/scene/marsColony/layout.ts');
 const manifest=await(await fetch('/src/assets/colony-v006.manifest.json')).json();
 const gltf=await new GLTFLoader().loadAsync('/src/assets/colony-v006.glb');
 const scene=new T.Scene();scene.background=new T.Color('#b4927a');
 scene.add(new T.AmbientLight('white',2));const light=new T.DirectionalLight('white',3);light.position.set(10,30,10);scene.add(light);
 const world=createWorld();scene.add(world.group,gltf.scene);applyColonyLayout(gltf.scene);
 // O terceiro argumento integra as portas na versão corrigida; antes é ignorado.
 const control=new ColonyVisibility(gltf.scene,manifest.parts,world.group);
 const renderer=new T.WebGLRenderer({antialias:true});renderer.setSize(960,720);
 const root=document.createElement('div');root.style='position:fixed;inset:0;z-index:99999';root.append(renderer.domElement);document.body.append(root);
 const label=document.createElement('div');label.style='position:absolute;top:10px;left:10px;background:white;color:black;padding:10px;font:16px sans-serif';root.append(label);
 const camera=new T.PerspectiveCamera(45,960/720,0.1,200),player=new T.Vector3();
 const doors=[];world.group.traverse(n=>{if(n.name==='PortaAutomatica')doors.push(n);});
 const marker=new T.Mesh(new T.CapsuleGeometry(0.2,0.7),new T.MeshStandardMaterial({color:'#ff5050'}));scene.add(marker);
 const meshes=[];gltf.scene.traverseVisible(n=>{if(n.isMesh)meshes.push(n);});
 const triangle=new T.Triangle(),box=new T.Box3(),v=new T.Vector3();
 function overlaps(door){
  scene.updateMatrixWorld(true);const hits=[];
  for(const leaf of door.children){if(!leaf.isMesh)continue;box.setFromObject(leaf);
   for(const mesh of meshes){if(!box.intersectsBox(new T.Box3().setFromObject(mesh)))continue;
    const p=mesh.geometry.attributes.position,idx=mesh.geometry.index;let intersections=0,coplanar=0;
    for(let i=0;i<(idx?idx.count:p.count);i+=3){
     for(let j=0;j<3;j++)[triangle.a,triangle.b,triangle.c][j].fromBufferAttribute(p,idx?idx.getX(i+j):i+j).applyMatrix4(mesh.matrixWorld);
     if(!box.intersectsTriangle(triangle))continue;intersections++;
     for(const axis of ['x','y','z'])if(Math.abs(triangle.a[axis]-triangle.b[axis])<1e-6&&Math.abs(triangle.a[axis]-triangle.c[axis])<1e-6&&(Math.abs(triangle.a[axis]-box.min[axis])<1e-5||Math.abs(triangle.a[axis]-box.max[axis])<1e-5))coplanar++;
    }
    if(intersections)hits.push({leaf:door.children.indexOf(leaf),mesh:mesh.name,triangles:intersections,coplanar});
   }
  }return hits;
 }
 window.runDoors=async()=>{
 const result=[];
 for(let id=0;id<doors.length;id++){
  const door=doors[id],p=door.getWorldPosition(new T.Vector3());
  world.update(new T.Vector3(1000,0,1000),10);const closed=overlaps(door);
  world.update(p,10);const open=overlaps(door);
  const tracked=[];door.traverse(n=>{if(n.isMesh)tracked.push(n);});
  gltf.scene.traverse(n=>{if(n.isMesh&&n.name.includes('Port')&&new T.Box3().setFromObject(n).distanceToPoint(p)<4)tracked.push(n);});
  let visibleChanges=0,depthWriteChanges=0,materialChanges=0;
  const previous=tracked.map(n=>({visible:n.visible,depthWrite:n.material.depthWrite,material:n.material}));
  label.textContent=`Porta ${id+1}/${doors.length} · aproximar / afastar · giro 360° · replay técnico`;
  // 180 passos determinísticos, renderizados em tempo real; três segundos por porta.
  for(let frame=0;frame<(fast?0:180);frame++){
   const angle=frame/180*Math.PI*2,distance=frame<90?3.5-frame/90*3:0.5+(frame-90)/90*3;
   player.set(p.x,p.y,p.z+distance);marker.position.set(player.x,0.7,player.z);
   camera.position.set(p.x+Math.sin(angle)*7,4.5,p.z+Math.cos(angle)*7);camera.lookAt(p.x,1.2,p.z);
   world.update(player,1/60);control.update(player,camera.position,1/60);scene.updateMatrixWorld(true);
   for(let k=0;k<tracked.length;k++){const n=tracked[k],old=previous[k];visibleChanges+=Number(old.visible!==n.visible);depthWriteChanges+=Number(old.depthWrite!==n.material.depthWrite);materialChanges+=Number(old.material!==n.material);old.visible=n.visible;old.depthWrite=n.material.depthWrite;old.material=n.material;}
   renderer.render(scene,camera);await new Promise(r=>setTimeout(r,1000/60));
  }
  result.push({id,position:p.toArray(),closed,open,visibleChanges,depthWriteChanges,materialChanges});
 }
 return result;
 };
 },process.env.HORDA_QA_FAST === '1');
 const result=await page.evaluate(()=>window.runDoors());
 await page.screenshot({path:`${out}/ultima-porta.png`});
 fs.writeFileSync(`${out}/medicao.json`,JSON.stringify({phase,stepsPerDoor:180,delta:1/60,errors,result},null,2));
} finally {await context.close();const original=await page.video().path();await page.video().saveAs(`${out}/portas.webm`);fs.unlinkSync(original);await browser.close();}
