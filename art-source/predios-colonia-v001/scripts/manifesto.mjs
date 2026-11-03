// Executar na raiz: node art-source/predios-colonia-v001/scripts/manifesto.mjs
// COL_* são empties cúbicos de meia extensão = escala, nunca malha de colisão.
import fs from 'node:fs';
import { Box3, Vector3, Quaternion } from 'three';
import { loadGlb } from '../../../tests/load-glb.mjs';
const placements = [
 ['meeting-room',0,0,-Math.PI/2,['central-hub']],
 ['data-center',-12.5,0,Math.PI/2,['editorial']],
 ['cafeteria',11.5,10.7,0,['output-review','coffee-nook']]
];
const output=[];
for (const [id,x,z,rotationY,replaces] of placements) {
 const gltf=await loadGlb(`src/assets/buildings/${id}.glb`),scene=gltf.scene;
 scene.position.set(x,0,z);scene.rotation.y=rotationY;scene.updateMatrixWorld(true);
 const bounds=name=>{const b=new Box3().setFromObject(scene.getObjectByName(name));return {minX:b.min.x,maxX:b.max.x,minZ:b.min.z,maxZ:b.max.z}};
 const staticCuboids=[],dynamicCuboids=[],doors=[];
 scene.traverse(node=>{
  if (!node.name.startsWith('COL_'))return;
  const p=new Vector3(),s=new Vector3(),q=new Quaternion();node.matrixWorld.decompose(p,q,s);
  const box=new Box3(new Vector3(-1,-1,-1),new Vector3(1,1,1)).applyMatrix4(node.matrixWorld);
  const c={id:`${id}:${node.name}`,node:node.name,position:{x:p.x,y:p.y,z:p.z},halfExtents:s.toArray(),rotation:{x:q.x,y:q.y,z:q.z,w:q.w},bounds:{minX:box.min.x,maxX:box.max.x,minZ:box.min.z,maxZ:box.max.z}};
  (node.name.startsWith('COL_Door')?dynamicCuboids:staticCuboids).push(c);
 });
 for(const side of ['South','East']){
  const node=scene.getObjectByName(`Door_${side}`);if(!node)continue;
  const b=new Box3().setFromObject(node),p=b.getCenter(new Vector3());
  const clip=gltf.animations.find(c=>c.name===`Door${side}_Open`);
  if(!clip)throw Error('Clipe ausente');
  doors.push({side,x:p.x,z:p.z,clip:clip.name,duration:clip.duration});
 }
 const meshes=[];let triangles=0;scene.traverse(n=>{if(n.isMesh){meshes.push(n.name);triangles+=(n.geometry.index?.count??n.geometry.attributes.position.count)/3}});
 output.push({id,placement:{x,z,rotationY},replaces,floor:bounds('Building_Floor'),pad:bounds('Building_Pad'),roofArea:bounds('Building_Floor'),visual:bounds(scene.children[0].name),doors,staticCuboids,dynamicCuboids,triangles,clips:gltf.animations.map(c=>({name:c.name,duration:c.duration}))});
}
fs.writeFileSync('src/assets/buildings/colony-buildings-v001.json',JSON.stringify(output,null,2)+'\n');
console.log(output.map(b=>({id:b.id,doors:b.doors,floor:b.floor,triangles:b.triangles})));
