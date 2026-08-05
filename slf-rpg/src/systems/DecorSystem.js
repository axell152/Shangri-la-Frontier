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

    // Citoyen (petit personnage)
    g.clear();
    g.fillStyle(0xd9c39a, 1);
    g.fillCircle(8, 4, 4);
    g.fillStyle(0x6b4f2a, 1);
    g.fillRect(4, 8, 8, 8);
    g.generateTexture('decor_citizen', 24, 24);

    // Chariot
    g.clear();
    g.fillStyle(0x7a5a3a, 1);
    g.fillRect(2, 6, 20, 10);
    g.fillStyle(0x222222, 1);
    g.fillCircle(6, 18, 3);
    g.fillCircle(18, 18, 3);
    g.generateTexture('decor_cart', 24, 24);

    // Chien
    g.clear();
    g.fillStyle(0x8b5a2b, 1);
    g.fillRect(2, 8, 12, 6);
    g.fillStyle(0xd9c39a, 1);
    g.fillCircle(18, 10, 3);
    g.generateTexture('decor_dog', 24, 24);

    g.destroy();
  }

  spawnDecor(count = 8) {
    const town = this.scene && this.scene.TOWN ? this.scene.TOWN : null;
    const x1 = town ? town.x1 : 0;
    const y1 = town ? town.y1 : 0;
    const x2 = town ? town.x2 : (this.scene.sys.game.config.width || 800);
    const y2 = town ? town.y2 : (this.scene.sys.game.config.height || 600);

    for (let i = 0; i < count; i++) {
      const type = ['decor_citizen', 'decor_cart', 'decor_dog'][i % 3];
      const x = Phaser.Math.Between(this.scene.TOWN.x1 + 80, this.scene.TOWN.x2 - 80);
      const y = Phaser.Math.Between(this.scene.TOWN.y1 + 80, this.scene.TOWN.y2 - 80);
      const s = this.scene.physics.add.sprite(x, y, type).setDepth(5 + (i % 4));
      s.setCollideWorldBounds(true);
      // Taille affichée : garder la même hauteur que le joueur pour cohérence
      const playerH = (this.scene.player && this.scene.player.sprite) ? this.scene.player.sprite.height : 34;
      let targetW = Math.round(26 * 1.0);
      let targetH = Math.round(playerH || 34);
      if (type === 'decor_cart') {
        targetW = Math.round(targetH * 1.6); // chars plus larges
      } else if (type === 'decor_dog') {
        targetW = Math.round(targetH * 0.6);
      } else if (type === 'decor_citizen') {
        targetW = Math.round(targetH * 0.7);
      }
      s.setDisplaySize(targetW, targetH);
      // Ajuste la hitbox physique pour correspondre à l'affichage
      if (s.body && s.body.setSize) {
        s.body.setSize(targetW, targetH);
        s.body.setOffset(-targetW / 2 + s.displayOriginX, -targetH / 2 + s.displayOriginY);
      }
      s.vx = Phaser.Math.FloatBetween(-0.6, 0.6);
      s.vy = Phaser.Math.FloatBetween(-0.6, 0.6);
      s.speed = Phaser.Math.FloatBetween(8, 28);
      this.group.add(s);
    }
  }

  update(time) {
    // simple wandering AI constrained to town rectangle
    if (!this.group) return;
    this.group.getChildren().forEach((s) => {
      if (!s.body) return;
      // jitter velocities occasionally
      if (Math.random() < 0.01) {
        s.vx = Phaser.Math.FloatBetween(-0.8, 0.8);
        s.vy = Phaser.Math.FloatBetween(-0.8, 0.8);
      }
      s.body.setVelocity(s.vx * s.speed, s.vy * s.speed);

      // keep inside town
      const tx1 = this.scene.TOWN.x1 + 40;
      const ty1 = this.scene.TOWN.y1 + 40;
      const tx2 = this.scene.TOWN.x2 - 40;
      const ty2 = this.scene.TOWN.y2 - 40;
      if (s.x < tx1) s.x = tx1 + 2;
      if (s.x > tx2) s.x = tx2 - 2;
      if (s.y < ty1) s.y = ty1 + 2;
      if (s.y > ty2) s.y = ty2 - 2;
    });
  }
}
