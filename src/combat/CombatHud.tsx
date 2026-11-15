import { useCampaignStore } from '../state/useCampaignStore';
import { LevelClear } from './LevelClear';
import { useEffect, useState } from 'react';
import { useWeaponStore } from '../state/useWeaponStore';
import { MACHETE_DEATH_OVERLAY_MS } from './melee';
import { COMBAT, HORDE_TOTALS, HORDE_ENCOUNTER, ORGANIC_WAVES, PATROL_COUNTS, PATROL_KINDS, parseEncounter, patrolChoice, type RobotKind } from './config';
import { useCombatStore } from '../state/useCombatStore';
import { useExpeditionStore } from '../state/useExpeditionStore';
import { useGameStore } from '../state/useGameStore';
const KIND_LABEL: Record<RobotKind, string> = { patrol: 'Patrol comum', largePatrol: 'Patrol grande', smallMutant: 'Mutante pequeno', largeMutant: 'Mutante grande' };
const COUNT_LABEL: Record<number, string> = { 1: '1 · Aprender a mirar', 3: '3 · Patrulha pequena', 5: '5 · Pressão de combate', 32: '32 · Patrulhas (~30 s)' };
/** Hordas ou patrulha de teste com um só tipo de inimigo e quantidade 1/3/5 (32 só no Patrol comum). */
export function EncounterSelect() {
    const choice = useCombatStore(s => s.encounter), select = useCombatStore(s => s.selectEncounter);
    const patrol = parseEncounter(choice), counts: readonly number[] = patrol?.kind === 'patrol' ? [...PATROL_COUNTS, COMBAT.encounterSize] : PATROL_COUNTS;
    const campaign = useCampaignStore(s => s.mode === 'campaign');
    if (campaign) return null;
    return <>
      <label>Encontro de teste<select aria-label="Tipo de encontro" value={patrol?.kind ?? HORDE_ENCOUNTER} onChange={e => select(e.target.value === HORDE_ENCOUNTER ? HORDE_ENCOUNTER
        : patrolChoice(e.target.value as RobotKind, Math.min(patrol?.count ?? 3, 5)))}>
        <option value={HORDE_ENCOUNTER}>Hordas · {HORDE_TOTALS.join(' → ')} pela borda</option>
        {PATROL_KINDS.map(kind => <option key={kind} value={kind}>Patrulha · {KIND_LABEL[kind]}</option>)}
      </select></label>
      {patrol && <label>Quantidade<select aria-label="Quantidade na patrulha" value={patrol.count} onChange={e => select(patrolChoice(patrol.kind, Number(e.target.value)))}>
        {counts.map(count => <option key={count} value={count}>{COUNT_LABEL[count]}</option>)}
      </select></label>}
    </>;
}
export function CombatHud() {
    const s = useCombatStore(), phase = useExpeditionStore(s => s.session.phase), panel = useExpeditionStore(s => s.panel), paused = useGameStore(s => s.isPaused);
    const location = useExpeditionStore(s => s.session.map === 'rio' ? 'Rio de Janeiro' : 'Shanghai');
    const campaign = useCampaignStore(s => s.mode === 'campaign');
    const organic = useCampaignStore(s => s.mode === 'campaign' && s.saved?.campaign.stage === 'expedition-organic');
    const weapon = useWeaponStore(s => s.weapon);
    const restart = useExpeditionStore(s => s.restartMission);
    const returnAfterDefeat = useExpeditionStore(s => s.returnAfterDefeat);
    // Com a espada, a queda do explorador aparece antes do painel; com o rifle, segue imediato.
    const [deathPanel, setDeathPanel] = useState(false);
    useEffect(() => {
        if (!s.dead) { setDeathPanel(false); return; }
        if (weapon !== 'machete') { setDeathPanel(true); return; }
        const timer = window.setTimeout(() => setDeathPanel(true), MACHETE_DEATH_OVERLAY_MS);
        return () => window.clearTimeout(timer);
    }, [s.dead, weapon]);
    const resultTitle = s.cleared ? (organic ? 'Ondas de mutantes neutralizadas' : s.waves > 0 ? 'Hordas neutralizadas' : campaign ? 'Patrulha neutralizada' : 'Área de teste livre') : 'Sem munição';
    const resultText = s.cleared
        ? s.waves > 0 ? `${s.waves} ${organic ? 'ondas' : 'hordas'}, ${s.total} ameaças. ${campaign ? 'Guarde os recursos e volte à nave.' : 'Volte à nave ou repita.'}`
            : campaign ? 'Guarde os recursos na aeronave e volte a Marte.' : 'Volte à nave ou repita com mais robôs.'
        : organic ? 'Equipe o facão de plasma (2) ou procure as caixas de munição e use E.'
            : s.waves > 0 && s.wave < s.waves ? `A próxima horda chega com reabastecimento. ${campaign ? 'Sobreviva até o reabastecimento.' : 'Sobreviva ou reinicie.'}`
            : campaign ? 'Procure as caixas de munição e use E.' : 'Equipe o facão (2) ou procure as caixas de munição e use E. Você também pode retornar à nave ou reiniciar.';
    return <>
    {s.waves > 0 && s.nextWave > 0 && !s.dead && !paused && <div className="wave-banner" role="status">
      <small>{s.wave === 0 ? 'CONTATO IMINENTE' : `${organic ? 'ONDA' : 'HORDA'} ${s.wave} NEUTRALIZADA`}</small>
      <strong>{organic ? 'ONDA' : 'HORDA'} {s.wave + 1} / {s.waves}</strong>
      <span>{organic ? `${ORGANIC_WAVES[s.wave]} Mutantes Shangai pela borda do mapa`
          : `${HORDE_TOTALS[s.wave]} ameaças pela borda do mapa${COMBAT.hordes.largePatrols[s.wave] > 0 ? ` · ${COMBAT.hordes.largePatrols[s.wave]} Patrol grandes` : ''}${COMBAT.hordes.smallMutants[s.wave] > 0 ? ` · ${COMBAT.hordes.smallMutants[s.wave]} animais` : ''}`} · {s.nextWave} s</span>
    </div>}
    {campaign && !s.dead && s.cleared && phase === 'walking' && !panel && !paused && <LevelClear key={s.run}/>}
    {s.damage && !s.dead && <div className="damage-vignette" aria-hidden="true"/>}
    {s.dead && deathPanel && <section className="overlay" role="dialog" aria-label="Explorador abatido"><article><p className="eyebrow">EXPEDIÇÃO INTERROMPIDA</p><h2>Explorador abatido</h2>{campaign ? <><p>A mochila e os recursos desta tentativa foram perdidos. A carga anterior está a salvo.</p>
      <button onClick={returnAfterDefeat}>Retornar a Marte</button></> : <><p>Recomece em {location} com vida e munição restauradas. Nenhum progresso deste encontro é salvo. As peças coletadas nesta tentativa serão descartadas.</p>
      <EncounterSelect /><button onClick={restart}>Tentar novamente</button></>}</article></section>}
    {!s.dead && phase === 'walking' && !panel && !paused && ((s.cleared && !campaign) || (!s.cleared && weapon === 'rifle' && s.ammo === 0 && s.reserve === 0)) && <aside className="encounter-result">
      <h2>{resultTitle}</h2><p>{resultText}</p>{!campaign && <button onClick={restart}>Reiniciar encontro</button>}
    </aside>}
  </>;
}
