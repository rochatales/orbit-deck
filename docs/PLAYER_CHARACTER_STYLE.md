# MCP Office — Player Character Style

## Visual Formula

The player is the visual standard for MCP Office:

- 40% oversized helmet/head
- 30% compact torso
- 20% short legs
- 10% oversized accessories

The silhouette should read instantly from the isometric camera as:

- oversized helmet
- dark glossy visor
- compact explorer body
- chunky boots
- compact sci-fi operator gear

## Design Intent

The player is a **Premium Low-Poly Sci-Fi Toy Explorer**:

- a collectible-feeling miniature hero
- an AI workplace operator, not a combatant
- cute, but not mascot-like
- cozy and premium instead of gritty or military

The reference image translates into a real 3D design language through primitive geometry, flat shading, and strong proportion control instead of textures or billboards.

## Core Proportions

- Helmet is intentionally oversized and slightly wider than the shoulders.
- Torso is compact and rounded, with a soft toy-like taper.
- Legs are short and sturdy to keep the avatar grounded and readable.
- Gloves, boots, backpack, and utility case are slightly exaggerated to preserve silhouette clarity at distance.

## Color System

Primary palette:

- Helmet shell: `#F3EEF0`
- Suit base: `#D98F7F`
- Suit shadow breakup: `#A76E6D`
- Gloves: `#EDEAE4`
- Boots: `#D8D8D2`
- Visor: `#071827`
- Visor highlight: `#3D6E8A`
- Backpack: `#BFC8CC`
- Tech accent: `#66E6FF`
- Harness and straps: muted plum-gray

This keeps the player warmer and softer than the NPCs, while still fitting the flat-shaded cozy sci-fi office palette.

## Material Rules

- All surfaces use `MeshStandardMaterial`
- All character materials use `flatShading: true`
- Helmet is matte with subtle soft spec response
- Suit is matte and slightly denser than the helmet
- Visor is the glossiest surface on the character
- Cyan tech details are emissive but restrained
- No texture maps, decals, or noisy fabric treatment

## Accessory Language

The player uses accessories to communicate “operator” instead of “astronaut soldier”:

- compact utility backpack with simple tech panel
- chest AI module
- arm-mounted cyan device
- small utility case
- belt pouches and harness straps

Accessories should feel functional, modular, and premium, never tactical or militarized.

## Cohesion With MCP NPCs

The player fits the NPC cast by sharing:

- flat-shaded low-poly construction
- warm sci-fi materials
- readable geometric proportions
- restrained emissive accents

The player remains distinct because:

- the helmet dominates the silhouette more strongly than any NPC
- the visor is the darkest and most recognizable single shape in the game
- the body is more compact and toy-like than the stationed MCP characters

## What Must Stay True

- Helmet is always the hero shape.
- Visor must remain readable from the isometric view.
- The character must look premium even when built from primitives.
- Added detail should improve silhouette and role identity, not realism.
