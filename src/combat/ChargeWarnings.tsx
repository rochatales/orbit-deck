import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { DoubleSide, Matrix4, PlaneGeometry, Quaternion, ShaderMaterial, Vector3, type InstancedMesh } from 'three';
import { LARGE_MUTANT, MUTANT_CHARGE } from './config';
import type { CombatSimulation } from './simulation';
/** Faixa fixa cobre a varredura do círculo do mutante mais a cápsula do jogador. */
export function ChargeWarnings({ simulation }: { simulation: CombatSimulation }) {
    const mesh=useRef<InstancedMesh>(null);
    const state=useMemo(()=>({p:new Vector3(),s:new Vector3(),q:new Quaternion(),up:new Vector3(0,1,0),matrix:new Matrix4(),geometry:new PlaneGeometry(1,1).rotateX(-Math.PI/2),
        material:new ShaderMaterial({transparent:true,depthWrite:false,side:DoubleSide,toneMapped:false,
            uniforms:{time:{value:0}},vertexShader:`varying vec2 uv0;void main(){uv0=uv;vec4 p=vec4(position,1.);p=instanceMatrix*p;gl_Position=projectionMatrix*modelViewMatrix*p;}`,
            fragmentShader:`varying vec2 uv0;uniform float time;void main(){float edge=step(.44,abs(uv0.x-.5));float stripe=step(.55,fract(uv0.y*8.+time*2.));float pulse=.85+.15*sin(time*14.);gl_FragColor=vec4(1.,.035,.02,(.22+edge*.48+stripe*.16)*pulse);}`})}),[]);
    useEffect(()=>()=>{state.geometry.dispose();state.material.dispose();},[state]);
    useFrame(()=>{if(!mesh.current)return;let n=0;state.material.uniforms.time.value=simulation.elapsed;
        for(const r of simulation.robots)if(r.hp>0&&r.kind==='largeMutant'&&r.chargePhase==='windup'){
            const length=r.chargeDistance+2*(LARGE_MUTANT.radius+MUTANT_CHARGE.playerRadius);
            const half=LARGE_MUTANT.radius+MUTANT_CHARGE.playerRadius,segments=Math.ceil(length/.25),size=length/segments;
            state.q.setFromAxisAngle(state.up,Math.atan2(r.chargeDirX,r.chargeDirZ));state.s.set(2*half,1,size);
            for(let i=0;i<segments;i++){
                const along=-half+(i+.5)*size,x=r.chargeOriginX+r.chargeDirX*along,z=r.chargeOriginZ+r.chargeDirZ*along;
                const height=simulation.terrain.surfaceHeight;
                const y=height?Math.max(height(x,z),height(x+r.chargeDirZ*half,z-r.chargeDirX*half),height(x-r.chargeDirZ*half,z+r.chargeDirX*half),height(x+r.chargeDirX*size/2,z+r.chargeDirZ*size/2),height(x-r.chargeDirX*size/2,z-r.chargeDirZ*size/2)):0;
                state.p.set(x,y+.012,z);state.matrix.compose(state.p,state.q,state.s);mesh.current.setMatrixAt(n++,state.matrix);
            }
        }mesh.current.count=n;mesh.current.instanceMatrix.needsUpdate=true;
    });
    return <instancedMesh name="LargeMutantChargeWarning" ref={mesh} args={[state.geometry,state.material,160]} frustumCulled={false} dispose={null}/>;
}
