# MCP Office — Pixel Interaction Visual Roadmap

> Companion to `BRAND_BRAIN_INTERACTION_SCREEN_ROADMAP.md`.
> That doc tracks *what* the EDEN screen should do, patch by patch.
> This doc locks down *how* it should look, and how every other MCP NPC
> (Mister, Max, Nara, Astra) inherits the same visual grammar so the
> pixel art stays neat and on-model with the reference frame.
>
> Revision: v1.0 · 17 May 2026
> Owner: Tales Rocha
> Reference asset: `docs/_reference/Interaction_EDEN.jpeg` (target only,
> never shipped as a runtime texture — see Patch 0 in the companion doc).

---

## 1. Why this doc exists

Patch 5 of `BRAND_BRAIN_INTERACTION_SCREEN_ROADMAP.md` shipped a
reusable scene shell. The pipeline now opens an isometric pixel-art
stage for any NPC and pumps a dialogue flow through it. Visually,
however, the patch is still a placeholder pass:

- Portraits, background, bubble and badge each draw at a different
  effective pixel size (164×224, 480×270, 472×152, 128×40 onto planes
  of unrelated sizes). The "pixel grid" breaks under upscale.
- Bubble text uses raw `monospace` at 22–26 px on a high-DPI canvas,
  so glyphs anti-alias and lose the chunky bitmap feel from the
  reference.
- Glow planes use `LinearFilter`; portrait/bubble use `NearestFilter`.
  Mixing samplers on the same composite produces hybrid sharpness.
- Eden's placeholder palette (pink/peach + cyan rim) is faithful to
  the reference image but conflicts with the documented gold accent
  in `ART_DIRECTION.md §3`.
- Background is bespoke to Brand Brain. Mister/Max/Nara/Astra would
  each need a one-off canvas if we shipped four more scenes today,
  guaranteeing drift.

The fix is not "polish one screen." The fix is a set of locked rules
plus a phased roll-out plan that makes neatness cheap to maintain.

---

## 2. Locked visual rules

These constants are the contract every NPC interaction screen must
honour. Changing one of them is a project-wide decision, not a
per-NPC choice.

### 2.1 Stage and pixel grid

| Constant | Value | Notes |
|---|---|---|
| Stage world size | `960 × 540` units | Matches `PIXEL_STAGE_WIDTH/HEIGHT`. |
| Master pixel unit (`PX`) | `4 world units` | One "art pixel" = 4 world units. |
| Logical resolution | `240 × 135` art pixels | `960 / 4 = 240`, `540 / 4 = 135`. |
| Camera | Orthographic, frustum `±480 × ±270`, `z = 10`. | Already configured. |
| Renderer | `dpr = 1`, `antialias: false`, `flat`. | Already configured. |
| CSS upscale | `image-rendering: pixelated` on the canvas. | Already configured. |

Implementation requirement: introduce a `PX = 4` export in
`pixelSceneTextures.ts` and **every** plane size, every portrait
canvas, every bubble, every badge expresses its dimensions as
`N * PX`. No raw odd numbers, no fractional positions.

Acceptance: zoom the screenshot to 800% — vertical and horizontal
edges of all sprites land on the same grid lines.

### 2.2 Sampling and materials

| Layer | Filter | Material |
|---|---|---|
| Background canvas | `NearestFilter` | `meshBasicMaterial`, `toneMapped: false` |
| Portrait canvas | `NearestFilter` | `meshBasicMaterial`, `transparent` |
| Bubble canvas | `NearestFilter` | `meshBasicMaterial`, `transparent` |
| Glow / vignette | `LinearFilter` is fine **but** mask must be drawn at the same `PX` grid so the soft falloff still aligns. | Same. |
| Badges (ESC, hint) | `NearestFilter` | Same. |

Rule: anything that carries silhouette uses Nearest. Anything that is
pure light (vignette, rim glow) may stay Linear, but its plane must
sit on a `PX`-aligned position.

### 2.3 Source canvas sizes

To stop the current 1×/2× drift, each surface has a fixed source
size that already matches its destination plane at exactly 2× upscale
(2 device pixels per art pixel on the 960×540 stage):

| Surface | Canvas (px) | Plane (world units) | Upscale |
|---|---|---|---|
| Background | `240 × 135` | `960 × 540` | 4× |
| NPC portrait (large, e.g. EDEN) | `80 × 112` | `320 × 448` | 4× |
| Player portrait | `56 × 88` | `224 × 352` | 4× |
| Speech bubble | `120 × 40` | `480 × 160` | 4× |
| Action badge (ESC, hint) | `28 × 9` | `112 × 36` | 4× |
| Glow / vignette | `64 × 64` linear | per-instance | — |

These are the only valid sizes. New NPCs reuse them.

> Migration note: today's canvases (164×224 for EDEN, 480×270 for the
> background, 472×152 for the bubble) all collapse to a clean 4×
> upscale of the values above. Patch B redraws them on the new grid.

### 2.4 Colour discipline

Each NPC owns an accent triplet `{ rim, glow, accentText }` that is
the **only** colour allowed to leak into shared shell elements
(bubble border highlight, ESC badge underline, speaker label).

| NPC | rim | glow | accentText |
|---|---|---|---|
| EDEN (Brand Brain) | `#F2C94C` | `rgba(242, 201, 76, 0.42)` | `#FFE08A` |
| MISTER (Editorial) | `#2F80ED` | `rgba(47, 128, 237, 0.40)` | `#9CC2FF` |
| MAX (Design) | `#27AE60` | `rgba(39, 174, 96, 0.40)` | `#7FE3A6` |
| NARA (Narration) | `#9B51E0` | `rgba(155, 81, 224, 0.40)` | `#D5A8FF` |
| ASTRA (Output/Social) | `#00C2FF` | `rgba(0, 194, 255, 0.40)` | `#9EEFFF` |

The shared "scene-cool" base (deep navy `#070b16` background, ice
white `#dff6ff` bubble border, ice text `#edf8ff`) is identical for
every NPC. That's what makes the suite read as one product.

The current EDEN placeholder rim (`rgba(102, 238, 255, …)`) violates
the gold accent rule — it survived from the reference frame, which
uses cyan because the reference NPC happens to wear a glass dome.
Replace it with the gold rim during Patch B.

### 2.5 Typography

Bitmap-style only. Two options, both acceptable; pick one in Patch B
and use it everywhere.

1. **Web font, pixel face.** Add `Press Start 2P` or `Pixelify Sans`
   via `@font-face` to `global.css`. Sizes are quantised:
   `8px` (speaker label), `10px` (body), `8px` (badges). Canvas
   `imageSmoothingEnabled = false` and `ctx.textBaseline = "top"`.
2. **Hand-rolled bitmap font.** A small 5×7 sprite atlas drawn on a
   transparent canvas, blitted glyph by glyph. Cheapest visually but
   costs an asset.

Either way, the line `26px monospace` in
`createSpeechBubbleTexture` must die. It is the single biggest
contributor to the "not pixel art" feel of the current bubble.

### 2.6 Bubble: 9-slice, not fixed canvas

Replace the single-canvas bubble with a 9-slice frame:

- `bubble-corner-tl/tr/bl/br.png` (4×4 art px each)
- `bubble-edge-h.png`, `bubble-edge-v.png` (4×4 tiles)
- `bubble-center.png` (1×1 art px, tinted)
- `bubble-tail-left.png`, `bubble-tail-right.png`

Compose them at runtime onto a canvas sized to the actual text. This
lets the bubble grow vertically for longer prompts without distorting
the border, and lets the tail flip when the player speaks (reference
shows the tail pointing at whoever is talking).

### 2.7 Lighting recipe (per scene)

All five NPC scenes use the same three-layer recipe:

1. **Base navy plane** at `z = -10`, colour `#070b16`.
2. **Background isometric canvas** at `z = -2`. Uses the room
   palette of the NPC's deck (Strategy Deck = gold/violet UI for
   EDEN, Editorial Deck = blue, etc.).
3. **Two rim glow planes** at `z = 0`, one per character, using the
   NPC's `rim` colour for the NPC and the player's `profile.color`
   for the player.
4. **Portraits** at `z = 4` (NPC) and `z = 5` (player).
5. **Bubble** at `z = 8`, vertically aligned to the lower third.
6. **Vignette** at `z = 12`, opacity `0.78`, identical for every
   scene.

Z-order is part of the contract. Same number, same purpose, every
NPC.

### 2.8 Talk animation

`usePixelTalkCycle` at 320 ms is fine for the placeholder. For final
art the cycle becomes a 4-frame mouth sequence per NPC:
`idle`, `talk-a`, `talk-b`, `blink`. The hook stays; what changes is
the frame source (sprite atlas vs procedural).

---

## 3. File and asset layout

Tighten the layout already proposed in §6 of the companion roadmap.

```text
src/
  interactions/
    scene/
      InteractionPixelStage.tsx        # camera + canvas + CSS upscale (locked)
      InteractionSceneShell.tsx        # accepts npc config + dialogue flow
      PixelPortrait.tsx
      PixelDialogueBubble.tsx          # 9-slice composer
      PixelBackground.tsx              # shared isometric room composer
      pixelSceneTextures.ts            # PX, palette tables, glow factory
      npcConfig.ts                     # accent triplet + portrait set per NPC
    brandBrain/    BrandBrainInteractionScene.tsx ...
    editorial/     MisterInteractionScene.tsx ...   # follows Phase D
    design/        MaxInteractionScene.tsx ...
    narration/     NaraInteractionScene.tsx ...
    output/        AstraInteractionScene.tsx ...
public/
  art/
    interaction/
      backgrounds/
        brand-brain-room.png
        editorial-room.png
        design-room.png
        narration-room.png
        output-room.png
      portraits/
        eden/      idle.png talk-a.png talk-b.png blink.png
        mister/    …
        max/       …
        nara/      …
        astra/     …
        player/    idle.png talk-a.png talk-b.png blink.png
      frames/
        bubble-9slice.png
        badge-9slice.png
docs/
  _reference/
    Interaction_EDEN.jpeg              # QA target — not shipped to public/
```

Rule: nothing under `docs/_reference/` may be imported from `src/`.
That folder exists so the team can diff side by side against the
target frame without dragging it into the build.

---

## 4. Phased roll-out

Each phase is small, reviewable, and ends with a screenshot the
human can compare against the reference frame.

### Phase A · Lock the grid (½ day) — **shipped 17 May 2026**

What Phase A actually delivered:

- Exported `PX = 4`, `STAGE_PX = { width: 240, height: 135 }`, and a
  `snap(value)` helper from `pixelSceneTextures.ts`. Single source of
  truth for the grid.
- Migrated the **background canvas** from 480×270 to 240×135 (every
  rect/polygon coord halved). Plane stays 960×540 → exact 4× upscale,
  fully on the PX grid. No text inside the background, so the
  migration was risk-free.
- Snapped the one off-grid position in
  `BrandBrainInteractionScene.tsx`: player portrait Y went from `-74`
  (74 % 4 = 2) to `-72`. All other literal coords were already PX
  multiples.
- Added `src/interactions/scene/DevPixelGrid.tsx` — a `<group>` of
  three `lineSegments` (faint cyan fine cells every 4 wu, brighter
  magenta coarse cells every 16 wu, yellow center cross). Mounted by
  `InteractionPixelStage` when the URL has `?grid=1`. Never ships to
  a normal player run.

What Phase A intentionally **did not** do:

- **Portrait canvases (EDEN, player) stayed at their current 164×224
  and 112×174 sizes** with planes 328×448 and 224×348 (2× upscale).
  Shrinking the canvases to 80×112 / 56×88 to reach 4× upscale means
  redrawing the placeholder sprite at half resolution, which is
  basically Phase C work without the final-art payoff. The planes are
  already on the PX grid (every dimension % 4 == 0), so the grid
  contract is still honoured.
- **Speech bubble canvas stayed at 472×152** with a 472×152 plane (1×
  upscale). Shrinking to 120×40 kills the current `monospace` text
  rendering; the bubble migrates together with the pixel-font swap
  in Phase B.
- **ESC badge canvas stayed at 128×40** for the same reason — `ESC`
  in a 28×9 canvas needs a real bitmap font. Moves with Phase B.

Acceptance: `?grid=1` now overlays the 4 wu / 16 wu lattice across
the EDEN scene; every sprite edge and every glow center lands on a
line. `tsc --noEmit` clean.

> Carry-over to Phase B (added to its scope): bubble canvas resize
> (472×152 → 120×40), badge canvas resize (128×40 → 28×9), both
> happening together with the pixel-font swap so text legibility is
> preserved.
>
> Carry-over to Phase C (added to its scope): portrait canvas resize
> (EDEN 164×224 → 80×112, player 112×174 → 56×88), happening
> together with the final-art replacement.

### Phase B · Type and bubble (½ day) — **shipped 19 May 2026**

What Phase B actually delivered:

- Imported **Press Start 2P** via Google Fonts in `src/styles/global.css`.
- Added `src/interactions/scene/usePixelFontReady.ts` exposing
  `PIXEL_FONT_FAMILY`, `pixelFont(size)`, `waitForPixelFontReady()`,
  and the `usePixelFontReady()` React hook. Canvas textures await the
  font then redraw, so the first paint isn't stuck with the monospace
  fallback.
- Rewrote `createSpeechBubbleTexture` from a single canvas-rect blob
  into a real pixel-art frame: 2 px ice-white border, 1 px chamfered
  corners, dark navy fill, 1 px cyan highlight line at the top, and a
  4-step pixel triangle tail that drops out of the bottom edge on the
  speaker's side. Speaker label in accent color (default ice cyan,
  ready to swap to per-NPC accents in Phase D), body text in white.
- Added `PixelBubbleTail = "left" | "right" | "none"` type;
  `createSpeechBubbleTexture` and `PixelDialogueBubble` both accept
  it. `BrandBrainInteractionScene` derives the tail from `step.speaker`
  — EDEN (left of stage) → left tail, PLAYER (right of stage) → right
  tail.
- Bubble plane is now **480 × 128** (2× upscale of the 240 × 64
  canvas), centered at `x = 0, y = -200`. Both dimensions are PX
  multiples.

Scope adjustment vs. the original roadmap (recorded so we don't
re-debate it later):

- The original spec said canvas **120 × 40, plane 480 × 160 (4×
  upscale)**. Press Start 2P bottoms out at 8 px, and a 120-wide
  canvas only fits ~14 characters per line — well under the 34-char
  wrap `getDialogueLines` produces. The bubble is now **240 × 64 →
  480 × 128 (2× upscale)** which fits ~28 chars/line cleanly and
  still reads as chunky pixel art. The PX grid contract is preserved
  (every dimension and position is a multiple of 4).

What Phase B intentionally did not do (carry-over):

- **Badge canvas migration** (128 × 40 → 28 × 9) is still pending.
  "ESC" in a 9-pixel-tall canvas needs a hand-drawn 3-letter bitmap
  rather than Press Start 2P; deferring to a small cleanup patch.
- **9-slice with external PNG frame** was replaced by a programmatic
  drawBubbleFrame() that achieves the same rounded look without an
  asset dependency. If we ever want art-driven frames per NPC, that
  swap is a localised refactor on drawBubbleFrame.

Acceptance: bubble renders with crisp 8 px Press Start 2P, tail flips
based on speaker, ice cyan accent on the speaker label, white body
text. `tsc --noEmit` clean.

### Phase C · Final EDEN art (1 day)

- Generate or hand-paint EDEN's `idle / talk-a / talk-b / blink`
  PNGs at the canvas size from §2.3, gold rim.
- Same for the player set, using `profile.color` as the rim tint
  applied via a tinted multiply layer (so colour stays dynamic).
- Drop the procedural placeholders in `pixelSceneTextures.ts`
  behind a `__dev` flag in case we need them again.
- Re-screenshot against the reference. The reference becomes a
  "version we are close to" not "version we wish we had."

Done when: EDEN and the player on screen are obviously the same
characters as in the rest of the game, not generic blobs.

### Phase D · Roll out to the other four MCPs (2 days, parallelisable)

For each of Mister, Max, Nara, Astra:

1. Add an entry to `npcConfig.ts` with the accent triplet, portrait
   path, and background path.
2. Drop a `<Npc>InteractionScene.tsx` that calls
   `InteractionSceneShell` with that config and the NPC's dialogue
   flow. (For now the flow can be a 3-step stub: greeting →
   capability summary → close.)
3. Author the four portrait frames + one background per NPC at the
   sizes in §2.3.
4. Hook the screen into the existing interaction system so walking
   up to that MCP opens its scene.

Done when: all five MCPs share the exact same shell, only differing
in accent colour, art, and dialogue.

### Phase E · QA and freeze (½ day)

- Side-by-side screenshot of all five scenes vs the reference frame.
- Run the §5 checklist on each.
- Tag the milestone `v0.pixel-interaction-1.0` so future patches
  have something to bisect against.

---

## 5. QA checklist (must pass before each phase merges)

- Every sprite edge lands on a `PX` multiple at 400% zoom.
- Bubble does not cover either character's face at any prompt
  length up to 80 characters.
- Speaker label colour equals that NPC's `accentText`.
- Z-order matches §2.7 exactly.
- No call site imports anything from `docs/_reference/`.
- No raw `monospace` font calls remain in `pixelSceneTextures.ts`.
- No `LinearFilter` on portrait, bubble, badge or background.
- `Esc` still closes the scene.
- Reference frame `Interaction_EDEN.jpeg` is recognisable as the
  inspiration of EDEN's screen, not a copy of it.

---

## 6. Cross-references

- `BRAND_BRAIN_INTERACTION_SCREEN_ROADMAP.md` — patch-level history
  of the EDEN screen. This roadmap supersedes its sections 4 and 8;
  patch sections 0–5 stay valid.
- `ART_DIRECTION.md §3` — MCP accent colours (gold/blue/green/
  purple/cyan). This doc reuses them; do not invent new ones.
- `CHARACTERS.md §1–§3` — silhouette and visual formula for each
  NPC. Pixel art portraits must caricature those silhouettes, not
  redesign them.
- `ROADMAP.md` — overall project plan. Phase D of this doc unblocks
  the "talk to other MCPs" missions noted there.
