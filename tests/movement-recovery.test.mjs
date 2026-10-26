import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import{loadSource}from'./load-source.mjs';import{clearWavesSizeReport}from'./enemy-size-scenarios.mjs';
const{newMovementRecovery,trackMovementGoal,updateMovementRecovery,resetMovementRecovery,movementPriority}=loadSource('src/combat/movementRecovery.ts'),{CombatSimulation}=loadSource('src/combat/simulation.ts'),{COMBAT,robotConfig,encounterLayout}=loadSource('src/combat/config.ts'),{createPhase01Terrain}=loadSource('src/game/shanghai/layout.ts'),{traversable}=loadSource('src/combat/navigation.ts');
const bounds={minX:-40,maxX:40,minZ:-40,maxZ:40},open={bounds,walkableAreas:[bounds],obstacles:[]},player={x:0,z:0},input={player,aim:player,facingAngle:0,firing:false,reload:false};
test('Recuperação mede aproximação real: passos laterais não reiniciam janela, ordem 1,5/3/4 s',()=>{
 const r={...newMovementRecovery(),x:0,z:0};trackMovementGoal(r,0,10);const actions=[];
 for(let f=0;f<241;f++){r.x=f%2?.1:-.1;const a=updateMovementRecovery(r,1/60);if(a>0)actions.push([a,(f+1)/60]);trackMovementGoal(r,0,10);}
 assert.deepEqual(actions.map(a=>a[0]),[1,2,3]);for(const[a,t]of actions)assert.ok(Math.abs(t-[0,1.5,3,4][a])<.018);assert.equal(r.passing,true);assert.equal(r.avoidSide,-1);assert.equal(r.recoveryPasses,1);assert.equal(r.recoveryYieldAttempts,1);
 r.x=0;r.z=.301;assert.equal(updateMovementRecovery(r,1/60),-1);assert.equal(r.noProgress,0);resetMovementRecovery(r);assert.equal(r.passing,false);assert.equal(r.recoveryPasses,1);
});
test('Recuperação: só o menor cede, por até 1,5 s e alvo de recuo 1 m; pausa e renascimento limpam estado',()=>{
 const s=new CombatSimulation(open,'hordas');s.waveLeft=.001;s.step(1/60,input);s.robots.forEach(r=>r.hp=0);const[a,b]=s.robots;
 for(const small of ['smallMutant','patrol','largePatrol']){Object.assign(a,{kind:'largeMutant',x:0,z:-3,hp:200,progressX:0,progressZ:10});Object.assign(b,{kind:small,x:0,z:-1,hp:100,angle:0,progressX:0,progressZ:10,yieldLeft:0});s.requestYield(a);assert.equal(a.yieldLeft,0);assert.equal(b.yieldLeft,1.5);assert.ok(Math.abs(Math.hypot(b.yieldX-b.x,b.yieldZ-b.z)-1)<1e-9);}
 assert.deepEqual(['largeMutant','largePatrol','patrol','smallMutant'].map(movementPriority),[3,2,1,0]);
 const before=JSON.stringify(b);s.step(10,input,true);assert.equal(JSON.stringify(b),before);const fresh=new CombatSimulation(open,1).robots[0];assert.equal(fresh.passing,false);assert.equal(fresh.yieldLeft,0);assert.equal(fresh.recoveryRepaths,0);
});
test('Recuperação atravessa apenas aliados: jogador e parede continuam sólidos durante passagem',()=>{
 const s=new CombatSimulation(open,'hordas');s.waveLeft=.001;s.step(1/60,input);s.robots.forEach(r=>r.hp=0);const[a,b]=s.robots;Object.assign(a,{x:0,z:-3,hp:75,alerted:true,passing:true,recoveryStage:3});Object.assign(b,{x:0,z:-2.5,hp:75,alerted:true});
 for(let f=0;f<600;f++){s.hp=100;s.step(1/60,input);assert.ok(Math.hypot(a.x,a.z)>=COMBAT.robot.radius+.32-1e-6);assert.ok(traversable(a,open,COMBAT.robot.radius));}
 assert.equal(a.passing,false);
 s.terrain.obstacles.push({minX:-40,maxX:40,minZ:2,maxZ:3});Object.assign(a,{x:0,z:0,passing:true,recoveryStage:3});assert.equal(s.clearPlayerStep(a,{x:0,z:.1},{x:0,z:.9}),false);assert.equal(s.roomAt(a,b),true);
 const terrain=s.terrain;for(let f=0;f<600;f++){s.hp=100;s.step(1/60,{...input,player:{x:0,z:6}});assert.ok(traversable(a,terrain,COMBAT.robot.radius));assert.ok(a.z<2-COMBAT.robot.radius);}
});
test('Regressão: grupo misto do bloqueio antigo libera a rua sem mover spawns ou sólidos',()=>{
 const s=new CombatSimulation(createPhase01Terrain(),'hordas',encounterLayout(true)),p={x:0,z:9.5},i={...input,player:p},old=JSON.parse(fs.readFileSync('docs/handoffs/s3.3-mutante-grande/ajustes-26-10/blocked-browser.json'));s.wave=3;s.waveLeft=.001;s.step(1/60,i);s.robots.forEach(r=>r.hp=0);
 for(const row of old.survivors)Object.assign(s.robots[row.id],{x:row.x,z:row.z,kind:row.kind,hp:row.hp,alerted:true,path:[],repath:0});
 let invalid=0;for(let f=0;f<90*60;f++){s.hp=100;s.step(1/60,i);for(const r of s.robots)if(r.hp>0&&!traversable(r,s.terrain,robotConfig(r).radius))invalid++;}
 assert.equal(invalid,0);for(const row of old.survivors){const r=s.robots[row.id];assert.ok(Math.hypot(r.x-p.x,r.z-p.z)<10,`slot ${r.id} precisa liberar a rua norte`);}assert.ok(s.robots.some(r=>r.recoveryPasses>0));
});
for(const[name,p]of[['desembarque',{x:0,z:9.5}],['rua norte',{x:0,z:-41}],['parede',{x:9.6,z:-5}]])test(`Hordas completas sem fila permanente: ${name}, 115 baixas e parada máxima <10 s`,()=>{
 const r=clearWavesSizeReport(360,p);assert.ok(r.cleared,JSON.stringify(r));assert.equal(r.kills,115);assert.equal(r.invalid,0);assert.ok(r.maxIdle<10,JSON.stringify(r));assert.ok(r.maxNoProgress<10,JSON.stringify(r));assert.ok(r.seconds<360);assert.deepEqual(r.waves.map(w=>w.spawned),[13,26,32,44]);assert.equal(r.remaining,0);
});

test('Recuperação: alvo móvel reancora a janela sem esconder o tempo travado',()=>{
 const r={...newMovementRecovery(),x:0,z:0};trackMovementGoal(r,0,10);for(let i=0;i<91;i++)updateMovementRecovery(r,1/60);
 const before=r.noProgress;trackMovementGoal(r,10,0);assert.equal(r.progressX,10);assert.equal(r.progressZ,0);assert.equal(r.noProgress,before);assert.equal(r.recoveryStage,1);
 r.x=.31;assert.equal(updateMovementRecovery(r,1/60),-1);assert.equal(r.noProgress,0);
});

for(const[name,x,z]of[['rua ampla',-17.5,-30],['rua estreita',0,-6]])test(`Shanghai real: investida atravessa cinco robôs em ${name}, sem aliado em sólido`,()=>{
 const terrain=createPhase01Terrain(),s=new CombatSimulation(terrain,'hordas',encounterLayout(true)),p={x,z:z+6},i={...input,player:p};s.wave=2;s.waveLeft=.001;s.step(1/60,i);const r=s.robots.find(r=>r.kind==='largeMutant');s.robots.forEach(o=>o.hp=0);Object.assign(r,{x,z,hp:200,alerted:true,chargePhase:'ready',chargeLeft:0});s.step(1/60,i);assert.equal(r.chargePhase,'windup');for(let f=0;f<48;f++)s.step(1/60,i);assert.equal(r.chargePhase,'dash');
 const group=s.robots.filter(o=>o!==r).slice(0,5);group.forEach((o,k)=>Object.assign(o,{kind:'patrol',x:x+(k%2?.1:-.1),z:z+2+k*1.7,hp:75,alerted:false,pace:0}));const outside=new Set();
 for(let f=0;f<67;f++){s.hp=100;s.step(1/60,{...i,player:{x,z:z+26}});assert.ok(traversable(r,terrain,robotConfig(r).radius));for(const o of group){assert.ok(traversable(o,terrain,COMBAT.robot.radius));assert.equal(o.hp,75);if(Math.abs(o.x-x)>2.58)outside.add(o.id);}}
 assert.ok(Math.abs(r.chargeTraveled-10)<1e-6);assert.equal(r.chargePhase,'cooldown');if(name==='rua ampla')assert.equal(outside.size,5);else assert.ok(group.some(o=>Math.abs(o.x-x)<2.58),'permitido ficar na faixa estreita, aranha completa a corrida');
});
