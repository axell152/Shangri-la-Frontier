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
        #hud-stats { top: 12px; left: 12px; min-width: 200px; }
        #hud-stats .bar-bg { background: #222; border-radius: 3px; height: 10px; margin: 4px 0; overflow: hidden; }
        #hud-stats .bar-fill { height: 100%; }
        #hud-stats .hp-fill { background: #ff3d5a; }
        #hud-stats .xp-fill { background: #3d9dff; }
        #hud-equip { top: 12px; right: 12px; min-width: 200px; }
        #hud-equip .rarity { font-weight: bold; }
        #hud-log { bottom: 12px; left: 12px; width: 260px; max-height: 140px; overflow-y: auto; font-size: 12px; }
        #hud-log div { margin: 2px 0; }
        #hud-inv { top: 140px; right: 12px; width: 240px; max-height: 220px; overflow-y: auto; font-size: 12px; }
        #hud-inv .item { display: flex; justify-content: space-between; align-items: center;
          padding: 4px 6px; margin: 3px 0; border: 1px solid #444; border-radius: 4px; cursor: pointer; }
        #hud-inv .item:hover { background: rgba(255,255,255,0.06); }
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
      </style>
      <div class="panel" id="hud-stats"></div>
      <div class="panel" id="hud-equip"></div>
      <div class="panel" id="hud-log"></div>
      <div class="panel" id="hud-inv"></div>
      <div id="hud-hint">Z,Q,S,D: déplacer · Clic gauche: attaquer · E: ramasser</div>
      <div id="hud-hitflash"></div>
      <div id="hud-gameover">
        TU ES MORT<br>
        <span>Ton équipement reste dans l'inventaire</span>
        <button id="hud-respawn-btn">Respawn</button>
      </div>
    `;
    document.getElementById('game-container').appendChild(wrapper);
    this.dom = wrapper;
    this.logEntries = [];

    this.dom.querySelector('#hud-respawn-btn').addEventListener('click', () => {
      EventBus.emit('respawn-request');
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
    `;

    const gameOverEl = this.dom.querySelector('#hud-gameover');
    gameOverEl.classList.toggle('active', state.hp <= 0);

    const equipEl = this.dom.querySelector('#hud-equip');
    const w = state.equipped;
    equipEl.innerHTML = w ? `
      <div style="font-size: 11px; color: #aaa; margin-bottom: 2px;">Arme équipée</div>
      <div class="rarity" style="color:${this.hex(w.color)}">${w.rarityLabel} ${w.name}</div>
      <div style="font-size: 11px; margin-top: 4px;">ATK ${w.atk} · Vit ${w.speed} · Crit ${(w.crit * 100).toFixed(0)}%</div>
    ` : '<div>Aucune arme</div>';

    const invEl = this.dom.querySelector('#hud-inv');
    invEl.innerHTML = `<div style="font-weight: bold; color: #ffb200; margin-bottom:6px; border-bottom:1px solid #333; padding-bottom:4px;">Inventaire d'armes (${state.inventory.length})</div>` +
      state.inventory.map((weapon) => {
        const isEquipped = state.equipped && state.equipped.id === weapon.id;
        return `
          <div class="item" data-id="${weapon.id}" style="border-color: ${isEquipped ? '#ff3d5a' : '#444'}; background: ${isEquipped ? 'rgba(255, 61, 90, 0.15)' : 'transparent'};">
            <span style="color:${this.hex(weapon.color)}">[${weapon.rarityLabel}] ${weapon.name}</span>
            ${isEquipped ? '<span style="font-size: 10px; color:#ff3d5a;">Équipé</span>' : ''}
          </div>
        `;
      }).join('');

    invEl.querySelectorAll('.item').forEach((el) => {
      el.addEventListener('click', () => EventBus.emit('equip-weapon', el.dataset.id));
    });
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

  hex(num) {
    return '#' + num.toString(16).padStart(6, '0');
  }
}
