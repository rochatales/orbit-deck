// Ensaios técnicos; HP restaurado só no processo para observar chegadas, sem mudar config.
import fs from 'node:fs';
import { loadSource } from './load-source.mjs';
const { COMBAT, robotConfig, encounterLayout, RIFLE_MASK, HIT_LAYER, writeRifleMuzzle } = loadSource('src/combat/config.ts');
const { CombatSimulation, hordeEdgeSpawns, validContactSpawn, traceShot } = loadSource('src/combat/simulation.ts');
const { Navigation, traversable, clearSegment, smoothPath } = loadSource('src/combat/navigation.ts');
const { createPhase01Terrain, SHANGHAI_PHASE01: data } = loadSource('src/game/shanghai/layout.ts');
const { SHANGHAI_SUPPLY_CRATES, crateMarker } = loadSource('src/game/props/supplyCrate.ts');
const idle = player => ({ player, aim:{x:player.x,z:player.z}, facingAngle:0, firing:false, reload:false });
const kinds=['patrol','largePatrol','smallMutant'];
function route(nav,start,goal,contact) {
    const path=nav.path(start,goal);let previous=start,valid=path.length>0&&traversable(start,nav.terrain,nav.radius);
    for(const p of path){valid=valid&&clearSegment(previous,p,nav.terrain,nav.radius);previous=p;}
    const distance=Math.hypot(previous.x-goal.x,previous.z-goal.z);
    let smoothPrevious=start,smoothValid=valid;
    for(const p of smoothPath(start,[...path],nav.terrain,nav.radius)){smoothValid=smoothValid&&clearSegment(smoothPrevious,p,nav.terrain,nav.radius);smoothPrevious=p;}
    return {valid:valid&&traversable(previous,nav.terrain,nav.radius)&&distance<=contact,smoothedValid:smoothValid,segments:path.length,distance,end:{x:previous.x,z:previous.z}};
}
export function navigationSizeReport() {
    const source=JSON.parse(fs.readFileSync('art-source/shanghai-fase01/export/layout.json')),terrain=createPhase01Terrain(),alleys=[];
    for(let i=0;i<data.buildings.length;i+=2){
        const pair=data.buildings.slice(i,i+2).map(building=>source.parts.filter(p=>p.id.startsWith(building.id+'_')&&p.y+p.h/2>.26&&p.y-p.h/2<=2.75).map(p=>({minX:p.x-Math.abs(Math.cos(p.angle))*p.w/2-Math.abs(Math.sin(p.angle))*p.d/2,maxX:p.x+Math.abs(Math.cos(p.angle))*p.w/2+Math.abs(Math.sin(p.angle))*p.d/2,minZ:p.z-Math.abs(Math.sin(p.angle))*p.w/2-Math.abs(Math.cos(p.angle))*p.d/2,maxZ:p.z+Math.abs(Math.sin(p.angle))*p.w/2+Math.abs(Math.cos(p.angle))*p.d/2})));
        const west=Math.max(...pair[0].map(p=>p.maxX)),east=Math.min(...pair[1].map(p=>p.minX)),x=(west+east)/2;
        alleys.push({buildings:data.buildings.slice(i,i+2).map(b=>b.id),width:east-west,from:{x,z:Math.max(...pair.map(parts=>Math.min(...parts.map(p=>p.minZ))))-.5},to:{x,z:Math.min(...pair.map(parts=>Math.max(...parts.map(p=>p.maxZ))))+.5}});
    }
    const report={method:'Origem livre; todos os segmentos brutos e suavizados válidos; término livre a ≤ contato do destino. 32 spawns exportados ensaiados por raio, patrulha real só comum. Caixas: marcador frontal; tipos partem do nó livre mais próximo do desembarque; humano parte do desembarque exato.',alleys,types:{}};
    for(const kind of kinds){
        const R=robotConfig({kind}),nav=new Navigation(terrain,R.radius,COMBAT.grid),candidates=hordeEdgeSpawns(terrain,nav,data.exit,R.radius,R.contactRange),start=nav.points[nav.nearest(data.exit,0)];
        const spawns=data.spawns.map((p,i)=>({index:i,...route(nav,p,data.exit,R.contactRange)})),edges=candidates.map(p=>route(nav,p,data.exit,R.contactRange));
        report.types[kind]={radius:R.radius,spacing:R.spacing,separation:R.separation,contactRange:R.contactRange,nodes:nav.points.length,arrivalFree:traversable(data.exit,terrain,R.radius),spawnsTotal:spawns.length,spawnsValid:spawns.filter(p=>p.valid&&p.smoothedValid).length,spawns,candidates:candidates.length,candidatesValid:edges.filter(p=>p.valid&&p.smoothedValid).length,segments:edges.reduce((n,p)=>n+p.segments,0),maxContactDistance:Math.max(...spawns.map(p=>p.distance),...edges.map(p=>p.distance)),alleys:alleys.map(a=>({free:clearSegment(a.from,a.to,terrain,R.radius),diameterClearance:a.width-2*R.radius})),crateStart:{x:start.x,z:start.z},crates:SHANGHAI_SUPPLY_CRATES.map(c=>({id:c.id,...route(nav,start,crateMarker(c),R.contactRange)})),invalidCandidateRejected:!validContactSpawn(terrain,{path:()=>[{x:0,z:-100}]},candidates[0],data.exit,R.radius,R.contactRange)};
    }
    const human=new Navigation(terrain,.36,COMBAT.grid);
    report.humanCrates=SHANGHAI_SUPPLY_CRATES.map(c=>({id:c.id,...route(human,data.exit,crateMarker(c),1e-8)}));
    return report;
}
export function patrolSizeReport() {
    const t=createPhase01Terrain(),s=new CombatSimulation(t,32,encounterLayout(true)),input=idle(data.exit),last=s.robots.map(r=>({x:r.x,z:r.z})),stalls=Array(32).fill(0),maxStalls=Array(32).fill(0),corners=[new Set(),new Set()];let closest=Infinity,invalid=0;
    for(let f=0;f<90*60;f++){
        s.step(1/60,input);
        for(const r of s.robots){const i=r.id;stalls[i]=Math.hypot(r.x-last[i].x,r.z-last[i].z)<1e-6?stalls[i]+1/60:0;maxStalls[i]=Math.max(maxStalls[i],stalls[i]);last[i].x=r.x;last[i].z=r.z;if(!traversable(r,t,COMBAT.robot.radius))invalid++;
            for(let j=i+1;j<32;j++)closest=Math.min(closest,Math.hypot(r.x-s.robots[j].x,r.z-s.robots[j].z));
            for(const[k,x]of[17.5,-17.5].entries())if(Math.hypot(r.x-x,r.z+18.5)<2.5)corners[k].add(i);
        }
    }
    return {seconds:90,invalid,maxIdle:Math.max(...maxStalls),minSeparation:closest,cornerVisitors:corners.map(c=>c.size),unalerted:s.robots.every(r=>!r.alerted)};
}
export function surroundSizeReport() {
    const s=new CombatSimulation(createPhase01Terrain(),32,encounterLayout(true)),p={x:0,z:0},input=idle(p);s.robots.forEach(r=>r.alerted=true);
    for(let f=0;f<40*60;f++){s.hp=100;s.step(1/60,input);}
    const distances=s.robots.map(r=>Math.hypot(r.x,r.z)),near=s.robots.filter(r=>Math.hypot(r.x,r.z)<4),sectors=new Set(near.map(r=>Math.floor((Math.atan2(r.x,r.z)+Math.PI)/(Math.PI/4))%8));
    return {seconds:40,contact:distances.filter(d=>d<=COMBAT.robot.contactRange+.05).length,sectors:sectors.size,nearFour:near.length,maxDistance:Math.max(...distances),chordCapacity:Math.floor(Math.PI/Math.asin(COMBAT.robot.spacing/(2*COMBAT.robot.contactRange)))};
}
export function clearWavesSizeReport(maxSeconds=360,player={x:0,z:9.5}) {
    const s=new CombatSimulation(createPhase01Terrain(),'hordas',encounterLayout(true)),input=idle(player),muzzle={x:0,z:0},out={to:{x:0,z:0},robot:null,blocked:false},waves=[];let invalid=0,lastWave=0,maxIdle=0,maxNoProgress=0;
    const previous=s.robots.map(r=>({x:r.x,z:r.z,generation:r.generation,idle:0}));
    const counts=()=>s.robots.reduce((a,r)=>({repath:a.repath+r.recoveryRepaths,yieldRequests:a.yieldRequests+r.recoveryYieldAttempts,yield:a.yield+r.recoveryYields,pass:a.pass+r.recoveryPasses}),{repath:0,yieldRequests:0,yield:0,pass:0});
    let waveCounts=counts();
    // Mira técnica instantânea, mesmo rifle/cadência/munição; HP restaurado para isolar conclusão/navegação.
    for(let frame=0;frame<60*maxSeconds&&!s.cleared;frame++){
        s.hp=100;input.firing=false;input.reload=s.ammo===0;
        const targets=[...s.robots].sort((a,b)=>Math.hypot(a.x-player.x,a.z-player.z)-Math.hypot(b.x-player.x,b.z-player.z));
        for(const r of targets){if(r.hp<=0)continue;input.facingAngle=Math.atan2(r.x-player.x,r.z-player.z);writeRifleMuzzle(muzzle,player.x,player.z,input.facingAngle);
            if(Math.hypot(r.x-muzzle.x,r.z-muzzle.z)>COMBAT.rifle.range||traceShot(player,muzzle,s.terrain,s.robots,HIT_LAYER.world,out).blocked)continue;
            if(traceShot(muzzle,r,s.terrain,s.robots,RIFLE_MASK,out).robot){input.aim.x=r.x;input.aim.z=r.z;input.firing=true;break;}
        }
        s.step(1/60,input);
        if(s.wave!==lastWave){lastWave=s.wave;waveCounts=counts();waves.push({wave:s.wave,spawned:s.alive,start:s.elapsed});}
        if(s.alive===0&&waves.length&&!waves.at(-1).clearedAt){const now=counts();waves.at(-1).clearedAt=s.elapsed;waves.at(-1).recovery={repath:now.repath-waveCounts.repath,yieldRequests:now.yieldRequests-waveCounts.yieldRequests,yield:now.yield-waveCounts.yield,pass:now.pass-waveCounts.pass};}
        for(const r of s.robots){const last=previous[r.id];last.idle=r.hp>0&&last.generation===r.generation&&Math.hypot(r.x-last.x,r.z-last.z)<1e-5?last.idle+1/60:0;maxIdle=Math.max(maxIdle,last.idle);maxNoProgress=Math.max(maxNoProgress,r.noProgress);last.x=r.x;last.z=r.z;last.generation=r.generation;if(r.hp>0&&!traversable(r,s.terrain,robotConfig(r).radius))invalid++;}
    }
    return {player,maxIdle,maxNoProgress,recovery:counts(),cleared:s.cleared,kills:s.kills,seconds:s.elapsed,remaining:s.alive,survivors:s.robots.filter(r=>r.hp>0).map(r=>({id:r.id,kind:r.kind,x:r.x,z:r.z,hp:r.hp,phase:r.chargePhase,stuck:r.stuck,path:r.path})),invalid,ammo:s.ammo,reserve:s.reserve,waves};
}
export function largeArrivalSizeReport() {
    const t=createPhase01Terrain(),s=new CombatSimulation(t,'hordas',encounterLayout(true)),input=idle(data.exit);s.wave=3;s.waveLeft=.0001;s.step(1/60,input);
    const starts=s.robots.filter(r=>r.kind==='largePatrol').map(r=>({id:r.id,x:r.x,z:r.z})),times=[];let invalid=0;
    // Um grande de cada vez: tempo livre de fila, origem real da horda 4; nenhum teleporte durante a rota.
    for(const start of starts){s.robots.forEach(r=>r.hp=0);const r=s.robots[start.id];Object.assign(r,{...start,hp:150,path:[],repath:0,stuck:0,alerted:false,pace:1.25});let reached=null;
        for(let f=0;f<120*60;f++){s.hp=100;s.step(1/60,input);if(!traversable(r,t,robotConfig(r).radius))invalid++;if(Math.hypot(r.x-data.exit.x,r.z-data.exit.z)<=robotConfig(r).contactRange){reached=(f+1)/60;break;}}
        times.push({id:r.id,seconds:reached});
    }
    const completed=times.filter(t=>t.seconds!==null);return{method:'Dez origens reais da horda 4, uma por ensaio, sem vizinhos/remoção de sólidos; HP restaurado. Tempo de marcha/perseguição livre de fila, não benchmark ou média em cerco misto.',times,arrivals:completed.length,mean:completed.reduce((n,t)=>n+t.seconds,0)/completed.length,max:Math.max(...completed.map(t=>t.seconds)),invalid};
}
