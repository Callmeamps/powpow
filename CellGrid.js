import { E, MaterialRegistry } from './MaterialRegistry.js';

export class CellGrid {
    // MODIFIED: Constructor now takes depth
    constructor(width, height, depth) {
        this.width = width;
        this.height = height;
        this.depth = depth;
        this.cells = new Uint8Array(width * height * depth).fill(E.EMPTY);
        // NEW: We'll store lifespan data separately to keep `cells` small
        this.lifespans = new Map(); 
    }

    // MODIFIED: Indexing is now 3D
    getIndex(x, y, z) { 
        return (z * this.width * this.height) + (y * this.width) + x; 
    }

    // MODIFIED: All accessors now require a Z coordinate
    get(x, y, z) {
        if (x < 0 || x >= this.width || y < 0 || y >= this.height || z < 0 || z >= this.depth) return E.STONE;
        return this.cells[this.getIndex(x, y, z)];
    }

    set(x, y, z, type) {
        if (x < 0 || x >= this.width || y < 0 || y >= this.height || z < 0 || z >= this.depth) return;
        const index = this.getIndex(x, y, z);
        this.cells[index] = type;

        // NEW: Handle lifespan tracking
        const mat = MaterialRegistry.get(type);
        if (mat.lifespan) {
            this.lifespans.set(index, mat.lifespan);
        } else {
            this.lifespans.delete(index);
        }
    }

    swap(x1, y1, z1, x2, y2, z2) {
        const type1 = this.get(x1, y1, z1);
        const type2 = this.get(x2, y2, z2);
        this.set(x1, y1, z1, type2);
        this.set(x2, y2, z2, type1);
    }
    
    // MODIFIED: Collision checking now requires a Z coordinate
    isRectSolid(x, y, z, w, h) {
        for (let i = Math.floor(x); i < x + w; i++) {
            for (let j = Math.floor(y); j < y + h; j++) {
                if (MaterialRegistry.isSolid(this.get(i, j, z))) {
                    return true;
                }
            }
        }
        return false;
    }

    update() {
        // Iterate through every layer of the grid
        for (let z = 0; z < this.depth; z++) {
            // Iterate from bottom to top to handle gravity correctly
            for (let y = this.height - 2; y >= 0; y--) {
                // Alternate scan direction for more natural particle flow
                for (let i = 0; i < this.width; i++) {
                    const scanLeft = Math.random() < 0.5;
                    const x = scanLeft ? i : this.width - 1 - i;
                    
                    const type = this.get(x, y, z);

                    // Skip empty or static particles
                    if (type === E.EMPTY || type === E.STONE) continue;

                    const mat = MaterialRegistry.get(type);
                    
                    // --- PRIORITY 1: Fall Down (Y-Axis) ---
                    const belowMat = MaterialRegistry.get(this.get(x, y + 1, z));
                    if (mat.density > belowMat.density) {
                        this.swap(x, y, z, x, y + 1, z);
                        continue; // Particle moved, so we're done with it for this frame
                    }
                    
                    // --- PRIORITY 2: Spread Sideways (X-Axis) ---
                    const dir = Math.random() < 0.5 ? 1 : -1;
                    const belowSideMat = MaterialRegistry.get(this.get(x + dir, y + 1, z));

                    if (type === E.SAND && mat.density > belowSideMat.density) {
                        this.swap(x, y, z, x + dir, y + 1, z);
                        continue;
                    } else if (type === E.WATER) {
                        const sideMat = MaterialRegistry.get(this.get(x + dir, y, z));
                        if (mat.density > sideMat.density) {
                            this.swap(x, y, z, x + dir, y, z);
                            continue;
                        }
                    }

                    // --- PRIORITY 3: Flow Between Layers (Z-Axis) ---
                    // This is the critical new logic.
                    // If a particle couldn't move down or sideways, it checks for space in front or behind.
                    const zDir = Math.random() < 0.5 ? 1 : -1; // Check a random adjacent layer
                    const zMat = MaterialRegistry.get(this.get(x, y, z + zDir));

                    if (mat.density > zMat.density) {
                        this.swap(x, y, z, x, y, z + zDir);
                    }
                }
            }
        }
    }
}