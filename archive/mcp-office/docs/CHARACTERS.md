# MCP Office — Characters

> Player and NPC reference. Consolidates the deprecated
> `CHARACTER_AND_NPC_DESIGN.md`, `PLAYER_CHARACTER_STYLE.md`,
> `PLAYER_MOVEMENT_FEEL.md`, `CHARACTER_ASSET_PIPELINE.md`,
> `CHARACTER_POLISH_CHECKLIST.md`, and `GLB_CHARACTER_ANIMATION_GUIDE.md`.
>
> Revision: v2.0 · May 2026

---

## 1. Cast at a glance

| Role | Code id | In-game name | Archetype | Accent |
|---|---|---|---|---|
| Player | — | Director | Premium low-poly sci-fi operator | `profile.color` (default `#66E6FF`) |
| Brand Brain MCP | `brand-brain` | Eden | Scientist strategist | `#F2C94C` |
| Editorial MCP | `editorial` | Mister | Hooded field operator | `#2F80ED` |
| Design MCP | `design` | Max | Visual technologist | `#27AE60` |
| Narration MCP | `narration` | Nara | Audio specialist | `#9B51E0` |
| Output / Review | `output-review` | Astra | Social media operator | `#00C2FF` |

The internal slot id `output-review` is preserved for compatibility; the
visual archetype mounted on that slot is the Social Media operator.

---

## 2. Character principles

1. **Silhouette before face.** Every character must read from outline alone
   at the isometric camera distance.
2. **Matte white / ice fabric base + one accent color.** The cast looks like
   the same studio outfit in different specialist trims.
3. **Accessories carry the story.** Glasses, headsets, bags, tablets,
   phones, halos, cards, panels — pick one or two strong props per role.
4. **Low-poly, faceted, flat-shaded.** `MeshStandardMaterial` with
   `flatShading: true`, no textures, no environment maps.
5. **Operational, not fantastical.** Characters feel like coworkers, not
   game creatures.

---

## 3. Player

### Visual formula

- 40% oversized helmet/head
- 30% compact torso
- 20% short legs
- 10% oversized accessories

The Director reads as: oversized helmet, dark glossy visor, compact explorer
body, chunky boots, compact sci-fi operator gear. **Premium low-poly sci-fi
toy explorer** — collectible-feeling miniature hero, cute but not mascot,
cozy and premium rather than gritty or military.

### Reference palette (player)

| Surface | Hex |
|---|---|
| Helmet shell | `#F3EEF0` |
| Suit base | `#D98F7F` |
| Suit shadow breakup | `#A76E6D` |
| Gloves | `#EDEAE4` |
| Boots | `#D8D8D2` |
| Visor | `#071827` |
| Visor highlight | `#3D6E8A` |
| Backpack | `#BFC8CC` |
| Tech accent (dynamic) | `profile.color` (default `#66E6FF`) |
| Harness | muted plum-grey |

### Material rules (player)

- All surfaces `MeshStandardMaterial` with `flatShading: true`.
- Helmet matte with subtle spec response.
- Visor is the glossiest surface on the character.
- Tech accent is restrained-emissive (`accent × 0.15`), reads as "alive but
  not neon."
- No textures, decals, or noisy fabric.

### Accessory language

Communicates **operator**, not astronaut soldier:

- Compact utility backpack with simple tech panel
- Chest AI module
- Arm-mounted device matching the accent
- Small utility case
- Belt pouches and harness straps

Accessories must feel modular and premium, never tactical or militarised.

### Dynamic colour (M5 work)

The player's accent surface receives `profile.color` from
`usePlayerJourneyStore`. Today `PlayerModel.tsx` still hardcodes
`PLAYER_CHARACTER_ASSET.accentColor`. The fix:

```tsx
const playerColor = usePlayerJourneyStore((s) => s.profile?.color)
  ?? PLAYER_CHARACTER_ASSET.accentColor;
// pass to <GLBCharacter accentColor={playerColor} />
```

`GLBCharacter` already memoises material polish on `accentColor`, so the
avatar updates live when the player changes swatch in `LoginScreen` or
`PlayerConfigPanel`.

### Movement feel

The player runs on `@react-three/rapier`:

- Kinematic rigid body + capsule collider
- Fixed environment colliders generated from office obstacle bounds
- Fixed sensor volumes around NPCs (future trigger expansion)
- Rapier kinematic character controller for slide-and-step correction

Current tuning targets:

| Parameter | Value |
|---|---|
| Top speed | 3.2 |
| Acceleration | 10 |
| Deceleration | 14 |

Goals: responsive on input, smooth on acceleration, precise when stopping,
stable in corridors, readable from the isometric camera. Reference feel is
closer to a Zelda-style adventure avatar than a physics-heavy platformer.

### Animation states (player)

Procedural, driven by `LocomotionController` + `PlayerAnimationController`:

- **Idle** — gentle body bob, helmet breathing, low visor pulse, near-still
  backpack.
- **Walking** — stronger vertical bob, slight body sway, subtle arm swing,
  alternating boot lift, soft forward lean.
- **Interacting** — movement stops, body turns toward the active NPC, helmet
  tips slightly upward, chest glow strengthens, limbs settle.
- **ActionTriggered** — more energised pose, brighter chest device, premium
  visor glow response.

Not in scope yet: ragdolls, dynamic knockback, jump, root-motion, IK, foot
planting, sprint or dodge moves.

---

## 4. NPCs

### Brand Brain MCP — Eden

- **Archetype:** scientist strategist.
- **Silhouette:** oversized faceted brain crown, glasses, lab coat, narrow
  formal body.
- **Props:** brand book and floating node cluster.
- **Idle:** halo rotation, node drift, calm head bob.

### Editorial MCP — Mister

- **Archetype:** field researcher / brief operator.
- **Silhouette:** hooded operator with pack and tablet.
- **Props:** floating content cards and calendar blocks.
- **Idle:** tablet inspection, card orbit, subtle antenna sway.

### Narration MCP — Nara

- **Archetype:** audio specialist.
- **Silhouette:** enclosed hood, headset, device-forward posture.
- **Props:** phone, microphone, waveform bars, voice card.
- **Idle:** waveform pulse, tighter breathing motion, focused look-down pose.

### Design MCP — Max

- **Archetype:** visual technologist.
- **Silhouette:** clean creative profile, glasses, neck headphones.
- **Props:** tablet, floating image frames, layered panels.
- **Idle:** gentle frame orbit, layer drift, small screen glow.

### Social Media / Publishing Operator — Astra (slot `output-review`)

- **Archetype:** headphones + sunglasses + bag, phone-led stance.
- **Silhouette:** relaxed publishing-operator profile.
- **Props:** social-card orbit, publishing-device feel.
- **Idle:** phone-check pulse, looser stance, brighter notification rhythm.

---

## 5. State machine (shared)

Every character exposes five visual states resolved by
`CharacterInteractionState` and animated by `CharacterAnimator`:

- `idle`
- `highlighted` — proximity focus, ring grows, accent emissive rises
- `interacting` — turns toward player, slightly more animated
- `actionTriggered` — quick upward pulse after a button press, prop glow
- `completed` — final-station glow blends toward success green

The legacy NPC wrapper in `src/npcs/createNPC.ts` still provides the
pedestal, interaction ring, and world position, but the body itself comes
from the new character system in `src/characters/`.

---

## 6. Material direction (cast)

- **Base fabrics:** matte white and cool light grey.
- **Skin:** soft warm neutral, still faceted.
- **Accents:** low-metal emissive details — chest plates, panels,
  headphones, props, rings.
- **Glass:** translucent cyan with light emissive edge.
- **Dark details:** shoes, frames, ties, tech housings.

This keeps everyone in the same bright, premium sci-fi office — no drift
into dark cyberpunk.

---

## 7. Camera readability rules

- Heads stay large relative to the body so characters read from the
  orthographic camera.
- Upper-body accessories are intentionally oversized.
- Floating props stay compact and close to the body to avoid clutter.
- Emissive accents are punctuation, not full-surface lighting.

---

## 8. Asset pipeline (GLB)

### Why GLB

The office stays procedural and instanced; hero characters load from GLBs:

- repeated environment pieces stay cheap to render
- player and NPCs get cleaner silhouettes and richer material separation
- character iteration happens in Blender without rewriting gameplay code
- physics, movement, dialogue, and interaction stay separate from visuals

### Asset locations

```
src/assets/characters/
  player/player-main.glb
  npcs/brand-brain.glb
  npcs/editorial.glb
  npcs/narration.glb
  npcs/designer.glb
  npcs/social-media.glb   ← mounted on the output-review slot
```

Runtime config: `src/characters/characterAssetConfig.ts`.

### Naming conventions

- One GLB per hero.
- File names kebab-case.
- Character ids match gameplay ids where possible.

### Scale conventions

- Player height ~1.5 world units.
- NPCs ~1.45 to 1.55 world units.
- Helmet / head should dominate the read.

Fine-tune in config via `scale`, `positionOffset`, `rotationOffset`.

### Material naming (Blender)

Use stable names — the loader's polish pass keys on them:

| Slot | Treatment |
|---|---|
| `MAT_Suit` | matte, flat-shaded |
| `MAT_Helmet` | matte, slightly smoother |
| `MAT_Visor` | dark and glossy |
| `MAT_Gloves` | matte |
| `MAT_Boots` | matte |
| `MAT_Backpack` | matte |
| `MAT_TechAccent` | emissive accent (this is where `accentColor` lands) |
| `MAT_Accessory` | restrained semi-gloss |

### Shadow settings

Every loaded mesh: `castShadow = true`, `receiveShadow = true`. Keep the
silhouette broad — avoid thin noisy shapes that flicker on the camera.

### Placeholder replacement

The project ships starter GLBs so the pipeline works immediately. Replace by
exporting a new GLB with the same file name, the pivot at the feet, and the
material naming preserved. Gameplay code does not need changes. If a GLB is
missing, the fallback primitive character (`FallbackCharacter.tsx`) loads
and is labelled as fallback.

### Blender export checklist

- [ ] Apply transforms before export
- [ ] Origin at the feet, facing +Z
- [ ] Material slots use `MAT_*` naming
- [ ] Low-poly geometry over dense bevels
- [ ] Export as binary `.glb`
- [ ] Check from the isometric camera, not just in Blender

---

## 9. Procedural animation (no rig required)

The procedural animator works best when GLBs include separated, named
meshes. If a character is exported as a single mesh, only whole-body motion
is available.

### Recommended object naming

`Head`, `Helmet`, `Body`, `Torso`, `Arm_L`, `Arm_R`, `Hand_L`, `Hand_R`,
`Leg_L`, `Leg_R`, `Boot_L`, `Boot_R`, `Backpack`, `ChestDevice`, `Visor`.

### What works with whole-body mesh

- Body bob, sway, lean.
- Glow pulses (if materials are named).
- Procedural state-driven posing.

### What needs split meshes or a rig

- Separate arm and hand motion.
- Per-limb walk cycles.
- Authored skeletal animations.

The current setup separates the physics body (Rapier capsule) from the GLB
visual layer, so when authored animation arrives later, both layers stay
intact:

- Keep the same Rapier body and controller.
- Keep the GLB visual layer.
- Replace or extend the procedural controller with skeletal animation
  blending.

---

## 10. Polish checklist

- [ ] Strong silhouette from the isometric camera
- [ ] Oversized head or helmet
- [ ] Readable role prop (one or two strong, not five small)
- [ ] Clean flat-shaded faceted geometry
- [ ] Matte suit
- [ ] Glossy visor or glasses
- [ ] Chunky boots and gloves
- [ ] Small emissive tech accent
- [ ] Consistent scale with the office (player ~1.5, NPC ~1.5)
- [ ] Casts a soft readable shadow
- [ ] Does not read as a primitive placeholder

---

## 11. Future upgrade path

- Swap primitive rigs for authored low-poly GLTF characters when silhouettes
  are locked.
- Add skeletal idle animations and role-specific loops.
- Add voice / mouth sync for Nara and conversational scenes.
- Add per-character workflow mood states driven by real MCP job status.
- Split Astra into a dedicated Social Media room if the office grows beyond
  the current five-station loop.

Tracking lives in `ROADMAP.md` under deferred Phase 3+ items.
