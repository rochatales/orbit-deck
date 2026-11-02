import type { RectBounds } from '../../utils/math';
export const PERIMETER_LIGHTS = { spacing: 3.5, outsideOffset: .42, radius: .08, haloRadius: .85, color: '#ffe0a0' } as const;
interface Edge { axis: 'x'|'z'; fixed: number; normal: number; spans: [number,number][] }
/** Contorno externo da união dos pisos; buracos internos não viram cercas. Construído uma vez. */
export function perimeterLightPositions(areas: readonly RectBounds[], obstacles: readonly RectBounds[]) {
    if (!areas.length) return [];
    const xs=[...new Set(areas.flatMap(a=>[a.minX,a.maxX]))].sort((a,b)=>a-b);
    const zs=[...new Set(areas.flatMap(a=>[a.minZ,a.maxZ]))].sort((a,b)=>a-b);
    xs.unshift(xs[0]-2);xs.push(xs[xs.length-1]+2);zs.unshift(zs[0]-2);zs.push(zs[zs.length-1]+2);
    const w=xs.length-1,h=zs.length-1,inside=new Uint8Array(w*h),outside=new Uint8Array(w*h),queue=new Int32Array(w*h);
    const contains=(x:number,z:number)=>areas.some(a=>x>=a.minX&&x<=a.maxX&&z>=a.minZ&&z<=a.maxZ);
    for(let z=0;z<h;z++)for(let x=0;x<w;x++)inside[z*w+x]=contains((xs[x]+xs[x+1])/2,(zs[z]+zs[z+1])/2)?1:0;
    let head=0,tail=1;queue[0]=0;outside[0]=1;
    const visit=(i:number)=>{if(!inside[i]&&!outside[i]){outside[i]=1;queue[tail++]=i;}};
    while(head<tail){const i=queue[head++],x=i%w,z=Math.floor(i/w);if(x>0)visit(i-1);if(x+1<w)visit(i+1);if(z>0)visit(i-w);if(z+1<h)visit(i+w);}
    const edges=new Map<string,Edge>();
    const edge=(axis:'x'|'z',fixed:number,normal:number,a:number,b:number)=>{
        const key=`${axis}/${fixed}/${normal}`;let e=edges.get(key);if(!e){e={axis,fixed,normal,spans:[]};edges.set(key,e);}e.spans.push([a,b]);
    };
    for(let z=1;z<h-1;z++)for(let x=1;x<w-1;x++)if(inside[z*w+x]){
        if(outside[z*w+x-1])edge('x',xs[x],-1,zs[z],zs[z+1]);
        if(outside[z*w+x+1])edge('x',xs[x+1],1,zs[z],zs[z+1]);
        if(outside[(z-1)*w+x])edge('z',zs[z],-1,xs[x],xs[x+1]);
        if(outside[(z+1)*w+x])edge('z',zs[z+1],1,xs[x],xs[x+1]);
    }
    const result:{x:number;z:number}[]=[],used=new Set<string>();
    for(const e of edges.values()){
        e.spans.sort((a,b)=>a[0]-b[0]);const merged:[number,number][]=[];
        for(const span of e.spans){const last=merged[merged.length-1];if(last&&span[0]<=last[1]+1e-6)last[1]=Math.max(last[1],span[1]);else merged.push([...span]);}
        for(const[a,b]of merged){const n=Math.max(1,Math.round((b-a)/PERIMETER_LIGHTS.spacing));for(let i=0;i<n;i++){
            const t=a+(i+.5)*(b-a)/n,x=e.axis==='x'?e.fixed+e.normal*PERIMETER_LIGHTS.outsideOffset:t,z=e.axis==='z'?e.fixed+e.normal*PERIMETER_LIGHTS.outsideOffset:t;
            if(contains(x,z)||obstacles.some(o=>x>=o.minX-.1&&x<=o.maxX+.1&&z>=o.minZ-.1&&z<=o.maxZ+.1))continue;
            const key=`${x.toFixed(3)}/${z.toFixed(3)}`;if(!used.has(key)){used.add(key);result.push({x,z});}
        }}
    }
    return result.sort((a,b)=>a.x-b.x||a.z-b.z);
}
