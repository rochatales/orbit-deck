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

test('S3.2 UI: B/F e ações de mochila/porão só abrem depois do briefing na campanha',()=>{
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
  if(spec.endsWith('/GameplayHud'))return {GameplayHud:Hud,BackpackContents:()=>null};
  if(spec.startsWith('.'))return new Proxy({}, {get:(_,key)=>components.get(key)??(()=>null)});
  return native(spec);
 };
 try{
  const {Runtime}=jsx('src/app/App.tsx',require),tree=Runtime({onHome(){}});
  effects.find(fn=>fn.toString().includes('OPEN_CARGO_EVENT'))();
  const visit=node=>{if(!node||typeof node!=='object')return null;if(node.type===Hud)return node;const children=node.props?.children;for(const c of Array.isArray(children)?children:[children]){if(Array.isArray(c)){for(const v of c){const r=visit(v);if(r)return r;}}else{const r=visit(c);if(r)return r;}}return null;};
  const hud=visit(tree);assert.ok(hud);f.load('src/state/playerTransient.ts').placePlayer(f.load('src/game/config.ts').MAPS.mars.exit);
  const event={code:'KeyF',repeat:false,target:null,preventDefault(){}};
  const backpackEvent={...event,code:'KeyB'};
  handlers.get('keydown')(backpackEvent);hud.props.openBackpack();assert.equal(f.game.getState().isPaused,false);
  handlers.get('keydown')(event);handlers.get('exoden:abrir-carga')();hud.props.openCargo();assert.equal(f.game.getState().isPaused,false);
  f.campaign.getState().dispatch('finish-engineer-briefing');handlers.get('exoden:abrir-carga')();assert.equal(f.game.getState().isPaused,true);
  f.game.setState({isPaused:false});handlers.get('keydown')(event);assert.equal(f.game.getState().isPaused,true);
  f.game.setState({isPaused:false});handlers.get('keydown')(backpackEvent);assert.equal(f.game.getState().isPaused,true);
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
 const render=(alwaysVisible=true)=>{cursor=0;return InteractionBubble({id:'npc:engineer',label:'Converse com o engenheiro.',distantLabel:'Ahh, estamos sem matéria prima.',position:[0,2,0],point,radius:2.5,alwaysVisible,available:()=>callable,onInteract:()=>clicks++});};
 render();layout();const player=f.load('src/state/playerTransient.ts');player.placePlayer({x:20,y:0,z:20});frame();let tree=render();
 assert.equal(state,1);assert.equal(tree.props.children.props.children.type,'span');assert.equal(textTree(tree),'Ahh, estamos sem matéria prima.');assert.equal(actual.activateWorldInteraction('npc:engineer'),false);
 const changes=updates;for(let i=0;i<100;i++)frame();assert.equal(updates,changes,'sem atualização React por quadro estável');
 player.placePlayer({x:1,y:0,z:0});frame();tree=render();assert.equal(state,2);assert.match(textTree(tree),/Converse com o engenheiro\./);assert.doesNotMatch(textTree(tree),/matéria prima/);assert.equal(actual.activateWorldInteraction('npc:engineer'),true);assert.equal(clicks,1);
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
function nodes(node, predicate, result = []) {
 if (Array.isArray(node)) for (const child of node) nodes(child, predicate, result);
 else if (node && typeof node === 'object') {
  if (predicate(node)) result.push(node);
  nodes(node.props?.children, predicate, result);
 }
 return result;
}
function renderWithStores(file, f, name, props={}) {
 const require=spec=>{
  if(spec==='react')return {useEffect(){},useRef:value=>({current:value}),useState:value=>[value,()=>{}]};
  if(spec.includes('/state/')) {const actual=f.load('src/state/'+spec.split('/').at(-1)+'.ts');return Object.fromEntries(Object.entries(actual).map(([k,v])=>[k,k.startsWith('use')&&v.getState?hook(v):v]));}
  if(spec.endsWith('.css'))return {};
  if(/\.(jpg|png|mp4)$/.test(spec))return spec;
  if(spec.endsWith('/ShipCargoPanel'))return {ShipCargoPanel:()=>null,ShipCargoButton:'test-ship-cargo'};
  if(spec.endsWith('/InteractionBubble'))return {InteractionBubble:'test-world-interaction',NpcInteractionBubble:'test-npc-interaction'};
  if(spec.endsWith('/RadarMap'))return {RadarMap:'test-sonar'};
  if(spec.endsWith('/ItemArtwork'))return {ItemArtwork:'test-item'};
  if(spec.endsWith('/WeaponControls'))return {canEquipPlayerWeapon:()=>true,equipPlayerWeapon:()=>true};
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

test('Circuito inicial UI: cabine orienta o retorno ao Engenheiro e a segunda expedição mostra ondas de 4 e 6 mutantes', () => {
    const f = setup();
    const c = f.campaign.getState();
    c.dispatch('finish-engineer-briefing');
    c.depositExpedition({ id: 'cobre', copper: 4, organic: 0 });
    c.dispatch('finish-copper-expedition');
    const cockpit = () => renderWithStores('src/ui/ShipCockpit.tsx', f, 'ShipCockpit', {
        map: 'mars', phase: 'aboard', ready: true, error: null, name: 'QA', onDepart() {}, onExit() {}, onRetry() {}
    });
    assert.equal(textTree(cockpit()).match(/Converse com o Engenheiro sobre o cobre/g)?.length, 1);
    assert.doesNotMatch(textTree(cockpit()), /O próximo passo está na Terra/);
    for (const event of ['finish-engineer-return-briefing', 'activate-eden', 'finish-eden-briefing', 'pick-up-sword']) c.dispatch(event);
    assert.match(textTree(cockpit()), /O próximo passo está na Terra/);
    f.expedition.setState({ session: { map: 'shanghai', phase: 'walking', destination: null, revision: 0 } });
    for (const [wave, count] of [[0, 4], [1, 6]]) {
        f.combat.setState({ wave, waves: 2, nextWave: 3 });
        const text = textTree(renderWithStores('src/combat/CombatHud.tsx', f, 'CombatHud'));
        assert.match(text, new RegExp(`${count} Mutantes Shangai`));
        assert.match(text, /ONDA/);
        assert.doesNotMatch(text, /13 ameaças|26 ameaças|Patrol grandes/);
    }
});

test('Circuito inicial UI: balão de Marte oferece embarque e a conversa libera o marcador de EDEN', () => {
    const f = setup();
    const campaign = f.campaign.getState();
    campaign.dispatch('finish-engineer-briefing');
    campaign.depositExpedition({ id: 'cobre', copper: 4, organic: 0 });
    campaign.dispatch('finish-copper-expedition');
    const interactions = () => nodes(renderWithStores('src/interactions/WorldInteractionBubbles.tsx', f, 'WorldInteractionBubbles', {
        map: 'mars', world: {}
    }), node => node.type === 'test-world-interaction');
    const ship = interactions().find(node => node.props.id === 'ship:mars');
    assert.equal(ship.props.label, 'Entrar na aeronave');
    assert.equal(textTree(ship), '');
    assert.equal(interactions().find(node => node.props.id === 'activate-eden').props.alwaysVisible, false);
    const dialogue = renderWithStores('src/npcs/EngineerDialogue.tsx', f, 'EngineerDialogue', { returnBriefing: true });
    assert.match(textTree(dialogue), /Agora ligue o EDEN e vamos iniciar o funcionamento total da nossa colônia\./);
    assert.doesNotMatch(textTree(dialogue), /Leve este rifle/);
    campaign.dispatch('finish-engineer-return-briefing');
    const marker = interactions().find(node => node.props.id === 'activate-eden');
    assert.equal(marker.props.label, 'Ligar EDEN');
    assert.equal(marker.props.alwaysVisible, true);
    campaign.dispatch('activate-eden');
    assert.equal(interactions().find(node => node.props.id === 'activate-eden').props.alwaysVisible, false);
});

test('Circuito inicial UI: transferência rápida começa pelo Depósito Ares-I', () => {
    const f = setup(), file = 'src/ui/ShipCargoPanel.tsx';
    const dialog = renderWithStores(file, f, 'MissionDepositPanel', { onClose() {} });
    assert.match(textTree(dialog), /Transferir para a aeronave\./);
    const panel = renderWithStores(file, f, 'ShipCargoPanel', { map: 'shanghai', depositOnly: true });
    const headings = nodes(panel, node => node.type === 'h3').map(textTree);
    assert.match(headings[0], /^Depósito Ares-I/);
    assert.match(headings[1], /^Mochila/);
    assert.doesNotMatch(textTree(panel), /Retirar tudo/);
});

test('S3.2 UI: briefing libera rifle, sonar e menus; kit médico aparece quando coletado', () => {
    const f = setup(), file = 'src/ui/GameplayHud.tsx';
    const hud = (combat = false) => renderWithStores(file, f, 'GameplayHud', { combat, map: combat ? 'shanghai' : 'mars' });
    const backpack = () => textTree(renderWithStores(file, f, 'BackpackContents', { combat: false }));
    const mounted = type => nodes(hud(), node => node.type === type).length;
    const medicalArt = tree => nodes(tree, node => node.type === 'test-item' && node.props.item === 'medical').length;
    assert.doesNotMatch(textTree(hud()), /MOCHILA|kit médico/i);
    assert.equal(mounted('test-sonar'), 0);
    assert.equal(mounted('test-ship-cargo'), 0);
    assert.equal(medicalArt(hud()), 0);
    for (const text of [textTree(hud()), backpack()]) assert.doesNotMatch(text, /rifle|facão|coldre/i);
    f.campaign.getState().dispatch('finish-engineer-briefing');
    assert.match(textTree(hud()), /MOCHILA/);
    assert.equal(mounted('test-sonar'), 1);
    assert.equal(mounted('test-ship-cargo'), 1);
    assert.equal(medicalArt(hud(true)), 0);
    f.combat.setState({ medkits: 1 });
    assert.equal(medicalArt(hud(true)), 1);
    for (const text of [textTree(hud()), backpack()]) {
        assert.match(text, /rifle laser/i);
        assert.doesNotMatch(text, /facão/i);
    }
    f.expedition.getState().returnHome();
    f.expedition.getState().enterDevelopment();
    assert.equal(mounted('test-sonar'), 1);
    assert.equal(mounted('test-ship-cargo'), 1);
    assert.equal(medicalArt(hud()), 1);
    for (const text of [textTree(hud()), backpack()]) {
        assert.match(text, /rifle laser/i);
        assert.match(text, /facão/i);
    }
});

test('S6.15 na S3.2: ESC mostra pausa simples, engrenagem abre opções e saída conserva regra de abandono',()=>{
 const f=setup(),handlers=new Map(),effects=[],states=[],refs=[];let stateIndex=0,refIndex=0,tree,home=0;
 const previousWindow=globalThis.window,previous={};
 for(const name of ['HTMLInputElement','HTMLTextAreaElement','HTMLSelectElement','HTMLElement']){previous[name]=globalThis[name];globalThis[name]=class{};}
 globalThis.window={location:{search:''},addEventListener:(name,fn)=>handlers.set(name,fn),removeEventListener(){}};
 const Frame=()=>null,Hud=()=>null;
 const require=spec=>{
  if(spec==='react')return {
   useEffect:fn=>effects.push(fn),useRef:value=>refs[refIndex++]??={current:value},
   useState:value=>{const i=stateIndex++;if(!(i in states))states[i]=typeof value==='function'?value():value;return[states[i],v=>{states[i]=typeof v==='function'?v(states[i]):v;}];},lazy:()=>()=>null,Suspense:'suspense'
  };
  if(spec==='react/jsx-runtime')return native(spec);
  if(spec.includes('/state/')){const actual=f.load('src/state/'+spec.split('/').at(-1)+'.ts');return Object.fromEntries(Object.entries(actual).map(([k,v])=>[k,k.startsWith('use')&&v.getState?hook(v):v]));}
  if(spec.endsWith('/sessionEscape'))return f.load('src/game/sessionEscape.ts');
  if(spec.endsWith('/campaign')||spec.endsWith('/campaignPolicy')||spec.endsWith('/shipCargo')||spec.endsWith('/config'))return f.load('src/game/'+spec.split('/').at(-1)+'.ts');
  if(spec.endsWith('/engineerRoutine'))return f.load('src/npcs/engineerRoutine.ts');
  if(spec.endsWith('/PauseMenuFrame'))return {PauseMenuFrame:Frame};
  if(spec.endsWith('/GameplayHud'))return {GameplayHud:Hud,BackpackContents:()=>null};
  if(spec.startsWith('.'))return new Proxy({}, {get:()=>()=>null});
  return native(spec);
 };
 try{
  const {Runtime}=jsx('src/app/App.tsx',require);
  const render=()=>{stateIndex=0;refIndex=0;effects.length=0;tree=Runtime({onHome:()=>{home++;f.expedition.getState().returnHome();}});return tree;};
  render();effects.find(fn=>fn.toString().includes('OPEN_CARGO_EVENT'))();
  let gear=nodes(tree,n=>n.props?.['aria-label']==='Abrir controles e opções');assert.equal(gear.length,1);
  assert.equal(gear[0].props.children.type,native('lucide-react').Settings,'controle é só ícone');
  const pauseIcon=nodes(tree,n=>n.props?.['aria-label']==='Pausar jogo')[0];assert.ok(pauseIcon);assert.equal(pauseIcon.props.children.type,native('lucide-react').Pause);
  pauseIcon.props.onClick();render();assert.equal(f.game.getState().isPaused,true);
  let resumeIcon=nodes(nodes(tree,n=>n.type===Frame)[0].props.tools,n=>n.props?.['aria-label']==='Retomar jogo')[0];assert.ok(resumeIcon);assert.equal(resumeIcon.props.children.type,native('lucide-react').Play);
  resumeIcon.props.onClick();render();assert.equal(f.game.getState().isPaused,false);
  const key=code=>handlers.get('keydown')({code,repeat:false,target:null,preventDefault(){}});
  key('Escape');render();assert.equal(f.game.getState().isPaused,true);
  let modal=nodes(tree,n=>n.type===Frame)[0];assert.equal(modal.props.minimal,true);assert.equal(modal.props.label,'Jogo pausado');assert.match(textTree(modal),/Pausado/);assert.doesNotMatch(textTree(modal),/À sua maneira|Sair e voltar/);
  gear=nodes(modal.props.tools,n=>n.props?.['aria-label']==='Abrir controles e opções');assert.equal(gear.length,1);
  gear[0].props.onClick();render();modal=nodes(tree,n=>n.type===Frame)[0];assert.equal(modal.props.label,'Controles e opções');assert.equal(f.game.getState().isPaused,true);
  assert.equal(nodes(modal,n=>n.type==='button'&&['Mochila','Aeronave'].includes(textTree(n))).length,0);
  const exit=nodes(modal,n=>n.type==='button'&&textTree(n)==='Sair e voltar ao menu principal')[0];assert.ok(exit);
  key('Escape');render();assert.equal(f.game.getState().isPaused,false);assert.equal(nodes(tree,n=>n.type===Frame).length,0);
  // Diálogo mantém prioridade sobre pausa.
  f.expedition.setState({panel:'engineer'});key('Escape');assert.equal(f.expedition.getState().panel,null);assert.equal(f.game.getState().isPaused,false);
  f.campaign.getState().dispatch('finish-engineer-briefing');
  // Depois do briefing, B abre a mochila. ESC seguinte é sempre pausa simples.
  key('KeyB');render();assert.equal(nodes(tree,n=>n.type===Frame)[0].props.label,'Mochila');key('Escape');render();key('Escape');render();assert.equal(nodes(tree,n=>n.type===Frame)[0].props.minimal,true);
  // Sair pelo menu mantém o descarte da tentativa, sem excluir o perfil/carga anterior.
  f.campaign.getState().setCargo({iron:0,copper:5,titanium:0,organic:0});f.campaign.getState().transferCargo({iron:0,copper:7,titanium:0,organic:0});
  exit.props.onClick();assert.equal(home,1);assert.equal(f.campaign.getState().saved.cargo.copper,5);assert.equal(f.campaign.getState().saved.profile.displayName,'UI QA');assert.equal(f.campaign.getState().inGame,false);
 }finally{globalThis.window=previousWindow;for(const[name,value]of Object.entries(previous))globalThis[name]=value;}
});
