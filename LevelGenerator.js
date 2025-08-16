import { E } from './MaterialRegistry.js';

export class LevelGenerator {
    static generate(grid) {
        const width = grid.width;
        const height = grid.height;

        // 1. Fill world with stone
        for(let i=0; i < grid.cells.length; i++) {
            grid.cells[i] = E.STONE;
        }

        // 2. Carve out some "caverns" (like the rooms in your generator)
        const roomTries = 75;
        const rooms = [];
        for (let i = 0; i < roomTries; i++) {
            const w = Math.floor(Math.random() * 20) + 15;
            const h = Math.floor(Math.random() * 15) + 10;
            const x = Math.floor(Math.random() * (width - w - 2)) + 1;
            const y = Math.floor(Math.random() * (height - h - 20)) + 10; // Avoid top of map

            // Carve the room
            for (let rx = x; rx < x + w; rx++) {
                for (let ry = y; ry < y + h; ry++) {
                    grid.set(rx, ry, E.EMPTY);
                }
            }
            rooms.push({x, y, w, h});
        }
        
        // 3. Populate rooms with interesting materials
        for(const room of rooms) {
            // 20% chance to fill bottom with water
            if (Math.random() < 0.2) {
                for (let rx = room.x; rx < room.x + room.w; rx++) {
                    for (let ry = room.y + Math.floor(room.h * 0.7); ry < room.y + room.h; ry++) {
                        grid.set(rx, ry, E.WATER);
                    }
                }
            }
            // Add some sand piles
            if (Math.random() < 0.5) {
                const pileX = room.x + Math.floor(Math.random() * room.w);
                const pileY = room.y + room.h - 1;
                for (let i = 0; i < 30; i++) {
                    grid.set(pileX + Math.floor(Math.random()*6)-3, pileY - i, E.SAND);
                }
            }
        }
    }
}