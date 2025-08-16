export const E = { EMPTY: 0, SAND: 1, WATER: 2, STONE: 3, WOOD: 4, LAVA: 5, ACID: 6 };

const materials = {
    [E.EMPTY]: { name: "Empty", density: 0, state: "gas", color: "transparent" },
    [E.SAND]:  { name: "Sand", density: 5, state: "solid", color: "#e3c78d", movable: true },
    [E.WATER]: { name: "Water", density: 2, state: "liquid", color: "#34729c", movable: true },
    [E.STONE]: { name: "Stone", density: 10, state: "solid", color: "#8a8a8a", movable: false },
    [E.WOOD]:  { name: "Wood", density: 7, state: "solid", color: "#6b4a2d", movable: false, flammable: true },
    [E.LAVA]:  { name: "Lava", density: 8, state: "liquid", color: "#ff4500", movable: true, damage: 5 },
    [E.ACID]:  { name: "Acid", density: 3, state: "liquid", color: "#45a32b", movable: true, damage: 2 }
};

export class MaterialRegistry {
    static get(type) {
        return materials[type];
    }

    static isSolid(type) {
        const mat = this.get(type);
        return mat && mat.state === 'solid';
    }

    static isLiquid(type) {
        const mat = this.get(type);
        return mat && mat.state === 'liquid';
    }

    static isGas(type) {
        const mat = this.get(type);
        return mat && mat.state === 'gas';
    }

    static isDamaging(type) {
        const mat = this.get(type);
        return mat && mat.damage > 0;
    }
}