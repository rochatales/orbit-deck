# MCP Office — Art Direction

> Visual language guide for the current sci-fi HQ. Replaces the original
> warm-cream `ART_DIRECTION.md` and consolidates the icon principles from
> the deprecated `ICON_SYSTEM.md`.
>
> Revision: v2.0 · May 2026

---

## 1. Visual pillars

1. **Premium low-poly clarity.** Faceted geometry, minimal polygons, identifiable
   silhouettes from the isometric camera.
2. **Clean sci-fi HQ.** White and ice-blue base, glass-first architecture,
   soft cyan tech glow. Premium operations centre, not a dungeon or village.
3. **Color-coded stations.** Each MCP owns one accent color that appears only
   in their zone: body, station ring, billboard.
4. **Diegetic interface.** UI feels like equipment that belongs in the world —
   holographic billboards, console monitors, hovering nameplates.
5. **Calm authority.** Soft directional lighting, no harsh contrast, no
   stress signaling. The room invites focus.

North star: *a beautifully lit architectural model of the world's most
organized AI studio — miniature, precise, premium, alive.*

---

## 2. Base palette

| Role | Hex | Usage |
|---|---|---|
| Wall (matte white) | `#F4F6F8` | Structural walls, slightly blue-shifted |
| Floor tile | `#E6ECF1` | Pale blue-white modular tiles |
| Floor base | `#C8D1DA` | Ground beneath tiles |
| Glass | `#9CD7E5` @ 0.18 opacity | Partial transparent room walls |
| Cyan tech glow | `#66E6FF` | Hub lights, holograms, default tech accent |
| Console panel | `#1B2330` | Dark equipment housings |
| Highlight metal | `#D4DDE7` | Trim, frames, leg supports |
| Outdoor ground (Orbit Garden) | `#B68C5E` | Warm brown contrast band |

The base reads cool, clean, and bright. The MCP accents punctuate; they
never flood whole rooms.

---

## 3. MCP accent colors

| Agent | Hex | Use |
|---|---|---|
| Brand Brain (Eden) | `#F2C94C` (gold) | Strategy Deck station + Eden's body |
| Editorial (Mister) | `#2F80ED` (blue) | Editorial Deck + Mister |
| Design (Max) | `#27AE60` (green) | Design Studio + Max |
| Narration (Nara) | `#9B51E0` (purple) | Narration Booth + Nara |
| Output / Social (Astra) | `#00C2FF` (cyan) | Review Console + Astra |

Rules:

- Each accent color appears **only** in that agent's zone (body, station
  disc, billboard rail, holographic panel highlights).
- Emissive multiplier on accents: `accent × 0.12–0.15` for a soft inner glow.
- Never mix two accent colors in the same prop or panel.
- Player accent (`profile.color` from the journey store) is independent and
  only colors the player's tech surfaces, never an agent's.

---

## 4. UI palette and typography

### UI surface system

| Property | Value |
|---|---|
| Panel background | `rgba(255, 251, 245, 0.72)` (frosted) |
| Backdrop filter | `blur(18px)` |
| Border | `1px solid rgba(80, 93, 112, 0.12)` |
| Shadow | `0 24px 60px rgba(48, 54, 70, 0.12)` |
| Border radius | `20–28px` panels, `999px` pills |
| Text primary | `#18212e` |
| Text secondary | `#49576d` |
| Label / kicker | `#657287` uppercase `0.14em` letter-spacing |
| Action button gradient | `#273852 → #406a7a` |
| Task incomplete | `#d8c7aa` |
| Task complete | `#27ae60` |

### Type scale

| Role | Size | Weight |
|---|---|---|
| HUD value | `18px` | `700` |
| Dialog title | `32px` | `700` |
| Body | `14px` | `400` |
| Label / kicker | `11px` uppercase `0.14em` | `400` |
| Log row | `13px` | `400` |

Font stack: `"Avenir Next", "Segoe UI", sans-serif`. Geometric, premium,
neutral.

---

## 5. Lighting

| Light | Type | Purpose |
|---|---|---|
| Hemisphere | `HemisphereLight` (warm white over cool grey) | Ambient fill, no fully dark areas |
| Sun | `DirectionalLight`, intensity ~1.8 | Primary key + shadow caster |
| Hub fill | `PointLight` cyan-tinted | Centered glow over the hub |
| Per-room accent | `PointLight` low-intensity in each station | Subtle MCP color cast |

Rules:

- No saturated coloured lights. Color comes from materials and emissive
  accents, not lighting.
- Shadow map: single `2048²` directional, `bias -0.0003`.
- Tone mapping: `ACESFilmicToneMapping` with sRGB output.
- Target contrast: lit-to-shadow ratio around 3:1, not 10:1.

---

## 6. Material strategy

All static and character meshes use `MeshStandardMaterial` (no Phong, no
Basic, no custom shaders in MVP). Characters use `flatShading: true`.

| Surface | Roughness | Metalness | Example hex |
|---|---|---|---|
| Matte wall | 0.86–0.96 | 0–0.02 | `#F4F6F8` |
| Glass | 0.20–0.30 | 0.18 | `#9CD7E5` |
| Console housing | 0.55 | 0.30 | `#1B2330` |
| Metal frame | 0.45 | 0.40 | `#D4DDE7` |
| Plant pot | 0.92 | 0 | warm brown |
| Plant leaf | 0.80 | 0 | green |
| MCP accent surface | 0.55 | 0.10 | per-agent hex |
| Skin (NPC head) | 0.80 | 0 | warm neutral |
| Visor / dark detail | 0.18 | 0.30 | `#071827` |

Material rules: no textures, no UV unwrapping, no environment maps. Emissive
is used only on MCP accents, tech glows, and ceiling lights.

---

## 7. Shape language

| Shape | Three.js primitive | Used for |
|---|---|---|
| Chamfered box | `BoxGeometry` | Walls, desks, monitors, consoles |
| Cylinder (6–18 seg.) | `CylinderGeometry` | NPC bodies, plant pots, mic stands |
| Sphere (7–16 seg.) | `SphereGeometry` | NPC heads, plant foliage |
| Torus | `TorusGeometry` | Station rings, hub accents |
| Plane | `PlaneGeometry` | Floor tiles, holographic panels, screens |
| Cone | `ConeGeometry` | Reserved (directional indicators) |

Cylinders cap at 18 segments, spheres at 16. The faceted look is intentional;
do not increase tessellation.

---

## 8. Iconography

The project uses **lucide-react** (1,400+ icons, 24px grid, 1.5px stroke,
round caps) directly inside components. No icon system file is required —
import the icon and pass props.

Sizing classes:

| Class | Pixel size | Use |
|---|---|---|
| XS | 16 | Task bullets, log prefixes |
| SM | 20 | Action button inline icons |
| MD | 24 | HUD indicators, dialogue headers |
| LG | 32 | Dialogue kicker, toast icons |

Canonical agent → icon mapping (call by name):

| Agent | Lucide icon | Reasoning |
|---|---|---|
| Eden | `Brain` | Brand intelligence |
| Mister | `FileText` | Editorial briefs |
| Max | `Palette` | Visual direction |
| Nara | `Mic` | Voice and audio |
| Astra | `ClipboardCheck` | Approval and publish |

Workflow state icons (when needed): `Circle` (idle), `Loader` (in progress),
`Clock` (waiting), `CircleCheck` (approved), `CircleX` (error),
`CheckCheck` (completed), `UserCheck` (needs human).

Color rules:

- Default icon color is `currentColor` (inherits from parent text color).
- Use the agent accent only on dialogue kicker icons and floating nameplate
  badges — never on action buttons or task bullets except the completed state.
- Disabled icons use `opacity: 0.35`, not a gray color.

Animations use the existing `140ms ease` transition timing. Three keyframes
allowed: `spin` (1.2s linear infinite), `pulse` (opacity 1↔0.5), `shake`
(±2px horizontal).

---

## 9. Camera and composition

| Parameter | Value |
|---|---|
| Projection | `OrthographicCamera` (no perspective) |
| Offset | `Vector3(12, 12, 12)` (true isometric) |
| Frustum height | ~20 |
| Default zoom | 1.15, mouse-wheel adjustable, `+` / `-` keys |
| Rotation | `Q` / `R` keys, snapped angles |
| Follow damping | `damp(…, 5, delta)` |

Composition:

- Player anchors the frame.
- Adjacent station billboards should be visible at frame edges when the
  player is mid-corridor.
- No camera rotation animations — player rotates via inputs.
- Fog or distance haze fades wall edges; no hard cutoffs.

---

## 10. Performance budget

| Metric | Target |
|---|---|
| Draw calls | < 120 |
| Triangles | < 35,000 |
| Shadow maps | 1 × 2048² directional |
| Instanced batches | Floor, plants, chairs, ceiling lights |
| GLB characters | 6 (5 NPCs + player), shared materials within each |

Repeated props (3+) must use `InstancedMesh`. Materials are shared, not
duplicated per instance.

---

## 11. Visual checklist for new assets

- [ ] Built from primitives or imported GLB with named material slots
- [ ] Faceted, not subdivided
- [ ] Stays within 18-segment cylinder / 16-segment sphere caps
- [ ] Uses `MeshStandardMaterial` only
- [ ] No textures or environment maps
- [ ] Emissive reserved for tech accents and lights
- [ ] Accent color matches the host station, with no cross-zone bleed
- [ ] Casts shadow if standing prop; receives shadow if floor surface
- [ ] Registered as a Rapier collider if it blocks player movement
- [ ] Stays inside the 35k-triangle global budget

---

## Appendix: quick reference

```
CAMERA:      Orthographic · Offset (12,12,12) · Zoom 1.15 · Q/R rotate
LIGHTING:    Hemisphere + Directional (shadows) + Hub PointLight (cyan)
TONE MAP:    ACESFilmic · sRGB output
WALLS:       #F4F6F8 matte
FLOOR:       #E6ECF1 tile · #C8D1DA base
GLASS:       #9CD7E5 @ 0.18 opacity
HUB GLOW:    #66E6FF emissive
ACCENTS:     Gold #F2C94C · Blue #2F80ED · Green #27AE60 · Purple #9B51E0 · Cyan #00C2FF
PLAYER:      profile.color from useJourneyStore (default #66E6FF)
UI:          Frosted glass · blur(18px) · rgba(255,251,245,0.72)
FONT:        "Avenir Next", "Segoe UI", sans-serif
ICONS:       lucide-react · 1.5px stroke · 16/20/24/32 sizes
```
