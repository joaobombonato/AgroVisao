/**
 * useEstoqueDiesel - Hook para gerenciamento de estoque de diesel
 * 
 * Centraliza toda a lógica de cálculo e verificação de estoque de combustível
 * Usado em: AbastecimentoScreen, DashboardScreen, e alertas automáticos
 */
import { useMemo } from 'react';
import { useAppContext } from '../../../context/AppContext';
import { U } from '../../../utils';

interface EstoqueDieselReturn {
  // Valores calculados
  estoqueAtual: number;
  estoqueMinimo: number;
  estoqueInicial: number;
  capacidadeTanque: number;
  totalComprado: number;
  totalUsado: number;
  percentualTanque: number;
  
  // Estados
  nivelCritico: boolean;
  nivelBaixo: boolean; // Entre mínimo e 25% acima do mínimo
  
  // Utilitários
  calcularEstoqueApos: (litrosUsados: number) => number;
  verificarNivelCritico: (litrosUsados: number) => boolean;
}

export function useEstoqueDiesel(): EstoqueDieselReturn {
  const { ativos, dados } = useAppContext();

  // Parâmetros de estoque
  const pEstoque = ativos.parametros?.estoque || {};
  const estoqueInicial = pEstoque.ajusteManual !== '' ? U.parseDecimal(pEstoque.ajusteManual) : 0;
  const estoqueMinimo = pEstoque.estoqueMinimo !== '' ? U.parseDecimal(pEstoque.estoqueMinimo) : 0;
  const capacidadeTanque = pEstoque.capacidadeTanque !== '' ? U.parseDecimal(pEstoque.capacidadeTanque) : 0;

  // Cálculos de movimentação
  const totalComprado = useMemo(() => 
    (dados?.compras || []).reduce((s: number, i: any) => s + U.parseDecimal(i.litros), 0), 
    [dados?.compras]
  );
  
  const totalUsado = useMemo(() => 
    (dados?.abastecimentos || []).reduce((s: number, i: any) => s + U.parseDecimal(i.qtd), 0), 
    [dados?.abastecimentos]
  );

  // Estoque atual
  const estoqueAtual = estoqueInicial + totalComprado - totalUsado;
  
  // Percentual do tanque (0-100)
  const percentualTanque = capacidadeTanque > 0 
    ? Math.min(((estoqueAtual / capacidadeTanque) * 100), 100) 
    : 0;

  // Estados de alerta
  const nivelCritico = estoqueAtual <= estoqueMinimo;
  const nivelBaixo = estoqueAtual > estoqueMinimo && estoqueAtual <= estoqueMinimo * 1.25;

  // Funções utilitárias
  const calcularEstoqueApos = (litrosUsados: number): number => {
    return estoqueAtual - litrosUsados;
  };

  const verificarNivelCritico = (litrosUsados: number): boolean => {
    return calcularEstoqueApos(litrosUsados) <= estoqueMinimo;
  };

  return {
    estoqueAtual,
    estoqueMinimo,
    estoqueInicial,
    capacidadeTanque,
    totalComprado,
    totalUsado,
    percentualTanque,
    nivelCritico,
    nivelBaixo,
    calcularEstoqueApos,
    verificarNivelCritico
  };
}
