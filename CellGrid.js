import { E, MaterialRegistry } from './MaterialRegistry.js';

export class CellGrid {
    constructor(width, height) {
        this.width = width;
        this.height = height;
        this.cells = new Uint8Array(width * height).fill(E.EMPTY);
    }

    getIndex(x, y) { return y * this.width + x; }

    get(x, y) {
        if (x < 0 || x >= this.width || y < 0 || y >= this.height) return E.STONE; // Treat out-of-bounds as walls
        return this.cells[this.getIndex(x, y)];
    }

    set(x, y, type) {
        if (x < 0 || x >= this.width || y < 0 || y >= this.height) return;
        this.cells[this.getIndex(x, y)] = type;
    }

    swap(x1, y1, x2, y2) {
        const type1 = this.get(x1, y1);
        const type2 = this.get(x2, y2);
        this.set(x1, y1, type2);
        this.set(x2, y2, type1);
    }

    // This is the key interaction point for entities
    // Checks a rectangular area for solid pixels
    isRectSolid(x, y, w, h) {
        for (let i = Math.floor(x); i < x + w; i++) {
            for (let j = Math.floor(y); j < y + h; j++) {
                if (MaterialRegistry.isSolid(this.get(i, j))) {
                    return true;
                }
            }
        }
        return false;
    }

    update() {
        // Iterate bottom-to-top, alternating x-direction for more natural flow
        for (let y = this.height - 1; y >= 0; y--) {
            const scanLeft = Math.random() < 0.5;
            for (let i = 0; i < this.width; i++) {
                const x = scanLeft ? i : this.width - 1 - i;
                const type = this.get(x, y);

                if (type === E.EMPTY || !MaterialRegistry.get(type).movable) continue;

                const belowType = this.get(x, y + 1);
                const belowMat = MaterialRegistry.get(belowType);
                const currentMat = MaterialRegistry.get(type);

                // Fall down if below is less dense
                if (belowMat && currentMat.density > belowMat.density) {
                    this.swap(x, y, x, y + 1);
                } else if (MaterialRegistry.isLiquid(type)) {
                    // Flow sideways if liquid
                    const dir = Math.random() < 0.5 ? 1 : -1;
                    const sideType = this.get(x + dir, y);
                    if (MaterialRegistry.get(sideType).density < currentMat.density) {
                        this.swap(x, y, x + dir, y);
                    }
                } else {
                     // Tumble down-left or down-right if solid
                    const dir = Math.random() < 0.5 ? 1 : -1;
                    const belowSideType = this.get(x + dir, y + 1);
                    if (MaterialRegistry.get(belowSideType).density < currentMat.density) {
                         this.swap(x, y, x + dir, y + 1);
                    }
                }
            }
        }
    }
}