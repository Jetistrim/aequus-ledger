/// <reference types="node" />

import { prisma } from '../src/lib/prisma';
import { runSeed } from '../src/seed';

runSeed(prisma)
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
