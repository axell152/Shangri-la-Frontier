# SLF-RPG

RPG d'action inspiré de l'ambiance *Shangri-La Frontier* : équipement "trouvé au sol" au départ,
loot à rareté variable, montée en puissance progressive. Construit avec Phaser 3 + Vite.

## Structure

```
src/
  main.js            → config Phaser + lancement du jeu
  EventBus.js         → bus d'évènements partagé entre scènes
  scenes/
    BootScene.js       → démarrage
    GameScene.js        → monde, joueur, ennemis, drops
    UIScene.js          → HUD (stats, arme équipée, inventaire, logs)
  entities/
    Player.js           → déplacement, attaque, XP
    Enemy.js            → IA simple (poursuite/errance), PV
  systems/
    StatsSystem.js       → niveaux, PV, XP
    WeaponSystem.js       → arme équipée, inventaire, cooldown d'attaque
    LootSystem.js          → tirage de loot à la mort d'un ennemi
  data/
    weapons.js             → types d'armes + tiers de rareté
    enemies.js              → types d'ennemis
    lootTables.js            → probabilités de drop par tier
```

## Lancer en local

```bash
npm install
npm run dev
```

Puis ouvre l'URL affichée (généralement http://localhost:5173).

## Commandes

- Flèches ou WASD : déplacement
- Espace : attaquer (les ennemis à portée de l'arme équipée sont touchés)
- E : ramasser le loot au sol à proximité
- Clic sur un item dans l'inventaire (HUD, en bas à droite) : l'équiper

## Déployer sur Vercel

1. Crée un repo GitHub et pousse ce dossier :
   ```bash
   git init
   git add .
   git commit -m "Initial commit: SLF-RPG scaffold"
   git branch -M main
   git remote add origin <URL_DE_TON_REPO>
   git push -u origin main
   ```
2. Sur [vercel.com](https://vercel.com), "Add New Project" → importe le repo GitHub.
3. Vercel détecte Vite automatiquement (config déjà présente dans `vercel.json`).
   Aucune variable d'environnement nécessaire.
4. Chaque `git push` sur `main` redéploie automatiquement.

## Prochaines étapes possibles

- Ajouter des sprites/animations (actuellement des formes géométriques colorées)
- Système d'équipement complet (armure, accessoires, pas seulement l'arme)
- Sauvegarde locale (localStorage) de la progression
- Boss avec patterns d'attaque scriptés plutôt qu'IA générique
- Zones/biomes multiples avec transition de scène
