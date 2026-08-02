import { generateTerrain } from './generators/terrainGenerator.js';
import { resolveBiome, getBiomeColor } from './generators/biomeGenerator.js';
import { generatePois } from './generators/poiGenerator.js';
import { getBiomeThreatLevel, getBiomeEnemyCount, pickEnemyForBiome } from './generators/spawnRules.js';

export class WorldGenerator {
  constructor(options = {}) {
    this.seed = options.seed ?? 'slf-world';
    this.width = options.width ?? 20;
    this.height = options.height ?? 20;
    this.tileSize = options.tileSize ?? 64;
    this.worldWidth = this.width * this.tileSize;
    this.worldHeight = this.height * this.tileSize;
    this.poiCount = options.poiCount ?? 6;
  }

  generate() {
    const cells = generateTerrain(this.seed, this.width, this.height, this.tileSize);
    const centerX = Math.floor(this.width / 2);
    const centerY = Math.floor(this.height / 2);
    const cityRadius = Math.max(6, Math.floor(Math.min(this.width, this.height) * 0.35));

    const worldCells = cells.map((cell) => {
      const biome = resolveBiome(cell.value);
      const dx = cell.tileX - centerX;
      const dy = cell.tileY - centerY;
      const inCity = Math.abs(dx) <= cityRadius && Math.abs(dy) <= cityRadius;
      let district = 'wild';

      if (inCity) {
        if (Math.abs(dx) <= 1 && Math.abs(dy) <= 1) {
          district = 'plaza';
        } else if (Math.abs(dx) <= 1 || Math.abs(dy) <= 1 || (cell.tileX % 3 === 1) || (cell.tileY % 3 === 1)) {
          district = 'road';
        } else {
          district = 'building';
        }
      }

      return {
        ...cell,
        biome,
        color: getBiomeColor(biome),
        district
      };
    });

    const world = {
      seed: this.seed,
      width: this.width,
      height: this.height,
      tileSize: this.tileSize,
      worldWidth: this.worldWidth,
      worldHeight: this.worldHeight,
      cityCenter: {
        x: centerX * this.tileSize + this.tileSize / 2,
        y: centerY * this.tileSize + this.tileSize / 2
      },
      cells: worldCells
    };

    world.pois = generatePois(world, { maxPois: this.poiCount });
    world.spawnPoints = world.pois.map((poi) => ({ x: poi.x, y: poi.y, type: poi.type }));
    world.spawnRules = world.cells.map((cell) => ({
      biome: cell.biome,
      threat: getBiomeThreatLevel(cell.biome),
      enemyCount: getBiomeEnemyCount(cell.biome, 2),
      enemyType: pickEnemyForBiome(cell.biome, () => Math.random())
    }));
    return world;
  }
}
