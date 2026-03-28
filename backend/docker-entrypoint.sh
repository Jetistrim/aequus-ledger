#!/bin/sh
set -e

node node_modules/.bin/prisma migrate deploy
node dist/seed.js

exec node dist/index.js
