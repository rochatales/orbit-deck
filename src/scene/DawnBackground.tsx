import { useEffect, useMemo } from 'react';
import { Color, DataTexture, EquirectangularReflectionMapping, LinearFilter, RGBAFormat, SRGBColorSpace } from 'three';
import { SHANGHAI_DAWN } from './lightingConfig';

/** Só background: não define scene.environment nem altera os materiais PBR. */
export function DawnBackground() {
    const texture=useMemo(()=>{
        const w=64,h=32,pixels=new Uint8Array(w*h*4),sky=new Color(SHANGHAI_DAWN.zenith),horizon=new Color(SHANGHAI_DAWN.horizon),low=new Color(SHANGHAI_DAWN.lower),color=new Color();
        for(let y=0;y<h;y++)for(let x=0;x<w;x++){
            const latitude=(y/(h-1)-.5)*Math.PI,band=Math.exp(-Math.pow(latitude/.16,2));
            color.copy(latitude>0?sky:low).lerp(horizon,band);color.convertLinearToSRGB();
            const i=(y*w+x)*4;pixels[i]=Math.round(color.r*255);pixels[i+1]=Math.round(color.g*255);pixels[i+2]=Math.round(color.b*255);pixels[i+3]=255;
        }
        const next=new DataTexture(pixels,w,h,RGBAFormat);next.mapping=EquirectangularReflectionMapping;next.colorSpace=SRGBColorSpace;next.magFilter=next.minFilter=LinearFilter;next.needsUpdate=true;return next;
    },[]);
    useEffect(()=>()=>texture.dispose(),[texture]);
    return <primitive object={texture} attach="background"/>;
}
