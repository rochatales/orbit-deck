import {Vector3} from 'three';
/** Diagnóstico offline dos GLBs aprovados; não participa de colisão/runtime. */
export function buildingGeometry(g) {
 g.scene.updateMatrixWorld(true);g.scene.traverse(n=>n.skeleton?.update());
 let triangles=0,zeroUVTriangles=0,zeroUVMeaningfulTriangles=0;const cyanParts={},joints=[],microAreas=[];
 g.scene.traverse(n=>{if(!n.isMesh)return;const geom=n.geometry,uv=geom.attributes.uv,index=geom.index;let owner=n;
  while(!owner.userData.id_estavel&&owner.parent)owner=owner.parent;const name=owner.userData.id_estavel??n.name;
  for(let i=0;i<index.count;i+=3){
   const ids=[index.getX(i),index.getX(i+1),index.getX(i+2)],u=ids.map(j=>[uv.getX(j),uv.getY(j)]);
   const areaUV=Math.abs((u[1][0]-u[0][0])*(u[2][1]-u[0][1])-(u[1][1]-u[0][1])*(u[2][0]-u[0][0]));triangles++;
   const tile=Math.floor(u.reduce((a,v)=>a+v[0],0)/3*4)+4*Math.floor(u.reduce((a,v)=>a+v[1],0)/3*4);
   if(tile===5)cyanParts[name]=(cyanParts[name]??0)+1;
   if(areaUV<1e-12||tile===13){
    const p=ids.map(j=>n.localToWorld(n.getVertexPosition(j,new Vector3())));
    if(areaUV<1e-12){zeroUVTriangles++;const area=p[1].clone().sub(p[0]).cross(p[2].clone().sub(p[0])).length()/2;
     if(area>1e-6)zeroUVMeaningfulTriangles++;else microAreas.push(area);
    }
    if(tile===13){const lo=[0,1,2].map(k=>Math.min(...p.map(v=>v.getComponent(k)))),hi=[0,1,2].map(k=>Math.max(...p.map(v=>v.getComponent(k)))),size=hi.map((v,k)=>v-lo[k]);
     if(size[1]<1e-5&&((Math.abs(size[0]-.03)<1e-5&&size[2]>4)||(Math.abs(size[2]-.03)<1e-5&&size[0]>4)))joints.push({x:(lo[0]+hi[0])/2,z:(lo[2]+hi[2])/2,size});
    }
   }
  }
 });
 return {triangles,zeroUVTriangles,zeroUVMeaningfulTriangles,microAreas,cyanParts,floorJoints:[...new Map(joints.map(j=>[JSON.stringify(j),j])).values()]};
}
