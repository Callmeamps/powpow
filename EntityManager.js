import { Player } from './Player.js';
import { MaterialRegistry, E } from './MaterialRegistry.js';

export class EntityManager {
    constructor() { this.entities = []; }
    add(entity) { this.entities.push(entity); }

    // MODIFIED: The update method now gets a map of all player inputs
    update(inputs, grid) {
        for (const entity of this.entities) {
            if (entity instanceof Player) {
                // If it's a player, find their specific inputs and pass them along
                entity.update(inputs[entity.id], grid, this);
            }
            // (If we had enemies, their update call would go here)
        }
        
        // --- Player Death and Cleanup ---
        this.entities = this.entities.filter(entity => {
            if (entity.health > 0) {
                return true; // Keep entity if alive
            } else {
                this.onDeath(entity, grid); // Trigger death effect
                return false; // Remove entity
            }
        });
    }

    onDeath(entity, grid) {
        console.log(`${entity.id || 'Entity'} has been defeated!`);
        // We can add a particle explosion here later. For now, we just log it.
    }

    draw(ctx, mainLayer) { for (const entity of this.entities) entity.draw(ctx, mainLayer); }
}