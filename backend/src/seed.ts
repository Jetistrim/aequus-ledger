/**
 * Seed de regras padrão de classificação.
 *
 * Este módulo está em `src/` para compilar corretamente com o tsconfig principal
 * (`rootDir: ./src`), produzindo `dist/seed.js` com caminhos de importação válidos.
 *
 * Para uso em desenvolvimento via ts-node, veja `prisma/seed.ts` (thin wrapper).
 * Para uso em produção (Docker, pasta portátil) e testes compilados, usar este.
 */
import { prisma } from './lib/prisma';

type Categoria = 'PESSOAL' | 'EMPRESA';

interface RegraBase {
  palavraChave: string;
  categoria: Categoria;
  subCategoria: string;
  prioridade: number;
}

const REGRAS_PADRAO: RegraBase[] = [
  // ── REGRAS DIRECIONADAS (top recorrências do diagnóstico PIX) ────────────────

  { palavraChave: 'Paulo Gabriel Lima de Sou', categoria: 'EMPRESA', subCategoria: 'Folha de Pagamento', prioridade: 1 },
  { palavraChave: 'Instituto Alexia Clinic', categoria: 'EMPRESA', subCategoria: 'Receita', prioridade: 1 },
  { palavraChave: 'ALEXSANDRA FERREIRA LIMA DE SOUSA', categoria: 'EMPRESA', subCategoria: 'Receita', prioridade: 1 },
  { palavraChave: '99 TECNOLOGIA LTDA', categoria: 'PESSOAL', subCategoria: 'Transporte', prioridade: 1 },
  { palavraChave: 'Nu Pagamentos S A', categoria: 'EMPRESA', subCategoria: 'Gateway', prioridade: 1 },
  { palavraChave: 'Banco Santander Brasil S', categoria: 'EMPRESA', subCategoria: 'Banco', prioridade: 1 },
  { palavraChave: 'FACEBOOK SERVICOS ONLINE', categoria: 'EMPRESA', subCategoria: 'Marketing', prioridade: 1 },
  { palavraChave: 'QUANTITY SERVICOS E COMERCIO DE PRODUTOS PARA SAUD', categoria: 'EMPRESA', subCategoria: 'Fornecedor', prioridade: 1 },
  { palavraChave: 'PAGAMENTO DE BOLETO OUTROS BANCOS NU PAGAMENTOS SA', categoria: 'EMPRESA', subCategoria: 'Pagamento de Boleto', prioridade: 1 },
  { palavraChave: 'Sophia Lima de Sousa', categoria: 'PESSOAL', subCategoria: 'Transferência Pessoal', prioridade: 1 },
  { palavraChave: 'Maria Eduarda De Lima Eva', categoria: 'PESSOAL', subCategoria: 'Transferência Pessoal', prioridade: 1 },
  { palavraChave: 'Raquel Vitoria Lima da Si', categoria: 'PESSOAL', subCategoria: 'Transferência Pessoal', prioridade: 1 },
  { palavraChave: 'MINISTERIO DA FAZENDA', categoria: 'EMPRESA', subCategoria: 'Imposto', prioridade: 1 },
  { palavraChave: 'REMUNERACAO APLICACAO AUTOMATICA', categoria: 'EMPRESA', subCategoria: 'Receita', prioridade: 2 },
  { palavraChave: 'PIX DEVOLVIDO 99 TECNOLOGIA LTDA', categoria: 'EMPRESA', subCategoria: 'Estorno', prioridade: 1 },

  // ── NÃO-PIX RESIDUAL (encargos/cartão/fornecedores) ───────────────────────

  { palavraChave: 'JUROS,JUROS DE MORA,JUROS SALDO UTILIZ', categoria: 'EMPRESA', subCategoria: 'Encargos Financeiros', prioridade: 1 },
  { palavraChave: 'MULTA MORATORIA', categoria: 'EMPRESA', subCategoria: 'Encargos Financeiros', prioridade: 1 },
  { palavraChave: 'IOF ADICIONAL,IOF', categoria: 'EMPRESA', subCategoria: 'Encargos Financeiros', prioridade: 1 },
  { palavraChave: 'PAGAMENTO CARTAO CREDITO,CARTAO CREDITO BCE', categoria: 'EMPRESA', subCategoria: 'Cartão', prioridade: 1 },
  { palavraChave: 'PJBANK PAGAMENTOS', categoria: 'EMPRESA', subCategoria: 'Gateway', prioridade: 1 },
  { palavraChave: 'GRADUATI INTEGRACAO DE ESTAGIOS', categoria: 'EMPRESA', subCategoria: 'Serviço Profissional', prioridade: 1 },
  { palavraChave: 'BEBELU,HIPERSENNA,RIO GRANDE', categoria: 'PESSOAL', subCategoria: 'Alimentação', prioridade: 1 },

  // ── PESSOAL — Prioridade 1 ───────────────────────────────────────────────────

  { palavraChave: 'UBER,99POP,99TAXI,99APP,CABIFY,INDRIVER,BUSER', categoria: 'PESSOAL', subCategoria: 'Transporte', prioridade: 1 },
  { palavraChave: 'IFOOD,IFOOD ENTREGAS,IFOOD DELIVERY,AIQFOME,UBER EATS,RAPPIDELIVERY,RAPPI', categoria: 'PESSOAL', subCategoria: 'Alimentação', prioridade: 1 },
  { palavraChave: 'NETFLIX,SPOTIFY,SPOTIFY PREMIUM,DISNEY+,PRIME VIDEO,HBO MAX,GLOBO PLAY,YOUTUBE PREMIUM,APPLE TV,STEAM', categoria: 'PESSOAL', subCategoria: 'Entretenimento', prioridade: 1 },
  { palavraChave: 'AMAZON,AMZ,AMAZON.COM,MERCADO LIVRE,MELI,MERCADOLIVRE', categoria: 'PESSOAL', subCategoria: 'Compras Online', prioridade: 1 },

  // ── PESSOAL — Prioridade 2 ───────────────────────────────────────────────────

  { palavraChave: 'DROGA RAIA,DROGASIL,RAIA,DROGARIA,SAO PAULO DROGARIA,PAG PANVEL,FARMACIA', categoria: 'PESSOAL', subCategoria: 'Saúde', prioridade: 2 },
  { palavraChave: 'SUBWAY,BURGER KING,MCDONALDS,BOB\'S,OUTBACK,RESTAURANTE,RESTAURANT', categoria: 'PESSOAL', subCategoria: 'Alimentação', prioridade: 2 },
  { palavraChave: 'SUPERMERCADO,HORTIFRUTI,PADARIA,ACOUGUE', categoria: 'PESSOAL', subCategoria: 'Alimentação', prioridade: 2 },
  { palavraChave: 'SMART FIT,BLUEFIT,ACADEMIA,PERSONAL TRAINER', categoria: 'PESSOAL', subCategoria: 'Saúde', prioridade: 2 },
  { palavraChave: 'DECOLAR,CVC,AIRBNB,BOOKING,HOTELURB,VIAGEM,VIAGENS', categoria: 'PESSOAL', subCategoria: 'Viagem', prioridade: 2 },
  { palavraChave: 'RIACHUELO,RENNER,C&A,SHOPPING,LOJAS AMERICANAS,AMERICANAS.COM,CENTAURO,NETSHOES', categoria: 'PESSOAL', subCategoria: 'Vestuário', prioridade: 2 },
  { palavraChave: 'PETZ,COBASI,PET LOVE,PET SHOP,COVET PET', categoria: 'PESSOAL', subCategoria: 'Pet', prioridade: 2 },
  { palavraChave: 'CINEMA,CINEPLEX,UCI,CINEMARK,VIVOTHEATER,SHOW,SHOWS,EVENTIM', categoria: 'PESSOAL', subCategoria: 'Entretenimento', prioridade: 2 },
  { palavraChave: 'PORTO SEGURO,SUL AMERICA,BRADESCO SEGUROS,SEGURO AUTO,SEGURADORA', categoria: 'PESSOAL', subCategoria: 'Seguro', prioridade: 2 },
  { palavraChave: 'RETIRADA,SAQUE ATM,SAQUE CAIXA,SAQUE DINHEIRO,SAQUE', categoria: 'PESSOAL', subCategoria: 'Saque', prioridade: 2 },
  { palavraChave: 'RETIRADA SOCIO,RETIRADA PROPRIETARIO,SALARIO SOCIO', categoria: 'PESSOAL', subCategoria: 'Retirada', prioridade: 1 },
  { palavraChave: 'FAMILIA,MAE,PAI,FILHO,ESPOSA,MARIDO,NAMORADA,IRMAO', categoria: 'PESSOAL', subCategoria: 'Transferência Pessoal', prioridade: 2 },
  { palavraChave: 'RECARGA CELULAR,RECARGA,VIVO,TIM,CLARO,OI', categoria: 'PESSOAL', subCategoria: 'Telefonia', prioridade: 2 },

  // ── EMPRESA — Prioridade 1 ───────────────────────────────────────────────────

  { palavraChave: 'SIMPLES NACIONAL,DAS,MEI,ISS,ICMS,DARF,SEFAZ,RECEITA FEDERAL,IMPOSTO,IPTU EMPRESA', categoria: 'EMPRESA', subCategoria: 'Imposto', prioridade: 1 },
  { palavraChave: 'PROLABORE,SALARIO,FGTS,INSS,CONTRIBUICAO PREVIDENCIARIA,FOLHA PAGAMENTO', categoria: 'EMPRESA', subCategoria: 'Folha de Pagamento', prioridade: 1 },
  { palavraChave: 'SEBRAE,SINDICATO,SESC,SESC SENAC,CONTABIL,CONTADOR,CONTABILIDADE', categoria: 'EMPRESA', subCategoria: 'Serviço Profissional', prioridade: 1 },
  { palavraChave: 'ENERGISA,COELBA,CELPA,ELETROPAULO,CEMIG,COPASA,SABESP,SANASA,ELEKTRO', categoria: 'EMPRESA', subCategoria: 'Utilidades', prioridade: 1 },
  { palavraChave: 'BANDA LARGA,OI FIBRA,VIVO FIBRA,CLARO NET,NET VIVO,VIVO MOVEL,TIM CELULAR', categoria: 'EMPRESA', subCategoria: 'Telecom', prioridade: 1 },
  { palavraChave: 'LOCACAO,ALUGUEL IMOVEL,ALUGUEL ESPACO,IMOBILIARIA,ALUGUEL,CONDOMINIO,SINDICO', categoria: 'EMPRESA', subCategoria: 'Aluguel', prioridade: 1 },
  { palavraChave: 'FORNECEDOR,CNPJ,NOTA FISCAL,NF-E,SERVICO PRESTADO', categoria: 'EMPRESA', subCategoria: 'Fornecedor', prioridade: 1 },
  { palavraChave: 'FORN,EIRELI,PRESTADOR SERVICO,FREELANCER', categoria: 'EMPRESA', subCategoria: 'Prestadores', prioridade: 2 },
  { palavraChave: 'BOLETO,BOLETO PIX,PAG BOLETO,PAGAMENTO BOLETO', categoria: 'EMPRESA', subCategoria: 'Pagamento de Boleto', prioridade: 1 },

  // ── EMPRESA — Prioridade 2 ───────────────────────────────────────────────────

  { palavraChave: 'MAQUINA CARTAO,CIELO,REDE,GETNET,PAGSEGURO,MERCADO PAGO PJ,PAGAMENTO CARTAO', categoria: 'EMPRESA', subCategoria: 'Gateway', prioridade: 2 },
  { palavraChave: 'TARIFA BANCARIA,MANUTENCAO CONTA,TARIFAS BANCARIAS,IOF,IOF FINANCEIRO', categoria: 'EMPRESA', subCategoria: 'Tarifa Bancária', prioridade: 2 },
  { palavraChave: 'CORREIOS,SEDEX,CORREIO,ENVIO ENCOMENDA,JADLOG,TOTAL EXPRESS,LOGGI,TRANSPORTADORA,FRETE', categoria: 'EMPRESA', subCategoria: 'Logística', prioridade: 2 },
  { palavraChave: 'GOOGLE ADS,FACEBOOK ADS,META ADS,INSTAGRAM ADS,PUBLICIDADE ONLINE', categoria: 'EMPRESA', subCategoria: 'Marketing', prioridade: 2 },
  { palavraChave: 'MATERIAL ESCRITORIO,KALUNGA,PAPELARIA,LIVRARIA CULTURA,AMAZON SUPRIMENTOS', categoria: 'EMPRESA', subCategoria: 'Material', prioridade: 2 },
  { palavraChave: 'SOFTWARE,ASANA,TRELLO,SLACK,ZOOM,GOOGLE WORKSPACE,MICROSOFT 365', categoria: 'EMPRESA', subCategoria: 'Software', prioridade: 2 },
  { palavraChave: 'DOMINIO,HOSTING,HOSTGATOR,LOCAWEB,UOL HOST,SITE,WORDPRESS', categoria: 'EMPRESA', subCategoria: 'Hospedagem', prioridade: 2 },

  // ── EMPRESA — Prioridade 3 (catch-all) ───────────────────────────────────────

  { palavraChave: 'RECEBIMENTO CLIENTE,CLIENTE,VENDA,RECEBIMENTO,FATURA,DEPOSITO', categoria: 'EMPRESA', subCategoria: 'Receita', prioridade: 3 },
];

/**
 * Insere ou atualiza as regras padrão de classificação. Operação idempotente.
 */
async function seed(): Promise<void> {
  for (const regra of REGRAS_PADRAO) {
    await prisma.regra.upsert({
      where: {
        palavraChave_categoria_prioridade: {
          palavraChave: regra.palavraChave,
          categoria: regra.categoria,
          prioridade: regra.prioridade,
        },
      },
      update: { subCategoria: regra.subCategoria },
      create: regra,
    });
  }

  console.log('Seed de regras criado com sucesso.');
}

seed()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
