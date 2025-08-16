// Player
export class Player {
    constructor(x, y, z) { // MODIFIED: Add Z
        this.x = x;
        this.y = y;
        this.z = z; // NEW: Player's current layer
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

        // MODIFIED: Pass player's Z-layer to collision checks
        this.x += this.vx;
        if (grid.isRectSolid(this.x, this.y, this.z, this.width, this.height)) {
            this.x -= this.vx;
            this.vx = 0;
        }
        
        this.y += this.vy;
        this.grounded = false;
        if (grid.isRectSolid(this.x, this.y, this.z, this.width, this.height)) {
            this.y -= this.vy;
            if (this.vy > 0) { this.grounded = true; }
            this.vy = 0;
        }
    }

    draw(ctx) {
        // We add a simple "shadow" to hint at the 3D position
        ctx.fillStyle = 'rgba(0,0,0,0.4)';
        ctx.fillRect(this.x + 2, this.y + 2, this.width, this.height);
        
        ctx.fillStyle = '#FF5252';
        ctx.fillRect(this.x, this.y, this.width, this.height);
    }
}