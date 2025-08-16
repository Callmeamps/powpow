import { CellGrid } from './CellGrid.js';
import { Player } from './Player.js';
import { EntityManager } from './EntityManager.js';
import { LevelGenerator } from './LevelGenerator.js';
import { MaterialRegistry, E } from './MaterialRegistry.js';


// ---===[ MASTER CONTROL PANEL ]===---
const dungeonParams = {
    // --- NEW: Blueprint & Scale Control ---
    // This is the size of the low-resolution map the generator creates. Must be odd.
    BLUEPRINT_WIDTH: 61,
    BLUEPRINT_HEIGHT: 41,

    // This is the "zoom" factor. Each 1 tile in the blueprint becomes an NxN block of pixels.
    // This is the replacement for your original GRID_SIZE.
    TILE_SCALE: 8,

    // --- Generator Logic (operates on the Blueprint) ---
    ROOM_MIN_SIZE_BASE: 2,      // Smallest room base size on the blueprint (e.g., 2 -> 5x5 tiles)
    ROOM_MAX_SIZE_BASE: 4,      // Largest room base size on the blueprint
    ROOM_EXTRA_SIZE: 2,         // Adds variability
    ROOM_RECTANGULARITY: 0.7,   // How stretched rooms can be
    ROOM_TRIES: 300,            // More tries = denser map
    WINDING_PERCENT: 40,        // How twisty corridors are
    EXTRA_CONNECTOR_CHANCE: 20,
    DEAD_END_REMOVAL_PASSES: 2,

    // --- Scene Dressing & 3D ---
    GRID_DEPTH: 5,
    ROOM_FLUID_CHANCE: 0.3,
    LAVA_CHANCE: 0.2,
    ROOM_SAND_PILE_CHANCE: 0.5,
    FOREGROUND_WALL_CHANCE: 0.25,

        // --- NEW: 3D Noise Cavern Parameters ---
    // This controls the "zoom level" of the noise.
    // Smaller values = larger, smoother, more sweeping caverns.
    // Larger values = smaller, more detailed, and busier caves.
    NOISE_SCALE: 25.0,

    // This is the carving threshold. Noise values range from -1 to 1.
    // A lower threshold means more rock is carved away, creating more open space.
    // A higher threshold means less is carved, creating smaller, rarer caves.
    NOISE_THRESHOLD: -0.2,

    // How many times to run the smoothing algorithm to clean up noise artifacts.
    SMOOTHING_PASSES: 1,

};
// ---===[ END OF CONTROL PANEL ]===---


// --- Game Setup (Calculates final size based on blueprint and scale) ---
const FINAL_GRID_WIDTH = dungeonParams.BLUEPRINT_WIDTH * dungeonParams.TILE_SCALE;
const FINAL_GRID_HEIGHT = dungeonParams.BLUEPRINT_HEIGHT * dungeonParams.TILE_SCALE;

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
canvas.width = FINAL_GRID_WIDTH;
canvas.height = FINAL_GRID_HEIGHT;

const grid = new CellGrid(FINAL_GRID_WIDTH, FINAL_GRID_HEIGHT, dungeonParams.GRID_DEPTH);
const entityManager = new EntityManager();

const generator = new LevelGenerator(dungeonParams);
generator.generate(grid);

const mainLayer = Math.floor(dungeonParams.GRID_DEPTH / 2);
const playerSpawnRoom = generator.rooms.length > 0 ? generator.rooms[0] : { x: 10, y: 10 };
// Player spawn position must also be scaled
const player = new Player(
    playerSpawnRoom.x * dungeonParams.TILE_SCALE, 
    playerSpawnRoom.y * dungeonParams.TILE_SCALE, 
    mainLayer
);
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
const imageData = ctx.createImageData(FINAL_GRID_WIDTH, FINAL_GRID_HEIGHT);
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