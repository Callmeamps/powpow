import { CellGrid } from './CellGrid.js';
import { Player } from './Player.js';
import { EntityManager } from './EntityManager.js';
import { LevelGenerator } from './LevelGenerator.js';
import { MaterialRegistry, E } from './MaterialRegistry.js';

// ---===[ MASTER CONTROL PANEL ]===---
// Tweak any value here to change the generated world.
const dungeonParams = {
    // Grid dimensions (must be odd for the generator algorithm)
    GRID_WIDTH: 201, 
    GRID_HEIGHT: 151,
    GRID_DEPTH: 5,

    // --- Room Shape & Size Parameters ---
    ROOM_MIN_SIZE_BASE: 2,      // Smallest room base size. (2*2+1 = 5x5)
    ROOM_MAX_SIZE_BASE: 5,      // Largest room base size. (5*2+1 = 11x11)
    ROOM_EXTRA_SIZE: 3,         // Adds variability. Max possible base is (MAX_BASE + EXTRA_SIZE).
    ROOM_RECTANGULARITY: 0.8,   // 0 = always square. 1 = can be very long and thin.

    // --- Corridor & Maze Parameters ---
    WINDING_PERCENT: 40,            // 0 = straight corridors. 100 = very twisty.
    DEAD_END_REMOVAL_PASSES: 2,     // How many times to remove dead ends. More passes = more open maps.
    CORRIDOR_THICKENING_PASSES: 1,  // How many passes to make corridors wider. 0 = 1-tile wide maze. 1-2 is usually good.

    // --- Core Generator Density Parameters ---
    ROOM_TRIES: 500,                // How many attempts to place rooms. More tries = more rooms, denser map.
    EXTRA_CONNECTOR_CHANCE: 20,     // % chance to add extra connections between areas, making the map less linear.

    // --- Scene Dressing Parameters ---
    ROOM_FLUID_CHANCE: 0.3,         // 30% of rooms get a fluid pool
    LAVA_CHANCE: 0.2,               // 20% of those fluid pools are lava
    ROOM_SAND_PILE_CHANCE: 0.5,     // 50% of rooms get sand piles

    // --- 3D Extrusion Parameters ---
    FOREGROUND_WALL_CHANCE: 0.25    // Chance for a wall to appear in the close foreground for parallax effect.
};
// ---===[ END OF CONTROL PANEL ]===---


// --- Game Setup (No need to edit below this line) ---
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

canvas.width = dungeonParams.GRID_WIDTH;
canvas.height = dungeonParams.GRID_HEIGHT;

const grid = new CellGrid(dungeonParams.GRID_WIDTH, dungeonParams.GRID_HEIGHT, dungeonParams.GRID_DEPTH);
const entityManager = new EntityManager();

// Pass the entire params object to the generator
const generator = new LevelGenerator(dungeonParams);
generator.generate(grid);

const mainLayer = Math.floor(dungeonParams.GRID_DEPTH / 2);
// Spawn the player in the first generated room
const playerSpawnRoom = generator.rooms.length > 0 ? generator.rooms[0] : { x: 100, y: 50 };
const player = new Player(playerSpawnRoom.x, playerSpawnRoom.y, mainLayer);
entityManager.add(player);

// --- Input Handling ---
const input = { left: false, right: false, jump: false };
window.addEventListener('keydown', (e) => {
    if (e.key === 'a' || e.key === 'ArrowLeft') input.left = true;
    if (e.key === 'd' || e.key === 'ArrowRight') input.right = true;
    if (e.key === 'w' || e.key === 'ArrowUp') input.jump = true;
});
window.addEventListener('keyup', (e) => {
    if (e.key === 'a' || e.key === 'ArrowLeft') input.left = false;
    if (e.key === 'd' || e.key === 'ArrowRight') input.right = false;
    if (e.key === 'w' || e.key === 'ArrowUp') input.jump = false;
});

// --- Game Loop ---
function gameLoop() {
    grid.update();
    entityManager.update(input, grid);
    render();
    requestAnimationFrame(gameLoop);
}

// --- Renderer ---
const imageData = ctx.createImageData(dungeonParams.GRID_WIDTH, dungeonParams.GRID_HEIGHT);
const data = imageData.data;
const colorVariance = 15;
const depthDarkenFactor = 0.25;

function render() {
    data.fill(0);
    for (let z = grid.depth - 1; z >= 0; z--) {
        const depthShade = 1.0 - (z / grid.depth) * depthDarkenFactor;
        for (let y = 0; y < grid.height; y++) {
            for (let x = 0; x < grid.width; x++) {
                const type = grid.get(x, y, z);
                if (type === E.EMPTY) continue;
                const mat = MaterialRegistry.get(type);
                const color = mat.color;
                const index = (y * grid.width + x) * 4;
                const hex = color.substring(1);
                let r = parseInt(hex.substring(0, 2), 16) + (Math.random() * colorVariance - (colorVariance / 2));
                let g = parseInt(hex.substring(2, 4), 16) + (Math.random() * colorVariance - (colorVariance / 2));
                let b = parseInt(hex.substring(4, 6), 16) + (Math.random() * colorVariance - (colorVariance / 2));
                r = Math.max(0, Math.min(255, r * depthShade));
                g = Math.max(0, Math.min(255, g * depthShade));
                b = Math.max(0, Math.min(255, b * depthShade));
                const topAlpha = mat.opacity;
                if (topAlpha >= 1.0) {
                    data[index] = r; data[index + 1] = g; data[index + 2] = b; data[index + 3] = 255;
                } else {
                    data[index] = r * topAlpha + data[index] * (1 - topAlpha);
                    data[index + 1] = g * topAlpha + data[index+1] * (1 - topAlpha);
                    data[index + 2] = b * topAlpha + data[index+2] * (1 - topAlpha);
                    data[index + 3] = 255; 
                }
            }
        }
    }
    ctx.putImageData(imageData, 0, 0);
    entityManager.draw(ctx);
}

// Start the game
gameLoop();