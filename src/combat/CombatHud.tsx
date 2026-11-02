import { COMBAT, HORDE_TOTALS, HORDE_ENCOUNTER, PATROL_COUNTS, PATROL_KINDS, parseEncounter, patrolChoice, type RobotKind } from './config';
import { useCombatStore } from '../state/useCombatStore';
import { useExpeditionStore } from '../state/useExpeditionStore';
import { useGameStore } from '../state/useGameStore';
const KIND_LABEL: Record<RobotKind, string> = { patrol: 'Patrol comum', largePatrol: 'Patrol grande', smallMutant: 'Mutante pequeno', largeMutant: 'Mutante grande' };
const COUNT_LABEL: Record<number, string> = { 1: '1 · Aprender a mirar', 3: '3 · Patrulha pequena', 5: '5 · Pressão de combate', 32: '32 · Patrulhas (~30 s)' };
/** Hordas ou patrulha de teste com um só tipo de inimigo e quantidade 1/3/5 (32 só no Patrol comum). */
export function EncounterSelect() {
    const choice = useCombatStore(s => s.encounter), select = useCombatStore(s => s.selectEncounter);
    const patrol = parseEncounter(choice), counts: readonly number[] = patrol?.kind === 'patrol' ? [...PATROL_COUNTS, COMBAT.encounterSize] : PATROL_COUNTS;
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
    const restart = useExpeditionStore(s => s.restartMission);
    return <>
    {s.waves > 0 && s.nextWave > 0 && !s.dead && !paused && <div className="wave-banner" role="status">
      <small>{s.wave === 0 ? 'CONTATO IMINENTE' : `HORDA ${s.wave} NEUTRALIZADA`}</small>
      <strong>HORDA {s.wave + 1} / {s.waves}</strong>
      <span>{HORDE_TOTALS[s.wave]} ameaças pela borda do mapa{COMBAT.hordes.largePatrols[s.wave] > 0 ? ` · ${COMBAT.hordes.largePatrols[s.wave]} Patrol grandes` : ''}{COMBAT.hordes.smallMutants[s.wave] > 0 ? ` · ${COMBAT.hordes.smallMutants[s.wave]} animais` : ''} · {s.nextWave} s</span>
    </div>}
    {s.damage && !s.dead && <div className="damage-vignette" aria-hidden="true"/>}
    {s.dead && <section className="overlay" role="dialog" aria-label="Explorador abatido"><article><p className="eyebrow">EXPEDIÇÃO INTERROMPIDA</p><h2>Explorador abatido</h2><p>Recomece em Shanghai com vida e munição restauradas. Nenhum progresso deste encontro é salvo. As peças coletadas nesta tentativa serão descartadas.</p><EncounterSelect /><button onClick={restart}>Tentar novamente</button></article></section>}
    {!s.dead && phase === 'walking' && !panel && !paused && (s.cleared || (s.ammo === 0 && s.reserve === 0)) && <aside className="encounter-result">
      <h2>{s.cleared ? (s.waves > 0 ? 'Hordas neutralizadas' : 'Área de teste livre') : 'Sem munição'}</h2><p>{s.cleared ? (s.waves > 0 ? `${s.waves} hordas, ${s.total} ameaças. Volte à nave ou repita.` : 'Volte à nave ou repita com mais robôs.') : s.waves > 0 && s.wave < s.waves ? 'A próxima horda chega com reabastecimento. Sobreviva ou reinicie.' : 'Procure as caixas de munição com luz azul e use E. Você também pode retornar à nave ou reiniciar.'}</p><button onClick={restart}>Reiniciar encontro</button>
    </aside>}
  </>;
}
