# MCP Office — Character And NPC Design

Revision: v2.0 · May 2026

## Character Principles

- The NPC cast should read from silhouette first, not facial detail.
- Every MCP keeps a matte white / ice fabric base with a distinct accent color.
- Accessories do the storytelling: glasses, headsets, bags, tablets, phones, halos, cards, and panels.
- Characters stay low-poly and faceted with `MeshStandardMaterial` plus `flatShading: true`.
- The office is still the dashboard, so NPCs must feel like operational coworkers, not fantasy creatures.

## Reference Interpretation

The uploaded references were translated into primitive-built 3D characters rather than sprites or textured cutouts.

- The **Brand Brain** reference drives the oversized faceted head, scientist-lab-coat silhouette, glasses, and orbiting intelligence halo.
- The **Social Media** reference drives the relaxed publishing-operator silhouette: headphones, sunglasses, phone-in-hand, and a softer streetwear posture.
- The **Editorial** reference drives the hooded field-operator look with tablet, pack, and floating content cards.
- The **Narration** reference drives the enclosed audio silhouette with hood, headset, microphone, and waveform props.
- The **Designer** reference drives the creative-tech silhouette with glasses, headphones at the neck, tablet, and floating layout frames.

For the current MVP loop, the existing `output-review` gameplay slot is visually interpreted through the **Social Media** archetype so the publishing end of the workflow feels more alive without changing the office’s five-station structure.

## System Architecture

The character layer is now modular:

- [src/characters/characterConfig.ts](/Users/rochatales/Automations/game-workplace/src/characters/characterConfig.ts)
  Defines each archetype, accessories, props, accent color, and idle animation.
- [src/characters/createCharacterParts.ts](/Users/rochatales/Automations/game-workplace/src/characters/createCharacterParts.ts)
  Shared low-poly body rig, head shapes, coat, hood, glasses, headphones, devices, and floating prop builders.
- [src/characters/createCharacterAccessories.ts](/Users/rochatales/Automations/game-workplace/src/characters/createCharacterAccessories.ts)
  Applies optional props and accessory language per character config.
- [src/characters/createMCPCharacter.ts](/Users/rochatales/Automations/game-workplace/src/characters/createMCPCharacter.ts)
  Assembles a full NPC character from config.
- [src/characters/CharacterAnimator.ts](/Users/rochatales/Automations/game-workplace/src/characters/CharacterAnimator.ts)
  Handles idle motion, highlight response, interaction facing, action pulses, and completed state.
- [src/characters/CharacterInteractionState.ts](/Users/rochatales/Automations/game-workplace/src/characters/CharacterInteractionState.ts)
  Resolves the high-level visual state machine.

The existing NPC wrapper in [src/npcs/createNPC.ts](/Users/rochatales/Automations/game-workplace/src/npcs/createNPC.ts) still owns the pedestal, interaction ring, and world position, but the body itself now comes from the new character system.

## MCP Archetypes

### Brand Brain MCP

- Archetype: scientist strategist
- Accent: `#F2C94C`
- Silhouette: oversized faceted brain crown, glasses, lab coat, narrow formal body
- Props: brand book and floating node cluster
- Idle behavior: halo rotation, node drift, calm head bob

### Editorial MCP

- Archetype: field researcher / brief operator
- Accent: `#2F80ED`
- Silhouette: hooded operator with pack and tablet
- Props: floating content cards and calendar blocks
- Idle behavior: tablet inspection, card orbit, subtle antenna sway

### Narration MCP

- Archetype: audio specialist
- Accent: `#9B51E0`
- Silhouette: enclosed hood, headset, device-forward posture
- Props: phone, microphone, waveform bars, voice card
- Idle behavior: waveform pulse, tighter breathing motion, focused look-down pose

### Designer MCP

- Archetype: visual technologist
- Accent: `#27AE60`
- Silhouette: clean creative profile, glasses, neck headphones
- Props: tablet, floating image frames, layered panels
- Idle behavior: gentle frame orbit, layer drift, small screen glow

### Social Media / Publishing Operator

- Gameplay slot: `output-review`
- Accent: `#00C2FF`
- Silhouette: headphones, sunglasses, bag, phone-led stance
- Props: social-card orbit and publishing-device feel
- Idle behavior: phone-check pulse, looser stance, brighter notification rhythm

## State Model

Every character can express five visual states:

- `idle`
- `highlighted`
- `interacting`
- `actionTriggered`
- `completed`

Behavior rules:

- `highlighted`: accent emissive rises, ring grows, character scales slightly.
- `interacting`: NPC turns toward the player and becomes a bit more animated.
- `actionTriggered`: quick pulse after a button press; props brighten and the body pops upward slightly.
- `completed`: completion glow blends toward success green on the final station.

## Material Direction

- Base fabrics: matte white and cool light gray
- Skin: soft warm neutral, still faceted
- Accent surfaces: low-metal emissive details only on chest plates, panels, headphones, props, and rings
- Glass: translucent cyan with light emissive edge feel
- Dark details: shoes, frames, ties, tech housings

This keeps the cast consistent with the bright, premium sci-fi office instead of drifting into dark cyberpunk.

## Camera Readability Rules

- Heads stay large relative to the body so the character reads from the orthographic isometric camera.
- Upper-body accessories are intentionally oversized.
- Floating props stay compact and close to the body to avoid clutter.
- Emissive accents are used as punctuation, not as full-surface lighting.

## Future Upgrade Path

- Swap primitive rigs for authored low-poly GLTF characters when the silhouettes are locked.
- Add skeletal idle animations and role-specific loops.
- Add voice/mouth sync for narration and conversational scenes.
- Add per-character workflow mood states driven by real MCP job status.
- Split the current publishing operator into a dedicated Social Media room if the office expands beyond the first five-station loop.
