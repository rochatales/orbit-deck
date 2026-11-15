import { RIO_LAYOUT } from './layout';
import { isOnRioPierDeck, rioSeabedHeight, rioWaveSwashFrontX } from './seabed';

const beach = RIO_LAYOUT.bands.find(band => band.id === 'areia')!;
const plazas = RIO_LAYOUT.parts.filter(part => part.kind === 'praca');
const kiosks = RIO_LAYOUT.parts.filter(part => part.kind === 'quiosque');
const inside = (x: number, z: number, bounds: { minX: number; maxX: number; minZ: number; maxZ: number }) =>
    x >= bounds.minX && x <= bounds.maxX && z >= bounds.minZ && z <= bounds.maxZ;

export function rioSandHeight(x: number, z: number) {
    if (x >= beach.minX && x < beach.maxX && z >= RIO_LAYOUT.bounds.minZ && z <= RIO_LAYOUT.bounds.maxZ &&
        !isOnRioPierDeck(x, z)) {
        for (const kiosk of kiosks) if (inside(x, z, kiosk)) return null;
        return rioSeabedHeight(x, z);
    }

    // Mesmo recuo do canteiro de areia no lote de concreto da arte v005.
    for (const p of plazas) {
        if (x >= p.minX + .28 && x <= p.maxX - .28 && z >= p.minZ + .3 && z <= p.maxZ - .3) return .13;
    }
    return null;
}

export function rioSandStepKind(x: number, z: number, time: number) {
    if (rioSandHeight(x, z) === null) return null;
    if (x >= rioWaveSwashFrontX(z, time) + .2) return null;
    return x > 33.1 ? 'damp' : 'dry';
}
