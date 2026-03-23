import { prisma } from '../src/lib/prisma';
import { classificar } from '../src/services/classificadorService';

async function main() {
  const regras = await prisma.regra.findMany();

  const indefinidas = await prisma.transacao.findMany({
    where: { classificacao: 'INDEFINIDO' },
    select: {
      id: true,
      descricao: true,
      valor: true,
      tipo: true,
      dataTransacao: true,
    },
  });

  let atualizadas = 0;

  for (const transacao of indefinidas) {
    const tipoTransacao = transacao.tipo === 'ENTRADA' ? 'entrada' : 'saida';
    const valorAbsoluto = Number(transacao.valor);

    const resultado = classificar(
      transacao.descricao,
      regras,
      transacao.dataTransacao,
      valorAbsoluto,
      tipoTransacao,
    );

    if (resultado.classificacao === 'INDEFINIDO') {
      continue;
    }

    await prisma.transacao.update({
      where: { id: transacao.id },
      data: {
        classificacao: resultado.classificacao,
        categoriaGenerica: resultado.categoriaGenerica,
      },
    });

    atualizadas += 1;
  }

  console.log(`Reclassificacao concluida. Atualizadas: ${atualizadas} de ${indefinidas.length} indefinidas.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
