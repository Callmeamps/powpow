// Player.js
import { MaterialRegistry } from './MaterialRegistry.js';

// EntityManager.js
export class EntityManager {
    constructor() {
        this.entities = [];
    }

    add(entity) {
        this.entities.push(entity);
    }

    update(input, grid) {
        for (const entity of this.entities) {
            entity.update(input, grid);
        }
    }

    draw(ctx) {
        for (const entity of this.entities) {
            entity.draw(ctx);
        }
    }
}