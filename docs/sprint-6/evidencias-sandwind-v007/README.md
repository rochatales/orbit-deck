# Evidências Sandwind v007 — produção

Capturas finais `praca-*.png` e `deck-*.png`: três perfis, zoom afastado, câmera π/4, viewport 1280 × 720, DPR 2 / renderer 1,5. Poses por fixture explícita `?sandwindPreview&perf&sandwindQA`; não substituem teste de caminhada pelo autor. A fixture só altera spawn/revisão transitórios em Marte caminhando, sem gravar save.

Comparação final: `perf-sem-flag.txt` + `sem-flag.png` (snapshot do painel após amostra válida; clipboard IAB indisponível), `perf-final-areia-sem-descarte.json`, `perf-final-areia-com-descarte.json` (última amostra de cada JSON). Todos em produção, praça inicial, viewport 1280 × 720 e renderer 1,5. Perfil Compacto nos dois cenários com areia. Baseline sem flag e sem fixture; câmera padrão da inicialização, sem movimento.

| Cenário | rAF p50 / p95 | >33 / >50 ms | Draw / triângulos |
|---|---|---|---|
| Sem flag | 8,3 / 9,1 ms | 0 / 0 | 578 / 660.621 |
| Areia sem descarte | 8,3 / 9,2 ms | 0 / 0 | 578 / 660.621 |
| Areia com descarte | 8,3 / 9,2 ms | 0 / 0 | 578 / 660.621 |

Nesta pose, os 42 grupos descartados (840 triângulos de inventário) já estavam fora do frustum: nenhum ganho de draw medido. rAF não mede custo exclusivo de GPU e este ensaio não demonstra escalabilidade do Builder.

Viagens reais pelos botões da cabine: Marte → Shanghai → Marte, três vezes, sem recarregar página. `viagem-0..3-marte.json`: recursos próprios sempre 1 controlador / 45 clones / 136 patches. Programas 31 → 27 → 27 → 26; sem crescimento acumulativo. O último registro é após desembarque; os anteriores a bordo. Contagens do renderer não são contagem global de materiais. Os testes verificam três ciclos com callbacks/referências restaurados e recursos próprios zerados a cada dispose. Shanghai sem painel/shader; captura `shanghai-sem-sandwind.png`. Console sem erros/avisos nas viagens.

`intermediarias/`: tentativas anteriores preservadas para rastreabilidade. Não usar em comparação final: poses/zoom/refresh diferentes; snapshots txt podem preceder PNGs refeitos. O JSON sem flag vazio é tentativa de clipboard sem conteúdo, não um relatório válido.
