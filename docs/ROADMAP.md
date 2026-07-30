# MCP Office — Roadmap

> Documento único de planejamento. Substitui `GAME_DESIGN_OVERVIEW`, `MVP_SCOPE`,
> `IMPLEMENTATION_CHECKLIST`, `PLAYER_JOURNEY_UPDATE_PLAN`, `ORBIT_DECK_UX_PLAN`,
> `ORBIT_DECK_MVP_PLAN`, `plano-acao-console-smartlab` e
> `plano-implantacao-brand-brain-smartlab`.
>
> Revisão: v1.0 · 16 de maio de 2026
> Owner: Tales Rocha

---

## 1. Estado atual (TL;DR)

O projeto **deixou de ser apenas um protótipo visual** e hoje opera como um
**Operational Prototype (Fase 2A)**:

- Mundo 3D em React + R3F + Rapier, com escritório multi-sala, GLB characters,
  iluminação sci-fi e física de personagem estável.
- Jornada do jogador (`login → mapa orbital → workspace`) implementada via
  `JourneyRouter`, com persistência local de perfil, cor e decks ativados.
- EDEN (Brand Brain) cadastra clientes no `ClientSetupWizard` e gera `rules.md`
  com 7 passos. Cliente novo aparece em tempo de execução no Smart Lab.
- Smart Lab Console roda com monitor central, lista de clientes reais do
  jogador e chat ligado ao endpoint local `/api/smart-lab/chat`.
- Servidor local em `server/` expõe rotas de clientes e Smart Lab. Backend já
  começou a sair do mock, mas ainda não é fonte canônica de persistência.

O que **ainda não foi feito** e define os próximos marcos:

1. Consolidar persistência cliente entre runtime local e backend.
2. Tornar Editorial MCP o "start oficial do jogo" com briefing real.
3. Encerrar o pipeline de cor do player (Avatar slim + accent dinâmico).
4. Cobrir UX mobile (joystick virtual, safe-area, dialogue full-screen).
5. Polimentos finais (onboarding, mini-mapa, áudio, analytics).

---

## 2. Diagnóstico por etapa da jornada

| Etapa | Alvo | Estado |
|---|---|---|
| 1 · Login | Nome, cor do player, mensagem de boas-vindas, sessão persistida | ✅ Implementado em `LoginScreen.tsx` + `usePlayerJourneyStore` |
| 2 · Escolha do deck | Apresentação read-only dos 5 decks; ativação fora desta tela | ✅ `DeckSelectionScreen` + `OrbitDeckSelector` em modo orbital |
| 3 · Conexão MCP | Pedido de autorização por deck (Drive, Notion, Docs, Calendar) | 🔲 Não implementado |
| 4 · Ativação do agente | Estados visíveis: `demo`, `waiting`, `offline`, `active`, `busy` | ◐ Estado `demo → active` derivado via `useAgentStatus`; falta UX explícita |
| 5 · Missões | Comando em linguagem natural mapeado para execução multi-agente | 🔲 Existem botões de ação, falta o composer |

---

## 3. Arquitetura atual (verificada por inspeção)

```
src/
  app/                 App.tsx, GameCanvas.tsx — montagem geral
  scene/               OfficeScene, CameraRig, Lighting (R3F)
  world/               OfficeMap, Room, Furniture, HolographicPanels, MeetingBeacon
  characters/          MCPCharacter, Player (GLB) + animadores procedurais
  physics/             PhysicsWorld, PlayerPhysicsBody, colliders (Rapier)
  interactions/        InteractionManager + InteractionRadius + MeetingBeacon
  journey/             LoginScreen, DeckSelectionScreen, OrbitalMapOverlay, orbital/*
  onboarding/          ClientSetupWizard (EDEN)
  ui/                  HUD, DialogueModal (inclui SmartLabConsole), TaskPanel,
                       WorkflowStatusLog, NotificationStack, PlayerConfigPanel,
                       SmartLabOverlay
  state/               zustand stores (journey, dialogue, workflow, game,
                       clientSession, clientSetup, agentStatus, meeting,
                       playerJourney)
  domain/              decks, mcpActions, clientProfiles, clientSetupTemplate,
                       editorialBrief, smartLabMetrics, agentStatus
  api/                 mcpClient.ts (cliente local para o server/)
server/                Express/TS local para clientes + Smart Lab
```

Stack dependente confirmada pelo `package.json`:

`react 18`, `@react-three/fiber 8`, `@react-three/drei 9`, `@react-three/rapier 1.5`,
`three 0.165`, `zustand 5`, `lucide-react`, `framer-motion`, `troika-three-text`,
`three-mesh-ui`, `vite 4`, `typescript 5`.

---

## 4. Inventário de NPCs e decks

| Deck | Agente principal | Slot interno | Cor accent | Sala |
|---|---|---|---|---|
| Estratégia (Brand Brain) | **Eden** | `brand-brain` | Gold `#F2C94C` | Sala Brand Brain |
| Editorial | **Mister** | `editorial` | Blue `#2F80ED` | Sala Editorial |
| Design | **Max** | `design` | Green `#27AE60` | Design Studio |
| Narração | **Nara** | `narration` | Purple `#9B51E0` | Narration Booth |
| Social Media / Revisão | **Astra** | `output-review` | Cyan `#00C2FF` | Review / Publish |

Áreas extras já modeladas: **Smart Lab** (entre Brand Brain e Design) e
**Orbit Garden** (área externa leste). Detalhes em `MAP_AND_ENVIRONMENT.md`.

---

## 5. Milestones e ordem de execução

### M1 · EDEN + Smart Lab estáveis (em curso, ~80% feito)

- ✅ Wizard de 7 passos com geração de `rules.md`
- ✅ Cliente criado reflete em runtime no Smart Lab
- ✅ Smart Lab usa apenas clientes do player, não fixtures
- ✅ Monitor do Smart Lab refatorado em layout single-screen
- 🔲 Validação visual passo-a-passo do wizard (afford. e mensagens de erro)
- 🔲 Remoção de cliente exposta na primeira tela do EDEN
- 🔲 Campos novos no cadastro: **volume editorial mensal** e **tipos de post**
  (`Estático`, `Carrossel`, `Vídeo`) — input estrutural para o Mister
- 🔲 Console Smart Lab usar a HUD do mapa (não duplicar painéis); bolinha azul
  do monitor vira botão de fechar (detalhe técnico em §10)

### M2 · Persistência cliente runtime ↔ API

- 🔲 Definir se `/api/clients` é fonte canônica ou camada de sync
- 🔲 Path de hidratação ao abrir o workspace
- 🔲 Estratégia de escrita do EDEN (local-first com sync, ou API-first)
- 🔲 Reload preserva: cliente selecionado, estado de missão e histórico
  de chat do Smart Lab
- 🔲 Falha do servidor cai para snapshot local sem corromper estado

### M3 · Editorial MCP como "start the game"

- 🔲 Balão de ativação explícito ao chegar perto de cada agente principal
  (`InteractionManager → openActivationPrompt(npcId)`)
- 🔲 Gating `isEditorialActiveFor(clientSlug)` no console do Mister
- 🔲 Task panel passa a seedar 4 tarefas quando Editorial é ativado:
  1. Gerar briefing editorial
  2. Enviar para Design (Max)
  3. Aprovar com Astra
  4. Exportar pacote
- 🔲 Estado de missão por cliente: `idle → briefing → designing → narrating →
  reviewing → published`, persistido em `useClientSetupStore.customClients[i].mission`
- 🔲 Endpoint `/api/editorial/brief` retorna documento estruturado a partir
  de `rules.md` + segmento + tema livre
- 🔲 Console mostra briefing inline com copy + "Send to Design"

### M4 · Mobile playable loop

- 🔲 Viewport meta com `viewport-fit=cover` + `user-scalable=no`
- 🔲 `TouchJoystick.tsx` 120px transparente (canto inferior esquerdo)
- 🔲 Botão "Interact" 64px (canto inferior direito) — usa accent do player
- 🔲 HUD compactada em `max-width: 720px`
- 🔲 Dialog modal full-screen no breakpoint mobile (não `<Html>` ancorado)
- 🔲 Wizard EDEN responsivo (1 coluna, botões 48px, padding reduzido)
- 🔲 `safe-area-inset-*` no `app-shell`, dialog e wizard
- 🔲 Tap target mínimo 44×44 em todos os controles

### M5 · Polimento final

- 🔲 **Pipeline de cor do player**: `PlayerModel.tsx` passa a ler
  `usePlayerJourneyStore.profile.color` em vez do hardcode
  `PLAYER_CHARACTER_ASSET.accentColor` (`#66E6FF`). Avatar reage live
  ao swatch escolhido no login e ao `PlayerConfigPanel`.
- 🔲 Preview 3D do avatar no `LoginScreen` (Canvas R3F isolado, `frameloop="demand"`)
- 🔲 Toast de ativação de estação colorido pelo accent do deck
- 🔲 Minimap "discovery bar": 5 pontos no HUD que se colorem conforme
  decks são ativados
- 🔲 Chip de sincronização no topo (`Sincronizado` / `Offline` / `Erro`)
- 🔲 SFX curtos em ativação + ambient loop discreto (avaliar `howler` ou Tone)
- 🔲 Analytics: `journey:login`, `journey:deck-activated`, `journey:client-added`,
  `journey:editorial-activated`, `journey:mission-published`
- 🔲 Consolidar `useClientSetupStore` + `useClientSessionStore` em um único
  `useClientStore` (limpa a origem das duas verdades atuais)

---

## 6. Definição de pronto (MVP completo)

O MVP é considerado fechado quando, em um device limpo, um novo jogador consegue:

1. Abrir a página em desktop ou mobile, escolher nome e cor e ver essa cor no
   próprio avatar dentro do escritório.
2. Andar até Eden, ver o balão **Ativar Brand Brain MCP** e confirmar.
3. Completar o wizard do EDEN e sair com um cliente MCP-ativo e `rules.md` gerado.
4. Abrir o Smart Lab, selecionar o cliente, revisar monitor e conversar com
   o assistente via API.
5. Andar até Mister, ativar Editorial MCP para esse cliente, receber as 4 tarefas
   da missão e gerar um briefing real.
6. Entregar o briefing para Max (Design), opcionalmente para Nara (Narração),
   e aprovar com Astra para marcar a missão como `published`.
7. Adicionar um segundo cliente em qualquer momento sem perder o primeiro.
8. Recarregar a aba e voltar exatamente no mesmo ponto, com cliente e missão
   recuperados pela estratégia de persistência escolhida em M2.
9. Fazer todos os passos acima em uma tela 390px em retrato, sem teclado.

---

## 7. Perguntas em aberto

| # | Decisão | Bloqueia |
|---|---|---|
| 1 | As 5 fixtures (Hospital Samer etc.) devem virar "Try a sample client" ou ser removidas? | M1 |
| 2 | Logo do cliente persiste como data URL em `localStorage` ou via upload real? | M1 |
| 3 | Balão de ativação é componente novo ou estado especial do `DialogueModal`? Recomendação: estado especial. | M3 |
| 4 | Mobile: virtual joystick (MVP) vs tap-to-move (Fase 3)? | M4 |
| 5 | Cliente do EDEN é API-first ou local-first com sync? | M2 |

---

## 8. Workstreams adiados explicitamente (não-MVP)

- Múltiplos clientes/marcas simultâneos com switch ao vivo
- NPC memory / histórico conversacional persistente
- TTS / voicelines reais
- Multiplayer / múltiplos operadores no mesmo escritório
- Bloom / SSAO / shaders custom
- Animações esqueletais authored (substituir procedural)
- Day/night cycle (tempo do jogo = runs, não relógio)
- Combat / inventário / itens — o jogo é não-combativo por design

---

## 9. Convenções de propriedade de documentos

| Decisão | Doc dono |
|---|---|
| Loop de jogo, princípios gerais, identidade | `GAME_DESIGN.md` |
| Mundo, fantasia, NPCs, jornada narrativa | `STORY_AND_NARRATIVE.md` |
| Paleta, UI, tipografia, materiais, regras visuais | `ART_DIRECTION.md` |
| Layout do mapa, salas, expansões físicas | `MAP_AND_ENVIRONMENT.md` |
| Anatomia de personagens, animação, asset pipeline, física | `CHARACTERS.md` |
| Status atual, milestones, perguntas em aberto, prazos | `ROADMAP.md` (este doc) |

Se houver conflito de informação, **o código é fonte da verdade** e este
roadmap é a referência operacional de o-que-vem-depois.

---

## 10. Detalhes técnicos puxados para esta versão

### 10.1 Cor do player (M5)

`PLAYER_CHARACTER_ASSET.accentColor` é hoje `#66E6FF` em
`src/characters/characterAssetConfig.ts`. `PlayerModel.tsx` linha 29 monta
`<GLBCharacter accentColor={PLAYER_CHARACTER_ASSET.accentColor} />` ignorando
o store. `GLBCharacter` já tem `prepareScene` envolto em `useMemo` keyed em
`accentColor`, então a correção é apenas:

```tsx
const playerColor = usePlayerJourneyStore((s) => s.profile?.color)
  ?? PLAYER_CHARACTER_ASSET.accentColor;
```

### 10.2 Console do Smart Lab (M1)

O console hoje desmonta a HUD do mapa e redesenha versões duplicadas dentro do
overlay. O caminho correto é:

1. Em `src/app/App.tsx` remover o gate `!isSmartLabConsoleOpen ?` que esconde
   HUD/`TaskPanel`/`WorkflowStatusLog`.
2. Em `src/ui/DialogueModal.tsx` remover `aside.smartlab-sidebar-*` e a
   `header.smartlab-toolbar`.
3. Transformar a primeira `.smartlab-monitor-led` em botão de fechar (mantém
   ESC pelo keyboard handler atual).
4. Remover o bloco `.smartlab-chat-empty` que exibe "Pressione E para
   interagir" — esse hint é do mundo 3D, não do console.
5. Em `global.css` zerar o padding lateral de `.smartlab-main` e tirar o teto
   `max-width: 1080px` de `.smartlab-monitor`.
6. Aplicar `hud-root--console-open` para deixar a HUD do mapa inerte e
   sombreada (`opacity: 0.62; pointer-events: none`).

### 10.3 Volume editorial e tipos de post (M1)

Os campos novos do `ClientSetupAnswers`:

```ts
interface ClientSetupAnswers {
  // ... campos atuais ...
  monthlyVolume: number;        // posts/mês
  postTypes: Array<'estatico' | 'carrossel' | 'video'>;
}
```

`generateRulesMd` precisa render esses dois itens em uma seção dedicada para
o Mister consumir no briefing.

---

## 11. Histórico de revisões

- **v1.0 · 16/05/2026** — consolidação inicial. Substitui 8 documentos legados.
