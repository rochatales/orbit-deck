# MCP Office — Game Design Overview

> Master reference document — the single source of truth for the project's design.
> Revision: v1.0 · May 2026

---

## 1. Game Identity

| Field | Value |
|---|---|
| **Title** | MCP Office |
| **Genre** | Non-combat operational adventure · Diegetic management sim |
| **Engine** | Three.js (browser, vanilla TypeScript, Vite) |
| **Camera** | Orthographic isometric, offset `(12,12,12)` |
| **Art style** | Low-poly premium · warm neutral palette · color-coded zones |
| **Target** | Business owners who operate AI agent systems |
| **Core metaphor** | The office is the dashboard. The NPCs are the agents. The workflow is the game. |

---

## 2. Core Loop

```
Enter office → Walk to NPC zone → Interact (E) → Read role → Trigger action → Route deliverable → Review at Output → Run complete
```

**One sentence:** The player walks through a spatial AI workplace, talks to specialist NPCs, triggers editorial operations, and shepherds content from brief to publish-ready package.

### Loop breakdown

| Phase | Player verb | System response |
|---|---|---|
| **Navigate** | Walk (WASD) | Camera follows, NPC labels update |
| **Discover** | Approach NPC (proximity) | Hint appears, ring highlights, label focuses |
| **Interact** | Press E | Dialogue panel opens, movement locks |
| **Operate** | Click action button | Log entry, toast feedback, task progress |
| **Route** | Send deliverable to next NPC | Task checked, next objective appears |
| **Review** | Visit Output Station | Final approval, run completion |

---

## 3. Document Map

All design documents live in `docs/`. Each covers one domain:

| Document | Domain | Status |
|---|---|---|
| [GAME_DESIGN_OVERVIEW.md](./GAME_DESIGN_OVERVIEW.md) | Master GDD — you are here | ✅ Current |
| [STORY_AND_NARRATIVE_DIRECTION.md](./STORY_AND_NARRATIVE_DIRECTION.md) | Narrative, worldbuilding, player fantasy, quests | ✅ Current |
| [ART_DIRECTION.md](./ART_DIRECTION.md) | Visual pillars, palette, lighting, materials, layout | ✅ Current |
| [ICON_SYSTEM.md](./ICON_SYSTEM.md) | Iconography, Lucide mapping, states, colors | ✅ Current |
| [CHARACTER_AND_NPC_DESIGN.md](./CHARACTER_AND_NPC_DESIGN.md) | Player avatar, NPC anatomy, animation, interaction | ✅ Current |
| [MVP_SCOPE.md](./MVP_SCOPE.md) | What's in v1, what's deferred, acceptance criteria | ✅ Current |
| [IMPLEMENTATION_CHECKLIST.md](./IMPLEMENTATION_CHECKLIST.md) | Task-level checklist for the prototype | ✅ Current |

### Legacy document

| File | Status | Action |
|---|---|---|
| `MCP_GAME_VISION.md` (root) | Foundational vision essay | Keep as-is — the original manifesto. Not a design spec. |

---

## 4. Cross-Document Consistency Report

### Audit summary (May 2026)

All four creative documents were audited against the codebase. **No inconsistencies found.** Key validated values:

| Value | Source of truth | Confirmed in docs |
|---|---|---|
| MCP accent colors | `mcpData.ts` | Story ✓ · Art ✓ · Icons ✓ · Characters ✓ |
| Office dimensions `20×18` | `createOffice.ts` | Art ✓ · Characters ✓ |
| Camera offset `(12,12,12)` | `camera.ts` | Art ✓ |
| Frustum height `20`, zoom `1.15` | `camera.ts` | Art ✓ |
| Interaction radius `2.3` | `InteractionManager.ts` | Characters ✓ |
| NPC zone names | `mcpData.ts` | Story ✓ · Art ✓ · Characters ✓ |
| Task IDs | `UIManager.ts` / `InteractionManager.ts` | Story ✓ |
| Player color `#ef6f51` | `PlayerController.ts` | Art ✓ · Characters ✓ |
| Material roughness/metalness | `createFurniture.ts`, `createNPC.ts` | Art ✓ · Characters ✓ |
| Shadow map `2048²` | `lights.ts` | Art ✓ |

### Naming consistency

| Entity | Code ID | Display name | Zone name |
|---|---|---|---|
| Brand Brain | `brand-brain` | Brand Brain MCP | Strategy Deck |
| Editorial | `editorial` | Editorial MCP | Editorial Bay |
| Narration | `narration` | Narration MCP | Narration Booth |
| Design | `design` | Design MCP | Design Studio |
| Output | `output-review` | Output / Review Station | Review Console |

All documents use these exact names consistently. ✅

---

## 5. Technical Architecture

### Source structure

```
src/
  main.ts                     ← Game loop, init, event binding
  scene/
    createScene.ts            ← Renderer, fog, tone mapping
    camera.ts                 ← Orthographic camera + follow controller
    lights.ts                 ← Hemisphere + directional + point fill
  world/
    createOffice.ts           ← Floor, walls, zone discs, desks, props
    createFurniture.ts        ← Desk, shelf, mood board, mic, wave panel
    createInstancedDecor.ts   ← Floor tiles, plants, chairs, papers, lights
  player/
    PlayerController.ts       ← Avatar, input, movement, collision
  npcs/
    mcpData.ts                ← MCP config (name, color, position, dialogue, actions)
    createNPC.ts              ← NPC geometry builder
    NPCManager.ts             ← NPC lifecycle, highlight, idle animation
  interactions/
    InteractionManager.ts     ← Proximity detection, dialogue open/close, action dispatch
  ui/
    UIManager.ts              ← HUD, task panel, log, dialogue, labels, toasts
    styles.css                ← Frosted glass UI system
  utils/
    math.ts                   ← damp(), clamp(), collision helpers
```

### Performance budget

| Metric | Current | Target |
|---|---|---|
| Draw calls | ~55 | < 80 |
| Triangles | ~10k | < 15,000 |
| Shadow maps | 1 × 2048² | 1 × 2048² |
| Frame time | ~4ms | < 16ms (60fps) |

---

## 6. What Each Document Owns

To avoid overlap and conflicting guidance, each document has a strict ownership domain:

| Decision type | Owned by |
|---|---|
| Why the player does things, quest order, NPC personality | **Story** |
| What things look like — colors, shapes, lighting, layout | **Art Direction** |
| Which icon represents what, Lucide names, state colors | **Icon System** |
| How characters are built, proportions, animations | **Character Design** |
| What's in the prototype vs. what's deferred | **MVP Scope** |
| Task-level implementation plan | **Implementation Checklist** |
| Cross-cutting decisions, core loop, architecture | **This document** |

If two documents disagree, **this document** (Game Design Overview) takes precedence.

---

## 7. Design Principles (Project-Wide)

These apply across all documents and all future work:

1. **The office is the interface.** Every design decision must reinforce the spatial metaphor. If it breaks immersion, remove it.
2. **Clarity over cleverness.** The player should never be confused about what to do next or who does what.
3. **Premium, not playful.** The tone is a high-end creative studio, not a cartoon game.
4. **Code is the source of truth.** Documents describe the code. If they diverge, the code wins (and the doc gets updated).
5. **Ship small, expand later.** The prototype proves the concept. Everything else is Phase 2+.
6. **No dead-end features.** Everything in the MVP must connect to the core loop. No orphan UI, no decorative-only systems.

---

## 8. Emotional Targets

| Moment | Target feeling |
|---|---|
| First load | "This is beautiful and I want to explore." |
| Walking around | "This feels calm and purposeful." |
| First NPC interaction | "Oh, I understand — each agent has a job." |
| Completing first run | "I just operated an AI pipeline by walking through an office." |
| Returning | "I know exactly where to go and what to do." |
