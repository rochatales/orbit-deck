/** Fixture DEV isolada. Não integra build nem altera contratos da câmera/movimento. */
import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Vector3, type Object3D, type Mesh, type MeshStandardMaterial, LinearFilter } from 'three';
import { App } from '../src/app/App';
import { useExpeditionStore as expedition } from '../src/state/useExpeditionStore';
import { useGameStore as game } from '../src/state/useGameStore';
import { placePlayer, playerPosition } from '../src/state/playerTransient';
import '../src/styles/global.css';
const points = {
    laboratorio: { x: 16.75, y: 0, z: -9.3 }, 'laboratorio-fora': { x: 16.75, y: 0, z: -6.8 },
    meeting: { x: 0, y: 0, z: 1.5 }, 'meeting-fora': { x: 0, y: 0, z: 6 },
    data: { x: -12.5, y: 0, z: 0 }, 'data-fora': { x: -7, y: 0, z: 0 }
};
function root() { let scene = (window as unknown as { __hordaPlayerScene?: Object3D }).__hordaPlayerScene; while (scene?.parent) scene = scene.parent; return scene; }
function QA() {
    const s = expedition(), [note, setNote] = useState('S6.12 · diagnóstico visual'), [hidden, setHidden] = useState(false);
    const position = (key: keyof typeof points) => {
        if (!s.ready || s.session.map !== 'mars') return;
        const p = points[key]; placePlayer(p); game.setState({ isPaused: false });
        expedition.setState({ spawn: p, panel: null, session: { ...s.session, phase: 'walking', destination: null, revision: s.session.revision + 1 } });
        setNote(key);
    };
    async function walkAndTurn() {
        const start = { ...playerPosition }, scene = root(); let camera: import('three').Camera | undefined;
        scene?.traverse(n => { if ((n as import('three').Camera).isCamera && !camera) camera = n as import('three').Camera; });
        const canvas = document.querySelector('canvas')!;
        if (camera) { const aim = new Vector3(start.x - 4, .85, start.z).project(camera), r = canvas.getBoundingClientRect(); canvas.dispatchEvent(new PointerEvent('pointermove', { clientX: r.left + (aim.x + 1) * r.width / 2, clientY: r.top + (1 - aim.y) * r.height / 2, bubbles: true })); }
        const key = (code: string, down: boolean) => window.dispatchEvent(new KeyboardEvent(down ? 'keydown' : 'keyup', { code, bubbles: true }));
        key('KeyW', true); await new Promise(r => setTimeout(r, 400)); key('KeyW', false);
        key('KeyQ', true); await new Promise(r => setTimeout(r, 350)); key('KeyQ', false);
        key('KeyC', true); await new Promise(r => setTimeout(r, 350)); key('KeyC', false);
        setNote(`W + Q/C · deslocamento ${Math.hypot(playerPosition.x - start.x, playerPosition.z - start.z).toFixed(2)} m`);
    }
    function mipmaps() {
        let count = 0;
        root()?.traverse(n => { const mesh = n as Mesh; if (!mesh.isMesh) return;
            for (const material of (Array.isArray(mesh.material) ? mesh.material : [mesh.material]) as MeshStandardMaterial[]) if (material.name === 'MAT_Laboratorio_Atlas_2K') {
                for (const key of ['map', 'emissiveMap', 'roughnessMap', 'metalnessMap'] as const) { const t = material[key]; if (t) { t.minFilter = LinearFilter; t.generateMipmaps = false; t.needsUpdate = true; count++; } }
            }
        }); setNote(`A/B somente diagnóstico: atlas Lab sem mipmaps · ${count} vínculos`);
    }
    return <aside style={{ position: 'fixed', top: 3, left: 3, zIndex: 1000000, padding: 7, background: '#06131be8', maxWidth: 720 }}>
        <button onClick={() => setHidden(!hidden)}>{hidden ? 'Mostrar QA estrutural' : 'Ocultar QA estrutural'}</button>
        {!hidden && <><div>{Object.keys(points).map(key => <button key={key} disabled={!s.ready} onClick={() => position(key as keyof typeof points)}>{key}</button>)}</div>
            <button onClick={walkAndTurn}>Andar e girar Q/C</button><button onClick={mipmaps}>Comparar atlas sem mipmaps</button>
            <button onClick={() => game.getState().setZoom(Math.min(game.getState().maxZoom, game.getState().targetZoom * 1.7))}>Aproximar</button>
            <output style={{ display: 'block', fontSize: 11 }}>{note} · {s.ready ? 'pronto' : 'carregando'}</output></>}
    </aside>;
}
createRoot(document.getElementById('app')!).render(<App/>);
createRoot(document.getElementById('qa')!).render(<QA/>);
