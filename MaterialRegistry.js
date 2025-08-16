// MODIFIED: E includes new materials
export const E = { EMPTY: 0, SAND: 1, WATER: 2, STONE: 3, WOOD: 4, LAVA: 5, ACID: 6, FIRE: 7, SMOKE: 8, GLASS: 9 };

const materials = {
    // name, density, state, color are the same...
    // NEW: `opacity` property (0.0 to 1.0)
    // NEW: `lifespan` for temporary elements (in ticks)
    // NEW: `flammable` and `emitsLight` properties
    [E.EMPTY]: { name: "Empty", density: 0, state: "gas", color: "transparent", opacity: 0.0 },
    [E.SAND]:  { name: "Sand", density: 5, state: "solid", color: "#e3c78d", movable: true, opacity: 1.0 },
    [E.WATER]: { name: "Water", density: 2, state: "liquid", color: "#34729c", movable: true, opacity: 0.7 },
    [E.STONE]: { name: "Stone", density: 10, state: "solid", color: "#8a8a8a", movable: false, opacity: 1.0 },
    [E.WOOD]:  { name: "Wood", density: 7, state: "solid", color: "#6b4a2d", movable: false, opacity: 1.0, flammable: true },
    [E.LAVA]:  { name: "Lava", density: 8, state: "liquid", color: "#ff4500", movable: true, opacity: 1.0, damage: 5, emitsLight: 0.8 },
    [E.ACID]:  { name: "Acid", density: 3, state: "liquid", color: "#45a32b", movable: true, opacity: 0.8, damage: 2 },
    [E.GLASS]: { name: "Glass", density: 10, state: "solid", color: "#d0e0e0", movable: false, opacity: 0.4 },
    [E.FIRE]:  { name: "Fire", density: -1, state: "gas", color: "#ff8c00", movable: true, opacity: 0.8, lifespan: 60, damage: 1, emitsLight: 1.0 },
    [E.SMOKE]: { name: "Smoke", density: -2, state: "gas", color: "#444444", movable: true, opacity: 0.5, lifespan: 120 },
};

export class MaterialRegistry {
    // ... (rest of the class is the same)
    static get(type) {
        return materials[type];
    }
    static isSolid(type) { /* ... */ }
    static isLiquid(type) { /* ... */ }
    static isDamaging(type) { /* ... */ }
}