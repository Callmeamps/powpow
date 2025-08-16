import { CellGrid } from './CellGrid.js';
import { EntityManager, Player } from './EntityManager.js';
import { LevelGenerator } from './LevelGenerator.js';

// --- Game Setup ---
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const GRID_WIDTH = 200;
const GRID_HEIGHT = 150;
canvas.width = GRID_WIDTH;
canvas.height = GRID_HEIGHT;

const grid = new CellGrid(GRID_WIDTH, GRID_HEIGHT);
const entityManager = new EntityManager();

LevelGenerator.generate(grid);

const player = new Player(50, 20);
entityManager.add(player);

// --- Input Handling (from platformer.js) ---
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
    // 1. Update Physics World
    grid.update();

    // 2. Update Game Entities
    entityManager.update(input, grid);

    // 3. Render Everything
    render();

    requestAnimationFrame(gameLoop);
}

// --- Renderer ---
// Using the efficient ImageData method from your powder sim
const imageData = ctx.createImageData(GRID_WIDTH, GRID_HEIGHT);
const data = imageData.data;

import { MaterialRegistry } from './MaterialRegistry.js';

function render() {
    // Draw the grid
    for(let i=0; i<grid.cells.length; i++) {
        const type = grid.cells[i];
        const color = MaterialRegistry.get(type).color;
        const index = i * 4;
        
        // This is a fast way to get RGB from hex color
        if (color !== 'transparent') {
            const hex = color.substring(1);
            data[index] = parseInt(hex.substring(0, 2), 16);
            data[index + 1] = parseInt(hex.substring(2, 4), 16);
            data[index + 2] = parseInt(hex.substring(4, 6), 16);
            data[index + 3] = 255;
        } else {
            data[index + 3] = 0; // Transparent
        }
    }
    ctx.putImageData(imageData, 0, 0);

    // Draw the entities on top
    entityManager.draw(ctx);
}


// Start the game
gameLoop();