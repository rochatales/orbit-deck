# Horda Survivor

Protótipo local de exploração e combate: a humanidade vive em Marte e envia um explorador às ruínas da Terra. EDEN orienta a viagem pelo rádio.

## Estado atual — Sprint 2

- Hub marciano com EDEN e deck físico de lançamento ao sul.
- Embarque e desembarque independentes da partida.
- Viagem Marte → Shanghai → Marte, com retorno ao mesmo deck.
- Shanghai em blockout, com ruas, obstáculos e marcadores de futuros recursos.
- Identidade e briefing salvos localmente; viagens não são persistidas. Reabrir retorna ao hub.
- Sem backend, cadastro de clientes ou serviços MCP.

Combate manual disponível em encontros de 1, 3 ou 5 robôs, com vida, munição finita, recarga e reinício após morte. Ondas, defesas automáticas, loot e fabricação entram nos próximos sprints. O retorno de Shanghai é livre nesta etapa de exploração e não concede recompensas.

## Executar

Usar as dependências do lockfile do projeto (pnpm). Com dependências instaladas:

```sh
npm run dev -- --host 127.0.0.1 --port 5178
```

Abrir http://127.0.0.1:5178/. Para validar:

```sh
npm test
npm run build
npm run preview -- --host 127.0.0.1 --port 4173
```

## Controles e percurso

- W/↑ avança na direção em que o personagem olha; S/↓ recua; A/D ou ←/→ deslocam para os lados dele. Shift: correr.
- Mouse orienta o personagem em Marte e Shanghai. Q/C muda apenas a câmera.
- Mouse: mirar; botão esquerdo: atirar (segure para disparos contínuos). R: recarregar.
- Q/C: girar câmera.
- Roda do mouse sobre o cenário ou +/−: zoom.
- E: conversar, embarcar ou desembarcar; Escape: fechar conversa/pausar.
- Na cabine, usar **Decolar para Shanghai** ou **Retornar a Marte**. Entrar na nave não dispara a viagem.

Encontre EDEN ao norte do hub. Para o deck, siga ao sul através do complexo e da passagem externa. A nave fica na nova plataforma além do jardim. No retorno, desembarque no deck e caminhe de volta à colônia.

## Testes

Roteiro de validação manual: [Sprint 2](docs/sprint-2/VALIDACAO_MANUAL.md).

`npm test` cobre combate, cadência, recarga, morte, pausa, perseguição, colisão dos tiros e as regras de viagem, migração de perfil, falhas de save, distância de interação e caminhos transitáveis dos mapas considerando obstáculos e raio do jogador.

A página de desenvolvimento `/tests/browser-smoke.html` é uma fixture de QA fora do build de produção: prepara posições junto de EDEN/deck, mantém uma tecla pressionada por um segundo para verificar movimento e mede intervalos de requestAnimationFrame. Também oferece encontros com mira assistida por eventos de ponteiro e testes de pausa/foco. Não representa aprovação humana da jogabilidade, percurso manual completo ou benchmark de GPU. Usar outra porta/origem para isolar seu save de teste.

## Código e preservação

- `src/combat/`: simulação, navegação, rifle, robôs e HUD.
- `src/game/`: regras, configuração e geração de mapas.
- `src/state/useExpeditionStore.ts`: sessão local e save versionado.
- `src/npcs/scripts/eden.ts`: texto local de EDEN.
- `archive/mcp-office/`: backend, fontes e assets inativos do produto anterior. Não integra o runtime.
- `docs/sprint-0/`: baseline e instruções de preservação.
- `docs/sprint-1/`: relatório, inventário do arquivo e evidências.
- `docs/sprint-2/`: implementação e checklist de validação manual.

O snapshot recuperável do Sprint 0 está documentado em `docs/sprint-0/RELATORIO.md`. A arte original de produção permanece preservada; somente exports inativos foram arquivados.
