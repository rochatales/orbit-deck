// Auditoria estática da montagem real, sem escrever em art-source ou reexportar assets.
import fs from 'node:fs';import assert from 'node:assert/strict';import{createHash}from'node:crypto';
import{Box3,Vector3,Raycaster}from'three';import{loadGlb}from'../../../../tests/load-glb.mjs';import{loadSource}from'../../../../tests/load-source.mjs';
const{createDeckProps}=loadSource('src/scene/marsColony/landingProps.ts');
const{scene:source}=await loadGlb('src/assets/colony-v006.glb'),{scene:v7}=await loadGlb('src/assets/colony-v007.glb'),props=createDeckProps(source);
const manifest=JSON.parse(fs.readFileSync('src/assets/colony-v007.manifest.json')),greenhouse=JSON.parse(fs.readFileSync('src/assets/greenhouse/greenhouse-v001.manifest.json')),layout=JSON.parse(fs.readFileSync('src/world/marsMasterplan.json'));
const routes=layout.corridors.filter(p=>['road','path'].includes(p.kind)).map(p=>({id:p.id,minX:p.position.x-p.size.width/2,maxX:p.position.x+p.size.width/2,minZ:p.position.z-p.size.depth/2,maxZ:p.position.z+p.size.depth/2}));
const intersects=(a,b)=>a.max.x>b.minX&&a.min.x<b.maxX&&a.max.z>b.minZ&&a.min.z<b.maxZ;
const sourceVisible=source.clone(true);loadSource('src/scene/marsColony/layout.ts').applyColonyLayout(sourceVisible);
function floorAt(scene,x,z){scene.updateMatrixWorld(true);const surfaces=[];scene.traverseVisible(n=>{if(n.isMesh&&(/^(TER_|ARQ_.*Piso|PISO_)/.test(n.name)))surfaces.push(n)});return new Raycaster(new Vector3(x,10,z),new Vector3(0,-1,0)).intersectObjects(surfaces,false)[0]?.point.y??null;}
const report={base:'e0eef58',method:'Props v006 clonados/aplicação de layout aprovada; AABBs reais e colisores v007/estufa; rotas de dados; apoio visual comparado com v006 efetivamente visível. Raycast só nesta auditoria de props, nunca no runtime dos anéis ou física.',props:[],hashes:{}};
for(const node of props.children){
 const box=new Box3().setFromObject(node),center=box.getCenter(new Vector3());let meshes=0;node.traverse(n=>{if(n.isMesh)meshes++});const geometryConflicts=[];
 v7.traverse(n=>{if(!n.isMesh||!n.userData.id_estavel||['floor','terrain','marking'].includes(n.userData.papel))return;const b=new Box3().setFromObject(n);if(box.intersectsBox(b)&&Math.min(box.max.y,b.max.y)-Math.max(box.min.y,b.min.y)>.001)geometryConflicts.push(n.userData.id_estavel)});
 const row={name:node.name,min:box.min.toArray(),max:box.max.toArray(),center:center.toArray(),rotation:node.rotation.toArray(),meshes,colliderConflicts:[...manifest.colliders,...greenhouse.colliders].filter(c=>intersects(box,c)),routeConflicts:routes.filter(c=>intersects(box,c)),geometryConflicts,floors:manifest.walkableAreas.filter(c=>intersects(box,c)).map(c=>c.id),supportReferenceY:floorAt(sourceVisible,center.x,center.z),supportV007Y:floorAt(v7,center.x,center.z)};
 assert.deepEqual(row.colliderConflicts,[]);assert.deepEqual(row.routeConflicts,[]);assert.deepEqual(geometryConflicts,[]);report.props.push(row);
}
const{scene:deck}=await loadGlb('src/assets/ares-mars/deck-mars.glb');deck.position.z=33;
report.rackDeckGap=new Box3().setFromObject(deck).min.x-new Box3().setFromObject(props.getObjectByName('PLAT_Rack_Cilindros')).max.x;
report.westWalkwayGap=-2-new Box3().setFromObject(props.getObjectByName('PLAT_Console_Oeste')).max.x;
assert.ok(report.rackDeckGap>.05&&report.rackDeckGap<.1);assert.ok(report.westWalkwayGap>.5);
for(const f of ['colony-v006.glb','colony-v007.glb','greenhouse/greenhouse-v001.glb','ares-mars/deck-mars.glb','ares-lander/ares-lander.glb'])report.hashes[f]=createHash('sha256').update(fs.readFileSync('src/assets/'+f)).digest('hex');
fs.writeFileSync('docs/handoffs/s2.12-b/v007-deck/props-medidas.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
