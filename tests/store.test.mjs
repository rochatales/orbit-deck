import test from 'node:test';
import assert from 'node:assert/strict';
import {loadSource} from './load-source.mjs';
const values=new Map([['mcp-office:journey:v1',JSON.stringify({state:{profile:{displayName:'Old Profile',color:'#abcdef'}}})]]);
globalThis.localStorage={getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,v)};
const {useExpeditionStore:store}=loadSource('src/state/useExpeditionStore.ts');
const {useGameStore:game}=loadSource('src/state/useGameStore.ts');
const {MAPS,EDEN}=loadSource('src/game/config.ts');
const {placePlayer:place}=loadSource('src/state/playerTransient.ts');
test('integration: migrated identity, distance guards, boarding/roundtrip, persistence without transient travel',()=>{
 assert.equal(store.getState().profile.displayName,'Old Profile');store.getState().setReady(true);
 store.getState().send('board');assert.equal(store.getState().session.phase,'walking');
 place(EDEN.position);store.getState().openEden();assert.equal(store.getState().panel,'eden');store.getState().closePanel();
 const save=JSON.parse(values.get('horda-survivor:hub:v1'));assert.equal(save.briefingSeen,true);assert.equal(save.session,undefined);
 place(MAPS.mars.exit);store.getState().send('board');assert.equal(store.getState().session.phase,'aboard');
 store.getState().send('depart');store.getState().send('depart');assert.equal(store.getState().session.destination,'shanghai');
 store.getState().send('arrive');store.getState().setReady(true);assert.equal(store.getState().session.map,'shanghai');assert.equal(store.getState().spawn.z,13);
 store.getState().send('exit');assert.deepEqual(store.getState().spawn,MAPS.shanghai.exit);
 store.getState().send('board');store.getState().send('depart');store.getState().send('arrive');store.getState().setReady(true);store.getState().send('exit');
 assert.equal(store.getState().session.map,'mars');assert.deepEqual(store.getState().spawn,MAPS.mars.exit);
 assert.equal(JSON.parse(values.get('horda-survivor:hub:v1')).session,undefined);
});
test('paused and loading interactions are rejected; save errors are visible',()=>{
 place(MAPS.mars.exit);game.setState({isPaused:true});store.getState().send('board');assert.equal(store.getState().session.phase,'walking');
 game.setState({isPaused:false});store.getState().setReady(false);store.getState().send('board');assert.equal(store.getState().session.phase,'walking');
 globalThis.localStorage.setItem=()=>{throw new Error('quota');};store.getState().start('Explorer','#66e6ff');assert.match(store.getState().saveError,/salvar/);
});
test('combat death blocks boarding; retry clears transient HUD and restores Shanghai spawn',()=>{
 const {useCombatStore:combat}=loadSource('src/state/useCombatStore.ts');
 store.setState({ready:true,panel:null,session:{map:'shanghai',phase:'walking',destination:null,revision:20}});
 place(MAPS.shanghai.exit);game.setState({isPaused:false});
 combat.setState({hp:0,dead:true,ammo:0,reserve:0,kills:2,reloading:true});
 store.getState().send('board');assert.equal(store.getState().session.phase,'walking');
 const run=combat.getState().run;store.getState().restartMission();
 assert.equal(combat.getState().run,run+1);assert.equal(combat.getState().hp,100);assert.equal(combat.getState().ammo,24);assert.equal(combat.getState().reserve,96);assert.equal(combat.getState().kills,0);assert.equal(combat.getState().reloading,false);
 assert.deepEqual(store.getState().spawn,MAPS.shanghai.exit);assert.equal(store.getState().session.revision,21);
 store.getState().send('board');assert.equal(store.getState().session.phase,'aboard');
 const before=combat.getState().run;store.getState().restartMission();assert.equal(combat.getState().run,before,'cannot restart aboard');
});
