# Reckless Fathoms — jeu en ligne

Implémentation complète du jeu de dés (2-5 joueurs), jouable contre l'IA et en multijoueur temps réel avec lobby.

## Architecture

Monorepo npm workspaces :

```
packages/
  engine/     ← moteur de jeu pur TypeScript (AUCUNE dépendance framework)
apps/
  cli/        ← CLI de test des règles au clavier (phase 1)
  web/        ← front (Vite + SCSS) : design system + écrans de jeu (phase 3)
  server/     ← serveur autoritaire WebSocket (phase 4)
```

Le moteur est le cœur : machine à états du tour (`turn.ts`), scoring pur (`scoring.ts`),
partie complète (`game.ts`). Il tourne à l'identique dans le navigateur (mode solo)
et sur le serveur (mode multi) — le serveur ré-exécute chaque action et rejette
les actions illégales (`IllegalActionError`). Les lancers de dés sont injectables
(`RollFn`) : `Math.random` en prod côté serveur, files déterministes en test,
PRNG seedable (`mulberry32`) pour rejouer une partie en debug.

## Règles implémentées

- 8 dés Corsaires, barème 3→8 identiques (100 → 4000 pts)
- +100 par pièce d'or et diamant, cumulables avec les combos
- Bonus coffre au trésor plein (+500) : **les 8 dés doivent afficher la même
  valeur** (8 pièces, 8 diamants, 8 sabres…, ou 8 animaux avec la carte Animaux).
  Aucun dé n'est alors inutile. Un mélange ne donne pas le bonus, même si tous
  les dés marquent : 5 pièces + 3 diamants → pas de coffre plein. Le jugement
  porte sur les 8 dés seuls, donc une carte Tête de Mort ne bloque pas le bonus.
- 3e tête de mort = tour perdu, têtes maudites non relançables
- Relances : min 2 dés (relancer TOUS les dés relançables est permis)
- Île de la Tête-de-Mort (4+ têtes au 1er lancer, malus -100/tête aux adversaires).
  Elle se termine dès qu'aucune nouvelle tête ne sort **ou** qu'il reste moins de
  2 dés relançables — sans quoi le joueur serait bloqué sans action possible.
- **Un score ne descend jamais sous zéro** : un malus fait au pire retomber à 0
- **Bateau Pirate** : le défi est obligatoire pour marquer. Réussi → les dés
  comptent + la prime. Raté → **0 point** (même les dés), mais aucune pénalité.
  Le quota de sabres reste acquis même si le tour se perd sur la 3ᵉ tête : les
  sabres sont comptés en même temps que les têtes du lancer fatal.
- Les 8 cartes Pirate : Île au Trésor, Pirate (x2, malus île x2), Tête de Mort (1-2),
  Gardienne, Bateau Pirate (3 paliers), Pièce d'or, Diamant, Animaux
- Franchir 6000 pts déclenche un **dernier tour** : chaque autre joueur rejoue
  une fois, puis le **meilleur score** l'emporte (pas forcément le déclencheur)
- Timeout par décision (60s) : 0 point, malus île déjà révélés conservés

## Interprétations à valider (zones grises du PDF)

1. **Coffre plein et carte Tête de Mort** : validé — le bonus se juge sur les 8
   dés uniquement, donc 8 pièces donnent le coffre plein même si la carte du tour
   apporte une tête de mort (elle n'est pas un dé).
   **Île de la Tête-de-Mort** : 4 têtes au premier lancer y envoient quelle que
   soit la carte du tour, Bateau Pirate compris (l'exception précédente a été
   supprimée). Le joueur actif marque alors 0 — la prime du Bateau n'est pas
   évaluée dans ce cas.
2. **Composition du deck (35 cartes)** : la répartition retenue vit dans
   `deck.ts` (4 diamant, 4 pièce, 4 trésor, 4 animaux, 4 pirate, 4 gardienne,
   2/2/2 bateaux, 3 tête×1, 2 tête×2 = 35). Elle est corroborée par les notes de
   l'ancien repo (`main` d'origine), qui listent exactement la même chose. Seul
   le total de 35 est imposé par la règle écrite : le détail reste ajustable.
3. **9 dés identiques** (8 dés + carte Pièce/Diamant) : plafonné au barème de 8
   (4000 pts).

## Lancer les tests

```bash
npm install
npm test        # 27 tests, moteur complet
```

## Jouer en CLI (validation des règles)

Une CLI hotseat pour dérouler une partie au clavier et vérifier les règles
contre la boîte physique, **avant** d'investir dans le front. Elle ne contient
aucune règle : elle appelle `Game`/`applyAction` et affiche l'état renvoyé (toute
action illégale s'affiche telle quelle).

```bash
npm run play    # ou : npm start -w @rf/cli
```

Deux atouts pour la validation :

- **Saisie manuelle des dés** (mode « manuel ») : force n'importe quel scénario
  (3 têtes, Île, coffre plein, quota de sabres…) sans dépendre du hasard.
- **Graine RNG** (mulberry32) : rejoue une partie à l'identique.

L'entrée étant lue ligne par ligne, un scénario peut être scripté et rejoué au
pipe — utile pour reproduire un cas litigieux :

```bash
printf '2\n\n\nm\n4\nk k k k s s m p\nk s m p\ns m p\n' | npm run play
```

Commandes en jeu : `reroll <id…>` (r), `guard <tête> <id…>` (g), `bank`/`unbank`,
`stop` (s), `board`, `timeout`, `help`, `quit`.

Au démarrage, chaque joueur peut être **humain** ou **IA** (facile / moyenne /
difficile) — de quoi jouer en solo contre l'ordinateur directement au terminal.

## IA (Phase 2)

`packages/engine/src/ai.ts` — pas de ML, décision par **espérance de gain**.
À chaque décision, l'IA compare « s'arrêter » et « relancer les dés non
marquants » : elle énumère tous les tirages possibles des dés relancés (loi
multinomiale sur 6 faces) et réutilise `applyAction`/`scoreTurn` pour valoriser
chaque issue (3ᵉ tête, Bateau raté, dés réservés de l'Île au Trésor…). L'espérance
est donc **exacte à un coup d'avance**, sans aucune règle dupliquée.

- **Niveaux de difficulté** = marge de sécurité (points) exigée pour préférer la
  relance à l'arrêt : `easy` prudente (+200), `medium` (+75), `hard` EV-optimale (0).
- **Choix des dés à garder** conscient de la carte : sabres conservés pour le
  quota d'un Bateau, trésors relancés tant que le quota n'est pas atteint (un
  Bateau raté annule tout), dés marquants réservés sur l'Île au Trésor.
- Pure et déterministe → testée au point près (`test/ai.test.ts`), y compris une
  partie complète IA vs IA jouée jusqu'à la victoire.

API : `decideAction(turn, { difficulty })`, `playBotTurn(game, opts, onStep?)`.

## Design system & front (Phase 3)

`apps/web` — Vite + SCSS. Le design system vit dans `src/assets/scss/`
(**portable tel quel vers Nuxt** si on migre le shell plus tard) :

- `_tokens.scss` — matières (or, cachet de cire, chêne…) + **couche de rôles
  sémantiques** (`--bg`, `--surface`, `--text`, `--danger`…). Les composants ne
  référencent que les rôles.
- `_reset.scss`, `_base.scss`, `_components.scss`, `main.scss`.

Direction artistique : bois vieilli, or comme **signal rare** (actionnable/gagné),
cachet de cire pour le bouton d'action, panneaux à **coins découpés** (`clip-path`
+ bordure dorée via `::before`), diviseurs en corde. Contrastes WCAG vérifiés
(rouge et teal en fonds uniquement, jamais en texte sur fond sombre) ; focus
clavier Doublon décalé ; `prefers-reduced-motion` respecté.

### Images

Les visuels sont livrés en **WebP** et dimensionnés pour leur taille d'affichage
réelle. Après avoir déposé de nouveaux PNG/JPG dans `app/assets/images/` :

```bash
npm run assets -w @rf/web          # convertit, redimensionne, met à jour les imports
npm run assets -w @rf/web -- --dry # simulation : affiche les gains sans rien écrire
```

Le script est réexécutable sans risque (les WebP déjà présents sont ignorés) et
réécrit lui-même les `import … from '….png'` du code. La largeur maximale est
réglée par dossier dans `scripts/optimize-images.mjs` (dés 320 px, avatars
400 px, cartes 700 px, décor 2000 px).

### Lancer le front

```bash
npm run web    # → http://localhost:5173
```

Pages : `/` (accueil), `/lobby` (salle d'attente), `/game` (plateau de jeu).

Le plateau est le même quel que soit le mode : `?mode=solo` ou `?mode=multi`.
La query laisse la place à un `?room=CODE` pour la reprise de partie.

## Roadmap

- [x] Phase 1 — Moteur de jeu testé + CLI de validation des règles
- [x] Phase 2 — IA (espérance de gain, niveaux de difficulté), jouable en CLI
- [~] Phase 3 — Front : design system posé (`apps/web`), écrans de jeu à venir
- [ ] Phase 4 — Serveur autoritaire WebSocket + lobby multijoueur
- [ ] Phase 5 — Déploiement (front statique + serveur Railway/Fly.io)
