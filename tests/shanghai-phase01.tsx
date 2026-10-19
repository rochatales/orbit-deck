/** Fixture isolada de QA: mesmos App, física, câmera e render do jogo. Não entra no build. */
import React from 'react';
import { createRoot } from 'react-dom/client';
import { App } from '../src/app/App';
import { useExpeditionStore as expedition } from '../src/state/useExpeditionStore';
import { useGameStore as game } from '../src/state/useGameStore';
import { combatRuntime, useCombatStore as combat } from '../src/state/useCombatStore';
import { placePlayer, playerPosition } from '../src/state/playerTransient';
import { MAPS, INITIAL_POSITION } from '../src/game/config';
import data from '../src/assets/shanghai-fase01/layout.json';
import '../src/styles/global.css';
const query = new URLSearchParams(location.search), map = query.get('map') === 'mars' ? 'mars' : 'shanghai';
const spawn = map === 'mars' ? INITIAL_POSITION : MAPS.shanghai.exit;
expedition.setState({profile:{displayName:'QA S6.3',color:'#66e6ff'},session:{map,phase:'walking',destination:null,revision:1},spawn,panel:null});
combat.setState({encounter:1});placePlayer(spawn);
(window as any).__shanghaiQA = {
 viewpoints:data.viewpoints,
 disableCombat(){ if(combatRuntime.simulation) combatRuntime.simulation.robots.length=0; combat.setState({hp:100,dead:false}); },
 place(x:number,z:number,angle:number) {
  const state=expedition.getState(),spawn={x,y:0,z};placePlayer(spawn);
  expedition.setState({spawn,session:{...state.session,phase:'walking',revision:state.session.revision+1},panel:null});
  game.setState({isPaused:false});setTimeout(()=>game.setState({targetRotation:angle}),100);
 },
 position:()=>({...playerPosition}), resume:()=>game.setState({isPaused:false}),
 state:()=>({map:expedition.getState().session.map,phase:expedition.getState().session.phase,ready:expedition.getState().ready}),
};
createRoot(document.getElementById('app')!).render(<App/>);
