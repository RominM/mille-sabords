# Reckless Fathoms — mémo de travail

Jeu de dés (mécanique Mille Sabords), monorepo npm workspaces, Node 22, Windows.

## Commandes

```bash
npm test                      # moteur (vitest)
npm run web                   # dev → http://localhost:5173
npm run typecheck -w @rf/web
npm run assets -w @rf/web     # convertit images/sons ET met à jour les imports
```

**Toujours** passer un nouvel asset par `npm run assets` : le script convertit en
WebP/MP3 optimisé, supprime la source et réécrit les imports. Ne jamais importer
un `.png` directement.

## Architecture

```
packages/engine   Moteur pur TypeScript. AUTORITÉ des règles. Aucune dépendance
                  framework. Le front et le futur serveur l'exécutent à l'identique.
apps/web          Nuxt 4 en SPA (ssr: false) + SCSS.
apps/cli          CLI hotseat pour valider les règles au clavier.
```

Toute règle de jeu vit dans `packages/engine`, **jamais** dans l'UI.

## Catalogue des composants (`apps/web/app/components`)

| Composant | Rôle |
|---|---|
| `Modal` | Socle de modale sur parchemin. Titre fixe, `close` par croix/Échap/fond. |
| `RulesModal` / `RulesPanel` | Règles, en surcouche (plateau) ou à plat (accueil). |
| `SoloSetupModal` | Nom, portrait, difficulté → compose la table et part sur `/game`. |
| `SoundSettings` / `SoundSettingGroup` | Réglages son ; le groupe est agnostique (2 `v-model`). |
| `HomeMenu` | Navigation de l'accueil. Change de vue au SURVOL. |
| `GamePitch` | Accroche d'un mode : titre, texte, CTA. Émet `embark`. |
| `PlateButton` | CTA principal (plaque de bois). Joue `axe-impact`. |
| `WaxSeal`, `DieView`, `PirateCard`, `PlayerSlot`, `SkullEyes`, `AppLoader` | Plateau. |

Composables : `useGame`, `useTableSetup`, `useRules`, `useSoundSettings`,
`useBackgroundMusic` (musique de fond), `useSfx` (bruitages ponctuels).

Directives : `v-click-sound` (clic), `v-hover-sound` (survol). Jamais les deux
sur le même élément. Enregistrées dans `app/plugins/ui-sound.ts`.

## Constantes mesurées — NE PAS re-mesurer

Géométrie des assets, en pixels du fichier source :

| Asset | Taille | Zone utile |
|---|---|---|
| `ui/panel-menu.webp` | 1708×985 | cartouche du titre x 580..1107, y 129..337 ; bois x 78..1637, y 250..915 (l'ornement descend à y 377) |
| `ui/parchemin.webp` | 1536×1024 | rouleau opaque x 367..1181, y 32..984 (815×953) ; zone plate y 168..865 |
| `ui/main-cta.webp` | 1536×1024 | plaque opaque x 179..1359, y 331..648 (1181×318, ratio 3.714) |
| `main-title.webp` | 1200×800 | encre x 112..1085, y 117..635 (974×519) — grande marge transparente |
| `ui/layout-game.webp` | — | plateau, ratio 1672/941 |

`PlayerSlot` : bande utile 1024×411 dans un PNG 1024×1536 → `aspect-ratio: 1024/411`,
`top: -130.17%`, `height: 373.72%`.
`SkullEyes` : yeux à 48,6 % et 51,2 % en x, 7,1 % en y du plateau.
`AppLoader` : jauge à 23,2 % / 81,4 %, 53 % × 8,4 %.

## Pièges déjà rencontrés

1. **Réactivité** : `Game` mute son état en place. `useGame` publie un instantané
   `structuredClone` à chaque action. Ne pas « simplifier ».
2. **Échelle** : utiliser `cqw`/`cqh`, jamais `dvw`/`dvh` (qui ignorent la barre
   de défilement et débordent).
3. **`container-type: size`** sur `.plateau` en fait le bloc conteneur des
   éléments `position: fixed` → toute modale doit être `Teleport`ée vers `body`.
4. **Reset** : `img { max-width: 100% }` est global. Une image volontairement
   plus large que sa boîte doit déclarer `max-width: none`.
5. **`<fieldset>`** a un `min-inline-size: min-content` imposé par le navigateur :
   poser `min-width: 0` pour qu'il puisse rétrécir.
6. **Autoplay** : le son est bloqué avant interaction. `useBackgroundMusic`
   réessaie au premier geste et doit remonter le volume.
7. **Barres de défilement** : `scrollbar-width`/`scrollbar-color` ne sont pas
   héritées en pratique → règle sur `*`. Quand `scrollbar-color` est présente,
   Chromium ignore `::-webkit-scrollbar-*`.

## Conventions

- Vue : ordre `<template>` → `<script setup>` → `<style scoped lang="scss">`.
- SCSS en BEM imbriqué (`&__element`, `&--modifier`). Pas de sélecteurs à plat.
- Fonctions nommées dans les composants ; flèches autorisées dans les composables.
- Commentaires **en français**, qui expliquent le *pourquoi*.
- Un composant isolé par bloc fonctionnel ; la page reste un orchestrateur.
- Commit + push après chaque étape terminée.

## Vérification — éviter de brûler des allers-retours

- Le pane navigateur ne s'affiche pas dans cet environnement : **les captures
  d'écran échouent systématiquement**. Ne pas essayer, mesurer par
  `javascript_tool`.
- Grouper les mesures en UN seul appel, et attendre le rendu (`requestAnimationFrame`
  ×2 puis ~250 ms) — sinon on lit le DOM avant que Vue n'ait purgé sa file.
- Le buffer console d'un onglet est cumulatif, même après rechargement : pour
  juger des erreurs, ouvrir un onglet neuf.
- Grouper `npm test`, `typecheck` et `build` dans un seul appel shell.
