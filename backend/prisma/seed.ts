import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const connectionString = process.env['DATABASE_URL']!;
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter } as ConstructorParameters<typeof PrismaClient>[0]);

async function main() {
  const regras = [
    // ── PESSOAL — Prioridade 1 (termos específicos e confiáveis) ────────────────

    // Transporte por app
    { palavraChave: 'UBER,99POP,99TAXI,99APP,CABIFY,INDRIVER,BUSER', categoria: 'PESSOAL' as const, subCategoria: 'Transporte', prioridade: 1 },
    // Delivery de alimentação
    { palavraChave: 'IFOOD,IFOOD ENTREGAS,IFOOD DELIVERY,AIQFOME,UBER EATS,RAPPIDELIVERY,RAPPI', categoria: 'PESSOAL' as const, subCategoria: 'Alimentação', prioridade: 1 },
    // Streaming e entretenimento digital
    { palavraChave: 'NETFLIX,SPOTIFY,SPOTIFY PREMIUM,DISNEY+,PRIME VIDEO,HBO MAX,GLOBO PLAY,YOUTUBE PREMIUM,APPLE TV,STEAM', categoria: 'PESSOAL' as const, subCategoria: 'Entretenimento', prioridade: 1 },
    // E-commerce pessoal
    { palavraChave: 'AMAZON,AMZ,AMAZON.COM,MERCADO LIVRE,MELI,MERCADOLIVRE', categoria: 'PESSOAL' as const, subCategoria: 'Compras Online', prioridade: 1 },

    // ── PESSOAL — Prioridade 2 (termos mais genéricos) ──────────────────────────

    // Farmácias
    { palavraChave: 'DROGA RAIA,DROGASIL,RAIA,DROGARIA,SAO PAULO DROGARIA,PAG PANVEL,FARMACIA', categoria: 'PESSOAL' as const, subCategoria: 'Saúde', prioridade: 2 },
    // Restaurantes e fast food
    { palavraChave: 'SUBWAY,BURGER KING,MCDONALDS,BOB\'S,OUTBACK,RESTAURANTE,RESTAURANT', categoria: 'PESSOAL' as const, subCategoria: 'Alimentação', prioridade: 2 },
    // Supermercados
    { palavraChave: 'SUPERMERCADO,HORTIFRUTI,PADARIA,ACOUGUE', categoria: 'PESSOAL' as const, subCategoria: 'Alimentação', prioridade: 2 },
    // Academia e fitness
    { palavraChave: 'SMART FIT,BLUEFIT,ACADEMIA,PERSONAL TRAINER', categoria: 'PESSOAL' as const, subCategoria: 'Saúde', prioridade: 2 },
    // Viagem e turismo
    { palavraChave: 'DECOLAR,CVC,AIRBNB,BOOKING,HOTELURB,VIAGEM,VIAGENS', categoria: 'PESSOAL' as const, subCategoria: 'Viagem', prioridade: 2 },
    // Roupas e shopping
    { palavraChave: 'RIACHUELO,RENNER,C&A,SHOPPING,LOJAS AMERICANAS,AMERICANAS.COM,CENTAURO,NETSHOES', categoria: 'PESSOAL' as const, subCategoria: 'Vestuário', prioridade: 2 },
    // Pet shop
    { palavraChave: 'PETZ,COBASI,PET LOVE,PET SHOP,COVET PET', categoria: 'PESSOAL' as const, subCategoria: 'Pet', prioridade: 2 },
    // Cinema e eventos
    { palavraChave: 'CINEMA,CINEPLEX,UCI,CINEMARK,VIVOTHEATER,SHOW,SHOWS,EVENTIM', categoria: 'PESSOAL' as const, subCategoria: 'Entretenimento', prioridade: 2 },
    // Seguro pessoal (carro, casa)
    { palavraChave: 'PORTO SEGURO,SUL AMERICA,BRADESCO SEGUROS,SEGURO AUTO,SEGURADORA', categoria: 'PESSOAL' as const, subCategoria: 'Seguro', prioridade: 2 },
    // Saques e retiradas (comum para gastos pessoais)
    { palavraChave: 'RETIRADA,SAQUE ATM,SAQUE CAIXA,SAQUE DINHEIRO,SAQUE', categoria: 'PESSOAL' as const, subCategoria: 'Saque', prioridade: 2 },

    // ── EMPRESA — Prioridade 1 (termos específicos e confiáveis) ────────────────

    // Tributos e impostos
    { palavraChave: 'SIMPLES NACIONAL,DAS,MEI,ISS,ICMS,DARF,SEFAZ,RECEITA FEDERAL,IMPOSTO,IPTU EMPRESA', categoria: 'EMPRESA' as const, subCategoria: 'Imposto', prioridade: 1 },
    // Folha de pagamento e encargos
    { palavraChave: 'PROLABORE,SALARIO,FGTS,INSS,CONTRIBUICAO PREVIDENCIARIA,FOLHA PAGAMENTO', categoria: 'EMPRESA' as const, subCategoria: 'Folha de Pagamento', prioridade: 1 },
    // Serviços profissionais e associações
    { palavraChave: 'SEBRAE,SINDICATO,SESC,SESC SENAC,CONTABIL,CONTADOR,CONTABILIDADE', categoria: 'EMPRESA' as const, subCategoria: 'Serviço Profissional', prioridade: 1 },
    // Energia elétrica e água
    { palavraChave: 'ENERGISA,COELBA,CELPA,ELETROPAULO,CEMIG,COPASA,SABESP,SANASA,ELEKTRO', categoria: 'EMPRESA' as const, subCategoria: 'Utilidades', prioridade: 1 },
    // Internet e telecomunicações
    { palavraChave: 'BANDA LARGA,OI FIBRA,VIVO FIBRA,CLARO NET,NET VIVO,VIVO MOVEL,TIM CELULAR', categoria: 'EMPRESA' as const, subCategoria: 'Telecom', prioridade: 1 },
    // Aluguel de imóvel/espaço comercial
    { palavraChave: 'LOCACAO,ALUGUEL IMOVEL,ALUGUEL ESPACO,IMOBILIARIA,ALUGUEL,CONDOMINIO,SINDICO', categoria: 'EMPRESA' as const, subCategoria: 'Aluguel', prioridade: 1 },
    // Fornecedores e NF
    { palavraChave: 'FORNECEDOR,CNPJ,NOTA FISCAL,NF-E,SERVICO PRESTADO', categoria: 'EMPRESA' as const, subCategoria: 'Fornecedor', prioridade: 1 },

    // ── EMPRESA — Prioridade 2 ───────────────────────────────────────────────────

    // Maquininhas e gateways de pagamento
    { palavraChave: 'MAQUINA CARTAO,CIELO,REDE,GETNET,PAGSEGURO,MERCADO PAGO PJ,PAGAMENTO CARTAO', categoria: 'EMPRESA' as const, subCategoria: 'Gateway', prioridade: 2 },
    // Tarifas bancárias
    { palavraChave: 'TARIFA BANCARIA,MANUTENCAO CONTA,TARIFAS BANCARIAS,IOF,IOF FINANCEIRO', categoria: 'EMPRESA' as const, subCategoria: 'Tarifa Bancária', prioridade: 2 },
    // Correios e transportadoras
    { palavraChave: 'CORREIOS,SEDEX,CORREIO,ENVIO ENCOMENDA,JADLOG,TOTAL EXPRESS,LOGGI,TRANSPORTADORA,FRETE', categoria: 'EMPRESA' as const, subCategoria: 'Logística', prioridade: 2 },
    // Marketing e publicidade digital
    { palavraChave: 'GOOGLE ADS,FACEBOOK ADS,META ADS,INSTAGRAM ADS,PUBLICIDADE ONLINE', categoria: 'EMPRESA' as const, subCategoria: 'Marketing', prioridade: 2 },
    // Material de escritório
    { palavraChave: 'MATERIAL ESCRITORIO,KALUNGA,PAPELARIA,LIVRARIA CULTURA,AMAZON SUPRIMENTOS', categoria: 'EMPRESA' as const, subCategoria: 'Material', prioridade: 2 },
    // Software e SaaS
    { palavraChave: 'SOFTWARE,ASANA,TRELLO,SLACK,ZOOM,GOOGLE WORKSPACE,MICROSOFT 365', categoria: 'EMPRESA' as const, subCategoria: 'Software', prioridade: 2 },
    // Domínio e hospedagem
    { palavraChave: 'DOMINIO,HOSTING,HOSTGATOR,LOCAWEB,UOL HOST,SITE,WORDPRESS', categoria: 'EMPRESA' as const, subCategoria: 'Hospedagem', prioridade: 2 },

    // ── EMPRESA — Prioridade 3 (catch-all, força revisão manual se errar) ───────

    // Receitas da conta PJ
    { palavraChave: 'RECEBIMENTO CLIENTE,PIX RECEBIDO,TRANSFERENCIA RECEBIDA,DEPOSITO', categoria: 'EMPRESA' as const, subCategoria: 'Receita', prioridade: 3 },
  ];

  for (const regra of regras) {
    const existente = await prisma.regra.findFirst({
      where: {
        palavraChave: regra.palavraChave,
        categoria: regra.categoria,
        subCategoria: regra.subCategoria,
      },
      select: { id: true },
    });

    if (!existente) {
      await prisma.regra.create({ data: regra });
      continue;
    }

    await prisma.regra.update({
      where: { id: existente.id },
      data: {
        prioridade: regra.prioridade,
      },
    });
  }

  console.log('Seed de regras criado com sucesso.');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
