import { useStoredMedicalKit } from '../game/props/medicalKitInteraction';
import { useWeaponStore } from '../state/useWeaponStore';
import { canEquipPlayerWeapon, equipPlayerWeapon } from '../characters/player/WeaponControls';
import { MACHETE } from '../combat/melee';
import { useEffect, type CSSProperties } from 'react';
import { Heart, Zap, ChevronRight } from 'lucide-react';
import { BACKPACK, EMPTY_CARGO, cargoWeight } from '../game/backpackConfig';
import { COMBAT } from '../combat/config';
import { useCombatStore } from '../state/useCombatStore';
import { useBackpackEnergy, publishBackpackEnergy } from '../state/useBackpackEnergy';
import { ItemArtwork } from './ItemArtwork';

export function VitalBar({ label, value, max, kind }: { label: string; value: number; max: number; kind: 'life' | 'energy' }) {
  const percent = Math.max(0, Math.min(100, value / max * 100));
  return <div className={`beta-vital ${kind} ${kind === 'life' && percent <= 30 ? 'is-critical' : ''}`}>
    {kind === 'life' ? <Heart aria-hidden="true"/> : <Zap aria-hidden="true"/>}
    <div className="beta-vital-content"><div className="beta-vital-heading"><span>{label}{kind === 'life' && percent <= 30 ? ' · CRÍTICA' : ''}</span><b>{Math.round(value)}<small> / {max}</small></b></div>
      <div className="beta-vital-track" role="progressbar" aria-label={label} aria-valuenow={Math.round(value)} aria-valuemin={0} aria-valuemax={max}>
        <span style={{ width: `${percent}%` }}/>
      </div>
    </div>
  </div>;
}
export function GameplayHud({ combat, openBackpack }: { combat: boolean; openBackpack: () => void }) {
  useEffect(() => {
    // Publicação limitada a 10 Hz, fora do passo físico e sem render por quadro.
    const clock = window.setInterval(publishBackpackEnergy, 100);
    return () => window.clearInterval(clock);
  }, []);
  const s = useCombatStore(), energy = useBackpackEnergy(s => s.percent);
  const selected = useWeaponStore(s => s.weapon), machete = selected === 'machete';
  const weight = cargoWeight(combat ? s : EMPTY_CARGO), full = weight >= BACKPACK.capacityKg - .2;
  return <>
    {combat && <div className="beta-wave" aria-live="polite">
      <span className="beta-signal"/><strong>{s.cleared ? 'ÁREA NEUTRALIZADA' : s.waves > 0 ? `HORDA ${Math.max(1, s.wave)} / ${s.waves}` : 'CONTATO HOSTIL'}</strong>
      <span>{s.nextWave > 0 ? `CHEGADA EM ${s.nextWave} s` : `${s.alive} ATIVOS`}</span>
      <small>{s.kills} / {s.total}</small>
    </div>}
    <div className="beta-bottom">
      <aside className="beta-vitals" aria-label="Condição do explorador">
        <VitalBar label="VIDA" value={combat ? s.hp : COMBAT.playerHp} max={COMBAT.playerHp} kind="life"/>
        <VitalBar label="ENERGIA" value={energy} max={100} kind="energy"/>
        <small className="beta-vital-note">{energy < 50 ? 'RECARREGANDO · 2 DASHs / CARGA' : 'ESPAÇO · 2 DASHs / CARGA'}</small>
      </aside>
      <aside className="beta-loadout" aria-label="Equipamentos · quatro espaços">
        <div className="beta-equipment-slots">
          {Array.from({ length: BACKPACK.equipmentSlots }, (_, slot) => <button key={slot} disabled={slot > 2 || (slot === 2 && (!combat || s.medkits === 0 || s.hp >= COMBAT.playerHp))} onClick={() => slot === 2 ? useStoredMedicalKit() : equipPlayerWeapon(slot === 0 ? 'rifle' : 'machete')} className={`beta-equipment-slot ${slot === (machete ? 1 : 0) ? 'is-equipped' : slot > 2 ? 'is-empty' : ''}`} aria-pressed={slot < 2 ? slot === (machete ? 1 : 0) : undefined} title={slot === 0 ? 'Rifle laser · 1' : slot === 1 ? 'Facão · 2' : slot === 2 ? `Kit médico · +50 HP · 3 · ${s.medkits} unidades` : 'Espaço de equipamento vazio'}>
            {slot < 3 ? <ItemArtwork item={slot === 0 ? 'rifle' : slot === 1 ? 'machete' : 'medical'}/> : <span className="beta-empty-mark" aria-hidden="true">+</span>}
            {slot === 2 && <b className="beta-kit-count">×{combat ? s.medkits : 0}</b>}<kbd>{slot + 1}</kbd><span className="sr-only">{slot === 0 ? 'Rifle laser' : slot === 1 ? 'Facão' : slot === 2 ? 'Usar kit médico · 3' : `Espaço ${slot + 1} vazio`}</span>
          </button>)}
        </div>
        <button className={`beta-backpack ${full ? 'is-full' : ''}`} onClick={openBackpack} aria-label="Abrir mochila · B" title="Mochila · B">
          <ItemArtwork item="backpack"/><div><span>MOCHILA <kbd>B</kbd></span><strong>{weight.toFixed(1).replace('.', ',')} <small>/ {BACKPACK.capacityKg} kg</small></strong>
            <div className="beta-weight-track" role="progressbar" aria-label="Peso da mochila" aria-valuenow={Number(weight.toFixed(1))} aria-valuemin={0} aria-valuemax={BACKPACK.capacityKg}>
              <i style={{ width: `${Math.min(100, weight / BACKPACK.capacityKg * 100)}%` }}/>
            </div>
          </div><ChevronRight size={13}/>
        </button>
      </aside>
      <aside className={`beta-ammo ${combat && !machete && s.ammo === 0 ? 'is-empty' : ''}`} aria-label={!combat ? 'Arma principal no coldre' : machete ? 'Facão equipado' : 'Munição do rifle'}>
        <ItemArtwork item={machete ? 'machete' : 'ammo'}/><div><small>{machete ? 'FACÃO' : combat && s.reloading ? 'RECARREGANDO…' : 'RIFLE LASER'}</small>
          <strong>{combat ? machete ? MACHETE.damage : s.ammo : '—'}{!machete && <span> / {combat ? s.reserve : '—'}</span>}</strong><small>{!combat ? 'ARMA NO COLDRE' : machete ? 'DANO · BOTÃO ESQUERDO' : 'R · RECARREGAR'}</small>
        </div>
      </aside>
    </div>
    {combat && full && <p className="beta-cargo-warning" role="status">Carga quase cheia · itens sem espaço permanecem no chão.</p>}
  </>;
}
export function BackpackContents({ combat }: { combat: boolean }) {
  const s = useCombatStore(), cargo = combat ? s : EMPTY_CARGO;
  const weight = cargoWeight(cargo), selected = useWeaponStore(s => s.weapon);
  const canEquip = canEquipPlayerWeapon('inventory');
  return <section className="beta-cargo" aria-label="Conteúdo da mochila">
    <div className="beta-cargo-title"><ItemArtwork item="backpack"/><div><p className="eyebrow">CARGA DA EXPEDIÇÃO</p><h2>Mochila</h2></div><strong>{weight.toFixed(1).replace('.', ',')} <small>/ {BACKPACK.capacityKg} kg</small></strong></div>
    <div className="beta-weight-track" role="progressbar" aria-label="Carga transportada" aria-valuenow={Number(weight.toFixed(1))} aria-valuemin={0} aria-valuemax={BACKPACK.capacityKg}><i style={{ width: `${Math.min(100, weight / BACKPACK.capacityKg * 100)}%` } as CSSProperties}/></div>
    <section className="beta-primary-weapon" aria-label="Arma principal">
      <h3>Arma principal</h3><p>{combat ? 'Escolha a arma para empunhar ao retomar.' : 'Escolha a arma que fica pendurada na cintura.'}</p>
      <div className="beta-weapon-choices">{(['rifle', 'machete'] as const).map(weapon => <button key={weapon} disabled={!canEquip} aria-pressed={selected === weapon} className={`beta-weapon-choice ${selected === weapon ? 'is-equipped' : ''}`} onClick={() => equipPlayerWeapon(weapon, 'inventory')}>
        <ItemArtwork item={weapon}/><span>{weapon === 'rifle' ? 'Rifle laser' : 'Facão'}<small>{selected === weapon ? 'PRINCIPAL' : 'SELECIONAR'}</small></span>
      </button>)}</div>
    </section>
    <div className="beta-resource-grid">{([['iron', 'Ferro'], ['copper', 'Cobre'], ['titanium', 'Titânio'], ['organic', 'Matéria orgânica']] as const).map(([kind, label]) => <div className="beta-resource" key={kind}>
      <ItemArtwork item={kind}/><b>×{cargo[kind]}</b><span>{label}</span><small>{BACKPACK.itemKg[kind].toFixed(1).replace('.', ',')} kg / un.</small>
    </div>)}</div>
    <p>Materiais empilhados na mochila. Kits médicos: {combat ? s.medkits : 0} · use 3 durante a exploração para recuperar 50 de vida.</p>
    <small>Carga temporária desta tentativa. Sem espaço, o recurso permanece no chão. Munição e cura não ocupam essa carga.</small>
  </section>;
}
