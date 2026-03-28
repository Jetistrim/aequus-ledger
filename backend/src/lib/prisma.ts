import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import { applyRuntimeEnvironment } from '../runtime/runtimePaths';

const runtimePaths = applyRuntimeEnvironment();
const adapter = new PrismaBetterSqlite3({ url: runtimePaths.databaseUrl });
export const prisma = new PrismaClient({ adapter });
