# GLB Character Animation Guide

## Overview

MCP Office separates the player into three layers:

- physics body: invisible Rapier rigid body plus capsule collider
- visual model: imported GLB that follows the physics transform
- animation layer: procedural motion applied on top of the GLB scene

This keeps gameplay collision stable while the art pipeline evolves independently.

## Why Named Parts Matter

Procedural limb animation works best when the GLB includes separate named objects such as:

- `Head` or `Helmet`
- `Body` or `Torso`
- `Arm_L` and `Arm_R`
- `Hand_L` and `Hand_R`
- `Leg_L` and `Leg_R`
- `Boot_L` and `Boot_R`
- `Backpack`
- `ChestDevice`
- `Visor`

If the GLB is one mesh, only whole-body procedural animation is realistically possible.

That means:

- body bob works
- subtle sway works
- lean works
- glow pulses can still work if materials are named well
- separate arm and hand animation does not

For separate arm and hand motion you need one of these:

1. split the character into named mesh parts in Blender
2. rig the character with bones and export the armature in the GLB

## Recommended Blender Naming

Use clear object names:

- `Head`
- `Helmet`
- `Body`
- `Torso`
- `Arm_L`
- `Arm_R`
- `Hand_L`
- `Hand_R`
- `Leg_L`
- `Leg_R`
- `Boot_L`
- `Boot_R`
- `Backpack`
- `ChestDevice`
- `Visor`

Material naming also helps the polish pass:

- `MAT_Visor`
- `MAT_TechAccent`
- `MAT_Helmet`
- `MAT_Suit`

## Export Recommendations

- Apply transforms before export.
- Keep feet near local ground level if possible.
- Keep the model facing the game-forward direction consistently.
- Prefer separate objects for parts you want to animate procedurally.
- Export as binary `.glb`.

## Physics Body vs Visual Model

The capsule collider is the gameplay body.
The GLB is visual only.

This means:

- collisions stay stable
- map obstacles do not depend on art topology
- the GLB can be replaced without rewriting movement

## Future Rigged Animation

If you move to bones later, the current setup can still help:

- keep the same Rapier body and controller
- keep the GLB visual layer
- replace or extend the procedural controller with skeletal animation blending

That gives you a clean upgrade path from whole-body motion to proper rig-driven clips.
