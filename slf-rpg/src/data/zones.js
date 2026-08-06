// Monde : une ville-hub rectangulaire (taille fixe, praticable) entourée
// de biomes bien plus grands (~3-4x les dimensions de la ville) accessibles
// par des sorties marquées.
export const WORLD_W = 16000;
export const WORLD_H = 16000;

// Rectangle de la ville (Havre-du-Départ) — large et spacieux
export const TOWN = {
  id: 'town',
  label: 'Havre-du-Départ',
  x1: 6200, y1: 6600, x2: 9800, y2: 10000
};
export const TOWN_CENTER = { x: (TOWN.x1 + TOWN.x2) / 2, y: (TOWN.y1 + TOWN.y2) / 2 };

// Bâtiments disposés en mode "New-York" : alignés le long de grandes rues en grille,
// avec la fontaine centrale exactement au milieu.
export const BUILDINGS = [
  // --- CENTRE : La grande fontaine ---
  {
    id: 'grande_fontaine', label: 'Grande Fontaine', desc: 'Le cœur de la cité',
    x: TOWN_CENTER.x, y: TOWN_CENTER.y, functional: false, color: 0x4a8a9a, isDecor: true
  },

  // --- ÎLOT NORD-OUEST ---
  // --- ÎLOT NORD-OUEST ---
  {
    id: 'forge', label: 'Forge', desc: 'Réparation et Fusion d’armes',
    x: TOWN_CENTER.x - 420, y: TOWN_CENTER.y - 320, functional: true, color: 0x8a5a3a,
    interiorColor: 0x3a2a1f, npcName: 'Forgeron',
    lines: ['Apportez-moi vos armes à réparer ou à fusionner.', 'Le fer demande de la précision.']
  },
  {
    id: 'boulangerie', label: 'Boulangerie', desc: 'Pains et galettes',
    x: TOWN_CENTER.x - 420, y: TOWN_CENTER.y - 700, functional: false, color: 0x9c7a4d, interiorColor: 0x42301f, npcName: 'Boulanger',
    lines: ['Le pain tout chaud sort du four !', 'Attention à la suie.']
  },
  {
    id: 'house_nw', label: 'Résidence Nord-Ouest', desc: 'Quartier résidentiel',
    x: TOWN_CENTER.x - 900, y: TOWN_CENTER.y - 500, functional: false, color: 0x6b4f3a, interiorColor: 0x3a2a1f
  },

  // --- ÎLOT NORD-EST ---
  // --- ÎLOT SUD-EST ---
  {
    id: 'echoppe', label: 'Échoppe du Commerçant', desc: 'Achat et Vente d’objets',
    x: TOWN_CENTER.x + 420, y: TOWN_CENTER.y + 320, functional: true, color: 0x3a6b5a,
    interiorColor: 0x24302a, npcName: 'Commerçant',
    lines: ['Jetez un œil à mes articles, ou vendez-moi vos prises !', 'De l’or contre du matériel de qualité.']
  },
  {
    id: 'apothicaire', label: 'Apothicaire', desc: 'Remèdes et plantes',
    x: TOWN_CENTER.x + 420, y: TOWN_CENTER.y - 700, functional: false, color: 0x4a7a65, interiorColor: 0x203b30, npcName: 'Herboriste',
    lines: ['Les champignons des marécages sont toxiques.', 'Besoin d’un onguent ?']
  },
  {
    id: 'house_ne', label: 'Résidence Nord-Est', desc: 'Quartier résidentiel',
    x: TOWN_CENTER.x + 900, y: TOWN_CENTER.y - 500, functional: false, color: 0x5a7042, interiorColor: 0x24302a
  },

  // --- ÎLOT SUD-OUEST ---
  {
    id: 'taverne', label: 'Taverne', desc: 'Auberge — point de sauvegarde', savePoint: true,
    x: TOWN_CENTER.x - 420, y: TOWN_CENTER.y + 320, functional: false, color: 0x6b3a3a,
    interiorColor: 0x3b2416, npcName: 'Aubergiste',
    lines: ['Pas de quête pour l’instant, mais assieds-toi.', 'On raconte des choses sur les ruines à l’ouest...']
  },
  {
    id: 'tanerie', label: 'Tanerie', desc: 'Cuirs et peaux',
    x: TOWN_CENTER.x - 420, y: TOWN_CENTER.y + 700, functional: false, color: 0x6b533a, interiorColor: 0x36281b, npcName: 'Tanneur',
    lines: ['Le cuir protège bien des griffes.', 'J’attends des peaux de loups spectraux.']
  },
  {
    id: 'house_sw', label: 'Résidence Sud-Ouest', desc: 'Quartier résidentiel',
    x: TOWN_CENTER.x - 900, y: TOWN_CENTER.y + 500, functional: false, color: 0x7a5a4a, interiorColor: 0x3b2b1f
  },

  // --- ÎLOT SUD-EST ---
  {
    id: 'echoppe', label: 'Échoppe générale', desc: 'Objets divers — bientôt',
    x: TOWN_CENTER.x + 420, y: TOWN_CENTER.y + 320, functional: false, color: 0x3a6b5a,
    interiorColor: 0x24302a, npcName: 'Commerçant',
    lines: ['Rien à vendre pour l’instant, désolé.', 'Repasse plus tard, l’inventaire arrive.']
  },
  {
    id: 'etables', label: 'Étables', desc: 'Bêtes de somme',
    x: TOWN_CENTER.x + 420, y: TOWN_CENTER.y + 700, functional: false, color: 0x5e4530, interiorColor: 0x2e2015, npcName: 'Fermier',
    lines: ['Les bêtes sont calmes aujourd’hui.', 'Bonne route dans les biomes !']
  },
  {
    id: 'house_se', label: 'Résidence Sud-Est', desc: 'Quartier résidentiel',
    x: TOWN_CENTER.x + 900, y: TOWN_CENTER.y + 500, functional: false, color: 0x705242, interiorColor: 0x38281d
  },

  // --- EXTENSIONS PÉRIPHÉRIQUES (Grands axes extérieurs) ---
  {
    id: 'stall_fruits', label: 'Marché Nord', desc: 'Fruits & Légumes',
    x: TOWN_CENTER.x, y: TOWN_CENTER.y - 700, functional: false, color: 0x8fbf6f, interiorColor: 0x2b4f3c, npcName: 'Marchand ambulant',
    lines: ['Fraîchement cueillis aux abords de la forêt !']
  },
  {
    id: 'stall_tissus', label: 'Marché Sud', desc: 'Étoffes et vêture',
    x: TOWN_CENTER.x, y: TOWN_CENTER.y + 700, functional: false, color: 0xc77fb3, interiorColor: 0x3b2430, npcName: 'Tisserande',
    lines: ['De jolies couleurs pour vos voyages.']
  },
  {
    id: 'post_west', label: 'Poste de Garde Ouest', desc: 'Sécurité de la cité',
    x: TOWN_CENTER.x - 900, y: TOWN_CENTER.y, functional: false, color: 0x4f6070, interiorColor: 0x222c36
  },
  {
    id: 'post_east', label: 'Poste de Garde Est', desc: 'Sécurité de la cité',
    x: TOWN_CENTER.x + 900, y: TOWN_CENTER.y, functional: false, color: 0x4f6070, interiorColor: 0x222c36
  }
];

// Sorties de la ville, alignées au bout des grands axes
export const GATES = [
  { direction: 'north', x: TOWN_CENTER.x, y: TOWN.y1, targetZone: 'foret_murmurante' },
  { direction: 'south', x: TOWN_CENTER.x, y: TOWN.y2, targetZone: 'marais_brumes' },
  { direction: 'east', x: TOWN.x2, y: TOWN_CENTER.y, targetZone: 'terres_ecarlates' },
  { direction: 'west', x: TOWN.x1, y: TOWN_CENTER.y, targetZone: 'ruines_englouties' }
];

// Biomes environnants
const BIOME_RADIUS_X = 2600;
const BIOME_RADIUS_Y = 1900;
const GAP = 500;

export const ZONES = [
  {
    id: 'ruines_englouties',
    label: 'Ruines englouties',
    flavor: 'ruines sous-marines, mécanismes brisés',
    x: TOWN.x1 - GAP - BIOME_RADIUS_X, y: TOWN_CENTER.y,
    radiusX: BIOME_RADIUS_X, radiusY: BIOME_RADIUS_Y,
    color: 0x5a7a8a,
    enemyPool: [
      { type: 'golem_debris', count: 12 },
      { type: 'gardien_rouille', count: 1 }
    ]
  },
  {
    id: 'foret_murmurante',
    label: 'Forêt murmurante',
    flavor: 'arbres chantants, brume magique',
    x: TOWN_CENTER.x, y: TOWN.y1 - GAP - BIOME_RADIUS_Y,
    radiusX: BIOME_RADIUS_X, radiusY: BIOME_RADIUS_Y,
    color: 0x2a7a3a,
    enemyPool: [{ type: 'loup_spectral', count: 15 }]
  },
  {
    id: 'marais_brumes',
    label: 'Marais des brumes',
    flavor: 'poisons, illusions, contrées cachées',
    x: TOWN_CENTER.x, y: TOWN.y2 + GAP + BIOME_RADIUS_Y,
    radiusX: BIOME_RADIUS_X, radiusY: BIOME_RADIUS_Y,
    color: 0x4a7a5a,
    enemyPool: [{ type: 'slime', count: 20 }]
  },
  {
    id: 'terres_ecarlates',
    label: 'Terres écarlates',
    flavor: 'désert, marchands nomades',
    x: TOWN.x2 + GAP + BIOME_RADIUS_X, y: TOWN_CENTER.y,
    radiusX: BIOME_RADIUS_X, radiusY: BIOME_RADIUS_Y,
    color: 0xd98a3d,
    enemyPool: [{ type: 'gobelin', count: 18 }]
  }
];
