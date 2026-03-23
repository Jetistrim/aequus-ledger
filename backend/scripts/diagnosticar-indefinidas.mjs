import 'dotenv/config';
import PostgresClient from 'pg';

const { Pool } = PostgresClient;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function runDiagnostics() {
  try {
    console.log('🔍 Executando diagnóstico de transações indefinidas...\n');

    // Query 1: Quantas indefinidas são PIX?
    console.log('📊 [1] Indefinidas com PIX na descrição:');
    const resultoPixAILike = await pool.query(`
      SELECT COUNT(*) as qtd_total, 
            SUM(CASE WHEN descricao ILIKE '%PIX%' THEN 1 ELSE 0 END) as com_pix,
            ROUND(100.0 * SUM(CASE WHEN descricao ILIKE '%PIX%' THEN 1 ELSE 0 END) / COUNT(*), 1) as percentual_pix
      FROM transacoes 
      WHERE classificacao = 'INDEFINIDO'
    `);
    console.log(resultoPixAILike.rows[0]);
    console.log();

    // Query 2: Distribuição por faixa de valor
    console.log('💰 [2] Distribuição de valores - Indefinidas:');
    const resultadoFaixas = await pool.query(`
      WITH faixas AS (
        SELECT 
          valor,
          CASE 
            WHEN valor < 100 THEN '1_menor100'
            WHEN valor < 500 THEN '2_100a500'
            WHEN valor < 1000 THEN '3_500a1k'
            WHEN valor < 5000 THEN '4_1ka5k'
            ELSE '5_maior5k'
          END as faixa_label
        FROM transacoes 
        WHERE classificacao = 'INDEFINIDO'
      )
      SELECT 
        CASE 
          WHEN faixa_label = '1_menor100' THEN '< R$100'
          WHEN faixa_label = '2_100a500' THEN 'R$100-500'
          WHEN faixa_label = '3_500a1k' THEN 'R$500-1k'
          WHEN faixa_label = '4_1ka5k' THEN 'R$1k-5k'
          ELSE '> R$5k'
        END as faixa_valor,
        COUNT(*) as qtd,
        ROUND(AVG(valor)::numeric, 2) as valor_medio,
        MIN(valor) as min_valor,
        MAX(valor) as max_valor
      FROM faixas
      GROUP BY faixa_label
      ORDER BY faixa_label
    `);
    console.table(resultadoFaixas.rows);
    console.log();

    // Query 3: Top 15 descrições mais frequentes
    console.log('🏷️ [3] Top 15 descrições mais frequentes (indefinidas):');
    const resultadoDescricoes = await pool.query(`
      SELECT 
        SUBSTRING(descricao, 1, 60) as descricao_resumida,
        COUNT(*) as qtd,
        ROUND(AVG(valor)::numeric, 2) as valor_medio
      FROM transacoes 
      WHERE classificacao = 'INDEFINIDO'
      GROUP BY descricao
      ORDER BY COUNT(*) DESC
      LIMIT 15
    `);
    console.table(resultadoDescricoes.rows);
    console.log();

    // Query 4: Padrões de dia da semana
    console.log('📅 [4] Distribuição por dia da semana (indefinidas):');
    const resultadoDia = await pool.query(`
      SELECT 
        CASE EXTRACT(DOW FROM data_transacao)
          WHEN 0 THEN 'Domingo'
          WHEN 1 THEN 'Segunda'
          WHEN 2 THEN 'Terça'
          WHEN 3 THEN 'Quarta'
          WHEN 4 THEN 'Quinta'
          WHEN 5 THEN 'Sexta'
          WHEN 6 THEN 'Sábado'
        END as dia_semana,
        COUNT(*) as qtd,
        ROUND(100.0 * COUNT(*) / (SELECT COUNT(*) FROM transacoes WHERE classificacao = 'INDEFINIDO'), 1) as percentual
      FROM transacoes 
      WHERE classificacao = 'INDEFINIDO'
      GROUP BY EXTRACT(DOW FROM data_transacao)
      ORDER BY EXTRACT(DOW FROM data_transacao)
    `);
    console.table(resultadoDia.rows);
    console.log();

    // Query 5: Resumo geral
    console.log('📈 [5] Resumo geral:');
    const resultadoResumo = await pool.query(`
      SELECT 
        COUNT(*) as total_transacoes,
        SUM(CASE WHEN classificacao = 'PESSOAL' THEN 1 ELSE 0 END) as pessoal,
        SUM(CASE WHEN classificacao = 'EMPRESA' THEN 1 ELSE 0 END) as empresa,
        SUM(CASE WHEN classificacao = 'INDEFINIDO' THEN 1 ELSE 0 END) as indefinido,
        ROUND(100.0 * SUM(CASE WHEN classificacao = 'INDEFINIDO' THEN 1 ELSE 0 END) / COUNT(*), 1) as pct_indefinido
      FROM transacoes
    `);
    console.table(resultadoResumo.rows);
    console.log();

    console.log('✅ Diagnóstico concluído!');

  } catch (error) {
    console.error('❌ Erro ao executar diagnóstico:', error);
  } finally {
    await pool.end();
  }
}

runDiagnostics();
