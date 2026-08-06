import Phaser from 'phaser';
import { EventBus } from '../EventBus.js';

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

    // Types de bâtiments spécifiques
    this.isMerchantBuilding = 
      this.building.id === 'echoppe' || 
      this.building.id === 'marchand' || 
      this.building.isMerchant || 
      (this.building.label && this.building.label.toLowerCase().includes('marchand'));

    this.isForgeBuilding = this.building.id === 'forge';

    this.panelOpen = false;
    this.activeTab = this.isForgeBuilding ? 'repair' : (this.isMerchantBuilding ? 'buy' : null);

    // Groupe pour stocker les éléments dynamiques de l'UI (listes d'objets)
    this.uiElementsGroup = this.add.group();

    // Cadre principal de la pièce
    const roomW = w - 160;
    const roomH = h - 160;
    const roomX = w / 2;
    const roomY = h / 2 - 20;

    this.add.rectangle(roomX, roomY, roomW, roomH, this.building.interiorColor || 0x221a14)
      .setStrokeStyle(3, 0x444d57);

    // Titre et description
    this.add.text(w / 2, 48, this.building.label, {
      fontFamily: 'monospace', fontSize: '22px', color: '#ffd23d', fontStyle: 'bold'
    }).setOrigin(0.5);

    this.add.text(w / 2, 76, this.building.desc || '', {
      fontFamily: 'monospace', fontSize: '13px', color: '#aaaaaa'
    }).setOrigin(0.5);

    // Sol texturé
    for (let i = 0; i < 14; i++) {
      this.add.line(roomX - roomW / 2 + 50 + i * 90, roomY + roomH / 2 - 100, 0, 0, 0, 80, 0x1f1712, 0.4).setLineWidth(2);
    }

    // Mobilier de fond
    const deskX = roomX;
    const deskY = roomY + 40;
    
    this.add.rectangle(deskX, deskY, 320, 90, 0x4a3222).setStrokeStyle(2, 0x2b1d13);
    this.add.rectangle(deskX, deskY - 38, 300, 14, 0x6e4e37);

    if (this.building.id === 'taverne') {
      this.add.text(deskX, deskY - 10, 'COMPTOIR DE LA TAVERNE', {
        fontSize: '11px', color: '#ffd23d', fontFamily: 'monospace'
      }).setOrigin(0.5);
    } else if (this.isMerchantBuilding) {
      this.add.text(deskX, deskY - 10, 'COMPTOIR DU COMMERÇANT (ACHAT / VENTE)', {
        fontSize: '11px', color: '#ffd23d', fontFamily: 'monospace'
      }).setOrigin(0.5);
    } else if (this.isForgeBuilding) {
      this.add.text(deskX, deskY - 10, 'ENCLUME (RÉPARATION / FUSION)', {
        fontSize: '11px', color: '#ffd23d', fontFamily: 'monospace'
      }).setOrigin(0.5);
    }

    // --- INTERFACE DES ONGLETS ---
    if (this.isForgeBuilding || this.isMerchantBuilding) {
      this.createTabsUI(w, roomY);
    }

    // --- PNJ ---
    const npcX = roomX;
    const npcY = deskY - 45;

    this.add.rectangle(npcX, npcY - 18, 12, 12, 0xffffff);
    this.add.rectangle(npcX, npcY - 18, 10, 10, 0xd9c39a);

    const shirtColor = this.isForgeBuilding ? 0xb44e2e : (this.building.id === 'taverne' ? 0x6b3a3a : 0x2e6db4);
    this.add.rectangle(npcX, npcY, 14, 12, shirtColor);

    this.add.rectangle(npcX - 3, npcY + 9, 3, 8, 0x333333);
    this.add.rectangle(npcX + 3, npcY + 9, 3, 8, 0x333333);

    this.npcName = this.building.npcName || (this.isForgeBuilding ? 'Forgeron' : (this.isMerchantBuilding ? 'Commerçant' : 'Habitant'));
    this.add.text(npcX, npcY - 34, this.npcName, {
      fontSize: '11px', color: '#ffd23d', fontFamily: 'monospace', backgroundColor: '#000000aa', padding: { x: 4, y: 2 }
    }).setOrigin(0.5);

    const defaultPrompt = this.isForgeBuilding 
      ? 'Appuyez sur T pour ouvrir la Forge' 
      : (this.isMerchantBuilding ? 'Appuyez sur T pour commercer' : 'Appuyez sur T pour parler');

    this.dialogText = this.add.text(w / 2, roomY + 130, defaultPrompt, {
      fontSize: '14px', color: '#fff', fontFamily: 'monospace', backgroundColor: '#16161dee', padding: { x: 10, y: 6 }
    }).setOrigin(0.5);

    const helpText = this.isForgeBuilding || this.isMerchantBuilding 
      ? 'E : sortir · T : interagir / basculer' 
      : 'E : sortir · T : parler';
      
    this.add.text(w / 2, h - 50, helpText, {
      fontSize: '12px', color: '#999', fontFamily: 'monospace'
    }).setOrigin(0.5);

    this.exitKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E);
    this.talkKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.T);
    this.lastTalkAt = 0;

    // Écouter les mises à jour des stats/inventaire pour rafraîchir dynamiquement l'interface ouverte
    EventBus.on('stats-updated', () => {
      if (this.panelOpen) {
        this.refreshInteractiveList();
      }
    });

    this.cameras.main.fadeIn(250, 0, 0, 0);
  }

  createTabsUI(w, roomY) {
    const tabY = roomY + 90;
    
    let label1 = this.isForgeBuilding ? 'REPARATION' : 'ACHAT';
    let label2 = this.isForgeBuilding ? 'FUSION' : 'VENTE';

    this.tab1Bg = this.add.rectangle(w / 2 - 80, tabY, 140, 28, 0x332211).setInteractive();
    this.tab1Text = this.add.text(w / 2 - 80, tabY, label1, { fontSize: '12px', color: '#ffd23d', fontFamily: 'monospace' }).setOrigin(0.5);

    this.tab2Bg = this.add.rectangle(w / 2 + 80, tabY, 140, 28, 0x222222).setInteractive();
    this.tab2Text = this.add.text(w / 2 + 80, tabY, label2, { fontSize: '12px', color: '#888888', fontFamily: 'monospace' }).setOrigin(0.5);

    this.tab1Bg.on('pointerdown', () => {
      this.activeTab = this.isForgeBuilding ? 'repair' : 'buy';
      this.updateTabsVisuals();
    });

    this.tab2Bg.on('pointerdown', () => {
      this.activeTab = this.isForgeBuilding ? 'fusion' : 'sell';
      this.updateTabsVisuals();
    });
  }

  updateTabsVisuals() {
    if (!this.isForgeBuilding && !this.isMerchantBuilding) return;

    const isTab1Active = this.isForgeBuilding ? (this.activeTab === 'repair') : (this.activeTab === 'buy');

    if (isTab1Active) {
      this.tab1Bg.setFillStyle(0x332211);
      this.tab1Text.setColor('#ffd23d');
      this.tab2Bg.setFillStyle(0x222222);
      this.tab2Text.setColor('#888888');
    } else {
      this.tab1Bg.setFillStyle(0x222222);
      this.tab1Text.setColor('#888888');
      this.tab2Bg.setFillStyle(0x332211);
      this.tab2Text.setColor('#ffd23d');
    }

    if (this.isForgeBuilding) {
      EventBus.emit('forge-tab', this.activeTab);
    } else if (this.isMerchantBuilding) {
      EventBus.emit('merchant-tab', this.activeTab);
    }

    if (this.panelOpen) {
      this.refreshInteractiveList();
    }
  }

  // --- GÉNÉRATION VISUELLE DES LISTES INTERACTIVES ---
  refreshInteractiveList() {
    // Nettoyer les anciens éléments de la liste
    this.uiElementsGroup.clear(true, true);

    const w = this.sys.game.config.width;
    const startY = 360;
    const gameScene = this.scene.get('Game');
    if (!gameScene || !gameScene.player) return;

    const player = gameScene.player;

    if (this.isMerchantBuilding) {
      if (this.activeTab === 'buy') {
        // Catalogue d'objets à acheter
        const itemsToSell = [
          itemTemplate('Épée de Fer', 50, 12, 'sword'),
          itemTemplate('Hache Lourde', 90, 22, 'sword'),
          itemTemplate('Baguette Magique', 120, 18, 'staff')
        ];

        itemsToSell.forEach((item, index) => {
          const yPos = startY + (index * 45);
          const bg = this.add.rectangle(w / 2, yPos, 500, 36, 0x1a1a24).setStrokeStyle(1, 0x444d57).setInteractive();
          const txt = this.add.text(w / 2 - 220, yPos, `${item.name} — Atk: ${item.atk} (${item.cost} Or)`, { fontSize: '13px', color: '#fff', fontFamily: 'monospace' }).setOrigin(0, 0.5);
          const btn = this.add.rectangle(w / 2 + 180, yPos, 80, 26, 0x2e6db4).setInteractive();
          const btnTxt = this.add.text(w / 2 + 180, yPos, 'Acheter', { fontSize: '11px', color: '#fff', fontFamily: 'monospace' }).setOrigin(0.5);

          btn.on('pointerdown', () => {
            EventBus.emit('buy-item', item);
          });

          this.uiElementsGroup.add(bg);
          this.uiElementsGroup.add(txt);
          this.uiElementsGroup.add(btn);
          this.uiElementsGroup.add(btnTxt);
        });

      } else {
        // Inventaire à vendre
        const inventory = player.weapons.inventory;
        if (inventory.length === 0) {
          const emptyTxt = this.add.text(w / 2, startY, 'Aucun objet dans l\'inventaire à vendre.', { fontSize: '13px', color: '#888', fontFamily: 'monospace' }).setOrigin(0.5);
          this.uiElementsGroup.add(emptyTxt);
          return;
        }

        inventory.forEach((weapon, index) => {
          const yPos = startY + (index * 45);
          const bg = this.add.rectangle(w / 2, yPos, 500, 36, 0x1a1a24).setStrokeStyle(1, 0x444d57).setInteractive();
          const txt = this.add.text(w / 2 - 220, yPos, `${weapon.name} [${weapon.rarityLabel}]`, { fontSize: '13px', color: '#fff', fontFamily: 'monospace' }).setOrigin(0, 0.5);
          const btn = this.add.rectangle(w / 2 + 180, yPos, 80, 26, 0x8b3a3a).setInteractive();
          const btnTxt = this.add.text(w / 2 + 180, yPos, 'Vendre', { fontSize: '11px', color: '#fff', fontFamily: 'monospace' }).setOrigin(0.5);

          btn.on('pointerdown', () => {
            EventBus.emit('sell-weapon', weapon.id);
          });

          this.uiElementsGroup.add(bg);
          this.uiElementsGroup.add(txt);
          this.uiElementsGroup.add(btn);
          this.uiElementsGroup.add(btnTxt);
        });
      }
    } else if (this.isForgeBuilding) {
      if (this.activeTab === 'repair') {
        // Liste des armes à réparer (inventaire + arme équipée)
        const repairableWeapons = [...player.weapons.inventory];
        if (player.weapons.equipped) repairableWeapons.unshift(player.weapons.equipped);

        if (repairableWeapons.length === 0) {
          const emptyTxt = this.add.text(w / 2, startY, 'Aucune arme à réparer.', { fontSize: '13px', color: '#888', fontFamily: 'monospace' }).setOrigin(0.5);
          this.uiElementsGroup.add(emptyTxt);
          return;
        }

        repairableWeapons.forEach((weapon, index) => {
          const yPos = startY + (index * 45);
          const bg = this.add.rectangle(w / 2, yPos, 500, 36, 0x1a1a24).setStrokeStyle(1, 0x444d57).setInteractive();
          const txt = this.add.text(w / 2 - 220, yPos, `${weapon.name} (Durabilité: ${weapon.durability || 100})`, { fontSize: '13px', color: '#fff', fontFamily: 'monospace' }).setOrigin(0, 0.5);
          const btn = this.add.rectangle(w / 2 + 180, yPos, 80, 26, 0xb44e2e).setInteractive();
          const btnTxt = this.add.text(w / 2 + 180, yPos, 'Réparer (15g)', { fontSize: '10px', color: '#fff', fontFamily: 'monospace' }).setOrigin(0.5);

          btn.on('pointerdown', () => {
            EventBus.emit('repair-weapon', weapon.id);
          });

          this.uiElementsGroup.add(bg);
          this.uiElementsGroup.add(txt);
          this.uiElementsGroup.add(btn);
          this.uiElementsGroup.add(btnTxt);
        });

      } else {
        // Fusion d'armes
        const mergeGroups = player.weapons.getMergeableGroups();
        if (mergeGroups.length === 0) {
          const emptyTxt = this.add.text(w / 2, startY, 'Aucune arme doublon à fusionner.', { fontSize: '13px', color: '#888', fontFamily: 'monospace' }).setOrigin(0.5);
          this.uiElementsGroup.add(emptyTxt);
          return;
        }

        mergeGroups.forEach((group, index) => {
          const yPos = startY + (index * 45);
          const bg = this.add.rectangle(w / 2, yPos, 500, 36, 0x1a1a24).setStrokeStyle(1, 0x444d57).setInteractive();
          const txt = this.add.text(w / 2 - 220, yPos, `${group.name} (${group.count} exemplaires) - ${group.cost} Or`, { fontSize: '13px', color: '#ffd23d', fontFamily: 'monospace' }).setOrigin(0, 0.5);
          const btn = this.add.rectangle(w / 2 + 180, yPos, 80, 26, 0xb44e2e).setInteractive();
          const btnTxt = this.add.text(w / 2 + 180, yPos, 'Fusionner', { fontSize: '11px', color: '#fff', fontFamily: 'monospace' }).setOrigin(0.5);

          btn.on('pointerdown', () => {
            EventBus.emit('merge-weapons', group.name);
          });

          this.uiElementsGroup.add(bg);
          this.uiElementsGroup.add(txt);
          this.uiElementsGroup.add(btn);
          this.uiElementsGroup.add(btnTxt);
        });
      }
    }
  }

  update() {
    if (Phaser.Input.Keyboard.JustDown(this.exitKey)) {
      this.exitInterior();
    }

    if (Phaser.Input.Keyboard.JustDown(this.talkKey)) {
      const now = this.time.now;
      if (now - this.lastTalkAt < 400) return;
      this.lastTalkAt = now;

      if (this.isMerchantBuilding || this.isForgeBuilding) {
        this.panelOpen = !this.panelOpen;
        
        if (this.isMerchantBuilding) {
          EventBus.emit('merchant-shop-panel', { open: this.panelOpen, mode: this.activeTab });
        } else if (this.isForgeBuilding) {
          EventBus.emit('forge-craft-panel', { open: this.panelOpen, mode: this.activeTab });
        }

        const gameScene = this.scene.get('Game');
        if (gameScene && typeof gameScene.emitStatsUpdate === 'function') {
          gameScene.emitStatsUpdate();
        }

        if (this.panelOpen) {
          const actionName = this.isForgeBuilding 
            ? (this.activeTab === 'repair' ? 'réparer' : 'fusionner') 
            : (this.activeTab === 'buy' ? 'acheter' : 'vendre');
          this.dialogText.setText(`${this.npcName} : « Mode ${actionName} activé. »`);
          this.refreshInteractiveList();
        } else {
          this.dialogText.setText(`${this.npcName} : « À bientôt ! »`);
          this.uiElementsGroup.clear(true, true);
        }
      } else {
        const lines = this.building.lines || ['Bonjour voyageur.'];
        const text = `${this.npcName} : "${lines[Math.floor(Math.random() * lines.length)]}"`;
        this.dialogText.setText(text);
      }
    }
  }

  exitInterior() {
    EventBus.emit('merchant-shop-panel', { open: false });
    EventBus.emit('forge-craft-panel', { open: false });
    EventBus.emit('inventory-panel', false);

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
  }
}

// Fonction utilitaire pour créer un gabarit d'objet à acheter
function itemTemplate(name, cost, atk, kind) {
  return {
    id: 'item_' + Math.random().toString(36).substr(2, 5),
    name: name,
    cost: cost,
    atk: atk,
    kind: kind || 'sword',
    rarity: 1,
    rarityLabel: 'Commun',
    color: 0xffffff,
    durability: 100,
    maxDurability: 100
  };
}
