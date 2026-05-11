# Map Optimization & Expansion Pass

## What Changed
- Added a new interior room called **Smart Lab** with customized visual identity and dedicated interactions.
- Added a new outdoor relaxation area called **Orbit Garden** on the map's eastern exterior edge.
- Expanded the environment bounding configs and walkable corridors to seamlessly integrate these new zones without breaking the established modular tile system.
- Added new action points, NPC node logic, and interaction capabilities into `mcpActions.ts`, `mcpData.ts`, and `characterAssetConfig.ts`.
- Enhanced the programmatic office builder (`createOfficeMap.ts`) to gracefully support a new `"lab"` room archetype and custom `"outdoor"` garden geometry while using the existing low-poly performance techniques.

## Why the Smart Lab was added
The Smart Lab serves as a crucial bridge between strategy and production. By physically placing it between the **Brand Brain** (strategy) and the **Design Studio** (visual creation), it provides a logical checkpoint where visual intelligence, brand validation, prompt experiments, and creative system diagnostics happen.

## Why the Garden was added
The Orbit Garden was added to introduce contrast to the interior office spaces. It gives the player a "creative oxygen" zone—a calm external area to walk through. This makes the station feel less like a rigid dashboard and more like a breathing, inhabited workplace.

## How the new areas preserve the current visual identity
- **Smart Lab** uses the exact same `ROOM_WALL_HEIGHT`, light floor tiles, and glass panel dimensions as the rest of the facility. It continues the minimal, premium aesthetic with subtle cyan, green, and gold accent lights, reusing existing mesh functions for holographic panels, screens, and side consoles.
- **Orbit Garden** utilizes the existing warm brown ground base and expands on the pre-existing outdoor aesthetic. It integrates the same low-poly instanced trees but arranges them alongside clean, white minimal furniture (circular tables, simple benches) and ambient cyan/mint glowing garden lamps that align perfectly with the sci-fi premium vibe.

## How the Smart Lab connects Brand Brain and Design
The Smart Lab is positioned at `{ x: 6.5, z: -10 }`, which physically links the northern exterior of the Brand Brain room and the western corridor leading to the Design Studio. The player can walk straight from Brand Brain strategy into the Smart Lab to validate it, and then proceed into the Design Studio. A new `lab-connector` corridor connects these paths natively within the map logic.

## How the Garden improves map breathing space
By adding the Orbit Garden at `{ x: 12.5, z: 23.5 }`, we replaced empty brown exterior padding with an intentional point of interest. It balances the visual weight of the map without introducing tall, view-blocking geometry. The garden uses low borders and horizontal lines, meaning it remains highly readable from the isometric camera angle and provides satisfying negative space.

## Future gameplay ideas for both spaces
- **Smart Lab**: 
  - Could host mini-games for "tuning" image generation prompts by dragging attribute sliders.
  - Might require the player to manually pick up "Brand Tokens" from the Brand Brain and insert them into the Smart Lab console to unlock high-fidelity Design outputs.
- **Orbit Garden**:
  - Could serve as a mission debriefing area, where completed client carousels are projected holographically above the garden table.
  - Can be used to unlock deeper character lore, where NPCs occasionally migrate to the garden to drop unique insights or side-quests.
