import fs from 'node:fs';import{createHash}from'node:crypto';import{AnimationMixer,Box3,Vector3,LoopOnce}from'three';import{loadGlb}from'../../../tests/load-glb.mjs';
const file='src/assets/enemies/large-mutant.glb',g=await loadGlb(file),m=new AnimationMixer(g.scene),point=new Vector3(),all=new Box3(),clips={};let radius=0,triangles=0;
g.scene.traverse(o=>{if(o.isMesh)triangles+=(o.geometry.index?.count??o.geometry.attributes.position.count)/3;});
for(const name of ['Idle','PatrolWalk','ChaseRun','AggressiveLunge']){
 const clip=g.animations.find(c=>c.name===name);m.stopAllAction();const a=m.clipAction(clip);a.setLoop(LoopOnce,1);a.clampWhenFinished=true;a.play();const box=new Box3();let radial=0;
 for(let i=0;i<=Math.ceil(clip.duration*120);i++){m.setTime(Math.min(clip.duration,i/120));g.scene.updateMatrixWorld(true);g.scene.traverse(o=>{if(!o.isMesh)return;if(o.isSkinnedMesh)o.skeleton.update();for(let v=0;v<o.geometry.attributes.position.count;v++){o.getVertexPosition(v,point).applyMatrix4(o.matrixWorld);box.expandByPoint(point);radial=Math.max(radial,Math.hypot(point.x,point.z));}});}
 clips[name]={duration:clip.duration,min:box.min.toArray(),max:box.max.toArray(),size:box.getSize(new Vector3()).toArray(),radius:radial};all.union(box);radius=Math.max(radius,radial);
}
const report={source:'art-source/large-mutant-animal/export/large_mutant_shanghai_v001.glb',file,sha256:createHash('sha256').update(fs.readFileSync(file)).digest('hex'),scale:1,triangles,method:'Vértices deformados a 120 Hz em quatro clipes vivos completos; inclui mais que o trecho de antecipação usado. Amostragem, sem malha na física.',clips,min:all.min.toArray(),max:all.max.toArray(),radius,configuredRadius:1.34,hitHeight:{minY:0,maxY:1.18}};
fs.writeFileSync('docs/handoffs/s3.3-mutante-grande/measurement.json',JSON.stringify(report,null,2)+'\n');console.log(report);
