import { E } from './MaterialRegistry.js';

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
        this.width = params.GRID_WIDTH;
        this.height = params.GRID_HEIGHT;
        this.blueprint = Array(this.width).fill(0).map(() => Array(this.height).fill(0));
        this.regions = Array(this.width).fill(0).map(() => Array(this.height).fill(null));
        this.currentRegion = -1;
        this.rooms = [];
        this.directions = [ {dx:-1,dy:0}, {dx:1,dy:0}, {dx:0,dy:-1}, {dx:0,dy:1} ];
    }
    
    generate(grid) {
        // STEP 1: Generate Blueprint
        this._addRooms();
        for (let y = 1; y < this.height; y += 2) {
            for (let x = 1; x < this.width; x += 2) {
                if (this.blueprint[x][y] === 0) this._growMaze(x, y);
            }
        }
        this._connectRegions();
        this._removeDeadEnds();
        this._thickenCorridors();

        // STEP 2: Transfer to 3D Grid
        const mainLayer = Math.floor(grid.depth / 2);
        for (let x = 0; x < this.width; x++) {
            for (let y = 0; y < this.height; y++) {
                const isFloor = this.blueprint[x][y] === 1;
                if (!isFloor && Math.random() < this.params.FOREGROUND_WALL_CHANCE) grid.set(x, y, mainLayer - 1, E.STONE);
                grid.set(x, y, mainLayer, isFloor ? E.EMPTY : E.STONE);
                grid.set(x, y, mainLayer + 1, E.STONE);
                if (isFloor) grid.set(x, y, mainLayer + 1, E.EMPTY);
            }
        }

        // STEP 3: Dress the Scene
        for (const room of this.rooms) {
            if (Math.random() < this.params.ROOM_FLUID_CHANCE) {
                const fluidType = Math.random() < this.params.LAVA_CHANCE ? E.LAVA : E.WATER;
                const fluidHeight = randInt(1, Math.floor(room.h / 3));
                for (let ry = room.y + room.h - fluidHeight; ry < room.y + room.h; ry++) {
                    for (let rx = room.x; rx < room.x + room.w; rx++) {
                        grid.set(rx, ry, mainLayer, fluidType);
                    }
                }
            }
            if (Math.random() < this.params.ROOM_SAND_PILE_CHANCE) {
                const pileX = room.x + randInt(0, room.w - 1);
                for(let i=0; i < randInt(20, 50); i++) {
                    const px = pileX + randInt(-4, 4);
                    const py = room.y + room.h - 1 - randInt(0, 5);
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

    _thickenCorridors() {
        for (let i = 0; i < this.params.CORRIDOR_THICKENING_PASSES; i++) {
            let tempBlueprint = this.blueprint.map(arr => arr.slice());
            for (let x = 1; x < this.width - 1; x++) {
                for (let y = 1; y < this.height - 1; y++) {
                    if (this.blueprint[x][y] === 0) {
                        const isHorizontal = this.blueprint[x-1][y] === 1 && this.blueprint[x+1][y] === 1;
                        const isVertical = this.blueprint[x][y-1] === 1 && this.blueprint[x][y+1] === 1;
                        if (isHorizontal || isVertical) tempBlueprint[x][y] = 1;
                    }
                }
            }
            this.blueprint = tempBlueprint;
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