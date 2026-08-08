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

- [ ] **Animation des dés** — voir §5, la question est déjà instruite.
      Volontairement APRÈS le réseau : le flux de tour est devenu asynchrone.
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

## 5. Animation des dés — analyse déjà faite

Romin veut voir les dés **rouler**, et doute que CSS suffise. Le vrai obstacle
n'est pas la technologie :

**Le moteur a déjà décidé des faces avant que l'animation ne commence** — en
multi, c'est même le serveur qui les a tirées. L'animation est donc du THÉÂTRE :
elle doit finir sur un résultat imposé. C'est ce qui contraint le choix.

- **Cube 3D en CSS** — six faces en `translateZ`/`rotate`, parent en
  `transform-style: preserve-3d`, `rotate3d` animé avec plusieurs tours, un arc
  et un rebond amorti. On peut CALCULER la rotation finale qui présente la face
  voulue. Pas de collisions ni d'immobilisation imprévisible : chaque dé suit une
  trajectoire scriptée. C'est la piste recommandée.
- **Physique réelle** (Rapier/cannon) — vraies collisions, mais la simulation
  déciderait de la face, or elle est déjà décidée. Il faudrait soit forcer
  l'orientation finale (ça se voit), soit précalculer des graines qui tombent sur
  chaque face (gros chantier, gain invisible). À écarter.
- **Brassage de tuiles** — garder la tuile plate, faire défiler les faces vite
  avec un flou et un rebond. Ce n'est pas « rouler », mais c'est cohérent avec la
  direction artistique actuelle et bien moins cher.

⚠ **Point de direction artistique** : les dés ne sont PAS des cubes numérotés,
ce sont des tuiles plates avec une image par face dans un cadre de bois. Passer
au cube 3D change le rendu du plateau, pas seulement l'animation.

**Prototype livré** — `pages/test.vue`, à `http://localhost:5173/test` avec
`npm run web`. Le composant est `app/components/DieCube.vue`.

Le point technique est réglé : l'orientation finale est CALCULÉE, en ajoutant
des tours entiers (multiples de 360°, sans effet sur l'orientation) à la
rotation qui présente la face voulue. Le dé roule vraiment et atterrit toujours
sur le bon symbole, même deux fois de suite sur la même face — mesuré sur la
matrice de transformation, pas seulement à l'œil.

La page laisse régler durée, tours, inclinaison au repos et échelle de la tuile,
montre le cube à côté de la tuile plate à taille égale, et rejoue une volée de
huit à la taille du plateau. **En attente du jugement de Romin** : si le rendu
convainc, on généralise (`DieView` garde son rôle d'état — sélection, verrou,
réserve — et `DieCube` prend le rendu) ; sinon on bascule sur le brassage de
tuiles.

## 6. Questions jamais tranchées

1. Sur l'Île de la Tête-de-Mort avec un Bateau Pirate et le quota de sabres
   atteint : la prime est-elle due ? (Le cas 3 têtes, lui, est tranché : oui.)
2. Le joueur actif de l'île doit-il perdre des points lui aussi ? Le moteur
   l'épargne, conformément à la règle éditeur.
