import type { CSSProperties } from 'react';
import atlas from '../assets/ui/item-icons-beta-v001.png';

export type ItemArt = 'iron' | 'copper' | 'titanium' | 'organic' | 'rifle' | 'ammo' | 'backpack' | 'medical';
const CELL: Record<ItemArt, [number, number]> = {
  iron: [0, 0], copper: [1, 0], titanium: [2, 0], organic: [3, 0],
  rifle: [0, 1], ammo: [1, 1], backpack: [2, 1], medical: [3, 1]
};
/** Atlas ilustrado 4 × 2; cores nativas dos materiais, sem filtro verde. */
export function ItemArtwork({ item }: { item: ItemArt }) {
  const [column, row] = CELL[item];
  return <span className="item-artwork" aria-hidden="true" style={{
    backgroundImage: `url(${atlas})`, backgroundPosition: `${column * 100 / 3}% ${row * 100}%`
  } as CSSProperties}/>;
}
