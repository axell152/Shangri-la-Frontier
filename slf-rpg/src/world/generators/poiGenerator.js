import { POI_TYPES } from '../poi/poiRegistry.js';
import { seededRandom } from '../../utils/rng.js';
import { createRandomWeaponForTier } from '../../data/weapons.js';

export function generatePois(world, options = {}) {
  const rand = seededRandom(`${world.seed}-pois`);
  const pois = [];
  const spawnableCells = world.cells.filter((cell) => cell.biome !== 'water');

  const cityCenterCell = world.cells.find((cell) => cell.district === 'plaza') || world.cells.find((cell) => cell.district === 'road');
  if (cityCenterCell) {
    pois.push({
      id: 'merchant-center',
      type: 'merchant',
      x: cityCenterCell.x + world.tileSize / 2,
      y: cityCenterCell.y + world.tileSize / 2,
      tileX: cityCenterCell.tileX,
      tileY: cityCenterCell.tileY,
      label: POI_TYPES.merchant.label,
      color: POI_TYPES.merchant.color
    });
  }

  // Prefer building tiles for merchants; fall back to roads if not enough
  const buildingCandidates = spawnableCells.filter((cell) => cell.district === 'building');
  const roadCandidates = spawnableCells.filter((cell) => cell.district === 'road');
  // desired merchant count based on map density
  const desiredCount = Math.min(12, Math.max(6, Math.floor(spawnableCells.length / 6)));
  // start with building candidates
  const merchantCandidates = buildingCandidates.slice();
  // if not enough buildings, add some roads (seeded order)
  if (merchantCandidates.length < desiredCount) {
    // shuffle roads with seed
    for (let i = roadCandidates.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      const tmp = roadCandidates[i];
      roadCandidates[i] = roadCandidates[j];
      roadCandidates[j] = tmp;
    }
    const need = desiredCount - merchantCandidates.length;
    merchantCandidates.push(...roadCandidates.slice(0, need));
  }
  // final seeded shuffle of merchant candidates
  for (let i = merchantCandidates.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    const tmp = merchantCandidates[i];
    merchantCandidates[i] = merchantCandidates[j];
    merchantCandidates[j] = tmp;
  }
  const maxMerchants = Math.min(desiredCount, merchantCandidates.length);
  for (let idx = 0; idx < maxMerchants && idx < merchantCandidates.length; idx++) {
    const cell = merchantCandidates[idx];
    // Stagger merchant, tavern, house placements to create variety
    const roll = rand();
    let t = 'merchant';
    if (roll > 0.8) t = 'tavern';
    else if (roll > 0.6) t = 'house';
    const poi = {
      id: `${cell.tileX}-${cell.tileY}-${t}`,
      type: t,
      x: cell.x + world.tileSize / 2,
      y: cell.y + world.tileSize / 2,
      tileX: cell.tileX,
      tileY: cell.tileY,
      label: POI_TYPES[t].label,
      color: POI_TYPES[t].color,
      meta: { interiorName: `${POI_TYPES[t].label} ${cell.tileX},${cell.tileY}` }
    };

    // If merchant, attach a small random inventory
    if (t === 'merchant') {
      const inv = [];
      const tiers = ['COMMUNE', 'PEU_COMMUNE', 'RARE'];
      for (let k = 0; k < 4; k++) {
        const tier = tiers[Math.floor(rand() * tiers.length)];
        const w = createRandomWeaponForTier(tier);
        if (w) inv.push(w);
      }
      poi.meta.inventory = inv;
    }

    pois.push(poi);
  }

  const poiCandidates = [];
  for (const cell of spawnableCells) {
    const score = Math.abs(cell.value) + rand() * 0.2;
    if (score > 0.45) poiCandidates.push(cell);
  }

  const sorted = poiCandidates.sort((a, b) => a.tileX + a.tileY - (b.tileX + b.tileY));
  const maxAdditional = Math.max(0, (options.maxPois ?? 6) - pois.length);
  const count = Math.min(maxAdditional, sorted.length);

  for (let i = 0; i < count; i++) {
    const cell = sorted[i];
    if (!cell) continue;
    const typeKey = pickPoiType(rand);
    pois.push({
      id: `${typeKey}-${i}`,
      type: typeKey,
      x: cell.x + world.tileSize / 2,
      y: cell.y + world.tileSize / 2,
      tileX: cell.tileX,
      tileY: cell.tileY,
      label: POI_TYPES[typeKey].label,
      color: POI_TYPES[typeKey].color
    });
  }

  return pois;
}

function pickPoiType(rand) {
  const types = Object.entries(POI_TYPES);
  const roll = rand();
  let cumulative = 0;
  for (const [key, def] of types) {
    cumulative += def.spawnWeight;
    if (roll <= cumulative) return key;
  }
  return 'ruin';
}
