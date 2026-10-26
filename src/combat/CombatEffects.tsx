import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { AdditiveBlending, Color, Matrix4, Quaternion, ShaderMaterial, Vector3, type InstancedMesh, type Mesh, type PointLight } from 'three';
import { COMBAT_VFX, type CombatEffects as Effects } from './effects';
/** Um batch de partículas, um billboard e no máximo uma luz (sem sombras). */
export function CombatEffects({ effects }: { effects: Effects }) {
    const particles=useRef<InstancedMesh>(null),flash=useRef<Mesh>(null),light=useRef<PointLight>(null);
    const pose=useMemo(()=>({matrix:new Matrix4(),p:new Vector3(),s:new Vector3(),q:new Quaternion(),color:new Color()}),[]);
    const colors=useMemo(()=>({white:new Color('#fff8df'),metal:new Color('#ff9d31'),organic:new Color('#64ef68'),dust:new Color('#a4a49d')}),[]);
    const material=useMemo(()=>new ShaderMaterial({transparent:true,depthWrite:false,blending:AdditiveBlending,toneMapped:false,
        uniforms:{alpha:{value:1}},vertexShader:'varying vec2 uv0; void main(){uv0=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
        fragmentShader:'varying vec2 uv0;uniform float alpha;void main(){vec2 p=uv0*2.-1.;float r=length(p);float a=max(0.,1.-r);a+=.5*exp(-abs(p.x*p.y)*70.)*max(0.,1.-r);gl_FragColor=vec4(vec3(1.,.65,.15)*2.,a*alpha);}'
    }),[]);
    useEffect(()=>()=>material.dispose(),[material]);
    useFrame(({camera})=>{
        const mesh=particles.current;if(mesh){let n=0;for(const p of effects.particles)if(p.life>0){
            const alpha=p.life/p.duration,size=(p.kind==='dust'?.10:.035)*Math.sqrt(alpha);
            pose.p.set(p.x,p.y,p.z);pose.s.set(size,p.kind==='metal'?size*2.5:size,size);pose.matrix.compose(pose.p,pose.q,pose.s);
            mesh.setMatrixAt(n,pose.matrix);pose.color.copy(p.white?colors.white:colors[p.kind]).multiplyScalar(alpha*1.5);mesh.setColorAt(n++,pose.color);
        }mesh.count=n;mesh.instanceMatrix.needsUpdate=true;if(mesh.instanceColor)mesh.instanceColor.needsUpdate=true;}
        const m=effects.muzzle,visible=m.life>0;
        if(flash.current){flash.current.visible=visible;flash.current.position.set(m.x,m.y,m.z);flash.current.quaternion.copy(camera.quaternion);material.uniforms.alpha.value=m.life/COMBAT_VFX.flash;}
        if(light.current){light.current.visible=visible;light.current.position.set(m.x,m.y,m.z);light.current.intensity=visible?3*m.life/COMBAT_VFX.flash:0;}
    });
    return <><instancedMesh name="CombatImpactParticles" ref={particles} args={[undefined,undefined,COMBAT_VFX.capacity]} frustumCulled={false}>
      <icosahedronGeometry args={[1,0]}/><meshBasicMaterial toneMapped={false}/>
    </instancedMesh><mesh name="CombatMuzzleFlash" ref={flash} material={material} visible={false}><planeGeometry args={[.6,.6]}/></mesh>
    <pointLight ref={light} color="#ffba65" distance={3} decay={2} castShadow={false} intensity={0}/></>;
}
