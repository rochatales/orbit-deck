# MCP Office — Art Direction

> Implementation-ready visual design guide for the first playable prototype.
> Revision: v1.0 · May 2026

---

## 1. Visual Pillars

Every visual decision in MCP Office must satisfy at least one of these five pillars:

| # | Pillar | Meaning |
|---|---|---|
| 1 | **Low-poly premium simplicity** | Clean geometry, minimal polygons, maximum clarity. Every object is readable at a glance from the isometric camera. |
| 2 | **AI workplace clarity** | The environment reads as a professional creative studio, not a game dungeon or a fantasy village. |
| 3 | **Playful operational interface** | UI and environmental cues feel alive and responsive without being childish or over-animated. |
| 4 | **Color-coded agent zones** | Each MCP NPC owns a color. That color marks their desk, zone disc, accent props, and UI state. |
| 5 | **Clean futuristic studio** | The office evokes a near-future startup — warm wood tones, matte surfaces, soft light, precise furniture. |

**The visual North Star:**
> *A beautifully lit architectural model of the world's most organized creative studio — miniature, precise, warm, and alive.*

---

## 2. Camera and Composition

### Current implementation (reference: `camera.ts`)

| Parameter | Value | Rationale |
|---|---|---|
| Projection | `OrthographicCamera` | Flat depth — no perspective distortion. Objects remain readable at all distances. |
| Offset | `Vector3(12, 12, 12)` | True isometric angle (equal X/Y/Z). |
| Frustum height | `20` | Shows the full office with comfortable margins. |
| Zoom | `1.15` | Slight zoom-in for intimacy without claustrophobia. |
| Follow damping | `damp(…, 5, delta)` | Smooth, weighted camera lag — feels cinematic, not rigid. |

### Composition rules

1. **The player is always near-center.** Camera follow ensures the avatar anchors the frame.
2. **NPC zones should be visible at the edges** when the player is near center — this creates spatial awareness.
3. **No camera rotation.** The isometric angle is fixed. Players orient through movement, not camera control.
4. **Fog hides the world edge.** `Fog("#f6efe2", 18, 34)` fades geometry at the periphery — no hard cutoffs.
5. **Framing priority:** Player → nearest NPC → zone props → walls. This is the visual hierarchy.

### Visual framing principles

- **Silhouette readability:** Every object must be identifiable from its top-down silhouette alone — desk, NPC, plant, chair.
- **Negative space:** Keep corridors between zones open. The player path should feel like a clear avenue, not a maze.
- **Zone density gradient:** Desks and props are dense at zone edges, sparse in walkways.

---

## 3. Color Palette

### Base environment

| Role | Hex | Usage |
|---|---|---|
| Scene background | `#f6efe2` | Sky/void behind the office |
| Floor tile | `#efe6d6` | Instanced floor grid |
| Warm base plane | `#d8c2a6` | Ground plane beneath tiles |
| Wall (back) | `#fcf9f1` | Rear wall |
| Wall (front) | `#f7f1e4` | Front wall (slightly warmer) |
| Wall (sides) | `#fffaf2` | Side walls (brightest) |
| Center rug | `#f4e6c7` | Player spawn zone marker |
| Window glass | `#dff5ff` | Translucent window strips |

**Principle:** The base environment is a warm neutral canvas — cream, sand, ivory. It never competes with the NPC accent colors.

### MCP accent colors

| MCP | Hex | CSS variable | Feeling |
|---|---|---|---|
| Brand Brain | `#F2C94C` | `--mcp-brand-brain` | Gold — authority, brand identity |
| Editorial | `#2F80ED` | `--mcp-editorial` | Blue — clarity, ideation |
| Narration | `#9B51E0` | `--mcp-narration` | Purple — voice, audio, depth |
| Design | `#27AE60` | `--mcp-design` | Green — creativity, visual growth |
| Output/Review | `#F5F5F5` | `--mcp-output` | Silver/white — finality, precision |

**Rules:**
- Each accent color appears ONLY in that NPC's zone: body material, zone disc, desk module, mood board stripe, nameplate.
- Accents use slight emissive (`accent.multiplyScalar(0.12)`) for a soft inner glow.
- Never mix two MCP accent colors in the same prop.

### UI colors

| Role | Hex |
|---|---|
| Text primary | `#18212e` |
| Text secondary | `#49576d` |
| Label/kicker | `#657287` |
| Panel background | `rgba(255, 251, 245, 0.72)` |
| Action button gradient | `#273852 → #406a7a` |
| Task incomplete | `#d8c7aa` |
| Task complete | `#27ae60` |

### Avoided colors

- **Saturated red** — feels like danger/combat.
- **Neon cyan/magenta** — too cyberpunk.
- **Pure black backgrounds** — too dark for the warm studio tone.
- **Pastel rainbow** — too childish.
- **Brown/khaki monotones** — too corporate/dull.

---

## 4. Shape Language

### Core geometric vocabulary

| Shape | Three.js primitive | Usage |
|---|---|---|
| **Rounded cylinder** | `CylinderGeometry(…, 8)` | NPC bodies, plant pots, monitor stands |
| **Soft sphere** | `SphereGeometry(…, 16, 16)` | NPC heads, plant foliage |
| **Chamfered box** | `BoxGeometry` | Desks, walls, monitors, chairs, legs, shelves |
| **Flat disc** | `PlaneGeometry` | Zone markers, floor rug, window strips |
| **Torus ring** | `TorusGeometry` | NPC interaction rings, microphone pop filter |

### Shape rules

1. **Low segment counts.** Cylinders use 6–18 segments. Spheres use 7–16. This is the low-poly signature.
2. **No organic curves.** No splines, no NURBS, no smooth subdivision. Faceted geometry is the aesthetic.
3. **Flat bottoms.** Every prop sits flat on the floor or on a surface. No floating objects (except ceiling lights and labels).
4. **Proportional scaling.** Props use a consistent human-scale ratio: NPC height ≈ 1.8 units, desk height ≈ 0.84 units, chair seat ≈ 0.52 units.
5. **Silhouette-first design.** From the isometric camera, every object must be identifiable by its outline alone.

### Character shape language

| Character | Body shape | Personality it conveys |
|---|---|---|
| **Player** | Slightly smaller cylinder + sphere head + visor | Compact, mobile, distinct |
| **NPCs** | Slightly wider cylinder + sphere head + pedestal + ring | Grounded, authoritative, stationed |

The player is **narrower and shorter** than NPCs. This communicates: "You are mobile, they are stationed."

---

## 5. Materials

### Material strategy

All materials use `MeshStandardMaterial`. No `MeshPhongMaterial`, no `MeshBasicMaterial`, no custom shaders in the prototype.

### Material palette

| Surface type | Roughness | Metalness | Example |
|---|---|---|---|
| **Wood** (desks, shelves) | `0.88` | `0.04` | `#d7b98f` |
| **Metal frame** (legs, stands) | `0.42–0.50` | `0.25–0.45` | `#2d425d`, `#d4dde7` |
| **Matte body** (walls, floors) | `0.86–0.96` | `0.00–0.02` | `#fcf9f1`, `#efe6d6` |
| **NPC accent** | `0.55` | `0.10` | Per MCP color |
| **NPC neutral** | `0.80` | `0.05` | `#f8f4ec` |
| **Screen/glass** | `0.18–0.30` | `0.18` | `#f2f8fb`, `#dff5ff` |
| **Plant pot** | `0.92` | `0.00` | `#b78156` |
| **Plant leaf** | `0.80` | `0.00` | `#4d8d5a` |
| **Chair seat** | `0.76` | `0.00` | `#354a67` |

### Material rules

1. **No textures.** All surfaces use flat color + roughness/metalness. No image maps, no UV unwrapping.
2. **No transparency except zone discs** (`opacity: 0.16`) and windows (`opacity: 0.62`).
3. **Subtle emissive only on NPC accents** (`accent × 0.12–0.15`) and ceiling lights (`0.32`).
4. **No reflections.** No environment maps, no cube maps. The low-poly style relies on direct/indirect lighting.
5. **Consistent roughness bands:** Matte props > 0.75. Metal/glass < 0.50. Nothing between 0.50–0.75 except accents.

---

## 6. Lighting

### Current implementation (reference: `lights.ts`)

| Light | Type | Parameters | Purpose |
|---|---|---|---|
| **Hemisphere** | `HemisphereLight` | Sky `#fff5df`, Ground `#c1b39d`, Intensity `1.25` | Warm ambient fill — no area is fully dark |
| **Sun** | `DirectionalLight` | White, Intensity `1.8`, Position `(8, 14, 6)` | Primary key light — casts all shadows |
| **Fill** | `PointLight` | `#fff0cc`, Intensity `18`, Range `26`, Decay `2` | Centered overhead fill — softens shadow edges |

### Shadow configuration

| Parameter | Value |
|---|---|
| Shadow map | `2048 × 2048` |
| Shadow camera bounds | `±15` units |
| Shadow bias | `-0.0003` |

### Lighting rules

1. **Warm key light from upper-right.** The sun position `(8, 14, 6)` creates shadows that fall toward the lower-left — consistent with the isometric view angle.
2. **No colored lights.** All lights are white or warm white. Color comes from materials, not lighting.
3. **No dramatic contrast.** The hemisphere light ensures even the darkest shadow is still visible. The ratio between lit and shadow areas should be approximately 3:1, not 10:1.
4. **No point lights per zone** (in prototype). Future versions may add subtle per-zone accent lights.
5. **ACES Filmic tone mapping** (`ACESFilmicToneMapping`) — compresses highlights, warms midtones, adds cinematic quality.

### Lighting feel

The office should feel like a **well-lit architectural photography studio** — soft, even, warm, with gentle directional shadows that give objects volume without creating harsh contrasts.

---

## 7. Environment Design

### Office dimensions

| Parameter | Value |
|---|---|
| Width | `20` units |
| Depth | `18` units |
| Wall height | `3.2` units |
| Floor tile size | `1 × 1` unit |

### Layout zones

```
    ┌──────────────────────────────────────────┐
    │              BACK WALL                   │
    │   ┌─────────────────────────────────┐    │
    │   │    [Shelf]   Brand Brain  [Board]│    │
    │   │              (0, -7.6)          │    │
    │   │                                 │    │
    │ L │  Editorial     ╔═══╗    Design  │ R  │
    │ E │  (-7.5, 0)     ║Hub║   (7.5, 0) │ I  │
    │ F │   [Board]      ╚═══╝   [Board]  │ G  │
    │ T │                [Shelf]          │ H  │
    │   │                                 │ T  │
    │ W │  Narration                      │    │
    │ A │  (-6.4, 6.35)                   │ W  │
    │ L │  [Mic] [Wave]                   │ A  │
    │ L │         Output/Review           │ L  │
    │   │           (0, 7.55)             │ L  │
    │   └─────────────────────────────────┘    │
    │              FRONT WALL                  │
    └──────────────────────────────────────────┘
```

### Spatial design rules

1. **Hub-and-spoke layout.** The center pillar is the hub. Each NPC zone radiates outward. Clear pathways connect all zones.
2. **Walkway width ≥ 2 units.** The player (radius `0.42`) needs comfortable navigation space.
3. **Props cluster near walls.** Shelves, mood boards, and wave panels attach to walls. Desks sit 1–2 units from walls. The center remains open.
4. **Corner plants.** Four plants at corners anchor the space and soften the box geometry.
5. **Ceiling lights in a grid.** 6 lights in a 3×2 grid — functional, not decorative.

---

## 8. MCP Zone Design

### Brand Brain — Strategy Deck

| Element | Implementation |
|---|---|
| **Desk** | Standard desk at `(0, -7.6)`, accent `#F2C94C` |
| **Props** | Mood board on back wall (gold stripe), shelf with gold-accented books at `(7.8, -6.6)` |
| **Zone disc** | Gold, `opacity: 0.16`, 2.8 × 2.8 |
| **Visual identity** | Orderly, authoritative. The mood board with neat note cards conveys "organized knowledge." |
| **NPC** | Gold body, neutral head, gold ring. Faces south toward the office. |

### Editorial — Editorial Bay

| Element | Implementation |
|---|---|
| **Desk** | Standard desk at `(-7.55, 0)`, rotated 90°, accent `#2F80ED` |
| **Props** | Mood board on left wall (blue stripe), scattered papers on desk |
| **Zone disc** | Blue, `opacity: 0.16` |
| **Visual identity** | Creative energy. The mood board with note cards and desk papers suggest active ideation. |
| **NPC** | Blue body, faces east toward the center hub. |

### Narration — Narration Booth

| Element | Implementation |
|---|---|
| **Desk** | Standard desk at `(-6.4, 6.35)`, rotated 90°, accent `#9B51E0` |
| **Props** | Microphone station at `(-4.9, 6.1)`, wave panel (audio visualizer) at `(-3.9, 6.35)` |
| **Zone disc** | Purple, `opacity: 0.16` |
| **Visual identity** | Isolated specialist. The microphone + wave panel say "audio workspace" without text. Slightly separated from the main flow. |
| **NPC** | Purple body, faces east. |

### Design — Design Studio

| Element | Implementation |
|---|---|
| **Desk** | Standard desk at `(7.55, 0)`, rotated -90°, accent `#27AE60` |
| **Props** | Mood board on right wall (green stripe), shelf with green-accented books at `(8.05, -5.4)` |
| **Zone disc** | Green, `opacity: 0.16` |
| **Visual identity** | Visual richness. The mood board and shelf with colored books suggest design references and art direction tools. |
| **NPC** | Green body, faces west toward the center. |

### Output / Review — Review Console

| Element | Implementation |
|---|---|
| **Desk** | Wide desk (`wide = true`, 3.4 units) at `(0, 7.55)`, rotated 180°, accent `#F5F5F5` |
| **Props** | No additional wall props in prototype. The wide desk itself signals "final station." |
| **Zone disc** | Silver/white, `opacity: 0.16` |
| **Visual identity** | Minimal and precise. The wider desk is the only wide desk in the office — it visually communicates "this is different, this is the endpoint." |
| **NPC** | White/silver body, faces north toward the office. |

---

## 9. UI Art Direction

### Design language

The UI uses a **frosted glass** aesthetic — semi-transparent panels with backdrop blur over the 3D scene.

| Property | Value |
|---|---|
| Background | `rgba(255, 251, 245, 0.72)` |
| Backdrop filter | `blur(18px)` |
| Border | `1px solid rgba(80, 93, 112, 0.12)` |
| Shadow | `0 24px 60px rgba(48, 54, 70, 0.12)` |
| Border radius | `20–28px` (panels), `999px` (pills/hints) |

### Typography

| Role | Size | Weight | Style |
|---|---|---|---|
| HUD value | `18px` | `700` | Bold, primary |
| Dialog title | `32px` | `700` (default) | Large, commanding |
| Body text | `14px` | `400` | Readable, relaxed |
| Labels/kickers | `11px` | `400` | Uppercase, `0.14em` letter-spacing |
| Log items | `13px` | `400` | Compact, scannable |

**Font stack:** `"Avenir Next", "Segoe UI", sans-serif` — clean, geometric, professional.

### Panel hierarchy

| Panel | Position | Purpose |
|---|---|---|
| **HUD bars** (×2) | Top-left, top-right | Persistent context: location + workflow |
| **Task panel** | Right, below HUD | Current run objectives |
| **Status log** | Bottom-left | Recent action feed |
| **Interaction hint** | Bottom-center | Contextual prompt (pill shape) |
| **Toast** | Top-center | Transient feedback |
| **Dialog panel** | Center (modal) | NPC console with actions |
| **NPC labels** | Floating over 3D | Name + zone, color-accented |

### Action buttons

Gradient buttons (`#273852 → #406a7a`) with hover lift animation (`translateY(-2px)`). They feel like premium control-panel switches, not game buttons.

### NPC floating labels

- Frosted glass card with NPC name + zone name.
- Bottom accent bar using `var(--accent)` — the MCP color.
- Scale up to `1.05` when focused (player is nearby).
- Projected from 3D `labelAnchor` at `y = 2.25` above NPC.

### UI rules

1. **No icons** in the prototype. Text-only UI keeps things clean and implementable.
2. **No color fills on panels.** All panels are frosted glass. Color comes only from accent bars and action buttons.
3. **Consistent border radius:** `20–28px` for rectangular panels, `999px` for pill shapes.
4. **Pointer events only on interactive elements.** The `.ui-root` layer is `pointer-events: none` by default.

---

## 10. Asset Production Rules

### Primitive construction guidelines

All 3D assets are built from Three.js primitives. No imported models, no `.glb`/`.gltf`, no Blender exports in the prototype.

| Primitive | Typical usage | Segment guidance |
|---|---|---|
| `BoxGeometry` | Desks, walls, monitors, keyboards, legs, shelves, books, papers, nameplates, visor | Always axis-aligned. No rotation except Y-axis for zone orientation. |
| `CylinderGeometry` | NPC bodies, plant pots, monitor stands, chair legs, mic stands, ceiling lights | 6–18 segments. Use 6–8 for small props, 12–18 for characters. |
| `SphereGeometry` | NPC heads, plant foliage | 7 segments for foliage (chunky), 16 for heads (smoother). |
| `TorusGeometry` | NPC rings, mic pop filter | 12 tube segments, 24–40 radial segments. |
| `PlaneGeometry` | Zone discs, floor rug, windows | Always `rotation.x = -π/2` for floor planes. |
| `ConeGeometry` | Reserved for future directional indicators | Not used in prototype. |

### InstancedMesh rules

Use `InstancedMesh` for any prop that appears 3+ times with identical geometry:

| Current instanced assets | Count |
|---|---|
| Floor tiles | `20 × 18 = 360` |
| Plants (pot + 2 leaf spheres) | `6` positions |
| Chairs (seat + back + 4 legs) | `5` positions |
| Papers | `8` instances |
| Ceiling lights | `6` instances |

**Rules:**
1. Compose transform via `Matrix4.compose(position, quaternion, scale)`.
2. Set `castShadow = true` for props, `receiveShadow = true` for floor/ground elements.
3. Share materials across instances — never create per-instance materials.

### Group composition

Complex props (desks, chairs, NPCs) are built as `Group` objects containing multiple primitive meshes. Each group is a self-contained, repositionable asset.

**Naming convention:**
- `createDesk(accentColor, wide?)` — parameterized by MCP color.
- `createNPC(data)` — parameterized by `MCPConfig`.
- `createInstancedPlants(points[])` — parameterized by position arrays.

### Performance budget

| Metric | Target |
|---|---|
| Draw calls | < 80 |
| Triangles | < 15,000 |
| Shadow map | Single `2048²` directional |
| Pixel ratio | `min(devicePixelRatio, 2)` |
| Instanced batches | 5 (tiles, plants, chairs, papers, lights) |

---

## 11. Consistency Checklist

Use this checklist when adding any new asset, prop, or visual element to the scene.

### Geometry

- [ ] Built from Three.js primitives only (Box, Cylinder, Sphere, Torus, Plane, Cone)
- [ ] Cylinder segments ≤ 18, sphere segments ≤ 16
- [ ] Identifiable by silhouette alone from the isometric camera
- [ ] Scale is consistent with existing props (desk height `0.84`, NPC height `~1.8`)
- [ ] No floating objects (except ceiling lights and UI labels)

### Materials

- [ ] Uses `MeshStandardMaterial` only
- [ ] No image textures — flat color + roughness/metalness only
- [ ] Roughness follows the band rules (matte > 0.75, metal < 0.50)
- [ ] Emissive only for NPC accents and ceiling lights
- [ ] Transparency only for zone discs and windows

### Color

- [ ] Base props use the warm neutral palette (cream/sand/ivory)
- [ ] MCP accent color used only in that NPC's zone
- [ ] No mixing of two MCP accent colors in one prop
- [ ] No saturated red, neon cyan, neon magenta, or pure black

### Shadows

- [ ] `castShadow = true` on all visible props (except floor planes)
- [ ] `receiveShadow = true` on floor, ground plane, and desk tops
- [ ] No additional shadow-casting lights

### Layout

- [ ] Walkways between zones remain ≥ 2 units wide
- [ ] New obstacle added to `obstacles[]` array for collision
- [ ] Props cluster near walls/desks, not in walkways
- [ ] Zone visual identity preserved (no cross-zone props)

### Performance

- [ ] Repeated props (3+) use `InstancedMesh`
- [ ] Materials are shared, not duplicated per instance
- [ ] New addition stays within triangle budget (< 15,000 total)

### UI

- [ ] New panels use frosted glass style (backdrop blur + semi-transparent bg)
- [ ] Border radius follows convention (20–28px panels, 999px pills)
- [ ] Font sizes follow the typography scale
- [ ] Interactive elements have `pointer-events: auto`
- [ ] Non-interactive layers have `pointer-events: none`

---

## Appendix: Quick Reference Card

```
CAMERA:    Orthographic · Offset (12,12,12) · Frustum 20 · Zoom 1.15
LIGHTING:  Hemisphere (warm) + Directional (white, shadows) + Point fill
TONE MAP:  ACESFilmicToneMapping · sRGB output
FOG:       #f6efe2 · near 18 · far 34
FLOOR:     #efe6d6 tiles · #d8c2a6 base
WALLS:     #fcf9f1 / #f7f1e4 / #fffaf2
PLAYER:    #ef6f51 jacket · #f7f2eb skin · #31465f dark
NPC STYLE: Accent body + neutral head + dark legs + accent ring + dark pedestal
ACCENTS:   Gold #F2C94C · Blue #2F80ED · Purple #9B51E0 · Green #27AE60 · Silver #F5F5F5
UI:        Frosted glass · blur(18px) · rgba(255,251,245,0.72) · radius 20-28px
FONT:      "Avenir Next", "Segoe UI", sans-serif
```
