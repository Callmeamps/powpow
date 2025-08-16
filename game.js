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
    GRID_DEPTH: 6,
    ROOM_FLUID_CHANCE: 0.8,
    LAVA_CHANCE: 0.2,
    ROOM_SAND_PILE_CHANCE: 0.5,
    FOREGROUND_WALL_CHANCE: 0.5,

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

    // --- NEW: Layer Similarity Threshold ---
    // This controls how similar layers must be.
    LAYER_SIMILARITY: 0.85,
    VERTICAL_CONNECTOR_CHANCE: 0.4,
    DEPTH_SHADING_STRENGTH: 0.3,

// A color to blend with distant layers for an atmospheric effect.
    ATMOSPHERE_COLOR: { r: 20, g: 25, b: 25 }, // A dark blue/purple, like in a deep cave

};
// ---===[ END OF CONTROL PANEL ]===---


/// --- Game Setup ---
const FINAL_GRID_WIDTH = dungeonParams.BLUEPRINT_WIDTH * dungeonParams.TILE_SCALE;
const FINAL_GRID_HEIGHT = dungeonParams.BLUEPRINT_HEIGHT * dungeonParams.TILE_SCALE;
const mainLayer = Math.floor(dungeonParams.GRID_DEPTH / 2);

const canvas = document.getElementById('gameCanvas');
canvas.width = FINAL_GRID_WIDTH; canvas.height = FINAL_GRID_HEIGHT;
const ctx = canvas.getContext('2d');

const grid = new CellGrid(FINAL_GRID_WIDTH, FINAL_GRID_HEIGHT, dungeonParams.GRID_DEPTH);
const entityManager = new EntityManager();
const generator = new LevelGenerator(dungeonParams);
generator.generate(grid);

// --- NEW: Player Configurations ---
const playerConfigs = {
    'P1': {
        id: 'P1',
        x: 0, y: 0, z: mainLayer, // Position is a placeholder
        color: '#FF5252',
        controls: { left: 'KeyA', right: 'KeyD', jump: 'KeyW', attack: 'Space' }
    },
    'P2': {
        id: 'P2',
        x: 0, y: 0, z: mainLayer,
        color: '#448AFF',
        controls: { left: 'ArrowLeft', right: 'ArrowRight', jump: 'ArrowUp', attack: 'Enter' }
    }
};

// --- MODIFIED: Spawn Players in different rooms ---
const spawnRooms = generator.rooms.length > 1 ? [generator.rooms[0], generator.rooms[1]] : [{x:10,y:10}, {x:20,y:10}];

playerConfigs['P1'].x = (spawnRooms[0].x + 2) * dungeonParams.TILE_SCALE;
playerConfigs['P1'].y = (spawnRooms[0].y + 2) * dungeonParams.TILE_SCALE;
entityManager.add(new Player(playerConfigs['P1']));

playerConfigs['P2'].x = (spawnRooms[1].x + 2) * dungeonParams.TILE_SCALE;
playerConfigs['P2'].y = (spawnRooms[1].y + 2) * dungeonParams.TILE_SCALE;
entityManager.add(new Player(playerConfigs['P2']));

// --- NEW: Universal Input System ---
const inputs = {
    'P1': { left: false, right: false, jump: false, attack: false },
    'P2': { left: false, right: false, jump: false, attack: false }
};
const keyState = {}; // Tracks the current state of all keys on the keyboard

window.addEventListener('keydown', (e) => { keyState[e.code] = true; });
window.addEventListener('keyup', (e) => { keyState[e.code] = false; });

function processInputs() {
    // For each configured player, check their controls against the keyState
    for (const id in playerConfigs) {
        const controls = playerConfigs[id].controls;
        inputs[id].left = keyState[controls.left] || false;
        inputs[id].right = keyState[controls.right] || false;
        inputs[id].jump = keyState[controls.jump] || false;
        inputs[id].attack = keyState[controls.attack] || false;
    }
}

// --- MODIFIED: Main game loop ---
function gameLoop() {
    processInputs(); // Translate keyboard state to player actions
    entityManager.update(inputs, grid); // Pass all actions to the manager
    grid.update();
    render();
    
    requestAnimationFrame(gameLoop);
}

// --- Renderer ---
const imageData = ctx.createImageData(FINAL_GRID_WIDTH, FINAL_GRID_HEIGHT);
const data = imageData.data;
const colorVariance = 15;
const depthDarkenFactor = 0.25;

// In FILE: game.js, replace the entire render() function with this:

function render() {
    const mainLayer = Math.floor(dungeonParams.GRID_DEPTH / 2);

    // Clear the buffer
    data.fill(0);

    // Render grid from back to front (z = depth-1 to 0)
    for (let z = grid.depth - 1; z >= 0; z--) {
        // --- NEW: Depth Calculation ---
        // How far is this layer from the main action layer?
        const depthDistance = Math.abs(z - mainLayer);
        
        // Calculate the shading factor. The farther the layer, the darker it is.
        const shadeFactor = 1.0 - (depthDistance * (dungeonParams.DEPTH_SHADING_STRENGTH / mainLayer));
        
        // Calculate how much atmospheric fog to apply. More fog for farther layers.
        const fogFactor = (depthDistance / mainLayer) * 0.5; // Fog is more subtle

        for (let y = 0; y < grid.height; y++) {
            for (let x = 0; x < grid.width; x++) {
                const type = grid.get(x, y, z);
                if (type === E.EMPTY) continue;

                const mat = MaterialRegistry.get(type);
                const color = mat.color;
                const index = (y * grid.width + x) * 4;

                const hex = color.substring(1);
                let r = parseInt(hex.substring(0, 2), 16);
                let g = parseInt(hex.substring(2, 4), 16);
                let b = parseInt(hex.substring(4, 6), 16);

                // --- APPLY DEPTH EFFECTS ---
                // 1. Apply Shading
                r *= shadeFactor;
                g *= shadeFactor;
                b *= shadeFactor;

                // 2. Apply Atmospheric Fog (Lerp towards the fog color)
                if (depthDistance > 0) {
                    const fog = dungeonParams.ATMOSPHERE_COLOR;
                    r = r * (1 - fogFactor) + fog.r * fogFactor;
                    g = g * (1 - fogFactor) + fog.g * fogFactor;
                    b = b * (1 - fogFactor) + fog.b * fogFactor;
                }
                
                // Clamp colors to valid range
                r = Math.max(0, Math.min(255, r));
                g = Math.max(0, Math.min(255, g));
                b = Math.max(0, Math.min(255, b));

                // --- Alpha Blending (from before) ---
                const topAlpha = mat.opacity;
                if (topAlpha >= 1.0) {
                    data[index] = r; data[index + 1] = g; data[index + 2] = b; data[index + 3] = 255;
                } else {
                    const bottomR = data[index];
                    const bottomG = data[index + 1];
                    const bottomB = data[index + 2];
                    data[index] = r * topAlpha + bottomR * (1 - topAlpha);
                    data[index + 1] = g * topAlpha + bottomG * (1 - topAlpha);
                    data[index + 2] = b * topAlpha + bottomB * (1 - topAlpha);
                    data[index + 3] = 255;
                }
            }
        }
    }

    // 3. Draw the final image buffer to the canvas
    ctx.putImageData(imageData, 0, 0);

    // 4. Draw entities on top (they will now appear bright against the shaded background)
    entityManager.draw(ctx, mainLayer);
}

// Start the game
gameLoop();