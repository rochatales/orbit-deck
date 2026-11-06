import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import ts from 'typescript';
import {createRequire} from 'node:module';
import {createSourceLoader} from './load-source.mjs';
const native=createRequire(import.meta.url);
const hook=store=>Object.assign(selector=>selector?selector(store.getState()):store.getState(),store);
function jsx(file,require){
 const filename=path.resolve(file),module={exports:{}};
 const code=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true,module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
 vm.runInThisContext('(function(require,module,exports){'+code+';'+(file.endsWith('App.tsx')?'exports.Runtime=Runtime;':'')+'})',{filename})(require,module,module.exports);return module.exports;
}
function setup(){
 globalThis.localStorage={getItem:()=>null,setItem(){}};const load=createSourceLoader();
 const expedition=load('src/state/useExpeditionStore.ts').useExpeditionStore,campaign=load('src/state/useCampaignStore.ts').useCampaignStore,game=load('src/state/useGameStore.ts').useGameStore;
 expedition.getState().enterCampaign({displayName:'UI QA',color:'#abcdef'});expedition.getState().setReady(true);
 return {load,expedition,campaign,game,combat:load('src/state/useCombatStore.ts').useCombatStore};
}

test('S3.2 UI: F, OPEN_CARGO_EVENT, botão e aba recusam porão no briefing, liberam depois; desenvolvimento continua liberado',()=>{
 const f=setup(),handlers=new Map(),effects=[],previousWindow=globalThis.window;
 const previous={};for(const name of ['HTMLInputElement','HTMLTextAreaElement','HTMLSelectElement','HTMLElement']){previous[name]=globalThis[name];globalThis[name]=class{};}
 globalThis.window={location:{search:''},addEventListener:(name,fn)=>handlers.set(name,fn),removeEventListener(){}};
 const Hud=()=>null,components=new Map([['GameplayHud',Hud]]);
 const require=spec=>{
  if(spec==='react')return {useEffect:fn=>effects.push(fn),useMemo:fn=>fn(),useRef:value=>({current:value}),useState:value=>[typeof value==='function'?value():value,()=>{}],lazy:()=>()=>null,Suspense:'suspense'};
  if(spec==='react/jsx-runtime')return native(spec);
  if(spec.includes('/state/')){const actual=f.load('src/state/'+spec.split('/').at(-1)+'.ts');return Object.fromEntries(Object.entries(actual).map(([k,v])=>[k,k.startsWith('use')&&v.getState?hook(v):v]));}
  if(spec.endsWith('/campaign')||spec.endsWith('/campaignPolicy')||spec.endsWith('/shipCargo')||spec.endsWith('/config'))return f.load('src/game/'+spec.split('/').at(-1)+'.ts');
  if(spec.endsWith('/engineerRoutine'))return f.load('src/npcs/engineerRoutine.ts');
  if(spec.endsWith('/GameplayHud'))return {GameplayHud:Hud};
  if(spec.startsWith('.'))return new Proxy({}, {get:(_,key)=>components.get(key)??(()=>null)});
  return native(spec);
 };
 try{
  const {Runtime}=jsx('src/app/App.tsx',require),tree=Runtime({onHome(){}});
  effects.find(fn=>fn.toString().includes('OPEN_CARGO_EVENT'))();
  const visit=node=>{if(!node||typeof node!=='object')return null;if(node.type===Hud)return node;const children=node.props?.children;for(const c of Array.isArray(children)?children:[children]){if(Array.isArray(c)){for(const v of c){const r=visit(v);if(r)return r;}}else{const r=visit(c);if(r)return r;}}return null;};
  const hud=visit(tree);assert.ok(hud);f.load('src/state/playerTransient.ts').placePlayer(f.load('src/game/config.ts').MAPS.mars.exit);
  const event={code:'KeyF',repeat:false,target:null,preventDefault(){}};
  handlers.get('keydown')(event);handlers.get('exoden:abrir-carga')();hud.props.openCargo();assert.equal(f.game.getState().isPaused,false);
  f.campaign.getState().dispatch('finish-engineer-briefing');handlers.get('exoden:abrir-carga')();assert.equal(f.game.getState().isPaused,true);
  f.game.setState({isPaused:false});handlers.get('keydown')(event);assert.equal(f.game.getState().isPaused,true);
  f.expedition.getState().returnHome();f.expedition.getState().enterDevelopment();f.expedition.getState().setReady(true);f.load('src/state/playerTransient.ts').placePlayer(f.load('src/game/config.ts').MAPS.mars.exit);
  handlers.get('exoden:abrir-carga')();assert.equal(f.game.getState().isPaused,true);
 }finally{globalThis.window=previousWindow;for(const[name,value]of Object.entries(previous))globalThis[name]=value;}
});

test('S3.2 UI: balão distante só informa, perto aceita E/clique, pausa/painel escondem, depois volta à proximidade',()=>{
 const f=setup();let frame,layout,target,state=0,updates=0,refs=[],cursor=0,callable=true,clicks=0;
 const point={x:0,z:0},actual=f.load('src/interactions/runtime.ts');
 const require=spec=>{
  if(spec==='react')return {useLayoutEffect:fn=>{layout=fn;},useMemo:fn=>target??=fn(),useRef:value=>refs[cursor++]??={current:value},useState:()=>[state,v=>{state=v;updates++;}]};
  if(spec==='@react-three/fiber')return {useFrame:fn=>{frame=fn;}};
  if(spec==='@react-three/drei')return {Html:'html'};
  if(spec.endsWith('/simulationGate'))return {simulationBlocked:()=>f.game.getState().isPaused||!!f.expedition.getState().panel,useSimulationBlocked:()=>f.game.getState().isPaused||!!f.expedition.getState().panel};
  if(spec.startsWith('.'))return f.load(path.resolve('src/interactions',spec)+'.ts');
  return native(spec);
 };
 const {InteractionBubble}=jsx('src/interactions/InteractionBubble.tsx',require);
 const render=(alwaysVisible=true)=>{cursor=0;return InteractionBubble({id:'npc:engineer',label:'Engenheiro',position:[0,2,0],point,radius:2.5,alwaysVisible,available:()=>callable,onInteract:()=>clicks++});};
 render();layout();const player=f.load('src/state/playerTransient.ts');player.placePlayer({x:20,y:0,z:20});frame();let tree=render();
 assert.equal(state,1);assert.equal(tree.props.children.props.children.type,'span');assert.equal(actual.activateWorldInteraction('npc:engineer'),false);
 const changes=updates;for(let i=0;i<100;i++)frame();assert.equal(updates,changes,'sem atualização React por quadro estável');
 player.placePlayer({x:1,y:0,z:0});frame();render();assert.equal(state,2);assert.equal(actual.activateWorldInteraction('npc:engineer'),true);assert.equal(clicks,1);
 callable=false;frame();render();assert.equal(state,1);assert.equal(actual.activateWorldInteraction('npc:engineer'),false);
 f.game.setState({isPaused:true});frame();assert.equal(render(),null);
 f.game.setState({isPaused:false});f.expedition.setState({panel:'engineer'});frame();assert.equal(render(),null);
 f.expedition.setState({panel:null});player.placePlayer({x:20,y:0,z:20});render(false);frame();assert.equal(render(false),null);
});

test('S3.2 UI: CameraRig já nasce orientada no primeiro quadro e remonta em Marte/Shanghai sem amortecer de outro mapa',()=>{
 for(const [map,expected] of [['mars',3*Math.PI/4],['shanghai',Math.PI/4],['mars',3*Math.PI/4]]) {
  const f=setup(),layouts=[];let frame;
  const require=spec=>{
   if(spec==='react')return {useRef:value=>({current:value}),useEffect(){},useLayoutEffect:fn=>layouts.push(fn)};
   if(spec==='@react-three/fiber')return {useThree:fn=>fn({size:{width:2000,height:888}}),useFrame:fn=>{frame=fn;}};
   if(spec==='@react-three/drei')return {OrthographicCamera:'camera'};
   if(spec.startsWith('.'))return f.load(path.resolve('src/scene',spec)+'.ts');
   return native(spec);
  };
  const {CameraRig}=jsx('src/scene/CameraRig.tsx',require),{OrthographicCamera}=native('three');
  const spawn={x:-1,y:0,z:26},bounds={minX:-22,maxX:24,minZ:-20,maxZ:39};
  const node=CameraRig({bounds,spawn,map,distanceScale:3});
  assert.ok(Math.abs(node.props.position[0]-(spawn.x+Math.cos(expected)*18.38*3))<1e-8);
  assert.ok(Math.abs(node.props.position[2]-(spawn.z+Math.sin(expected)*18.38*3))<1e-8);
  const camera=new OrthographicCamera();camera.position.fromArray(node.props.position);camera.zoom=node.props.zoom;node.ref.current=camera;
  for(const effect of layouts)effect();
  assert.equal(f.game.getState().targetRotation,expected);assert.equal(f.load('src/state/playerTransient.ts').cameraView.angle,expected);
  frame({},1/60);assert.equal(f.load('src/state/playerTransient.ts').cameraView.angle,expected);
 }
});

function textTree(node){
 if(typeof node==='string'||typeof node==='number')return String(node);
 if(Array.isArray(node))return node.map(textTree).join(' ');
 return node?.props?textTree(node.props.children):'';
}
function renderWithStores(file, f, name, props={}) {
 const require=spec=>{
  if(spec==='react')return {useEffect(){},useRef:value=>({current:value}),useState:value=>[value,()=>{}]};
  if(spec.includes('/state/')) {const actual=f.load('src/state/'+spec.split('/').at(-1)+'.ts');return Object.fromEntries(Object.entries(actual).map(([k,v])=>[k,k.startsWith('use')&&v.getState?hook(v):v]));}
  if(spec.endsWith('.css'))return {};
  if(/\.(jpg|png|mp4)$/.test(spec))return spec;
  if(spec.endsWith('/ShipCargoPanel'))return {ShipCargoPanel:()=>null};
  if(spec.startsWith('.'))return f.load(path.resolve(path.dirname(file),spec)+'.ts');
  return native(spec);
 };
 return jsx(file,require)[name](props);
}

test('S3.2 revisão UI: cabine avisa risco e usa Engenheiro antes de EDEN; textos dev permanecem iguais',()=>{
 const f=setup(),props={map:'shanghai',phase:'aboard',ready:true,error:null,name:'QA',onDepart(){},onExit(){},onRetry(){}};
 const campaignText=textTree(renderWithStores('src/ui/ShipCockpit.tsx',f,'ShipCockpit',props));
 assert.match(campaignText,/só fica a salvo ao chegar a Marte/);assert.match(campaignText,/ENGENHEIRO · RÁDIO/);assert.doesNotMatch(campaignText,/EDEN · CONECTADA|permanece salva/);
 f.expedition.getState().returnHome();f.expedition.getState().enterDevelopment();
 const devText=textTree(renderWithStores('src/ui/ShipCockpit.tsx',f,'ShipCockpit',props));
 assert.match(devText,/A carga da nave permanece salva/);assert.match(devText,/EDEN · CONECTADA/);
});

test('S3.2 revisão UI: fallback da campanha mantém título/aviso das hordas, sem seletor/reiniciar',()=>{
 const f=setup();f.expedition.setState({panel:null,session:{map:'shanghai',phase:'walking',destination:null,revision:0}});
 f.combat.setState({waves:4,wave:4,cleared:true,dead:false});
 let text=textTree(renderWithStores('src/combat/CombatHud.tsx',f,'CombatHud'));
 assert.match(text,/Hordas neutralizadas/);assert.doesNotMatch(text,/Patrulha neutralizada|Reiniciar encontro|repita|reinicie/);
 f.combat.setState({cleared:false,wave:1,ammo:0,reserve:0});
 text=textTree(renderWithStores('src/combat/CombatHud.tsx',f,'CombatHud'));
 assert.match(text,/próxima horda chega com reabastecimento/);assert.doesNotMatch(text,/Equipe o facão|repita|reinicie/);
});
