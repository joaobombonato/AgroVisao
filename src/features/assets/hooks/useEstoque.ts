// useEstoqueDiesel movido para src/features/fuel/hooks/useEstoqueDiesel.ts

import { useMemo } from 'react';
import { useAppContext } from '../../../context/AppContext';
import { U } from '../../../utils';

/**
 * useEstoqueProdutos - Hook para gerenciamento de estoque de produtos agrícolas
 * 
 * Centraliza o cálculo de estoque de defensivos, fertilizantes, etc.
 */
interface ProdutoEstoque {
  id: string;
  nome: string;
  unidade: string;
  estoqueAtual: number;
  estoqueMinimo: number;
  alertaCritico: boolean;
  status: 'ok' | 'baixo' | 'critico' | 'sem_estoque';
}

interface EstoqueProdutosReturn {
  produtos: ProdutoEstoque[];
  produtosCriticos: ProdutoEstoque[];
  produtosBaixos: ProdutoEstoque[];
  totalProdutos: number;
  totalCriticos: number;
}

export function useEstoqueProdutos(): EstoqueProdutosReturn {
  const { dbAssets, dados } = useAppContext();

  const produtos = useMemo(() => {
    const listaProdutos = dbAssets.produtos || [];
    const entradas = dados?.entradas_estoque || [];
    const saidas = dados?.saidas_estoque || [];

    return listaProdutos.map((prod: any): ProdutoEstoque => {
      // Calcular entradas para este produto
      const totalEntradas = entradas
        .filter((e: any) => e.produto === prod.nome)
        .reduce((acc: number, e: any) => acc + U.parseDecimal(e.quantidade), 0);

      // Calcular saídas para este produto
      const totalSaidas = saidas
        .filter((s: any) => s.produto === prod.nome)
        .reduce((acc: number, s: any) => acc + U.parseDecimal(s.quantidade), 0);

      const estoqueAtual = totalEntradas - totalSaidas;
      const estoqueMinimo = U.parseDecimal(prod.estoque_minimo);
      const alertaCritico = estoqueAtual <= estoqueMinimo;

      let status: 'ok' | 'baixo' | 'critico' | 'sem_estoque' = 'ok';
      if (estoqueAtual <= 0) status = 'sem_estoque';
      else if (estoqueAtual <= estoqueMinimo) status = 'critico';
      else if (estoqueAtual <= estoqueMinimo * 1.25) status = 'baixo';

      return {
        id: prod.id,
        nome: prod.nome,
        unidade: prod.unidade || 'un',
        estoqueAtual,
        estoqueMinimo,
        alertaCritico,
        status
      };
    });
  }, [dbAssets.produtos, dados?.entradas_estoque, dados?.saidas_estoque]);

  const produtosCriticos = produtos.filter((p: ProdutoEstoque) => p.status === 'critico' || p.status === 'sem_estoque');
  const produtosBaixos = produtos.filter((p: ProdutoEstoque) => p.status === 'baixo');

  return {
    produtos,
    produtosCriticos,
    produtosBaixos,
    totalProdutos: produtos.length,
    totalCriticos: produtosCriticos.length
  };
}
