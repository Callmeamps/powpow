// Player
import { MaterialRegistry } from './MaterialRegistry.js';

export class Player {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.vx = 0;
        this.vy = 0;
        this.width = 5; // Width in grid cells/pixels
        this.height = 8; // Height in grid cells/pixels
        this.grounded = false;
        
        // Constants from platformer.js
        this.GRAVITY = 0.5;
        this.FRICTION = 0.8;
        this.JUMP_FORCE = -12;
        this.PLAYER_SPEED = 3;
    }

    update(input, grid) {
        // --- Handle Input ---
        if (input.left) {
            this.vx = -this.PLAYER_SPEED;
        } else if (input.right) {
            this.vx = this.PLAYER_SPEED;
        } else {
            this.vx *= this.FRICTION;
        }

        if (input.jump && this.grounded) {
            this.vy = this.JUMP_FORCE;
            this.grounded = false;
        }

        // --- Physics & Collision ---
        this.vy += this.GRAVITY;

        // X-axis collision
        this.x += this.vx;
        if (grid.isRectSolid(this.x, this.y, this.width, this.height)) {
            this.x -= this.vx;
            this.vx = 0;
        }

        // Y-axis collision
        this.y += this.vy;
        this.grounded = false;
        if (grid.isRectSolid(this.x, this.y, this.width, this.height)) {
            // If we hit something, move back and check if we are on the ground
            this.y -= this.vy;
            if (this.vy > 0) {
                this.grounded = true;
            }
            this.vy = 0;
        }
    }

    draw(ctx) {
        ctx.fillStyle = '#FF5252';
        ctx.fillRect(this.x, this.y, this.width, this.height);
    }
}

// EntityManager
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