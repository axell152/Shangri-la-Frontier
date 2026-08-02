// Carte du monde : un hub central (Havre-du-Départ, la safe zone) entouré
// de zones thématiques. Chaque zone est une ellipse (centre + rayons) avec
// sa propre couleur, son pool d'ennemis, et un statut "locked" pour celles
// qui demandent une mécanique dédiée pas encore construite (raid, donjon).
export const WORLD_W = 3200;
export const WORLD_H = 2900;

export const HUB = { id: 'hub', label: 'Havre-du-Départ', x: 1600, y: 1650, radius: 90 };

export const ZONES = [
  {
    id: 'foret_murmurante',
    label: 'Forêt murmurante',
    flavor: 'créatures furtives, traque',
    x: 750, y: 950, radiusX: 340, radiusY: 300,
    color: 0x3fae4a,
    enemyPool: [
      { type: 'gobelin', count: 3 },
      { type: 'loup_furtif', count: 4 }
    ]
  },
  {
    id: 'ruines_englouties',
    label: 'Ruines englouties',
    flavor: 'cité engloutie, énigmes',
    x: 550, y: 1520, radiusX: 300, radiusY: 280,
    color: 0x5b8fb9,
    enemyPool: [{ type: 'golem_debris', count: 3 }]
  },
  {
    id: 'marais_brumes',
    label: 'Marais des brumes',
    flavor: 'poisons, illusions, contrées cachées',
    x: 900, y: 2200, radiusX: 340, radiusY: 300,
    color: 0x4a7a5a,
    enemyPool: [{ type: 'slime', count: 5 }]
  },
  {
    id: 'port_marisel',
    label: 'Port de Marisel',
    flavor: 'commerce, expéditions maritimes',
    x: 1650, y: 2350, radiusX: 300, radiusY: 260,
    color: 0x7fa8c9,
    enemyPool: [{ type: 'slime', count: 2 }]
  },
  {
    id: 'terres_ecarlates',
    label: 'Terres écarlates',
    flavor: 'désert, marchands nomades',
    x: 2500, y: 1400, radiusX: 340, radiusY: 320,
    color: 0xd98a3d,
    enemyPool: [{ type: 'gobelin', count: 4 }]
  },
  {
    id: 'cratere_arcanique',
    label: 'Cratère arcanique',
    flavor: 'magie instable, zone événementielle',
    x: 2480, y: 2000, radiusX: 300, radiusY: 280,
    color: 0xb15fd9,
    enemyPool: [
      { type: 'golem_debris', count: 2 },
      { type: 'gardien_rouille', count: 1 }
    ]
  },
  {
    id: 'pics_du_givre',
    label: 'Pics du givre',
    flavor: 'boss de glace, cols enneigés',
    x: 2280, y: 650, radiusX: 320, radiusY: 300,
    color: 0xcfe0ea,
    enemyPool: [{ type: 'golem_debris', count: 3 }]
  },
  {
    id: 'citadelle_celeste',
    label: 'Citadelle céleste',
    flavor: 'raid de haut niveau, flottante',
    x: 1550, y: 350, radiusX: 260, radiusY: 200,
    color: 0xc9a8e0,
    locked: true,
    lockedReason: 'Raid — bientôt disponible',
    enemyPool: []
  },
  {
    id: 'abime_oublie',
    label: 'Abîme oublié',
    flavor: 'donjon',
    x: 950, y: 1350, radiusX: 55, radiusY: 55,
    color: 0x2a2a2a,
    locked: true,
    lockedReason: 'Donjon — bientôt disponible',
    enemyPool: []
  }
];
