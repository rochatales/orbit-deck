import test from 'node:test';import assert from 'node:assert/strict';
import{loadSource}from'./load-source.mjs';
const{COMBAT,HORDE_ENCOUNTER,ENCOUNTER_CHOICES,PATROL_KINDS,PATROL_COUNTS,encounterTotal,encounterLayout,parseEncounter,patrolChoice,robotConfig}=loadSource('src/combat/config.ts');
const{CombatSimulation}=loadSource('src/combat/simulation.ts');
const{clearSegment,traversable}=loadSource('src/combat/navigation.ts');
const{createPhase01Terrain}=loadSource('src/game/shanghai/layout.ts');
const{createWorld}=loadSource('src/game/shanghaiWorld.ts');
const{useCombatStore:store}=loadSource('src/state/useCombatStore.ts');
const idle=p=>({player:p,aim:{x:p.x,z:p.z+5},firing:false,reload:false,facingAngle:0});
const others=PATROL_KINDS.filter(kind=>kind!=='patrol');

test('Patrulha de um tipo: escolhas, quantidade e compatibilidade com o seletor antigo',()=>{
 for(const n of[1,3,5,COMBAT.encounterSize])assert.ok(ENCOUNTER_CHOICES.includes(n),'números antigos continuam válidos');
 assert.ok(ENCOUNTER_CHOICES.includes(HORDE_ENCOUNTER));
 for(const kind of others){
  for(const n of PATROL_COUNTS){const c=patrolChoice(kind,n);assert.ok(ENCOUNTER_CHOICES.includes(c));assert.deepEqual(parseEncounter(c),{kind,count:n});assert.equal(encounterTotal(c),n);}
  assert.ok(!ENCOUNTER_CHOICES.includes(patrolChoice(kind,COMBAT.encounterSize)),'32 só para o Patrol comum');
 }
 assert.equal(patrolChoice('patrol',3),3);assert.deepEqual(parseEncounter(5),{kind:'patrol',count:5});assert.equal(parseEncounter(HORDE_ENCOUNTER),null);
});

test('Patrulha de um tipo: cada tipo × quantidade cria só aquele tipo em pontos válidos da fase 01',()=>{
 const layout=encounterLayout(true);
 for(const kind of others)for(const count of PATROL_COUNTS){
  const terrain=createPhase01Terrain(),sim=new CombatSimulation(terrain,patrolChoice(kind,count),layout),R=robotConfig({kind});
  assert.equal(sim.robots.length,count,`${kind} ${count}`);assert.equal(sim.total,count);assert.equal(sim.waves.length,0);
  for(const r of sim.robots){
   assert.equal(r.kind,kind);assert.equal(r.hp,R.hp);assert.equal(r.pace,R.speed);assert.ok(r.spawned);
   assert.ok(traversable(r,terrain,R.radius),`${kind} nasce em ponto livre no próprio raio`);
  }
  const distinct=new Set(sim.robots.map(r=>`${r.x},${r.z}`));assert.equal(distinct.size,count,'pontos de nascimento diferentes');
  const extra=kind==='largeMutant'?count*2:0;assert.equal(sim.drops.length,count+extra,'drops cobrem as 3 matérias do mutante grande');
  const ids=new Set(sim.robots.flatMap(r=>Array.from({length:kind==='largeMutant'?3:1},(_,i)=>r.drop+i)));assert.equal(ids.size,count+extra,'slots de drop sem sobreposição');
  const hits=sim.robots.reduce((n,r)=>n+Math.ceil(r.hp/COMBAT.rifle.damage),0);assert.ok(sim.ammo+sim.reserve>=Math.ceil(hits*COMBAT.hordes.ammoMargin),'munição para o tipo escolhido');
 }
});

test('Patrulha de um tipo: rotas alternadas, bando do mutante pequeno e encontro jogável',()=>{
 const layout=encounterLayout(true);
 const large=new CombatSimulation(createPhase01Terrain(),patrolChoice('largePatrol',3),layout);
 const routes=new Set(large.robots.filter(r=>r.routeIndex>=0).map(r=>r.routeIndex));assert.ok(routes.size>=Math.min(3,large.robots.filter(r=>r.routeIndex>=0).length),'espalhados entre rotas');
 const pack=new CombatSimulation(createPhase01Terrain(),patrolChoice('smallMutant',5),layout);
 assert.equal(new Set(pack.robots.map(r=>r.packAngle.toFixed(4))).size,5,'cada animal tem um setor próprio do cerco');
 for(const kind of others){
  const terrain=createPhase01Terrain(),sim=new CombatSimulation(terrain,patrolChoice(kind,3),layout),R=robotConfig({kind});
  for(let i=0;i<60*20;i++){sim.step(1/60,idle(layout.arrival));for(const r of sim.robots)if(r.hp>0)assert.ok(traversable(r,terrain,R.radius*.98),`${kind} não entra em sólido`);}
  assert.ok(sim.robots.every(r=>r.kind===kind));
 }
});

test('Patrulha de um tipo: blockout antigo cria os tipos sem quebrar',()=>{
 for(const kind of others)for(const count of PATROL_COUNTS){
  const sim=new CombatSimulation(createWorld(),patrolChoice(kind,count),encounterLayout(false));
  assert.equal(sim.robots.length,count);assert.ok(sim.robots.every(r=>r.kind===kind));
 }
});

test('Patrulha de um tipo: store aceita, reinício mantém a escolha e rejeita combinação inválida',()=>{
 const s=store.getState();s.selectEncounter(patrolChoice('largeMutant',3));assert.equal(store.getState().encounter,'largeMutant:3');
 store.getState().restart();assert.equal(store.getState().encounter,'largeMutant:3');assert.equal(store.getState().total,3);
 store.getState().selectEncounter('largeMutant:32');assert.equal(store.getState().encounter,'largeMutant:3','32 rejeitado fora do Patrol comum');
 store.getState().selectEncounter('dragao:3');assert.equal(store.getState().encounter,'largeMutant:3');
 store.getState().selectEncounter(HORDE_ENCOUNTER);assert.equal(store.getState().encounter,HORDE_ENCOUNTER);
});
