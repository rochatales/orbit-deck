import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { AdditiveBlending, DataTexture, LinearFilter, Object3D, RGBAFormat, Vector3, type InstancedMesh } from 'three';
import layout from '../../assets/colony-perimeter-lights.json';
import { PERIMETER_LIGHTS } from './perimeterLights';

/** Balizas baixas e halos suaves em três batches. Sem PointLights por baliza nem colisores. */
export function PerimeterSoftLights() {
    const points=layout.positions;
    const bodies=useRef<InstancedMesh>(null),cores=useRef<InstancedMesh>(null),halos=useRef<InstancedMesh>(null);
    const texture=useMemo(()=>{
        const size=32,data=new Uint8Array(size*size*4);
        for(let y=0;y<size;y++)for(let x=0;x<size;x++){
            const d=Math.hypot((x+.5)/size*2-1,(y+.5)/size*2-1),i=(y*size+x)*4;
            data[i]=data[i+1]=data[i+2]=255;data[i+3]=Math.round(Math.pow(Math.max(0,1-d),2)*150);
        }
        const t=new DataTexture(data,size,size,RGBAFormat);t.magFilter=t.minFilter=LinearFilter;t.needsUpdate=true;return t;
    },[]);
    useEffect(()=>()=>texture.dispose(),[texture]);
    useLayoutEffect(()=>{
        const pose=new Object3D(),normal=new Vector3(),up=new Vector3(0,1,0),front=new Vector3(0,0,1);
        points.forEach((p,i)=>{
            normal.fromArray(p.normal);pose.quaternion.setFromUnitVectors(up,normal);
            pose.position.set(p.x+normal.x*.024,p.y+normal.y*.024,p.z+normal.z*.024);pose.updateMatrix();bodies.current!.setMatrixAt(i,pose.matrix);
            pose.quaternion.setFromUnitVectors(front,normal);
            pose.position.set(p.x+normal.x*.047,p.y+normal.y*.047,p.z+normal.z*.047);pose.updateMatrix();cores.current!.setMatrixAt(i,pose.matrix);
            pose.position.set(p.x+normal.x*.007,p.y+normal.y*.007,p.z+normal.z*.007);pose.updateMatrix();halos.current!.setMatrixAt(i,pose.matrix);
        });
        for(const mesh of[bodies.current,cores.current,halos.current])if(mesh){mesh.instanceMatrix.needsUpdate=true;mesh.computeBoundingSphere();}
    },[points]);
    return <group name="PerimeterSoftLights">
      <instancedMesh ref={bodies} args={[undefined,undefined,points.length]}><cylinderGeometry args={[PERIMETER_LIGHTS.radius,PERIMETER_LIGHTS.radius,.045,10]}/><meshStandardMaterial color="#423831" roughness={1} metalness={0}/></instancedMesh>
      <instancedMesh ref={cores} args={[undefined,undefined,points.length]}><circleGeometry args={[.064,12]}/><meshBasicMaterial color={PERIMETER_LIGHTS.color} toneMapped={false}/></instancedMesh>
      <instancedMesh ref={halos} args={[undefined,undefined,points.length]}><planeGeometry args={[PERIMETER_LIGHTS.haloRadius*2,PERIMETER_LIGHTS.haloRadius*2]}/><meshBasicMaterial color={PERIMETER_LIGHTS.color} map={texture} transparent depthWrite={false} blending={AdditiveBlending} toneMapped={false}/></instancedMesh>
    </group>;
}
