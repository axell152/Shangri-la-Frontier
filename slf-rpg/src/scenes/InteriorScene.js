import Phaser from 'phaser';
import { EventBus } from '../EventBus.js';
import { seededRandom } from '../utils/rng.js';
import { createRandomWeaponForTier } from '../data/weapons.js';

export class InteriorScene extends Phaser.Scene {
  constructor() {
    super('Interior');
  }

  init(data) {
    this.poi = data.poi;
    this.returnPos = data.returnPos;
  }

  create() {
    const w = this.sys.game.config.width;
    const h = this.sys.game.config.height;

    this.cameras.main.setBackgroundColor('#0b0b0f');

    // Simple room background with variant by type
    const bgColor = this.poi.type === 'tavern' ? 0x3b2416 : this.poi.type === 'merchant' ? 0x2b2f36 : 0x24302a;
    this.room = this.add.rectangle(w / 2, h / 2, w - 120, h - 120, bgColor)
      .setStrokeStyle(2, 0x444d57);

    // Title / header
    const title = this.poi.meta?.interiorName || this.poi.label;
    this.add.text(w / 2, 48, title, { fontFamily: 'monospace', fontSize: '20px', color: '#ffd23d' })
      .setOrigin(0.5);

    // NPCs
    this.npcs = [];
    if (this.poi.type === 'merchant') {
      const npc = this.add.rectangle(w / 2, h / 2 + 20, 36, 48, 0x8b5a2b);
      this.npcs.push({ sprite: npc, name: 'Marchand' });
      EventBus.emit('merchant-nearby', true);
      // ensure the merchant stock is up-to-date
      this.restockIfNeeded();
    } else if (this.poi.type === 'tavern') {
      const barkeep = this.add.rectangle(w / 2 - 40, h / 2 + 10, 34, 46, 0x5a2b1a);
      const patron = this.add.rectangle(w / 2 + 40, h / 2 + 18, 28, 40, 0x3a2b1f);
      this.npcs.push({ sprite: barkeep, name: 'Aubergiste' });
      this.npcs.push({ sprite: patron, name: 'Client' });
    } else {
      // house: simple resident
      const resident = this.add.rectangle(w / 2, h / 2 + 10, 28, 40, 0x6b5a4c);
      this.npcs.push({ sprite: resident, name: 'Habitant' });
    }

    // Intro text
    this.dialogText = this.add.text(w / 2, h / 2 - 60, '', { fontSize: '14px', color: '#fff' }).setOrigin(0.5);

    // Exit hint
    this.add.text(w / 2, h - 60, 'E: sortir · T: parler', { fontSize: '12px', color: '#999' }).setOrigin(0.5);

    this.exitKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E);
    this.talkKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.T);
    this.lastTalkAt = 0;

    // Fade in the interior camera now that the scene is created
    this.cameras.main.fadeIn(250, 0, 0, 0);
  }

  restockIfNeeded() {
    if (!this.poi || this.poi.type !== 'merchant') return;
    const RESTOCK_MS = 60000; // 1 minute for testing
    const now = Date.now();
    const last = this.poi.meta?.lastRestockAt || 0;
    const needs = !this.poi.meta?.inventory || (now - last) > RESTOCK_MS;
    if (!needs) {
      EventBus.emit('merchant-open', this.poi.meta.inventory.slice());
      return;
    }

    const seed = `${this.poi.id}-stock-${Math.floor(now / RESTOCK_MS)}`;
    const rand = seededRandom(seed);
    const inv = [];
    const tiers = ['COMMUNE', 'PEU_COMMUNE', 'RARE'];
    for (let i = 0; i < 4; i++) {
      const r = rand();
      const tier = r < 0.6 ? 'COMMUNE' : r < 0.9 ? 'PEU_COMMUNE' : 'RARE';
      const w = createRandomWeaponForTier(tier);
      if (w) inv.push(w);
    }
    this.poi.meta = this.poi.meta || {};
    this.poi.meta.inventory = inv;
    this.poi.meta.lastRestockAt = now;
    EventBus.emit('merchant-open', inv.slice());
  }

  update() {
    if (Phaser.Input.Keyboard.JustDown(this.exitKey)) {
      this.exitInterior();
    }

    if (Phaser.Input.Keyboard.JustDown(this.talkKey) && this.npcs.length > 0) {
      const now = this.time.now;
      if (now - this.lastTalkAt < 400) return;
      this.lastTalkAt = now;
      const npc = this.npcs[Math.floor(Math.random() * this.npcs.length)];
      const lines = {
        merchant: ['Bienvenue, voyageur.', 'J’ai des armes de qualité.'],
        tavern: ['Prends un verre.', 'La rumeur du marché d’en bas...'],
        house: ['Bonjour.', 'Belle journée, non ?']
      };
      const typeKey = this.poi.type === 'merchant' ? 'merchant' : this.poi.type === 'tavern' ? 'tavern' : 'house';
      const pool = lines[typeKey] || ['...'];
      const text = `${npc.name} — ${pool[Math.floor(Math.random() * pool.length)]}`;
      this.dialogText.setText(text);
      EventBus.emit('loot-log', { type: 'pickup', text });
      if (typeKey === 'merchant') {
        this.restockIfNeeded();
        EventBus.emit('merchant-panel', true);
      }
    }
  }

  exitInterior() {
    if (this.poi.type === 'merchant') {
      EventBus.emit('merchant-nearby', false);
      EventBus.emit('merchant-panel', false);
    }

    // Return player to world scene near the POI
    const game = this.scene.get('Game');
    if (game && game.player && this.returnPos) {
      game.player.sprite.setPosition(this.returnPos.x + 16, this.returnPos.y + 24);
    }
    // Fade back to game
    this.cameras.main.fadeOut(220, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.stop();
      const g = this.scene.get('Game');
      if (g) {
        this.scene.resume('Game');
        g.cameras.main.fadeIn(220, 0, 0, 0);
      }
    });
  }
}
