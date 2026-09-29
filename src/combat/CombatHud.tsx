import { useCombatStore } from '../state/useCombatStore';
import { useExpeditionStore } from '../state/useExpeditionStore';
import { useGameStore } from '../state/useGameStore';
export function EncounterSelect() {
    const count = useCombatStore(s => s.encounterSize), select = useCombatStore(s => s.selectEncounter);
    return <label>Robôs no encontro de teste<select aria-label="Robôs no encontro" value={count} onChange={e => select(Number(e.target.value))}><option value={1}>1 · Aprender a mirar</option><option value={3}>3 · Encontro padrão</option><option value={5}>5 · Pressão de combate</option></select></label>;
}
export function CombatHud() {
    const s = useCombatStore(), phase = useExpeditionStore(s => s.session.phase), panel = useExpeditionStore(s => s.panel), paused = useGameStore(s => s.isPaused);
    const restart = useExpeditionStore(s => s.restartMission);
    return <>
    <aside className="combat-hud" aria-label="Estado de combate">
      <strong>VIDA {s.hp} / 100</strong><progress aria-label="Vida" value={s.hp} max={100}/>
      <b>RIFLE · {s.ammo} / {s.reserve}</b><span>{s.reloading ? 'Recarregando…' : s.ammo === 0 ? (s.reserve > 0 ? 'Sem balas no pente · R para recarregar' : 'Munição esgotada · reinicie o encontro') : 'Mouse: mirar e atirar · R: recarregar'}</span>
      <small>Robôs neutralizados: {s.kills} / {s.total}</small>
    </aside>
    {s.damage && !s.dead && <div className="damage-vignette" aria-hidden="true"/>}
    {s.hit && !s.dead && <span className="hit-feedback">ACERTO</span>}
    {s.dead && <section className="overlay" role="dialog" aria-label="Explorador abatido"><article><p className="eyebrow">EXPEDIÇÃO INTERROMPIDA</p><h2>Explorador abatido</h2><p>Recomece em Shanghai com vida e munição restauradas. Nenhum progresso deste encontro é salvo. O sistema de loot será adicionado em outro sprint.</p><EncounterSelect /><button onClick={restart}>Tentar novamente</button></article></section>}
    {!s.dead && phase === 'walking' && !panel && !paused && (s.cleared || (s.ammo === 0 && s.reserve === 0)) && <aside className="encounter-result">
      <h2>{s.cleared ? 'Área de teste livre' : 'Sem munição'}</h2><p>{s.cleared ? 'Volte à nave ou repita com mais robôs.' : 'Retorne à nave ou reinicie para receber um novo carregamento.'}</p><EncounterSelect /><button onClick={restart}>Reiniciar encontro</button>
    </aside>}
  </>;
}
