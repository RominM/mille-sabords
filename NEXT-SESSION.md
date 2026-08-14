# Reckless Fathoms — brief de reprise

> À jour au 2026-08-14. Les conventions, les constantes mesurées des assets et
> les pièges techniques vivent dans **`CLAUDE.md`**, lu automatiquement au
> démarrage — ce document-ci ne parle que de l'ÉTAT et du RESTE À FAIRE.

---

## 1. Où en est le projet

Jeu de dés type « pousse ta chance », jouable en solo contre l'IA **et en
multijoueur en ligne**. Monorepo npm workspaces, Node 22, Windows.

```
packages/engine    Moteur pur TypeScript. AUTORITÉ des règles. 89 tests.
packages/protocol  Types des messages ET cadences partagées (RECAP_MS, BOT_STEP_MS).
apps/server        WebSocket autoritaire : salles, identité, arbitrage. 20 tests.
apps/web           Nuxt 4 SPA (ssr: false) + SCSS. Port 5173. 39 tests.
apps/cli           CLI hotseat pour éprouver les règles au clavier.
```

```bash
npm test                      # 148 tests (moteur + serveur + front)
npm run server                # serveur de jeu → ws://localhost:8787
npm run web                   # front → http://localhost:5173
npm run typecheck -w @rf/web
npm run assets -w @rf/web     # convertit images/sons ET met à jour les imports
```

`apps/web/.env` (non versionné) pointe le front vers le serveur local.
`RF_DATA_DIR` dit au serveur où écrire les parties en cours (défaut : `./data`).

**`/lab`** est la page de réglage (perspective, jet des dés, zones, ambiance de
l'Île). Elle rend les blocs de code à recopier. Exclue du build de production
par `ignore` dans `nuxt.config.ts` — dont le chemin est relatif à la RACINE et
non à `srcDir`, sans quoi il ne filtre rien, silencieusement.

## 2. Ce qui marche

**Règles** — alignées sur la règle officielle Gigamic, vérifiée sur le PDF
éditeur. Coffre plein quand les 8 dés marquent, pénalité du Bateau Pirate raté,
pas d'île avec un Bateau, obligation de garder un dé (**tranché : on la garde**),
Magie pirate à 9 symboles, mort subite si le seuil est reperdu, scores négatifs
autorisés. Tirage équitable, mesuré à moins de 1 % près.

Les points négatifs viennent d'EXACTEMENT deux endroits, et un seul touche ton
propre score : le **Bateau Pirate raté** (la valeur de la carte t'est retirée) et
l'**Île de la Tête-de-Mort** (tes adversaires paient, jamais toi).

**Gardienne** — à 3 têtes de mort, elle est le seul moyen de poursuivre : elle
part donc D'OFFICE avec la relance, sans que le joueur ait à désigner la tête.
Un seul autre dé suffit alors à relancer, la tête faisant le second ; une fois
dépensée, la tête suivante clôt le tour. Avant cette correction (2026-08-14), on
pouvait relancer SANS elle et poursuivre un tour déjà perdu, tête après tête.

**Fin de partie à égalité** — victoire partagée (`winnerIds`), jamais départagée
par l'ordre de jeu.

**Solo / multi** — accueil, mise en place, plateau. Le SERVEUR fait autorité en
multi : il ouvre les tours, expire les décisions et joue les IA. Table de 2 à 8.

**Identité** — jeton opaque en `sessionStorage`, donc par ONGLET. Survit au F5,
pas à la fermeture. Ce choix permet de tester une partie à plusieurs sur un poste.

**Portraits en multi** — message `roster` diffusé à côté de l'état de jeu, et
seulement quand la composition change.

**Persistance des salles** — parties LANCÉES sérialisées dans
`$RF_DATA_DIR/rooms.json` toutes les 5 s et à l'arrêt propre, écriture atomique,
reprise au démarrage (sauf > 12 h). Vérifié serveur tué au `SIGKILL`. Corollaire :
une salle vidée n'est ramassée qu'après **10 minutes**.

**Animation des dés** — les dés ROULENT : ils traversent la table et tournent
PARCE QU'ILS AVANCENT (un quart de tour par côté parcouru). L'atterrissage exact
tient à un choix de l'orientation de DÉPART, calculée à rebours — rien n'est
truqué à l'arrivée. Réglages dans `app/utils/diceThrow.ts`, perspective par dé
dans `app/utils/boardTilt.ts`, zones fixes dans `app/utils/boardZones.ts`.

**Suspense** — le score en jeu, le compteur de têtes et le résultat du tour
attendent que la volée soit retombée. L'IA attend que les dés soient POSÉS avant
son geste suivant (~2,8 s entre deux jets ; `BOT_STEP_MS` côté serveur).

**Glisser-déposer** — un dé se saisit et se dépose dans le cadre de son choix, ou
revient au plateau. Le clic reste la voie courte. Curseur « corde » à deux états.

**Infobulles** — directive `v-tooltip`, posée sur n'importe quel élément.

**Sécurité des dépendances** — `npm audit` : **0 vulnérabilité**.

## 3. Refacto — en cours, 5 tranches faites

Conventions écrites dans `CLAUDE.md` : rangement par domaine, structure d'un
composant, ordre du `<script setup>` (**watch toujours en dernier**), props en
déclaration runtime, BEM imbriqué, **aucun commentaire dans le CSS**.

Fait :
1. Rangement par domaine (`components/board|overlay|panel|home|sound|common`,
   `composables/game|net|ui`). Rendu indolore par `pathPrefix: false` et
   `imports.dirs: ['composables/**']`.
2. `game.vue` 895 → 399 lignes : six blocs extraits, trois composables.
3. Nettoyage des commentaires (307 lignes de CSS, 33 de template).
4. Assets rangés et convertis, orphelins supprimés.
5. `useDiceSlots` sorti de `useGame` (621 → 583 lignes) — le rangement des dés
   dans les huit cadres ne dépend ni du transport, ni du minuteur, ni de la
   partie. **Sorti AVEC ses tests** (11) : c'est la façon de continuer le
   découpage sans se fier à l'œil.

**Reste à découper :**

| Fichier | Lignes | Ce qu'il reste à en sortir |
|---|---|---|
| `pages/lab.vue` | 945 | Page de réglage, hors production — valeur la plus faible |
| `composables/game/useGame.ts` | 583 | Minuteur de décision, détection des jets, tempo de l'IA |
| `components/board/DieCube.vue` | 516 | Surtout du CSS 3D : peu à gagner |
| `pages/lobby.vue` | 374 | La liste d'équipage, le code, les réglages d'hôte |

Puis normaliser les ~30 composants restants : props runtime, ordre du script, BEM
— et remplacer la dizaine de références à des MATIÈRES (`--color-doubloon`,
`--color-parchment`…) par des rôles, comme les conventions l'exigent. Elles sont
toutes sur fond sombre, donc sans conséquence visible aujourd'hui.

**Ordre conseillé** : extraire le minuteur de `useGame` (il se teste avec des
horloges simulées), puis `lobby.vue`. Chaque tranche sort avec ses tests.

## 4. Reste à faire — demandes de Romin

### Parcours d'entrée — refonte ✅ fait le 2026-08-13

Le formulaire est DANS le cadre dynamique de l'accueil : plus de modale avant
la partie solo ni avant le lobby. `EmbarkForm` tient le cadre (seul le corps
défile, la plaque reste en bas), `PirateIdentity` porte le nom et le portrait
des deux modes, `SoloForm` compose la table et part sur `/game`, `CrewForm`
crée ou rejoint puis passe la main à la page. Le titre est dans le cartouche du
haut, la plaque passe en grisaille tant que le formulaire est incomplet, et
elle se mesure sur la planche (`--plate-w`) au lieu d'une largeur fixe.

En équipage, **un seul code, deux rôles** : on le TIRE (« Générer un code » —
on ouvre la salle, on l'annonce à ses amis) ou on le SAISIT (on rejoint la
leur). L'action se renomme d'elle-même, « Embarquer » ou « Rejoindre ». Le
code tiré est un VRAI code : le message `join` porte désormais `create`, et le
serveur ouvre la salle à ce code-là — ou refuse s'il est déjà pris. L'alphabet
sans I, O, 0 ni 1 vit dans `@rf/protocol`, d'où les deux bouts le tirent.

Le logo `main-title` occupe la bande au-dessus des sections, son encre calée
sur la zone utile du fichier. La case « Activer le tutoriel » commande
réellement la visite guidée (cf. plus bas) et se pré-remplit avec le dernier
choix.

On ne quitte l'accueil qu'une fois la place OBTENUE : `useRoom.join` attend le
verdict du serveur (6 s au plus), et un refus — serveur éteint, code inconnu,
table complète — se lit dans le formulaire au lieu d'envoyer le joueur dans une
salle vide.

`SoloSetupModal`, `RoomEntry`, `GamePitch` et `SeatSetupModal` ont disparu.

### Écrans et confort — fait le 2026-08-13, sauf un point

- [x] **Plein écran depuis les paramètres.** `useFullscreen` suit
      `fullscreenchange` ; `AppSettings` (affichage + son) sert l'accueil ET la
      partie. Réserve : le plein écran de la touche F11 n'est pas celui de
      l'API, la case reste alors décochée.
- [x] **Écran de chargement à l'embarquement**, posé sur `/game` : il couvre
      les deux provenances (accueil et lobby) et enchaîne sans coupure sur
      l'attente réelle du serveur en multi. `AppLoader` accepte un `progress`
      nul — la jauge balaie au lieu d'inventer un pourcentage.
- [x] **Le bouton manquant côté lobby** — ce n'était pas un manque : « Lever
      l'ancre » se rendait en **0×0**, donc invisible même l'équipage paré. La
      largeur par défaut de `PlateButton` valait `min(20rem, 100%)`, et dans un
      parent qui se dimensionne sur son contenu (`justify-self: end`) ce `100 %`
      ne peut pas se résoudre : `min()` le prend pour zéro. Défaut désormais en
      LONGUEUR, plafonné par `max-width`.
- [x] **Garde-fou mobile en CSS** : sous **740 px**, `SmallScreenGuard` barre
      tout. Requête de média seule, aucune mesure en JavaScript.

### Tutoriel — fait le 2026-08-14

`TutorialTour` accompagne le joueur sur son PREMIER tour, et seulement s'il a
coché « Activer le tutoriel » à la mise en place solo (`TableSetup.tutorial`).
Huit escales : accueil au centre de l'écran, sablier, carte du tour, barème,
lancer, dés et cadres, arrêt, historique. Chacune éclaire sa zone par un trou
dans le voile, et le parchemin se pose du côté où il reste de la place — à
côté quand la zone est trop haute.

Le minuteur est SUSPENDU tout du long (`useGame().paused` gèle le décompte au
lieu de couper le minuteur : une reprise oubliée rendrait le tour éternel).
L'escale « lancer » attend le geste — le bouton « Suivant » reste grisé
jusqu'à ce que la volée soit retombée, puis la visite enchaîne d'elle-même —
sans jamais bloquer « Passer le tutoriel » ni Échap.

Les zones sont désignées par leur CLASSE CSS ; les tiroirs portent désormais
`side--<id>` pour être visables de l'extérieur. Un renommage de classe ne se
verrait à aucun typecheck : la visite se replie sur un voile sans trou plutôt
que de casser l'écran.

### Ce qui a suivi, le 2026-08-14

- **Barème** refait en dés et en nombres (pièce et diamant à +100 y manquaient).
  Il lui faut encore **une face de dé VIERGE** (`die-face_blank.webp`, même
  tuile sans symbole) : elle dit « n'importe quel symbole ». Dessinée en CSS en
  attendant.
- **Jauge de fin de partie** sur chaque carte joueur : où il en est des 6000, en
  une barre dont la couleur est l'information. Le dégradé est peint sur toute la
  piste puis découpé au score — la couleur ne dépend donc que de la place sur la
  route.
- **Gardienne** : à 3 têtes, elle part D'OFFICE avec la relance (cf. §2).
- **Minuteur** : seul un LANCER ouvre une nouvelle décision. Réserver un dé sur
  l'Île au Trésor le remettait à zéro — donc un temps illimité à qui cliquait
  ses dés un par un.
- **Contexte clair** : `.on-parchment` redéclare les rôles de couleur pour le
  rouleau. Les réglages en partie s'y effaçaient (parchemin sur parchemin).
- **Sons au survol** sur les cachets, les outils du plateau, les languettes des
  tiroirs et les boutons de la visite.

### Bloquant pour jouer vraiment

- [ ] **Hébergement du SERVEUR.** En attente du Raspberry Pi du collègue de
      Romin (64 bits, 2 Go, Docker non installé — largement suffisant). Le
      Dockerfile est écrit mais **jamais construit**. Prévoir un volume monté
      sur `RF_DATA_DIR`, et Cloudflare Tunnel plutôt qu'une ouverture de port.
- [ ] **Le SOLO peut partir en ligne sans attendre le Pi.** Le front est une
      SPA et le solo tourne entièrement dans le navigateur, moteur compris : il
      se construit en fichiers statiques (Cloudflare Pages, Netlify…). Le multi
      s'annoncera de lui-même comme indisponible, sans écran cassé, depuis que
      l'accueil garde le joueur quand le serveur ne répond pas.
      **Réserve** : sur un hébergeur statique, `NUXT_PUBLIC_WS_URL` est figée à
      la CONSTRUCTION — il n'y a pas de serveur pour l'injecter à l'exécution.
      Le jour du Pi, il faudra reconstruire (une minute). La phrase « sans
      reconstruire » ne vaut que derrière un serveur Node.
      **Jamais construit non plus** : `npm run generate -w @rf/web` reste à
      lancer une fois, serveur de dev arrêté.

### Décor et finitions

- [ ] Recaler ce qui reste sur le nouveau plateau (Romin s'en occupe).
- [ ] Décor manquant : image du lobby, écran de victoire (Romin s'en occupe).
- [ ] **21,5 Mo de sons orphelins** à supprimer, vérifiés sans aucune référence
      dans tout le dépôt : `in-game-music.mp3` (16,7 Mo !),
      `dobcommunications-busy-restaurant…mp3` (4,5 Mo),
      `shake-and-roll-dice-soundbible.mp3`. Ils ne partent PAS dans le build —
      Vite n'émet que ce qui est importé — mais ils alourdissent le dépôt.
- [ ] Qualité : ESLint/Prettier, tests e2e Playwright, CI.
- [ ] À voir à l'œil, jamais vérifié par moi (le pane ne rend ni captures ni
      transitions) : le cachet « S'arrêter » déplacé, le barème ouvert, la jauge
      des cartes joueur, et l'enchaînement de la Gardienne à 3 têtes.

### Version mobile (téléphone en PAYSAGE) — évaluée le 2026-08-14

Mesuré à 844×390. **La partie coûteuse est déjà faite** : aucune mise en page
n'est posée en pixels. Le plateau tient son ratio (693×390), les dés font 32 px,
les cadres 38, les cachets 65 à 69 — tout cela se touche. Modales et tiroirs
suivent la fenêtre.

Ce qui casse est la TYPOGRAPHIE, dans les deux sens :

| | Mesuré | Pourquoi |
|---|---|---|
| Noms et scores des joueurs | **5,8 et 7,5 px** | en `cqw` d'une fiche de 83 px |
| Contenu des tiroirs | 15,2 px dans une planche de 148 px | en `rem`, donc figé |
| Menu de l'accueil | 38,4 px | en `rem` — la colonne fait 405 px de haut pour 390 de fenêtre, donc l'accueil est ROGNÉ |
| Accroche du panneau | 6,6 px | en `cqw` d'un panneau réduit |

Trois chantiers, dans cet ordre : les fiches joueur, les tiroirs, et la colonne
de navigation de l'accueil (qui ne peut pas rester une liste verticale sous
450 px de haut). Le seuil de `SmallScreenGuard` (740 px) laisse déjà passer la
plupart des téléphones en paysage, mais bloque un iPhone SE (667 px).

**Faisabilité en une session courte : ~70 %.** Le tiers restant tient à ces
trois points, qui demandent une décision de mise en page et pas un réglage.

## 5. Dettes et pièges connus

- **Le front a un premier filet** (39 tests, `apps/web/test/`), mais il ne monte
  PAS l'application : il couvre ce qui s'éprouve seul — décompte mis en mots,
  géométrie du plateau, tiroirs, rangement des dés, mémoire des mises en place.
  Le rendu se juge toujours à l'œil. Deux illusions y sont recréées à la main :
  les imports automatiques de Vue (`test/setup.ts`) et `import.meta.client` (un
  greffon dans `vitest.config.ts` — un `define` ne suffit pas).
- **Ce qui déborde d'un conteneur `overflow: auto` est ROGNÉ sans prévenir** :
  anneau de focus, liseré, soulèvement au survol. Deux fois le cas dans les
  formulaires de l'accueil. Le remède est une gouttière reprise en marge
  négative — la position ne bouge pas, le débordement a sa place.
- **Un renommage de classe CSS ne se voit à aucun typecheck.** Un sélecteur en
  chaîne de caractères (`document.querySelector`) casse silencieusement. Vérifié
  une fois en rejouant le geste ; à surveiller à chaque renommage.
- **Une seule instance de serveur.** Ne pas autoscaler : deux instances = deux
  jeux de salles.
- **`vue-tsc`** affiche `Load plugin failed: vue-router/volar/sfc-route-blocks`.
  Préexistant, sans effet (exit 0).
- **Le pane navigateur est instable** : captures impossibles, horloge
  d'animation parfois gelée (`document.timeline.currentTime` reste à 0). Mesurer
  par `javascript_tool`, et piloter une animation à la main
  (`animation.currentTime = …`) quand le temps ne s'écoule pas.
- **Le minuteur de 30 s tourne pendant les allers-retours d'outil.** Regrouper
  « agir + vérifier » dans UN seul appel, sinon le tour expire entre deux mesures.
- **Ne pas supprimer `.nuxt` pendant que le serveur de dev tourne** : il meurt.
- **Éditer des fichiers pendant que Romin joue** casse le rechargement à chaud :
  le module se recharge, un minuteur d'une instance morte continue de battre, et
  Vue lève `Cannot set properties of null (setting '__vnode')`. Ce n'est pas un
  bug du jeu — une erreur de cette forme mérite d'abord un rechargement franc.
- **`pitchBottom` (17,5°) est INFÉRIEUR à `pitchTop` (18°)** dans
  `BOARD_PERSPECTIVE`, alors que le commentaire annonce l'inverse (« le bord
  proche, vu davantage de dessus »). Un demi-degré, invisible — mais l'un des
  deux ment. Trouvé par le premier passage des tests du front.

## 6. Questions jamais tranchées

1. Sur l'Île de la Tête-de-Mort avec un Bateau Pirate et le quota de sabres
   atteint : la prime est-elle due ? (Le cas 3 têtes, lui, est tranché : oui.)
2. Le joueur actif de l'île doit-il perdre des points lui aussi ? Le moteur
   l'épargne, conformément à la règle éditeur.
3. **4 têtes au premier lancer AVEC un Bateau Pirate.** Le moteur n'envoie pas
   sur l'île et clôt le tour — en citant « celui qui découvre un bateau pirate
   ne peut pas aller sur l'île », point noté comme VÉRIFIÉ sur le PDF éditeur.
   Romin l'a signalé comme surprenant le 2026-08-14. À reconfirmer sur la règle
   papier : si elle dit autre chose, c'est une ligne à changer dans
   `resolveFirstRoll`. Nuance déjà en place : même tour perdu, la prime du
   bateau reste acquise si le quota de sabres est atteint.

**Tranché depuis :**

- **Égalité en fin de partie** (2026-08-14) — victoire PARTAGÉE. `winnerIds` est
  un tableau ; l'écran de fin nomme tous les ex æquo et les marque en tête du
  classement. Plus de départage par l'ordre de jeu.
