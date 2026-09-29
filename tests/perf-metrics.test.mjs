import test from 'node:test';
import assert from 'node:assert/strict';
import {loadSource} from './load-source.mjs';
const perf=loadSource('src/dev/perf/perfMetrics.ts');

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
  {name:'http://127.0.0.1:5178/assets/player-main-abc.glb?v=1',duration:40,transferSize:1000,encodedBodySize:900},
  {name:'http://127.0.0.1:5178/assets/index.js',duration:10}
 ]);
 assert.equal(r.count,2);
 assert.equal(r.transferBytes,1000);
 assert.equal(r.models.length,1);
 assert.equal(r.models[0].file,'player-main-abc.glb');
 assert.equal(perf.summarizeResources([{name:'a.js',duration:1}]).transferBytes,null);
});

test('S2.9: aba oculta invalida a amostra e pausa vira aviso', () => {
 const base={startedAtMs:1000,requestedMs:10000,elapsedMs:10000,map:'mars',intervals:[16,17,18],pausedDuringSample:false,loafSupported:true,loafDurations:[60],
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
 const interrupted=perf.buildSampleResult({...base,hiddenDuringSample:false,interruptedReason:'troca de mapa'});
 assert.equal(interrupted.status,'invalid');
 const noLoaf=perf.buildSampleResult({...base,hiddenDuringSample:false,loafSupported:false});
 assert.deepEqual(noLoaf.longAnimationFrames,{supported:false,count:null,maxDurationMs:null});
});

test('S2.9: armazenamento limitado e relatório com limitações', () => {
 const list=[];for(let i=0;i<50;i++)perf.pushBounded(list,i,10);
 assert.deepEqual(list,[40,41,42,43,44,45,46,47,48,49]);
 const report=perf.buildReport({context:{},pageLoad:perf.summarizeNavigation(undefined),resources:perf.summarizeResources([]),sceneEvents:[],latestCounters:null,heap:null,samples:[]});
 assert.equal(report.version,1);
 assert.ok(report.limitations.some(l=>/não são tempo de GPU/i.test(l)));
 assert.ok(report.limitations.some(l=>/não memória em bytes/i.test(l)));
});
