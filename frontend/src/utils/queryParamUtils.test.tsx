import { describe, it, expect } from 'vitest';
import {
  parseUrlFiltros,
  serializarFiltros,
  obterFiltrosPadroes,
  FiltrosListagem,
} from './queryParamUtils';

describe('queryParamUtils', () => {
  describe('parseUrlFiltros', () => {
    it('retorna defaults quando URLSearchParams está vazio', () => {
      const params = new URLSearchParams();
      const resultado = parseUrlFiltros(params);

      expect(resultado).toEqual({
        pagina: 1,
        limite: 25,
        filtro: 'todos',
        classificacao: 'TODAS',
        tipo: 'TODOS',
        busca: '',
      });
    });

    it('parseia valores válidos corretamente', () => {
      const params = new URLSearchParams({
        pagina: '3',
        limite: '50',
        filtro: 'indefinidos',
        classificacao: 'PESSOAL',
        tipo: 'ENTRADA',
        busca: 'cafe',
      });

      const resultado = parseUrlFiltros(params);

      expect(resultado.pagina).toBe(3);
      expect(resultado.limite).toBe(50);
      expect(resultado.filtro).toBe('indefinidos');
      expect(resultado.classificacao).toBe('PESSOAL');
      expect(resultado.tipo).toBe('ENTRADA');
      expect(resultado.busca).toBe('cafe');
    });

    describe('validação de pagina', () => {
      it('rejeita pagina não-numérica, usa default 1', () => {
        const params = new URLSearchParams({ pagina: 'batata' });
        const resultado = parseUrlFiltros(params);
        expect(resultado.pagina).toBe(1);
      });

      it('rejeita pagina zero, usa default 1', () => {
        const params = new URLSearchParams({ pagina: '0' });
        const resultado = parseUrlFiltros(params);
        expect(resultado.pagina).toBe(1);
      });

      it('rejeita pagina negativa, usa default 1', () => {
        const params = new URLSearchParams({ pagina: '-5' });
        const resultado = parseUrlFiltros(params);
        expect(resultado.pagina).toBe(1);
      });

      it('trunca pagina decimal para inteiro', () => {
        const params = new URLSearchParams({ pagina: '3.9' });
        const resultado = parseUrlFiltros(params);
        expect(resultado.pagina).toBe(3);
      });

      it('rejeita NaN (resultado de Number()), usa default 1', () => {
        const params = new URLSearchParams({ pagina: 'null' });
        const resultado = parseUrlFiltros(params);
        expect(resultado.pagina).toBe(1);
      });

      it('rejeita Infinity, usa default 1', () => {
        const params = new URLSearchParams({ pagina: 'Infinity' });
        const resultado = parseUrlFiltros(params);
        expect(resultado.pagina).toBe(1);
      });

      it('aceita grandes números (1000000)', () => {
        const params = new URLSearchParams({ pagina: '1000000' });
        const resultado = parseUrlFiltros(params);
        expect(resultado.pagina).toBe(1000000);
      });

      it('ignora espaços em branco com trim()', () => {
        const params = new URLSearchParams({ pagina: '  5  ' });
        const resultado = parseUrlFiltros(params);
        expect(resultado.pagina).toBe(5);
      });
    });

    describe('validação de limite', () => {
      it('rejeita limites não permitidos, usa default 25', () => {
        const params = new URLSearchParams({ limite: '30' });
        const resultado = parseUrlFiltros(params);
        expect(resultado.limite).toBe(25);
      });

      it('rejeita limite inválido (999999), usa default 25', () => {
        const params = new URLSearchParams({ limite: '999999' });
        const resultado = parseUrlFiltros(params);
        expect(resultado.limite).toBe(25);
      });

      it('aceita limite 25', () => {
        const params = new URLSearchParams({ limite: '25' });
        const resultado = parseUrlFiltros(params);
        expect(resultado.limite).toBe(25);
      });

      it('aceita limite 50', () => {
        const params = new URLSearchParams({ limite: '50' });
        const resultado = parseUrlFiltros(params);
        expect(resultado.limite).toBe(50);
      });

      it('aceita limite 100', () => {
        const params = new URLSearchParams({ limite: '100' });
        const resultado = parseUrlFiltros(params);
        expect(resultado.limite).toBe(100);
      });

      it('rejeita limite não-numérico, usa default 25', () => {
        const params = new URLSearchParams({ limite: 'abc' });
        const resultado = parseUrlFiltros(params);
        expect(resultado.limite).toBe(25);
      });

      it('rejeita limite negativo, usa default 25', () => {
        const params = new URLSearchParams({ limite: '-50' });
        const resultado = parseUrlFiltros(params);
        expect(resultado.limite).toBe(25);
      });

      it('ignora espaços em branco com trim()', () => {
        const params = new URLSearchParams({ limite: '  50  ' });
        const resultado = parseUrlFiltros(params);
        expect(resultado.limite).toBe(50);
      });
    });

    describe('validação de filtro', () => {
      it('rejeita filtro inválido, usa default "todos"', () => {
        const params = new URLSearchParams({ filtro: 'invalido' });
        const resultado = parseUrlFiltros(params);
        expect(resultado.filtro).toBe('todos');
      });

      it('aceita "todos"', () => {
        const params = new URLSearchParams({ filtro: 'todos' });
        const resultado = parseUrlFiltros(params);
        expect(resultado.filtro).toBe('todos');
      });

      it('aceita "indefinidos"', () => {
        const params = new URLSearchParams({ filtro: 'indefinidos' });
        const resultado = parseUrlFiltros(params);
        expect(resultado.filtro).toBe('indefinidos');
      });

      it('rejeita com case sensitivity incorreta, usa default', () => {
        const params = new URLSearchParams({ filtro: 'INDEFINIDOS' });
        const resultado = parseUrlFiltros(params);
        expect(resultado.filtro).toBe('todos');
      });

      it('ignora espaços com trim()', () => {
        const params = new URLSearchParams({ filtro: '  indefinidos  ' });
        const resultado = parseUrlFiltros(params);
        expect(resultado.filtro).toBe('indefinidos');
      });
    });

    describe('validação de classificacao', () => {
      it('rejeita classificacao inválida, usa default "TODAS"', () => {
        const params = new URLSearchParams({ classificacao: 'INVALIDA' });
        const resultado = parseUrlFiltros(params);
        expect(resultado.classificacao).toBe('TODAS');
      });

      it('aceita "PESSOAL"', () => {
        const params = new URLSearchParams({ classificacao: 'PESSOAL' });
        const resultado = parseUrlFiltros(params);
        expect(resultado.classificacao).toBe('PESSOAL');
      });

      it('aceita "EMPRESA"', () => {
        const params = new URLSearchParams({ classificacao: 'EMPRESA' });
        const resultado = parseUrlFiltros(params);
        expect(resultado.classificacao).toBe('EMPRESA');
      });

      it('aceita "INDEFINIDO"', () => {
        const params = new URLSearchParams({ classificacao: 'INDEFINIDO' });
        const resultado = parseUrlFiltros(params);
        expect(resultado.classificacao).toBe('INDEFINIDO');
      });

      it('normaliza case com toUpperCase()', () => {
        const params = new URLSearchParams({ classificacao: 'pessoal' });
        const resultado = parseUrlFiltros(params);
        expect(resultado.classificacao).toBe('PESSOAL');
      });

      it('ignora espaços com trim()', () => {
        const params = new URLSearchParams({ classificacao: '  EMPRESA  ' });
        const resultado = parseUrlFiltros(params);
        expect(resultado.classificacao).toBe('EMPRESA');
      });
    });

    describe('validação de tipo', () => {
      it('rejeita tipo inválido, usa default "TODOS"', () => {
        const params = new URLSearchParams({ tipo: 'INVALIDO' });
        const resultado = parseUrlFiltros(params);
        expect(resultado.tipo).toBe('TODOS');
      });

      it('aceita "ENTRADA"', () => {
        const params = new URLSearchParams({ tipo: 'ENTRADA' });
        const resultado = parseUrlFiltros(params);
        expect(resultado.tipo).toBe('ENTRADA');
      });

      it('aceita "SAIDA"', () => {
        const params = new URLSearchParams({ tipo: 'SAIDA' });
        const resultado = parseUrlFiltros(params);
        expect(resultado.tipo).toBe('SAIDA');
      });

      it('normaliza case com toUpperCase()', () => {
        const params = new URLSearchParams({ tipo: 'entrada' });
        const resultado = parseUrlFiltros(params);
        expect(resultado.tipo).toBe('ENTRADA');
      });

      it('ignora espaços com trim()', () => {
        const params = new URLSearchParams({ tipo: '  SAIDA  ' });
        const resultado = parseUrlFiltros(params);
        expect(resultado.tipo).toBe('SAIDA');
      });
    });

    describe('validação de busca', () => {
      it('retorna string vazia como default', () => {
        const params = new URLSearchParams();
        const resultado = parseUrlFiltros(params);
        expect(resultado.busca).toBe('');
      });

      it('preserva termos de busca simples', () => {
        const params = new URLSearchParams({ busca: 'medicamentos' });
        const resultado = parseUrlFiltros(params);
        expect(resultado.busca).toBe('medicamentos');
      });

      it('ignora espaços com trim()', () => {
        const params = new URLSearchParams({ busca: '  cafe com leite  ' });
        const resultado = parseUrlFiltros(params);
        expect(resultado.busca).toBe('cafe com leite');
      });

      it('preserva caracteres especiais em busca', () => {
        const params = new URLSearchParams({ busca: 'R$ 100,00' });
        const resultado = parseUrlFiltros(params);
        expect(resultado.busca).toBe('R$ 100,00');
      });

      it('permite busca com números', () => {
        const params = new URLSearchParams({ busca: '123456' });
        const resultado = parseUrlFiltros(params);
        expect(resultado.busca).toBe('123456');
      });
    });

    it('combina múltiplos parâmetros válidos e inválidos', () => {
      const params = new URLSearchParams({
        pagina: '2',
        limite: 'invalido',
        filtro: 'indefinidos',
        classificacao: 'empresa',
        tipo: 'SAIDA',
        busca: 'teste',
      });

      const resultado = parseUrlFiltros(params);

      expect(resultado.pagina).toBe(2);
      expect(resultado.limite).toBe(25); // default (invalido)
      expect(resultado.filtro).toBe('indefinidos');
      expect(resultado.classificacao).toBe('EMPRESA'); // normalizou lowercase
      expect(resultado.tipo).toBe('SAIDA');
      expect(resultado.busca).toBe('teste');
    });
  });

  describe('serializarFiltros', () => {
    it('retorna URLSearchParams vazio para valores defaults', () => {
      const filtros = obterFiltrosPadroes();
      const params = serializarFiltros(filtros);

      expect(params.toString()).toBe('');
    });

    it('inclui apenas valores diferentes dos defaults', () => {
      const filtros: FiltrosListagem = {
        pagina: 2,
        limite: 25,
        filtro: 'todos',
        classificacao: 'PESSOAL',
        tipo: 'TODOS',
        busca: '',
      };

      const params = serializarFiltros(filtros);
      const str = params.toString();

      expect(str).toContain('pagina=2');
      expect(str).toContain('classificacao=PESSOAL');
      expect(str).not.toContain('limite');
      expect(str).not.toContain('filtro');
      expect(str).not.toContain('tipo');
      expect(str).not.toContain('busca');
    });

    it('serializa todos os valores customizados', () => {
      const filtros: FiltrosListagem = {
        pagina: 5,
        limite: 50,
        filtro: 'indefinidos',
        classificacao: 'EMPRESA',
        tipo: 'ENTRADA',
        busca: 'pharmacy',
      };

      const params = serializarFiltros(filtros);
      const str = params.toString();

      expect(str).toContain('pagina=5');
      expect(str).toContain('limite=50');
      expect(str).toContain('filtro=indefinidos');
      expect(str).toContain('classificacao=EMPRESA');
      expect(str).toContain('tipo=ENTRADA');
      expect(str).toContain('busca=pharmacy');
    });

    it('omite busca quando vazia', () => {
      const filtros: FiltrosListagem = {
        pagina: 1,
        limite: 25,
        filtro: 'indefinidos',
        classificacao: 'TODAS',
        tipo: 'TODOS',
        busca: '',
      };

      const params = serializarFiltros(filtros);
      expect(params.toString()).not.toContain('busca');
    });

    it('inclui busca quando preenchida', () => {
      const filtros: FiltrosListagem = {
        ...obterFiltrosPadroes(),
        busca: 'supermercado',
      };

      const params = serializarFiltros(filtros);
      expect(params.toString()).toContain('busca=supermercado');
    });

    it('encoda URL corretamente para caracteres especiais', () => {
      const filtros: FiltrosListagem = {
        ...obterFiltrosPadroes(),
        busca: 'café com leite',
      };

      const params = serializarFiltros(filtros);
      const str = params.toString();

      // URLSearchParams auto-encoda
      expect(str).toContain('busca=');
      expect(params.get('busca')).toBe('café com leite');
    });
  });

  describe('round-trip: parse → serialize → parse', () => {
    it('preserva valores válidos em ciclo completo', () => {
      const filtrosOriginal: FiltrosListagem = {
        pagina: 3,
        limite: 50,
        filtro: 'indefinidos',
        classificacao: 'PESSOAL',
        tipo: 'SAIDA',
        busca: 'medicamento',
      };

      // Serializar
      const params = serializarFiltros(filtrosOriginal);
      const searchParams = new URLSearchParams(params);

      // Parse novamente
      const filtrosRestaurado = parseUrlFiltros(searchParams);

      expect(filtrosRestaurado).toEqual(filtrosOriginal);
    });

    it('defaults normalizam valores inválidos em ciclo completo', () => {
      const params = new URLSearchParams({
        pagina: 'xyz',
        limite: '999',
        filtro: 'invalido',
        classificacao: 'WRONGENUM',
        tipo: 'bad',
        busca: '  ',
      });

      // Parse (normaliza para defaults)
      const filtros1 = parseUrlFiltros(params);

      // Serializar (omite defaults)
      const paramsSerialized = serializarFiltros(filtros1);
      const searchParams2 = new URLSearchParams(paramsSerialized);

      // Parse novamente
      const filtros2 = parseUrlFiltros(searchParams2);

      expect(filtros2).toEqual(obterFiltrosPadroes());
    });
  });

  describe('obterFiltrosPadroes', () => {
    it('retorna objeto com valores padrão', () => {
      const defaults = obterFiltrosPadroes();

      expect(defaults).toEqual({
        pagina: 1,
        limite: 25,
        filtro: 'todos',
        classificacao: 'TODAS',
        tipo: 'TODOS',
        busca: '',
      });
    });

    it('retorna nova instância a cada chamada', () => {
      const defaults1 = obterFiltrosPadroes();
      const defaults2 = obterFiltrosPadroes();

      expect(defaults1).not.toBe(defaults2);
      expect(defaults1).toEqual(defaults2);
    });

    it('permite mutação sem afetar futuras chamadas', () => {
      const defaults = obterFiltrosPadroes();
      defaults.pagina = 999;

      const novoDefaults = obterFiltrosPadroes();
      expect(novoDefaults.pagina).toBe(1);
    });
  });

  describe('segurança e edge cases', () => {
    it('rejeita query injection via pagina', () => {
      const params = new URLSearchParams({
        pagina: "'; DROP TABLE users; --",
      });
      const resultado = parseUrlFiltros(params);

      // Deve ser 1 (default), não executar SQL
      expect(resultado.pagina).toBe(1);
    });

    it('rejeita XSS em busca (preserva como string)', () => {
      const params = new URLSearchParams({
        busca: '<script>alert("xss")</script>',
      });
      const resultado = parseUrlFiltros(params);

      // A função retorna como string pura, sem sanitização
      // (sanitização é responsabilidade do contexto de renderização)
      expect(resultado.busca).toBe('<script>alert("xss")</script>');
    });

    it('lida com parâmetro vazio sem erro', () => {
      const params = new URLSearchParams({ pagina: '', limite: '' });
      const resultado = parseUrlFiltros(params);

      expect(resultado.pagina).toBe(1);
      expect(resultado.limite).toBe(25);
    });

    it('lida com parâmetro null sem erro', () => {
      const params = new URLSearchParams();
      params.append('pagina', 'null');
      const resultado = parseUrlFiltros(params);

      expect(resultado.pagina).toBe(1);
    });

    it('lida com valores booleanos como string', () => {
      const params = new URLSearchParams({ pagina: 'true' });
      const resultado = parseUrlFiltros(params);

      expect(resultado.pagina).toBe(1); // NaN → 1
    });

    it('lida com valores undefined (URLSearchParams retorna null)', () => {
      const params = new URLSearchParams();
      // .get() retorna null se não existir
      const resultado = parseUrlFiltros(params);

      expect(resultado).toBeDefined();
      expect(resultado.pagina).toBe(1);
    });
  });
});
