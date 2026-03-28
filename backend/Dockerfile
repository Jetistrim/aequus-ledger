FROM node:25-alpine AS base

RUN apk upgrade --no-cache zlib && \
    apk add --no-cache openssl ca-certificates

WORKDIR /app

FROM base AS build

RUN apk add --no-cache python3 make g++

COPY package*.json ./
RUN npm ci

COPY . .

RUN npx prisma generate
RUN npm run build

FROM build AS prune

RUN npm prune --omit=dev

FROM base AS runtime

ENV NODE_ENV=production

COPY --from=prune /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma
COPY docker-entrypoint.sh ./docker-entrypoint.sh

# Runtime nao precisa de npm/npx/corepack; remover reduz superficie de ataque.
RUN rm -f /usr/local/bin/npm /usr/local/bin/npx /usr/local/bin/corepack \
	&& rm -rf /usr/local/lib/node_modules/npm /opt/yarn-v1.22.22

RUN mkdir -p /app/uploads /app/exports /app/data /tmp \
	&& chmod +x /app/docker-entrypoint.sh \
	&& chown -R node:node /app /tmp

USER node

EXPOSE 3001

CMD ["sh", "docker-entrypoint.sh"]
