# Tests à faire en multijoueur — fin de tour

À dérouler entre amis (2 ou 3 joueurs, ~10 min), sur une version déployée qui
contient le changement « score puis À toi de jouer ».

**Préparation :** un joueur crée un équipage, les autres le rejoignent, on
ajoute une IA.

## Test 1 — Fin de tour normale (A s'arrête et marque des points)

- [ ] Tout le monde voit **« A +xxx pts »** avec **le nom de A** (pas celui du suivant).
- [ ] Pendant ce score, c'est **le portrait de A** qui est éclairé.
- [ ] Le score reste environ **5 s**, puis plateau vide un instant, le portrait passe à B.
- [ ] **B seul** voit « À toi de jouer » (~2,5 s) ; les autres ne le voient pas.
- [ ] Pendant l'annonce, le bouton de lancer de B est **grisé** et sa barre de temps **pleine**.
- [ ] Après l'annonce, la barre de B commence à descendre.

## Test 2 — Tour perdu sur 3 têtes de mort

- [ ] « 0 pts — Trois têtes de mort » n'apparaît **qu'une fois les dés retombés**, et reste ~5 s.
- [ ] Puis même enchaînement que le test 1.

## Test 3 — Tour de l'IA

- [ ] Le score de l'IA s'affiche avec **son nom**.
- [ ] Le joueur humain suivant reçoit bien son « À toi de jouer ».

## Test 4 — Temps écoulé (B ne touche à rien)

- [ ] B a son temps de réflexion complet (30 s, ou 50 s si le point 1 est livré), annonce non comprise.
- [ ] Ensuite la main passe **au joueur suivant, sans en sauter un**.

## Ressenti

- [ ] Les ~9 s entre deux tours : trop long / trop court / bien ?

## À rapporter

Le numéro du test et ce qui s'est passé à la place.
Ex. : « test 1, le nom de B s'affiche sur le score de A ».

> Connu, sans gravité : recharger la page PENDANT un score peut afficher ce
> score sous le nom du joueur suivant. Le tour d'après redevient normal.
