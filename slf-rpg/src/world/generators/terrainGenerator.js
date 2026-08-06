import { seededRandom } from '../../utils/rng.js';

export function generateTerrain(seed, width, height, tileSize = 64) {
  const rand = seededRandom(seed);
  const cells = [];

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const nx = x / Math.max(1, width / 3);
      const ny = y / Math.max(1, height / 3);
      const value = (
        Math.sin(nx * 1.6 + rand() * 2) * 0.35 +
        Math.cos(ny * 1.2 + rand() * 1.5) * 0.25 +
        (rand() - 0.5) * 0.2 +
        0.5
      );

      cells.push({
        x: x * tileSize,
        y: y * tileSize,
        tileX: x,
        tileY: y,
        value
      });
    }
  }

  return cells;
}
