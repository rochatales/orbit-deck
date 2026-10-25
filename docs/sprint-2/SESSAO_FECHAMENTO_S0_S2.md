# Sessão única do autor — fechamento das Sprints 0 e 2

**Kit pronto — Parada 1 (24/10/2026).** ARES-I integrada em `fcdb34e`; consoles e rack do deck ajustados a pedido do autor após `0c56448`.
O autor resolveu o portão do ensaio após `c92ed79`: caminho válido até contato
≤1,20 m, preservando raio 0,80 m, desembarque e colisores. A sessão usa o build
da **worktree de fechamento**, porta 4173. [Decisão e reensaio](../handoffs/s2.12-b-proposta.md#decisão-de-contato-após-ares-i--24102026-vigente).

Preparado em 24/10/2026. **Todos os resultados estão pendentes.** Este kit organiza
as Fases 5 e 6 do [plano de consolidação](../consolidacao/PLANO_SPRINTS_0_2.md)
conforme o pedido atual do autor. Não encerra sprints nem libera implementação.

| Referência | Valor |
|---|---|
| Base original do fechamento | `720527d4b06d8325ec97b90214b75fc314fbef65` |
| Runtime da sessão com ARES-I | Merge `fcdb34e23b0127fd749bce1939c46eeae57b9a41`; ARES-I de `a12294f`, aprovada em 22/10. inclui ajuste dos consoles e rack de Marte após `0c56448`; registrar o HEAD real ao executar |
| Branch de fechamento | `rochatales/fechamento-s0-s2` |
| Worktree dos documentos e resultados | `/Users/rochatales/.codex/worktrees/fechamento-s0-s2/game-workplace` |
| Checkout do jogo a testar | `/Users/rochatales/.codex/worktrees/fechamento-s0-s2/game-workplace`, branch `rochatales/fechamento-s0-s2` |
| Ordem | S0.4 → S2.12 A (A1–A13 e decisões) → jogabilidade 6.5 (1 robô, depois hordas) → medições S2.9 |
| Fontes | [Roteiro consolidado](VALIDACAO_MANUAL.md), [S0.4](../sprint-0/RELATORIO.md), [S2.9](../handoffs/s2.9.md), [S2.12 A](../handoffs/s2.12.md), [hordas](../handoffs/s2.4-hordas-crescentes.md), [caixas](../handoffs/s6.13-caixa-suprimentos.md) |

Em cada linha, substituir **pendente** por **passou** ou **falhou** e preencher a
observação (observado × esperado, modo/horda, evidência). Item não executado continua
pendente, com o motivo. Uma falha deve ter passos para reprodução. Resultados técnicos
anteriores e a conferência funcional da Parada 1 de 19/10 não substituem este aceite.

## Preparação da sessão

Os comandos deste bloco são **para o autor**, na worktree de fechamento, para
gerar e servir o build de produção desta branch. O checkout principal não participa
da sessão e mantém as alterações locais do autor. Não trocar branch nem fazer
stash, commit ou limpeza para executar o kit.

```bash
cd /Users/rochatales/.codex/worktrees/fechamento-s0-s2/game-workplace
git branch --show-current
git rev-parse HEAD
git merge-base --is-ancestor fcdb34e23b0127fd749bce1939c46eeae57b9a41 HEAD
npm run build
npm run preview -- --host 127.0.0.1 --port 4173 --strictPort
```

Conferir branch `rochatales/fechamento-s0-s2`, registrar o HEAD e confirmar que o
merge `fcdb34e` é ancestral (comando acima termina com código 0). O build inclui
os dois consoles, rack conectado ao tubo original e um colisor de movimento no Oeste, após a sessão
em `0c56448`. O raio de 0,80 m foi apenas ensaiado; S2.12 B continua sem implementação. Se houver diferença de versão, registrar e
relatar sem reposicionar a worktree. Só iniciar o preview se o build passar. Se a porta
4173 estiver ocupada, o `--strictPort` deve falhar: identificar a instância antes
de continuar, sem encerrar processos desconhecidos ou aceitar porta automática.
O preview fica no terminal até **Ctrl+C**.

Abrir [a prévia com comparação](http://127.0.0.1:4173/?comparar) para os blocos 1–3.
Usar um perfil de navegador de teste para preservar o save habitual. A comparação
usa o Explorador r7 já integrado; a nave e o deck são a ARES-I aprovada em 22/10.
A página normal do jogo é o alvo; fixtures, servidor dev e outra worktree não valem
como build desta sessão. Nenhum backend é necessário.

| Item | Conferência | Resultado | Observação/evidência |
|---|---|---|---|
| Preparação | Branch/SHA anotados, build passou, origem 4173 pertence à worktree de fechamento com ARES-I e página normal aberta | pendente | — |

### Posições da ARES-I para a sessão

Coordenadas **(X; Y; Z)** em metros; para caminhar, usar X/Z e o marcador E na
cena. A posição visual da nave é diferente do ponto de interação/desembarque.

| Mapa / referência | Posição | Conferir |
|---|---|---|
| Marte · centro do deck | (0; 0; 33) | Octógono de 12 × 12 m; acesso plano de X −2…2, Z 25…27,4 conecta o piso da colônia |
| Marte · ARES-I visual | (0,72; 0,012; 33,52) | Mesma nave usada em Shanghai, assentada sobre o deck |
| Marte · E / desembarque | **(0; 0; 29,5)** | Pé da escada, acesso pelo sul da colônia; E abre cabine, E/desembarcar devolve controle |
| Shanghai fase 01 · ARES-I visual | **(0,72; 0,012; 13,52)** | Pouso no asfalto junto ao quarteirão central, rachaduras/fuligem, sem deck metálico |
| Shanghai · E / desembarque / retry | **(0; 0; 9,5)** | Ponto preservado no pé da escada; embarque/desembarque não exige subida física |

[Posições, medidas e capturas dos consoles de Marte](../handoffs/fechamento-s0-s2/consoles-marte/README.md).

O nó (0; 9,0) do ensaio a raio 0,80 m é aproximação para **contato do robô**;
não substitui o desembarque do jogador. Os seis colisores simples da nave e os
pontos oficiais permanecem como integrados. Observar oclusão do jogador pelo
casco ao girar Q/C; a escada bloqueia passagem física e usa E no pé.

### Ambiente e identificação (preencher antes de medir)

| Campo | Registro do autor |
|---|---|
| Data/hora e fuso da sessão | — (America/Sao_Paulo) |
| SHA real / branch / URL / build production | — |
| Diferenças locais relevantes ao runtime, se houver | — |
| Dispositivo/modelo, CPU, GPU, RAM | — |
| Sistema operacional e versão | — |
| Navegador e versão completa | — |
| Tela: resolução física e taxa de atualização (Hz) | — |
| Viewport (px CSS) / canvas CSS / buffer do canvas (px) | — |
| DPR da janela / DPR do renderer | — (painel e `context` do JSON) |
| Zoom do navegador / zoom e orientação da câmera no jogo | — |
| Alimentação (tomada/bateria), modo de energia, outras cargas | — |
| Cache inicial (novo/quente), perfil de teste e extensões | — |
| Tela 120/144 Hz disponível? | —; se não, registrar como limitação, inclusive para a futura S2.11 |
| Pasta exclusiva de evidências | — (caminho definido abaixo) |

Manter resolução, DPR, câmera/zoom, navegador e energia comparáveis nas amostras.
Se for preciso alterar algo, registrar e separar os resultados; não misturar
ambientes numa conclusão. Campo indisponível/null fica indisponível, nunca zero.

### Onde salvar o relato e os JSONs

Em outro terminal, criar uma pasta **nova** na worktree de fechamento. O comando
usa o horário de São Paulo; não criar esses arquivos no checkout principal.

```bash
cd /Users/rochatales/.codex/worktrees/fechamento-s0-s2/game-workplace
HORDA_SESSAO_DIR="$(pwd)/docs/sprint-2/evidencias/fechamento-s0-s2/autor-$(TZ=America/Sao_Paulo date +%Y%m%d-%H%M%S)"
mkdir -p "$HORDA_SESSAO_DIR"
printf '%s\n' "$HORDA_SESSAO_DIR"
```

Anotar o caminho impresso. Salvar nele `ambiente-e-resultados.md` com os campos
acima e os resultados por item; os JSONs são definidos no bloco 4. Não sobrescrever
referências antigas nem remover tentativas inválidas. Se preferir enviar o relato
no chat, usar os mesmos identificadores; o agente registra os arquivos na Etapa 2.

## 1. S0.4 — entrada, controle contínuo e EDEN

Executar primeiro em Marte. As medidas de frames deste bloco são compartilhadas
com M1/M2 do bloco 4, sem exigir outra sessão do autor.

| Item | Ação / resultado esperado | Resultado | Observação/evidência |
|---|---|---|---|
| S0.4 · entrada | Preencher perfil de teste e entrar na colônia de Marte; esperar mapa e personagens carregarem. Anotar falhas de carregamento; tempos entram no JSON A | passou | Relato do autor, 25/10/2026 |
| S0.4 · movimento contínuo | Em rota livre, sustentar W guiando pelo cursor, depois S. W segue a mira; S recua voltado a ela. A/D não deslocam; W+S neutralizam. Conferir quinas, paredes e portas | passou | Relato do autor, 25/10/2026 |
| S0.4 · câmera | Girar Q/C enquanto anda e recua; a mira continua orientando o movimento. Conferir zoom com roda/+/−; R é recarga | passou | Relato do autor, 25/10/2026 |
| S0.4 · EDEN | Ir ao norte, próximo de (0; −10), usar E, ler o briefing, fechar com Esc e voltar a andar. Diálogo deve bloquear movimento/tiro e devolver controle ao fechar | passou | Relato do autor, 25/10/2026 |
| S0.4 · deck ARES-I | Seguir ao sul pela passarela X −2…2, Z 25…27,4 até o deck centrado em (0; 33). Conferir piso, bordas e E em (0; 29,5). Oeste em (−3; 25,9), tela para a chegada: tentar atravessar (deve bloquear) e contornar; não invade passarela/faixas/borda, sem z-fighting. Leste em (6,85; 31,8), folga ≈0,41 m. Rack em (−6,75; 31,6), fileira em X, folga 0,07 m: ponta do tubo entra no primeiro cilindro, tanques grandes imóveis. Leste/rack fora da área caminhável e sem colisores novos; caminho ao embarque livre | passou | Relato do autor, 25/10/2026 |
| S0.4 · embarque Marte | No pé da escada (0; 29,5), E abre a cabine sem decolar automaticamente. Movimento e tiro ficam bloqueados a bordo; escada/casco não são atravessáveis | passou | Relato do autor, 25/10/2026 |
| S0.4 · desembarque Marte | Ainda em Marte, usar E/desembarcar: retornar a (0; 29,5), recuperar movimento e conseguir sair do deck para a colônia sem prender nos volumes da nave | passou | Relato do autor, 25/10/2026 |
| S0.4 · pausa | Fora de diálogo, Esc pausa; esperar, retomar e conferir controle sem avanço acumulado | passou | Relato do autor, 25/10/2026 |
| S0.4 · troca de janela | Com movimento sustentado, trocar de janela e soltar a tecla fora do jogo. Voltar: pausa automática; retomar sem movimento preso. Repetir com tiro em Shanghai no bloco 3, fora das medições | passou | Relato do autor, 25/10/2026 |
| S0.4 · frames | Completar M1 e M2 no bloco 4, 30 s cada, com JSONs válidos e ambiente registrado. São intervalos de rAF, não tempo de GPU | passou (referência técnica) | Medidas disponíveis: `docs/sprint-0/evidencias/796ae3a/perf-referencia.json`, duas amostras válidas de 30 s em Marte, build de produção (Chromium headless, M2 Pro). M1/M2/S40 no equipamento do autor seguem com a S2.9 |

**Aceite expresso S0.4:** **aprovo** (autor, 25/10/2026: "pelos meus testes está tudo ok"). O autor decidiu encerrar a S0.4 com as medidas técnicas disponíveis; M1/M2 no equipamento do autor passam a pertencer só à S2.9.
Observações do autor: navegador e tela não informados. Registro feito pelo Claude a pedido do autor. **S0.4 e Sprint 0 encerradas em 25/10/2026.**

## 2. S2.12 A — A1–A13 e decisões de movimento

Manter a numeração e as expectativas do [roteiro oficial](VALIDACAO_MANUAL.md).
Fazer os casos de Marte antes da viagem; para A9, embarcar, selecionar **1 robô**,
viajar e desembarcar em Shanghai fase 01. Combate começa a pé, não na cabine.
A10/A11 usam `?comparar`; após comparar, voltar ao **Explorador r7**.

| Item | Ação | Esperado | Resultado | Observação/evidência |
|---|---|---|---|---|
| A1 | Correr com W em várias direções, girando o cursor | Corre para onde o cursor aponta; o corpo e o deslocamento giram juntos | passou | Relato do autor, 25/10/2026 ("A1–A13 ok") |
| A2 | S em várias direções | Recua sem girar o corpo; passos curtos para trás | passou | Relato do autor, 25/10/2026 ("A1–A13 ok") |
| A3 | W + S, A, D, Shift | Parado com W + S; A/D/Shift sem efeito no movimento | passou | Relato do autor, 25/10/2026 ("A1–A13 ok") |
| A4 | Alternar W/S rapidamente | Transições curtas entre Run e Backward, sem salto de pose | passou | Relato do autor, 25/10/2026 ("A1–A13 ok") |
| A5 | Cursor sobre o personagem, parado e recuando | Orientação estável | passou | Relato do autor, 25/10/2026 ("A1–A13 ok") |
| A6 | Q/C durante o movimento | A direção segue a mira | passou | Relato do autor, 25/10/2026 ("A1–A13 ok") |
| A7 | Encostar numa parede com W e com S | Personagem para de animar a locomoção; retoma ao sair | passou | Relato do autor, 25/10/2026 ("A1–A13 ok") |
| A8 | Portas, embarque e desembarque, EDEN (E), Esc | Comportamento como antes; bloqueios em menus e diálogos | passou | Relato do autor, 25/10/2026 ("A1–A13 ok") |
| A9 | Shanghai: mirar, atirar e recarregar correndo e recuando | Tiro e recarga como antes | passou | Relato do autor, 25/10/2026 ("A1–A13 ok") |
| A10 | "Comparar com o personagem atual" no selo | Mesmo ponto, câmera e luz; só o visual muda | passou | Relato do autor, 25/10/2026 ("A1–A13 ok") |
| A11 | Materiais da r7 no zoom máximo | Sombreamento suave, visor azul sem escurecimento duplo | passou | Relato do autor, 25/10/2026 ("A1–A13 ok") |
| A12 | Velocidades (4,2 / 1,2 m/s) e deslizamento do Run | Decidir os valores | passou | Relato do autor, 25/10/2026 ("A1–A13 ok"): valores atuais mantidos no piloto r7; ver decisões abaixo |
| A13 | Parado, girar o cursor devagar em volta do personagem, passando pelo norte do mapa (mundo −Z) | O corpo acompanha o cursor sem dar a volta inteira no próprio eixo | passou | Relato do autor, 25/10/2026 ("A1–A13 ok") |

Detalhar A12 abaixo: os valores existentes são pontos de avaliação, sem ajuste
automático. O handoff da parte A registra deslizamento técnico aproximado de 54%
do Run a 4,2 m/s; isso não determina a decisão visual do autor. A variante anterior
não tem Backward e usa Run no recuo; serve só como comparação de visual.

| Decisão vinculada a A12 | Resultado (passou/falhou/pendente) | Decisão/observação do autor |
|---|---|---|
| Corrida W: manter 4,2 m/s ou solicitar outro valor | passou | Mantém 4,2 m/s no piloto (leitura do "A1–A13 ok" de 25/10; o autor pode corrigir) |
| Recuo S: manter 1,2 m/s ou solicitar outro valor | passou | Mantém 1,2 m/s no piloto (mesma leitura) |
| Deslizamento/cadência do Run na câmera real | passou | Aceitável no piloto com o r7. A correção definitiva é a corrida autorada para a velocidade real no Explorador Toy (`docs/sprint-6/ESTUDO_MAIN_PLAYER.md`, 1.2 e 3.4), que o autor já apontou como estranha em 24/10 |

**Aceite A1–A13:** **aprovo** (autor, 25/10/2026: "A1–A13 ok"). Itens com falha: nenhum. Registro feito pelo Claude a pedido do autor.
**Liberação explícita para iniciar S2.12 B:** sim / não / pendente: —.
Se houver falhas em A1–A13, o agente registra, propõe correções e para; não corrige
sem liberação. O aceite de A não marca a S2.12 completa.

## 3. Etapa 6.5 — jogabilidade consolidada

Primeiro em **1 robô**, reiniciando entre os casos de percepção. Robô alertado
continua perseguindo ao perder a visão; considerar o giro da patrulha ao avaliar
as costas. Depois usar **hordas**, mantendo a fase 01 padrão (102 × 108 m).
Não usar `?shanghaiAtual`, fixture ou ganchos de desenvolvimento.

### 3.1 Um robô — aquisição, combate e caixas

| Item | Ação / resultado esperado | Resultado | Observação/evidência |
|---|---|---|---|
| 6.5 · ARES-I pouso Shanghai | Após viajar de Marte, conferir nave em (0,72; 0,012; 13,52), impacto no asfalto e ausência de deck metálico; ruas, prédios e caixas preservados | pendente | — |
| 6.5 · ARES-I desembarque Shanghai | E/desembarcar sai da cabine em (0; 9,5), com controle livre no pé da escada, sem ficar dentro do casco ou iniciar combate a bordo | pendente | — |
| 6.5 · ARES-I embarque Shanghai | Voltar ao marcador E em (0; 9,5), abrir cabine e desembarcar novamente sem viajar: recuperar controle e manter acesso à rua | pendente | — |
| 6.5 · ARES-I contorno | Contornar casco, pods e escada nos dois mapas; volumes bloqueiam sem prender o acesso. Girar Q/C pelos oito lados e variar zoom, registrando quando a nave encobre o jogador | pendente | — |
| 6.5 · visão frontal | Aproximar pela frente com linha livre: cone de 120°, até 10 m. Além do alcance não detecta; parede bloqueia | pendente | — |
| 6.5 · 3 m sem costas | Em tentativas novas, passar a menos de 3 m pela lateral e a 120°: detecta até 135° do rumo. A 160° e diretamente atrás não detecta (ponto cego traseiro de 90°). Parede bloqueia também a percepção curta | pendente | — |
| 6.5 · tiro alerta | Acertar tiro não letal por trás/fora do cone: alerta individual imediato, visor vermelho/exclamação por 1,5 s e perseguição. Em tentativa nova, tiro errado sem entrar no campo de visão não alerta | pendente | — |
| 6.5 · +24% ao avistar | Comparar patrulha (1,65 m/s) e perseguição (2,05 m/s): aceleração gradual e cadência acompanhando. Autor decide se a pressão é adequada | pendente | — |
| 6.5 · Patrol Unit, 1 robô | Avaliar leitura do modelo de 2,67 m, patrulha, perseguição, dano, morte e visibilidade nos giros/zooms. O raio atual 0,42 m ainda é menor que o visual; não avaliar como se B já estivesse implementada | pendente | — |
| 6.5 · rifle e recarga | Clicar/segurar: consumo e feedback; 3 acertos de 25 eliminam 75 HP. R leva ~1,5 s, bloqueia tiro e completa até 24 descontando da reserva; pente vazio não dispara | pendente | — |
| 6.5 · cobertura/navegação | Prédios/paredes com colisor bloqueiam tiro/dano e movimento; robô contorna quinas. Entulho/letreiros visuais não garantem colisão. Depósitos/esconderijos são dados sem colisor | pendente | — |
| 6.5 · peças/corações | Coletar abate: +1 ferro/+1 cobre temporários. Corações (−17,5; 9,5) e (17,5; 9,5) curam até +50, teto 100 HP; não consumir com vida cheia nem coletar através de parede, em pausa ou morto | pendente | — |
| 6.5 · caixas, abertura | Primeira caixa (−10; 12), segunda (36; −22): aproximar pela frente, raio de interação 1,8 m. Abrir uma com E e outra pelo botão; abertura de 2,4 s e revelação azul legíveis | pendente | — |
| 6.5 · caixas, recompensa única | +48 na reserva por caixa a partir de 0,733 s, sem encher pente. Sem outros gastos/reposição: 96→144→192. Repetir E/botão não duplica; fora de alcance, por trás, com parede, em pausa ou morto não abre | pendente | — |
| 6.5 · caixas, pausa e retry | Pausar durante abertura: animação/recompensa congelam e retomam sem duplicar. Caminhar contra caixa e girar Q/C sem prender o acesso. Retry restaura as duas fechadas | pendente | — |
| 6.5 · dano/morte/reinício | Contato: 15 de dano, intervalo global ~0,8 s, feedback e derrota. Retry: 100 HP, 24/96 balas, modo escolhido, tiros/contadores limpos, sem conservar peças | pendente | — |
| 6.5 · pausa/foco em combate | Esc em perseguição, recarga e abertura congela simulação/temporizadores. Trocar janela com movimento/tiro pressionados e soltar fora; retomar sem tecla/gatilho preso ou dano acumulado | pendente | — |
| 6.5 · seletor | Na cabine e nos resultados, exercitar 1/3/5/32/hordas; retry usa a escolha. Para 32, observar cruzamentos por 90 s, sem fila permanente | pendente | — |

### 3.2 Hordas — depois dos casos com um robô

| Item | Ação / resultado esperado | Resultado | Observação/evidência |
|---|---|---|---|
| 6.5 · início das hordas | Selecionar Hordas e reiniciar: total 100, linha da HUD, faixa CONTATO IMINENTE e primeira horda após 4 s de simulação a pé | pendente | — |
| 6.5 · sequência | 10→20→30→40, por setores alcançáveis da borda e longe do jogador; próxima 6 s após zerar vivos. Rigs reaproveitados voltam vivos, sem pose de morte | pendente | — |
| 6.5 · percepção e Patrol Units em grupo | Observar aquisição individual, visor/exclamação, +24%, marcha/cerco e cruzamentos. Avaliar modelos/tiros legíveis e filas; não inferir que uma detecção em grupo prova percepção pelas costas | pendente | — |
| 6.5 · reposição | Início da horda repõe dois corações e eleva munição total, se necessário, a 45/90/135/180 (margem 1,5×). Não reduz munição, não enche pente e não fecha/recompensa caixas já abertas | pendente | — |
| 6.5 · intervalo e pausa | Pausar na contagem e retomar: sem avanço acumulado; faixas/contagens coerentes | pendente | — |
| 6.5 · conclusão/ritmo | Zerar as quatro hordas: Hordas neutralizadas, sem novos spawns; cronometrar duração total e avaliar pressão, munição, dificuldade e margem de erro | pendente | Duração: —; avaliação: — |
| 6.5 · retorno ARES-I | Em Shanghai, embarcar no E (0; 9,5), voltar a Marte e desembarcar no E (0; 29,5) sobre o novo deck. Repetir embarque/desembarque; acesso à colônia, EDEN e laboratório preservado, sem combate em Marte e sem perda de materiais/luzes da nave após recarregar mapas | pendente | — |
| 6.5 · apresentação | Avaliar câmera, zoom, HUD/rádio/botões e feedback de tiro/acerto/dano/detecção/horda/caixa. Registrar oclusão e dificuldade de distinguir jogador, robôs, prédios e drops | pendente | — |

**Aceite deste estado da etapa 6.5:** aprovo / não aprovo / pendente: —.
Pendências observadas: —. Isso ainda não encerra a Sprint 2: mudanças futuras da
S2.12 B e a decisão sobre S2.11 exigem a sessão curta final.

Limitações conhecidas a distinguir de regressões: origem/mira/traçador e colisão
por altura aguardam S2.12 B; caixas bloqueiam tiros sem considerar altura neste
build. ARES-I já integrada é a nave desta sessão; não editar arte nem encerrar
itens S6. r8, Astro Explorer e demais alterações da Sprint 6 ficam fora da tarefa.
Loot persistente, extração obrigatória e Builder continuam fora deste fechamento.

## 4. S2.9 — medições do autor no build de produção

Usar o mesmo preview da **worktree de fechamento com ARES-I**, porta **4173**. Depois dos blocos
funcionais, conferir [sem instrumentação](http://127.0.0.1:4173/) e então abrir
[com instrumentação](http://127.0.0.1:4173/?perf). A nova navegação retorna ao hub e
encerra a tentativa anterior; o perfil do navegador permanece. Medir com **r7**,
sem comparação aberta, sem `?personagem=atual` e sem parâmetros de mapa antigo.
Não executar testes de perda de foco/pausa dentro das amostras de desempenho.

### Coleta e exportação exatas

O botão **Amostra 10 s** não produz 30 s. Para **M1** e **M2**, abrir o
console e agendar a coleta abaixo. São 5 s para voltar à página, deixar o jogo
em foco e retomar com Esc, se estiver pausado. Não clicar no canvas para dar foco
em Shanghai: o clique pode disparar; voltar pelo atalho do DevTools.
Fechar/desacoplar o DevTools de forma consistente **antes** de iniciar as amostras,
pois ele pode alterar viewport/DPR. Confirmar de novo o contexto se isso ocorrer.

```javascript
setTimeout(() => {
  window.__hordaPerf.sample(30000).then(resultado => console.info('Amostra 30 s concluída', resultado));
}, 5000);
```

Não usar `await` aguardando no console com o jogo fora de foco. Voltar ao jogo
antes do início, cumprir a ação por 30 s e aguardar o resultado antes de exportar.
No fim, clicar **Copiar JSON** no painel: ele copia o **relatório completo**, com
`context`, carregamento, `sceneEvents` e histórico de `samples`. Colar num editor e
salvar como JSON UTF-8 na pasta exclusiva da sessão. Alternativa de inspeção no
console: `window.__hordaPerf.report()` (não salvar só o objeto retornado por `sample`).
O histórico contém até 10 amostras e 40 eventos; exportar após cada caso e antes
de qualquer recarga/viagem adicional. A navegação de página apaga o histórico.

| Item | Ação / resultado esperado | Arquivo na pasta da sessão | Resultado | Observação/evidência |
|---|---|---|---|---|
| P0 | Página sem `?perf`: painel ausente e API indefinida (`window.__hordaPerf`) | `ambiente-e-resultados.md` | pendente | — |
| P1 | Página `?perf`: painel PERF · mars presente; registrar se cobre HUD | `ambiente-e-resultados.md` | pendente | — |
| P2 | Clicar/rolar no painel em condição controlada: não atira, não gira nem muda zoom. Repetir em Shanghai para conferir tiro; fora de amostra | `ambiente-e-resultados.md` | pendente | — |
| JSON A · entrada | Depois de Marte carregado, Copiar JSON. Registrar navegação/GLBs e `scene-first-draw`/`scene-assets-ready`; `map-data-ready` não basta e pode ser inferido na entrada | `A-entrada-marte.json` | pendente | Tempos e cache: — |
| M1 · Marte parado | 30 s, a pé no hub, sem pausa, câmera parada e aba visível | `M1-marte-parado-30s.json` | pendente | — |
| M2 · Marte em movimento | 30 s sustentando W, guiando o cursor numa rota livre (S se necessário, anotando). Sem travar numa parede, menus, pausa ou troca de janela | `M2-marte-movimento-30s.json` | pendente | Rota/método: — |
| JSON B · viagem | Viajar para Shanghai fase 01 com 5 robôs; após desembarcar/copiar, conferir eventos da viagem e `sinceMapLoadingMs` até cena pronta | `B-viagem-shanghai.json` | pendente | Tempos: — |
| S2 · referência com 5 | Preservar a referência do handoff S2.9: 10 s andando/atirando com 5 robôs no início; botão Amostra 10 s. Anotar ativos no início/fim | `S2-shanghai-5-robos-10s.json` | pendente | — |
| S1 · referência sem robôs | Eliminar os 5 e medir 10 s andando, sem robôs; botão Amostra 10 s | `S1-shanghai-sem-robos-10s.json` | pendente | — |
| S40 · pico de 40 | Selecionar Hordas na cabine ou resultado e reiniciar. Eliminar 10/20/30; ao nascer a quarta, confirmar HORDA 4/4 · 40 ATIVOS e clicar Amostra 10 s, mantendo todos vivos e deslocando-se para sobreviver | `S40-shanghai-pico-40-10s.json` | pendente | Ativos início/fim: —; duração real: — |
| C1 | API de amostra utilizada e `window.__hordaPerf.report()` retornam sem erro; contexto informa `build: production` | `ambiente-e-resultados.md` e JSONs acima | pendente | — |

S1/S2 mantêm as referências do handoff anterior; **S40 é o pico obrigatório desta
sessão** e não pode ser substituído por 32 patrulhas. Se não conseguir sustentar
40 vivos/10 s sem morte, pausa ou troca de mapa, salvar a tentativa com sufixo
`-tentativa-01` e registrar contagem/duração. Repetir ou deixar a condição pendente;
não rotular uma janela parcial ou pausada como medição de 40 robôs. Não usar cheat,
fixture, alteração de código ou ganchos DEV para atingir o pico. O roteiro funcional
do bloco 3 continua na mesma sessão, mesmo que sejam necessárias novas tentativas.

### Resumo das amostras (preencher a partir dos JSONs)

| Amostra | Resultado (passou/falhou/pendente) | `status`, duração pedida/real, mapa | rAF p50 / p95 / máx. (ms), >33,3 / >50 ms | LoAF; draw calls/triângulos mín./máx./média; memória disponível | Cobertura/avisos, observação/evidência |
|---|---|---|---|---|---|
| M1 · 30 s | pendente | — | — | — | — |
| M2 · 30 s | pendente | — | — | — | — |
| S2 · 10 s, com 5 no início | pendente | — | — | — | — |
| S1 · 10 s, sem robôs | pendente | — | — | — | — |
| S40 · 10 s, 40 ativos | pendente | — | — | — | — |

Usar `samples[].rafIntervals` para os números da janela, não os números ao vivo do
painel. Conferir `requestedMs`, `elapsedMs`, `map`, `status`, `invalidReason`,
`warnings` e `coverage`: repetir se inválida, saturada ou com aviso de pausa.
Embora a API possa rotular amostra pausada como válida, ela não representa esta
condição de teste. Dados sem suporte continuam null/indisponível. Draw calls
excluem passes de sombra; geometrias/texturas são contagens, não bytes.
`scene-assets-ready` acompanha personagens esperados, não certifica todos os GLBs
(nave/inimigos); observar a prontidão deles também. rAF não mede tempo de GPU.

**Medições entregues:** arquivos/caminhos: —.
**Aceite expresso S2.9:** aprovo / não aprovo / pendente: —.
Retomar o aceite S0.4 no bloco 1 após preencher M1/M2. Medições registradas são
necessárias para S2.9; a decisão de aprovação continua sendo do autor.

## Entrega do relato e paradas

Ao terminar, enviar resultados por identificador, decisões de A12/Run, aceites
expressos S0.4/A1–A13/6.5/S2.9 e os JSONs/ambiente. Qualquer lacuna fica pendente.
Na **Etapa 2**, o agente registra no kit, relatório da Sprint 0, handoffs S2.9/S2.12
e quadro desta branch. S0.4/Sprint 0 só fecham com aceite expresso e medições;
S2.9 só pode ser marcada com medições registradas e aceite. Falhas em A1–A13 geram
proposta de correção, sem implementar, e **Parada 2**.

S2.12 B mantém as decisões de `222bc5b` do [escopo fechado](../handoffs/s2.12-b-proposta.md):
raio 0,80 m; spacing/separation/contactRange 1,60/1,90/1,20 m; robô 0–2,75 m;
caixa `maxY = 1,195 m` fixo, tampa visual; tiro/cano/mira a 0,65 m; depósitos fora
até S4.3. Após A1–A13 e liberação, sua branch própria parte da ponta então vigente
de `rochatales/fechamento-s0-s2`, conforme o pedido atual, e não da integração.
Três etapas sequenciais (origem/mira/traçador; colisão com altura; raio/navegação),
um commit e uma parada com testes/build/diff-check/roteiro em cada, revisão do
Claude contra a base. S2.11 vem depois, comparativa, sem adoção antes de teste do
autor; ausência de 120/144 Hz deve ser registrada. Nenhuma dessas etapas começa
com a entrega deste kit.

A sessão curta final, **somente para as mudanças de B e de S2.11**, será acrescentada
a este kit quando as versões estiverem prontas. Sem aceite final, não marcar
S2.11/S2.12 nem encerrar Sprint 2. Reunião das entregas na branch de fechamento,
revisão do Claude e avanço `--ff-only` da integração ficam para as etapas futuras;
o avanço é do autor. **Parada 1 desta entrega: kit e comandos, aguardando o relato.**
