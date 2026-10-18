/** Ativação explícita enquanto spawns/patrulha da S2.4 aguardam integração. */
export function isShanghaiPhase01() {
    return typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('shanghaiFase01');
}
