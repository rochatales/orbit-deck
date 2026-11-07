import type { Session } from './session';
/** A pausa deve devolver o controle ao diálogo antes que Escape possa fechá-lo. */
export function sessionEscape(phase: Session['phase'], paused: boolean, panel: string | null) {
    if (phase === 'travelling') return null;
    if (paused) return 'resume';
    if (phase === 'aboard') return 'exit';
    if (panel === 'eden' || panel === 'engineer' || panel === 'deposit') return 'close-dialogue';
    return phase === 'walking' ? 'pause' : null;
}
