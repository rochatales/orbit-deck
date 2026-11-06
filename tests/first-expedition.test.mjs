import test from 'node:test';
import assert from 'node:assert/strict';
import { createSourceLoader, loadSource } from './load-source.mjs';
import { loadGlb } from './load-glb.mjs';
import { Matrix4, Vector3 } from 'three';
const zero = { iron: 0, copper: 0, titanium: 0, organic: 0 }, profile = { displayName: 'S3.2', color: '#abcdef' };
function fixture(values = new Map()) {
    const writes = [];
    globalThis.localStorage = { getItem: k => values.get(k) ?? null, setItem: (k,v) => { values.set(k,v); writes.push(k); } };
    const load = createSourceLoader();
    const expedition = load('src/state/useExpeditionStore.ts').useExpeditionStore;
    const campaign = load('src/state/useCampaignStore.ts').useCampaignStore;
    const { useCombatStore: combat, combatRuntime } = load('src/state/useCombatStore.ts');
    const ship = load('src/state/useShipCargoStore.ts').useShipCargoStore;
    const game = load('src/state/useGameStore.ts').useGameStore;
    const { placePlayer } = load('src/state/playerTransient.ts'), { MAPS } = load('src/game/config.ts');
    const travel = () => {
        expedition.getState().setReady(true); game.setState({isPaused:false});
        placePlayer(MAPS[expedition.getState().session.map].exit);
        expedition.getState().send('board'); assert.equal(expedition.getState().session.phase,'aboard');
        expedition.getState().send('depart'); expedition.getState().send('arrive');
        expedition.getState().setReady(true); expedition.getState().send('exit');
    };
    const pack = (copper, iron = 0, organic = 0) => {
        const sim = { ...zero, copper, iron, organic, dead:false, get snapshot() { return { ...combat.getState(), ...zero, copper:this.copper,iron:this.iron,organic:this.organic }; } };
        combatRuntime.simulation = sim; combat.getState().publish(sim.snapshot); return sim;
    };
    const enter = () => { expedition.getState().enterCampaign(profile); campaign.getState().dispatch('finish-engineer-briefing'); };
    return { load, values, writes, expedition, campaign, combat, combatRuntime, ship, game, placePlayer, MAPS, travel, pack, enter };
}

test('S3.2: saldo soma depósitos, retirada reduz até zero, morte/restart tiram apenas o saldo', () => {
    const f=fixture(); f.enter(); f.campaign.getState().setCargo({...zero,copper:7,iron:5}); f.travel();
    const sim=f.pack(4,4); assert.equal(f.ship.getState().deposit(),8);
    assert.deepEqual(f.campaign.getState().saved.attemptCargo,{...zero,copper:4,iron:4});
    assert.equal(f.ship.getState().withdraw('copper',2),2);
    assert.equal(f.campaign.getState().saved.attemptCargo.copper,2);
    assert.equal(f.ship.getState().withdraw('iron',8),8);
    assert.equal(f.campaign.getState().saved.attemptCargo.iron,0,'retirar carga anterior não gera saldo negativo');
    sim.dead=true;f.combat.setState({dead:true,hp:0});
    assert.deepEqual(f.ship.getState().cargo,{...zero,copper:7,iron:1});
    assert.deepEqual(f.campaign.getState().saved.attemptCargo,zero);
    assert.equal(sim.copper,0);assert.equal(f.combat.getState().copper,0,'mochila perdida na morte');
    f.expedition.getState().restartMission();f.pack(2);f.ship.getState().deposit();f.expedition.getState().restartMission();
    assert.deepEqual(f.ship.getState().cargo,{...zero,copper:7,iron:1});
    assert.equal(f.campaign.getState().saved.campaign.copperDelivered,0);
});

test('S3.2: retorno parcial, mochila excluída, entrega sem consumo e sem duplicação por chegada repetida', () => {
    const f=fixture();f.enter();f.travel();f.pack(4);f.ship.getState().deposit('copper',2);f.travel();
    let saved=f.campaign.getState().saved;
    assert.equal(saved.campaign.copperDelivered,2);assert.equal(saved.campaign.stage,'expedition-copper');
    assert.equal(saved.cargo.copper,2);assert.deepEqual(saved.attemptCargo,zero);
    const id=saved.campaign.lastExpeditionId;f.expedition.getState().send('arrive');
    assert.equal(f.campaign.getState().saved.campaign.lastExpeditionId,id);
    f.combat.setState({dead:true});assert.equal(f.ship.getState().cargo.copper,2,'morrer depois de voltar não apaga carga retornada');
    f.travel();f.pack(2,0,1);f.ship.getState().deposit();f.travel();saved=f.campaign.getState().saved;
    assert.equal(saved.cargo.copper,4);assert.equal(saved.cargo.organic,1);
    assert.equal(saved.campaign.copperDelivered,4);assert.equal(saved.campaign.organicDelivered,1);
    assert.equal(saved.campaign.stage,'eden-activation');assert.equal(saved.campaign.edenActive,false);
    assert.equal(saved.campaign.depositedExpeditionIds.length,2);assert.notEqual(saved.campaign.lastExpeditionId,id);
    assert.match(f.load('src/game/campaign.ts').campaignObjective({...saved.campaign,stage:'expedition-copper',copperDelivered:2}),/2 \/ 4/);
});

test('S3.2: reload e tela inicial abandonam saldo; save S3.1 sem registro mantém carga', () => {
    const f=fixture();f.enter();f.campaign.getState().setCargo({...zero,copper:5});f.travel();f.pack(2);f.ship.getState().deposit();
    const reload=fixture(f.values);assert.equal(reload.campaign.getState().saved.cargo.copper,5);
    assert.deepEqual(reload.campaign.getState().saved.attemptCargo,zero);assert.equal(reload.campaign.getState().inGame,false);
    reload.expedition.getState().enterCampaign();reload.travel();reload.pack(3);reload.ship.getState().deposit();reload.expedition.getState().returnHome();
    assert.equal(reload.campaign.getState().saved.cargo.copper,5);
    const raw=JSON.parse(f.values.get('exoden:campaign:v1'));delete raw.attemptCargo;
    const old=fixture(new Map([['exoden:campaign:v1',JSON.stringify(raw)]]));
    assert.equal(old.campaign.getState().saved.cargo.copper,5);assert.deepEqual(old.campaign.getState().saved.attemptCargo,zero);
});

test('S3.2: seleção central bloqueia todo alvo antes do briefing; ações diretas também guardadas; EDEN desligada continua bloqueada', () => {
    const f=fixture();f.expedition.getState().enterCampaign(profile);f.expedition.getState().setReady(true);
    const {interactionTargets,activateWorldInteraction}=f.load('src/interactions/runtime.ts');let calls=0;
    f.placePlayer(f.MAPS.mars.exit);
    for(const id of ['ship:mars','npc:eden','synthesizer','qualquer:outro']) interactionTargets.register({id,...f.MAPS.mars.exit,radius:100,priority:10,onInteract:()=>calls++});
    assert.equal(interactionTargets.select(f.MAPS.mars.exit),null);assert.equal(activateWorldInteraction(),false);assert.equal(calls,0);
    f.expedition.getState().send('board');assert.equal(f.expedition.getState().session.phase,'walking');
    f.placePlayer(f.load('src/game/config.ts').EDEN.position);f.expedition.getState().openEden();assert.equal(f.expedition.getState().panel,null);
    assert.equal(f.load('src/game/campaignPolicy.ts').engineerBriefingRequired(),true);
    const world=f.load('src/game/marsWorld.ts').createWorld(),p=f.load('src/npcs/engineerPresence.ts').engineerPresence;
    Object.assign(p,{active:true,world,x:-6.1,y:0,z:6,seated:false});f.placePlayer({x:-5,y:0,z:6});
    interactionTargets.register({id:'npc:engineer',point:p,x:p.x,z:p.z,radius:2.5,priority:30,onInteract:()=>f.expedition.getState().openEngineer()});
    assert.equal(activateWorldInteraction(),true);assert.equal(f.expedition.getState().panel,'engineer');
    const after=f.campaign.getState().saved.campaign;assert.equal(after.stage,'expedition-copper');f.expedition.getState().closePanel();
    f.expedition.getState().openEngineer();assert.equal(f.campaign.getState().saved.campaign,after);f.expedition.getState().closePanel();
    f.placePlayer(f.MAPS.mars.exit);assert.ok(interactionTargets.select(f.MAPS.mars.exit));
    f.expedition.getState().send('board');assert.equal(f.expedition.getState().session.phase,'aboard');
    f.expedition.getState().send('exit');f.placePlayer(f.load('src/game/config.ts').EDEN.position);f.expedition.getState().openEden();assert.equal(f.expedition.getState().panel,null);
});

test('S3.2: campanha força rifle e guarda arma/seleção/save/carga dev byte a byte, inclusive morte dev', () => {
    const hub='{"version":1,"profile":{"displayName":"Dev","color":"#abcdef"},"briefingSeen":true}',cargo='{"iron":7,"copper":8,"titanium":2,"organic":3}';
    const f=fixture(new Map([['exoden:hub:v1',hub],['exoden-carga-aeronave-v1',cargo]])),weapon=f.load('src/state/useWeaponStore.ts').useWeaponStore;
    weapon.getState().equip('machete');f.combat.getState().selectEncounter('largeMutant:5');f.enter();assert.equal(weapon.getState().weapon,'rifle');
    weapon.getState().equip('machete');assert.equal(weapon.getState().weapon,'rifle');
    f.travel();f.pack(4);f.ship.getState().deposit();f.expedition.getState().returnHome();f.expedition.getState().enterDevelopment();
    assert.equal(weapon.getState().weapon,'machete');assert.equal(f.combat.getState().encounter,'largeMutant:5');
    const before={...f.ship.getState().cargo};f.combat.setState({dead:true});assert.deepEqual(f.ship.getState().cargo,before);
    assert.equal(f.values.get('exoden:hub:v1'),hub);assert.equal(f.values.get('exoden-carga-aeronave-v1'),cargo);
    assert.ok(f.writes.every(k=>k==='exoden:campaign:v1'));
    assert.equal(f.load('src/game/campaignPolicy.ts').engineerBriefingRequired(),false);
});

test('S3.2: transmissão exata por visita; quota só de coleta real, mochila + saldo da visita', () => {
    const f=fixture();f.enter();f.travel();let s=f.expedition.getState();
    assert.equal(s.radio,'Conferi aqui, você vai precisar de 04 unidades de cobre.');assert.equal(s.radioSender,'Engenheiro');
    const serial=s.radioSerial;f.expedition.getState().send('arrive');assert.equal(f.expedition.getState().radioSerial,serial);
    f.combat.setState({kills:4,copper:0});assert.equal(f.expedition.getState().radioSerial,serial);
    f.pack(4);assert.match(f.expedition.getState().radio,/Guarde na aeronave/);const quotaSerial=f.expedition.getState().radioSerial;
    f.ship.getState().deposit('copper',2);f.combat.setState({copper:3});assert.equal(f.expedition.getState().radioSerial,quotaSerial);
    f.travel();f.travel();assert.equal(f.expedition.getState().radio,'Conferi aqui, você vai precisar de 04 unidades de cobre.');
});

test('S3.2: quatro Patrol nas esquinas alcançáveis e distantes, quatro cobres/ferros coletáveis, sem hordas e sem seletor dev', () => {
    const {createPhase01Terrain}=loadSource('src/game/shanghai/layout.ts'),{CombatSimulation}=loadSource('src/combat/simulation.ts');
    const {COPPER_ENCOUNTER,COMBAT,encounterLayout,ENCOUNTER_CHOICES}=loadSource('src/combat/config.ts');
    const {campaignEncounter}=loadSource('src/combat/campaignEncounter.ts');
    const terrain=createPhase01Terrain(),layout=encounterLayout(true),sim=new CombatSimulation(terrain,COPPER_ENCOUNTER,layout);
    assert.equal(campaignEncounter('expedition-copper'),COPPER_ENCOUNTER);assert.equal(campaignEncounter('eden-activation'),'hordas');
    assert.equal(ENCOUNTER_CHOICES.includes(COPPER_ENCOUNTER),false);assert.equal(sim.robots.length,4);assert.equal(sim.waves.length,0);
    const {traversable,Navigation}=loadSource('src/combat/navigation.ts'),nav=new Navigation(terrain,COMBAT.robot.radius,.5);
    for(const r of sim.robots) {
        assert.equal(r.kind,'patrol');assert.ok(Math.hypot(r.x-layout.arrival.x,r.z-layout.arrival.z)>=COMBAT.hordes.minPlayerDistance);
        assert.ok(traversable(r,terrain,COMBAT.robot.radius));assert.ok(nav.path(r,layout.arrival).length);
        sim.damageRobot(r,1000,0,1);sim.damageRobot(r,1000,0,1);
    }
    assert.equal(sim.drops.filter(d=>d.active&&d.kind==='metals').length,4);assert.equal(sim.kills,4);
    for(const drop of sim.drops) sim.step(1/60,{player:drop,aim:drop,firing:false,reload:false});
    assert.equal(sim.copper,4);assert.equal(sim.iron,4);assert.equal(sim.organic,0);assert.equal(sim.cleared,true);
    assert.equal(new CombatSimulation(terrain,COPPER_ENCOUNTER,layout).alive,4,'nova visita repõe quota');
});

test('S3.2: início único livre e rotas reais até Oficina, Data Center, Hangar, EDEN e deck, com retorno', () => {
    const {createWorld}=loadSource('src/game/marsWorld.ts'),{INITIAL_POSITION,MAPS,MAP_CAMERA_ANGLE,EDEN}=loadSource('src/game/config.ts');
    const {Navigation,traversable,clearSegment}=loadSource('src/combat/navigation.ts'),world=createWorld();
    const radius=.38,nav=new Navigation(world,radius,.5);assert.deepEqual(INITIAL_POSITION,{x:-1,y:0,z:26});
    assert.ok(traversable(INITIAL_POSITION,world,radius));
    assert.equal(MAP_CAMERA_ANGLE.mars,3*Math.PI/4);assert.equal(MAP_CAMERA_ANGLE.shanghai,Math.PI/4);
    assert.equal(loadSource('src/state/useGameStore.ts').useGameStore.getState().targetRotation,3*Math.PI/4);
    assert.equal(loadSource('src/state/playerTransient.ts').cameraView.angle,3*Math.PI/4);
    assert.equal(loadSource('src/state/playerTransient.ts').isNearShip('mars',INITIAL_POSITION),false);
    const nearEden=nav.points.find(p=>Math.hypot(p.x-EDEN.position.x,p.z-EDEN.position.z)<EDEN.interactionRadius&&Math.hypot(p.x-EDEN.position.x,p.z-EDEN.position.z)>1);
    for(const to of [{x:-10.3,z:11.2},{x:-10.3,z:0},{x:0,z:21},nearEden,MAPS.mars.exit]) {
        assert.ok(to);let previous=INITIAL_POSITION,path=nav.path(INITIAL_POSITION,to);assert.ok(path.length,JSON.stringify(to));
        for(const p of path){assert.ok(clearSegment(previous,p,world,radius));previous=p;}
        assert.ok(nav.path(to,INITIAL_POSITION).length,'rota de volta');
    }
    const {EngineerRoutine,ENGINEER}=loadSource('src/npcs/engineerRoutine.ts'),routine=new EngineerRoutine(world);
    assert.ok(Math.hypot(ENGINEER.start.x-INITIAL_POSITION.x,ENGINEER.start.z-INITIAL_POSITION.z)>10);
    let available=false;const presence=loadSource('src/npcs/engineerPresence.ts');
    const load=createSourceLoader(),same=load('src/npcs/engineerPresence.ts');
    for(let f=0;f<120*60;f++) {
        routine.update(1/60,INITIAL_POSITION);
        const r=routine.position,p=nav.points.find(p=>Math.hypot(p.x-r.x,p.z-r.z)>1&&Math.hypot(p.x-r.x,p.z-r.z)<2.3);
        if(p){Object.assign(same.engineerPresence,{...r,active:true,world,seated:false});if(same.canTalkToEngineer(p)&&nav.path(INITIAL_POSITION,p).length){available=true;break;}}
    }
    assert.equal(available,true,'algum ponto alcançável do ciclo permite conversar');
});

test('S3.2: faixa do Engenheiro presa ao Head em Idle/Walk/Sitting, sem luz e com descarte próprio', async () => {
    const {EngineerRig}=loadSource('src/npcs/engineerRig.ts'),g=await loadGlb('src/assets/characters/npcs/engenheiro-v001.glb'),rig=new EngineerRig(g.scene,g.animations);
    assert.ok(rig.visor);assert.equal(rig.visor.light,null);let lights=0;rig.root.traverse(n=>{if(n.isLight)lights++;});assert.equal(lights,0);
    const initial=rig.visor.group.matrix.clone();
    for(const animation of ['Idle','Walk','Sitting'])for(let f=0;f<40;f++){
        rig.update({x:2,y:0,z:3,angle:.5,animation,clipTime:null},.05);rig.root.updateMatrixWorld(true);
        const local=new Matrix4().copy(rig.visor.head.matrixWorld).invert().multiply(rig.visor.group.matrixWorld);
        assert.ok(local.elements.every((v,i)=>Math.abs(v-initial.elements[i])<1e-6));
    }
    assert.equal(rig.visor.stripe.material.color.getHexString(),'4bd4ff');
    let disposed=0;for(const node of rig.visor.group.children){node.geometry.addEventListener('dispose',()=>disposed++);node.material.addEventListener('dispose',()=>disposed++);}
    rig.dispose();rig.dispose();assert.equal(disposed,4);assert.equal(rig.visor.group.parent,null);
});

test('S3.2: quota não duplica a mochila durante transferência e cobre já retornado não conta duas vezes',()=>{
    const f=fixture();f.enter();f.travel();f.pack(2);const serial=f.expedition.getState().radioSerial;
    f.ship.getState().deposit();assert.equal(f.expedition.getState().radioSerial,serial,'dois na mochila viram dois no porão, não quatro');
    f.travel();assert.equal(f.campaign.getState().saved.campaign.copperDelivered,2);
    f.travel();f.pack(0);f.ship.getState().withdraw('copper',2);f.ship.getState().deposit('copper',2);
    assert.equal(f.campaign.getState().saved.attemptCargo.copper,2,'redepositar continua em risco na tentativa');
    assert.equal(f.campaign.getState().saved.attemptDelivery.copper,0,'mas não concede a mesma entrega de novo');
    f.travel();assert.equal(f.campaign.getState().saved.campaign.copperDelivered,2);
    f.travel();f.pack(2);f.ship.getState().deposit();f.travel();assert.equal(f.campaign.getState().saved.campaign.copperDelivered,4);
});

test('S3.2 revisão: rádio não confunde cobre antigo com quota elegível, e retorno/retry têm remetente próprio',()=>{
    const f=fixture();f.enter();assert.equal(f.expedition.getState().radioSender,'Engenheiro');assert.doesNotMatch(f.expedition.getState().radio,/Encontre-a/);
    f.campaign.getState().setCargo({...zero,copper:4});f.travel();f.pack(0);const serial=f.expedition.getState().radioSerial;
    f.ship.getState().withdraw('copper',4);f.ship.getState().deposit();assert.equal(f.expedition.getState().radioSerial,serial,'cobre antigo não satisfaz quota de entrega');
    f.expedition.getState().restartMission();assert.equal(f.expedition.getState().radioSender,'Sistema');assert.match(f.expedition.getState().radio,/Nova tentativa/);assert.ok(f.expedition.getState().radioSerial>serial);
    f.expedition.getState().returnHome();f.expedition.getState().enterCampaign();
    f.expedition.getState().setReady(true);f.placePlayer(f.MAPS.mars.exit);
    f.expedition.getState().send('board');f.expedition.getState().send('depart');f.expedition.getState().send('arrive');f.expedition.getState().setReady(true);
    // Chega na cabine, retorna sem desembarcar: a transmissão pendente não pode vazar para Marte.
    f.expedition.getState().send('depart');f.expedition.getState().send('arrive');
    assert.equal(f.expedition.getState().session.map,'mars');assert.equal(f.expedition.getState().radioSender,'Sistema');assert.match(f.expedition.getState().radio,/Pousamos em Marte/);
});
