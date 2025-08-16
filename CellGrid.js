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
        // NEW: Update lifespans first
        for (const [index, life] of this.lifespans.entries()) {
            if (life <= 1) {
                // If fire burns out, it might leave smoke
                if (this.cells[index] === E.FIRE) {
                    this.cells[index] = E.SMOKE;
                    this.lifespans.set(index, MaterialRegistry.get(E.SMOKE).lifespan);
                } else {
                    this.cells[index] = E.EMPTY;
                    this.lifespans.delete(index);
                }
            } else {
                this.lifespans.set(index, life - 1);
            }
        }

        // MODIFIED: Loop through all 3 dimensions
        for (let z = 0; z < this.depth; z++) {
            for (let y = this.height - 1; y >= 0; y--) {
                const scanLeft = Math.random() < 0.5;
                for (let i = 0; i < this.width; i++) {
                    const x = scanLeft ? i : this.width - 1 - i;
                    
                    const type = this.get(x, y, z);
                    const mat = MaterialRegistry.get(type);
                    if (type === E.EMPTY || !mat.movable) continue;

                    const belowType = this.get(x, y + 1, z);
                    const belowMat = MaterialRegistry.get(belowType);
                    
                    // Priority 1: Move Down (Y-axis)
                    if (mat.density > belowMat.density) {
                        this.swap(x, y, z, x, y + 1, z);
                        continue;
                    }

                    // Priority 2: Flow Sideways / Tumble (X-axis)
                    const dir = Math.random() < 0.5 ? 1 : -1;
                    if (mat.state === 'liquid' || type === E.FIRE || type === E.SMOKE) {
                        const sideType = this.get(x + dir, y, z);
                        if (mat.density > MaterialRegistry.get(sideType).density) {
                            this.swap(x, y, z, x + dir, y, z);
                            continue;
                        }
                    } else if (mat.state === 'solid') {
                        const belowSideType = this.get(x + dir, y + 1, z);
                        if (mat.density > MaterialRegistry.get(belowSideType).density) {
                            this.swap(x, y, z, x + dir, y + 1, z);
                            continue;
                        }
                    }

                    // NEW -- Priority 3: Flow into other layers (Z-axis)
                    // Allows particles to "push" into the background if blocked.
                    const behindType = this.get(x, y, z + 1);
                    if (mat.density > MaterialRegistry.get(behindType).density) {
                        this.swap(x, y, z, x, y, z + 1);
                    }
                }
            }
        }
    }
}