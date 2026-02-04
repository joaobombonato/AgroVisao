/**
 * useAppUtils - Hook para funções utilitárias do AppContext
 * 
 * Contém: parseNumber, buscarUltimaLeitura, estoqueCalculations
 */
import { useCallback, useMemo } from 'react';
import { U } from '../../utils';
import { ATIVOS_INICIAIS } from '../../constants';

interface UseAppUtilsParams {
  state: any;
}

export function useAppUtils({ state }: UseAppUtilsParams) {
  
  // Parser de números (PT-BR safe)
  const parseNumber = useCallback((s: any) => {
    if (!s) return 0;
    if (typeof s === 'number') return s;
    if (U && U.parseDecimal) return U.parseDecimal(s);
    const clean = String(s).replace(/[^\d.,-]/g, '').replace(',', '.');
    return parseFloat(clean) || 0;
  }, []);

  // Busca última leitura de um módulo
  const buscarUltimaLeitura = useCallback((modulo: string, filtroChave: string, filtroValor: string) => {
    const lista = state.dados[modulo] || [];
    const listaFiltrada = lista.filter((item: any) => filtroValor === '*' || item[filtroChave] === filtroValor).sort((a: any, b: any) => b.id - a.id);
    if (listaFiltrada[0]) return listaFiltrada[0];
    if ((modulo === 'abastecimentos' || modulo === 'manutencoes') && filtroChave === 'maquina') {
      const maq = (state.dbAssets.maquinas || []).find((m: any) => m.nome === filtroValor);
      if (maq && maq.horimetro_inicial) return { horimetroAtual: maq.horimetro_inicial, bombaFinal: '0' };
    }
    return null;
  }, [state.dados, state.dbAssets.maquinas]);

  // Cálculos de estoque
  const estoqueCalculations = useMemo(() => {
    const params = state.ativos.parametros?.estoque || ATIVOS_INICIAIS.parametros.estoque;
    const capacidade = parseNumber(params.capacidadeTanque);
    const minimo = parseNumber(params.estoqueMinimo);
    const ajuste = parseNumber(params.ajusteManual);
    const totalComprado = (state.dados.compras || []).reduce((s: number, i: any) => s + parseNumber(i.litros), 0);
    const totalUsado = (state.dados.abastecimentos || []).reduce((s: number, i: any) => s + parseNumber(i.qtd), 0);
    const atual = (totalComprado - totalUsado) + ajuste;
    return {
      estoqueAtual: atual, 
      nivelCritico: atual <= minimo, 
      estoqueMinimo: minimo,
      capacidadeTanque: capacidade, 
      percentual: capacidade > 0 ? ((atual / capacidade) * 100).toFixed(1) : "0"
    };
  }, [state.dados.compras, state.dados.abastecimentos, state.ativos.parametros, parseNumber]);

  return {
    parseNumber,
    buscarUltimaLeitura,
    estoqueCalculations
  };
}
