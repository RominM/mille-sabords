# Reckless Fathoms — brief de reprise

> À jour au 2026-08-06. Les conventions, les constantes mesurées des assets et
> les pièges techniques vivent dans **`CLAUDE.md`**, lu automatiquement au
> démarrage — ce document-ci ne parle que de l'ÉTAT et du RESTE À FAIRE.

---

## 1. Où en est le projet

Jeu de dés type « pousse ta chance », jouable en solo contre l'IA **et en
multijoueur en ligne**. Monorepo npm workspaces, Node 22, Windows.

```
packages/engine    Moteur pur TypeScript. AUTORITÉ des règles. 80 tests.
packages/protocol  Types des messages client ↔ serveur. Partagé par les deux.
apps/server        WebSocket autoritaire : salles, identité, arbitrage. 12 tests.
apps/web           Nuxt 4 SPA (ssr: false) + SCSS. Port 5173.
apps/cli           CLI hotseat pour éprouver les règles au clavier.
```

```bash
npm test                      # 92 tests (moteur + serveur)
npm run server                # serveur de jeu → ws://localhost:8787
npm run web                   # front → http://localhost:5173
npm run typecheck -w @rf/web
npm run assets -w @rf/web     # convertit images/sons ET met à jour les imports
```

`apps/web/.env` (non versionné) pointe le front vers le serveur local.

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

## 3. Reste à faire — par ordre de dépendance

### Bloquant pour jouer vraiment

- [ ] **Avatars en multi.** L'état de partie ne les transporte pas ; le plateau
      retombe sur la dernière vue de salle, ce qui casse après un F5 en pleine
      partie. Les ajouter au `Player` du protocole (pas au moteur : un avatar ne
      regarde pas les règles) ou les diffuser à part.
- [ ] **Persistance des salles.** Tout est en mémoire : un redémarrage du serveur
      perd les parties en cours. Sérialiser sur disque, ou accepter la limite et
      l'assumer explicitement.
- [ ] **Hébergement.** Le serveur est prêt (Dockerfile écrit mais **jamais
      construit** — à vérifier). Il faut un process qui vit, pas du serverless.
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

**Prochaine étape convenue** : un prototype isolé dans `pages/test.vue` (page
inutilisée) — un dé cliquable en cube 3D CSS qui tombe sur une face demandée.
Romin juge à l'écran, puis on généralise ou on bascule sur le brassage.

## 6. Questions jamais tranchées

1. Sur l'Île de la Tête-de-Mort avec un Bateau Pirate et le quota de sabres
   atteint : la prime est-elle due ? (Le cas 3 têtes, lui, est tranché : oui.)
2. Le joueur actif de l'île doit-il perdre des points lui aussi ? Le moteur
   l'épargne, conformément à la règle éditeur.
