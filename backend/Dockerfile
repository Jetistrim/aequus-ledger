FROM node:25-alpine AS base

# Atualiza zlib para corrigir CVE-2026-22184 (buffer overflow no utilitário untgz).
# A imagem base node:25-alpine usa zlib 1.3.1-r2; a versao corrigida e 1.3.2-r0.
RUN apk upgrade --no-cache zlib && \
    apk add --no-cache openssl ca-certificates

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

# Runtime nao precisa de npm/npx/corepack; remover reduz superficie de ataque.
RUN rm -f /usr/local/bin/npm /usr/local/bin/npx /usr/local/bin/corepack \
	&& rm -rf /usr/local/lib/node_modules/npm /opt/yarn-v1.22.22

RUN mkdir -p /app/uploads /app/exports /tmp \
	&& chown -R node:node /app /tmp

USER node

EXPOSE 3001

CMD ["node", "dist/index.js"]
