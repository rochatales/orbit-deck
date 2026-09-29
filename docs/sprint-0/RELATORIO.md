# Sprint 0 — Preservação e baseline

Data: 28/09/2026. Execução técnica registrada; baseline manual de movimento/EDEN e FPS permanece parcial.

## Entregas concluídas

- Branch criada: `rochatales/horda-survivor`, a partir de `main`.
- Commit de referência: `99ab0d71ee1a84b046b2021de327f155829b4628`.
- Nenhuma alteração em fontes de gameplay, assets originais, dependências ou lockfiles.
- Snapshot local fora do repositório: `/Users/rochatales/Automations/game-workplace-backups/sprint-0-20260928-205149`.
- Histórico preservado em `repository.bundle`; `git bundle verify` passou.
- 96 arquivos não rastreados preservados em `untracked.tar.gz`, total original de 200,621,419 bytes; cada conteúdo foi relido do arquivo compactado e comparado por SHA-256 ao original.
- Patches staged/unstaged preservados e vazios no início. Os dois documentos de planejamento fazem parte do backup de arquivos não rastreados.
- [Inventário](assets-inventory.csv): 132 assets, com caminho, tamanho, SHA-256 e categoria. Fontes/iterações continuam em seus caminhos atuais.
- Instruções de recuperação: `/Users/rochatales/Automations/game-workplace-backups/sprint-0-20260928-205149/RESTORE.md`. Recuperar sempre em pasta nova.

O snapshot é local, no mesmo computador; não oferece redundância contra perda do disco. Arquivos ignorados (.env, node_modules, dist, logs e .DS_Store) não integram o backup e permanecem no checkout. Não houve exposição de credenciais nem envio a serviço externo.

## Compilação

- `npm run build`: passou. Vite 4.5.14; etapa Vite reportou 6,82 s. Esse tempo não mede carregamento no navegador.
- `npm run typecheck` em `server/`: passou.
- Log completo do frontend preservado no backup como `frontend-build.log`.
- Avisos: diretivas `use client` do Framer Motion ignoradas e chunk acima de 500 kB.
- JavaScript principal: 3.605,14 kB minificado / 1.216,61 kB gzip.
- GLBs emitidos: EDEN 20.737,33 kB; designer 21.287,02; editorial 22.511,30; social-media 22.597,26; player 30.684,38; narration 30.738,13. Total aproximado: 148,56 MB decimais.

## Ambiente de referência

- MacBook Pro Mac14,9; Apple M2 Pro; 16 GB; macOS 26.5.1 (25F80).
- Tela física reportada pelo sistema: 3024 × 1964 Retina.
- Navegador: Codex In-app Browser; versão exata do motor não coletada.
- Canvas observado via DOM: 832 × 640 CSS pixels, buffer 1664 × 1280. A viewport do painel pode variar com o layout do aplicativo.
- Node v24.15.0; npm 11.12.1.
- Teste de interface em servidor Vite de desenvolvimento, origem isolada `http://127.0.0.1:5178/`, perfil local de teste “Sprint Zero”. Não usar essas observações como benchmark do build de produção.
- Não foi iniciado backend para esse teste; operações de cadastro/serviços externos não foram executadas.

## Sessão de interface observada

| Verificação | Evidência | Resultado |
| --- | --- | --- |
| Entrada | Nome de teste → mapa orbital → ENTRAR por teclado → escritório | Passou |
| Carregamento visual | Canvas renderizou salas, personagem/NPCs e HUD | Passou |
| Painel de controles | Abriu e mostrou WASD/setas, SHIFT, E, Q/R e zoom | Passou |
| Câmera | Scroll alterou o enquadramento/zoom visivelmente | Zoom observado; rotação contínua não aferida |
| Interação E | Fora de alcance, apresentou “Nenhum MCP por perto” | Resposta de input observada |
| Pausa | Botão alternou para “Retomar experiência” | Estado de UI observado; congelamento de toda simulação não aferido |
| Movimento até EDEN | Tentativas com pulsos de teclas não permitiram confirmar trajeto/colisão nem chegada ao NPC | Pendente de sessão manual com tecla sustentada |
| Diálogo de EDEN | NPC aparece no cenário; conversa não alcançada no teste | Pendente |
| FPS/frame time | API de inspeção utilizada não forneceu instrumentação de runtime | Não medido; sem afirmação de 60 FPS |

Cliques iniciais não avançaram imediatamente; entrada via teclado funcionou. Não há evidência suficiente para atribuir isso ao código em vez da automação/coordenadas do painel. O fluxo de login não foi classificado como bug confirmado.

Console inspecionado apresentou avisos de GLBs com mesh único, sem rig adequado para animar braços/mãos. Isso é um ponto de atenção para arte posterior, não falha fatal de carregamento. A HUD atual cobre parte significativa do mapa na viewport observada; simplificação está prevista no desacoplamento.

![Baseline do escritório](baseline-office.png)

## Roteiro para completar baseline e repetir após a refatoração

1. Abrir a versão de referência com backend desligado; configurar perfil local e entrar no escritório.
2. Sustentar WASD/setas em todas as direções; testar SHIFT, portas e colisões com móveis. Registrar se há travamento ou passagem através de objetos.
3. Testar zoom e rotação Q/R; identificar EDEN ao norte e caminhar até a área de interação.
4. Pressionar E, observar ativação/tela de EDEN e fechar com ESC, sem cadastrar cliente ou enviar dados.
5. Testar pausa e retomada durante movimento; alternar foco da janela e conferir que teclas não ficam presas.
6. Registrar navegador/viewport e medir pelo menos 30 segundos em repouso e 30 segundos em movimento com ferramenta de performance apropriada; guardar frame time mediano/p95 e duração de carregamento em condições explicitadas.
7. Repetir o ciclo após as mudanças; comparar especialmente movimento, câmera e navegação do hub.

Este roteiro está documentado, mas os itens pendentes não foram marcados como aprovados pelo autor.

## Defaults preparados para o protótipo

Manter os defaults do plano: desktop/teclado+mouse, câmera atual, tiro manual, inventários separados, três ondas, minas/barreiras, extração física pela nave e máquina em posição predefinida. São parâmetros iniciais de teste, não balanceamento validado.

Conflito identificado: **R atualmente gira a câmera e está proposto para recarga**. No sprint 2, remapear rotação (proposta Q/C) e atualizar instruções/handlers conjuntamente antes de implementar recarga. E/contextos de interação e Escape/cancelamento/pausa também precisam de prioridade explícita.

## Situação dos critérios de Sprint 0

- [x] S0.1 Referência Git e branch.
- [x] S0.2 Backup dos não rastreados verificado por hash.
- [x] S0.3 Inventário e separação conceitual fonte/exportação, sem movimentos.
- [ ] S0.4 Parcial: build, ambiente, entrada, mapa e zoom registrados; movimento contínuo, diálogo de EDEN e medição de frames ainda não validados.
- [x] S0.5 Roteiro e defaults documentados; validação humana da sensação de jogo continua no playtest.

A preparação para a refatoração está preservada e documentada. O Sprint 0 não deve ser tratado como baseline de gameplay integralmente aprovado até completar S0.4.
