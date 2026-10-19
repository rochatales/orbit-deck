import type { CSSProperties } from 'react';
import { Heart, Layers, Boxes, Crosshair, Shell, Siren } from 'lucide-react';
import { COMBAT, HORDE_ENCOUNTER } from './config';
import { useCombatStore } from '../state/useCombatStore';
import { useExpeditionStore } from '../state/useExpeditionStore';
import { useGameStore } from '../state/useGameStore';
export function EncounterSelect() {
    const choice = useCombatStore(s => s.encounter), select = useCombatStore(s => s.selectEncounter);
    return <label>Robôs no encontro de teste<select aria-label="Robôs no encontro" value={String(choice)} onChange={e => select(e.target.value === HORDE_ENCOUNTER ? HORDE_ENCOUNTER : Number(e.target.value))}>
      <option value={HORDE_ENCOUNTER}>Hordas · {COMBAT.hordes.waves.join(' → ')} pela borda</option>
      <option value={1}>1 · Aprender a mirar</option><option value={3}>3 · Patrulha pequena</option><option value={5}>5 · Pressão de combate</option><option value={32}>32 · Patrulhas (~30 s)</option>
    </select></label>;
}
function StatusMeter({ label, value, max, detail, kind }: { label: string; value: number; max: number; detail: string; kind: string }) {
    const percent = Math.max(0, Math.min(100, value / max * 100));
    return <section className={`status-meter ${kind} ${percent <= 25 ? 'is-low' : ''}`}>
      <div className="meter-heading"><span>{label}</span><b>{value}<i> / {max}</i></b></div>
      <div className="meter-track" role="progressbar" aria-label={label} aria-valuenow={value} aria-valuemin={0} aria-valuemax={max} style={{ '--fill': `${percent}%` } as CSSProperties}><div className="meter-fill"/></div>
      <div className="meter-caption"><span>{detail}</span><b>{Math.round(percent)}%</b></div>
    </section>;
}
export function CombatHud() {
    const s = useCombatStore(), phase = useExpeditionStore(s => s.session.phase), panel = useExpeditionStore(s => s.panel), paused = useGameStore(s => s.isPaused);
    const restart = useExpeditionStore(s => s.restartMission);
    return <>
    <aside className="combat-hud" aria-label="Estado de combate">
      <div className="hud-ident"><span className="status-dot"/> EXPLORADOR <span>STATUS VITAL / 01</span></div>
      <StatusMeter label="VIDA" value={s.hp} max={COMBAT.playerHp} detail={s.hp <= 25 ? 'INTEGRIDADE CRÍTICA' : 'SINAIS VITAIS ESTÁVEIS'} kind="health"/>
      <StatusMeter label="MUNIÇÃO" value={s.ammo} max={COMBAT.rifle.magazine} detail={s.reloading ? 'RECARREGANDO…' : s.ammo === 0 ? 'PENTE VAZIO · R RECARREGAR' : `RIFLE · ${s.reserve} EM RESERVA`} kind="ammo"/>
      <div className="combat-tally"><Crosshair size={14}/><span>AMEAÇAS NEUTRALIZADAS</span><b>{s.kills} / {s.total}</b></div>
      {s.waves > 0 && <div className="combat-wave"><Siren size={14}/>
        <span>{s.cleared ? 'HORDAS CONCLUÍDAS' : s.nextWave > 0 ? `PRÓXIMA HORDA ${s.wave + 1} / ${s.waves}` : `HORDA ${s.wave} / ${s.waves}`}</span>
        <b>{s.cleared ? '✓' : s.nextWave > 0 ? `${s.nextWave} s` : `${s.alive} ATIVOS`}</b>
      </div>}
    </aside>
    {s.waves > 0 && s.nextWave > 0 && !s.dead && !paused && <div className="wave-banner" role="status">
      <small>{s.wave === 0 ? 'CONTATO IMINENTE' : `HORDA ${s.wave} NEUTRALIZADA`}</small>
      <strong>HORDA {s.wave + 1} / {s.waves}</strong>
      <span>{COMBAT.hordes.waves[s.wave]} robôs pela borda do mapa · {s.nextWave} s</span>
    </div>}
    <aside className="equipment-bar" aria-label="Itens e equipamentos">
      <div className="equipment-inventory"><h2>ITENS / EQUIPAMENTOS <span>COLETA POR PROXIMIDADE</span></h2>
        <div className="item-slots">
          <div className="item-slot" title="Ferro coletado nesta tentativa"><div><Layers/><b>×{s.iron}</b></div><span>FERRO</span></div>
          <div className="item-slot" title="Cobre coletado nesta tentativa"><div><Boxes/><b>×{s.copper}</b></div><span>COBRE</span></div>
          <div className="item-slot" title="Munição de reserva"><div><Shell/><b>×{s.reserve}</b></div><span>RESERVA</span></div>
          <div className="item-slot health-slot" title="Corações coletáveis no mapa; cada um recupera 50 de vida"><div><Heart/><b>+50</b></div><span>CURA NO MAPA</span></div>
        </div>
      </div>
      <div className="weapon-slot"><div className="weapon-title"><Crosshair/><span>RIFLE DE EXPLORAÇÃO</span></div><strong>{s.ammo}<span> / {s.reserve}</span></strong><div className="weapon-line" style={{ '--fill': `${s.ammo / COMBAT.rifle.magazine * 100}%` } as CSSProperties}/><small>ARMA PRINCIPAL <span>R · RECARREGAR</span></small></div>
    </aside>
    {s.damage && !s.dead && <div className="damage-vignette" aria-hidden="true"/>}
    {s.hit && !s.dead && <span className="hit-feedback">ACERTO</span>}
    {s.dead && <section className="overlay" role="dialog" aria-label="Explorador abatido"><article><p className="eyebrow">EXPEDIÇÃO INTERROMPIDA</p><h2>Explorador abatido</h2><p>Recomece em Shanghai com vida e munição restauradas. Nenhum progresso deste encontro é salvo. As peças coletadas nesta tentativa serão descartadas.</p><EncounterSelect /><button onClick={restart}>Tentar novamente</button></article></section>}
    {!s.dead && phase === 'walking' && !panel && !paused && (s.cleared || (s.ammo === 0 && s.reserve === 0)) && <aside className="encounter-result">
      <h2>{s.cleared ? (s.waves > 0 ? 'Hordas neutralizadas' : 'Área de teste livre') : 'Sem munição'}</h2><p>{s.cleared ? (s.waves > 0 ? `${s.waves} hordas, ${s.total} robôs. Volte à nave ou repita.` : 'Volte à nave ou repita com mais robôs.') : s.waves > 0 && s.wave < s.waves ? 'A próxima horda chega com reabastecimento. Sobreviva ou reinicie.' : 'Retorne à nave ou reinicie para receber um novo carregamento.'}</p><EncounterSelect /><button onClick={restart}>Reiniciar encontro</button>
    </aside>}
  </>;
}
