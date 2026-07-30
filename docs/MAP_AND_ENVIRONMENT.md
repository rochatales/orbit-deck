# MCP Office — Map and Environment

> Single source of truth for the office layout, rooms, and exterior areas.
> Replaces `MAP_AND_ENVIRONMENT_DIRECTION.md` and `MAP_OPTIMIZATION_PASS.md`.
>
> Revision: v2.0 · May 2026

---

## 1. Spatial concept

MCP Office is organised as an **AI headquarters** with a central control hub
and five specialist rooms plus two extension zones. The architecture is
glass-first, white-and-ice-blue, with cyan technological accents and
deliberately partial walls so the isometric camera can read every space.

The reference influence that drives this direction:

- **Room graph instead of one open hall** — distinct connected rooms around
  a central hub.
- **Clean white + icy blue material language** — premium sci-fi, not warm
  studio.
- **Glass-first architecture** — partial transparent walls preserve
  isometric readability.
- **Soft cyan technological glow** — holographic screens, room panels, and
  accent lights set an AI-operations atmosphere without going dark
  cyberpunk.

---

## 2. Room graph

| Room / Area | Position (approx.) | Purpose |
|---|---|---|
| Central Hub | `(0, 0)` | Player spawn, shared lounge, route connector |
| Brand Brain (Eden) | North | Strategy, brand control, large wall display |
| Editorial (Mister) | West | Calendar logic, floating content cards, multi-screen desk |
| Design (Max) | East | Visual wall, layout frames, palette stand |
| Narration (Nara) | South-west | Microphone booth, wave screen, acoustic panels |
| Output / Review (Astra) | South-east | Review screen, checklist console, export terminal |
| **Smart Lab** | `{ x: 6.5, z: -10 }` | Diagnostic console between Brand Brain and Design |
| **Orbit Garden** | `{ x: 12.5, z: 23.5 }` | Outdoor breathing space on the east exterior edge |

Corridors link every room to the hub. A `lab-connector` corridor explicitly
threads Brand Brain → Smart Lab → Design so the strategy-to-visual flow has
a physical path.

```
            ┌────────────────────────────────┐
            │     BRAND BRAIN (Eden, north)  │
            │                                │
            │     ┌──Smart Lab──┐            │
            │     │ diagnostics │            │
            │     └─────────────┘            │
            │                                │
EDITORIAL  ─┼──────  CENTRAL HUB  ──────┼─  DESIGN
 (Mister,   │            ◯                │   (Max,
  west)     │       lounge/island          │    east)
            │                                │
            │   NARRATION              REVIEW/SOCIAL │
            │   (Nara, SW)             (Astra, SE)   │
            └────────────────────────────────┘
                              ↳ corridor opens to
                                ORBIT GARDEN (outdoor, east)
```

---

## 3. Architectural rules

1. **Partial walls only.** Rooms are never fully sealed boxes. Front-facing
   edges stay visually light or open so the camera can see through.
2. **Walkway width ≥ 2 units.** Player capsule (~0.42 radius) needs clearance.
3. **Glass over solid where possible.** Internal partitions use
   low-opacity cyan glass to maintain readability.
4. **Hub-and-spoke flow.** Every room exits toward the central hub, never
   directly into another room.
5. **Centre stays open.** Lounge / island desk sits at the hub. Props cluster
   on the room sides, not in walkways.
6. **Ceiling presence is light.** A grid of cyan ceiling lights (instanced)
   marks the hub. Rooms get single accent point lights.

---

## 4. Modular asset system

Primitive assets live in
`src/world/assets/createModularAssets.ts`:

- `createFloorTile()` — instanced pale-blue tiles
- `createWallSegment()` — matte white walls
- `createGlassWall()` — low-opacity cyan panels
- `createDesk()` — white shell with accent strip
- `createChair()` — instanced low-poly chairs
- `createScreen()` — emissive monitor face
- `createHologramPanel()` — translucent floating screen
- `createDoorFrame()` — open arch with accent rail
- `createPlant()` — instanced pot + foliage spheres
- `createRoomLabel()` — `troika-three-text` floating label

Higher-level assembly lives in `src/world/createOfficeMap.ts` (still used by
the legacy vanilla module) and in the React component `src/world/OfficeMap.tsx`
plus `src/world/Room.tsx`, `Furniture.tsx`, and `HolographicPanels.tsx`.

Data centralised in `src/world/mapConfig.ts`.

---

## 5. Smart Lab

Why it exists: the Smart Lab is the **bridge between strategy and
production**. By physically placing it between Brand Brain and Design
Studio, the player passes through a logical checkpoint where brand
intelligence is validated and prompt diagnostics happen before visual work.

Visual identity:

- Same `ROOM_WALL_HEIGHT`, pale floor tiles, and glass panels as the rest of
  the facility.
- Subtle cyan + green + gold accent lights (no flooding — small punctuation).
- Reuses `createHologramPanel`, `createScreen`, and side-console primitives.

Interaction surface: the Smart Lab Console (`SmartLabConsole` inside
`src/ui/DialogueModal.tsx`) opens when the player approaches the central
monitor inside the lab. It has two screens (Overview + Brand Rules) and a
chat dock that talks to `/api/smart-lab/chat`.

Future hooks:

- Mini-game for prompt tuning — drag attribute sliders to "tune" image
  prompts.
- Brand-token pickup — manually carry tokens from Brand Brain into the Smart
  Lab to unlock high-fidelity Design outputs.

---

## 6. Orbit Garden

Why it exists: the Garden adds **creative oxygen** — a calm outdoor zone
that breaks up the interior office and prevents the world from feeling like
a rigid dashboard.

Visual identity:

- Sits on the existing warm-brown ground band (`#B68C5E`).
- Low-poly instanced trees in clusters, plus white minimal furniture
  (circular tables, simple benches).
- Ambient cyan / mint glowing garden lamps (low geometry, billboarded glow).
- Low borders — nothing tall enough to block the isometric camera.

Future hooks:

- **Mission debriefing**: completed packages projected holographically over
  the garden table.
- **Character lore**: NPCs occasionally migrate to the garden and drop
  insights or side-quests.

---

## 7. Lighting direction (per area)

| Area | Treatment |
|---|---|
| Hub | Cyan central point light, ceiling grid of cool whites |
| Eden (Brand Brain) | Warm gold wash on the back wall, soft directional fill |
| Mister (Editorial) | Cool blue rim along the desk, neutral key light |
| Max (Design) | Green accent strip on the mood board, neutral key |
| Nara (Narration) | Slightly dimmer than the rest, purple rim on the wave screen |
| Astra (Review) | Bright white-cyan finish lights — feels like the "publish" stage |
| Smart Lab | Cool white + small green/gold console points |
| Orbit Garden | Soft directional daylight + low cyan/mint lamps |

Global tone: clean, intelligent, calm, premium. No dramatic contrast. No
saturated coloured lights.

---

## 8. Navigation and readability

- The orthographic isometric camera is fixed in angle; the player rotates
  the camera with `Q` / `R` and zooms with the mouse wheel or `+` / `-`.
- Rooms use partial walls and open arches so adjacent space is visible.
- Collision is provided by Rapier — colliders are generated from room
  obstacle bounds, not from visual meshes.
- `troika-three-text` keeps in-world labels readable from the camera.

---

## 9. Future expansion candidates

- **Additional MCP rooms** when new agents come online (Analytics Corner,
  Video Production Suite, Social Media Room as a dedicated space rather
  than the current Output dual-purpose station).
- **Multiple floors** — connected by stairs or lifts, so spatial memory
  scales without making any single floor sprawling.
- **Workflow heatmaps and urgency lights** — corridor LEDs that change
  based on which agent is busy or waiting.
- **Mission-based room reconfiguration** — table layouts in the hub shift
  to reflect the active mission archetype.

These are tracked in `ROADMAP.md` under deferred Phase 4+ items.
