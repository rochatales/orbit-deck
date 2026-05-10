# Character Asset Pipeline

## Why GLB Characters

MCP Office now keeps the office environment procedural and instanced, while hero characters load from GLB assets.

This split is intentional:

- repeated environment pieces stay cheap to render
- player and NPCs get cleaner silhouettes and richer material separation
- character iteration can happen in Blender without rewriting gameplay code
- physics, movement, dialogue, and interaction stay separate from visuals

## Asset Locations

Place character assets here:

- `src/assets/characters/player/player-main.glb`
- `src/assets/characters/npcs/brand-brain.glb`
- `src/assets/characters/npcs/social-media.glb`
- `src/assets/characters/npcs/editorial.glb`
- `src/assets/characters/npcs/narration.glb`
- `src/assets/characters/npcs/designer.glb`

The runtime config lives in [characterAssetConfig.ts](/Users/rochatales/Automations/game-workplace/src/characters/characterAssetConfig.ts:1).

## Naming Conventions

Use stable asset names so gameplay code never has to guess:

- one GLB per hero character
- file names in kebab-case
- character ids stay aligned with gameplay ids where possible
- the current `output-review` NPC uses the `social-media.glb` asset path on purpose

## Scale Conventions

Characters should be authored facing positive Z with feet on world zero.

Target scale:

- player height around `1.5` world units
- NPCs around `1.45` to `1.55` world units
- oversized head or helmet should dominate the read from the isometric camera

Fine tuning happens in config with:

- `scale`
- `positionOffset`
- `rotationOffset`

## Material Naming

Author material names in Blender using these conventions:

- `MAT_Suit`
- `MAT_Helmet`
- `MAT_Visor`
- `MAT_Gloves`
- `MAT_Boots`
- `MAT_Backpack`
- `MAT_TechAccent`
- `MAT_Accessory`

The loader preserves material names and applies a polish pass:

- `MAT_Visor`: dark and glossy
- `MAT_Suit`: matte and flat-shaded
- `MAT_Helmet`: matte with a slightly smoother response
- `MAT_TechAccent`: emissive accent
- `MAT_Accessory`: restrained semi-gloss

## Shadow Settings

Every mesh in a loaded character should:

- `castShadow = true`
- `receiveShadow = true`

Keep the shadow silhouette broad and readable. Avoid thin noisy shapes that flicker from the isometric camera.

## Placeholder Replacement

The project currently includes generated starter GLBs so the pipeline works immediately.

To replace them:

1. Export a new GLB with the same file name.
2. Keep the pivot at the feet and the facing direction consistent.
3. Preserve or reapply the material naming conventions.
4. Reload the app. Gameplay code should not need changes.

If an asset is missing or fails to load, the game falls back to the primitive prototype character and labels it as fallback.

## Blender Export Notes

Recommended export approach:

1. Apply transforms before export.
2. Keep object origins sensible and feet near `Y = 0`.
3. Use clean material slots with the `MAT_*` naming scheme.
4. Prefer simple low-poly geometry over dense bevel-heavy meshes.
5. Export as binary GLB.
6. Check the result in the game from the isometric camera, not only in Blender.

## Cohesion Rules

To keep all characters feeling like the same game:

- prioritize silhouette first
- keep forms rounded but faceted
- limit tiny props that disappear from the camera
- use matte suits and controlled emissive accents
- keep proportions toy-like rather than realistic
- let role identity come from one or two strong props, not clutter
