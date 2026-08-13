# Reckless Fathoms — brief de reprise

> À jour au 2026-08-09. Les conventions, les constantes mesurées des assets et
> les pièges techniques vivent dans **`CLAUDE.md`**, lu automatiquement au
> démarrage — ce document-ci ne parle que de l'ÉTAT et du RESTE À FAIRE.

---

## 1. Où en est le projet

Jeu de dés type « pousse ta chance », jouable en solo contre l'IA **et en
multijoueur en ligne**. Monorepo npm workspaces, Node 22, Windows.

```
packages/engine    Moteur pur TypeScript. AUTORITÉ des règles. 84 tests.
packages/protocol  Types des messages ET cadences partagées (RECAP_MS, BOT_STEP_MS).
apps/server        WebSocket autoritaire : salles, identité, arbitrage. 20 tests.
apps/web           Nuxt 4 SPA (ssr: false) + SCSS. Port 5173.
apps/cli           CLI hotseat pour éprouver les règles au clavier.
```

```bash
npm test                      # 104 tests (moteur + serveur)
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

## 3. Refacto — en cours, 4 tranches faites

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

**Reste à découper :**

| Fichier | Lignes |
|---|---|
| `pages/lab.vue` | ~950 |
| `composables/game/useGame.ts` | ~590 |
| `components/board/DieCube.vue` | ~530 |
| `pages/lobby.vue` | ~380 |

Puis normaliser les ~30 composants restants : props runtime, ordre du script, BEM.

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
sur la zone utile du fichier. La case « Activer le tutoriel » existe dans le
formulaire solo — **rien derrière**, le choix n'est ni transmis ni mémorisé.

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
- [ ] **Le bouton manquant côté lobby** — À PRÉCISER. Vérifié en salle : l'hôte
      a bien sa plaque « Lever l'ancre » (grisée tant que l'équipage n'est pas
      prêt), l'invité n'a que « Je suis paré » et « ← Retour ». Reste à savoir
      lequel manque.
- [x] **Garde-fou mobile en CSS** : sous **740 px**, `SmallScreenGuard` barre
      tout. Requête de média seule, aucune mesure en JavaScript.

### Bloquant pour jouer vraiment

- [ ] **Hébergement.** En attente du Raspberry Pi du collègue de Romin (64 bits,
      2 Go, Docker non installé — largement suffisant). Le Dockerfile est écrit
      mais **jamais construit**. Prévoir un volume monté sur `RF_DATA_DIR`, et
      Cloudflare Tunnel plutôt qu'une ouverture de port.

### Décor et finitions

- [ ] Recaler ce qui reste sur le nouveau plateau (Romin s'en occupe).
- [ ] Décor manquant : image du lobby, écran de victoire (Romin s'en occupe).
- [ ] Supprimer le son orphelin `dobcommunications-busy-restaurant…mp3` (4,5 Mo).
- [ ] Qualité : ESLint/Prettier, tests e2e Playwright, CI.

## 5. Dettes et pièges connus

- **Le front n'a AUCUN test.** Chaque refacto ne se vérifie qu'à l'œil et au
  typecheck — d'où l'avancement par tranches courtes, chacune commitée.
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

## 6. Questions jamais tranchées

1. Sur l'Île de la Tête-de-Mort avec un Bateau Pirate et le quota de sabres
   atteint : la prime est-elle due ? (Le cas 3 têtes, lui, est tranché : oui.)
2. Le joueur actif de l'île doit-il perdre des points lui aussi ? Le moteur
   l'épargne, conformément à la règle éditeur.
3. **Égalité en fin de dernière manche.** `Game.finish` départage par l'ordre de
   jeu — le premier assis gagne. Vu en vrai (6300 / 6300). Proposition faite et
   NON tranchée : une manche de départage entre ex æquo, puis victoire partagée
   si l'égalité tient. La mécanique de mort subite existe déjà.
