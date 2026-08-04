# Reckless Fathoms — brief de reprise

> Document de passation. Les deux tâches prioritaires de la session précédente
> (renommage du jeu, bruitage de clic) sont **faites** ; ce qui reste est en §5 et §6.

---

## 1. Le projet

Jeu de dés en ligne (mécanique de type « pousse ta chance » avec dés de pirates),
jouable en solo contre une IA, avec un multijoueur temps réel prévu.

### Stack

Monorepo npm workspaces, Node 22, Windows.

```
packages/engine   Moteur de jeu pur TypeScript — AUCUNE dépendance framework.
                  54 tests vitest, tous verts. C'est l'autorité des règles :
                  le front ET le futur serveur l'exécutent à l'identique.
apps/cli          CLI hotseat (tsx) pour valider les règles au clavier.
apps/web          Front Nuxt 4 en SPA (ssr: false) + SCSS. Port dev 5173.
```

Commandes clés (depuis la racine du dépôt) :

```bash
npm test                     # 54 tests du moteur
npm run play                 # CLI de validation des règles
npm run web                  # front → http://localhost:5173
npm run build -w @rf/web     # build de production (vérifie la résolution des imports)
npm run assets -w @rf/web    # optimise images (WebP) + audio (MP3) et met à jour les imports
```

⚠️ `npm run typecheck -w @rf/web` est **cassé pour une raison d'outillage**, pas de
code : `vue-tsc` n'arrive pas à charger le plugin volar `vue-router/volar/sfc-route-blocks`
et s'arrête avant même de lire le projet (« Failed to create plugin »). En attendant
une mise à jour de `vue-tsc`/`@vue/language-core`, c'est `npm run build -w @rf/web`
qui sert de filet.

---

## 2. Ce qui est fait

### Moteur (`packages/engine`) — 54 tests verts

Règles implémentées, **validées avec toi** (plusieurs ont été corrigées en cours
de route, les tests font foi) :

- 8 dés, barème 3→8 identiques (100 → 4000 pts) ; +100 par pièce et diamant.
- **Coffre plein (+500)** : les 8 dés doivent afficher la **même valeur**
  (8 pièces, 8 diamants…, ou 8 animaux avec la carte Animaux qui fusionne singes
  et perroquets). Un mélange ne donne pas le bonus, même si tous les dés marquent.
  Le jugement porte sur les 8 dés seuls → une carte Tête de Mort ne bloque pas.
- 3ᵉ tête de mort = tour perdu ; têtes verrouillées, non relançables.
- Relance : minimum 2 dés ; **relancer tous les dés relançables est permis**.
- **Bateau Pirate** : le défi est obligatoire pour marquer. Réussi → dés + prime.
  Raté → **0 point** (même les dés), mais aucune pénalité. Le quota de sabres
  reste acquis même si le tour se perd sur la 3ᵉ tête.
- **Île de la Tête-de-Mort** (4+ têtes au 1er lancer) : relances forcées tant que
  des têtes sortent ; malus de 100/tête aux adversaires. Se termine si aucune
  nouvelle tête **ou** s'il reste moins de 2 dés relançables (sinon le joueur
  était bloqué — bug corrigé).
- **Aucun score ne descend sous zéro** : un malus fait au pire retomber à 0.
- Victoire : franchir 6000 déclenche le **dernier tour**, puis le meilleur score
  gagne (pas forcément le déclencheur).
- IA sans ML : espérance de gain exacte à un coup (énumération multinomiale +
  réutilisation de `applyAction`/`scoreTurn`), 3 niveaux via une marge de sécurité.

### Front (`apps/web`)

- Pages : `/` accueil, `/lobby` salle d'attente, `/solo` plateau de jeu.
- **Lobby fonctionnel en local** : compose la table (2 à 5 joueurs, noms, IA +
  difficulté) et la transmet réellement à la partie via `useTableSetup`.
  ⚠️ **Aucun réseau** : le code de partie est décoratif, personne ne peut
  rejoindre. Le vrai multijoueur reste à faire.
- Plateau illustré : décor, dés images, cartes images, profils joueurs (cadre +
  avatar + nom + score + timer).
- Dés joués au centre ; **cliquer un dé le GARDE** (il descend dans les slots du
  bas) ; les têtes de mort y vont d'office. Le bouton relance les dés restés au
  centre.
- Deux cachets de cire toujours affichés (Lancer / S'arrêter), grisés quand
  l'action est impossible.
- Écran de chargement : précharge **toutes** les images, jauge dans le cadre
  ouvragé, titre du jeu.
- Yeux du crâne qui s'embrasent lors d'une défaite (`SkullEyes`).
- Musique continue par écran (lobby ↔ partie) avec fondu (`useAmbience`).
- **Bruitage de clic** : directive `v-click-sound`, enregistrée par
  `app/plugins/click-sound.ts` (voir §4.7), posée sur les cachets de cire, les
  boutons `.btn`, les liens du menu, la croix de la modale et les dés.
- Assets optimisés : images 64 Mo → 4,3 Mo, musique 50 Mo → 4,5 Mo.

---

## 3. Conventions à respecter

- **Composants Vue** : ordre `<template>` → `<script setup>` → `<style scoped lang="scss">`.
  (`pages/solo.vue` ne la respecte pas encore : son `<script setup>` est en tête.)
- **SCSS en BEM imbriqué** : `&__element`, `&--modifier`. Pas de sélecteurs à plat.
- **Fonctions nommées** `function faire() {}` dans les composants ; les
  **composables** peuvent utiliser les fonctions fléchées.
- Commentaires **en français**, qui expliquent le *pourquoi*.
- **Commit + push après CHAQUE étape terminée**, avant d'en commencer une autre.
- Toute règle de jeu vit dans `packages/engine`, **jamais** dans l'UI.
- **Aucune référence de marque** : ni le nom, ni la charte, ni l'éditeur du jeu
  du commerce dont les règles sont reprises. Les règles ne sont pas protégeables,
  le reste l'est.

---

## 4. Pièges techniques déjà rencontrés (ne pas les refaire)

1. **Réactivité du moteur** : `Game` mute son état *en place*. Vue met en cache
   par identité → le rendu ne se mettait jamais à jour. `useGame` publie donc un
   **instantané cloné** (`structuredClone`) à chaque action. Ne pas « simplifier ».
2. **Mise à l'échelle** : plateau et loader verrouillent l'`aspect-ratio` de leur
   image et se centrent (letterbox). Utiliser **`cqw`/`cqh`** (unités de
   conteneur), **pas `dvw`/`dvh`** : ces dernières ignorent la barre de
   défilement et font déborder le cadre.
3. **Constantes mesurées** (ne pas modifier au jugé) :
   - `PlayerSlot` : la bande utile du cadre est 1024 × 411 px dans un PNG de
     1024 × 1536 → `aspect-ratio: 1024/411`, `top: -130.17%`, `height: 373.72%`.
   - `SkullEyes` : yeux à 48,6 % et 51,2 % en x, 7,1 % en y du plateau.
   - `AppLoader` : cadre de la jauge à 23,2 % / 81,4 %, 53 % × 8,4 %.
4. **Autoplay audio** : les navigateurs bloquent le son avant toute interaction.
   `useAmbience` réessaie au premier geste — et **doit remonter le volume** à ce
   moment-là (bug corrigé : la piste tournait à volume 0, donc muette).
5. **Nouveaux assets** : toujours passer par `npm run assets -w @rf/web`, qui
   convertit et **met à jour les imports** automatiquement.
6. **Push volumineux** : `git config http.postBuffer 524288000` est déjà posé
   (des pushes échouaient par déconnexion).
7. **Nuxt monte lui-même l'application Vue.** Un `createApp()` maison n'est jamais
   exécuté : les directives et plugins globaux passent par `app/plugins/`. C'est
   ce qui rendait `v-click-sound` inerte. Corollaire : un `Audio` unique partagé
   entre deux clics se coupe lui-même — la directive joue un `cloneNode()`.
8. **Chemins d'assets dans `pages/`** : `./assets/...` y résout vers
   `app/pages/assets/`, qui n'existe pas. Toujours l'alias `~/assets/...`.

---

## 5. Questions en attente (règles de l'Île de la Tête-de-Mort)

Deux points jamais tranchés — à confirmer avant de coder :

1. Sur l'île, le joueur actif marque **0**. Si sa carte était un **Bateau Pirate**
   et qu'il avait atteint le quota de sabres, **touche-t-il quand même la prime** ?
   (Sur une défaite à 3 têtes, la réponse était « oui ».)
2. Il a été dit « chaque crâne retire 100 points à **tous** les joueurs ». Le
   moteur épargne actuellement le **joueur actif**. **Faut-il le pénaliser aussi ?**

---

## 6. Reste à faire

**Court terme**
- [ ] Trancher les règles de l'île (§5).
- [ ] **Gardienne** : la règle existe dans le moteur (relancer une tête de mort,
      une fois par tour) mais elle est **injouable au clic** dans l'UI.
- [ ] Bruitages restants : lancer de dés (`dice-roll-sound.mp3`,
      `shake-and-roll-dice-soundbible.mp3` sont déjà là) ; le rire de défaite est
      en place mais posé en dur dans `solo.vue`, à harmoniser.
- [ ] Décor restant : modale des points, écran de victoire, image du lobby.
- [ ] Supprimer le son orphelin `dobcommunications-busy-restaurant…mp3` (4,5 Mo,
      visiblement un test).
- [ ] Remettre `pages/solo.vue` dans l'ordre `<template>` → `<script setup>`.

**Moyen terme**
- [ ] Feedback de jeu : tour de l'IA plus lisible et un peu plus lent, ambiance
      différente sur l'île, animation des dés (probablement **CSS**, Three.js
      étant remis en question).
- [ ] Nudge d'alignement du plateau (slots du bas, dés au centre, bouton) — en
      cours, mène-le avec des retours visuels.

**Long terme**
- [ ] **Multijoueur** : `apps/server` WebSocket autoritaire réutilisant
      `applyAction`, salles avec code, synchronisation, reconnexion, puis
      branchement du lobby (la forme de `useTableSetup` est déjà prévue pour).
- [ ] **Reprise de partie après crash / rechargement**. Aujourd'hui l'équipage
      transite par `useTableSetup`, un état en mémoire : un F5 sur `/game` le
      perd, et le joueur est renvoyé au lobby. Il faut que le serveur fasse
      autorité sur la salle et qu'un joueur puisse réintégrer sa place via
      `/game?mode=multi&room=CODE` — d'où le choix de la query plutôt que d'un
      segment de route. Suppose : identité de joueur persistée (localStorage),
      siège conservé côté serveur pendant un délai de grâce, et rediffusion de
      l'état complet à la reconnexion.
- [ ] Déploiement : front statique + serveur (Railway/Fly.io).
- [ ] Qualité : tests e2e Playwright, CI GitHub Actions, ESLint/Prettier.

**Non prioritaire (décidé)** : le responsive mobile. L'objectif est que le jeu
soit parfait en local sur desktop d'abord.
