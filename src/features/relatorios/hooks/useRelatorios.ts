import { useState } from 'react';
import { toast } from 'react-hot-toast';
import { useAppContext } from '../../../context/AppContext';
import { fuelExportService } from '../services/fuelExportService';
import { osExportService } from '../services/osExportService';
import { weatherExportService } from '../services/weatherExportService';
import { teamExportService } from '../services/teamExportService';
import { registriesExportService } from '../services/registriesExportService';
import { mealsExportService } from '../services/mealsExportService';
import { U } from '../../../utils';
import {
  RELATORIOS,
  ABAST_KEY_MAP,
  ABAST_RAW_KEY_MAP,
  ABAST_COLUMN_STYLES,
  ABAST_TOTAL_COLS,
  OS_KEY_MAP,
  OS_RAW_KEY_MAP,
  OS_COLUMN_STYLES,
  OS_TOTAL_COLS,
  EQUIPE_KEY_MAP,
  EQUIPE_RAW_KEY_MAP,
  EQUIPE_COLUMN_STYLES,
  EQUIPE_TOTAL_COLS,
  CADASTROS_TOTAL_COLS
} from '../config/reportDefinitions';

// ==========================================
// HOOK: useRelatorios
// ==========================================

export default function useRelatorios() {
  const { setTela, state, fazendaSelecionada } = useAppContext();
  const [search, setSearch] = useState('');
  const [dateStart, setDateStart] = useState(U.todayIso().slice(0, 8) + '01');
  const [dateEnd, setDateEnd] = useState(U.todayIso());

  const [modalConfig, setModalConfig] = useState<{
    reportId: string;
    reportTitle: string;
    exportType: 'pdf' | 'excel';
  } | null>(null);

  // Filtro de busca
  const filtrados = RELATORIOS.filter(r =>
      r.titulo.toLowerCase().includes(search.toLowerCase()) ||
    r.desc.toLowerCase().includes(search.toLowerCase())
  );

  // Abre modal ao invés de exportar direto
  const openExportModal = (type: 'pdf' | 'excel', relId: string, titulo: string) => {
    setModalConfig({ reportId: relId, reportTitle: titulo, exportType: type });
  };

  // ==========================================
  // EXPORTAÇÃO PRINCIPAL
  // ==========================================
  const handleExport = async (type: 'pdf' | 'excel', relId: string, titulo: string, selectedColumns?: string[]) => {
    const loadingToast = toast.loading(`Preparando ${type.toUpperCase()}: ${titulo}...`);

    try {
      const { dados, ativos } = state;
      const fNome = fazendaSelecionada?.nome || state.fazendaNome || 'Fazenda';
      const logo = fazendaSelecionada?.logo_base64 || fazendaSelecionada?.config?.logo_base64 || '';
      const periodStr = `Período: ${U.formatDate(dateStart)} até ${U.formatDate(dateEnd)}`;

      let columns: string[] = [];
      let data: any[][] | Record<string, any[][]> = [];
      let rawData: any[] | Record<string, any[]> = [];
      let filename = titulo.replace(/\s+/g, '_');
      let summaryData: | { totalsRow?: any[] | Record<string, any[]>; machineSummary?: { maquina: string; litros: number; custo: number; horasKm: number; isKM: boolean }[] } | undefined;

      // ── Coleta de dados por tipo ──
      if (relId === 'custo_abast') {
        ({ columns, data, rawData, summaryData } = buildAbastData(dados, ativos, dateStart, dateEnd));
      } else if (relId === 'fat_refeicoes') {
        ({ columns, data, rawData } = buildRefeicaoData(dados));
      } else if (relId === 'extrato_chuvas') {
        ({ columns, data, rawData } = buildChuvasData(dados));
      } else if (relId === 'os') {
        ({ columns, data, rawData, summaryData } = buildOSData(state.os, ativos, dateStart, dateEnd));
      } else if (relId === 'equipe') {
        ({ columns, data, rawData } = buildEquipeData(state.equipe, state.listas?.colaboradores));
      } else if (relId === 'cadastros') {
        const sel = selectedColumns || [];
        if (sel.length === 0) {
            toast.error("Selecione ao menos um cadastro para exportar.");
            toast.dismiss(loadingToast);
            return;
        }
        ({ columns, data, rawData } = buildCadastrosData(state, sel));
      } else {
        toast.error("Este relatório ainda está em desenvolvimento.");
        toast.dismiss(loadingToast);
        return;
      }

      // ── Personalização ──
      const totalColsForReport = relId === 'custo_abast' ? ABAST_TOTAL_COLS : relId === 'os' ? OS_TOTAL_COLS : relId === 'equipe' ? EQUIPE_TOTAL_COLS : relId === 'cadastros' ? CADASTROS_TOTAL_COLS : 0;
      const isCustomized = selectedColumns && selectedColumns.length < totalColsForReport;
      const customTag = isCustomized ? ' (Personalizado)' : '';

      const options = {
        title: titulo + customTag,
        filename: filename + (isCustomized ? '_Personalizado' : ''),
        farmName: fNome,
        subtitle: periodStr + (isCustomized ? `  •  ${selectedColumns!.length} de ${totalColsForReport} colunas` : ''),
        logo,
        summaryData,
        selectedColumns,
        columnStyles: relId === 'custo_abast' ? { ...ABAST_COLUMN_STYLES } : relId === 'os' ? { ...OS_COLUMN_STYLES } : relId === 'equipe' ? { ...EQUIPE_COLUMN_STYLES } : undefined
      };

      // ── PDF ──
      if (type === 'pdf') {
        let finalColumns = columns;
        let finalData = data;

        if (selectedColumns && (relId === 'custo_abast' || relId === 'os' || relId === 'equipe') && selectedColumns.length < totalColsForReport) {
          const keyMap = relId === 'custo_abast' ? ABAST_KEY_MAP : relId === 'os' ? OS_KEY_MAP : EQUIPE_KEY_MAP;
          const indices = selectedColumns.map(k => keyMap[k]).filter(i => i !== undefined).sort((a, b) => a - b);
          finalColumns = indices.map(i => columns[i]);
          
          if (Array.isArray(data)) {
            finalData = data.map(row => indices.map(i => row[i]));
          } else {
             finalData = {};
             const typedData = data as Record<string, any[][]>;
             Object.keys(typedData).forEach(key => {
                 (finalData as Record<string, any[][]>)[key] = typedData[key].map(row => indices.map(i => row[i]));
             });
          }

          if (summaryData && summaryData.totalsRow) {
            
            if (Array.isArray(summaryData.totalsRow)) {
                const origTotals = summaryData.totalsRow;
                const numCols = finalColumns.length;
                const newTotals = new Array(numCols).fill('');
                newTotals[0] = origTotals[0]; // Texto descritivo
                
                if (relId === 'custo_abast') {
                    const maqIdx = finalColumns.findIndex(c => c.includes('Máquina'));
                    if (maqIdx >= 0) newTotals[maqIdx] = 'TOTAIS';
                    const litIdx = finalColumns.indexOf('Litros');
                    if (litIdx >= 0) newTotals[litIdx] = origTotals[2]; // Valor de litros
                    const custoIdx = finalColumns.findIndex(c => c.includes('Custo') || c.includes('Valor'));
                    if (custoIdx >= 0) newTotals[custoIdx] = origTotals[9];
                }
                summaryData.totalsRow = newTotals;
            } else {
                const origTotalsObj = summaryData.totalsRow as Record<string, any[]>;
                const numCols = finalColumns.length;
                const newTotalsObj: Record<string, any[]> = {};
                
                Object.keys(origTotalsObj).forEach(key => {
                    const origTotals = origTotalsObj[key];
                    const newTotals = new Array(numCols).fill('');
                    newTotals[0] = origTotals[0];
                    
                    const descIdx = finalColumns.findIndex(c => c.includes('Referência') || c.includes('Descrição'));
                    if (descIdx >= 0) newTotals[descIdx] = 'TOTAIS';
                    const custoIdx = finalColumns.findIndex(c => c.includes('Custo') || c.includes('Valor'));
                    if (custoIdx >= 0) newTotals[custoIdx] = origTotals[7];
                    
                    newTotalsObj[key] = newTotals;
                });
                
                summaryData.totalsRow = newTotalsObj;
            }
          }

          if (options.columnStyles) {
            const oldStyles = options.columnStyles as Record<number, any>;
            const newStyles: Record<number, any> = {};
            indices.forEach((origIdx, newIdx) => {
              if (oldStyles[origIdx]) newStyles[newIdx] = oldStyles[origIdx];
            });
            options.columnStyles = newStyles as any;
          }
        }

        if (relId === 'os') {
            await osExportService.exportToPDF(finalColumns, finalData as any, options as any);
        } else if (relId === 'extrato_chuvas') {
            await weatherExportService.exportToPDF(finalColumns, finalData as any[][], options as any);
        } else if (relId === 'fat_refeicoes') {
            await mealsExportService.exportToPDF(finalColumns, finalData as any[][], options as any);
        } else if (relId === 'equipe') {
            await teamExportService.exportToPDF(finalColumns, finalData as any[][], options as any);
        } else if (relId === 'cadastros') {
            await registriesExportService.exportToPDF(finalColumns as any, finalData as any, options as any);
        } else {
            await fuelExportService.exportToPDF(finalColumns, finalData as any[][], options as any);
        }
      }
      // ── Excel ──
      else {
        let finalRawData = rawData;
        // Notice we exclude 'cadastros' here too because selectedColumns applies at the builder level
        if (selectedColumns && (relId === 'custo_abast' || relId === 'os' || relId === 'equipe')) {
          const rawKeyMap = relId === 'custo_abast' ? ABAST_RAW_KEY_MAP : relId === 'os' ? OS_RAW_KEY_MAP : EQUIPE_RAW_KEY_MAP;
          const selectedRawKeys = selectedColumns.map(k => rawKeyMap[k]).filter(Boolean);
          
          if (Array.isArray(rawData)) {
             finalRawData = rawData.map((row: any) => {
                const filtered: Record<string, any> = {};
                selectedRawKeys.forEach(rk => { filtered[rk] = row[rk]; });
                return filtered;
             });
          } else {
             finalRawData = {};
             const typedRawData = rawData as Record<string, any[]>;
             Object.keys(typedRawData).forEach(key => {
                 (finalRawData as Record<string, any[]>)[key] = typedRawData[key].map((row: any) => {
                     const filtered: Record<string, any> = {};
                     selectedRawKeys.forEach(rk => { filtered[rk] = row[rk]; });
                     return filtered;
                 });
             });
          }
        }

        if (relId === 'os') {
            await osExportService.exportToExcel(finalRawData as any, options as any);
        } else if (relId === 'extrato_chuvas') {
            await weatherExportService.exportToExcel(finalRawData as any[], options as any);
        } else if (relId === 'fat_refeicoes') {
            await mealsExportService.exportToExcel(finalRawData as any[], options as any);
        } else if (relId === 'equipe') {
            await teamExportService.exportToExcel(finalRawData as any[], options as any);
        } else if (relId === 'cadastros') {
            await registriesExportService.exportToExcel(finalRawData as any, options as any);
        } else {
            await fuelExportService.exportToExcel(finalRawData as any[], options as any);
        }
      }

      toast.success(`${titulo} exportado com sucesso!`);
    } catch (error) {
      console.error('Erro na exportação:', error);
      toast.error("Erro ao gerar arquivo. Tente novamente.");
    } finally {
      toast.dismiss(loadingToast);
    }
  };

  return {
    setTela,
    search, setSearch,
    dateStart, setDateStart,
    dateEnd, setDateEnd,
    modalConfig, setModalConfig,
    filtrados,
    openExportModal,
    handleExport
  };
}

// ==========================================
// BUILDERS DE DADOS (funções puras)
// ==========================================

function buildAbastData(dados: any, ativos: any, dateStart: string, dateEnd: string) {
  const abastecimentosFiltered = (dados.abastecimentos || []).filter((a: any) => {
    const d = (a.data_operacao || a.data || '').slice(0, 10);
    return d >= dateStart && d <= dateEnd;
  });
  // Deduplicação: remove registros fantasma duplicados do state local (sync retry)
  const seen = new Set<string>();
  const abastecimentosRaw = abastecimentosFiltered.filter((a: any) => {
    const key = `${a.maquina}|${a.bomba_inicial || a.bombaInicial}|${a.bomba_final || a.bombaFinal}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  const compras = (dados.compras || []).filter((c: any) => {
    const d = (c.data || '').slice(0, 10);
    return d >= dateStart && d <= dateEnd;
  });
  const maquinas = ativos?.maquinas || [];

  // Estoque Inicial
  const pEstoque = ativos.parametros?.estoque || {};
  const estoqueInicial = U.parseDecimal(pEstoque.ajusteManual || 0);

  // Timeline unificada
  type TimelineEvent = { date: string; type: 'entrada' | 'saida'; qtd: number; ref: any };

  const timeline: TimelineEvent[] = [
    ...compras.map((c: any) => ({ date: c.data, type: 'entrada' as const, qtd: U.parseDecimal(c.litros || 0), ref: c })),
    ...abastecimentosRaw.map((a: any) => ({ date: a.data_operacao || a.data, type: 'saida' as const, qtd: U.parseDecimal(a.litros || a.qtd || 0), ref: a }))
  ];
  timeline.sort((a, b) => {
    const dateCmp = a.date.localeCompare(b.date);
    if (dateCmp !== 0) return dateCmp;
    // Mesma data: ordena por bomba_inicial (marcador sequencial da bomba de combustível)
    const bombaA = U.parseDecimal(
      a.ref?.bomba_inicial || a.ref?.bombaInicial || 0,
    );
    const bombaB = U.parseDecimal(
      b.ref?.bomba_inicial || b.ref?.bombaInicial || 0,
    );
    return bombaA - bombaB;
  });

  // Processamento do Saldo
  let saldoAtual = estoqueInicial;
  const registrosComSaldo: any[] = [];

  timeline.forEach(event => {
    if (event.type === 'entrada') {
      saldoAtual += event.qtd;
    } else {
      saldoAtual -= event.qtd;
      registrosComSaldo.push({ ...event.ref, saldoCalculado: saldoAtual });
    }
  });

  // Ordenação final (descendente por bomba)
  const registros = [...registrosComSaldo].sort((a, b) => {
    const ba = U.parseDecimal(a.bomba_inicial || a.bombaInicial || 0);
    const bb = U.parseDecimal(b.bomba_inicial || b.bombaInicial || 0);
    return bb - ba;
  });

  const columns = ['Data', 'Bomba Inicial', 'Bomba Final', 'Estoque Final', 'Máquina (Marca/Modelo)', 'Litros', 'Início (KM/H)', 'Final (KM/H)', 'Média', 'Custo R$'];

  const data = registros.map((r: any) => {
    const maq = maquinas.find((m: any) => m.nome === r.maquina || m.identificacao === r.maquina);
    const brand = maq?.fabricante || '';
    const model = maq?.descricao || '';
    const maqFull = maq ? `${r.maquina} - ${brand} ${model}`.trim() : r.maquina;
    const isKM = maq?.unidade_medida?.toLowerCase().includes('km');
    const suffix = isKM ? ' KM/L' : ' L/HR';
    const formattedMedia = U.formatMedia(r.media);
    const mediaStr = formattedMedia === '-' ? '-' : `${formattedMedia}${suffix}`;

    return [
      U.formatDate(r.data_operacao || r.data),
      U.formatInt(r.bomba_inicial || r.bombaInicial || 0),
      U.formatInt(r.bomba_final || r.bombaFinal || 0),
      U.formatInt(r.saldoCalculado),
      maqFull,
      U.formatHorimetro(r.litros || r.qtd || 0),
      U.formatHorimetro(r.horimetro_anterior || r.horimetroAnterior || 0),
      U.formatHorimetro(r.horimetro_atual || r.horimetroAtual || 0),
      mediaStr,
      `R$ ${U.formatValue(r.custo || 0)}`
    ];
  });

  const rawData = registros.map((r: any) => {
    const maq = maquinas.find((m: any) => m.nome === r.maquina || m.identificacao === r.maquina);
    const isKM = maq?.unidade_medida?.toLowerCase().includes('km');
    const suffix = isKM ? ' KM/L' : ' L/HR';
    const formattedMedia = U.formatMedia(r.media);
    const brand = maq?.fabricante || '';
    const model = maq?.descricao || '';
    const maqFull = maq ? `${r.maquina} - ${brand} ${model}`.trim() : (r.maquina || 'Desconhecida');

    return {
      'Data': U.formatDate(r.data_operacao || r.data),
      'Bomba Inicial': U.formatHorimetro(r.bomba_inicial || r.bombaInicial || 0),
      'Bomba Final': U.formatHorimetro(r.bomba_final || r.bombaFinal || 0),
      'Saldo Estoque': U.formatHorimetro(r.saldoCalculado),
      'Máquina (Marca/Modelo)': maqFull,
      'Litros': U.formatHorimetro(r.litros || r.qtd),
      'KM/H Inicial': U.formatHorimetro(r.horimetro_anterior || r.horimetroAnterior || 0),
      'KM/H Final': U.formatHorimetro(r.horimetro_atual || r.horimetroAtual || 0),
      'Média': formattedMedia === '-' ? '-' : `${formattedMedia}${suffix}`,
      'Custo R$': `R$ ${U.formatValue(U.parseDecimal(r.custo || 0))}`
    };
  });

  // Totais
  const dStart = new Date(dateStart + 'T00:00:00');
  const dEnd = new Date(dateEnd + 'T00:00:00');
  const diffMs = dEnd.getTime() - dStart.getTime();
  const totalDias = Math.max(1, Math.round(diffMs / (1000 * 60 * 60 * 24)) + 1);
  const totalLitros = registros.reduce((s: number, r: any) => s + U.parseDecimal(r.litros || r.qtd || 0), 0);
  const totalCusto = registros.reduce((s: number, r: any) => s + U.parseDecimal(r.custo || 0), 0);

  const totalsRow = [
    `${totalDias} dias com ${registros.length} registros de abastecimento no período`,
    'TOTAIS',
    `${U.formatHorimetro(totalLitros)} Litros`, '', '', '', '', '', '',
    `R$ ${U.formatValue(totalCusto)}`
  ];

  // Resumo por Máquina
  const maquinaMap: Record<string, { litros: number; custo: number; horimInicial: number; horimFinal: number; isKM: boolean }> = {};
  registros.forEach((r: any) => {
    const maq = maquinas.find((m: any) => m.nome === r.maquina || m.identificacao === r.maquina);
    const brand = maq?.fabricante || '';
    const model = maq?.descricao || '';
    const maqFull = maq ? `${r.maquina} - ${brand} ${model}`.trim() : (r.maquina || 'Desconhecida');
    const horimAnt = U.parseDecimal(r.horimetro_anterior || r.horimetroAnterior || 0);
    const horimAtu = U.parseDecimal(r.horimetro_atual || r.horimetroAtual || 0);
    const isKM = maq?.unidade_medida?.toLowerCase().includes('km') || false;

    if (!maquinaMap[maqFull]) {
      maquinaMap[maqFull] = { litros: 0, custo: 0, horimInicial: horimAnt || Infinity, horimFinal: 0, isKM };
    }
    maquinaMap[maqFull].litros += U.parseDecimal(r.litros || r.qtd || 0);
    maquinaMap[maqFull].custo += U.parseDecimal(r.custo || 0);
    if (horimAnt > 0 && horimAnt < maquinaMap[maqFull].horimInicial) maquinaMap[maqFull].horimInicial = horimAnt;
    if (horimAtu > maquinaMap[maqFull].horimFinal) maquinaMap[maqFull].horimFinal = horimAtu;
  });

  const machineSummary = Object.entries(maquinaMap)
    .map(([maquina, vals]) => ({
      maquina,
      litros: vals.litros,
      custo: vals.custo,
      horasKm: vals.horimFinal > 0 && vals.horimInicial < Infinity ? vals.horimFinal - vals.horimInicial : 0,
      isKM: vals.isKM
    }))
    .sort((a, b) => b.litros - a.litros);

  const summaryData = { totalsRow, machineSummary };

  return { columns, data, rawData, summaryData };
}

function buildRefeicaoData(dados: any) {
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

function buildChuvasData(dados: any) {
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

function buildOSData(osData: any[], ativos: any, dateStart: string, dateEnd: string) {
  const osFiltered = (osData || []).filter((o: any) => {
    const d = (o.data_abertura || o.data || '').slice(0, 10);
    return d >= dateStart && d <= dateEnd;
  });

  // Ordenação ascendente por data (da mais antiga para a mais nova)
  osFiltered.sort((a: any, b: any) => {
    const da = a.data_abertura || a.data;
    const db = b.data_abertura || b.data;
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

  // Marca dataGrouped e rawDataGrouped para exportService saber lidar
  return { 
    columns, 
    data: groupedData, 
    rawData: groupedRawData, 
    summaryData: { totalsRow } 
  };
}

function buildEquipeData(equipe: any[], colaboradores: any[]) {
  // Aggregate both system members (equipe) and field workers (colaboradores)
  const aggregated: any[] = [];

  // System Members
  if (Array.isArray(equipe)) {
    equipe.forEach(m => {
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

  // Field Collaborators
  if (Array.isArray(colaboradores)) {
    colaboradores.forEach(c => {
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

  // Sort alphabetically by name
  aggregated.sort((a, b) => (a.nome || '').localeCompare(b.nome || ''));

  const columns = ['Nome', 'Função/Cargo', 'Tipo', 'Telefone/Contato', 'Data Nasc.', 'Status'];

  const data = aggregated.map(row => [
    row.nome,
    row.cargo,
    row.tipo,
    row.contato,
    row.nascimento,
    row.status
  ]);

  const rawData = aggregated.map(row => ({
    'Nome': row.nome,
    'Função/Cargo': row.cargo,
    'Tipo': row.tipo,
    'Telefone/Contato': row.contato,
    'Data Nasc.': row.nascimento,
    'Status': row.status
  }));

  return { columns, data, rawData };
}

function buildCadastrosData(state: any, selectedTypes: string[]) {
  // This builder returns objects formatted specifically for Multiple Worksheets (Excel) and Multiple Tables (PDF)
  // Both `data` (for PDF) and `rawData` (for Excel) will be dictionaries of arrays keyed by the Category string
  const data: Record<string, any[][]> = {};
  const rawData: Record<string, any[]> = {};
  const columns: Record<string, string[]> = {}; // Overriding the structure slightly to return multiple sets

  const listas = state.listas || {};

  if (selectedTypes.includes('Maquinas_e_Veiculos')) {
      const maqKeys = 'Máquinas e Veículos';
      const source = state.ativos?.maquinas || [];
      columns[maqKeys] = ['Nome Identificador', 'Placa', 'Categoria', 'Status'];
      data[maqKeys] = source.map((m: any) => [m.nome, m.placa || '-', m.categoria || '-', m.status || 'Ativo']);
      rawData[maqKeys] = source.map((m: any) => ({
          'Nome Identificador': m.nome,
          'Placa': m.placa || '-',
          'Categoria': m.categoria || '-',
          'Status': m.status || 'Ativo',
          'Aquisicao': m.data_aquisicao ? U.formatDate(m.data_aquisicao) : '',
          'Valor': m.valor_aquisicao || 0
      }));
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
      const source = listas.medidores || [];
      columns[medKeys] = ['Medidor (Nome)', 'Meta Mensal kWh'];
      data[medKeys] = source.map((m: any) => [m.id, m.meta_mensal || 0]);
      rawData[medKeys] = source.map((m: any) => ({
          'Medidor (Nome)': m.id,
          'Meta Mensal kWh': m.meta_mensal || 0
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
