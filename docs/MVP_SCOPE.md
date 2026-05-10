# MCP Office — MVP Scope

> Defines exactly what's in the first playable prototype and what's deferred.
> Revision: v1.0 · May 2026

---

## 1. MVP Definition

The MVP (Minimum Viable Prototype) is a **vertical slice** that proves one thesis:

> **A 3D office can function as an intuitive interface for orchestrating AI agents.**

The player must be able to walk through the office, talk to all 5 MCP NPCs, trigger placeholder actions, and complete one full editorial run — in under 3 minutes.

---

## 2. What's IN the MVP

### ✅ Already implemented

| Feature | File(s) | Status |
|---|---|---|
| Low-poly office (20×18, walls, floor tiles, rug) | `createOffice.ts`, `createInstancedDecor.ts` | ✅ Done |
| Orthographic isometric camera with smooth follow | `camera.ts` | ✅ Done |
| WASD + arrow key player movement with collision | `PlayerController.ts` | ✅ Done |
| Player avatar (coral body, visor, walk bob) | `PlayerController.ts` | ✅ Done |
| 5 MCP NPCs with unique accent colors | `mcpData.ts`, `createNPC.ts` | ✅ Done |
| NPC idle bob animation + ring highlight | `NPCManager.ts` | ✅ Done |
| Proximity-based interaction prompt (E key) | `InteractionManager.ts` | ✅ Done |
| Dialogue panel with NPC name, role, dialogue, actions | `UIManager.ts` | ✅ Done |
| Placeholder action buttons (log-only) | `InteractionManager.ts` | ✅ Done |
| 4-step task panel (Run 1: First Contact) | `UIManager.ts` | ✅ Done |
| Status log (6 entries max) | `UIManager.ts` | ✅ Done |
| Floating NPC labels (frosted glass, accent bar) | `UIManager.ts` | ✅ Done |
| Toast notifications | `UIManager.ts` | ✅ Done |
| HUD bars (workspace + workflow) | `UIManager.ts` | ✅ Done |
| Zone discs (color markers on floor) | `createOffice.ts` | ✅ Done |
| Zone props (desks, mood boards, shelf, mic, wave panel) | `createFurniture.ts`, `createOffice.ts` | ✅ Done |
| Instanced decor (plants, chairs, papers, ceiling lights) | `createInstancedDecor.ts` | ✅ Done |
| Window strips | `createFurniture.ts` | ✅ Done |
| Fog + ACES tone mapping | `createScene.ts` | ✅ Done |
| 3-light rig (hemisphere, directional, point fill) | `lights.ts` | ✅ Done |
| Shadow mapping (2048²) | `lights.ts` | ✅ Done |
| ESC to close dialogue | `InteractionManager.ts` | ✅ Done |
| Responsive UI scaling (≤960px breakpoint) | `styles.css` | ✅ Done |

### 🔲 Planned for MVP (not yet implemented)

| Feature | Priority | Effort |
|---|---|---|
| Welcome toast on first load ("Welcome to MCP Office…") | High | 15 min |
| Run completion toast ("First run complete") | High | 15 min |
| NPC face-player when dialogue opens | Medium | 30 min |
| Icon integration (Lucide icons in action buttons) | Medium | 1 hour |
| Subtle action feedback (log + toast per action) | Low | 30 min |

---

## 3. What's NOT in the MVP

### 🚫 Explicitly deferred

| Feature | Why deferred | Target phase |
|---|---|---|
| Real MCP API calls | Prototype proves UX, not backend | Phase 2 |
| Backend / server | No server needed for prototype | Phase 2 |
| Authentication / login | Single-player prototype | Phase 3 |
| Multiple clients/brands | Requires Brand Brain data switching | Phase 2 |
| Run 2 ("Voice and Vision") | Requires Narration MCP task flow | Phase 2 |
| Run 3 ("Full Production") | Requires all-action completion tracking | Phase 2 |
| GLTF/GLB model loading | Primitives are sufficient for MVP | Phase 3 |
| Skeletal animation / rigging | Procedural animation works for MVP | Phase 3 |
| Sound design / audio | Visual-only prototype | Phase 2 |
| Voice lines / TTS | Requires Narration MCP integration | Phase 3 |
| Multiplayer | Single-operator MVP | Phase 5 |
| Inventory / items | No items in the core loop | Not planned |
| Combat / health / damage | Non-combat game | Never |
| Day/night cycle | Time = workflow runs, not clock time | Not planned |
| Complex quest branching | Linear task flow for MVP | Phase 2 |
| NPC memory / conversation history | Requires state persistence | Phase 3 |
| Minimap | Office is small enough to navigate without one | Phase 2 |
| Settings menu | Not needed for prototype | Phase 2 |
| Save/load game state | Session-only for prototype | Phase 2 |
| Mobile touch controls | Desktop keyboard-only for MVP | Phase 2 |
| External 3D model loading | Primitives only | Phase 3 |
| Custom shaders | `MeshStandardMaterial` only | Phase 3 |
| Post-processing (bloom, SSAO) | Not needed at this fidelity | Phase 3 |

---

## 4. MVP Acceptance Criteria

The prototype is **complete** when a new player can:

- [ ] Load the page and see the office render within 2 seconds
- [ ] Understand WASD movement without instructions (controls are discoverable)
- [ ] Walk to Brand Brain and see the interaction prompt
- [ ] Press E and read Brand Brain's role and actions
- [ ] Complete all 4 tasks in the task panel by visiting the right NPCs
- [ ] See a completion toast after finishing the run
- [ ] Navigate the entire office without getting stuck on collision
- [ ] Identify each NPC by color and floating label from a distance
- [ ] Close dialogues with ESC and resume walking
- [ ] Run at 60fps on a mid-range laptop (2020+ hardware)

---

## 5. Phase Roadmap

| Phase | Theme | Key additions |
|---|---|---|
| **MVP** (current) | Prove the spatial interface concept | Walk, talk, complete one run |
| **Phase 2** | Connect to real operations | MCP API calls, multiple runs, sound, multi-client |
| **Phase 3** | Visual upgrade | GLTF models, animations, post-processing, mobile |
| **Phase 4** | Intelligence | NPC memory, workflow state visualization, urgency system |
| **Phase 5** | Scale | Multiplayer, rooms/floors, team workflows |

---

## 6. Technical Constraints

These constraints protect the MVP from scope creep:

| Constraint | Rule |
|---|---|
| **No external models** | All geometry from Three.js primitives |
| **No custom shaders** | `MeshStandardMaterial` and `MeshLambertMaterial` only |
| **No physics engine** | Manual AABB collision is sufficient |
| **No state management library** | Plain TypeScript classes |
| **No React/Vue/Svelte** | Vanilla DOM manipulation via `UIManager` |
| **No database** | All state is session-only |
| **No build complexity** | Vite dev server, no SSR, no API routes |
| **No package bloat** | Only dependencies: `three`, `typescript`, `vite` |
| **< 80 draw calls** | Use `InstancedMesh` for repeated props |
| **< 15k triangles** | Low-poly is a feature, not a limitation |
