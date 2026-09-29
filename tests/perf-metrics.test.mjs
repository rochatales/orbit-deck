import test from 'node:test';
import assert from 'node:assert/strict';
import {loadSource} from './load-source.mjs';
const perf=loadSource('src/dev/perf/perfMetrics.ts');

const noCoverage={intervalsCollected:3,intervalsCapacity:100,intervalsSaturated:false,countersCollected:2,countersCapacity:100,countersSaturated:false};

/** Ambiente falso: relógio, rAF, visibilidade, pausa, store da expedição e API global. */
function fakeEnv({loaf=true}={}){
 const env={t:0,hidden:false,paused:false,frames:new Map(),nextId:1,visibility:new Set(),pausedL:new Set(),readyL:new Set(),loafL:new Set(),global:undefined,installs:0};
 env.deps={
  now:()=>env.t,
  requestFrame:cb=>{const id=env.nextId++;env.frames.set(id,cb);return id;},
  cancelFrame:id=>env.frames.delete(id),
  isHidden:()=>env.hidden,
  onVisibilityChange:l=>{env.visibility.add(l);return()=>env.visibility.delete(l);},
  observeLongFrames:l=>{if(!loaf)return null;env.loafL.add(l);return()=>env.loafL.delete(l);},
  isPaused:()=>env.paused,
  onPausedChange:l=>{env.pausedL.add(l);return()=>env.pausedL.delete(l);},
  onReadyChange:l=>{env.readyL.add(l);return()=>env.readyL.delete(l);},
  setGlobalApi:api=>{env.global=api;env.installs++;},
  clearGlobalApi:api=>{if(env.global===api)env.global=undefined;}
 };
 /** Avança um frame de `dt` ms, executando só os callbacks pendentes (como o navegador). */
 env.frame=(dt=16)=>{env.t+=dt;const pending=[...env.frames.entries()];env.frames.clear();for(const [,cb] of pending)cb(env.t);};
 env.ready=(prev,next,loadingMap,currentMap)=>{for(const l of env.readyL)l(prev,next,loadingMap,currentMap);};
 env.listeners=()=>env.visibility.size+env.pausedL.size+env.readyL.size+env.loafL.size+env.frames.size;
 return env;
}

test('S2.9: ativação só com ?perf', () => {
 assert.equal(perf.isPerfEnabled(''),false);
 assert.equal(perf.isPerfEnabled('?debug=1'),false);
 assert.equal(perf.isPerfEnabled('?perf'),true);
 assert.equal(perf.isPerfEnabled('?x=1&perf=1'),true);
});

test('S2.9: percentis e intervalos de rAF acima de 33,3 ms e 50 ms', () => {
 assert.equal(perf.percentile([],50),null);
 const intervals=[...Array(90).fill(16),...Array(6).fill(40),...Array(4).fill(80)];
 const s=perf.summarizeIntervals(intervals);
 assert.equal(s.count,100);
 assert.equal(s.p50,16);
 assert.equal(s.p95,40);
 assert.equal(s.max,80);
 assert.equal(s.rafOver33,10);
 assert.equal(s.rafOver50,4);
 assert.equal(perf.summarizeIntervals([]),null);
 assert.equal(perf.summarizeIntervals([NaN,-1]),null,'valores inválidos são descartados');
});

test('S2.9: dados ausentes aparecem como indisponíveis, nunca como zero', () => {
 assert.equal(perf.formatValue(null,'ms'),'indisponível');
 assert.equal(perf.formatValue(undefined),'indisponível');
 assert.equal(perf.formatValue(0,'ms'),'0.0 ms');
 assert.equal(perf.formatBytes(null),'indisponível');
 const nav=perf.summarizeNavigation({responseEnd:120,domContentLoadedEventEnd:300,loadEventEnd:0});
 assert.equal(nav.responseEndMs,120);
 assert.equal(nav.loadEventEndMs,null,'loadEventEnd=0 significa ainda não ocorreu');
 assert.equal(nav.documentTransferBytes,null);
 assert.deepEqual(perf.summarizeNavigation(undefined),{responseEndMs:null,domContentLoadedMs:null,loadEventEndMs:null,documentTransferBytes:null});
 assert.equal(perf.readHeapMemory(undefined),null);
 assert.deepEqual(perf.readHeapMemory({usedJSHeapSize:1,totalJSHeapSize:2,jsHeapSizeLimit:3}),{usedBytes:1,totalBytes:2,limitBytes:3});
});

test('S2.9: recursos separam modelos e não inventam bytes ausentes', () => {
 const r=perf.summarizeResources([
  {name:'http://127.0.0.1:5178/assets/player-main-abc.glb?v=1',startTime:30,responseEnd:70,duration:40,transferSize:1000,encodedBodySize:900},
  {name:'http://127.0.0.1:5178/assets/index.js',duration:10}
 ]);
 assert.equal(r.count,2);
 assert.equal(r.transferBytes,1000);
 assert.equal(r.models.length,1);
 assert.equal(r.models[0].file,'player-main-abc.glb');
 assert.equal(r.models[0].responseEndMs,70);
 assert.equal(perf.summarizeResources([{name:'a.js',duration:1}]).transferBytes,null);
});

test('S2.9: aba oculta invalida a amostra e pausa vira aviso', () => {
 const base={startedAtMs:1000,requestedMs:10000,elapsedMs:10000,map:'mars',intervals:[16,17,18],coverage:noCoverage,pausedDuringSample:false,loafSupported:true,loafCount:1,loafMaxMs:60,
  counters:[{sampledAtMs:1100,drawCalls:10,triangles:500,geometries:3,textures:1,programs:2},{sampledAtMs:1200,drawCalls:14,triangles:700,geometries:3,textures:1,programs:2}]};
 const valid=perf.buildSampleResult({...base,hiddenDuringSample:false});
 assert.equal(valid.status,'valid');
 assert.equal(valid.rafIntervals.count,3);
 assert.deepEqual(valid.longAnimationFrames,{supported:true,count:1,maxDurationMs:60});
 assert.equal(valid.renderer.drawCalls.min,10);
 assert.equal(valid.renderer.drawCalls.max,14);
 assert.equal(valid.renderer.lastSampledAtMs,1200);
 const hidden=perf.buildSampleResult({...base,hiddenDuringSample:true});
 assert.equal(hidden.status,'invalid');
 assert.match(hidden.invalidReason,/oculta/);
 assert.equal(hidden.rafIntervals,null);
 assert.equal(hidden.renderer,null);
 assert.deepEqual(hidden.longAnimationFrames,{supported:true,count:null,maxDurationMs:null},'suporte preservado, contagem ausente');
 const paused=perf.buildSampleResult({...base,hiddenDuringSample:false,pausedDuringSample:true});
 assert.equal(paused.status,'valid');
 assert.equal(paused.warnings.length,1);
 const noLoaf=perf.buildSampleResult({...base,hiddenDuringSample:false,loafSupported:false});
 assert.deepEqual(noLoaf.longAnimationFrames,{supported:false,count:null,maxDurationMs:null});
});

test('S2.9: capacidade cobre a duração pedida e saturação invalida explicitamente', () => {
 const cap=perf.sampleCapacities(60000);
 assert.ok(cap.intervals>=60*240*2,'60 s a 240 Hz cabem com folga');
 assert.ok(cap.counters>=600,'uma leitura a cada 100 ms durante 60 s');
 const env=fakeEnv();
 const shared=perf.createPerfShared();
 const session=perf.createPerfSession(shared,env.deps,'mars');
 let result;session.sample(60000).then(r=>{result=r;});
 for(let i=0;i<60000/4.2+2&&!result;i++){env.frame(4.2);perf.offerCounters(shared,{sampledAtMs:env.t,drawCalls:5,triangles:9,geometries:1,textures:1,programs:1});}
 return Promise.resolve().then(()=>{
  assert.equal(result.status,'valid','240 Hz durante 60 s não satura');
  assert.equal(result.coverage.intervalsSaturated,false);
  assert.ok(result.coverage.intervalsCollected>=60000/4.2-1);
  assert.ok(result.renderer.samples>=590);
  const saturated=perf.buildSampleResult({startedAtMs:0,requestedMs:1000,elapsedMs:1000,map:'mars',intervals:[16],hiddenDuringSample:false,pausedDuringSample:false,loafSupported:false,loafCount:0,loafMaxMs:null,counters:[],
   coverage:{...noCoverage,intervalsSaturated:true}});
  assert.equal(saturated.status,'invalid');
  assert.match(saturated.invalidReason,/saturada/);
  session.dispose();
 });
});

test('S2.9: prontidão separa dados do mapa, primeiro draw e personagens; entrada inicial inferida', () => {
 const shared=perf.createPerfShared();
 // Entrada inicial: store já pronta quando a sonda monta.
 const tracker=perf.createSceneTracker(shared,'mars',500,true);
 tracker.onFrame(510,0,false);          // primeiro frame do canvas, ainda vazio
 tracker.onFrame(530,0,false);          // assets carregando: nada desenhado
 tracker.onFrame(560,12,false);         // geometria do mapa desenhada, personagens ainda substitutos
 tracker.onFrame(900,20,true);          // GLBs presentes no grafo...
 tracker.onFrame(916,24,true);          // ...e renderizados no frame seguinte
 assert.equal(tracker.done,true);
 const kinds=shared.sceneEvents.map(e=>`${e.kind}@${e.atMs}${e.inferred?'*':''}`);
 assert.deepEqual(kinds,['canvas-mounted@500','map-data-ready@500*','canvas-first-frame@510','scene-first-draw@560','scene-assets-ready@916']);
 assert.ok(shared.sceneEvents.every(e=>e.sinceMapLoadingMs===null),'entrada inicial conta desde a navegação');
 // Viagem: dados prontos observados na store, sem inferência duplicada.
 perf.onExpeditionReadyChange(shared,true,false,'shanghai','mars',2000);
 perf.onExpeditionReadyChange(shared,false,true,'shanghai','shanghai',2600);
 const next=perf.createSceneTracker(shared,'shanghai',2610,true);
 next.onFrame(2620,0,false);next.onFrame(2640,8,true);next.onFrame(2656,8,true);
 const travel=shared.sceneEvents.slice(5);
 assert.deepEqual(travel.map(e=>e.kind),['map-loading','map-data-ready','canvas-mounted','canvas-first-frame','scene-first-draw','scene-assets-ready']);
 assert.equal(travel.filter(e=>e.kind==='map-data-ready').length,1);
 assert.equal(travel[1].sinceMapLoadingMs,600);
 assert.equal(travel[5].sinceMapLoadingMs,656);
});

test('S2.9: troca de mapa durante amostra invalida, resolve a Promise, limpa coletores e remonta sem duplicar', async () => {
 const env=fakeEnv();
 const shared=perf.createPerfShared();
 const first=perf.createPerfSession(shared,env.deps,'mars');
 assert.equal(env.global!==undefined,true,'API global instalada');
 const firstApi=env.global;
 const pending=first.sample(10000);
 env.frame();env.frame();
 // Troca de mapa: a store deixa de estar pronta e o canvas antigo desmonta.
 env.ready(true,false,'shanghai','mars');
 first.dispose();
 const interrupted=await pending;
 assert.equal(interrupted.status,'invalid');
 assert.match(interrupted.invalidReason,/desmontado/);
 assert.equal(shared.active,null);
 assert.equal(env.listeners(),0,'rAF, visibilidade, pausa, store e LoAF removidos');
 assert.equal(env.global,undefined,'API global removida');
 first.dispose();
 assert.equal(shared.samples.length,1,'dispose repetido não duplica resultado');
 // Remontagem no novo mapa.
 const second=perf.createPerfSession(shared,env.deps,'shanghai');
 assert.notEqual(env.global,firstApi);
 assert.equal(env.frames.size,1,'um único laço de rAF ativo');
 assert.equal(env.readyL.size,1,'uma única inscrição na store');
 const next=second.sample(100);
 for(let i=0;i<10;i++)env.frame(16);
 const done=await next;
 assert.equal(done.status,'valid');
 assert.equal(done.map,'shanghai');
 assert.equal(done.coverage.intervalsCollected,7,'intervalos contados uma vez, sem laço duplicado');
 assert.equal(shared.samples.length,2);
 const late=await first.sample(100);
 assert.equal(late.status,'invalid','sessão encerrada não coleta');
 assert.equal(shared.samples.length,2,'amostra de sessão encerrada não entra no histórico');
 second.dispose();
 assert.equal(env.listeners(),0);
});

test('S2.9: aba oculta durante amostra encerra na hora com motivo', async () => {
 const env=fakeEnv({loaf:false});
 const shared=perf.createPerfShared();
 const session=perf.createPerfSession(shared,env.deps,'mars');
 assert.equal(session.loafSupported,false);
 const pending=session.sample(10000);
 env.frame();
 env.hidden=true;for(const l of env.visibility)l();
 const result=await pending;
 assert.equal(result.status,'invalid');
 assert.match(result.invalidReason,/oculta/);
 assert.deepEqual(result.longAnimationFrames,{supported:false,count:null,maxDurationMs:null});
 session.dispose();
});

test('S2.9: armazenamento limitado e relatório com limitações', () => {
 const list=[];for(let i=0;i<50;i++)perf.pushBounded(list,i,10);
 assert.deepEqual(list,[40,41,42,43,44,45,46,47,48,49]);
 const report=perf.buildReport({context:{},pageLoad:perf.summarizeNavigation(undefined),resources:perf.summarizeResources([]),sceneEvents:[],latestCounters:null,heap:null,samples:[]});
 assert.equal(report.version,2);
 assert.ok(report.limitations.some(l=>/não são tempo de GPU/i.test(l)));
 assert.ok(report.limitations.some(l=>/não memória em bytes/i.test(l)));
 assert.ok(report.limitations.some(l=>/sombra não entram/i.test(l)));
 assert.ok(!report.limitations.some(l=>/incluindo passes de sombra/i.test(l)));
});
