import Phaser from 'phaser';
import { EventBus } from '../EventBus.js';

// Scène intérieure générique pour les bâtiments visitables de la ville
// (forge, taverne, échoppe). Le marchand garde son propre panneau externe
// (proximité + T) et n'utilise pas cette scène.
export class InteriorScene extends Phaser.Scene {
  constructor() {
    super('Interior');
  }

  init(data) {
    this.building = data.building;
    this.returnPos = data.returnPos;
  }

  create() {
    const w = this.sys.game.config.width;
    const h = this.sys.game.config.height;

    this.cameras.main.setBackgroundColor('#0b0b0f');

    this.add.rectangle(w / 2, h / 2, w - 120, h - 120, this.building.interiorColor)
      .setStrokeStyle(2, 0x444d57);

    this.add.text(w / 2, 48, this.building.label, {
      fontFamily: 'monospace', fontSize: '20px', color: '#ffd23d'
    }).setOrigin(0.5);

    this.add.text(w / 2, 76, this.building.desc, {
      fontFamily: 'monospace', fontSize: '12px', color: '#999999'
    }).setOrigin(0.5);

    // PNJ placeholder
    this.add.rectangle(w / 2, h / 2 + 20, 36, 48, 0x8b5a2b);
    this.npcName = this.building.npcName;

    this.dialogText = this.add.text(w / 2, h / 2 - 60, '', {
      fontSize: '14px', color: '#fff', fontFamily: 'monospace'
    }).setOrigin(0.5);

    this.add.text(w / 2, h - 60, 'E : sortir · T : parler', {
      fontSize: '12px', color: '#999', fontFamily: 'monospace'
    }).setOrigin(0.5);

    this.exitKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E);
    this.talkKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.T);
    this.lastTalkAt = 0;

    this.cameras.main.fadeIn(250, 0, 0, 0);
  }

  update() {
    if (Phaser.Input.Keyboard.JustDown(this.exitKey)) {
      this.exitInterior();
    }

    if (Phaser.Input.Keyboard.JustDown(this.talkKey)) {
      const now = this.time.now;
      if (now - this.lastTalkAt < 400) return;
      this.lastTalkAt = now;
      const lines = this.building.lines || ['...'];
      const text = `${this.npcName} — ${lines[Math.floor(Math.random() * lines.length)]}`;
      this.dialogText.setText(text);
    }
  }

  exitInterior() {
    const game = this.scene.get('Game');
    if (game && game.player && this.returnPos) {
      game.player.sprite.setPosition(this.returnPos.x, this.returnPos.y + 40);
    }
    this.cameras.main.fadeOut(220, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.stop();
      const g = this.scene.get('Game');
      if (g) {
        this.scene.resume('Game');
        g.cameras.main.fadeIn(220, 0, 0, 0);
      }
    });
    EventBus.emit('inventory-panel', false);
  }
}
