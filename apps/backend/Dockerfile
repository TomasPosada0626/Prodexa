FROM node:22-alpine AS deps
WORKDIR /app
COPY apps/backend/package*.json ./
RUN npm ci

FROM node:22-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY apps/backend ./
RUN npx prisma generate --schema prisma/schema.prisma
RUN npm run build
# Sin esto, el runtime copiaba node_modules completo (con eslint/jest/typescript/
# ts-node/prisma-CLI incluidos -- todo lo necesario para compilar, nada de lo
# necesario para correr `node dist/src/main.js`) -- 749MB de los 1.13GB de la
# imagen final medidos antes de este cambio (ver docs/deployment/docker.md).
RUN npm prune --omit=dev

FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/package*.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/prisma.config.ts ./
EXPOSE 3000
CMD ["node", "dist/src/main.js"]
