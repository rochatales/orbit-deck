> Nota da consolidação de 19/10/2026: registro no quadro regularizado na Fase 3.
> O conteúdo abaixo é o handoff histórico da worktree de arte; suas referências a
> “não registrada”/“sem integração” descrevem a entrega original. As variantes
> v004/v005 continuam como estudos, sem incorporação; a B3 escolhida foi integrada
> pela S6.12 em 18/10, e sua fonte final foi versionada na Fase 2 (`989b81f`).
> Originais, estudos e renders preservados nos snapshots do manifesto
> [fontes de arte](../consolidacao/fontes-arte-2026-10-19.json). Nenhum aceite novo.

# Handoff — Arte · Estudo da plataforma de lançamento v004

| Campo | Valor |
|---|---|
| Base | `7f2e60b36fb4ab95d07133b425cb25a11ea99a81` (`rochatales/horda-survivor`) |
| Branch / worktree | `claude/arte-plataforma-lancamento` · `.claude/worktrees/arte-plataforma-lancamento` |
| Implementa | Claude |
| Revisa | Autor (revisão visual) |
| Plano | Relacionado a S6.12/S6.13; não marca nenhum item |
| Estado | ◐ Estudo entregue; aguarda avaliação do autor. Sem commit, sem integração |

## Registro no quadro (pendente)

O hook da sessão bloqueia edição no checkout principal, onde fica o quadro da
branch de integração. Por isso a tarefa **não foi registrada** em
`docs/SPRINT_STATUS.md`.

Linha proposta para o autor colar na tabela "Tarefas":

```
| Arte · Estudo da plataforma de lançamento v004 (ref. S6.12/S6.13) | `7f2e60b36fb4ab95d07133b425cb25a11ea99a81` (`rochatales/horda-survivor`) | `claude/arte-plataforma-lancamento` | `art-source/mars-colony-plataforma/**`, `docs/handoffs/arte-plataforma-lancamento.md` | Claude | Autor | ◐ Estudo entregue; aguarda avaliação; sem integração |
```

Log proposto:

```
- 30/09/2026 · claude · estudo de arte da plataforma de lançamento (v004, variantes A central e B deslocada) em worktree própria a partir de `7f2e60b`. Sem alteração de `src/`, colisores do piloto ou GLB ativo. [Handoff](./handoffs/arte-plataforma-lancamento.md).
```

## O que mudou

Só arquivos novos, todos em `art-source/mars-colony-plataforma/` e neste
handoff. O resumo, as medidas, as contagens, a oclusão e as decisões estão em
`art-source/mars-colony-plataforma/NOTAS_ESTUDO_v004_PLATAFORMA.md`.

## Verificação

**Feito pelo agente**

- **Testes e build:** não foram rodados `npm test` nem `npm run build`; não
  há mudança de código. `git status` mostra só `art-source/` e este handoff
  como novos.
- **Preservação:** MD5 da v001–v003, dos backups e dos GLBs inalterados (início
  × fim).
- **Passagem:** raio de 0,36 m, comparando os colisores candidatos com as
  propostas de cada variante.
- **Oclusão:** 8 rotações da câmera real, no zoom inicial.

**Roteiro para o autor**

1. Abrir o `.blend` e alternar as camadas `Plataforma_A` e `Plataforma_B`.
2. Comparar `renders/jogo_8_rotacoes_A.png` com `renders/jogo_8_rotacoes_B.png`.
3. Ver `renders/comparacao_entrada_v003_A_B.png` e
   `renders/comparacao_planta_A_B.png`.
4. Decidir a variante e se as propostas `COL_NOVO_PLAT_*` entram (veja a
   nota).

## Pendências

- Registrar a tarefa no quadro (linha acima).
- Commit dos arquivos da tarefa, quando o autor pedir.
- Avaliação visual e de jogabilidade: não aprovadas.

## Desvio do fluxo

O `AI_WORKFLOW.md` §1.5 pede consolidar o trabalho corrente num commit antes
de abrir uma worktree nova.

O estudo v001–v003 continua **não commitado** na worktree
`mars-colony-base-map-9ce462`, porque o autor pediu "não commite" naquela
tarefa. A worktree nova não toca esses arquivos: a v003 é lida por caminho
absoluto.

Fica para o autor decidir se esse estudo deve ser consolidado.

---

## v005 · refinamento da variante B ("B2") — 30/09/2026

O autor escolheu a variante B para refinamento visual, ainda sem integração. A
nota completa está em
`art-source/mars-colony-plataforma/NOTAS_ESTUDO_v005_B_REFINADA.md`.

**O que mudou**

Tudo são arquivos novos em `art-source/mars-colony-plataforma/`:

- o `.blend` `blend/mars_colony_estudo_v005_plataforma_B2.blend`;
- os scripts `*_v005*.py` e `otimizar_b2.py`;
- os resultados em `renders/v005/` e `notas/*v005*.json`.

A v004 e os estudos anteriores não foram alterados.

Ficaram iguais:

- pisos;
- colisores ativos;
- `INTERACT_Nave` (0; 33);
- desembarque e embarque.

Os colisores `COL_NOVO_PLAT_B2_*` continuam como propostas.

**Verificado pelo agente**

- **Oclusão parada no desembarque, 8 orientações:**
  - jogador, baia, jogador em (0; 33) e passagem: 0% ocultos pela plataforma;
  - faixa sul: no pior caso 50% (S), contra 58% na B.
- **Sequência de 204 quadros, da eclusa até o embarque e de volta:** nenhum
  quadro com o jogador oculto pela plataforma nas 8 orientações. Na B eram 19.
- **Varredura de 5 em 5°:** restam 6 de 72 giros, entre 100° e 125°, fora das
  8 orientações.
- **Passagem, raio 0,36 m:** perda de 0 m² com as propostas; todos os alvos
  alcançáveis.
- **Totem:** a peça visual agora fica dentro do colisor do fundo, sem os 3 cm
  de avanço.
- **Testes e build:** `npm test` e `npm run build` não foram rodados, porque
  não há mudança de código.

**Roteiro para o autor**

1. `renders/v005/comparacao_B_atual_x_B_refinada.png`
2. `renders/v005/jogo_8_rotacoes_B2_desembarque.png`
3. `renders/v005/sequencia_acesso_B2.mp4` e
   `renders/v005/sequencia_mapa_ocultacao_B_x_B2.png`
4. `renders/v005/conexao_baia_rampa_foguete_B2.png`. Nela, âmbar marca o que
   é jogável e ciano o que é cenográfico.
5. No `.blend`, a camada `Plataforma_B2`.

**Pendências (nenhuma está resolvida)**

- **Quadro:** a tarefa segue **não registrada** em `docs/SPRINT_STATUS.md`. A
  linha proposta está acima; para a v005, o status passaria a "◐ B refinada
  (v005) entregue; aguarda avaliação; sem integração".
- **Base:** a v001–v003 segue **não commitada** na worktree
  `mars-colony-base-map-9ce462` (veja "Desvio do fluxo"). A v004 e a v005
  também estão sem commit nesta branch.
- **Ordem:** a regularização do quadro e da base tem de acontecer **antes de
  qualquer integração**.
- **Exportação:** não houve GLB da B2.
- **Aprovação:** avaliação visual e de jogabilidade pendentes, do autor.

---

## v006 · B3 — rotação contínua, braço, cenário e GLB de prévia (30/09/2026)

O autor manteve a v005 como base e pediu ajustes antes de exportar. A nota
completa está em `art-source/mars-colony-plataforma/NOTAS_ESTUDO_v006_B3.md`.
A prova de exportação está em
`art-source/mars-colony-plataforma/export/previa_v006_B3/NOTA_PROVA_EXPORTACAO_v006.md`.

**Decisão do autor nesta rodada:** deslocar o conjunto 6 m para oeste,
centro em (−10; 41,5), com o foguete reduzido para cerca de 9,8 m (topo a
10,1 m). A escolha foi feita entre quatro opções medidas.

**O que mudou** (só arquivos novos; v001–v005 preservadas)

- `.blend` v006: `blend/mars_colony_estudo_v006_plataforma_B3.blend`.
- Scripts `*_v006.py`.
- Renders em `renders/v006/`.
- Medições em `notas/*v006*.json` e `notas/rotacao_v005_B2.json`.
- GLB de prévia, manifesto e propostas em `export/previa_v006_B3/`.

**O que ficou igual:** pisos, colisores ativos, `INTERACT_Nave` e embarque.

**Verificado pelo agente**

- **Código do jogo (só leitura):** a câmera gira livre, a 100°/s, sem encaixe.
  A bordo, o ângulo congela no do embarque.
- **v005:** o jogador fica oculto entre 98° e 128° no desembarque, na baia e
  no elevador. São 0,42 s girando de SE a O e de volta; a bordo, o tempo todo.
- **v006:**
  - 0° de ocultação em 360° (passo de 1°) no acesso, na baia e no elevador;
  - 0 s na sequência de giro;
  - nenhum ângulo de embarque deixa o jogador oculto.
- **Deck alcançável:** 172 de 684 pontos com o corpo majoritariamente oculto
  em algum ângulo; na v005, 620. Na faixa sul são 99 de 185, com até 54° de
  giro. Isso afeta só piso livre: o anel do elevador e a placa da coluna não
  ficam ocultos.
- **Passagem, raio 0,36 m:** perda de 0 m² com as propostas e 0 m² de
  geometria visível sem colisor.
- **GLB:**
  - nenhuma diferença em relação ao manifesto, com 30 IDs únicos;
  - pivôs e caixas com diferença de até 0,05 mm, escala 1;
  - normais com desvio de até 0,03°;
  - 18.742 triângulos dos dois lados;
  - materiais iguais;
  - renders com diferença média de 0,05 em 255.
- **Testes e build:** `npm test` e `npm run build` não foram rodados, porque
  não há mudança de código. `git diff --check` passou.

**Achado para a integração (não resolvido)**

A câmera do jogo fica a 22,8 m do alvo, com near de 0,1, e corta peças altas
que ficam atrás dela. Isso afeta 5% dos pares ponto × ângulo na v006 e 11,5%
na v005.

A correção é no runtime (`CameraRig.tsx`): recuar a câmera na mesma direção
ou usar near negativo. Precisa de uma tarefa de código própria; não foi
feita aqui.

**Roteiro para o autor**

1. `renders/v006/comparacao_v005_x_v006.png`
2. `renders/v006/elevador_a_bordo_v005_x_v006.png`
3. `renders/v006/giro_camera_v005_x_v006.mp4`
4. `renders/v006/rotacao_360_ocultacao_v005_x_v006.png`
5. `renders/v006/deck_alcancavel_ocultacao_v005_x_v006.png`
6. `renders/v006/silhuetas_v005_x_v006.png`
7. `renders/v006/braco_tripulacao_v005_x_v006.png`
8. `renders/v006/conexao_baia_elevador_foguete_B3_analise.png`. Âmbar e ciano
   aparecem só aqui.
9. `renders/v006/diagnostico_corte_near_camera.png`
10. No `.blend`, a camada `Plataforma_B3`.

**Pendências (nenhuma está resolvida)**

- **Quadro:** a tarefa segue **não registrada** em `docs/SPRINT_STATUS.md`.
  Status proposto: "◐ B3 (v006) e GLB de prévia entregues; aguarda avaliação;
  sem integração".
- **Base:**
  - a v001–v003 segue **não commitada** na worktree
    `mars-colony-base-map-9ce462`;
  - a v004–v006 segue sem commit nesta branch.
  - O desvio do fluxo continua o mesmo.
- **Ordem:** a regularização do quadro e da base tem de vir **antes de
  qualquer integração**. Não houve integração nem merge.
- **Runtime:**
  - correção do corte pelo plano near;
  - decisão sobre as propostas `COL_NOVO_PLAT_B3_*`.
- **Anel âmbar do piso do piloto:** continua. Os pisos não foram alterados, e
  isso é decisão do autor.
- **Aprovação:** avaliação visual e de jogabilidade, pendentes.
