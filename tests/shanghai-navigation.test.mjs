import test from 'node:test';
import assert from 'node:assert/strict';
import {loadSource} from './load-source.mjs';
const {Navigation,traversable,clearSegment,segmentBox}=loadSource('src/combat/navigation.ts');
const {createPhase01Terrain,SHANGHAI_PHASE01:d}=loadSource('src/game/shanghai/layout.ts');
function oldClear(a,b,t,r){
 if(t.obstacles.some(o=>segmentBox(a,b,o,r)!==null))return false;
 const steps=Math.max(1,Math.ceil(Math.hypot(b.x-a.x,b.z-a.z)/.2));
 for(let i=0;i<=steps;i++)if(!traversable({x:a.x+(b.x-a.x)*i/steps,z:a.z+(b.z-a.z)*i/steps},t,r))return false;
 return true;
}
function linearNearest(nav,p,r=nav.radius){let best=-1,dist=Infinity;
 nav.points.forEach((q,i)=>{const d=(p.x-q.x)**2+(p.z-q.z)**2;if(d<dist&&oldClear(p,q,nav.terrain,r)){best=i;dist=d;}});return best;
}
function oldPath(nav,a,b){
 if(oldClear(a,b,nav.terrain,nav.radius))return [{...b}];
 const fits=traversable(b,nav.terrain,nav.radius),start=linearNearest(nav,a),goal=linearNearest(nav,b,fits?nav.radius:0);
 if(start<0||goal<0)return [];
 const parents=new Int32Array(nav.points.length).fill(-1),q=[start];parents[start]=start;
 for(let head=0;head<q.length&&parents[goal]===-1;head++)for(const n of nav.edges[q[head]])if(parents[n]===-1){parents[n]=q[head];q.push(n);}
 if(parents[goal]===-1)return [];
 const result=fits?[{...b}]:[];for(let i=goal;i!==start;i=parents[i])result.push(nav.points[i]);result.push(nav.points[start]);return result.reverse();
}
test('S6.3: índice e cache preservam caminho, desempate e destinos estreitos do BFS anterior',()=>{
 const terrain={bounds:{minX:-8,maxX:8,minZ:-9,maxZ:9},walkableAreas:[{minX:-8,maxX:8,minZ:-9,maxZ:9}],obstacles:[{minX:-1,maxX:1,minZ:-5,maxZ:5},{minX:4,maxX:7,minZ:5,maxZ:8}]};
 const nav=new Navigation(terrain,.42,.5),points=[{x:-5,z:-3},{x:5,z:3},{x:0,z:6},{x:-.6,z:-6},{x:4,z:4.6},{x:0,z:0},{x:8.1,z:0}];
 for(const p of points)for(const r of [0,.36,.42])assert.equal(nav.nearest(p,r),linearNearest(nav,p,r),JSON.stringify({p,r}));
 for(const a of points)for(const b of [...points].reverse())assert.deepEqual(nav.path(a,b),oldPath(nav,a,b),JSON.stringify({a,b}));
 const t={...terrain,walkableAreas:[{minX:-8,maxX:-3,minZ:-9,maxZ:9},{minX:3,maxX:8,minZ:-9,maxZ:9}]};
 for(const a of points)for(const b of points)assert.equal(clearSegment(a,b,t,.36),oldClear(a,b,t,.36));
});
test('S6.3: todos os 32 trajetos para o desembarque preservam a sequência anterior',()=>{
 const nav=new Navigation(createPhase01Terrain(),.42,.5);
 for(const p of d.spawns)assert.deepEqual(nav.path(p,d.exit),oldPath(nav,p,d.exit),p.id);
});
