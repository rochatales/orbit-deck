/** Sandbox visual: não importado pelo jogo nem incluído no build de produção. */
import * as T from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { openCrate, advanceCrate, revealIntensity, SUPPLY_CRATE, type CrateState } from '../src/game/props/supplyCrate';
import url from '../src/assets/props/caixa-suprimentos/caixa-suprimentos-v001.glb';
import playerUrl from '../src/assets/characters/player/explorador-r7.glb';
const renderer=new T.WebGLRenderer({antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.setSize(innerWidth,innerHeight);renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;document.body.prepend(renderer.domElement);
const scene=new T.Scene();scene.background=new T.Color('#26343c');scene.fog=new T.Fog('#26343c',15,35);
const camera=new T.OrthographicCamera(-4,4,3,-3,.1,80);let angle=Math.PI/4;
const target=new T.Vector3(0,.7,.4);function frameCamera(){const h=4.5,w=h*innerWidth/innerHeight;camera.left=-w/2;camera.right=w/2;camera.top=h/2;camera.bottom=-h/2;camera.position.set(Math.cos(angle)*9,7,Math.sin(angle)*9);camera.lookAt(target);camera.updateProjectionMatrix();}
frameCamera();
scene.add(new T.HemisphereLight('#d8e8ed','#5c5b51',1.8));const sun=new T.DirectionalLight('#fff0d8',3);sun.position.set(4,7,3);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);sun.shadow.camera.left=-5;sun.shadow.camera.right=5;sun.shadow.camera.top=5;sun.shadow.camera.bottom=-5;sun.shadow.bias=-.0001;scene.add(sun);
const fill=new T.DirectionalLight('#c5eaff',1);fill.position.set(-3,3,-4);scene.add(fill);
const blue=new T.PointLight(SUPPLY_CRATE.neon,0,5,2);blue.position.set(0,.94,.04);scene.add(blue);
const floor=new T.Mesh(new T.PlaneGeometry(100,100),new T.MeshStandardMaterial({color:'#39474d',roughness:.85}));floor.rotation.x=-Math.PI/2;floor.position.y=-.012;floor.receiveShadow=true;scene.add(floor);
const deck=new T.Mesh(new T.BoxGeometry(2.1,.04,1.8),new T.MeshStandardMaterial({color:'#56646b',metalness:.4,roughness:.7}));deck.position.y=-.01;deck.receiveShadow=true;scene.add(deck);
const composer=new EffectComposer(renderer);composer.addPass(new RenderPass(scene,camera));composer.addPass(new UnrealBloomPass(new T.Vector2(innerWidth,innerHeight),.5,.35,1.25));composer.addPass(new OutputPass());
const status=document.getElementById('status')!,state:CrateState={phase:'closed',elapsed:0},keys=new Set<string>();
const mouse=new T.Vector2(.15,.1),ray=new T.Raycaster(),ground=new T.Plane(new T.Vector3(0,1,0),0),aim=new T.Vector3(0,0,0),move=new T.Vector3();
let model:T.Object3D,player:T.Object3D,mixer:T.AnimationMixer,pmixer:T.AnimationMixer,action:T.AnimationAction,current:T.AnimationAction;const clips=new Map<string,T.AnimationAction>();let loaded=false,frozen=false;
function reset(){if(!loaded)return;frozen=false;state.phase='closed';state.elapsed=0;action.reset();action.paused=true;action.play();mixer.setTime(0);blue.intensity=0;player.position.set(1.7,0,1.8);}
function approach(){if(loaded)player.position.set(0,0,1.65);}
function trigger(){if(!loaded)return;frozen=false;if(openCrate(state,player.position.x,player.position.z,0,1.1)){action.reset().setLoop(T.LoopOnce,1);action.clampWhenFinished=true;action.paused=false;action.play();}}
try{
 const loader=new GLTFLoader(),[c,p]=await Promise.all([loader.loadAsync(url),loader.loadAsync(playerUrl)]);model=c.scene;scene.add(model);model.traverse(o=>{if(o instanceof T.Mesh){o.castShadow=!o.name.startsWith('VFX');o.receiveShadow=true;const mats=Array.isArray(o.material)?o.material:[o.material];for(const m of mats)if(m.transparent){m.depthWrite=false;m.blending=T.AdditiveBlending;}}});
 mixer=new T.AnimationMixer(model);action=mixer.clipAction(c.animations.find(a=>a.name==='Open')!);action.play();action.paused=true;mixer.setTime(0);
 player=p.scene;player.scale.setScalar(.857);scene.add(player);player.traverse(o=>{if(o instanceof T.Mesh){o.castShadow=true;o.receiveShadow=true;}});pmixer=new T.AnimationMixer(player);for(const c of p.animations)clips.set(c.name,pmixer.clipAction(c));current=clips.get('Idle')!;current.play();loaded=true;reset();
 (window as any).__cratePreview={ready:true,approach,reset,open:trigger,state:()=>({...state,light:blue.intensity,player:[player.position.x,player.position.z],angle}),sample(t:number){frozen=true;state.phase=t>=2.4?'open':'opening';state.elapsed=t;action.paused=false;mixer.setTime(t);action.paused=true;blue.intensity=revealIntensity(state);},model};
}catch(e){status.textContent='Falha ao carregar a prévia.';console.error(e);}
document.getElementById('approach')!.onclick=approach;document.getElementById('reset')!.onclick=reset;
window.addEventListener('keydown',e=>{keys.add(e.code);if(e.code==='KeyE'&&!e.repeat)trigger();});window.addEventListener('keyup',e=>keys.delete(e.code));window.addEventListener('blur',()=>keys.clear());
renderer.domElement.addEventListener('pointermove',e=>{mouse.set(e.clientX/innerWidth*2-1,1-e.clientY/innerHeight*2);});
window.addEventListener('resize',()=>{renderer.setSize(innerWidth,innerHeight);composer.setSize(innerWidth,innerHeight);frameCamera();});
const clock=new T.Clock();let lastPhase='',lastNear=false;
renderer.setAnimationLoop(()=>{
 const dt=Math.min(clock.getDelta(),.05);
 if(keys.has('KeyQ'))angle+=dt*1.75;if(keys.has('KeyC'))angle-=dt*1.75;frameCamera();
 if(loaded){
  ray.setFromCamera(mouse,camera);ray.ray.intersectPlane(ground,aim);move.copy(aim).sub(player.position);move.y=0;const length=move.length();
  if(length>.15){move.multiplyScalar(1/length);player.rotation.y=Math.atan2(move.x,move.z);}
  const dir=(keys.has('KeyW')?1:0)-(keys.has('KeyS')?1:0);const speed=dir>0?2.4:1.2;
  if(dir&&length>.15){const nx=player.position.x+move.x*dir*speed*dt,nz=player.position.z+move.z*dir*speed*dt;
   if((Math.abs(nx)>1.13||Math.abs(nz)>1.02)&&Math.abs(nx)<4&&Math.abs(nz)<4)player.position.set(nx,0,nz);
  }
  const next=clips.get(dir>0?'Run':dir<0?'Backward':'Idle')!;if(current!==next){current.fadeOut(.12);next.reset().fadeIn(.12).play();current=next;}
  pmixer.update(dt);if(!frozen){advanceCrate(state,dt);mixer.update(dt);}blue.intensity=revealIntensity(state);
  const near=(player.position.x**2+(player.position.z-1.1)**2)<=1.8**2;
  if(state.phase!==lastPhase||near!==lastNear){status.textContent=state.phase==='open'?'Caixa aberta · prévia de revelação concluída':state.phase==='opening'?'Abrindo · revelação azul':near?'E · Abrir caixa de suprimentos':'Aproxime o Explorador da caixa';lastPhase=state.phase;lastNear=near;}
 }
 composer.render();
});
