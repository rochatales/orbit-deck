# Parada solicitada pelo autor — tamanho/investida da aranha

26/10/2026. Base de investigação `1ade722`, após docs S2.11 `7b5f6e0`, efeitos `ee3ddcb` e áudio `1ade722`. Mesma worktree/branch S2.12 B, sem alterar checkout principal ou fontes.

**Itens 1+2 não concluídos: bloqueio dinâmico de navegação.** O pedido determina: “Se algum spawn ou rota necessária falhar, PARE e me mostre antes de reduzir o raio.” Nenhum raio foi reduzido. O ensaio estático passou, mas a rota em grupo falhou na horda 4; interrompemos antes de tentar mudar o desvio/recuperação. O candidato foi preservado integralmente em `candidato-nao-aplicado.patch` e retirado dos arquivos ativos, que retornaram a `1ade722`. O runtime entregue contém os ajustes de efeitos/áudio e ainda conserva a aranha anterior. Não confundir os testes verdes do runtime restaurado com a validação do candidato.

## Medidas e decisão do autor

GLB intacto, SHA-256 `70470d2d125da7d6356f020538b582feb4133214567f0e21765339c970edae8a`, 5.560 triângulos. `measure.mjs` lê o asset de runtime e amostra vértices deformados a 120 Hz nos clipes Idle, PatrolWalk, ChaseRun e AggressiveLunge completos, escala 2,5. Corpo: peso >0,5 em Root, Spine_01/02, Head e Abdomen_01/02; exclui os ossos das patas, pinças e quelíceras, retém a carapaça/chifres ligados ao corpo. Nada da malha entra como colisor.

- Corpo X: **−1,501658…1,558902 m**, meia-largura máxima **1,558902 m**; raio proposto **1,66 m**, margem efetiva **0,101098 m**. Não multiplicação do raio anterior.
- Spacing **3,32 m** (2r); separation **3,62 m** (2r+0,30); contato **2,06 m** (r+0,32+0,08).
- Envelope completo X **−2,254923…2,254601 m**, Z **−3,291880…2,922973 m**, Y bruto **−0,907959…2,919306 m**. O mínimo negativo aparece nos clipes completos; seguindo o contrato dos outros tipos, a faixa de acerto proposta fica **0–2,92 m**. O GLB/animador não foi alterado.
- Proposta de investida: **10 m**, em config; antecipação 0,8 s, velocidade 9 m/s, gatilho 4–9 m e recarga 3 s preservados. Aviso conservador de **5,16 m** de largura: envelope visual de patas ~4,51 m + cápsula do jogador 0,64 m, arredondado. Dano segue o corpo circular; o aviso é deliberadamente um pouco mais largo.
- **Autor decidiu expressamente: manter raio 1,66 m e permitir as vielas.** A hipótese inicial “não passa nas vielas” foi substituída por essa decisão, sem criar bloqueadores. O círculo não cobre todas as patas/corpo comprido: em passagens estreitas a malha pode ultrapassar a área circular. Nenhuma alteração de layout/arte.

## Ensaio estático e falha dinâmica

`navigation.json`: **29.669 nós**, **271/271 candidatos de borda** e **32/32 spawns exportados** com todos os segmentos válidos e fim ≤2,06 m do desembarque. **9/9 vielas** passam. **16/16 trechos das ruas têm caminho válido**; na reta oeste X=−48 há um obstáculo já existente, contornado pela grade (15/16 segmentos diretos). Nenhum ponto de borda inválido foi aceito.

`waves-diagnostic.json` / `blocked-browser.json`: rifle real, passo 1/60, jogador imóvel em (0;9,5), mira técnica e HP restaurado para observar navegação. Hordas 1/2/3 terminam em **48,35 / 97,70 / 161,40 s**. Horda 4 nasce em 167,42 s; o conjunto estaciona em **109/115 baixas**, seis inimigos próximos a **X −0,08…4,39 / Z −44,33…−39,94**. Aos **600 s**, continuam três comuns, dois Patrol grandes e uma aranha vivos, sem invasão de sólidos. Os IDs 25 e 30 acumulam cerca de **359 s parados**. A aranha e parte do grupo oscilam, apesar de os caminhos individuais até o desembarque existirem. Não é apenas orçamento de 360 s curto. A captura `rota-bloqueada.png` mostra esse grupo; câmera reposicionada somente para a evidência.

O outro teste que falhou foi “Horda mista: 90 s válida; neutralizar a primeira linha libera contato dos grandes com ARES-I”: com o novo porte, nenhum Patrol grande alcançou contato nesse cenário. Não relaxamos o critério nem alteramos os testes para ocultar o resultado.

**Menor próximo ajuste proposto:** manter raio 1,66 m e investigar a recuperação/desvio do grupo misto nessa posição, medindo progresso até o destino em vez de apenas passos locais que zeram `stuck`. Repetir os mesmos ensaios de 360/600 s e de contato, sem mover obstáculos/spawns nem aumentar contactRange para mascarar o problema. Não implementado nesta parada.

## Estado do candidato e evidências

- **14/14 testes focados** da aranha passaram: escala/faixa, raio, cinco robôs em área livre deslocados para fora da faixa, sem dano aliado nem sólido; dano no jogador, parede interrompendo, lado próximo/oposto e empurrão limitado por corredor fechado.
- **232/234 no conjunto completo**, com as duas falhas de navegação descritas. Build verde, diff-check verde. Log completo: `tests-candidato.log`.
- O empurrão do candidato ignora aliados na corrida e valida todo o deslocamento perpendicular pelo raio do empurrado. Se nenhum lado cabe por completo, usa o maior deslocamento seguro para não lançar ninguém em prédio; essa limitação está pendente de validação. QA em Shanghai num trecho estreito registrou **2/5** completamente fora da faixa, demais deslocados parcialmente por paredes, todos sem dano e livres de sólidos (`browser.json`). O script conserva a asserção exigindo cinco; a falha não foi apagada. Não há captura de sucesso dessa investida no mapa.
- `aranha-patrol-grande.png`: comparação técnica da escala ×2,5 ao lado do Patrol grande; `aviso-faixa-nova.png`: faixa nova. Não são aprovações do autor.
- Os scripts deste diretório e testes do candidato exigem aplicar o patch sobre `1ade722`. Os relatórios descrevem esse candidato, não o runtime restaurado. Para retomar: `git apply --check docs/handoffs/s3.3-mutante-grande/ajustes-26-10/candidato-nao-aplicado.patch`, depois `git apply` no mesmo caminho, nesta worktree; investigar os bloqueios antes de commitar o código.

## Roteiro pendente do autor

Conferir as capturas e o diagnóstico de parada; após a correção técnica, testar aranha ao lado do Patrol grande, investida de 10 m atravessando um grupo em rua ampla e em rua estreita, obstáculos interrompendo e faixa suficiente para desviar. Itens 1+2 seguem pendentes; nenhum checkbox de aceite alterado.

## Verificação do estado entregue

Após preservar o patch e restaurar somente os sete arquivos próprios do candidato: `npm test` **231/231**, `npm run build` verde (aviso de chunk grande já existente), `git diff --check` verde. `git apply --check` confirma que o patch pode ser reaplicado. As capturas e JSONs deste diretório continuam identificados como evidências do candidato pendente. Sem push, merge, remoção de worktrees ou alteração das fontes.
