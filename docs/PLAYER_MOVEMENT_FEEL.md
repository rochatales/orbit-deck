# MCP Office — Player Movement Feel

## Movement Style

The player should feel like a polished handheld-console adventure protagonist:

- responsive on input
- smooth on acceleration
- precise when stopping
- stable in tight office corridors
- readable in motion from a fixed isometric camera

The target is closer to a Zelda-like adventure avatar than to a physics-heavy platformer.

## Physics Setup

The player now uses `@react-three/rapier` with:

- a kinematic rigid body
- a simple capsule collider
- fixed environment colliders generated from office obstacle bounds
- fixed sensor volumes around NPCs for future interaction expansion
- a Rapier kinematic character controller for slide-and-step correction

Why this setup:

- the collider stays simple and stable
- movement remains deterministic and designer-controlled
- environment collision no longer depends on the visual mesh
- future interaction and trigger work can grow from the same physics layer

## Movement Tuning

Current tuning goals:

- speed: `3.2`
- acceleration: `10`
- deceleration: `14`
- smooth camera-relative movement
- clean facing interpolation
- no lingering ice-slide feel

The player still respects the office walkable areas, so the map logic and gameplay routes stay consistent with the current prototype.

## Animation States

The model is driven procedurally through four states:

- `idle`
- `walking`
- `interacting`
- `actionTriggered`

### Idle

- gentle body bob
- subtle helmet breathing
- low visor pulse
- almost still backpack

### Walking

- stronger vertical bob
- slight body sway
- subtle arm swing
- alternating boot lift
- light backpack bounce
- soft forward lean

### Interacting

- movement stops
- body turns toward the active NPC
- helmet tips slightly upward
- chest glow strengthens
- limbs settle down

### Action Triggered

- a slightly more energized interaction pose
- brighter chest device
- more premium visor glow response

## Why Rapier Is Used

Rapier is in place now because the player needs:

- stable collision against desks, walls, and consoles
- a clean separation between visuals and collision
- a predictable kinematic controller for office navigation
- room to add future triggers, sensors, and gameplay interactions

This is a better long-term base than continuing to grow manual collision checks inside the character component.

## What Should Not Be Added Yet

Not yet needed:

- ragdolls
- dynamic knockback
- jump systems
- root-motion animation
- inverse kinematics
- foot planting
- slope-heavy traversal mechanics
- combat-style dodge or sprint moves

The priority is clean navigation, readable posing, and premium feel inside the office.
