import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import sqlite3 from 'better-sqlite3';

async function checkPostgres() {
  console.log('🔍 Testando PostgreSQL...');
  try {
    const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
    const prisma = new PrismaClient({ adapter });
    const count = await prisma.transacao.count();
    console.log(`✅ PostgreSQL: ${count} transações encontradas\n`);
    await prisma.$disconnect();
    return count;
  } catch (error) {
    console.log(`❌ PostgreSQL: ${error.message}\n`);
    return null;
  }
}

function checkSqlite() {
  console.log('🔍 Testando SQLite (dev2.db)...');
  try {
    const db = new sqlite3('prisma/dev2.db');
    const result = db.prepare('SELECT COUNT(*) as count FROM transacoes').get();
    const count = result?.count ?? 0;
    console.log(`✅ SQLite: ${count} transações encontradas\n`);
    db.close();
    return count;
  } catch (error) {
    console.log(`❌ SQLite: ${error.message}\n`);
    return null;
  }
}

async function main() {
  console.log('📊 Verificando bancos de dados...\n');
  const pgCount = await checkPostgres();
  const sqliteCount = checkSqlite();
  
  if (pgCount === null && sqliteCount === null) {
    console.log('⚠️  Nenhum banco encontrado com dados!');
  } else if ((pgCount ?? 0) > (sqliteCount ?? 0)) {
    console.log('→ Dados estão no PostgreSQL');
  } else if ((sqliteCount ?? 0) > 0) {
    console.log('→ Dados estão no SQLite');
  }
}

main();
