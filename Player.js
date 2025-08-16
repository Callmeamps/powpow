// FILE: Player.js

// No need to import Enemy.js

export class Player {
    // MODIFIED: The constructor now takes a single 'config' object
    constructor(config) {
        this.id = config.id;
        this.x = config.x;
        this.y = config.y;
        this.z = config.z;
        this.color = config.color;
        this.controls = config.controls; // The key codes for this player's actions

        this.vx = 0; this.vy = 0;
        this.width = 8; this.height = 16;
        this.grounded = false;
        
        // --- Combat Properties ---
        this.health = 100;
        this.isAttacking = false;
        this.attackCooldown = 0;
        this.attackDuration = 0;
        
        // --- Constants ---
        this.GRAVITY = 0.4;
        this.FRICTION = 0.8;
        this.JUMP_FORCE = -9;
        this.PLAYER_SPEED = 3;
    }

    takeDamage(amount) {
        this.health -= amount;
        console.log(`${this.id} took damage, health: ${this.health}`);
    }

    attack(entityManager) {
        if (this.attackCooldown > 0) return;

        this.isAttacking = true;
        this.attackDuration = 15; // Attack hitbox is active for 15 frames
        this.attackCooldown = 40; // Can't attack again for 40 frames

        const hitboxWidth = 16;
        const hitboxX = this.vx >= 0 ? this.x + this.width : this.x - hitboxWidth;
        const hitbox = { x: hitboxX, y: this.y, width: hitboxWidth, height: this.height };

        // Check for hits against ALL other entities
        for (const entity of entityManager.entities) {
            // A player cannot hit themselves
            if (entity === this) continue;

            // Check if the entity is another player (or a future enemy)
            if (entity instanceof Player) {
                if (hitbox.x < entity.x + entity.width &&
                    hitbox.x + hitbox.width > entity.x &&
                    hitbox.y < entity.y + entity.height &&
                    hitbox.height + hitbox.y > entity.y) 
                {
                    entity.takeDamage(10);
                }
            }
        }
    }

    update(input, grid, entityManager) {
        // Handle attack state timers
        if (this.attackCooldown > 0) this.attackCooldown--;
        if (this.attackDuration > 0) this.attackDuration--;
        else this.isAttacking = false;

        // Use the specific input state passed to this player
        if (input.left) this.vx = -this.PLAYER_SPEED;
        else if (input.right) this.vx = this.PLAYER_SPEED;
        else this.vx *= this.FRICTION;
        
        if (input.jump && this.grounded) { this.vy = this.JUMP_FORCE; this.grounded = false; }
        
        if (input.attack) this.attack(entityManager);
        
        // --- Physics and Collision (this part is unchanged) ---
        this.vy += this.GRAVITY;
        this.x += this.vx;
        if (grid.isRectSolid(this.x, this.y, this.z, this.width, this.height)) { this.x -= this.vx; this.vx = 0; }
        this.y += this.vy;
        this.grounded = false;
        if (grid.isRectSolid(this.x, this.y, this.z, this.width, this.height)) { this.y -= this.vy; if(this.vy > 0) this.grounded = true; this.vy = 0; }
    }

    draw(ctx, mainLayer) {
        if (this.z !== mainLayer) return;

        // Visual Depth Drop Shadow
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(this.x + 2, this.y + 2, this.width, this.height);

        // Attack Visual
        if (this.isAttacking) {
            ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
            const attackWidth = 12;
            const attackX = this.vx >= 0 ? this.x + this.width : this.x - attackWidth;
            ctx.fillRect(attackX, this.y, attackWidth, this.height);
        }

        // Use the player's configured color for their body
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, this.y, this.width, this.height);
    }
}