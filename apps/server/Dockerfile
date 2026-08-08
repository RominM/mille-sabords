# Serveur de jeu, conteneurisé pour ne dépendre d'aucun hébergeur en
# particulier : Fly, Railway, Render, Koyeb, un VPS ou le Raspberry d'un ami
# prennent tous une image. Rien à changer dans le code pour passer de l'un à
# l'autre.
#
# À construire depuis la RACINE du dépôt, pas depuis ce dossier :
#   docker build -f apps/server/Dockerfile -t reckless-fathoms-server .
#
# L'image est multi-architecture par nature (node:22-alpine existe en arm64),
# donc la même commande vaut pour un Pi 64 bits et pour un hébergeur x86.
FROM node:22-alpine

WORKDIR /app

# Les manifestes d'abord : tant qu'ils ne changent pas, Docker réutilise la
# couche d'installation et la reconstruction est quasi instantanée.
COPY package.json package-lock.json ./
COPY packages/engine/package.json packages/engine/
COPY packages/protocol/package.json packages/protocol/
COPY apps/server/package.json apps/server/

# `--omit=dev` est volontairement ABSENT : le serveur exécute son TypeScript via
# tsx, qui est une dépendance de développement. Le jeu tient dans quelques Mo,
# la simplicité vaut mieux qu'une étape de compilation supplémentaire.
RUN npm ci --workspace @rf/server --include-workspace-root

COPY packages/engine packages/engine
COPY packages/protocol packages/protocol
COPY apps/server apps/server

# Presque tous les hébergeurs imposent leur port par `PORT` ; le serveur le lit
# déjà. 8787 n'est qu'un défaut pour un lancement local.
ENV PORT=8787
EXPOSE 8787

# Pas de `npm start` : on évite un process intermédiaire, pour que les signaux
# d'arrêt de l'hôte atteignent bien Node.
CMD ["npx", "tsx", "apps/server/src/index.ts"]
