import path from 'path';
import Database from 'better-sqlite3';
import { classificar, Regra } from '../src/services/classificadorService';

interface RegraRow {
  palavra_chave: string;
  categoria: 'PESSOAL' | 'EMPRESA';
  sub_categoria: string | null;
  prioridade: number;
}

interface TransacaoRow {
  id: string;
  data_transacao: string;
  descricao: string;
  valor: number;
  tipo: 'ENTRADA' | 'SAIDA';
}

function main() {
  const sqliteFile = process.env.SQLITE_DB_FILE || 'dev.db';
  const dbPath = path.join(process.cwd(), 'prisma', sqliteFile);
  const db = new Database(dbPath);

  const regrasRows = db
    .prepare('SELECT palavra_chave, categoria, sub_categoria, prioridade FROM regras')
    .all() as RegraRow[];

  const regras: Regra[] = regrasRows.map((r) => ({
    palavraChave: r.palavra_chave,
    categoria: r.categoria,
    subCategoria: r.sub_categoria,
    prioridade: r.prioridade,
  }));

  const indefinidas = db
    .prepare(
      `SELECT id, data_transacao, descricao, valor, tipo
       FROM transacoes
       WHERE classificacao = 'INDEFINIDO'`,
    )
    .all() as TransacaoRow[];

  const updateStmt = db.prepare(
    `UPDATE transacoes
     SET classificacao = ?, categoria_generica = ?
     WHERE id = ?`,
  );

  const runTx = db.transaction((rows: TransacaoRow[]) => {
    let atualizadas = 0;

    for (const row of rows) {
      const resultado = classificar(
        row.descricao,
        regras,
        new Date(row.data_transacao),
        Number(row.valor),
        row.tipo === 'ENTRADA' ? 'entrada' : 'saida',
      );

      if (resultado.classificacao === 'INDEFINIDO') {
        continue;
      }

      updateStmt.run(resultado.classificacao, resultado.categoriaGenerica, row.id);
      atualizadas += 1;
    }

    return atualizadas;
  });

  try {
    const atualizadas = runTx(indefinidas);
    console.log(`Reclassificacao SQLite concluida: ${atualizadas} de ${indefinidas.length} transacoes indefinidas atualizadas.`);
  } finally {
    db.close();
  }
}

main();
