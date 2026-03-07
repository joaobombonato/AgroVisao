/**
 * Builder: Dados para Relatório de Ordens de Serviço
 * Extraído de useRelatorios.ts para melhor manutenção.
 */
import { U } from '../../../utils';

export function buildOSData(osData: any[], ativos: any, dateStart: string, dateEnd: string) {
  const osFiltered = (osData || []).filter((o: any) => {
    const d = (o.data_abertura || o.data || '').slice(0, 10);
    return d >= dateStart && d <= dateEnd;
  });

  // Ordenação ascendente prioritariamente por Número da OS (se existir) e data
  osFiltered.sort((a: any, b: any) => {
    const da = a.data_abertura || a.data || '';
    const db = b.data_abertura || b.data || '';
    
    // Se ambos tem número, ordena pelo número
    if (a.numero && b.numero) {
        const numA = parseInt(String(a.numero).replace(/\D/g, ''), 10) || 0;
        const numB = parseInt(String(b.numero).replace(/\D/g, ''), 10) || 0;
        if (numA !== numB) return numA - numB;
    }
    
    // Fallback para a string de data
    return da.localeCompare(db);
  });

  const columns = ['Data', 'Número O.S.', 'Módulo', 'Descrição', 'Status', 'Referência'];

  const groupedData: Record<string, any[][]> = { Pendentes: [], Confirmadas: [], Canceladas: [] };
  const groupedRawData: Record<string, any[]> = { Pendentes: [], Confirmadas: [], Canceladas: [] };
  const groupedCusto: Record<string, number> = { Pendentes: 0, Confirmadas: 0, Canceladas: 0 };

  osFiltered.forEach((o: any) => {
    let refInfo = '-';
    let addInfo = '-';
    let custoInfo: number | string = 0;
    
    // Define group
    let groupMap = 'Pendentes';
    if (o.status === 'Confirmado' || o.status === 'Confirmada') groupMap = 'Confirmadas';
    else if (o.status === 'Cancelado' || o.status === 'Cancelada') groupMap = 'Canceladas';

    if (o.detalhes) {
        let curCusto = U.parseDecimal(o.detalhes['Custo'] || o.detalhes['Custo R$'] || o.detalhes['Valor'] || 0);
        custoInfo = curCusto;
        groupedCusto[groupMap] += curCusto;

        // Referência Genérica
        let refValue = o.detalhes['Máquina'] || o.detalhes['Fornecedor'] || o.detalhes['Cozinha'] || o.detalhes['Bomba'] || o.detalhes['Ponto'] || o.detalhes['Estação'] || o.detalhes['Produto'];
        
        // Enriquecer caso seja Máquina
        if (o.detalhes['Máquina'] && ativos?.maquinas) {
            const machineId = o.maquina_id || o.asset_id;
            const machine = ativos.maquinas.find((m: any) => 
                (machineId && m.id === machineId) || 
                m.nome?.trim().toLowerCase() === String(refValue).trim().toLowerCase() ||
                m.id === String(refValue)
            );
            if (machine) {
                refValue = `${machine.nome || refValue}${machine.fabricante ? ` - ${machine.fabricante}` : ''}${machine.descricao ? ` - ${machine.descricao}` : ''}`;
            }
        }
        if (refValue) refInfo = refValue;
        
        // Info Adicional Genérica
        const ad1 = o.detalhes['Horímetro Atual'] || o.detalhes['Horímetro'] || o.detalhes['KM/H Final'] || o.detalhes['KM/H Inicial'];
        const ad2 = o.detalhes['Tipo '] || o.detalhes['Tipo'] || o.detalhes['Atividade'] || o.detalhes['Milímetros'];
        const ad3 = o.detalhes['Quantidade'] || o.detalhes['Litros'];

        if (ad1) addInfo = ad1;
        else if (ad2 && ad3) addInfo = `${ad2} - ${ad3}`;
        else if (ad2) addInfo = ad2;
        else if (ad3) addInfo = String(ad3);
    }

    const arrData = [
      U.formatDate(o.data_abertura || o.data),
      o.numero ? `#${o.numero}` : o.id.slice(0, 8).toUpperCase(),
      o.modulo || 'Geral',
      o.descricao,
      o.status,
      refInfo
    ];

    const rawObj = {
      'Data': U.formatDate(o.data_abertura || o.data),
      'Número O.S.': o.numero ? `#${o.numero}` : o.id.slice(0, 8).toUpperCase(),
      'Módulo': o.modulo || 'Geral',
      'Descrição': o.descricao,
      'Status': o.status,
      'Referência': refInfo
    };

    groupedData[groupMap].push(arrData);
    groupedRawData[groupMap].push(rawObj);
  });

  const totalsRow: Record<string, string[]> = {};
  ['Pendentes', 'Confirmadas', 'Canceladas'].forEach(g => {
    totalsRow[g] = [
        `${groupedData[g].length} O.S. no período`,
        '', '', '', '', ''
    ];
  });

  return { 
    columns, 
    data: groupedData, 
    rawData: groupedRawData, 
    summaryData: { totalsRow } 
  };
}
