# Confirmação da revisão técnica

Confirmei os seis achados contra `64e4f15`: todos estão corrigidos. Não encontrei problema real restante.

Foi tudo só leitura de arquivos e imagens. Não rodei shell, `npm test`, Blender nem conferência de SHA-256, e não editei nada.

| # | Achado | Situação em HEAD |
|---|---|---|
| 1 | `Upper_Shutter` acima do teto | **Corrigido.** Em repouso, a folha vai de Z 3,20 a 4,30 e fica abaixo de `Front_Upper` (4,35) e do topo de `Roof_Spine` (≈4,31) (`art-source/hangar/scripts/build_hangar.py:146`). Fechada, a base desce a ≈2,37 m e encontra o topo da rampa em pé (≈2,36 m). Nos renders `01_front.png`, `wf_01_front.png` e `anim_RampOpenClose_020.png` não há folha saindo pelo telhado e o fechamento fica contínuo. |
| 2 | Salto de referencial nos tubos | **Corrigido.** O `pipe()` agora carrega o mesmo referencial de um anel para o outro, em vez de recalculá-lo a cada ponto (`build_hangar.py:66`). Nenhum trajeto faz curva de 180°, então não sobra caso degenerado. `02_side.png` e as vistas 3/4 mostram os tubos sem torção. |
| 3 | Idle girando pelo eixo vertical | **Corrigido.** Gancho e cabo balançam no mesmo ângulo, em torno do eixo X, com pivô no topo do cabo (Z 2,70) (`build_hangar.py:225-228`). O cabo continua preso ao gancho. |
| 4 | Roundtrip num sentido só e sem assert de Z | **Corrigido.** A comparação usa duas buscas por vizinho mais próximo, uma em cada sentido, e falha se o erro passar de 0,2 mm ou se algum vértice ficar abaixo de Z −0,2 mm (`validate_hangar.py:34-43`). O relatório mostra 16+13+11+10 = 50 poses, erro máximo de 1,5 µm e Z mínimo ≈ 0. Pelo carimbo de tempo no índice do git, `roundtrip_report.json` foi gerado depois da última exportação do GLB. |
| 5 | Testes sem imagens embutidas, modo da primitive, ossos extras e clipes distintos | **Corrigido.** `tests/hangar-asset.test.mjs` agora confere: modo `TRIANGLES` (`:22`), quatro PNG 2048² dentro do GLB (`:50-57`), os 11 ossos incluindo `Portal_Shutter` e `Cable_L/R` (`:43`) e quatro clipes diferentes entre si, com movimento e duração corretos (`:32-39`). |
| 6 | Folga entre `Floor` e `Ramp` | **Corrigido.** Na geometria e nos colisores propostos, o piso termina em y = −3,22 e a rampa começa exatamente ali, no mesmo topo Z 0,16. Um teste novo cobre isso (`hangar-asset.test.mjs:65-71`). |

Ponto só de documentação: a linha 17 de `docs/handoffs/s6.12-hangar-mars.md` ainda diz "Confirmação após correções: pendente". Cabe ao Codex ou a você atualizar com este resultado. Eu não alterei.

O aceite visual dos renders e a conferência das animações no Blender continuam com você.
