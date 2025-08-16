import { E } from './MaterialRegistry.js';
import { createNoise3D } from 'simplex-noise'; // You may need to install this: npm install simplex-noise


// Utility functions
function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
class Rect {
    constructor(x,y,w,h){ this.x=x; this.y=y; this.w=w; this.h=h; }
    intersects(o){
    return !(this.x+this.w <= o.x || o.x+o.w <= this.x || this.y+this.h <= o.y || o.y+o.h <= this.y);
    }
}

export class LevelGenerator {
    constructor(params) {
        this.params = params;
        // The generator's internal width/height is now the SMALL blueprint size
        this.width = params.BLUEPRINT_WIDTH;
        this.height = params.BLUEPRINT_HEIGHT;
        // NEW: Initialize the noise generator
        this.noise3D = createNoise3D();
        // this.simplex = new SimplexNoise(); // ADD THIS LINE


        this.blueprint = Array(this.width).fill(0).map(() => Array(this.height).fill(0));
        this.regions = Array(this.width).fill(0).map(() => Array(this.height).fill(null));
        this.currentRegion = -1;
        this.rooms = [];
        this.directions = [ {dx:-1,dy:0}, {dx:1,dy:0}, {dx:0,dy:-1}, {dx:0,dy:1} ];
    }
    
    generate(grid) {
        // STEP 1: Generate the low-resolution blueprint. This logic is the same as before.
        this._addRooms();
        for (let y = 1; y < this.height; y += 2) {
            for (let x = 1; x < this.width; x += 2) {
                if (this.blueprint[x][y] === 0) this._growMaze(x, y);
            }
        }
        this._connectRegions();
        this._removeDeadEnds();

        // --- STEP 2: "Stamp" the blueprint onto the high-resolution final grid ---
        const scale = this.params.TILE_SCALE;
        const mainLayer = Math.floor(grid.depth / 2);

        for (let bpX = 0; bpX < this.width; bpX++) {
            for (let bpY = 0; bpY < this.height; bpY++) {
                const isFloor = this.blueprint[bpX][bpY] === 1;
                const baseMaterial = isFloor ? E.EMPTY : E.STONE;

                // For each blueprint tile, fill a scaled block of pixels in the main grid
                for (let pX = 0; pX < scale; pX++) {
                    for (let pY = 0; pY < scale; pY++) {
                        const finalX = bpX * scale + pX;
                        const finalY = bpY * scale + pY;
                        
                        // Main playable layer
                        grid.set(finalX, finalY, mainLayer, baseMaterial);

                        // Background layers
                        grid.set(finalX, finalY, mainLayer + 1, E.STONE);
                        if (isFloor) grid.set(finalX, finalY, mainLayer + 1, E.EMPTY);

                        // Foreground layer
                        if (!isFloor && Math.random() < this.params.FOREGROUND_WALL_CHANCE) {
                            grid.set(finalX, finalY, mainLayer - 1, E.STONE);
                        }
                    }
                }
            }
        }

        // --- NEW STEP 3: Carve 3D Caverns with Noise ---
        // This iterates through the actual pixel grid, not the blueprint.
        this._carveNoiseCaverns(grid);

        // --- NEW STEP 4: Smooth the layers to make them look more natural ---
        this._smoothLayers(grid);


        // STEP 5: Dress the scene, making sure to scale all coordinates
        for (const room of this.rooms) {
            if (Math.random() < this.params.ROOM_FLUID_CHANCE) {
                const fluidType = Math.random() < this.params.LAVA_CHANCE ? E.LAVA : E.WATER;
                const fluidHeight = randInt(1, Math.floor(room.h / 3));
                
                // Iterate using blueprint coords and scale them up
                for (let bpY = room.y + room.h - fluidHeight; bpY < room.y + room.h; bpY++) {
                    for (let bpX = room.x; bpX < room.x + room.w; bpX++) {
                        // Fill a scaled block for each fluid tile
                        for (let pX = 0; pX < scale; pX++) {
                            for (let pY = 0; pY < scale; pY++) {
                                grid.set(bpX * scale + pX, bpY * scale + pY, mainLayer, fluidType);
                            }
                        }
                    }
                }
            }
            // Sand piles also need to be placed using scaled coordinates
            if (Math.random() < this.params.ROOM_SAND_PILE_CHANCE) {
                const pileCenterX = (room.x + randInt(0, room.w - 1)) * scale;
                const pileTopY = (room.y + room.h) * scale;
                for(let i=0; i < randInt(20, 50) * scale; i++) { // More sand for larger scales
                    const px = pileCenterX + randInt(-4 * scale, 4 * scale);
                    const py = pileTopY - randInt(0, 5 * scale);
                    if(grid.get(px,py,mainLayer) === E.EMPTY) grid.set(px, py, mainLayer, E.SAND);
                }
            }
        }
    }

    _addRooms() {
        for (let i = 0; i < this.params.ROOM_TRIES; i++) {
            const size = randInt(this.params.ROOM_MIN_SIZE_BASE, this.params.ROOM_MAX_SIZE_BASE + this.params.ROOM_EXTRA_SIZE) * 2 + 1;
            const rectangularity = randInt(0, Math.floor(size * this.params.ROOM_RECTANGULARITY / 2)) * 2;
            let w = size, h = size;
            if (Math.random() < 0.5) w += rectangularity; else h += rectangularity;
            if (w >= this.width - 2 || h >= this.height - 2) continue;
            const x = randInt(0, Math.floor((this.width - w - 2) / 2)) * 2 + 1;
            const y = randInt(0, Math.floor((this.height - h - 2) / 2)) * 2 + 1;
            const rect = new Rect(x, y, w, h);
            if (this.rooms.some(r => r.intersects(rect))) continue;
            this.rooms.push(rect);
            this._startRegion();
            for (let dx = 0; dx < w; dx++) for (let dy = 0; dy < h; dy++) this._carve(rect.x + dx, rect.y + dy);
        }
    }
    
    _removeDeadEnds() {
        for (let i = 0; i < this.params.DEAD_END_REMOVAL_PASSES; i++) {
            let done = false;
            while (!done) {
                done = true;
                for (let x = 1; x < this.width - 1; x++) {
                    for (let y = 1; y < this.height - 1; y++) {
                        if (this.blueprint[x][y] === 0) continue;
                        let exits = 0;
                        this.directions.forEach(d => { if(this.blueprint[x+d.dx][y+d.dy] === 1) exits++; });
                        if (exits === 1) { this.blueprint[x][y] = 0; done = false; }
                    }
                }
            }
        }
    }

 // --- NEW METHOD: Smooth Layers with Cellular Automata ---
    _smoothLayers(grid) {
        const mainLayer = Math.floor(grid.depth / 2);

        for (let i = 0; i < this.params.SMOOTHING_PASSES; i++) {
            // We read from the grid and write to a temporary copy to avoid weird cascading effects.
            let tempGrid = new Uint8Array(grid.cells);

            for (let z = 0; z < grid.depth; z++) {
                if (z === mainLayer) continue; // Don't smooth the main layer

                for (let y = 1; y < grid.height - 1; y++) {
                    for (let x = 1; x < grid.width - 1; x++) {
                        // Count neighbors in a 3x3 square on the same layer
                        let wallNeighbors = 0;
                        for (let ny = -1; ny <= 1; ny++) {
                            for (let nx = -1; nx <= 1; nx++) {
                                if (nx === 0 && ny === 0) continue;
                                if (grid.get(x + nx, y + ny, z) === E.STONE) {
                                    wallNeighbors++;
                                }
                            }
                        }

                        const index = grid.getIndex(x, y, z);
                        // Rule: If a wall has 3 or fewer neighbors, it's probably a thin pillar, so remove it.
                        if (grid.cells[index] === E.STONE && wallNeighbors <= 3) {
                            tempGrid[index] = E.EMPTY;
                        }
                        // Rule: If empty space has 5 or more neighbors, it's a small hole, so fill it.
                        else if (grid.cells[index] === E.EMPTY && wallNeighbors >= 5) {
                            tempGrid[index] = E.STONE;
                        }
                    }
                }
            }
            // After checking every cell, apply the changes back to the main grid for the next pass.
            grid.cells.set(tempGrid);
        }
    }

// --- NEW METHOD: Carve 3D Caverns with Simplex Noise ---
    _carveNoiseCaverns(grid) {
        const mainLayer = Math.floor(grid.depth / 2);
        const noiseScale = this.params.NOISE_SCALE / this.params.TILE_SCALE; // Adjust noise scale by tile size
        const threshold = this.params.NOISE_THRESHOLD;

        for (let z = 0; z < grid.depth; z++) {
            // We do NOT carve the main playable layer. We want to preserve its design.
            if (z === mainLayer) continue;

            for (let y = 0; y < grid.height; y++) {
                for (let x = 0; x < grid.width; x++) {
                    // Sample the 3D noise field
                    const noiseValue = this.noise3D(x / noiseScale, y / noiseScale, z / (noiseScale / 2));
                    
                    // If the noise value is above our threshold, carve out the stone.
                    if (noiseValue > threshold) {
                        grid.set(x, y, z, E.EMPTY);
                    }
                }
            }
        }
    }

// --- NEW METHOD: Smooth Layers with Cellular Automata ---
    _smoothLayers(grid) {
        const mainLayer = Math.floor(grid.depth / 2);

        for (let i = 0; i < this.params.SMOOTHING_PASSES; i++) {
            // We read from the grid and write to a temporary copy to avoid weird cascading effects.
            let tempGrid = new Uint8Array(grid.cells);

            for (let z = 0; z < grid.depth; z++) {
                if (z === mainLayer) continue; // Don't smooth the main layer

                for (let y = 1; y < grid.height - 1; y++) {
                    for (let x = 1; x < grid.width - 1; x++) {
                        // Count neighbors in a 3x3 square on the same layer
                        let wallNeighbors = 0;
                        for (let ny = -1; ny <= 1; ny++) {
                            for (let nx = -1; nx <= 1; nx++) {
                                if (nx === 0 && ny === 0) continue;
                                if (grid.get(x + nx, y + ny, z) === E.STONE) {
                                    wallNeighbors++;
                                }
                            }
                        }

                        const index = grid.getIndex(x, y, z);
                        // Rule: If a wall has 3 or fewer neighbors, it's probably a thin pillar, so remove it.
                        if (grid.cells[index] === E.STONE && wallNeighbors <= 3) {
                            tempGrid[index] = E.EMPTY;
                        }
                        // Rule: If empty space has 5 or more neighbors, it's a small hole, so fill it.
                        else if (grid.cells[index] === E.EMPTY && wallNeighbors >= 5) {
                            tempGrid[index] = E.STONE;
                        }
                    }
                }
            }
            // After checking every cell, apply the changes back to the main grid for the next pass.
            grid.cells.set(tempGrid);
        }
    }



    _startRegion() { this.currentRegion++; }
    _carve(x, y) { this.blueprint[x][y] = 1; this.regions[x][y] = this.currentRegion; }
    _canCarve(x, y, {dx, dy}) {
        const nx = x + dx * 2, ny = y + dy * 2;
        if (nx < 0 || ny < 0 || nx >= this.width || ny >= this.height) return false;
        return this.blueprint[nx][ny] === 0;
    }
    
    _growMaze(sx, sy) {
        let cells = [{ x: sx, y: sy }];
        this._startRegion();
        this._carve(sx, sy);
        let lastDir = null;
        while (cells.length) {
            const cell = cells[cells.length - 1];
            let options = this.directions.filter(d => this._canCarve(cell.x, cell.y, d));
            if (options.length) {
                let dir;
                if (lastDir && options.includes(lastDir) && Math.random() * 100 > this.params.WINDING_PERCENT) {
                    dir = lastDir;
                } else {
                    dir = options[randInt(0, options.length - 1)];
                }
                this._carve(cell.x + dir.dx, cell.y + dir.dy);
                this._carve(cell.x + dir.dx * 2, cell.y + dir.dy * 2);
                cells.push({ x: cell.x + dir.dx * 2, y: cell.y + dir.dy * 2 });
                lastDir = dir;
            } else {
                cells.pop();
                lastDir = null;
            }
        }
    }

    _connectRegions() {
        let connectors = new Map();
        for (let x = 1; x < this.width - 1; x++) {
            for (let y = 1; y < this.height - 1; y++) {
                if (this.blueprint[x][y] !== 0) continue;
                let neigh = new Set();
                this.directions.forEach(d => {
                    let r = this.regions[x + d.dx][y + d.dy];
                    if (r != null) neigh.add(r);
                });
                if (neigh.size < 2) continue;
                connectors.set(`${x},${y}`, [...neigh]);
            }
        }
        let merged = {};
        for(let i = 0; i <= this.currentRegion; i++) merged[i] = i;
        let find = r => {
            while(r !== merged[r]) r = merged[r];
            return r;
        };
        let connectorKeys = [...connectors.keys()];
        while(new Set(Object.values(merged).map(find)).size > 1) {
            if (connectorKeys.length === 0) break; // Stop if no connectors left
            const key = connectorKeys[randInt(0, connectorKeys.length - 1)];
            const [x, y] = key.split(',').map(Number);
            this.blueprint[x][y] = 1;
            const regs = connectors.get(key).map(find);
            const dest = regs[0];
            const srcs = regs.slice(1);
            for(let i = 0; i <= this.currentRegion; i++) {
                if(srcs.includes(find(i))) merged[i] = dest;
            }
            connectorKeys = connectorKeys.filter(k => {
                const currentRegions = new Set(connectors.get(k).map(find));
                if (currentRegions.size > 1) return true;
                if (Math.random() * 100 < this.params.EXTRA_CONNECTOR_CHANCE) {
                    const [cx, cy] = k.split(',').map(Number);
                    this.blueprint[cx][cy] = 1;
                }
                return false;
            });
        }
    }
}