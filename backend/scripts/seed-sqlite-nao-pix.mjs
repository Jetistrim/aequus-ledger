import path from 'path';
import sqlite3 from 'better-sqlite3';

const dbPath = path.join(process.cwd(), 'prisma', process.env.SQLITE_DB_FILE || 'dev.db');
const db = new sqlite3(dbPath);

const regras = [
  ['JUROS,JUROS DE MORA,JUROS SALDO UTILIZ', 'EMPRESA', 'Encargos Financeiros', 1],
  ['MULTA MORATORIA', 'EMPRESA', 'Encargos Financeiros', 1],
  ['IOF ADICIONAL,IOF', 'EMPRESA', 'Encargos Financeiros', 1],
  ['PAGAMENTO CARTAO CREDITO,CARTAO CREDITO BCE', 'EMPRESA', 'Cartão', 1],
  ['PJBANK PAGAMENTOS', 'EMPRESA', 'Gateway', 1],
  ['GRADUATI INTEGRACAO DE ESTAGIOS', 'EMPRESA', 'Serviço Profissional', 1],
  ['BEBELU,HIPERSENNA,RIO GRANDE', 'PESSOAL', 'Alimentação', 1],
];

const upsert = db.prepare(`
  INSERT INTO regras (palavra_chave, categoria, sub_categoria, prioridade)
  VALUES (?, ?, ?, ?)
  ON CONFLICT(palavra_chave, categoria, prioridade)
  DO UPDATE SET sub_categoria = excluded.sub_categoria
`);

const tx = db.transaction(() => {
  for (const regra of regras) {
    upsert.run(...regra);
  }
});

try {
  tx();
  console.log(`Regras nao-PIX aplicadas com sucesso em: ${dbPath}`);
  console.log(`Total de regras upsertadas: ${regras.length}`);
} finally {
  db.close();
}
