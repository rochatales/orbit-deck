# MCP Office

MCP Office is a playable prototype for a new interface paradigm: an AI
workplace experienced as a navigable low-poly sci-fi headquarters instead of
a text dashboard. The office is the dashboard, the NPCs are the agents, the
player is the operator, and the editorial workflow becomes gameplay.

The runtime is React + Vite + TypeScript on top of Three.js with
`@react-three/fiber`, `@react-three/drei`, `@react-three/rapier`, zustand,
`lucide-react`, `framer-motion`, `troika-three-text`, and `three-mesh-ui`.

## Run locally

```bash
npm install
npm run dev
```

The backend lives under `server/` and is started separately when needed:

```bash
npm run dev:server
```

## Controls

- `WASD` or arrow keys: move the player
- `E`: interact with the nearest MCP NPC (also triggers first-time
  activation balloons)
- `ESC`: close the active dialogue or console
- `M`: open the orbital map overlay from inside the workspace
- Mouse wheel or `+` / `-`: zoom the orthographic camera
- `Q` / `R`: rotate the camera around the office

## Player journey

```
Login → Orbital deck map → Workspace (office)
       ↳ in-world activation of each station when the player meets its agent
       ↳ Editorial activation seeds the four-step mission
       ↳ Smart Lab console provides diagnostics + brand-rules chat
       ↳ Mission ends at Astra (review) → marked `published`
```

State is split across zustand stores under `src/state/`:
`usePlayerJourneyStore`, `useGameStore`, `useDialogueStore`,
`useWorkflowStore`, `useClientSetupStore`, `useClientSessionStore`,
`useAgentStatus`, `useMeetingStore`.

## Source layout

```
src/
  app/                App.tsx, GameCanvas.tsx
  scene/              OfficeScene, CameraRig, Lighting
  world/              OfficeMap, Room, Furniture, HolographicPanels, MeetingBeacon
  characters/         MCPCharacter, Player (GLB) + procedural animators
  physics/            PhysicsWorld, PlayerPhysicsBody, colliders (Rapier)
  interactions/       InteractionManager, InteractionRadius, MeetingBeaconInteraction
  journey/            LoginScreen, DeckSelectionScreen, OrbitalMapOverlay, orbital/*
  onboarding/         ClientSetupWizard (EDEN)
  ui/                 HUD, DialogueModal (+ SmartLabConsole), TaskPanel,
                      WorkflowStatusLog, NotificationStack, PlayerConfigPanel,
                      SmartLabOverlay
  state/              zustand stores
  domain/             decks, mcpActions, clientProfiles, clientSetupTemplate,
                      editorialBrief, smartLabMetrics, agentStatus
  api/                mcpClient.ts (local API client)
server/               Fastify + TypeScript local server for clients + Smart Lab
```

A small number of legacy vanilla-TS modules from the pre-React prototype
(`src/npcs/`, `src/world/createOffice.ts`, `src/world/createOfficeMap.ts`,
`src/scene/{camera,lights,createScene}.ts`, `src/ui3d/*`,
`src/interactions/InteractionManagerLegacy.ts`) remain in the repo but are
not on the active runtime path. They will be removed during the next code
cleanup pass.

## The cast

| Deck | Agent | Slot | Accent |
|---|---|---|---|
| Strategy | **Eden** (Brand Brain) | `brand-brain` | `#F2C94C` |
| Editorial | **Mister** | `editorial` | `#2F80ED` |
| Design | **Max** | `design` | `#27AE60` |
| Narration | **Nara** | `narration` | `#9B51E0` |
| Review / Social | **Astra** | `output-review` | `#00C2FF` |

## Documentation

All design documentation lives in [`docs/`](./docs/):

- **[Roadmap](docs/ROADMAP.md)** — current status, milestones M1–M5, open product questions, definition of done
- **[Game Design](docs/GAME_DESIGN.md)** — identity, core loop, decision ownership, design principles
- **[Story and Narrative](docs/STORY_AND_NARRATIVE.md)** — world premise, agent personalities, onboarding beats, mission archetypes
- **[Art Direction](docs/ART_DIRECTION.md)** — palette, materials, lighting, UI surface, iconography
- **[Map and Environment](docs/MAP_AND_ENVIRONMENT.md)** — room graph, Smart Lab, Orbit Garden, architecture rules
- **[Characters](docs/CHARACTERS.md)** — player and NPC anatomy, animation, GLB pipeline, polish checklist

The original vision essay is at [`MCP_GAME_VISION.md`](./MCP_GAME_VISION.md).

## Integration hooks

The current action buttons are a mix of placeholder dispatch and real local
API calls. The integration surface for replacing placeholders with real MCP
orchestration is `src/state/useWorkflowStore.ts` (action dispatch + task
progression) and `src/api/mcpClient.ts` (HTTP boundary with the local
server). See `ROADMAP.md` milestone **M3 · Editorial MCP as the real game
start** for the contract that Editorial briefing endpoints will need to
satisfy.
