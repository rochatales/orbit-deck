/** Development-only fixture. Not imported by the application or the production build. */
import { OrthographicCamera, Vector3 } from 'three';
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
    const s = expedition();
    function place(where: 'eden' | 'deck') {
        if (!s.ready || s.session.map !== 'mars')
            return;
        const point = where === 'eden' ? { ...EDEN.position, z: -8 } : MAPS.mars.exit;
        placePlayer(point);
        game.setState({ isPaused: false });
        expedition.setState({ spawn: point, panel: null, session: { ...s.session, phase: 'walking', destination: null, revision: s.session.revision + 1 } });
    }
    async function movement() {
        const before = { ...playerPosition };
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 's', code: 'KeyS', bubbles: true }));
        await new Promise(r => setTimeout(r, 1000));
        window.dispatchEvent(new KeyboardEvent('keyup', { key: 's', code: 'KeyS', bubbles: true }));
        await new Promise(r => setTimeout(r, 300));
        const after = playerPosition;
        setResult('Deslocamento em 1s: ' + Math.hypot(after.x - before.x, after.z - before.z).toFixed(2) + ' m');
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
        const point=new Vector3(x,.9,z).project(camera);
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
    return <aside style={{ position: 'fixed', right: 12, bottom: 12, zIndex: 20, maxWidth: 360, background: '#12232e', padding: 10, border: '1px solid orange', fontSize: 12 }}>
  <button onClick={() => setHidden(!hidden)}>{hidden ? 'Mostrar QA' : 'Ocultar QA'}</button>
  {!hidden && <><p>Fixture DEV · posições preparadas para teste, sem alterar o mapa do produto</p>
  <button onClick={() => place('eden')}>Preparar perto de EDEN</button><button onClick={() => place('deck')}>Preparar no deck</button>
  <button onClick={movement}>Testar movimento 1s</button><button onClick={sample}>Medir frames 5s</button>
  <button onClick={()=>encounter(1)}>Combate assistido 1</button><button onClick={()=>encounter(3)}>Combate assistido 3</button><button onClick={()=>encounter(5)}>Combate assistido 5</button>
  <button onClick={pauseCombat}>Testar pausa e recarga</button><button onClick={focusTest}>Testar movimento e foco</button><button onClick={death}>Testar morte natural</button>
  <p role="status">{result}</p><p>{s.session.map} / {s.session.phase} / pronto: {String(s.ready)}</p></>}
 </aside>;
}
if (import.meta.env.DEV) {
    if (!expedition.getState().profile)
        expedition.getState().start('QA Sprint 2', '#66e6ff');
    createRoot(document.getElementById('app')!).render(<React.StrictMode><App /></React.StrictMode>);
    createRoot(document.getElementById('qa')!).render(<QA />);
}
