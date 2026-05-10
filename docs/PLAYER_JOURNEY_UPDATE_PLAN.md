# MCP Office — Player Journey Update Plan

> Updated implementation plan aligned with the new product journey.
> Revision: v2.0 · May 2026

---

## 1. Current Phase Summary

The project is **no longer only a visual MVP**, but it is also **not yet a full journey-driven product**.

Today, the codebase is in a **transition phase between Phase 1 and Phase 2**:

- **Phase 1 completed:** spatial 3D office, player movement, NPC interaction, task flow, HUD, dialogue, notifications.
- **Phase 2 partially implemented:** local API server, dynamic client loading, capability-aware client selection, first real data bridge for editorial/brand/design reads.
- **Journey layer not implemented yet:** login, player personalization, deck selection, MCP authorization flow, visible agent activation states, freeform mission entry.

### Practical reading

If we describe the product in one sentence:

> We already have the **operational world** and part of the **service bridge**, but we still need the **entry journey and orchestration UX** that turns the office into a true Creative Command Center.

---

## 2. Where We Are vs. Target Journey

## Etapa 1: Login

**Target**

- Player accesses account
- Configures player color
- Sees:
  - "Bem-vindo ao seu Creative Command Center."
  - "Escolha um deck para começar."

**Current state**

- Not implemented.
- There is no auth gate, no session entry screen, and no avatar personalization flow.
- Player spawns directly into the world.

**Status:** `Not started`

## Etapa 2: Escolha do workspace

**Target**

- Player chooses one deck:
  - Editorial Deck
  - Design Deck
  - Narration Deck
  - Brand Brain Deck
  - Social Media Deck

**Current state**

- Partially represented in the world as NPC zones and rooms.
- Not represented as a product choice before entering a workflow.
- Current experience is office-first, not deck-first.

**Status:** `Concept present, flow missing`

## Etapa 3: Conexão MCP

**Target**

- When entering a deck, the system asks for MCP/tool authorization.
- Example:
  - Google Drive
  - Notion
  - Google Docs
  - Calendar
  - Local folder

**Current state**

- Not implemented in the frontend.
- There is no connection registry, no permission state, and no per-deck tool authorization UI.
- Backend currently reads local editorial system data, but this is invisible to the player as a connection step.

**Status:** `Not started`

## Etapa 4: Agentes ficam ativos

**Target**

- Before connection:
  - Editorial Agent: demo
  - Review Agent: waiting
  - Calendar Agent: offline
- After connection:
  - Editorial Agent: active
  - Review Agent: active
  - Calendar Agent: active

**Current state**

- Partially implied through client capability booleans and action availability.
- The dialogue already blocks actions when a client does not support a capability.
- But there is no visible lifecycle for `demo`, `waiting`, `offline`, `active`.

**Status:** `Partially implemented in logic, not in UX`

## Etapa 5: Player dá missões

**Target**

- Player writes natural commands like:
  - "Criar calendário editorial de 10 posts para o Hospital Samer com base nos arquivos do Brand Brain."
  - "Selecionar as melhores fotos da pasta Verdiplan para o carrossel de manutenção de outono."

**Current state**

- Partially implemented only as pre-defined action buttons inside NPC dialogue.
- There is no mission composer, no freeform prompt parser, no deck-level command center, and no multi-agent execution plan.

**Status:** `Buttons exist, mission system does not`

---

## 3. Overall Assessment

### What is already strong

- The 3D office metaphor is real and functional.
- NPCs already communicate operational roles.
- The task/status/notification loop already proves that the interface can guide work.
- The backend already started the shift from mock gameplay to real operational data.

### What is missing for the new vision

- A guided product entry point
- A deck-based starting decision
- A visible MCP connection system
- Agent runtime states tied to permissions
- A natural-language mission layer

### Recommended phase label

The best label for the project right now is:

> **Phase 2A — Operational Prototype**

Meaning:

- the world exists
- the first backend bridge exists
- the journey productization layer is the next major milestone

---

## 4. New Product Direction

The system should now evolve from:

> **Walk through office -> interact with NPC -> trigger actions**

to:

> **Login -> choose deck -> connect tools -> activate agents -> assign mission -> watch execution**

This does **not** replace the office metaphor.
It upgrades it.

The office remains the world, but the player now enters it through a clearer operational journey.

---

## 5. Target Experience Architecture

## 5.1 Entry Layer

New responsibility:

- authenticate the player
- load their profile
- allow player color selection
- present the Creative Command Center welcome state

Suggested surface:

- `LoginScreen`
- `PlayerProfileSetup`
- `CommandCenterWelcome`

## 5.2 Deck Selection Layer

New responsibility:

- present decks as primary entry points
- let the player choose a work mode before opening a specific deck

Suggested decks:

- `Editorial Deck`
- `Design Deck`
- `Narration Deck`
- `Brand Brain Deck`
- `Social Media Deck`

Suggested surface:

- `DeckSelectionScreen`
- optional 3D deck portal cards inside the hub later

## 5.3 MCP Connection Layer

New responsibility:

- show required tools per deck
- track what is connected, pending, denied, or unavailable
- request authorization before activating agents

Suggested surface:

- `DeckConnectionModal`
- `ToolConnectionChecklist`
- `ConnectionStatusBadge`

Suggested state model:

- `disconnected`
- `pending`
- `connected`
- `denied`
- `error`

## 5.4 Agent Runtime Layer

New responsibility:

- translate tool connectivity into visible agent states
- decide whether each agent is in demo, waiting, offline, or active mode

Suggested surface:

- `AgentStatusPanel`
- `AgentCard`
- in-world NPC indicators above desks

Suggested state model:

- `demo`
- `waiting_connection`
- `offline`
- `active`
- `busy`
- `error`

## 5.5 Mission Layer

New responsibility:

- accept natural-language mission prompts
- infer target client, assets, and deck scope
- route work to one or more agents
- show execution plan and progress

Suggested surface:

- `MissionComposer`
- `MissionPlanPanel`
- `MissionExecutionTimeline`

---

## 6. New Implementation Plan

## Phase 2A — Journey Foundation

Goal:
Add the product shell that wraps the existing office experience.

Deliverables:

- Create a new global store for journey state
- Add app-level routing between `login`, `deck-selection`, `deck-connection`, `workspace`
- Define deck metadata and required tools
- Preserve current office scene as the workspace runtime

Definition of done:

- App no longer drops the player straight into the world on first load
- The player goes through at least one guided entry step before reaching the office

## Phase 2B — Login And Player Setup

Goal:
Implement Etapa 1.

Deliverables:

- Login screen shell
- Session bootstrap state
- Player color picker
- Welcome message:
  - "Bem-vindo ao seu Creative Command Center."
  - "Escolha um deck para começar."

Definition of done:

- Player identity and color are stored before workspace entry

## Phase 2C — Deck Selection

Goal:
Implement Etapa 2.

Deliverables:

- Deck registry
- Deck selection UI
- Deck descriptions and visual identity
- Deck-to-agent mapping

Suggested first deck priority:

1. Brand Brain Deck
2. Editorial Deck
3. Design Deck
4. Narration Deck
5. Social Media Deck

Definition of done:

- Player selects a deck before entering its workspace flow

## Phase 2D — MCP Connections

Goal:
Implement Etapa 3.

Deliverables:

- Tool authorization model
- Required tools by deck
- Connection checklist UI
- Local persistence for granted connections

Suggested initial tool matrix:

| Deck | Required tools |
|---|---|
| Brand Brain | Google Drive, Notion, local folder |
| Editorial | Google Drive, Google Docs, Calendar, local folder |
| Design | Google Drive, local folder |
| Narration | Google Drive, local folder |
| Social Media | Google Drive, Notion, Calendar |

Definition of done:

- Entering a deck triggers a visible connection step before activation

## Phase 2E — Agent Activation States

Goal:
Implement Etapa 4.

Deliverables:

- Agent runtime state resolver
- Visual indicators for `demo`, `waiting`, `offline`, `active`, `busy`
- Deck-aware agent roster
- Connection-driven activation logic

Example:

- No Google Drive -> Editorial Agent stays `demo` or `waiting_connection`
- Drive + Docs connected -> Editorial Agent becomes `active`
- Calendar unavailable -> Calendar Agent remains `offline`

Definition of done:

- The player can clearly understand why an agent is or is not available

## Phase 2F — Mission System

Goal:
Implement Etapa 5.

Deliverables:

- Freeform mission input
- Mission parsing layer
- Client detection
- Asset source selection
- Mission plan preview before execution
- Agent dispatch pipeline

First supported mission archetypes:

1. Editorial calendar generation
2. Photo selection from a local folder
3. Brand-based content ideation
4. Review/export mission

Definition of done:

- The player can type a mission in natural language and see the system convert it into a multi-step run

## Phase 3 — Real MCP Orchestration

Goal:
Replace remaining simulated actions with real connectors and job execution.

Deliverables:

- Real connection adapters
- Tool health checks
- Job result payloads
- Persistent mission history
- Rich execution logs

Definition of done:

- Core deck flows use real external or local data instead of placeholder execution

---

## 7. Recommended Store Refactor

The current stores are good for the prototype, but the new journey needs one more layer above gameplay state.

Suggested additions:

- `usePlayerJourneyStore`
  - login status
  - player profile
  - selected player color
  - current stage
- `useDeckStore`
  - selected deck
  - deck registry
  - deck requirements
- `useConnectionStore`
  - tools by deck
  - authorization state
  - last sync / health
- `useAgentRuntimeStore`
  - agent status
  - activation reasons
  - deck visibility
- `useMissionStore`
  - current mission text
  - parsed plan
  - execution steps
  - mission result

The existing stores can remain with clearer ownership:

- `useGameStore` -> movement, camera, pause
- `useDialogueStore` -> NPC console state
- `useWorkflowStore` -> run timeline, notifications, action progress
- `useClientSessionStore` -> active client and client loading

---

## 8. Recommended Build Order

To keep momentum and avoid rewriting the office runtime too early, the recommended order is:

1. Add journey shell and screen routing
2. Add login + player color
3. Add deck selection
4. Add deck connection step
5. Add agent activation states
6. Add mission composer
7. Connect mission execution to the existing workflow store
8. Replace simulated actions with real MCP adapters over time

This order lets the team reuse the current office scene instead of rebuilding it.

---

## 9. Success Criteria For The New Journey

The update is successful when a new player can:

- enter the product through a clear welcome flow
- choose a deck intentionally
- understand which tools must be connected
- see which agents are active and why
- type a mission in natural language
- watch the system convert that mission into visible operational steps

---

## 10. Final Recommendation

Do **not** treat the next milestone as "more office polish".

The next milestone should be:

> **Journey Productization**

That is the real gap between the current prototype and the experience you described.

The office already proves the metaphor.
Now the system needs to prove the onboarding, activation, and mission flow.
