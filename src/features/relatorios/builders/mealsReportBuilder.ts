/**
 * Builder: Dados para Relatório de Refeições
 * Extraído de useRelatorios.ts para melhor manutenção.
 */
import { U } from '../../../utils';

export function buildRefeicaoData(dados: any) {
  const registros = dados.refeicoes || [];
  const columns = ['Data', 'Fornecedor', 'Tipo', 'Qtd', 'Valor'];
  const data = registros.map((r: any) => [
    U.formatDate(r.data_refeicao || r.data),
    r.cozinha || r.fornecedor,
    r.tipo,
    r.quantidade || r.qtd,
    `R$ ${U.formatValue(r.valor || 0)}`
  ]);
  const rawData = registros.map((r: any) => ({
    Data: U.formatDate(r.data_refeicao || r.data),
    Fornecedor: r.cozinha || r.fornecedor,
    Tipo: r.tipo,
    Quantidade: r.quantidade || r.qtd,
    Valor: U.parseDecimal(r.valor || 0)
  }));
  return { columns, data, rawData };
}
