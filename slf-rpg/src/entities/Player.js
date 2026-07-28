import Phaser from 'phaser';
import { StatsSystem } from '../systems/StatsSystem.js';
import { WeaponSystem } from '../systems/WeaponSystem.js';

const MOVE_SPEED = 160;

export class Player {
  constructor(scene, x, y) {
    this.scene = scene;
    this.stats = new StatsSystem();
    this.weapons = new WeaponSystem();
    this.lastAttackAt = 0;
    this.facing = 'down';

    this.animFrame = 0;
    this.isMoving = false;

    // On garde un rectangle invisible ou un container pour la physique Phaser
    this.sprite = scene.add.rectangle(x, y, 26, 34, 0x000000, 0); // alpha à 0 pour être invisible
    scene.physics.add.existing(this.sprite);
    this.sprite.body.setCollideWorldBounds(true);

    // Un objet Graphics dédié pour dessiner le personnage cubique à chaque frame
    this.gfx = scene.add.graphics();

    this.weaponIndicator = scene.add.rectangle(x, y, 8, 8, this.weapons.equipped.color);

    this.cursors = scene.input.keyboard.createCursorKeys();
    this.wasd = scene.input.keyboard.addKeys('W,A,S,D');
    this.attackKey = scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
  }

  get x() { return this.sprite.x; }
  get y() { return this.sprite.y; }

  update(time, enemies, onHitEnemy) {
    const body = this.sprite.body;
    let vx = 0;
    let vy = 0;

    this.isMoving = false;

    if (this.cursors.left.isDown || this.wasd.A.isDown) { vx = -1; this.facing = 'left'; this.isMoving = true; }
    else if (this.cursors.right.isDown || this.wasd.D.isDown) { vx = 1; this.facing = 'right'; this.isMoving = true; }
    if (this.cursors.up.isDown || this.wasd.W.isDown) { vy = -1; this.facing = 'up'; this.isMoving = true; }
    else if (this.cursors.down.isDown || this.wasd.S.isDown) { vy = 1; this.facing = 'down'; this.isMoving = true; }

    const len = Math.hypot(vx, vy) || 1;
    body.setVelocity((vx / len) * MOVE_SPEED, (vy / len) * MOVE_SPEED);

    if (this.isMoving) {
      this.animFrame += 0.15;
    } else {
      this.animFrame = 0;
    }

    // Dessin du personnage cubique à la position physique actuelle
    this.drawMinecraftPlayer();

    this.weaponIndicator.x = this.sprite.x + (this.facing === 'left' ? -18 : this.facing === 'right' ? 18 : 0);
    this.weaponIndicator.y = this.sprite.y + (this.facing === 'up' ? -18 : this.facing === 'down' ? 18 : 0);
    this.weaponIndicator.fillColor = this.weapons.equipped.color;

    if (Phaser.Input.Keyboard.JustDown(this.attackKey)) {
      this.tryAttack(time, enemies, onHitEnemy);
    }
  }

  drawMinecraftPlayer() {
    this.gfx.clear();
    const px = this.sprite.x;
    const py = this.sprite.y;
    let swing = this.isMoving ? Math.sin(this.animFrame) * 6 : 0;

    // Couleurs (style Sunraku / Cubique)
    const colorPants = 0x333333;
    const colorShirt = 0x0055ff;
    const colorSkin = 0xffdbac;
    const colorMask = 0xffffff;

    // --- 1. LES JAMBES ---
    this.gfx.fillStyle(colorPants, 1);
    this.gfx.fillRect(px - 6 + swing, py + 6, 6, 16);
    this.gfx.fillRect(px + 0 - swing, py + 6, 6, 16);

    // --- 2. LE CORPS ---
    this.gfx.fillStyle(colorShirt, 1);
    this.gfx.fillRect(px - 8, py - 10, 16, 16);

    // --- 3. LES BRAS ---
    this.gfx.fillRect(px - 14 - swing, py - 10, 6, 14);
    this.gfx.fillRect(px + 8 + swing, py - 10, 6, 14);

    // --- 4. LA TÊTE & MASQUE ---
    this.gfx.fillStyle(colorSkin, 1);
    this.gfx.fillRect(px - 10, py - 26, 20, 16);
    
    this.gfx.fillStyle(colorMask, 1);
    this.gfx.fillRect(px - 6, py - 22, 12, 10);
  }

  tryAttack(time, enemies, onHitEnemy) {
    if (time - this.lastAttackAt < this.weapons.attackCooldownMs) return;
    this.lastAttackAt = time;

    const range = this.weapons.attackRange;
    for (const enemy of enemies) {
      if (enemy.dead) continue;
      const dist = Phaser.Math.Distance.Between(this.x, this.y, enemy.x, enemy.y);
      if (dist <= range) {
        const isCrit = Math.random() < this.weapons.critChance;
        const rawDamage = this.weapons.attackDamage + this.stats.totalAtk - enemy.def;
        const damage = Math.max(1, Math.round(isCrit ? rawDamage * 1.8 : rawDamage));
        onHitEnemy(enemy, damage, isCrit);
      }
    }
  }

  equipWeapon(weapon) {
    this.weapons.equip(weapon);
  }
}
