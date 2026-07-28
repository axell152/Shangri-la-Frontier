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
  }

  buildDom() {
    const wrapper = document.createElement('div');
    wrapper.id = 'hud';
    wrapper.innerHTML = `
      <style>
        #hud { position: fixed; top: 0; left: 0; right: 0; bottom: 0; pointer-events: none;
          font-family: 'Courier New', monospace; color: #fff; }
        #hud .panel { position: absolute; pointer-events: auto; background: rgba(10,10,16,0.85);
          border: 1px solid #333; border-radius: 6px; padding: 8px 12px; }
        #hud-stats { top: 12px; left: 12px; min-width: 200px; }
        #hud-stats .bar-bg { background: #222; border-radius: 3px; height: 10px; margin: 4px 0; overflow: hidden; }
        #hud-stats .bar-fill { height: 100%; }
        #hud-stats .hp-fill { background: #ff3d5a; }
        #hud-stats .xp-fill { background: #3d9dff; }
        #hud-equip { top: 12px; right: 12px; min-width: 180px; }
        #hud-equip .rarity { font-weight: bold; }
        #hud-log { bottom: 12px; left: 12px; width: 260px; max-height: 140px; overflow-y: auto; font-size: 12px; }
        #hud-log div { margin: 2px 0; }
        #hud-inv { bottom: 12px; right: 12px; width: 240px; max-height: 200px; overflow-y: auto; font-size: 12px; }
        #hud-inv .item { display: flex; justify-content: space-between; align-items: center;
          padding: 3px 0; border-bottom: 1px solid #222; cursor: pointer; }
        #hud-inv .item:hover { background: rgba(255,255,255,0.06); }
        #hud-hint { position: absolute; bottom: 12px; left: 50%; transform: translateX(-50%);
          font-size: 11px; color: #999; }
      </style>
      <div class="panel" id="hud-stats"></div>
      <div class="panel" id="hud-equip"></div>
      <div class="panel" id="hud-log"></div>
      <div class="panel" id="hud-inv"></div>
      <div id="hud-hint">Flèches/WASD: déplacer · Espace: attaquer · E: ramasser</div>
    `;
    document.getElementById('game-container').appendChild(wrapper);
    this.dom = wrapper;
    this.logEntries = [];
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

    const equipEl = this.dom.querySelector('#hud-equip');
    const w = state.equipped;
    equipEl.innerHTML = w ? `
      <div>Arme équipée</div>
      <div class="rarity" style="color:${this.hex(w.color)}">${w.rarityLabel} ${w.name}</div>
      <div>ATK ${w.atk} · Vitesse ${w.speed} · Crit ${(w.crit * 100).toFixed(0)}%</div>
    ` : '<div>Aucune arme</div>';

    const invEl = this.dom.querySelector('#hud-inv');
    invEl.innerHTML = `<div style="opacity:0.7;margin-bottom:4px;">Inventaire (${state.inventory.length})</div>` +
      state.inventory.map((weapon) => `
        <div class="item" data-id="${weapon.id}">
          <span style="color:${this.hex(weapon.color)}">${weapon.rarityLabel} ${weapon.name}</span>
          <span>ATK ${weapon.atk}</span>
        </div>
      `).join('');

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

  hex(num) {
    return '#' + num.toString(16).padStart(6, '0');
  }
}
