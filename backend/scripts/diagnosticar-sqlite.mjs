import sqlite3 from 'better-sqlite3';
import path from 'path';

const sqliteFile = process.env.SQLITE_DB_FILE || 'dev.db';
const dbPath = path.join(process.cwd(), 'prisma', sqliteFile);
const db = new sqlite3(dbPath);

function runDiagnostics() {
  try {
    console.log('🔍 Executando diagnóstico de transações indefinidas (SQLite)...\n');
    console.log(`🗄️ Banco: ${dbPath}\n`);

    // Query 1: Resumo PIX vs nao-PIX dentro das indefinidas
    console.log('📊 [1] Resumo das indefinidas (PIX vs Não-PIX):');
    const result1 = db.prepare(`
      SELECT
        COUNT(*) as qtd_total,
        SUM(CASE WHEN descricao LIKE '%PIX%' THEN 1 ELSE 0 END) as qtd_pix,
        SUM(CASE WHEN descricao NOT LIKE '%PIX%' THEN 1 ELSE 0 END) as qtd_nao_pix,
        ROUND(100.0 * SUM(CASE WHEN descricao LIKE '%PIX%' THEN 1 ELSE 0 END) / COUNT(*), 1) as pct_pix,
        ROUND(100.0 * SUM(CASE WHEN descricao NOT LIKE '%PIX%' THEN 1 ELSE 0 END) / COUNT(*), 1) as pct_nao_pix
      FROM transacoes
      WHERE classificacao = 'INDEFINIDO'
    `).all();
    console.table(result1);
    console.log();

    // Query 2: Distribuicao PIX por faixa de valor
    console.log('💰 [2] PIX indefinidas por faixa de valor:');
    const result2 = db.prepare(`
      SELECT 
        CASE 
          WHEN valor < 100 THEN '< R$100'
          WHEN valor < 500 THEN 'R$100-500'
          WHEN valor < 1000 THEN 'R$500-1k'
          WHEN valor < 5000 THEN 'R$1k-5k'
          ELSE '> R$5k'
        END as faixa_valor,
        COUNT(*) as qtd,
        ROUND(AVG(valor), 2) as valor_medio,
        MIN(valor) as min_valor,
        MAX(valor) as max_valor
      FROM transacoes 
      WHERE classificacao = 'INDEFINIDO' AND descricao LIKE '%PIX%'
      GROUP BY faixa_valor
      ORDER BY 
        CASE faixa_valor
          WHEN '< R$100' THEN 1
          WHEN 'R$100-500' THEN 2
          WHEN 'R$500-1k' THEN 3
          WHEN 'R$1k-5k' THEN 4
          ELSE 5
        END
    `).all();
    console.table(result2.length > 0 ? result2 : []);
    console.log();

    // Query 3: Top PIX
    console.log('🏷️ [3] Top 15 descrições PIX (indefinidas):');
    const result3 = db.prepare(`
      SELECT 
        SUBSTR(descricao, 1, 60) as descricao_resumida,
        COUNT(*) as qtd,
        ROUND(AVG(valor), 2) as valor_medio
      FROM transacoes 
      WHERE classificacao = 'INDEFINIDO' AND descricao LIKE '%PIX%'
      GROUP BY descricao
      ORDER BY COUNT(*) DESC
      LIMIT 15
    `).all();
    console.table(result3.length > 0 ? result3 : []);
    console.log();

    // Query 4: Distribuicao nao-PIX por faixa de valor
    console.log('💳 [4] Não-PIX indefinidas por faixa de valor:');
    const result4 = db.prepare(`
      SELECT 
        CASE 
          WHEN valor < 100 THEN '< R$100'
          WHEN valor < 500 THEN 'R$100-500'
          WHEN valor < 1000 THEN 'R$500-1k'
          WHEN valor < 5000 THEN 'R$1k-5k'
          ELSE '> R$5k'
        END as faixa_valor,
        COUNT(*) as qtd,
        ROUND(AVG(valor), 2) as valor_medio,
        MIN(valor) as min_valor,
        MAX(valor) as max_valor
      FROM transacoes 
      WHERE classificacao = 'INDEFINIDO' AND descricao NOT LIKE '%PIX%'
      GROUP BY faixa_valor
      ORDER BY 
        CASE faixa_valor
          WHEN '< R$100' THEN 1
          WHEN 'R$100-500' THEN 2
          WHEN 'R$500-1k' THEN 3
          WHEN 'R$1k-5k' THEN 4
          ELSE 5
        END
    `).all();
    console.table(result4.length > 0 ? result4 : []);
    console.log();

    // Query 5: Top nao-PIX
    console.log('🏪 [5] Top 15 descrições Não-PIX (indefinidas):');
    const result5 = db.prepare(`
      SELECT 
        SUBSTR(descricao, 1, 60) as descricao_resumida,
        COUNT(*) as qtd,
        ROUND(AVG(valor), 2) as valor_medio
      FROM transacoes
      WHERE classificacao = 'INDEFINIDO' AND descricao NOT LIKE '%PIX%'
      GROUP BY descricao
      ORDER BY COUNT(*) DESC
      LIMIT 15
    `).all();
    console.table(result5.length > 0 ? result5 : []);
    console.log();

    // Query 6: Resumo geral
    console.log('📈 [6] Resumo geral:');
    const result6 = db.prepare(`
      SELECT 
        COUNT(*) as total_transacoes,
        SUM(CASE WHEN classificacao = 'PESSOAL' THEN 1 ELSE 0 END) as pessoal,
        SUM(CASE WHEN classificacao = 'EMPRESA' THEN 1 ELSE 0 END) as empresa,
        SUM(CASE WHEN classificacao = 'INDEFINIDO' THEN 1 ELSE 0 END) as indefinido,
        ROUND(100.0 * SUM(CASE WHEN classificacao = 'INDEFINIDO' THEN 1 ELSE 0 END) / COUNT(*), 1) as pct_indefinido
      FROM transacoes
    `).all();
    console.table(result6);
    console.log();

    console.log('✅ Diagnóstico concluído!');

  } catch (error) {
    console.error('❌ Erro ao executar diagnóstico:', error.message);
  } finally {
    db.close();
  }
}

runDiagnostics();
