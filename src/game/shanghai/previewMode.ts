/**
 * Shanghai fase 01 (S6.3) é o mapa padrão desde a integração de 18/10/2026, com
 * a horda da S2.4 nos spawns e patrulhas do mapa novo. `?shanghaiAtual` volta ao
 * blockout anterior só para comparação. Fora do navegador (testes em Node) vale
 * o blockout anterior, que os testes antigos usam como referência.
 */
export function isShanghaiPhase01() {
    return typeof window !== 'undefined' && !new URLSearchParams(window.location.search).has('shanghaiAtual');
}
