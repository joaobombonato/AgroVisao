import { useState } from 'react';
import { toast } from 'react-hot-toast';
import { useAppContext } from '../../../context/AppContext';
import { exportService } from '../services/exportService';
import { U } from '../../../utils';
import {
  RELATORIOS,
  ABAST_KEY_MAP,
  ABAST_RAW_KEY_MAP,
  ABAST_COLUMN_STYLES,
  ABAST_TOTAL_COLS
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
      let data: any[][] = [];
      let rawData: any[] = [];
      let filename = titulo.replace(/\s+/g, '_');
      let summaryData: | { totalsRow?: any[]; machineSummary?: { maquina: string; litros: number; custo: number; horasKm: number; isKM: boolean }[] } | undefined;

      // ── Coleta de dados por tipo ──
      if (relId === 'custo_abast') {
        ({ columns, data, rawData, summaryData } = buildAbastData(dados, ativos, dateStart, dateEnd));
      } else if (relId === 'fat_refeicoes') {
        ({ columns, data, rawData } = buildRefeicaoData(dados));
      } else if (relId === 'extrato_chuvas') {
        ({ columns, data, rawData } = buildChuvasData(dados));
      } else {
        toast.error("Este relatório ainda está em desenvolvimento.");
        toast.dismiss(loadingToast);
        return;
      }

      // ── Personalização ──
      const totalColsForReport = relId === 'custo_abast' ? ABAST_TOTAL_COLS : 0;
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
        columnStyles: relId === 'custo_abast' ? { ...ABAST_COLUMN_STYLES } : undefined
      };

      // ── PDF ──
      if (type === 'pdf') {
        let finalColumns = columns;
        let finalData = data;

        if (selectedColumns && relId === 'custo_abast' && selectedColumns.length < ABAST_TOTAL_COLS) {
          const indices = selectedColumns.map(k => ABAST_KEY_MAP[k]).filter(i => i !== undefined).sort((a, b) => a - b);
          finalColumns = indices.map(i => columns[i]);
          finalData = data.map(row => indices.map(i => row[i]));

          if (summaryData && summaryData.totalsRow) {
            const origTotals = summaryData.totalsRow;
            const numCols = finalColumns.length;
            const newTotals = new Array(numCols).fill('');
            newTotals[0] = origTotals[0]; // Texto descritivo
            const maqIdx = finalColumns.findIndex(c => c.includes('Máquina'));
            if (maqIdx >= 0) newTotals[maqIdx] = 'TOTAIS';
            const litIdx = finalColumns.indexOf('Litros');
            if (litIdx >= 0) newTotals[litIdx] = origTotals[2]; // Valor de litros
            const custoIdx = finalColumns.findIndex(c => c.includes('Custo'));
            if (custoIdx >= 0) newTotals[custoIdx] = origTotals[9];
            summaryData.totalsRow = newTotals;
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

        await exportService.exportToPDF(finalColumns, finalData, options);
      }
      // ── Excel ──
      else {
        let finalRawData = rawData;
        if (selectedColumns && relId === 'custo_abast') {
          const selectedRawKeys = selectedColumns.map(k => ABAST_RAW_KEY_MAP[k]).filter(Boolean);
          finalRawData = rawData.map((row: any) => {
            const filtered: Record<string, any> = {};
            selectedRawKeys.forEach(rk => { filtered[rk] = row[rk]; });
            return filtered;
          });
        }
        await exportService.exportToExcel(finalRawData, options);
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
  const abastecimentosRaw = (dados.abastecimentos || []).filter((a: any) => {
    const d = a.data_operacao || a.data;
    return d >= dateStart && d <= dateEnd;
  });
  const compras = (dados.compras || []).filter((c: any) => {
    const d = c.data;
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
