import { useEffect, useState } from 'react';
import { Plane, ArrowRight, ArrowLeft } from 'lucide-react';
import { BACKPACK, EMPTY_CARGO, cargoWeight, type ResourceCargo } from '../game/backpackConfig';
import { RESOURCE_KINDS, RESOURCE_LABEL, SHIP_CARGO, cargoStacks, isNearCargo, type ResourceKind } from '../game/shipCargo';
import type { MapId } from '../game/session';
import { useCombatStore } from '../state/useCombatStore';
import { useShipCargoStore } from '../state/useShipCargoStore';
import { playerPosition } from '../state/playerTransient';
import { ItemArtwork } from './ItemArtwork';

const kg = (value: number) => value.toFixed(1).replace('.', ',');

/** Proximidade do porão (raio maior que o embarque), publicada a 5 Hz fora do quadro. */
export function useNearShipCargo(map: MapId) {
  const [near, setNear] = useState(false);
  useEffect(() => {
    const tick = () => setNear(isNearCargo(map, playerPosition));
    tick();
    const clock = window.setInterval(tick, 200);
    return () => window.clearInterval(clock);
  }, [map]);
  return near;
}

/** Botão de ação ao lado da mochila: só acende perto da aeronave. */
export function ShipCargoButton({ map, onOpen }: { map: MapId; onOpen: () => void }) {
  const near = useNearShipCargo(map), weight = cargoWeight(useShipCargoStore(s => s.cargo));
  return <button className={`beta-ship-cargo ${near ? 'is-near' : ''}`} disabled={!near} onClick={onOpen}
    aria-label={near ? 'Abrir carga da aeronave · F' : 'Carga da aeronave · aproxime-se da aeronave'} title={near ? 'Carga da aeronave · F' : 'Aproxime-se da aeronave'}>
    <Plane aria-hidden="true"/><div><span>AERONAVE <kbd>F</kbd></span><strong>{kg(weight)} <small>/ {SHIP_CARGO.capacityKg} kg</small></strong>
      <div className="beta-weight-track" aria-hidden="true"><i style={{ width: `${Math.min(100, weight / SHIP_CARGO.capacityKg * 100)}%` }}/></div>
    </div>
  </button>;
}

function Grid({ cargo, slots, action, onMove, label }: { cargo: ResourceCargo; slots: number; action: string; onMove?: (kind: ResourceKind, one: boolean) => void; label: string }) {
  const stacks = cargoStacks(cargo);
  return <div className="beta-slot-grid" role="list" aria-label={label}>
    {Array.from({ length: slots }, (_, i) => {
      const stack = stacks[i];
      if (!stack) return <span key={i} className="beta-slot is-empty" role="listitem" aria-label="Espaço vazio"/>;
      const name = RESOURCE_LABEL[stack.kind];
      return <button key={stack.kind} className="beta-slot" role="listitem" disabled={!onMove} onClick={event => onMove?.(stack.kind, event.shiftKey)}
        title={`${name} · ${action} (Shift: uma unidade)`} aria-label={`${name}, ${stack.count} unidades, ${kg(stack.kg)} kg · ${action}`}>
        <ItemArtwork item={stack.kind}/><b>{stack.count}</b><small>{name}</small>
      </button>;
    })}
  </div>;
}

/** Menu do porão: mochila à esquerda, aeronave à direita (pegada da referência, identidade EXODEN). */
export function ShipCargoPanel({ map }: { map: MapId }) {
  const combat = map === 'shanghai', live = useCombatStore(), backpack: ResourceCargo = combat ? live : EMPTY_CARGO;
  const ship = useShipCargoStore(s => s.cargo), deposit = useShipCargoStore(s => s.deposit), withdraw = useShipCargoStore(s => s.withdraw);
  const [note, setNote] = useState('');
  const near = useNearShipCargo(map), canMove = combat && near && !live.dead;
  const pack = cargoWeight(backpack), hold = cargoWeight(ship);
  const move = (kind: ResourceKind | undefined, one: boolean, to: 'ship' | 'pack') => {
    const moved = to === 'ship' ? deposit(kind, one ? 1 : undefined) : withdraw(kind, one ? 1 : undefined);
    setNote(moved ? `${moved} ${moved === 1 ? 'item movido' : 'itens movidos'} para ${to === 'ship' ? 'a aeronave' : 'a mochila'}.` : to === 'ship' ? 'Porão sem espaço ou mochila vazia.' : 'Mochila sem espaço ou porão vazio.');
  };
  return <section className="beta-ship-hold" aria-label="Carga da aeronave">
    <div className="beta-cargo-title"><Plane aria-hidden="true" className="beta-ship-icon"/><div><p className="eyebrow">AERONAVE · PORÃO</p><h2>Carga da aeronave</h2></div>
      <strong>{kg(hold)} <small>/ {SHIP_CARGO.capacityKg} kg</small></strong></div>
    <div className="beta-hold-columns">
      <section className="beta-hold-card">
        <header><ItemArtwork item="backpack"/><h3>Mochila <small>({cargoStacks(backpack).length}/{RESOURCE_KINDS.length})</small></h3><span>{kg(pack)} / {BACKPACK.capacityKg} kg</span></header>
        <div className="beta-weight-track" aria-hidden="true"><i style={{ width: `${Math.min(100, pack / BACKPACK.capacityKg * 100)}%` }}/></div>
        <Grid cargo={backpack} slots={RESOURCE_KINDS.length} action="depositar na aeronave" label="Itens da mochila" onMove={canMove ? (kind, one) => move(kind, one, 'ship') : undefined}/>
        <button disabled={!canMove || pack === 0} onClick={() => move(undefined, false, 'ship')}>Depositar tudo <ArrowRight size={13}/></button>
      </section>
      <section className="beta-hold-card is-ship">
        <header><Plane aria-hidden="true"/><h3>Porão <small>({cargoStacks(ship).length}/{SHIP_CARGO.slots})</small></h3><span>{kg(hold)} / {SHIP_CARGO.capacityKg} kg</span></header>
        <div className="beta-weight-track" aria-hidden="true"><i style={{ width: `${Math.min(100, hold / SHIP_CARGO.capacityKg * 100)}%` }}/></div>
        <Grid cargo={ship} slots={SHIP_CARGO.slots} action="retirar para a mochila" label="Itens no porão" onMove={canMove ? (kind, one) => move(kind, one, 'pack') : undefined}/>
        <button className="secondary" disabled={!canMove || hold === 0} onClick={() => move(undefined, false, 'pack')}><ArrowLeft size={13}/> Retirar tudo</button>
      </section>
    </div>
    <p className="beta-hold-note" role="status">{note || (!near ? 'Aproxime-se da aeronave para mover a carga.' : !combat ? 'O porão guarda o que veio da Terra. Desça em Shanghai para carregar mais.' : 'Clique num item para mover a pilha · Shift + clique move uma unidade.')}</p>
    <small>Itens no porão ficam a salvo: não se perdem ao cair em combate nem ao reiniciar o encontro. Munição e kits médicos não ocupam carga.</small>
  </section>;
}
