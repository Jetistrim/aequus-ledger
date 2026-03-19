FROM node:22-bookworm-slim AS base

RUN apt-get update \
	&& apt-get install -y --no-install-recommends openssl ca-certificates \
	&& rm -rf /var/lib/apt/lists/*

WORKDIR /app

FROM base AS build

COPY package*.json ./
RUN npm ci

COPY . .

RUN npx prisma generate
RUN npm run build

FROM build AS migrate

CMD ["sh", "-c", "npm run db:migrate && npm run seed:compiled"]

FROM build AS prune

RUN npm prune --omit=dev

FROM base AS runtime

ENV NODE_ENV=production

COPY --from=prune /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist

RUN mkdir -p /app/uploads /app/exports /tmp \
	&& chown -R node:node /app /tmp

USER node

EXPOSE 3001

CMD ["node", "dist/index.js"]
