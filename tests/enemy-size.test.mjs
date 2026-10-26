import test from 'node:test';
import assert from 'node:assert/strict';
import { loadSource } from './load-source.mjs';
import { navigationSizeReport, clearWavesSizeReport, largeArrivalSizeReport } from './enemy-size-scenarios.mjs';
const { COMBAT, robotConfig } = loadSource('src/combat/config.ts');
const { enemySpacing, enemySeparation } = loadSource('src/combat/enemySpacing.ts');
const { CombatSimulation, traceShot, validContactSpawn } = loadSource('src/combat/simulation.ts');
const bounds = { minX:-60,maxX:60,minZ:-60,maxZ:60 }, terrain={bounds,walkableAreas:[bounds],obstacles:[]};
const kinds=['patrol','largePatrol','smallMutant'];

test('S2.12 B3: distância mista simétrica e movimento preservam a soma dos raios + 8 cm',()=>{
    for(const [a,b,distance,separation] of [['patrol','smallMutant',1.25,1.6],['patrol','largePatrol',2.4,3.6],['smallMutant','largePatrol',2.23,3.6]]) {
        assert.ok(Math.abs(enemySpacing({kind:a},{kind:b})-distance)<1e-9);
        assert.equal(enemySpacing({kind:a},{kind:b}),enemySpacing({kind:b},{kind:a}));
        assert.equal(enemySeparation({kind:a},{kind:b}),separation);
        const s=new CombatSimulation(terrain,'hordas'),player={x:0,z:0},input={player,aim:player,firing:false,reload:false};
        s.waveLeft=.0001;s.step(1/60,input);s.robots.forEach(r=>r.hp=0);
        const [left,right]=s.robots;Object.assign(left,{kind:a,x:-7,z:0,hp:100,alerted:true});Object.assign(right,{kind:b,x:-11,z:0,hp:100,alerted:true});
        for(let f=0;f<1200;f++){s.hp=100;s.step(1/60,input);assert.ok(Math.hypot(left.x-right.x,left.z-right.z)>=distance-1e-6);}
        assert.ok(Math.hypot(left.x,left.z)<4);assert.ok(Math.hypot(right.x,right.z)<6);
    }
});

test('S2.12 B3: 32 spawns, candidatos por raio, nove vielas e acessos às duas caixas',()=>{
    const report=navigationSizeReport();assert.equal(report.alleys.length,9);
    for(const [kind,count] of [['patrol',272],['largePatrol',271],['smallMutant',272]]){
        const r=report.types[kind];assert.equal(r.spawnsValid,32);assert.equal(r.candidates,count);assert.equal(r.candidatesValid,count);
        assert.ok(r.maxContactDistance<=robotConfig({kind}).contactRange);assert.ok(r.invalidCandidateRejected);
        assert.ok(r.alleys.every(a=>a.free&&a.diameterClearance>0));assert.ok(r.crates.every(c=>c.valid&&c.smoothedValid));
    }
    assert.ok(report.humanCrates.every(c=>c.valid&&c.distance===0));
});

test('S2.12 B3: caminho não vazio ainda rejeita origem, segmento ou término inválido',()=>{
    const t={...terrain,obstacles:[{minX:-1,maxX:1,minZ:-1,maxZ:1}]},start={x:-4,z:0},goal={x:4,z:0};
    assert.equal(validContactSpawn(t,{path:()=>[goal]},start,goal,.67,1.07),false);
    assert.equal(validContactSpawn(terrain,{path:()=>[{x:0,z:0}]},start,goal,.67,1.07),false);
    assert.equal(validContactSpawn(t,{path:()=>[goal]},{x:0,z:0},goal,.67,1.07),false);
    assert.equal(validContactSpawn(terrain,{path:()=>[{x:3,z:0}]},start,goal,.67,1.07),true);
});

test('S2.12 B3: quatro hordas completas com rifle real, 109 baixas e nenhuma invasão de sólido',()=>{
    const r=clearWavesSizeReport();assert.ok(r.cleared);assert.equal(r.kills,109);assert.equal(r.invalid,0);
    assert.deepEqual(r.waves.map(w=>w.spawned),[13,26,30,40]);assert.ok(r.seconds<300);assert.ok(r.ammo>=0&&r.reserve>=0);
});

test('S2.12 B3: dez grandes chegam ao contato pelos caminhos reais sem atravessar sólidos',()=>{
    const r=largeArrivalSizeReport();assert.equal(r.arrivals,10);assert.equal(r.invalid,0);assert.ok(r.mean<80);assert.ok(r.max<120);
});

test('S2.12 B3: acerto usa raio próprio, incluindo alvo colado ao cano a 0,85 m',()=>{
    for(const kind of kinds){
        const R=robotConfig({kind}),r={kind,x:0,z:5,hp:R.hp};
        for(const [offset,hit] of [[R.radius-.001,true],[R.radius+.001,false]]){
            const result=traceShot({x:offset,z:0},{x:offset,z:10},terrain,[r]);assert.equal(result.robot===r,hit);
        }
        const s=new CombatSimulation(terrain,1),live=s.robots[0];Object.assign(live,{kind,x:.34,z:.95,hp:R.hp});
        s.step(1/60,{player:{x:0,z:0},aim:{x:.34,z:10},facingAngle:0,firing:true,reload:false});
        assert.equal(live.hp,R.hp-COMBAT.rifle.damage);assert.equal(s.shots[0].hit,true);
    }
});
