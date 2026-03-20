import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';

const connectionString = process.env['DATABASE_URL'];
if (!connectionString) {
  throw new Error('DATABASE_URL não definida no ambiente.');
}

const isSqlite = connectionString.startsWith('file:');

const prismaClientOptions: ConstructorParameters<typeof PrismaClient>[0] = isSqlite
  ? { adapter: new PrismaBetterSqlite3({ url: connectionString }) }
  : { adapter: new PrismaPg({ connectionString }) };

export const prisma = new PrismaClient(prismaClientOptions);
export { isSqlite };
