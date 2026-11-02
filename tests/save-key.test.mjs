import test from 'node:test';
import assert from 'node:assert/strict';
import {loadSource} from './load-source.mjs';
globalThis.localStorage={getItem:()=>null,setItem:()=>{}};
const {loadHubSave}=loadSource('src/state/useExpeditionStore.ts');
const storage=entries=>()=>({getItem:k=>entries[k]??null});
const save=(name,briefingSeen)=>JSON.stringify({version:1,profile:{displayName:name,color:'#66e6ff'},briefingSeen});
test('EXODEN: save novo é lido pela chave exoden:hub:v1',()=>{
 const s=loadHubSave(storage({'exoden:hub:v1':save('Nova',true)}));
 assert.equal(s.profile.displayName,'Nova');assert.equal(s.briefingSeen,true);
});
test('EXODEN: perfil salvo com o nome antigo (horda-survivor:hub:v1) é migrado',()=>{
 const s=loadHubSave(storage({'horda-survivor:hub:v1':save('Antiga',true)}));
 assert.equal(s.profile.displayName,'Antiga');assert.equal(s.briefingSeen,true);
});
test('EXODEN: a chave nova tem precedência sobre a antiga',()=>{
 const s=loadHubSave(storage({'exoden:hub:v1':save('Nova',false),'horda-survivor:hub:v1':save('Antiga',true)}));
 assert.equal(s.profile.displayName,'Nova');assert.equal(s.briefingSeen,false);
});
test('EXODEN: sem save, migração do MCP Office continua; armazenamento indisponível não quebra',()=>{
 const s=loadHubSave(storage({'mcp-office:journey:v1':JSON.stringify({state:{profile:{displayName:'Office',color:'#abcdef'}}})}));
 assert.equal(s.profile.displayName,'Office');
 assert.deepEqual(loadHubSave(()=>{throw new Error('bloqueado');}),{version:1,profile:null,briefingSeen:false});
});
