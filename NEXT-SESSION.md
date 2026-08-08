# Reckless Fathoms — brief de reprise

> À jour au 2026-08-08. Les conventions, les constantes mesurées des assets et
> les pièges techniques vivent dans **`CLAUDE.md`**, lu automatiquement au
> démarrage — ce document-ci ne parle que de l'ÉTAT et du RESTE À FAIRE.

---

## 1. Où en est le projet

Jeu de dés type « pousse ta chance », jouable en solo contre l'IA **et en
multijoueur en ligne**. Monorepo npm workspaces, Node 22, Windows.

```
packages/engine    Moteur pur TypeScript. AUTORITÉ des règles. 80 tests.
packages/protocol  Types des messages client ↔ serveur. Partagé par les deux.
apps/server        WebSocket autoritaire : salles, identité, arbitrage. 20 tests.
apps/web           Nuxt 4 SPA (ssr: false) + SCSS. Port 5173.
apps/cli           CLI hotseat pour éprouver les règles au clavier.
```

```bash
npm test                      # 100 tests (moteur + serveur)
npm run server                # serveur de jeu → ws://localhost:8787
npm run web                   # front → http://localhost:5173
npm run typecheck -w @rf/web
npm run assets -w @rf/web     # convertit images/sons ET met à jour les imports
```

`apps/web/.env` (non versionné) pointe le front vers le serveur local.
`RF_DATA_DIR` dit au serveur où écrire les parties en cours (défaut : `./data`).

## 2. Ce qui marche

**Règles** — alignées sur la règle officielle Gigamic, vérifiée sur le PDF
éditeur. Coffre plein quand les 8 dés marquent (pas « 8 faces identiques »),
pénalité du Bateau Pirate raté, pas d'île avec un Bateau, obligation de garder un
dé, Magie pirate à 9 symboles, mort subite si le seuil est reperdu, scores
négatifs autorisés. La Gardienne est jouable au clic. Le tirage est équitable —
mesuré, 1/6 par face à moins de 1 % près.

**Solo** — accueil → mise en place (nom, portrait, difficulté) → plateau.
Minuteur de décision de 30 s réarmé à chaque lancer ; à l'expiration, arrêt
volontaire et la main passe.

**Multijoueur** — création de salle, entrée par code, sièges synchronisés en
direct, réglages IA réservés à l'hôte, bascule simultanée sur le plateau. Le
SERVEUR fait autorité : il ouvre les tours, expire les décisions et joue les IA.
Table de 2 à 8 joueurs.

**Identité** — jeton opaque en `sessionStorage`, donc par ONGLET. Survit au F5 et
à un plantage de page ; pas à la fermeture de l'onglet. Ce choix permet de tester
une partie à plusieurs sur un seul poste.

**Portraits en multi** — diffusés par un message `roster`, à côté de l'état de
jeu : le moteur ne sait rien des avatars et n'a pas à le savoir. Émis seulement
quand la composition change, et rediffusé à qui revient. Un F5 en pleine partie
retrouve donc les visages.

**Persistance des salles** — les parties LANCÉES sont sérialisées dans
`$RF_DATA_DIR/rooms.json` toutes les 5 s et à l'arrêt propre, en écriture
atomique. Au démarrage, le serveur les relit (sauf celles de plus de 12 h) et
chacun retrouve son siège avec son jeton. La décision en cours repart avec tout
son temps — le redémarrage n'est pas la faute du joueur actif. Les salles
d'attente ne sont PAS sauvées : elles se recomposent en dix secondes. Vérifié
bout en bout, serveur tué au `SIGKILL` puis relancé.

Corollaire : une salle vidée n'est plus ramassée sur-le-champ mais après
**10 minutes** — sans ce délai, toutes les salles reprises seraient détruites
avant que quiconque ait eu le temps de revenir.

## 3. Reste à faire — par ordre de dépendance

### Bloquant pour jouer vraiment

- [ ] **Hébergement.** Le serveur est prêt (Dockerfile écrit mais **jamais
      construit** — à vérifier). Il faut un process qui vit, pas du serverless,
      et un volume monté sur `RF_DATA_DIR` sinon la persistance ne sert à rien.
      Cloudflare Tunnel si Raspberry Pi ; sinon Fly/Railway/Render.

### Ensuite

- [ ] **Recaler le reste du plateau sur le nouveau décor.** Seules la rangée des
      8 emplacements et la zone centrale des dés ont été remesurées. Restent
      faux : la colonne des joueurs (l'échelle dessinée a DISPARU du nouveau
      décor, les cartes flottent sur la corde), la zone d'action (les cachets
      tombent vers la roue de gouvernail), le cadre de carte et `LiveScore`.
- [ ] Feedback : tour de l'IA plus lisible, ambiance différente sur l'île.
- [ ] Décor restant : image du lobby, écran de victoire.
- [ ] Supprimer le son orphelin `dobcommunications-busy-restaurant…mp3` (4,5 Mo).
- [ ] Qualité : ESLint/Prettier, tests e2e Playwright, CI.

## 4. Dettes et pièges connus

- **`npm audit`** signale 1 vulnérabilité critique et 1 haute. Ne PAS lancer
  `npm audit fix --force` (changements cassants) — à regarder proprement.
- **Une seule instance de serveur.** Ne pas autoscaler : deux instances = deux
  jeux de salles, et des joueurs d'une même partie sur des serveurs différents.
- **`vue-tsc`** affiche `Load plugin failed: vue-router/volar/sfc-route-blocks`.
  Préexistant, sans effet sur le résultat (exit 0).
- **Le pane navigateur ne s'affiche pas** dans cet environnement : les captures
  d'écran échouent toujours. Mesurer par `javascript_tool`, et demander une
  capture à Romin quand un jugement visuel est nécessaire.
- **Tester le multi prend du temps** : chaque aller-retour d'outil dure quelques
  secondes et le minuteur de 30 s tourne pendant ce temps. Regrouper « attendre
  mon tour + agir + vérifier » dans UN seul appel.

## 5. Animation des dés — tranché

**Le moteur a déjà décidé des faces avant que l'animation ne commence** — en
multi, c'est même le serveur qui les a tirées. L'animation est donc du THÉÂTRE :
elle doit finir sur un résultat imposé. Tout découle de là.

D'où le cube 3D en CSS, dont l'orientation finale se CALCULE : on ajoute des
tours entiers (multiples de 360°, sans effet sur l'orientation) à la rotation
qui présente la face voulue. La physique réelle a été écartée pour la raison
inverse — la simulation déciderait de la face, or elle est déjà décidée.

**Intégré au plateau** — validé par Romin le 2026-08-08, puis généralisé.
`DieCube` fait le rendu, `DieView` garde l'état et le clic. Le labo
`pages/test.vue` reste en place pour régler les valeurs à l'œil.

Le jet se DÉDUIT de l'état (`rollSeq` dans `useGame`) et non du clic : en multi,
les autres joueurs ne cliquent rien mais doivent voir la même volée. Les dés
sont égrenés de 35 ms, volent 750 ms, et une tête de mort verrouillée reste au
centre le temps du vol — sinon la seule face qu'on veut voir tomber serait
justement celle qui saute dans son cadre.

Chaque dé prend l'inclinaison de SA place sur le plateau
(`app/utils/boardTilt.ts`) : le décor est en légère plongée, un dé à gauche est
donc vu par sa droite, un dé en bas est vu davantage de dessus. Un dé qui
garderait la même inclinaison partout dessinerait sa propre perspective et
flotterait au-dessus du bois. Trois nombres — `BOARD_PERSPECTIVE` — réglables
aux curseurs sur la maquette du labo, qui reprend le vrai décor et les vraies
zones : c'est là qu'on juge, pas dans le code.

Vérifié à la matrice de transformation, et pas seulement à l'œil : le dé
atterrit toujours sur le symbole que le moteur a tiré, même deux fois de suite
sur la même face.

**Reste à faire côté décor** : le nouveau plateau n'a plus l'échelle des
joueurs à gauche, et `zone-players`, `zone-card`, `zone-live` et `zone-action`
sont encore calées sur l'ancien dessin. Seules la rangée d'emplacements et la
zone centrale ont été remesurées.

## 6. Questions jamais tranchées

1. Sur l'Île de la Tête-de-Mort avec un Bateau Pirate et le quota de sabres
   atteint : la prime est-elle due ? (Le cas 3 têtes, lui, est tranché : oui.)
2. Le joueur actif de l'île doit-il perdre des points lui aussi ? Le moteur
   l'épargne, conformément à la règle éditeur.
3. **Égalité en fin de dernière manche.** `Game.finish` départage par l'ordre de
   jeu — le premier assis gagne. C'est un choix par défaut, pas une règle : rien
   dans la règle éditeur ne tranche le cas. Vu en vrai (6300 / 6300).
   La mécanique de mort subite existe déjà et pourrait servir de départage.
4. **« Garder au moins un dé » à la relance.** La contrainte vient bien de la
   règle éditeur, citée dans `turn.ts`. Romin la trouve arbitraire et voudrait
   la retirer : ce serait un écart assumé de plus, à décider.
