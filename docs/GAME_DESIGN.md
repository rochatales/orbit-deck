# MCP Office — Game Design

> Master reference for the project's design principles. Pairs with `ROADMAP.md`
> (current status + milestones), `STORY_AND_NARRATIVE.md`, `ART_DIRECTION.md`,
> `MAP_AND_ENVIRONMENT.md`, and `CHARACTERS.md`.
>
> Revision: v2.0 · May 2026

---

## 1. Identity

| Field | Value |
|---|---|
| **Title** | MCP Office |
| **Genre** | Non-combat operational adventure · Diegetic management sim |
| **Engine** | React + Three.js (R3F) + Rapier physics, Vite/TypeScript |
| **Camera** | Orthographic isometric, smooth follow, mouse-wheel zoom, `Q`/`R` rotation |
| **Art style** | Premium low-poly · clean white sci-fi HQ · cyan glow + per-deck accents |
| **Audience** | Operators and business owners running AI agent systems |
| **Core metaphor** | The office is the dashboard. The NPCs are the agents. The mission is the game. |

---

## 2. Core loop

```
Login → choose a deck (orbital map) → enter the office
     → walk to an agent → activate the deck → run a mission
     → handoff between agents → review at Astra → published
```

Tight one-sentence form: the player walks through a spatial AI workplace,
activates each MCP by visiting its agent, and ships content packages by
routing missions between specialists until Astra approves the run.

### Loop verbs

| Phase | Player verb | System response |
|---|---|---|
| Navigate | Walk (WASD / joystick) | Camera follows, NPC labels update |
| Discover | Approach an agent | Hint pill appears, billboard updates |
| Activate | Press `E` near agent | Activation balloon → deck lights up on orbital map |
| Operate | Press an action in dialogue | Workflow store fires, log + toast feedback |
| Route | Send deliverable to next agent | Task ticked, mission state advances |
| Review | Visit Astra | Approve / export, run marked `published` |

---

## 3. Design principles (project-wide)

1. **The office is the interface.** Every UI surface must reinforce the
   spatial metaphor. If it breaks immersion without paying its way, cut it.
2. **Clarity over cleverness.** Players should never wonder what to do next
   or who does what.
3. **Premium, not playful.** The tone is a high-end creative studio, not a
   cartoon game.
4. **Code is the source of truth.** Documents describe the code. If they
   diverge, update the doc.
5. **Ship small, expand later.** The MVP proves the concept. Phase 2+ adds
   real connectors and depth.
6. **No dead-end features.** Everything in the MVP must connect to a real
   mission flow — no orphan UI, no decorative-only systems.

---

## 4. Player fantasy

> *I am the Creative Director of an AI-powered studio. My office is alive.
> My team never sleeps. I walk through the space, coordinate specialists,
> and ship premium content by being present and making decisions.*

| Moment | Target feeling |
|---|---|
| First load | "This is beautiful and I want to explore." |
| Walking around | "This feels calm and purposeful." |
| First activation | "Oh, each agent has a job. I just lit one up." |
| Completing a run | "I just operated an AI pipeline by walking through an office." |
| Returning | "I know exactly where to go." |

What the player should **never** feel: lost in lore, confused about next
steps, like they're playing a children's game, or like they're reading a
technical manual.

---

## 5. World rules

1. **The office is the dashboard.** Every piece of information the player
   needs is embedded in the environment — NPC billboards, zone names, ambient
   status cues. External menus break the spatial illusion.
2. **NPCs are operational, not fictional.** They have roles, capabilities,
   and deliverables — not backstories or personal drama.
3. **Movement is navigation.** Walking to a desk is the equivalent of opening
   a tool. Proximity replaces menu hierarchies.
4. **Actions become real over time.** Every dialogue button maps to a
   future (or current) MCP command. Even placeholders feel operational.
5. **Time is workflow time.** No day/night, no seasons. Time = missions.

---

## 6. Decision ownership

To avoid overlap, each document owns a strict domain. If two documents
disagree, this document and the code win.

| Decision type | Owned by |
|---|---|
| Mission ordering, NPC personality, story beats | `STORY_AND_NARRATIVE.md` |
| Colors, materials, lighting, UI, typography | `ART_DIRECTION.md` |
| Office layout, rooms, environmental expansions | `MAP_AND_ENVIRONMENT.md` |
| Character anatomy, animation, asset pipeline, physics | `CHARACTERS.md` |
| Phase status, milestones, open product questions | `ROADMAP.md` |
| Cross-cutting principles, core loop, identity | This document |

---

## 7. Performance budget

| Metric | Target |
|---|---|
| Draw calls | < 120 (multi-room + GLB characters) |
| Triangles | < 35,000 |
| Shadow map | Single `2048²` directional |
| Pixel ratio | `min(devicePixelRatio, 2)` |
| Frame time | < 16ms on a mid-range 2020+ laptop |

---

## 8. Constraints that protect scope

| Constraint | Rule |
|---|---|
| No combat / health / damage | Non-combat game by design |
| No inventory or item collection | Not part of the loop |
| No day/night cycle | Time = missions, not clock |
| No multiplayer in MVP | Single operator only |
| No authored skeletal animation in MVP | Procedural rigging covers idle / walk / interact / action |
| No custom shaders in MVP | `MeshStandardMaterial` is sufficient |
| Single source of truth for clients | `useClientSetupStore` until M2 consolidation |
