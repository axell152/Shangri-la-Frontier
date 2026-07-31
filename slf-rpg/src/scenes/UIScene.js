import Phaser from 'phaser';
import { EventBus } from '../EventBus.js';

export class UIScene extends Phaser.Scene {
  constructor() {
    super('UI');
  }

  create() {
    this.buildDom();

    EventBus.on('stats-updated', (state) => this.render(state));
    EventBus.on('loot-log', (entry) => this.pushLog(entry));
    EventBus.on('level-up', (level) => this.pushLog({ type: 'levelup', text: `Niveau ${level} atteint !` }));
    EventBus.on('player-hit', () => this.flashHit());
    EventBus.on('safe-zone-status', (inZone) => this.toggleSavePrompt(inZone));
    EventBus.on('save-flash', () => this.flashSaveConfirmed());
    EventBus.on('merchant-nearby', (near) => this.toggleMerchantPrompt(near));
    EventBus.on('merchant-panel', (open) => this.toggleMerchantPanel(open));
    EventBus.on('inventory-panel', (open) => this.toggleInventoryPanel(open));
  }

  buildDom() {
    const wrapper = document.createElement('div');
    wrapper.id = 'hud';
    wrapper.innerHTML = `
      <style>
        #hud { position: fixed; top: 0; left: 0; right: 0; bottom: 0; pointer-events: none;
          font-family: 'Courier New', monospace; color: #fff; }
        #hud .panel { position: absolute; pointer-events: auto; background: rgba(10,10,16,0.92);
          border: 1px solid #333; border-radius: 6px; padding: 8px 12px; }
        #hud-stats { top: 12px; left: 12px; min-width: 210px; }
        #hud-stats .bar-bg { background: #222; border-radius: 3px; height: 10px; margin: 4px 0; overflow: hidden; }
        #hud-stats .bar-fill { height: 100%; }
        #hud-stats .hp-fill { background: #ff3d5a; }
        #hud-stats .xp-fill { background: #3d9dff; }
        #hud-stats .gold { color: #ffd23d; margin-top: 4px; }
        #hud-equip { top: 12px; right: 12px; min-width: 200px; }
        #hud-equip .rarity { font-weight: bold; }
        #hud-log { bottom: 12px; left: 12px; width: 260px; max-height: 140px; overflow-y: auto; font-size: 12px; }
        #hud-log div { margin: 2px 0; }
        #hud-hint { position: absolute; bottom: 12px; left: 50%; transform: translateX(-50%);
          font-size: 11px; color: #999; }
        #hud-hitflash { position: absolute; inset: 0; pointer-events: none;
          box-shadow: inset 0 0 0px rgba(255,0,0,0); transition: box-shadow 0.1s ease-out; }
        #hud-hitflash.active { box-shadow: inset 0 0 80px rgba(255,0,0,0.55); }
        #hud-gameover { position: absolute; inset: 0; display: none; flex-direction: column;
          align-items: center; justify-content: center; background: rgba(0,0,0,0.75);
          color: #ff3d5a; font-size: 28px; letter-spacing: 2px; text-align: center; pointer-events: none; }
        #hud-gameover span { font-size: 13px; color: #ccc; margin-top: 8px; letter-spacing: 0; }
        #hud-gameover.active { display: flex; }
        #hud-respawn-btn { margin-top: 16px; padding: 8px 20px; background: #ff3d5a; color: #fff;
          border: none; border-radius: 4px; font-family: 'Courier New', monospace; font-size: 13px;
          cursor: pointer; pointer-events: auto; letter-spacing: 1px; }
        #hud-respawn-btn:hover { background: #ff5d75; }
        #hud-save-prompt, #hud-merchant-prompt { position: absolute; left: 50%; transform: translateX(-50%);
          border-radius: 4px; padding: 6px 14px; font-size: 12px; display: none; }
        #hud-save-prompt { bottom: 44px; background: rgba(255,178,0,0.15); border: 1px solid #ffb200; color: #ffd23d; }
        #hud-save-prompt.visible { display: block; }
        #hud-save-prompt.confirmed { background: rgba(157,255,157,0.15); border-color: #9dff9d; color: #9dff9d; }
        #hud-merchant-prompt { bottom: 76px; background: rgba(61,157,255,0.15); border: 1px solid #3d9dff; color: #9dd4ff; }
        #hud-merchant-prompt.visible { display: block; }

        /* Modales (inventaire / marchand) */
        .hud-modal { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
          width: 460px; max-width: 90vw; max-height: 70vh; overflow-y: auto; display: none;
          background: rgba(8,8,14,0.97); border: 1px solid #444; border-radius: 8px; padding: 16px;
          pointer-events: auto; }
        .hud-modal.open { display: block; }
        .hud-modal h3 { margin: 0 0 10px 0; font-size: 14px; color: #ffb200; display: flex; justify-content: space-between; }
        .hud-modal .close-hint { font-size: 10px; color: #888; font-weight: normal; }
        .hud-modal .row { display: flex; justify-content: space-between; align-items: center;
          padding: 6px 8px; margin: 4px 0; border: 1px solid #333; border-radius: 4px; font-size: 12px; }
        .hud-modal .row.equipped { border-color: #ff3d5a; background: rgba(255,61,90,0.1); }
        .hud-modal .row button { background: #3d9dff; color: #fff; border: none; border-radius: 3px;
          padding: 4px 8px; font-size: 11px; cursor: pointer; font-family: 'Courier New', monospace; margin-left: 4px; }
        .hud-modal .row button.sell { background: #ffb200; }
        .hud-modal .row button.merge { background: #b14dff; }
        .hud-modal .row button:hover { opacity: 0.85; }
        .hud-modal .row button:disabled { background: #444; cursor: not-allowed; opacity: 0.6; }
        .hud-modal .empty { color: #888; font-size: 12px; text-align: center; padding: 12px 0; }
        .hud-modal .section-title { font-size: 11px; color: #999; margin: 12px 0 4px; text-transform: uppercase; }
      </style>
      <div class="panel" id="hud-stats"></div>
      <div class="panel" id="hud-equip"></div>
      <div class="panel" id="hud-log"></div>
      <div id="hud-hint">Z,Q,S,D: déplacer · Clic gauche: attaquer · E: ramasser · I: inventaire
        · <span id="hud-reset-save" style="text-decoration: underline; cursor: pointer; pointer-events: auto;">réinitialiser la sauvegarde</span>
      </div>
      <div id="hud-save-prompt">Appuie sur F pour sauvegarder</div>
      <div id="hud-merchant-prompt">Appuie sur T pour parler au marchand</div>
      <div id="hud-hitflash"></div>
      <div id="hud-gameover">
        TU ES MORT<br>
        <span>Retour à ta dernière sauvegarde</span>
        <button id="hud-respawn-btn">Continuer</button>
      </div>

      <div class="hud-modal" id="hud-inventory-modal">
        <h3>Inventaire <span class="close-hint">I pour fermer</span></h3>
        <div id="hud-inventory-list"></div>
      </div>

      <div class="hud-modal" id="hud-merchant-modal">
        <h3>Marchand <span class="close-hint">T pour fermer</span></h3>
        <div style="color:#ffd23d; font-size:13px; margin-bottom:10px;">Or : <span id="hud-merchant-gold">0</span></div>
        <div class="section-title">Fusion (3 identiques → palier supérieur)</div>
        <div id="hud-merchant-merge"></div>
        <div class="section-title">Vendre</div>
        <div id="hud-merchant-sell"></div>
      </div>
    `;
    document.getElementById('game-container').appendChild(wrapper);
    this.dom = wrapper;
    this.logEntries = [];

    this.dom.querySelector('#hud-respawn-btn').addEventListener('click', () => {
      EventBus.emit('respawn-request');
    });

    this.dom.querySelector('#hud-reset-save').addEventListener('click', () => {
      if (confirm('Effacer ta sauvegarde et recommencer à zéro (niveau, inventaire, tout) ?')) {
        EventBus.emit('reset-save-request');
      }
    });
  }

  render(state) {
    this.state = state;
    const statsEl = this.dom.querySelector('#hud-stats');
    const hpPct = Math.max(0, (state.hp / state.maxHp) * 100);
    const xpPct = Math.max(0, (state.xp / state.xpToNext) * 100);
    statsEl.innerHTML = `
      <div>Niveau ${state.level} — ATK ${state.atk} · DEF ${state.def}</div>
      <div class="bar-bg"><div class="bar-fill hp-fill" style="width:${hpPct}%"></div></div>
      <div>PV ${state.hp} / ${state.maxHp}</div>
      <div class="bar-bg"><div class="bar-fill xp-fill" style="width:${xpPct}%"></div></div>
      <div>XP ${state.xp} / ${state.xpToNext}</div>
      <div class="gold">${state.gold} or</div>
    `;

    const gameOverEl = this.dom.querySelector('#hud-gameover');
    gameOverEl.classList.toggle('active', state.hp <= 0);

    const equipEl = this.dom.querySelector('#hud-equip');
    const w = state.equipped;
    if (w) {
      const durabilityText = isFinite(w.durability) ? `${w.durability}/${w.maxDurability}` : '∞';
      const durabilityPct = isFinite(w.durability) ? Math.max(0, (w.durability / w.maxDurability) * 100) : 100;
      const durabilityColor = durabilityPct > 40 ? '#9dff9d' : durabilityPct > 15 ? '#ffd23d' : '#ff3d5a';
      equipEl.innerHTML = `
        <div style="font-size: 11px; color: #aaa; margin-bottom: 2px;">Arme équipée</div>
        <div class="rarity" style="color:${this.hex(w.color)}">${w.rarityLabel} ${w.name}</div>
        <div style="font-size: 11px; margin-top: 4px;">ATK ${w.atk} · Portée ${w.range} · Crit ${(w.crit * 100).toFixed(0)}%</div>
        <div style="font-size: 11px; color:${durabilityColor}; margin-top: 2px;">Durabilité : ${durabilityText}</div>
      `;
    } else {
      equipEl.innerHTML = '<div>Aucune arme</div>';
    }

    this.renderInventoryModal(state);
    this.renderMerchantModal(state);
  }

  renderInventoryModal(state) {
    const listEl = this.dom.querySelector('#hud-inventory-list');
    if (state.inventory.length === 0) {
      listEl.innerHTML = '<div class="empty">Inventaire vide.</div>';
      return;
    }
    listEl.innerHTML = state.inventory.map((weapon) => {
      const isEquipped = state.equipped && state.equipped.id === weapon.id;
      const durabilityShort = isFinite(weapon.durability) ? `${weapon.durability}/${weapon.maxDurability}` : '∞';
      return `
        <div class="row ${isEquipped ? 'equipped' : ''}" data-id="${weapon.id}">
          <span style="color:${this.hex(weapon.color)}">[${weapon.rarityLabel}] ${weapon.name}</span>
          <span>
            <span style="color:#999; font-size:11px;">${durabilityShort}</span>
            <button class="equip" data-id="${weapon.id}" ${isEquipped ? 'disabled' : ''}>${isEquipped ? 'Équipé' : 'Équiper'}</button>
          </span>
        </div>
      `;
    }).join('');

    listEl.querySelectorAll('button.equip').forEach((btn) => {
      btn.addEventListener('click', () => EventBus.emit('equip-weapon', btn.dataset.id));
    });
  }

  renderMerchantModal(state) {
    this.dom.querySelector('#hud-merchant-gold').textContent = state.gold;

    const mergeEl = this.dom.querySelector('#hud-merchant-merge');
    if (state.mergeGroups.length === 0) {
      mergeEl.innerHTML = '<div class="empty">Aucune fusion possible (il faut 3 armes identiques).</div>';
    } else {
      mergeEl.innerHTML = state.mergeGroups.map((group) => `
        <div class="row">
          <span style="color:${this.hex(group.color)}">[${group.rarityLabel}] ${group.name} ×${group.count}</span>
          <button class="merge" data-name="${group.name}" ${state.gold < group.cost ? 'disabled' : ''}>
            Fusionner (-${group.cost} or)
          </button>
        </div>
      `).join('');
      mergeEl.querySelectorAll('button.merge').forEach((btn) => {
        btn.addEventListener('click', () => EventBus.emit('merge-weapons', btn.dataset.name));
      });
    }

    const sellEl = this.dom.querySelector('#hud-merchant-sell');
    if (state.inventory.length === 0) {
      sellEl.innerHTML = '<div class="empty">Rien à vendre.</div>';
    } else {
      sellEl.innerHTML = state.inventory.map((weapon) => {
        const durabilityFraction = isFinite(weapon.durability) ? weapon.durability / weapon.maxDurability : 1;
        const baseByTier = { COMMUNE: 5, PEU_COMMUNE: 15, RARE: 40, EPIQUE: 100, LEGENDAIRE: 300, MYTHIQUE: 900, RELIQUE_DIVINE: 3000 };
        const value = Math.max(1, Math.round((baseByTier[weapon.tierKey] ?? 5) * (0.4 + durabilityFraction * 0.6)));
        return `
          <div class="row">
            <span style="color:${this.hex(weapon.color)}">[${weapon.rarityLabel}] ${weapon.name}</span>
            <button class="sell" data-id="${weapon.id}">Vendre (+${value} or)</button>
          </div>
        `;
      }).join('');
      sellEl.querySelectorAll('button.sell').forEach((btn) => {
        btn.addEventListener('click', () => EventBus.emit('sell-weapon', btn.dataset.id));
      });
    }
  }

  toggleInventoryPanel(open) {
    this.dom.querySelector('#hud-inventory-modal').classList.toggle('open', open);
  }

  toggleMerchantPanel(open) {
    this.dom.querySelector('#hud-merchant-modal').classList.toggle('open', open);
  }

  toggleMerchantPrompt(near) {
    this.dom.querySelector('#hud-merchant-prompt').classList.toggle('visible', near);
  }

  pushLog(entry) {
    this.logEntries.unshift(entry);
    this.logEntries = this.logEntries.slice(0, 20);
    const logEl = this.dom.querySelector('#hud-log');
    const colors = { kill: '#ff9d9d', drop: '#9dd4ff', pickup: '#9dff9d', levelup: '#ffd23d' };
    logEl.innerHTML = this.logEntries
      .map((e) => `<div style="color:${colors[e.type] || '#fff'}">${e.text}</div>`)
      .join('');
  }

  flashHit() {
    const el = this.dom.querySelector('#hud-hitflash');
    el.classList.add('active');
    setTimeout(() => el.classList.remove('active'), 150);
  }

  toggleSavePrompt(inZone) {
    this.dom.querySelector('#hud-save-prompt').classList.toggle('visible', inZone);
  }

  flashSaveConfirmed() {
    const el = this.dom.querySelector('#hud-save-prompt');
    el.textContent = 'Sauvegardé !';
    el.classList.add('confirmed');
    setTimeout(() => {
      el.textContent = 'Appuie sur F pour sauvegarder';
      el.classList.remove('confirmed');
    }, 1200);
  }

  hex(num) {
    return '#' + num.toString(16).padStart(6, '0');
  }
}
