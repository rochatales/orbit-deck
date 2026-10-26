import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import{createHash}from'node:crypto';import{loadSource}from'./load-source.mjs';import{loadGlb}from'./load-glb.mjs';
const{COMBAT,LARGE_MUTANT:R,MUTANT_CHARGE:C,HORDE_TOTALS,robotConfig,encounterLayout}=loadSource('src/combat/config.ts');const{CombatSimulation,hordeEdgeSpawns,validContactSpawn}=loadSource('src/combat/simulation.ts');const{Navigation,traversable}=loadSource('src/combat/navigation.ts');const{createPhase01Terrain,SHANGHAI_PHASE01:d}=loadSource('src/game/shanghai/layout.ts');const{soundFor}=loadSource('src/audio/config.ts');const{PatrolUnitRig}=loadSource('src/combat/patrolUnit.ts');
const b={minX:-60,maxX:60,minZ:-60,maxZ:60},open={bounds:b,walkableAreas:[b],obstacles:[]},player={x:0,z:0},idle={player,aim:{x:0,z:10},facingAngle:0,firing:false,reload:false};
function solo(){const s=new CombatSimulation({...open,obstacles:[]},'hordas');s.wave=2;s.waveLeft=.001;s.step(1/60,idle);const r=s.robots.find(r=>r.kind==='largeMutant');s.robots.forEach(o=>o.hp=0);Object.assign(r,{x:0,z:-6,hp:200,alerted:true,chargePhase:'ready',chargeLeft:0,pace:1.4});return{s,r};}
function frames(s,n,input=idle){for(let i=0;i<n;i++)s.step(1/60,input);}
function launch(s,r){s.step(1/60,idle);assert.equal(r.chargePhase,'windup');assert.equal(r.chargeLeft,.8);frames(s,48);assert.equal(r.chargePhase,'dash');assert.equal(r.z,-6);}

test('Grande mutante: GLB íntegro, seis clipes, 5.560 triângulos e envelope medido',async()=>{
 const file='src/assets/enemies/large-mutant.glb',bytes=fs.readFileSync(file),m=JSON.parse(fs.readFileSync('docs/handoffs/s3.3-mutante-grande/measurement.json'));
 assert.equal(createHash('sha256').update(bytes).digest('hex'),'70470d2d125da7d6356f020538b582feb4133214567f0e21765339c970edae8a');assert.equal(m.triangles,5560);assert.ok(m.radius<=R.radius&&m.radius>1.33);assert.ok(m.max[1]<=R.hitHeight.maxY);assert.equal(R.hitHeight.minY,0);
 const g=await loadGlb(file);assert.deepEqual(g.animations.map(c=>c.name).sort(),['AggressiveLunge','ChaseRun','DamagedDeath','Idle','PatrolWalk','ShockAttack']);
 const rig=new PatrolUnitRig(g.scene,g.animations,'largeMutant'),uuid=rig.root.uuid,r={x:0,z:0,hp:200,flash:0,alerted:true,chargePhase:'windup',chargeLeft:.4};rig.update(r,0,6,R.contactRange,1/60);assert.equal(rig.clip,'AggressiveLunge');assert.ok(Math.abs(rig.actions.get('AggressiveLunge').time-.12)<1e-8);assert.equal(rig.actions.get('AggressiveLunge').paused,true);rig.respawn();assert.equal(rig.clip,'Idle');assert.equal(rig.root.uuid,uuid);assert.equal(rig.root.scale.x,1);rig.dispose();
});

test('Grande mutante: 13/26/32/44, 115 ameaças, 127 slots de itens e oito acertos por grande',()=>{
 assert.deepEqual([...HORDE_TOTALS],[13,26,32,44]);assert.deepEqual([...COMBAT.hordes.largeMutants],[0,0,2,4]);assert.equal(R.hp,200);assert.equal(R.speed,1.4);assert.equal(R.chaseSpeed,2.2);
 const s=new CombatSimulation(open,'hordas');for(let w=0;w<4;w++){s.robots.forEach(r=>r.hp=0);s.waveLeft=.001;s.step(1/60,idle);const live=s.robots.filter(r=>r.hp>0);assert.equal(live.filter(r=>r.kind==='largeMutant').length,[0,0,2,4][w]);const hits=live.reduce((n,r)=>n+Math.ceil(robotConfig(r).hp/25),0);assert.ok(s.ammo+s.reserve>=Math.ceil(hits*1.5));}assert.equal(s.total,115);assert.equal(s.drops.length,127);
});

test('Investida: aviso 0,8 s parado, direção fixa, corrida ≤6 m e recarga 3 s',()=>{
 const{s,r}=solo();launch(s,r);const miss={...idle,player:{x:4,z:0}};frames(s,40,miss);assert.equal(s.hp,100);assert.equal(r.chargePhase,'cooldown');assert.ok(r.chargeTraveled<=6+1e-8);assert.equal(r.x,0);assert.ok(r.z<=1e-8);
 frames(s,179,miss);assert.equal(r.chargePhase,'cooldown');frames(s,1,miss);assert.equal(r.chargePhase,'ready');
});

test('Investida: varredura acerta 30 uma vez, fora da faixa não; imunidade é global',()=>{
 const{s,r}=solo();launch(s,r);frames(s,40);assert.equal(s.hp,70);assert.equal(r.chargeHit,true);
 const inv=solo();launch(inv.s,inv.r);inv.s.invulnerable=10;frames(inv.s,40);assert.equal(inv.s.hp,100);assert.equal(inv.r.chargeHit,true);
});

test('Investida: para no sólido mesmo inserido depois do aviso; não atravessa a parede',()=>{
 const{s,r}=solo();launch(s,r);s.terrain.obstacles.push({minX:-4,maxX:4,minZ:-3,maxZ:-2});frames(s,40);assert.equal(r.chargePhase,'cooldown');assert.ok(r.z<=-3-R.radius+1e-6);assert.ok(traversable(r,s.terrain,R.radius));assert.equal(s.hp,100);
});

test('Investida: pausa congela a antecipação; contato de perto causa 15',()=>{
 const{s,r}=solo();s.step(1/60,idle);s.step(10,idle,true);assert.equal(r.chargeLeft,.8);assert.equal(r.z,-6);r.chargePhase='cooldown';r.chargeLeft=3;r.z=-R.contactRange;s.step(1/60,idle);assert.equal(s.hp,85);
});

test('Grande mutante: oito tiros a 0,85 m, três orgânicas separadas, coleta individual e anéis no piso',()=>{
 const{s,r}=solo();r.x=.34;r.z=5;r.alerted=false;r.chargePhase='cooldown';r.chargeLeft=100;s.terrain.surfaceHeight=()=>.12;
 for(let i=0;i<8;i++){s.cooldown=0;s.step(1/60,{...idle,firing:true});assert.equal(r.hp,Math.max(0,200-(i+1)*25));}
 const drops=s.drops.filter(d=>d.active);assert.equal(drops.length,3);assert.equal(new Set(drops.map(d=>`${d.x},${d.z}`)).size,3);assert.ok(drops.every(d=>d.kind==='organic'&&d.surfaceOrganic===.12));
 for(let i=0;i<3;i++){s.step(1/60,{...idle,player:drops[i]});assert.equal(s.organic,i+1);}assert.ok(drops.every(d=>!d.active));
});

test('Grande mutante: borda e patrulhas exportadas têm segmentos válidos no raio e fim dentro do contato',()=>{
 const t=createPhase01Terrain(),nav=new Navigation(t,R.radius,COMBAT.grid),points=hordeEdgeSpawns(t,nav,d.exit,R.radius,R.contactRange);assert.ok(points.length>250);
 for(const p of [...points,...d.spawns])assert.ok(validContactSpawn(t,nav,p,d.exit,R.radius,R.contactRange));
});

test('Grande mutante: sons grandes habilitados; morte grave provisória, aviso é visual',()=>{
 for(const[type,name]of[['enemyStep','step'],['bulletHit','bullet_hit'],['attack','attack_hit']])assert.equal(soundFor({type,kind:'largeMutant'}).name,`SFX_Mutant_big_${name}`);assert.equal(soundFor({type:'death',kind:'largeMutant'}).name,'SFX_Mutant_small_death_hit');assert.equal(soundFor({type:'death',kind:'largeMutant'}).rate,.8);
});

test('Investida: só inicia entre 4–9 m inclusive e com linha livre',()=>{
 for(const[distance,expected]of[[3.999,false],[4,true],[9,true],[9.001,false]]){const{s,r}=solo();r.z=-distance;s.step(1/60,idle);assert.equal(r.chargePhase==='windup',expected);}
 const{s,r}=solo();s.terrain.obstacles.push({minX:-2,maxX:2,minZ:-3,maxZ:-2});s.step(1/60,idle);assert.equal(r.chargePhase,'ready');
});

test('Grande mutante: espaçamento misto conserva a soma dos raios e margem simétrica',()=>{
 const{enemySpacing,enemySeparation}=loadSource('src/combat/enemySpacing.ts');
 for(const kind of ['patrol','largePatrol','smallMutant']){const a={kind:'largeMutant'},b={kind},expected=R.radius+robotConfig(b).radius+.08;assert.equal(enemySpacing(a,b),expected);assert.equal(enemySpacing(b,a),expected);assert.ok(enemySeparation(a,b)>=expected);}
});
