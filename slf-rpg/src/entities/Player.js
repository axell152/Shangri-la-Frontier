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
    
    this.isAttackingAnim = false;
    this.attackAnimTimer = 0;

    // Rectangle invisible pour la physique Phaser
    this.sprite = scene.add.rectangle(x, y, 26, 34, 0x000000, 0);
    scene.physics.add.existing(this.sprite);
    this.sprite.body.setCollideWorldBounds(true);

    this.gfx = scene.add.graphics();
    this.weaponGfx = scene.add.graphics();

    // Configuration des touches ZQSD
    this.wasd = scene.input.keyboard.addKeys({
      up: Phaser.Input.Keyboard.KeyCodes.Z,
      left: Phaser.Input.Keyboard.KeyCodes.Q,
      down: Phaser.Input.Keyboard.KeyCodes.S,
      right: Phaser.Input.Keyboard.KeyCodes.D
    });

    // Écoute du clic gauche de la souris pour attaquer
    scene.input.on('pointerdown', (pointer) => {
  if (pointer.leftButtonDown()) {
    this.tryAttack(scene.time.now, scene.enemiesRef || [], scene.onHitEnemyRef, pointer);
  }
});
  }

  get x() { return this.sprite.x; }
  get y() { return this.sprite.y; }

  update(time, enemies, onHitEnemy) {
    // Stockage temporaire des références pour le clic de souris
    this.scene.enemiesRef = enemies;
    this.scene.onHitEnemyRef = onHitEnemy;

    const body = this.sprite.body;
    let vx = 0;
    let vy = 0;

    this.isMoving = false;

    // Utilisation exclusive de Z, Q, S, D
    if (this.wasd.left.isDown) { vx = -1; this.facing = 'left'; this.isMoving = true; }
    else if (this.wasd.right.isDown) { vx = 1; this.facing = 'right'; this.isMoving = true; }
    if (this.wasd.up.isDown) { vy = -1; this.facing = 'up'; this.isMoving = true; }
    else if (this.wasd.down.isDown) { vy = 1; this.facing = 'down'; this.isMoving = true; }

    const len = Math.hypot(vx, vy) || 1;
    body.setVelocity((vx / len) * MOVE_SPEED, (vy / len) * MOVE_SPEED);

    if (this.isMoving) {
      this.animFrame += 0.15;
    } else {
      this.animFrame = 0;
    }

    if (this.isAttackingAnim) {
      this.attackAnimTimer--;
      if (this.attackAnimTimer <= 0) {
        this.isAttackingAnim = false;
      }
    }

    this.drawPlayerAndEffects();
    this.drawWeapon();
  }

  drawPlayerAndEffects() {
    this.gfx.clear();
    const px = this.sprite.x;
    const py = this.sprite.y;
    let swing = this.isMoving ? Math.sin(this.animFrame) * 6 : 0;

    const colorPants = 0x333333;
    const colorShirt = 0x0055ff;
    const colorSkin = 0xffdbac;
    const colorMask = 0xffffff;

    // Jambes
    this.gfx.fillStyle(colorPants, 1);
    this.gfx.fillRect(px - 6 + swing, py + 6, 6, 16);
    this.gfx.fillRect(px + 0 - swing, py + 6, 6, 16);

    // Torse
    this.gfx.fillStyle(colorShirt, 1);
    this.gfx.fillRect(px - 8, py - 10, 16, 16);

    // Bras
    this.gfx.fillRect(px - 14 - swing, py - 10, 6, 14);
    this.gfx.fillRect(px + 8 + swing, py - 10, 6, 14);

    // Tête & Masque
    this.gfx.fillStyle(colorSkin, 1);
    this.gfx.fillRect(px - 10, py - 26, 20, 16);
    
    this.gfx.fillStyle(colorMask, 1);
    this.gfx.fillRect(px - 6, py - 22, 12, 10);
  }

  // Positionne et fait pivoter l'arme selon la direction du joueur,
  // avec un swing pendant l'attaque. La forme elle-même est dessinée
  // en coordonnées locales (pivot à l'origine, pointant vers +x)
  // dans drawWeaponShape, puis tournée via la rotation de l'objet.
  drawWeapon() {
    const weapon = this.weapons.equipped;
    this.weaponGfx.clear();
    if (!weapon) return;

    const facingAngles = {
      right: 0,
      down: Math.PI / 2,
      left: Math.PI,
      up: -Math.PI / 2
    };
    const baseAngle = facingAngles[this.facing] ?? 0;

    // Swing des bras lorsque le joueur marche (même logique que dans drawPlayerAndEffects)
    let armSwing = this.isMoving ? Math.sin(this.animFrame) * 6 : 0;

    // Swing supplémentaire lors de l'attaque
    let attackSwing = 0;
    if (this.isAttackingAnim) {
      const progress = 1 - this.attackAnimTimer / 8;
      attackSwing = -0.9 + Math.sin(progress * Math.PI) * 1.6;
    }

    // Position de base de la main + application du balancement du bras (armSwing)
    let offsetX = 0;
    let offsetY = -4;

    if (this.facing === 'right') {
      offsetX = 18;
      offsetY = -2 + armSwing; // Le bras monte et descend en marchant
    } else if (this.facing === 'left') {
      offsetX = -18;
      offsetY = -2 - armSwing;
    } else if (this.facing === 'down') {
      offsetX = 6 + armSwing;  // Le bras avance et recule en marchant
      offsetY = 12;
    } else if (this.facing === 'up') {
      offsetX = -6 - armSwing;
      offsetY = -12;
    }

    this.weaponGfx.setPosition(this.sprite.x + offsetX, this.sprite.y + offsetY);
    this.weaponGfx.setRotation(baseAngle + attackSwing);

    this.drawWeaponShape(weapon);
  }

  drawWeaponShape(weapon) {
    const color = weapon.color;
    const g = this.weaponGfx;

    switch (weapon.kind) {
      case 'sword':
        g.fillStyle(0x3a2a1a, 1);
        g.fillRect(-9, -3, 9, 6); // poignée
        g.fillStyle(0x999999, 1);
        g.fillRect(0, -7, 3, 14); // garde
        g.fillStyle(color, 1);
        g.fillRect(3, -2, 20, 4); // lame
        break;

      case 'dagger':
        g.fillStyle(0x3a2a1a, 1);
        g.fillRect(-6, -2, 6, 4); // poignée
        g.fillStyle(color, 1);
        g.fillTriangle(0, -3, 0, 3, 14, 0); // lame courte
        break;

      case 'spear':
        g.fillStyle(0x5a4632, 1);
        g.fillRect(-16, -2, 36, 3); // hampe
        g.fillStyle(color, 1);
        g.fillTriangle(20, -5, 20, 5, 33, 0); // pointe
        break;

      case 'axe':
        g.fillStyle(0x5a4632, 1);
        g.fillRect(-8, -2, 26, 3); // manche
        g.fillStyle(color, 1);
        g.fillTriangle(14, -11, 14, 11, 27, 0); // fer, côté avant
        g.fillTriangle(14, -11, 14, 11, 4, 0); // fer, côté arrière
        break;

      case 'bow': {
        const r = 14;
        g.lineStyle(3, color, 1);
        g.beginPath();
        g.arc(0, 0, r, -1.0, 1.0, false);
        g.strokePath();
        g.lineStyle(1, 0xdddddd, 1);
        g.lineBetween(r * Math.cos(-1.0), r * Math.sin(-1.0), r * Math.cos(1.0), r * Math.sin(1.0));
        break;
      }

      default:
        g.fillStyle(color, 1);
        g.fillRect(0, -3, 14, 6);
    }
  }

  tryAttack(time, enemies, onHitEnemy, pointer) {
    if (!enemies || time - this.lastAttackAt < this.weapons.attackCooldownMs) return;
    this.lastAttackAt = time;

    this.isAttackingAnim = true;
    this.attackAnimTimer = 8;

    const isCrit = Math.random() < this.weapons.critChance;
    const rawDamage = this.weapons.attackDamage + this.stats.totalAtk;
    const damage = Math.max(1, Math.round(isCrit ? rawDamage * 1.8 : rawDamage));

    // CORRECTION : On vérifie .kind et on s'assure qu'une arme est bien équipée
    if (this.weapons.equipped && this.weapons.equipped.kind === 'bow' && pointer) {
      const worldPoint = this.scene.cameras.main.getWorldPoint(pointer.x, pointer.y);
      const angle = Phaser.Math.Angle.Between(this.x, this.y, worldPoint.x, worldPoint.y);
      
      if (this.scene.spawnArrow) {
        this.scene.spawnArrow(this.x, this.y, angle, damage, isCrit, this.weapons.equipped.color);
      }
      return; // Empêche strictement le corps-à-corps de s'exécuter
    }

    // Sinon, comportement normal de Corps-à-Corps
    const range = this.weapons.attackRange;
    for (const enemy of enemies) {
      if (enemy.dead) continue;
      const dist = Phaser.Math.Distance.Between(this.x, this.y, enemy.x, enemy.y);
      if (dist <= range) {
        const enemyDamage = Math.max(1, damage - enemy.def);
        if (onHitEnemy) onHitEnemy(enemy, enemyDamage, isCrit);
      }
    }
  }
  equipWeapon(weapon) {
    this.weapons.equip(weapon);
  }
}
