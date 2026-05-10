# MCP Office — Implementation Checklist

> Task-level checklist for the first playable prototype.
> Revision: v1.0 · May 2026

> Note: this checklist tracks the original playable prototype. For the current product phase assessment and the new login -> deck -> connection -> activation -> mission roadmap, use [PLAYER_JOURNEY_UPDATE_PLAN.md](./PLAYER_JOURNEY_UPDATE_PLAN.md).

---

## Status Legend

- ✅ Done — implemented and verified
- 🔲 Todo — planned for MVP
- 🔜 Next — Phase 2 candidate
- ⏳ Future — Phase 3+

---

## 1. Scene & Rendering

- ✅ Three.js scene with `ACESFilmicToneMapping` + `SRGBColorSpace`
- ✅ `WebGLRenderer` with `antialias`, pixel ratio capped at `2`
- ✅ Scene background `#f6efe2`
- ✅ Fog `#f6efe2`, near `18`, far `34`
- ✅ Shadow mapping enabled, single directional light `2048²`
- 🔲 Verify 60fps on mid-range laptop (Chrome DevTools performance audit)

## 2. Camera

- ✅ `OrthographicCamera`, frustum height `20`, zoom `1.15`
- ✅ Isometric offset `Vector3(12, 12, 12)`
- ✅ Smooth follow with `damp(…, 5, delta)`
- ✅ Resize handler updates frustum on window resize

## 3. Lighting

- ✅ `HemisphereLight` — sky `#fff5df`, ground `#c1b39d`, intensity `1.25`
- ✅ `DirectionalLight` — white, intensity `1.8`, position `(8, 14, 6)`, shadow bias `-0.0003`
- ✅ `PointLight` — `#fff0cc`, intensity `18`, range `26`, decay `2`, position `(0, 6.5, 0)`

## 4. Office Environment

- ✅ Floor: instanced tiles `20×18` grid, tile size `1`, color `#efe6d6`
- ✅ Warm base plane `#d8c2a6` beneath tiles
- ✅ 4 walls (back `#fcf9f1`, front `#f7f1e4`, sides `#fffaf2`), height `3.2`
- ✅ 2 window strips on back wall, `#dff5ff`, semi-transparent
- ✅ Center rug `#f4e6c7`, `6.4×4.2`
- ✅ Center hub pillar `1.2×0.72×1.2`, collision registered
- ✅ 6 instanced ceiling lights with emissive
- ✅ 6 instanced plants (pot + 2 leaf spheres each)
- ✅ 5 instanced chairs with rotation
- ✅ 8 instanced paper props
- ✅ 3 path marker papers near center

## 5. Zone Props

- ✅ Brand Brain: desk + mood board (gold stripe) + shelf (gold books)
- ✅ Editorial: desk (rotated 90°) + mood board (blue stripe)
- ✅ Narration: desk (rotated 90°) + microphone station + wave panel
- ✅ Design: desk (rotated -90°) + mood board (green stripe) + shelf (green books)
- ✅ Output: wide desk (3.4 units, rotated 180°)
- ✅ Zone discs: per-MCP accent color, `opacity: 0.16`, `2.8×2.8`
- ✅ Collision rectangles for all desks and shelves

## 6. Player

- ✅ Avatar: body `#ef6f51`, head `#f7f2eb`, legs `#31465f`, visor `#31465f`
- ✅ `CylinderGeometry(0.32, 0.36, 0.8, 8)` body
- ✅ WASD + arrow key input
- ✅ Speed `4.6` units/sec, collision radius `0.42`
- ✅ Walk bob `sin(walkTime) × 0.06`, walk timer `delta × 8`
- ✅ Smooth rotation toward movement direction
- ✅ Movement disabled during dialogue
- ✅ Circle-vs-rect collision against all obstacles

## 7. NPCs

- ✅ 5 NPCs built from `MCPConfig` data
- ✅ Shared anatomy: pedestal, ring, legs, body, arms, head (8 meshes each)
- ✅ Per-NPC accent color on body + ring
- ✅ Emissive accent on body (`×0.12`) and ring (`×0.15`)
- ✅ Label anchor at `y = 2.25`
- ✅ Idle bob: `sin(now × 0.0018 + index × 0.6) × 0.05`
- ✅ Ring highlight: scale `1.0 → 1.12`, emissive `0.15 → 0.42` when focused
- ✅ Ring opacity: `0.9 → 1.0` when focused
- 🔲 NPC face-player rotation when dialogue is open

## 8. Interaction System

- ✅ Nearest-NPC detection within `2.3` units
- ✅ Interaction hint: "Press E to interact with {name}"
- ✅ E key opens dialogue, ESC closes dialogue
- ✅ Player movement locks during dialogue
- ✅ Default hint when no NPC nearby: "Walk up to an MCP desk…"
- ✅ Location HUD updates with zone name on approach
- ✅ Brand Brain interaction marks `talk-brand-brain` task

## 9. Dialogue Panel

- ✅ Modal backdrop `rgba(20, 27, 38, 0.22)`
- ✅ Frosted glass panel `620px` max, `border-radius: 28px`
- ✅ Kicker text "MCP Node"
- ✅ NPC name (h2, `32px`)
- ✅ Role description
- ✅ Dialogue text
- ✅ Action buttons: gradient `#273852 → #406a7a`, hover lift
- ✅ ESC button (top-right)
- 🔲 NPC role icon (Lucide) before kicker text
- 🔲 Action icons (Lucide) inside action buttons

## 10. Task Panel

- ✅ "Current Run" title
- ✅ 4 tasks: Talk to Brand Brain → Generate Brief → Send to Design → Review at Output
- ✅ Task completion via `markTask(id)`
- ✅ Visual states: incomplete (`#d8c7aa` dot) / completed (`#27ae60` dot + green text)
- 🔲 Run completion toast when all 4 tasks are done
- 🔲 Task progression — show tasks 2–4 only after task 1 is complete (optional polish)

## 11. Status Log

- ✅ Bottom-left panel, frosted glass
- ✅ Prepends new entries, max 6 visible
- ✅ Boot messages: controls hint + welcome
- ✅ Action-triggered log entries: "{NPC}: {action} triggered"

## 12. Toast System

- ✅ Top-center pill, frosted glass
- ✅ Fade-in/slide-up animation, `180ms ease`
- ✅ Auto-dismiss after `1800ms`
- ✅ Action-triggered toasts
- 🔲 Welcome toast on first load
- 🔲 Run-complete toast on all tasks finished

## 13. Floating Labels

- ✅ HTML overlay projected from 3D anchor
- ✅ NPC name + zone name
- ✅ Accent color bar (bottom `::before`)
- ✅ Focus state: `scale(1.05)` when player is nearby
- ✅ Hidden when behind camera (`z > 1`)

## 14. UI System

- ✅ `.ui-root` overlay, `pointer-events: none` by default
- ✅ Frosted glass: `backdrop-filter: blur(18px)`, `rgba(255,251,245,0.72)`
- ✅ HUD bars (top-left: workspace, top-right: workflow)
- ✅ Responsive scaling at `≤960px`
- ✅ Font stack: `"Avenir Next", "Segoe UI", sans-serif`

## 15. Icons (Lucide Integration)

- 🔲 Install `lucide` package
- 🔲 Create `src/ui/icons/mcpIcons.ts` — 5 NPC role icons
- 🔲 Create `src/ui/icons/actionIcons.ts` — 14 action icons
- 🔲 Create `src/ui/icons/stateIcons.ts` — 7 workflow state icons
- 🔲 Create `src/ui/icons/iconUtils.ts` — `createIcon()` helper
- 🔲 Add icon to dialogue panel kicker
- 🔲 Add icons to action buttons
- 🔲 Add CSS keyframes for `icon-spin`, `icon-pulse`, `icon-shake`

## 16. Onboarding Polish

- 🔲 Welcome toast: "Welcome to MCP Office. Walk around and meet your team."
- 🔲 Run-complete toast: "First run complete — First Contact."
- 🔲 Log entry on run completion
- 🔲 Consider progressive task reveal (show next tasks after completing the first)

---

## 17. Deferred — Phase 2

- 🔜 Real MCP API integration (replace placeholder action handlers)
- 🔜 Run 2: "Voice and Vision" (Narration MCP task flow)
- 🔜 Run 3: "Full Production" (all NPCs, all actions)
- 🔜 Multiple client/brand switching in Brand Brain
- 🔜 Sound design (ambient office, interaction sounds)
- 🔜 Minimap
- 🔜 Settings menu
- 🔜 Save/load state
- 🔜 Mobile touch controls
- 🔜 Notion calendar sync

## 18. Deferred — Phase 3+

- ⏳ GLTF model loading (replace primitive characters)
- ⏳ Skeletal animation / rigging
- ⏳ Post-processing (bloom, SSAO)
- ⏳ Custom shaders
- ⏳ NPC memory / conversation history
- ⏳ Voice lines / TTS integration
- ⏳ AI-generated avatars
- ⏳ Multiplayer
- ⏳ Rooms and floors expansion
- ⏳ Urgency / priority visualization
