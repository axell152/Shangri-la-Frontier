// Pure logic, decoupled from Phaser, so it's easy to unit test later.
export class StatsSystem {
  constructor() {
    this.level = 1;
    this.xp = 0;
    this.xpToNext = 30;
    this.baseHp = 60;
    this.baseAtk = 4;
    this.baseDef = 2;
    this.hp = this.baseHp;
  }

  get maxHp() {
    return this.baseHp + (this.level - 1) * 12;
  }

  get totalAtk() {
    return this.baseAtk + (this.level - 1) * 2;
  }

  get totalDef() {
    return this.baseDef + (this.level - 1) * 1;
  }

  takeDamage(amount) {
    this.hp = Math.max(0, this.hp - amount);
    return this.hp <= 0;
  }

  heal(amount) {
    this.hp = Math.min(this.maxHp, this.hp + amount);
  }

  // Returns true if a level-up occurred (can loop for multiple level-ups).
  gainXp(amount) {
    this.xp += amount;
    let leveledUp = false;
    while (this.xp >= this.xpToNext) {
      this.xp -= this.xpToNext;
      this.level += 1;
      this.xpToNext = Math.round(this.xpToNext * 1.35);
      this.hp = this.maxHp; // full heal on level up
      leveledUp = true;
    }
    return leveledUp;
  }
}
