import Phaser from 'phaser';

// Système léger de décor : crée des textures dynamiques (simulant des PNG)
// et fait se promener des sprites décoratifs dans la ville.
export class DecorSystem {
  constructor(scene) {
    this.scene = scene;
    this.group = scene.physics.add.group();
    this._makeTextures();
  }

  _makeTextures() {
    const g = this.scene.add.graphics();

    // Citoyen (personnage vertical : tête en haut, corps en dessous)
    g.clear();
    g.fillStyle(0xd9c39a, 1);
    g.fillCircle(8, 6, 4);
    g.fillStyle(0x6b4f2a, 1);
    g.fillRect(4, 10, 8, 14);
    g.generateTexture('decor_citizen', 16, 28);

    g.destroy();
  }

  spawnDecor(count = 8) {
    const town = this.scene && this.scene.TOWN ? this.scene.TOWN : null;
    const x1 = town ? town.x1 : 0;
    const y1 = town ? town.y1 : 0;
    const x2 = town ? town.x2 : (this.scene.sys.game.config.width || 800);
    const y2 = town ? town.y2 : (this.scene.sys.game.config.height || 600);

    for (let i = 0; i < count; i++) {
      // Uniquement des citoyens
      const type = 'decor_citizen';
      let x = 0;
      let y = 0;
      const BUILDING_W = 140;
      const BUILDING_H = 96;
      const maxTries = 50;
      let found = false;
      for (let t = 0; t < maxTries; t++) {
        x = Phaser.Math.Between(this.scene.TOWN.x1 + 80, this.scene.TOWN.x2 - 80);
        y = Phaser.Math.Between(this.scene.TOWN.y1 + 80, this.scene.TOWN.y2 - 80);
        if (!this._isOverBuilding(x, y, BUILDING_W, BUILDING_H)) { found = true; break; }
      }
      if (!found) { x = this.scene.TOWN_CENTER.x; y = this.scene.TOWN_CENTER.y; }
      const s = this.scene.physics.add.sprite(x, y, type);
      s.setDepth(14 + (i % 4));
      s.setOrigin(0.5, 1);
      s.setVisible(true);
      s.setAngle(0);
      s.setFlipX(false);
      s.setCollideWorldBounds(true);

      const playerH = (this.scene.player && this.scene.player.sprite) ? this.scene.player.sprite.height : 34;
      const baseH = Math.round((playerH || 34) * 2.0);
      let targetH = baseH;
      let targetW = Math.round(baseH * 0.55);

      s.setDisplaySize(targetW, targetH);
      s.setOrigin(0.5, 1);
      if (s.body && s.body.setSize) {
        s.body.setSize(targetW, targetH, true);
      }
      s.vx = Phaser.Math.FloatBetween(-0.6, 0.6);
      s.vy = Phaser.Math.FloatBetween(-0.6, 0.6);
      s.speed = Phaser.Math.FloatBetween(8, 28);
      this.group.add(s);
    }
  }

  update(time) {
    if (!this.group) return;
    this.group.getChildren().forEach((s) => {
      if (!s.body) return;
      if (Math.random() < 0.01) {
        s.vx = Phaser.Math.FloatBetween(-0.8, 0.8);
        s.vy = Phaser.Math.FloatBetween(-0.8, 0.8);
      }
      s.body.setVelocity(s.vx * s.speed, s.vy * s.speed);

      const tx1 = this.scene.TOWN.x1 + 40;
      const ty1 = this.scene.TOWN.y1 + 40;
      const tx2 = this.scene.TOWN.x2 - 40;
      const ty2 = this.scene.TOWN.y2 - 40;
      if (s.x < tx1) s.x = tx1 + 2;
      if (s.x > tx2) s.x = tx2 - 2;
      if (s.y < ty1) s.y = ty1 + 2;
      if (s.y > ty2) s.y = ty2 - 2;

      const BUILDING_W = 140;
      const BUILDING_H = 96;
      for (const b of (this.scene.BUILDINGS || [])) {
        const left = b.x - BUILDING_W / 2;
        const right = b.x + BUILDING_W / 2;
        const top = b.y - BUILDING_H / 2;
        const bottom = b.y + BUILDING_H / 2;
        if (s.x >= left && s.x <= right && s.y >= top && s.y <= bottom) {
          const nx = s.x - s.vx * s.speed * 2;
          const ny = s.y - s.vy * s.speed * 2;
          s.x = Phaser.Math.Clamp(nx, this.scene.TOWN.x1 + 40, this.scene.TOWN.x2 - 40);
          s.y = Phaser.Math.Clamp(ny, this.scene.TOWN.y1 + 40, this.scene.TOWN.y2 - 40);
          s.vx = -s.vx * 0.6;
          s.vy = -s.vy * 0.6;
          s.body.setVelocity(s.vx * s.speed, s.vy * s.speed);
          break;
        }
      }
    });
  }

  _isOverBuilding(x, y, bw, bh) {
    const buildings = this.scene.BUILDINGS || [];
    for (const b of buildings) {
      const left = b.x - bw / 2;
      const right = b.x + bw / 2;
      const top = b.y - bh / 2;
      const bottom = b.y + bh / 2;
      if (x >= left && x <= right && y >= top && y <= bottom) return true;
    }
    return false;
  }
}
