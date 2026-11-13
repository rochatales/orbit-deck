import type { MapId } from '../session';
import { RIO_SUPPLY_CRATES } from '../rio/supplies';
import { isShanghaiPhase01 } from '../shanghai/previewMode';
import { SHANGHAI_SUPPLY_CRATES, type CratePlacement } from './supplyCrate';

const NO_CRATES: readonly CratePlacement[] = [];

export function expeditionCrates(map: MapId, phase01 = isShanghaiPhase01()) {
    if (map === 'rio') return RIO_SUPPLY_CRATES;
    return map === 'shanghai' && phase01 ? SHANGHAI_SUPPLY_CRATES : NO_CRATES;
}
