# Pixel Physics Platformer

A browser-based, 2D/3D pixel physics platformer featuring destructible environments, fluid simulation, and local multiplayer combat.

## Features

- **Volumetric Dungeon Generation:** Procedurally generates multi-layered dungeons with rooms, corridors, and vertical shafts using simplex noise and cellular automata smoothing.
- **Pixel Physics Simulation:** Materials like sand, water, lava, acid, and smoke interact physically and visually, flowing and settling naturally.
- **Multiplayer Platforming:** Two players can compete or cooperate, each with unique controls and health.
- **Combat System:** Players can attack each other, with hit detection and health management.
- **Layered Rendering:** Atmospheric depth and fog effects for immersive visuals.

## Controls

**Player 1**
- Move: `A` (left), `D` (right)
- Jump: `W`
- Attack: `Space`

**Player 2**
- Move: `←` (left), `→` (right)
- Jump: `↑`
- Attack: `Enter`

## How to Run

1. **Install dependencies** (for dungeon generation):
   ```sh
   npm install
   ```

2. **Start a local web server** (from the project root):
   ```sh
   npx serve .
   ```
   Or use any static file server of your choice.

3. **Open the game** in your browser:
   ```sh
   $BROWSER http://localhost:3000
   ```

## Project Structure

- `index.html` — Main HTML file, sets up the canvas and loads the game.
- `game.js` — Game loop, rendering, input handling, and setup.
- `CellGrid.js` — 3D grid for material simulation and physics.
- `MaterialRegistry.js` — Defines material types and their properties.
- `LevelGenerator.js` — Procedural dungeon and cavern generation.
- `EntityManager.js` — Manages all entities (players, enemies).
- `Player.js` — Player logic, movement, combat, and rendering.

## Materials

- **Sand, Water, Lava, Acid, Glass, Wood, Stone, Fire, Smoke**
- Each material has unique properties (density, opacity, flammability, etc.)

## Notes

- Requires a modern browser with ES6 module support.
- Designed for local multiplayer (two players on one keyboard).
- Dungeon generation uses [simplex-noise](https://www.npmjs.com/package/simplex-noise).

---

Enjoy exploring and battling in a dynamic, destructible