# MCP Office

MCP Office is a playable prototype for a new interface paradigm: an AI workplace experienced as a navigable low-poly office instead of a text dashboard. The office is the dashboard, the NPCs are the agents, the player is the operator, and the editorial workflow becomes gameplay.

This version migrates the runtime to a React architecture built on Vite, TypeScript, Three.js, `@react-three/fiber`, `@react-three/drei`, zustand, `lucide-react`, and `framer-motion`.

## Run locally

```bash
npm install
npm run dev
```

Open the local Vite URL in your browser after the dev server starts.

## Controls

- `WASD` or arrow keys: move the player
- `E`: interact with the nearest MCP NPC
- `ESC`: close the active dialogue panel
- Mouse wheel or `+` / `-`: zoom the orthographic camera
- `Q` / `R`: rotate the camera around the office

## React architecture

The project is now split into scene, state, and UI layers so the office can scale into a richer AI workplace game OS:

```text
src/
  app/
    App.tsx
    GameCanvas.tsx
  scene/
    OfficeScene.tsx
    CameraRig.tsx
    Lighting.tsx
  world/
    OfficeMap.tsx
    Room.tsx
    Furniture.tsx
    HolographicPanels.tsx
    mapConfig.ts
  characters/
    Player.tsx
    MCPCharacter.tsx
    CharacterAccessories.tsx
    characterConfig.ts
  interactions/
    InteractionManager.tsx
    InteractionRadius.tsx
  ui/
    HUD.tsx
    DialogueModal.tsx
    WorkflowStatusLog.tsx
    TaskPanel.tsx
    ActionButton.tsx
  state/
    useGameStore.ts
    useDialogueStore.ts
    useWorkflowStore.ts
  styles/
    global.css
```

## State model

- `useGameStore`: player position, nearby NPC state, pause/settings state, camera targets
- `useDialogueStore`: open/close state for the active MCP console
- `useWorkflowStore`: workflow title, location, tasks, status log, toast state, placeholder MCP actions

## Current prototype features

- Orthographic isometric camera with zoom and rotation adjustment
- Smooth player movement with walkable areas and obstacle collision
- Five MCP NPCs representing the Instagram Editorial System
- Modular multi-room office layout with automatic doors and connected corridors
- Floating in-world labels and interaction prompts rendered inside the R3F scene
- React HUD, task panel, status log, and animated dialogue modal
- Placeholder workflow actions wired through zustand stores for future MCP integrations

## MCP NPCs

- `Brand Brain MCP`: brand registry, tone of voice, constraints, style references
- `Editorial MCP`: post ideas, hooks, carousel structures, captions, editorial briefs
- `Narracao MCP`: narration scripts, voice IDs, audio-ready prompts
- `Design MCP`: design prompts, layout logic, visual direction, image prompt prep
- `Estacao de Saida / Revisao`: review, approval, export packaging, ready-to-publish checks

## Design documents

All creative and design documentation lives in [`docs/`](./docs/):

- **[Game Design Overview](docs/GAME_DESIGN_OVERVIEW.md)** — master GDD, core loop, architecture, consistency audit
- **[Story & Narrative Direction](docs/STORY_AND_NARRATIVE_DIRECTION.md)** — worldbuilding, player fantasy, NPC roles, quests
- **[Art Direction](docs/ART_DIRECTION.md)** — visual pillars, palette, lighting, materials, layout
- **[Icon System](docs/ICON_SYSTEM.md)** — iconography, Lucide mapping, states, colors
- **[Character & NPC Design](docs/CHARACTER_AND_NPC_DESIGN.md)** — avatar, NPC anatomy, animation, interaction
- **[MVP Scope](docs/MVP_SCOPE.md)** — what's in v1, what's deferred, acceptance criteria
- **[Implementation Checklist](docs/IMPLEMENTATION_CHECKLIST.md)** — task-level progress tracker
- **[Player Journey Update Plan](docs/PLAYER_JOURNEY_UPDATE_PLAN.md)** — current phase assessment and the new login -> deck -> connection -> activation -> mission roadmap

The original vision essay is at [`MCP_GAME_VISION.md`](./MCP_GAME_VISION.md) in the project root.

## Future integration ideas

- Connect each dialogue action to real MCP commands and orchestration flows
- Load editorial source documents from Google Drive
- Trigger narration generation from the Narracao MCP
- Trigger design prompt generation and asset packaging from the Design MCP
- Export a final Instagram post package from the Estacao de Saida / Revisao
- Sync editorial status and task progress with a Notion calendar or workflow board

## Integration hooks

The current action buttons are placeholders only. The new integration surface for real MCP orchestration now lives in [src/state/useWorkflowStore.ts](/Users/rochatales/Automations/game-workplace/src/state/useWorkflowStore.ts), where placeholder workflow actions can be replaced with async command dispatch, job tracking, and real status updates.
