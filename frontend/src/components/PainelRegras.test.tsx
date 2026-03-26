import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PainelRegras } from './PainelRegras';

const hookMock = vi.hoisted(() => ({
  useRegras: vi.fn(),
}));

vi.mock('../hooks/useRegras', () => hookMock);

describe('PainelRegras', () => {
  const criar = vi.fn();
  const atualizar = vi.fn();
  const deletar = vi.fn();

  beforeEach(() => {
    criar.mockReset();
    atualizar.mockReset();
    deletar.mockReset();

    hookMock.useRegras.mockReturnValue({
      regras: [
        {
          id: 1,
          palavraChave: 'IFOOD',
          categoria: 'PESSOAL',
          subCategoria: 'Alimentação',
          prioridade: 1,
        },
      ],
      carregando: false,
      erro: null,
      criar,
      atualizar,
      deletar,
    });
  });

  it('abre modal de teste pelo botão dedicado', () => {
    // Garante que o fluxo novo de diagnóstico esteja acessível na UI da página de regras.
    render(<PainelRegras />);

    fireEvent.click(screen.getByRole('button', { name: 'Abrir Teste de Regras' }));

    expect(screen.getByText('Teste de Regras')).toBeInTheDocument();
  });

  it('pede confirmação antes de excluir regra', async () => {
    render(<PainelRegras />);

    fireEvent.click(screen.getAllByTitle('Excluir')[0]!);

    expect(screen.getByText('Confirmar exclusão')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Apagar linha' }));

    expect(deletar).toHaveBeenCalledWith(1);
  });

  it('mantém classe de layout sem scroll horizontal em desktop/tablet', () => {
    render(<PainelRegras />);

    // Verifica o contrato de layout: em desktop/tablet usamos md:overflow-visible.
    const tabelaContainer = document.querySelector('div.overflow-x-auto.rounded-xl.border.border-gray-200.md\\:overflow-visible');

    expect(tabelaContainer).not.toBeNull();
  });
});
