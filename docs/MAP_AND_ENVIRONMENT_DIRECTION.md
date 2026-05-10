# MCP Office — Map and Environment Direction

## Reference Influence

The uploaded reference image guided the new office map in four specific ways:

- **Room graph instead of one open hall**: the HQ is now composed of distinct connected rooms around a central hub.
- **Clean white + icy blue material language**: walls, floors, desks, and glass lean into a bright premium sci-fi palette instead of a warm studio palette.
- **Glass-first architecture**: partial transparent walls preserve readability from the isometric camera while keeping the “architectural model” feeling.
- **Soft cyan technological glow**: holographic screens, room panels, and accent lights create a clean AI operations atmosphere without drifting into dark cyberpunk lighting.

This is **not** a copy of the image. It is a playable low-poly interpretation of its spatial mood, material direction, and modular room composition.

## New Map Layout

The office is organized as an AI headquarters with a central control hub and five specialist rooms:

- **Central Hub** at the center: player spawn, shared control zone, lounge/island desk, route connector
- **Brand Brain MCP Room** to the north: strategy, brand control, large wall display
- **Editorial MCP Room** to the west: calendar logic, floating content cards, multi-screen desk
- **Design MCP Room** to the east: visual wall, layout frames, palette stand
- **Narration MCP Room** to the south-west: microphone booth, wave screen, acoustic panels
- **Output / Review Station** to the south-east: review screen, checklist console, export terminal

Corridors link the rooms to the hub and preserve easy navigation from the fixed orthographic camera.

## Modular Asset System

The new environment is built from primitive-driven modular assets in [src/world/assets/createModularAssets.ts](/Users/rochatales/Automations/game-workplace/src/world/assets/createModularAssets.ts):

- `createFloorTile()`
- `createWallSegment()`
- `createGlassWall()`
- `createDesk()`
- `createChair()`
- `createScreen()`
- `createHologramPanel()`
- `createDoorFrame()`
- `createPlant()`
- `createRoomLabel()`

Higher-level assembly happens in [src/world/createOfficeMap.ts](/Users/rochatales/Automations/game-workplace/src/world/createOfficeMap.ts), with map data centralized in [src/world/mapConfig.ts](/Users/rochatales/Automations/game-workplace/src/world/mapConfig.ts).

## Color and Material Direction

Base environment direction:

- Structural walls: near-white, matte, slightly blue-shifted
- Floors: pale blue-white modular tiles
- Glass: low-opacity cyan-tinted panels
- Desks and consoles: white shells with accent strips
- Screens and holograms: emissive cyan with MCP-specific accent overlays

Accent logic:

- Brand Brain: gold
- Editorial: blue
- Design: green
- Narration: purple
- Output / Review: silver-white

Accent colors should stay concentrated in **small strategic highlights**, not flood entire rooms.

## Lighting Direction

The new map aims for a bright premium headquarters feel:

- Soft global daylight from the existing directional rig
- Light ambient fill to keep every room readable
- Cyan hub glow to unify the whole headquarters
- Room-local point lights with subtle MCP accent color
- Emissive holograms and screens for technological presence

The target mood is **clean, intelligent, calm, and premium**.

## Navigation and Readability

The isometric camera requires deliberate architectural compromises:

- Rooms use **partial walls**, never fully sealed boxes
- Front-facing edges stay visually light or open
- Corridors are broad and easy to read
- Collision is simple and functional: walls, desks, consoles
- Text in-world stays short and readable through `troika-three-text`

## Future Expansion Ideas

- Add more rooms for future MCPs or whole departments
- Add animated status states in corridors and room thresholds
- Add floor-specific sectors or a second wing
- Add workflow heatmaps, urgency lights, and transport lines
- Add mission-based room reconfiguration depending on the active production pipeline
