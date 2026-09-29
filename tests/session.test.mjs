import test from 'node:test';
import assert from 'node:assert/strict';
import {loadSource} from './load-source.mjs';
const {transition,INITIAL_SESSION,parseSave,migrateProfile}=loadSource('src/game/session.ts');
test('boarding does not launch; exiting returns to the same map',()=>{
 const aboard=transition(INITIAL_SESSION,'board');assert.equal(aboard.map,'mars');assert.equal(aboard.phase,'aboard');
 assert.equal(transition(aboard,'exit').phase,'walking');assert.equal(transition(INITIAL_SESSION,'depart'),INITIAL_SESSION);
});
test('round trip arrives aboard and duplicate launch/arrival cannot launch twice',()=>{
 let s=transition(transition(INITIAL_SESSION,'board'),'depart');
 assert.equal(s.map,'mars');assert.equal(s.destination,'shanghai');assert.equal(transition(s,'depart'),s);assert.equal(transition(s,'exit'),s);
 s=transition(s,'arrive');assert.equal(s.map,'shanghai');assert.equal(s.phase,'aboard');assert.equal(transition(s,'arrive'),s);
 s=transition(transition(s,'depart'),'arrive');assert.equal(s.map,'mars');assert.equal(s.phase,'aboard');
});
test('failed travel preserves origin and allows another attempt',()=>{
 let s=transition(transition(transition(INITIAL_SESSION,'board'),'depart'),'fail');assert.equal(s.map,'mars');assert.equal(s.phase,'aboard');assert.equal(s.destination,null);assert.equal(transition(s,'depart').destination,'shanghai');
});
test('old profile migrates without connection, workflow or mission state',()=>{
 const profile=migrateProfile(JSON.stringify({state:{profile:{displayName:'Explorer',color:'#AABBCC'},connections:{secret:'ignored'},stage:'workspace'}}));
 assert.deepEqual(profile,{displayName:'Explorer',color:'#AABBCC'});
 const saved=parseSave(JSON.stringify({version:1,profile,briefingSeen:true,session:{map:'shanghai'}}));
 assert.deepEqual(Object.keys(saved).sort(),['briefingSeen','profile','version']);assert.equal(saved.briefingSeen,true);
});
test('invalid, corrupt and future saves fall back safely',()=>{
 for(const raw of [null,'{broken','null',JSON.stringify({version:2,profile:{displayName:'Test'}})]) assert.equal(parseSave(raw).profile,null);
 assert.equal(migrateProfile('{bad'),null);
 assert.equal(parseSave(JSON.stringify({version:1,profile:{displayName:'Test',color:'invalid'}})).profile.color,'#66e6ff');
});
