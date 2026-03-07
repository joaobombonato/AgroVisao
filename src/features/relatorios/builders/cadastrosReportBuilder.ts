/**
 * Builder: Dados para Relatório de Cadastros (Multi-aba)
 * Extraído de useRelatorios.ts para melhor manutenção.
 */
import { U } from '../../../utils';
import { REPORT_COLUMNS } from '../config/reportColumns';

export function buildCadastrosData(state: any, selectedTypes: string[]) {
  const data: Record<string, any[][]> = {};
  const rawData: Record<string, any[]> = {};
  const columns: Record<string, string[]> = {};

  const listas = state.listas || {};

  if (selectedTypes.includes('Membros_e_Colaboradores')) {
      const eqKeys = 'Equipe e Colaboradores';
      const equipe = state.equipe || [];
      const colaboradores = listas.colaboradores || [];
      
      const aggregated: any[] = [];
      if (Array.isArray(equipe)) {
        equipe.forEach((m: any) => {
          aggregated.push({
            nome: m.nome,
            cargo: m.funcao || m.cargo || 'Membro da Equipe',
            tipo: 'Acesso ao Sistema',
            contato: m.telefone || m.celular || 'Não informado',
            nascimento: m.data_nascimento ? U.formatDate(m.data_nascimento) : 'Não informado',
            status: m.status || m.ativo === false ? 'Ex-membro/Inativo' : 'Ativo'
          });
        });
      }
      if (Array.isArray(colaboradores)) {
        colaboradores.forEach((c: any) => {
          aggregated.push({
            nome: c.nome,
            cargo: c.funcao || c.cargo || 'Colaborador',
            tipo: 'Trabalhador de Campo',
            contato: c.telefone || c.celular || 'Não informado',
            nascimento: c.data_nascimento ? U.formatDate(c.data_nascimento) : 'Não informado',
            status: c.status || c.ativo === false ? 'Ex-colaborador/Inativo' : 'Ativo'
          });
        });
      }
      aggregated.sort((a, b) => (a.nome || '').localeCompare(b.nome || ''));
      
      columns[eqKeys] = ['Nome', 'Função/Cargo', 'Tipo', 'Telefone/Contato', 'Data Nasc.', 'Status'];
      data[eqKeys] = aggregated.map(row => [row.nome, row.cargo, row.tipo, row.contato, row.nascimento, row.status]);
      rawData[eqKeys] = aggregated.map(row => ({
        'Nome': row.nome,
        'Função/Cargo': row.cargo,
        'Tipo': row.tipo,
        'Telefone/Contato': row.contato,
        'Data Nasc.': row.nascimento,
        'Status': row.status
      }));
  }

  if (selectedTypes.includes('Maquinas_e_Veiculos')) {
      const maqKeys = 'Máquinas e Veículos';
      const source = state.ativos?.maquinas || [];
      
      const maqDef = REPORT_COLUMNS['cadastros']?.find(c => c.key === 'Maquinas_e_Veiculos');
      const subCols = maqDef?.subColumns?.filter(sub => selectedTypes.includes(sub.key)) || [];
      
      if (subCols.length > 0) {
        columns[maqKeys] = subCols.map(sub => sub.label);
        
        data[maqKeys] = source.map((m: any) => {
            return subCols.map(sub => {
                switch(sub.key) {
                  case 'identificacao_resumo': return `${m.nome} - ${m.fabricante || '-'} - ${m.descricao || '-'}`;
                  case 'status': return m.status || 'Ativo';
                  case 'ultimo_horimetro_km': return m.ultimo_horimetro_km || '-';
                  case 'proxima_revisao': return m.proxima_revisao || '-';
                  case 'dados_compra': {
                    const parts = [];
                    if (m.data_compra || m.data_aquisicao) parts.push(`Data: ${U.formatDate(m.data_compra || m.data_aquisicao)}`);
                    if (m.valor_pago || m.valor_aquisicao) {
                      const val = m.valor_pago || m.valor_aquisicao;
                      parts.push(`Valor: R$ ${U.formatValue(val)}`);
                    }
                    if (m.fornecedor) parts.push(`Forn: ${m.fornecedor}`);
                    return parts.length > 0 ? parts.join(' | ') : '-';
                  }
                  case 'situacao_financeira': {
                    let base = m.situacao_financeira || '-';
                    if (base === 'Alienado' || base === 'Financiado (liquidado)') {
                         const details = [];
                         if (m.banco_alienacao) details.push(`Banco: ${m.banco_alienacao}`);
                         if (m.data_final_alienacao) details.push(`Venc: ${U.formatDate(m.data_final_alienacao)}`);
                         if (m.numero_contrato) details.push(`Contr: ${m.numero_contrato}`);
                         if (details.length > 0) base += ` (${details.join(' | ')})`;
                    }
                    return base;
                  }
                  default: return '-';
                }
            });
        });
        
        rawData[maqKeys] = source.map((m: any) => {
            const row: Record<string, any> = {};
            subCols.forEach(sub => {
                let val: any = '-';
                switch(sub.key) {
                  case 'identificacao_resumo': val = `${m.nome} - ${m.fabricante || '-'} - ${m.descricao || '-'}`; break;
                  case 'status': val = m.status || 'Ativo'; break;
                  case 'ultimo_horimetro_km': val = m.ultimo_horimetro_km || '-'; break;
                  case 'proxima_revisao': val = m.proxima_revisao || '-'; break;
                  case 'dados_compra': {
                    const parts = [];
                    if (m.data_compra || m.data_aquisicao) parts.push(`Data: ${U.formatDate(m.data_compra || m.data_aquisicao)}`);
                    if (m.valor_pago || m.valor_aquisicao) {
                       const vP = m.valor_pago || m.valor_aquisicao;
                       parts.push(`Valor: R$ ${U.formatValue(vP)}`);
                    }
                    if (m.fornecedor) parts.push(`Forn: ${m.fornecedor}`);
                    val = parts.length > 0 ? parts.join(' | ') : '-';
                    break;
                  }
                  case 'situacao_financeira': {
                    let baseVal = m.situacao_financeira || '-';
                    if (baseVal === 'Alienado' || baseVal === 'Financiado (liquidado)') {
                         const dts = [];
                         if (m.banco_alienacao) dts.push(`Banco: ${m.banco_alienacao}`);
                         if (m.data_final_alienacao) dts.push(`Venc: ${U.formatDate(m.data_final_alienacao)}`);
                         if (m.numero_contrato) dts.push(`Contr: ${m.numero_contrato}`);
                         if (dts.length > 0) baseVal += ` (${dts.join(' | ')})`;
                    }
                    val = baseVal;
                    break;
                  }
                }
                row[sub.label] = val;
            });
            return row;
        });
      }
  }

  if (selectedTypes.includes('Produtos_de_Manutencao')) {
      const peKeys = 'Produtos de Manutenção';
      const source = listas.pecas || [];
      columns[peKeys] = ['Nome do Produto', 'Categoria', 'Saldo Estoque'];
      data[peKeys] = source.map((p: any) => [p.nome, p.categoria || '-', p.estoque?.quantidade || 0]);
      rawData[peKeys] = source.map((p: any) => ({
          'Nome do Produto': p.nome,
          'Categoria': p.categoria || '-',
          'Fornecedor Fav.': p.fornecedor || '',
          'Saldo Estoque': p.estoque?.quantidade || 0,
          'Local/Prateleira': p.estoque?.localizacao || ''
      }));
  }

  if (selectedTypes.includes('Talhoes_e_Areas')) {
      const talKeys = 'Talhões';
      const source = listas.talhoes || [];
      columns[talKeys] = ['Nome do Talhão', 'Cultura', 'Área (Hectares)', 'Safra'];
      data[talKeys] = source.map((t: any) => [t.id, t.cultura || '-', t.area || 0, t.safra || '-']);
      rawData[talKeys] = source.map((t: any) => ({
          'Nome do Talhão': t.id,
          'Cultura': t.cultura || '-',
          'Classe Agronomica': t.classe || '',
          'Área (Hectares)': t.area || 0,
          'Safra': t.safra || '-',
          'Possui Geo': t.geojson ? 'Sim' : 'Não'
      }));
  }

  if (selectedTypes.includes('Insumos_Agricolas')) {
      const insKeys = 'Insumos Agrícolas';
      const source = listas.insumos || [];
      columns[insKeys] = ['Nome do Insumo', 'Finalidade', 'Dosagem Est.', 'Unidade'];
      data[insKeys] = source.map((i: any) => [i.nome, i.categoria || '-', i.dosagem || 0, i.unidade || '-']);
      rawData[insKeys] = source.map((i: any) => ({
          'Nome do Insumo': i.nome,
          'Finalidade': i.categoria || '-',
          'Componente/Principio': i.principio || '',
          'Dosagem Est.': i.dosagem || 0,
          'Unidade': i.unidade || '-'
      }));
  }

  if (selectedTypes.includes('Medidores_Energia')) {
      const medKeys = 'Medidores de Energia';
      const source = state.ativos?.pontosEnergia || [];
      columns[medKeys] = ['Medidor (Nome)', 'Tipo de Medição', 'Constante', 'Meta Mensal kWh'];
      data[medKeys] = source.map((m: any) => [
        m.nome || m.id, 
        m.tipo_medicao || 'Padrao',
        m.constante_medidor || '1',
        m.meta_consumo || 0
      ]);
      rawData[medKeys] = source.map((m: any) => ({
          'Medidor (Nome)': m.nome || m.id,
          'Identificador Ext.': m.identificador_externo || '-',
          'Tipo de Medição': m.tipo_medicao || 'Padrao',
          'Constante': m.constante_medidor || '1',
          'Leitura Inicial 04': m.leitura_inicial_04 || 0,
          'Leitura Inicial 08': m.leitura_inicial_08 || 0,
          'Meta Mensal kWh': m.meta_consumo || 0
      }));
  }

  if (selectedTypes.includes('Pluviometros')) {
      const pluvKeys = 'Pluviômetros';
      const source = listas.estacoes_chuva || [];
      columns[pluvKeys] = ['Ponto de Coleta'];
      data[pluvKeys] = source.map((p: any) => [p.nome || p.id]);
      rawData[pluvKeys] = source.map((p: any) => ({
          'Ponto de Coleta': p.nome || p.id
      }));
  }

  if (selectedTypes.includes('Apolices_Seguros')) {
      const segKeys = 'Apólices e Seguros';
      const source = state.ativos?.seguros || [];
      columns[segKeys] = ['Apólice', 'Seguradora', 'Vencimento'];
      data[segKeys] = source.map((s: any) => [s.numero_apolice || '-', s.seguradora || '-', s.data_vencimento ? U.formatDate(s.data_vencimento) : '']);
      rawData[segKeys] = source.map((s: any) => ({
          'Apólice': s.numero_apolice || '-',
          'Seguradora': s.seguradora || '-',
          'Item Segurado': s.maquina_associada || 'Geral',
          'Vencimento': s.data_vencimento ? U.formatDate(s.data_vencimento) : '',
          'Valor Assegurado': s.valor_cobertura || 0
      }));
  }

  return { columns: columns as any, data, rawData };
}
