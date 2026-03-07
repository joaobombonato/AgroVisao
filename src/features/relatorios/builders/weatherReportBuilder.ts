/**
 * Builder: Dados para Relatório de Chuvas
 * Extraído de useRelatorios.ts para melhor manutenção.
 */
import { U } from '../../../utils';

export function buildChuvasData(dados: any) {
  const registros = dados.chuvas || [];
  const columns = ['Data', 'Estação', 'Milímetros'];
  const data = registros.map((r: any) => [
    U.formatDate(r.data_chuva || r.data),
    r.ponto_nome || r.estacao || 'Geral',
    `${U.formatValue(r.milimetros)} mm`
  ]);
  const rawData = registros.map((r: any) => ({
    Data: U.formatDate(r.data_chuva || r.data),
    Estacao: r.ponto_nome || r.estacao || 'Geral',
    Milimetros: U.parseDecimal(r.milimetros)
  }));
  return { columns, data, rawData };
}
