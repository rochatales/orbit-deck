import { weaponShotHeight } from '../src/state/playerWeaponPose';
import { equipPlayerWeapon } from '../src/characters/player/WeaponControls';
/** Development-only fixture. Not imported by the application or the production build. */
import { OrthographicCamera, Vector3 } from 'three';
import { RIFLE_POSE } from '../src/combat/config';
import { combatRuntime, useCombatStore as combat } from '../src/state/useCombatStore';
import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from '../src/app/App';
import { useExpeditionStore as expedition } from '../src/state/useExpeditionStore';
import { useGameStore as game } from '../src/state/useGameStore';
import { placePlayer, playerPosition } from '../src/state/playerTransient';
import { EDEN, MAPS } from '../src/game/config';
import '../src/styles/global.css';
function QA() {
    const [result, setResult] = useState('Pronto'), [hidden, setHidden] = useState(false);
    const [receivingShadows, setReceivingShadows] = useState(true);
    const [vibrationReport, setVibrationReport] = useState('');
    const s = expedition();
    function place(where: 'eden' | 'deck') {
        if (!s.ready || s.session.map !== 'mars')
            return;
        const point = where === 'eden' ? { ...EDEN.position, z: -8 } : MAPS.mars.exit;
        placePlayer(point);
        game.setState({ isPaused: false });
        expedition.setState({ spawn: point, panel: null, session: { ...s.session, phase: 'walking', destination: null, revision: s.session.revision + 1 } });
    }
    async function movement(forward = false) {
        const before = { ...playerPosition };
        if (forward) pointerAt(before.x,before.z-12);
        window.dispatchEvent(new KeyboardEvent('keydown', { key: forward ? 'w' : 's', code: forward ? 'KeyW' : 'KeyS', bubbles: true }));
        await new Promise(r => setTimeout(r, 1000));
        const debug=window as unknown as {__hordaPlayerActions?:Record<string,import('three').AnimationAction>;__hordaPlayerBaseActions?:Record<string,import('three').AnimationAction>;__hordaPlayerMotion?:{planarSpeed:number}};
        const active=Object.values(debug.__hordaPlayerBaseActions??debug.__hordaPlayerActions??{}).find(a=>a.getEffectiveWeight()>.5&&a.isRunning());
        const clip=active?.getClip().name,rate=active?.timeScale,speed=debug.__hordaPlayerMotion?.planarSpeed;
        window.dispatchEvent(new KeyboardEvent('keyup', { key: forward ? 'w' : 's', code: forward ? 'KeyW' : 'KeyS', bubbles: true }));
        await new Promise(r => setTimeout(r, 300));
        const after = playerPosition;
        setResult(`${forward?'Corrida':'Recuo'}: ${clip} | ${speed?.toFixed(2)} m/s | ${rate?.toFixed(3)}× | `+'Deslocamento em 1s: ' + Math.hypot(after.x - before.x, after.z - before.z).toFixed(2) + ' m');
    }
    async function measureVibration() {
        if (s.session.phase !== 'walking' || game.getState().isPaused) return;
        const scene = (window as unknown as { __hordaPlayerScene?: import('three').Object3D }).__hordaPlayerScene;
        const head = scene?.getObjectByName('mixamorigHead');
        if (!scene || !head) return;
        let root = scene; while (root.parent) root = root.parent;
        let camera: import('three').Camera | undefined;
        root.traverse(node=>{if ((node as import('three').Camera).isCamera && !camera) camera=node as import('three').Camera;});
        if (!camera) return;
        const origin = new Vector3(), localHead = new Vector3(), screen = new Vector3();
        const rows: {t:number; input:string; x:number; z:number; px:number; pz:number; hx:number; hy:number; hz:number; sx:number; sy:number}[] = [];
        const canvas = document.querySelector('canvas')!, width=canvas.width, height=canvas.height;
        const start=performance.now(); let held='';
        pointerAt(playerPosition.x+20,playerPosition.z);
        setResult('Vibração: 4 s · W, parar e S…');
        await new Promise<void>(resolve=>{function frame(){
            const t=(performance.now()-start)/1000;
            const key=t>=.5&&t<1.7?'w':t>=2.5&&t<3.7?'s':'';
            if(key!==held){
                if(held)window.dispatchEvent(new KeyboardEvent('keyup',{key:held,code:held==='w'?'KeyW':'KeyS',bubbles:true}));
                if(key)window.dispatchEvent(new KeyboardEvent('keydown',{key,code:key==='w'?'KeyW':'KeyS',bubbles:true}));
                held=key;
            }
            scene!.getWorldPosition(origin);head!.getWorldPosition(localHead);scene!.worldToLocal(localHead);
            screen.copy(origin).project(camera!);
            rows.push({t,input:key,x:origin.x,z:origin.z,px:playerPosition.x,pz:playerPosition.z,hx:localHead.x,hy:localHead.y,hz:localHead.z,sx:screen.x,sy:screen.y});
            if(t<4)requestAnimationFrame(frame);else resolve();
        }requestAnimationFrame(frame);});
        if(held)window.dispatchEvent(new KeyboardEvent('keyup',{key:held,code:held==='w'?'KeyW':'KeyS',bubbles:true}));
        const summary=([['w',.9,1.65],['s',2.9,3.65]] as const).map(([input,from,to])=>{
            let n=0,still=0,maxStep=0,speed=0,squared=0,maxHead=0;
            for(let i=1;i<rows.length;i++){
                const a=rows[i-1],b=rows[i];if(a.t<from||b.t>to)continue;
                const dt=b.t-a.t,d=Math.hypot(b.x-a.x,b.z-a.z),v=d/dt;n++;if(d<1e-5)still++;maxStep=Math.max(maxStep,d);speed+=v;squared+=v*v;
                maxHead=Math.max(maxHead,Math.hypot(b.hx-a.hx,b.hy-a.hy,b.hz-a.hz));
            }
            const mean=speed/Math.max(n,1);return{input,frames:n,stationaryFrames:still,maxStep,meanSpeed:mean,speedDeviation:Math.sqrt(Math.max(0,squared/Math.max(n,1)-mean*mean)),maxHeadStep:maxHead};
        });
        const report={interpolation:new URLSearchParams(location.search).get('interp')==='1',map:s.session.map,width,height,resolutionConstant:width===canvas.width&&height===canvas.height,summary,rows};
        setVibrationReport(JSON.stringify(report,null,2));
        setResult('Vibração: '+summary.map(x=>`${x.input.toUpperCase()} · ${x.stationaryFrames}/${x.frames} quadros sem avanço, passo máx ${(x.maxStep*100).toFixed(2)} cm, desvio ${(x.speedDeviation).toFixed(2)} m/s`).join(' | '));
    }
    function compareShadowBias() {
        let root = (window as unknown as { __hordaPlayerScene?: import('three').Object3D }).__hordaPlayerScene;
        while (root?.parent) root = root.parent;
        let bias = 0;
        root?.traverse(node => {
            const light = node as import('three').DirectionalLight;
            if (light.isDirectionalLight) { bias = light.shadow.normalBias > 0 ? 0 : .03; light.shadow.normalBias = bias; }
        });
        setResult(`Bias normal do sol: ${(bias*100).toFixed(0)} cm; contraste A/B mantendo sombras`);
    }
    function compareCharacterShadows() {
        const scene = (window as unknown as { __hordaPlayerScene?: import('three').Object3D }).__hordaPlayerScene;
        if (!scene) return;
        const enabled = !receivingShadows; let count = 0;
        scene.traverse(node => { const mesh = node as import('three').Mesh; if (mesh.isMesh) { mesh.receiveShadow = enabled; count++; } });
        setReceivingShadows(enabled);
        setResult(`Sombras recebidas pelo personagem: ${enabled?'ligadas':'desligadas'} (${count} meshes); sombras projetadas e luzes preservadas`);
    }
    async function transitions() {
        if (s.session.map !== 'mars' || s.session.phase !== 'walking') return;
        const debug = window as unknown as { __hordaPlayerScene?: import('three').Object3D; __hordaPlayerBaseActions?: Record<string, import('three').AnimationAction> };
        const scene = debug.__hordaPlayerScene, head = scene?.getObjectByName('mixamorigHead');
        if (!scene || !head) { setResult('Transições: aguardando astronauta'); return; }
        const canvas = document.querySelector('canvas')!, width = canvas.width, height = canvas.height;
        const point = new Vector3(), previous = new Vector3();
        let held = false, sampled = false, maxJump = 0, minWeight = Infinity, maxWeight = 0;
        const start = performance.now(); pointerAt(playerPosition.x, playerPosition.z - 12);
        setResult('Transições: alternando W/parado por 3 s…');
        await new Promise<void>(resolve => { function frame() {
            const elapsed = performance.now() - start;
            const moving = elapsed > 500 && elapsed < 1800 && Math.floor((elapsed - 500) / 60) % 2 === 0;
            if (moving !== held) {
                window.dispatchEvent(new KeyboardEvent(moving ? 'keydown' : 'keyup', { code: 'KeyW', key: 'w', bubbles: true })); held = moving;
            }
            scene!.updateWorldMatrix(true, true); head!.getWorldPosition(point); scene!.worldToLocal(point);
            if (sampled && elapsed > 500) maxJump = Math.max(maxJump, point.distanceTo(previous));
            previous.copy(point); sampled = true;
            const actions = [...new Set(Object.values(debug.__hordaPlayerBaseActions ?? {}))];
            const weight = actions.reduce((sum, action) => sum + (action.isScheduled() ? action.getEffectiveWeight() : 0), 0);
            minWeight = Math.min(minWeight, weight); maxWeight = Math.max(maxWeight, weight);
            if (elapsed < 3000) requestAnimationFrame(frame); else resolve();
        } requestAnimationFrame(frame); });
        window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyW', key: 'w', bubbles: true }));
        setResult(`Transições: peso ${minWeight.toFixed(3)}–${maxWeight.toFixed(3)} | salto cabeça ${(maxJump*100).toFixed(2)} cm/quadro | resolução ${width}×${height} ${width===canvas.width&&height===canvas.height?'constante':'mudou'}`);
    }
    async function armedAnimation(reload = false) {
        if (s.session.map !== 'shanghai' || s.session.phase !== 'walking') return;
        const sim = combatRuntime.simulation; if (!sim) return;
        pointerAt(playerPosition.x, playerPosition.z - 12, true);
        await new Promise(r => setTimeout(r, 300));
        if (reload) {
            window.dispatchEvent(new PointerEvent('pointerup', {button:0,bubbles:true}));
            window.dispatchEvent(new KeyboardEvent('keydown', {code:'KeyR',bubbles:true}));
            window.dispatchEvent(new KeyboardEvent('keyup', {code:'KeyR',bubbles:true}));
        }
        window.dispatchEvent(new KeyboardEvent('keydown', {code:'KeyW',key:'w',bubbles:true}));
        await new Promise(r => setTimeout(r, 500));
        const debug = window as unknown as {__hordaRifleLayers?:import('../src/characters/player/rifleAnimationLayers').RifleAnimationLayers; __hordaPlayerMotion?:{planarSpeed:number}};
        const upper=debug.__hordaRifleLayers?.upperAction;
        setResult(`Arma: ${upper?.getClip().name} | t=${upper?.time.toFixed(3)} | recarga=${sim.reloadLeft.toFixed(3)} | velocidade=${debug.__hordaPlayerMotion?.planarSpeed.toFixed(2)}`);
        await new Promise(r => setTimeout(r, 900));
        window.dispatchEvent(new KeyboardEvent('keyup', {code:'KeyW',key:'w',bubbles:true}));
        window.dispatchEvent(new PointerEvent('pointerup', {button:0,bubbles:true}));
    }
    async function dash() {
        if(!s.ready||s.session.phase!=='walking'||game.getState().isPaused){setResult('Dash: desembarque e retome a sessão');return;}
        pointerAt(playerPosition.x,playerPosition.z-10);
        await new Promise(r=>setTimeout(r,700));
        const before={...playerPosition},start=performance.now();let frames=0,speed=0,clip=false;
        window.dispatchEvent(new KeyboardEvent('keydown',{code:'Space',key:' ',bubbles:true}));
        await new Promise<void>(resolve=>{function frame(){
            const debug=window as unknown as {__hordaPlayerMotion?:{animationState:string;planarSpeed:number};__hordaPlayerActions?:Record<string,import('three').AnimationAction>};
            if(debug.__hordaPlayerMotion?.animationState==='dashing'){frames++;speed=Math.max(speed,debug.__hordaPlayerMotion.planarSpeed);}
            clip ||= !!debug.__hordaPlayerActions?.Dash?.isRunning() && (debug.__hordaPlayerActions.Dash.getEffectiveWeight()??0)>.5;
            if(performance.now()-start<1000)requestAnimationFrame(frame);else resolve();
        }requestAnimationFrame(frame);});
        window.dispatchEvent(new KeyboardEvent('keyup',{code:'Space',key:' ',bubbles:true}));
        setResult(`Dash Space: ${Math.hypot(playerPosition.x-before.x,playerPosition.z-before.z).toFixed(3)} m | pico ${speed.toFixed(2)} m/s | clipe ${clip?'Dash':'não visto'} | ${frames} quadros ativos`);
    }
    async function swordMovement() {
        if (s.session.map !== 'shanghai' || s.session.phase !== 'walking' || game.getState().isPaused || combat.getState().dead) {
            setResult('Espada + W: desembarque em Shanghai e retome a sessão'); return;
        }
        equipPlayerWeapon('machete');
        const release = () => window.dispatchEvent(new PointerEvent('pointerup', {button:0,bubbles:true}));
        release(); await new Promise(r => setTimeout(r, 1200));
        const sim = combatRuntime.simulation; if (!sim || simulationUnavailable()) return;
        const first = sim.swingId, start = performance.now();
        let x = playerPosition.x, z = playerPosition.z, distance = 0, held = true;
        pointerAt(x, z - 10, true);
        window.dispatchEvent(new KeyboardEvent('keydown', {code:'KeyW',key:'w',bubbles:true}));
        setResult('Espada + W: medindo três cortes e deslocamento físico…');
        await new Promise<void>(resolve => { function frame() {
            distance += Math.hypot(playerPosition.x - x, playerPosition.z - z);
            x = playerPosition.x; z = playerPosition.z;
            const cuts = sim!.swingId - first;
            if (cuts >= 3 && held) { release(); held = false; }
            if ((cuts >= 3 && sim!.meleeLeft <= 0) || performance.now() - start >= 5000 || simulationUnavailable()) resolve();
            else requestAnimationFrame(frame);
        } requestAnimationFrame(frame); });
        release(); window.dispatchEvent(new KeyboardEvent('keyup', {code:'KeyW',key:'w',bubbles:true}));
        setResult(`Espada + W: ${sim.swingId - first} cortes | trajeto ${distance.toFixed(3)} m | ${((performance.now()-start)/1000).toFixed(2)} s · colisões podem reduzir o passo`);
        game.setState({isPaused:true});
    }
    function simulationUnavailable() { return game.getState().isPaused || combat.getState().dead || expedition.getState().session.phase !== 'walking'; }
    async function rifleAim() {
        pointerAt(playerPosition.x,playerPosition.z-10);
        await new Promise(r=>setTimeout(r,900));
        const scene=(window as unknown as {__hordaPlayerScene?:import('three').Object3D}).__hordaPlayerScene;
        const muzzle=scene?.getObjectByName('Muzzle');let root=scene;while(root?.parent)root=root.parent;
        const reticle=root?.getObjectByName('CombatReticle');
        if(!muzzle||!reticle){setResult('Mira: aguardando boca e retícula');return;}
        const p=muzzle.getWorldPosition(new Vector3()),d=muzzle.getWorldDirection(new Vector3());
        const target=reticle.getWorldPosition(new Vector3());target.y-=RIFLE_POSE.reticleLift;
        const angle=d.angleTo(target.clone().sub(p).normalize())*180/Math.PI;
        setResult(`Mira: erro de altura ${Math.abs(target.y-p.y).toFixed(4)} m | desvio do cano ${angle.toFixed(3)}°`);
    }
    async function reticleTargetQA() {
        if(expedition.getState().session.map!=='shanghai') { setResult('Mira: primeiro viaje a Shanghai'); return; }
        combat.getState().selectEncounter(1); expedition.getState().restartMission();
        await delay(650);
        const sim=combatRuntime.simulation,enemy=sim?.robots[0];
        if(!sim||!enemy)return;
        const target={x:playerPosition.x+6,z:playerPosition.z};
        const scene=(window as unknown as {__hordaPlayerScene?:import('three').Object3D}).__hordaPlayerScene;
        let root=scene;while(root?.parent)root=root.parent;
        const cursor=root?.getObjectByName('CombatReticle');
        const start=performance.now();let locked=0,frames=0;
        setResult('Mira: alvo QA reposicionado por 2,4 s…');
        await new Promise<void>(resolve=>{function frame(){
            enemy!.x=target.x;enemy!.z=target.z;
            pointerAt(target.x,target.z);
            const face=cursor?.children[1] as import('three').Mesh;
            if(face&&(face.material as import('three').MeshBasicMaterial).color.getHexString()==='ffc45c')locked++;
            frames++;
            if(performance.now()-start<2400)requestAnimationFrame(frame);else resolve();
        }requestAnimationFrame(frame);});
        setResult(`Mira: ${locked}/${frames} quadros em alvo · sem disparo · HP ${enemy.hp}`);
    }
    async function sample() {
        setResult('Medindo 5s…');
        const deltas: number[] = [];
        let previous = performance.now(), start = previous;
        await new Promise<void>(resolve => { function frame(now: number) { deltas.push(now - previous); previous = now; if (now - start < 5000)
            requestAnimationFrame(frame);
        else
            resolve(); } requestAnimationFrame(frame); });
        deltas.sort((a, b) => a - b);
        setResult(`Amostra 5s: ${deltas.length} frames; mediana ${deltas[Math.floor(deltas.length / 2)].toFixed(1)} ms; p95 ${deltas[Math.floor(deltas.length * .95)].toFixed(1)} ms`);
    }
    const delay=(ms:number)=>new Promise(r=>setTimeout(r,ms));
    // Assisted input: project live targets with the documented camera rig; no damage/HP writes.
    function pointerAt(x:number,z:number,down=false) {
        const canvas=document.querySelector('canvas')!;const r=canvas.getBoundingClientRect();
        const state=game.getState(),p=playerPosition,a=state.targetRotation;
        const camera=new OrthographicCamera(-r.width/2,r.width/2,r.height/2,-r.height/2,.1,160);
        camera.zoom=state.targetZoom;camera.position.set(p.x+Math.cos(a)*18.38,13.55,p.z+Math.sin(a)*18.38);
        camera.lookAt(p.x,.55,p.z);camera.updateProjectionMatrix();camera.updateMatrixWorld();
        const point=new Vector3(x,weaponShotHeight(playerPosition.y,RIFLE_POSE.height),z).project(camera);
        const event={clientX:r.left+(point.x+1)*r.width/2,clientY:r.top+(1-point.y)*r.height/2,button:0,bubbles:true};
        canvas.dispatchEvent(new PointerEvent('pointermove',event));
        if(down)canvas.dispatchEvent(new PointerEvent('pointerdown',event));
    }
    async function encounter(count:number) {
        if(expedition.getState().session.map!=='shanghai')return;
        combat.getState().selectEncounter(count);expedition.getState().restartMission();
        setResult('Combate assistido em andamento…');await delay(600);
        const start=performance.now();let held=false;
        await new Promise<void>(resolve=>{function frame(){
            const sim=combatRuntime.simulation;
            if(!sim||sim.dead||sim.cleared||performance.now()-start>25000){resolve();return;}
            const p=playerPosition;
            const target=sim.robots.filter(r=>r.hp>0).sort((a,b)=>Math.hypot(a.x-p.x,a.z-p.z)-Math.hypot(b.x-p.x,b.z-p.z))[0];
            if(target){pointerAt(target.x,target.z,!held);held=true;}
            if(sim.ammo===0)window.dispatchEvent(new KeyboardEvent('keydown',{code:'KeyR',bubbles:true}));
            requestAnimationFrame(frame);
        }requestAnimationFrame(frame);});
        window.dispatchEvent(new PointerEvent('pointerup',{button:0,bubbles:true}));
        const c=combat.getState();setResult(`Combate ${count}: ${c.kills}/${c.total} | HP ${c.hp} | munição ${c.ammo}/${c.reserve} | ${((performance.now()-start)/1000).toFixed(1)}s`);
    }
    async function pauseCombat() {
        if(expedition.getState().session.map!=='shanghai')return;
        expedition.getState().restartMission();await delay(600);
        pointerAt(0,-10,true);await delay(250);window.dispatchEvent(new PointerEvent('pointerup',{button:0}));
        window.dispatchEvent(new KeyboardEvent('keydown',{code:'KeyR',bubbles:true}));await delay(250);
        game.setState({isPaused:true});const sim=combatRuntime.simulation!;
        const before=JSON.stringify({snapshot:sim.snapshot,time:sim.elapsed,reload:sim.reloadLeft,robots:sim.robots,shots:sim.shots,player:playerPosition});
        await delay(1200);
        const after=JSON.stringify({snapshot:sim.snapshot,time:sim.elapsed,reload:sim.reloadLeft,robots:sim.robots,shots:sim.shots,player:playerPosition});
        game.setState({isPaused:false});await delay(1600);
        setResult(`Pausa com recarga: ${before===after?'PASSOU':'FALHOU'} | pente após retomar ${sim.ammo} | reserva ${sim.reserve}`);
    }
    async function focusTest() {
        if(expedition.getState().session.map!=='shanghai')return;
        expedition.getState().restartMission();await delay(600);
        window.dispatchEvent(new KeyboardEvent('keydown',{code:'KeyW',key:'w',bubbles:true}));
        pointerAt(0,-3,true);const start={...playerPosition};
        await delay(1000);
        window.dispatchEvent(new Event('blur'));await delay(100);
        const stop={...playerPosition},paused=game.getState().isPaused,sim=combatRuntime.simulation!;
        const frozen=JSON.stringify({time:sim.elapsed,robots:sim.robots,ammo:sim.ammo,player:stop});
        await delay(700);
        const unchanged=frozen===JSON.stringify({time:sim.elapsed,robots:sim.robots,ammo:sim.ammo,player:playerPosition});
        const ammo=sim.ammo;game.setState({isPaused:false});await delay(400);
        const still=Math.hypot(playerPosition.x-stop.x,playerPosition.z-stop.z)<.02;
        game.setState({isPaused:true});
        setResult(`Foco: ${paused&&unchanged&&still&&sim.ammo===ammo?'PASSOU':'FALHOU'} | movimento com mira ${Math.hypot(stop.x-start.x,stop.z-start.z).toFixed(2)} m | pausa ${paused} | sem input preso ${still&&sim.ammo===ammo}`);
    }
    async function death() {
        if(expedition.getState().session.map!=='shanghai')return;
        combat.getState().selectEncounter(5);expedition.getState().restartMission();setResult('Aguardando dano natural…');
        await new Promise<void>(resolve=>{const off=combat.subscribe(s=>{if(s.dead){off();resolve();}});});
        setResult(`Morte natural: HP ${combat.getState().hp} | mortos ${combat.getState().kills} | clique Tentar novamente`);
    }
    return <aside style={{ position: 'fixed', right: 12, bottom: 12, zIndex: 20, maxWidth: 360, maxHeight: '75vh', overflowY: 'auto', background: '#12232e', padding: 10, border: '1px solid orange', fontSize: 12 }}>
  <button onClick={() => setHidden(!hidden)}>{hidden ? 'Mostrar QA' : 'Ocultar QA'}</button>
  {!hidden && <><p>Fixture DEV · posições preparadas para teste, sem alterar o mapa do produto</p>
  <button onClick={() => place('eden')}>Preparar perto de EDEN</button><button onClick={() => place('deck')}>Preparar no deck</button>
  <button onClick={()=>{const g=game.getState();g.setZoomBounds(g.minZoom,g.minZoom*12);g.setZoom(g.minZoom*10);}}>Zoom diagnóstico</button><button onClick={measureVibration}>Medir vibração 4s</button><button onClick={compareShadowBias}>Comparar bias de sombra</button><button onClick={compareCharacterShadows}>{receivingShadows?"Desligar sombras no personagem":"Ligar sombras no personagem"}</button><button onClick={()=>{const a=(window as unknown as {__hordaPlayerActions?:Record<string,import('three').AnimationAction>}).__hordaPlayerActions;const mixer=a?.Idle?.getMixer();if(mixer)mixer.timeScale=mixer.timeScale?0:1;}}>Congelar/descongelar pose</button><button onClick={transitions}>Testar transições rápidas</button><button onClick={()=>movement()}>Testar movimento 1s</button><button onClick={()=>movement(true)}>Testar corrida armada</button><button onClick={rifleAim}>Testar mira/cano</button><button onClick={dash}>Testar Dash Space</button><button onClick={()=>armedAnimation()}>Testar corrida com tiro</button><button onClick={()=>armedAnimation(true)}>Testar Reloading</button><button onClick={reticleTargetQA}>Testar mira em alvo</button><button onClick={sample}>Medir frames 5s</button>
  <button onClick={swordMovement}>Testar combo com W</button><button onClick={()=>encounter(1)}>Combate assistido 1</button><button onClick={()=>encounter(3)}>Combate assistido 3</button><button onClick={()=>encounter(5)}>Combate assistido 5</button>
  <button onClick={pauseCombat}>Testar pausa e recarga</button><button onClick={focusTest}>Testar movimento e foco</button><button onClick={death}>Testar morte natural</button>
  <p role="status">{result}</p>{vibrationReport&&<textarea aria-label="Diagnóstico de vibração" readOnly value={vibrationReport} style={{width:"100%",height:80}}/>}<p>{s.session.map} / {s.session.phase} / pronto: {String(s.ready)}</p></>}
 </aside>;
}
if (import.meta.env.DEV) {
    if (!expedition.getState().profile)
        expedition.getState().start('QA Sprint 2', '#66e6ff');
    createRoot(document.getElementById('app')!).render(<React.StrictMode><App /></React.StrictMode>);
    createRoot(document.getElementById('qa')!).render(<QA />);
}
