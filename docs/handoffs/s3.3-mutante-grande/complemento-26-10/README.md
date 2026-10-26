# Complemento 5–8 — 26/10/2026

Branch/worktree: `rochatales/s2.12-b`, base `72b5b00` (recuperação da retomada).
Itens 5–7: **`5ee7aa7`**. Item 8: commit seguinte, sem reescrever a recuperação.
Fontes e checkout principal preservados; nenhuma adoção de interpolação.

## Efeitos e vida (5–7)

Traçador: raio **0,056**, halo **0,095**, vida **0,12 s**; brilho/cores/clarão
preservados. Metal/orgânico: **40** elementos, **4–7 m/s**, **0,35–0,5 s**,
hemisfério voltado ao atirador e alcance horizontal limitado a **1,5–2,5 m**.
Metal alongado pela velocidade, até 1–2 quiques; gotas orgânicas maiores,
até um quique menos energético. Consulta do piso pela grade O(1), com margem
para a extensão visual da partícula. Poeira continua com seu tratamento anterior.

Pool numérico **256**; pausa congela e reinício limpa. Aranha **280 HP / 12
acertos**, munição mínima das hordas 3/4 **194/297**, composição inalterada.
Detalhes e testes no [handoff dos efeitos](../../s3.10-efeitos.md).

`perf-before.json` / `perf-after.json` / `perf-comparison.json`: produção,
40 robôs + 4 aranhas ativos, tiro contínuo real, duas amostras de 10 s por
configuração, aquecimento de 60 s simulados, Chromium ANGLE Metal 1440×1000 DPR1.
HP/munição restaurados para manter o pico. Pico **42/128 → 119/256** partículas;
p95 rAF **16,7/16,7 → 16,8/16,7 ms**, nenhum >33 ms; draw máximo **172** nos
dois casos, triângulos máximos **592.349 → 593.773** (+1.424, ~0,24%). Heap
quantizado igual, **27,6 MB**. São intervalos de quadro/renderer.info, não tempo
de GPU nem garantia de custo nulo em outros equipamentos. JSONs conservam
metadados, amostras e limitações. `perf-sfx.mjs` usa uma cópia de produção com
a fixture isolada incluída como entrada adicional; não expõe QA no build normal.

Repetição com o **item 8 também aplicado**, `perf-final.json`: 120 disparos,
44 ameaças mantidas, pico **120/256**, p95 **16,7/16,8 ms**, nenhum intervalo
>33 ms e zero erros; draw máximo **172**, triângulos **593.849** (+1.500 sobre
o baseline, ~0,25%). Mesmas duas janelas de 10 s, build de produção e método.
Comparação mantém separados o custo dos efeitos e a repetição da entrega final.

## Reprodução e correção da caminhada (8)

`motion-before.csv` / `motion-after.csv` registram **720 quadros por tipo**, a
60 Hz: posição, rumo físico/visual, velocidade física/visual e clipe. Cenário:
posição antiga do bloqueio (1,5333; −44,2953), jogador fixo em (0;9,5), nove
robôs ao redor (7 comuns/2 grandes); repete com cada tipo no centro. Sem tiro,
investida desabilitada para isolar marcha. GLBs e `PatrolUnitRig` reais.

| Tipo central | Trocas antes / depois | Menor intervalo antes | Giro visual máximo antes / depois, por quadro |
|---|---|---|---|
| Aranha | 13 / 1 | 0,083 s | 8,594° / 2,292° |
| Patrol grande | 13 / 1 | 0,117 s | 8,594° / 2,292° |
| Comum | 13 / 1 | 0,083 s | 8,594° / 2,292° |
| Animal pequeno | 11 / 1 | 0,033 s | 8,594° / 2,292° |

Depois, a única troca é a entrada inicial em locomoção, não uma alternância
Idle/andar. O problema estava em dois pontos: passos bloqueados voltavam o corpo
ao alvo enquanto passos válidos o viravam para o desvio; a velocidade quase
instantânea fazia o rig alternar clipes. Não era defeito do GLB.

- Rumo de animação independente (`visualAngle`): amortecimento 5 s⁻¹, limite
  **2,4 rad/s** (≤**2,3° por quadro a 60 Hz**), zona morta 0,025 rad. Percepção,
  colisão, aviso, direção de investida e tiro continuam lendo a física.
- Velocidade visual: filtro 6 s⁻¹. Locomoção só troca a cada **≥1 s**, Idle exige
  **0,3 s** de parada confirmada; abaixo de 0,08 m/s congela a cadência do clipe
  retido para não marchar no lugar. Ataque/morte continuam imediatos.
- Desvio físico mantém o lado por **0,25 s** quando há ≥2 vizinhos próximos e
  ainda está na marcha por rota (>9 m do jogador). Se um aliado fecha o passo,
  tenta abrir o arco do mesmo lado. Parede/jogador invalidam o compromisso na
  hora; cruzamento de dois atores e aproximação final não ganham espera.
  Repath de recuperação, cessão e empurrão também liberam a escolha anterior.
  Isso conserva os testes antigos de separação e contato, sem mudar raios.
- Passo bloqueado preserva o rumo anterior. Estado numérico por inimigo/rig,
  sem objetos novos por quadro; filtros/cadência/rumo reiniciam no respawn.

O teste de grupo exige entrada em locomoção, limite de giro, nenhuma troca
subsequente em menos de 1 s e zero invasões de sólido. Testes adicionais cobrem
30/60/144 Hz, pausa, parada sustentada, ataque/morte imediatos e respawn sem
velocidade de teleporte. O limite vale para rumo visual por tempo, não para
girar a física mais devagar ou alterar os contratos de percepção.

## Ensaios completos com 280 HP e o novo desvio

Mesmos critérios: 115/115, limite de 360 s, nenhum imóvel ou sem progresso por
10 s, zero invasões. HP do jogador restaurado, rifle/cadência reais.

| Jogador | Tempo | Maior imóvel | Maior sem progresso | A repath | B pedidos / recuos | C passagem |
|---|---|---|---|---|---|---|
| Desembarque (0;9,5) | 226,00 s | 1,867 s | 4,917 s | 13 | 4 / 3 | 4 |
| Rua norte (0;−41) | 249,32 s | 0,817 s | 5,917 s | 23 | 8 / 4 | 6 |
| Parede (9,60;−5) | 225,35 s | 0,817 s | 4,567 s | 8 | 3 / 2 | 3 |

`ensaios.json` inclui contadores por horda. Patrulha 32/90 s: 16 visitantes em
cada canto, zero imóvel/invasões; ARES-I/90 s: dois grandes a 2,4901/2,4832 m
após remover comuns aos 45 s, critério original ≤2,55 m. Investida ampla/estreita
e parede mantêm suas regressões, sem exigir saída lateral impossível.

## Reprodução técnica

Na raiz desta worktree:

```sh
node docs/handoffs/s3.3-mutante-grande/complemento-26-10/motion-trial.mjs after
node docs/handoffs/s3.3-mutante-grande/complemento-26-10/ensaios.mjs
npm test
npm run build
git diff --check
```

Para o baseline sem alterar worktrees: exportar `src` de `72b5b00` para uma
pasta temporária com `git archive`, fornecer essa pasta como terceiro argumento
de `motion-trial.mjs before <pasta>`. Assets/leitores usados são os mesmos da
worktree; a alteração de HP posterior não interfere no ensaio sem tiro.

QA do navegador: `qa-motion.mjs` usa `HORDA_QA_PACKAGE` (package.json do
playwright-core disponível) e `HORDA_QA_CHROMIUM` (executável), com Vite em
127.0.0.1:5196. `browser-motion.json` mede o grupo renderizado por seis segundos;
captura `marcha-grupo.png`. A fixture preserva os slots de pool de cada tipo.
`browser-shot.json` / `tracador-056-ricochete.png`: disparo real de segmento longo,
40 partículas metálicas e acerto sem matar, congelados só para captura. Capturas
da escala ×2,5 e investida entre aliados permanecem em `../retomada-26-10/`.

Revisão Claude e aprovação visual/jogabilidade do autor pendentes. Roteiro no
handoff principal e em `docs/sprint-2/VALIDACAO_MANUAL.md`. Sem push/merge.

Checks finais: **251/251**, build e diff-check verdes (aviso de chunk >500 kB
preexistente). Durante o trabalho os links de dependências para outra worktree
deixaram de resolver; somente os links gerados desta worktree foram apontados
para uma instalação local em `/tmp/exoden-s2-12-b-local/node_modules`, feita
com o lockfile congelado. Nenhuma mudança de versão ou de lockfile, nem reparo
no outro checkout. Se essa pasta temporária for limpa, reinstalar dependências
pelo lockfile antes de executar os scripts.
