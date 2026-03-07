/**
 * Builder: Dados para Relatório de Abastecimento / Combustível
 * Extraído de useRelatorios.ts para melhor manutenção.
 */
import { U } from '../../../utils';

export function buildAbastData(dados: any, ativos: any, dateStart: string, dateEnd: string) {
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

  // 1. Cálculo do Saldo Retroativo (até o dia anterior ao início do filtro)
  const pEstoque = ativos.parametros?.estoque || {};
  const saldoGlobalInicial = U.parseDecimal(pEstoque.ajusteManual || 0);

  const totalCompradoAnterior = (dados.compras || [])
    .filter((c: any) => (c.data || '').slice(0, 10) < dateStart)
    .reduce((s: number, c: any) => s + U.parseDecimal(c.litros || 0), 0);

  const totalSaidasAnterior = (dados.abastecimentos || [])
    .filter((a: any) => {
      const d = (a.data_operacao || a.data || '').slice(0, 10);
      return d < dateStart;
    })
    .reduce((s: number, a: any) => s + U.parseDecimal(a.litros || a.qtd || 0), 0);

  const estoqueInicial = saldoGlobalInicial + totalCompradoAnterior - totalSaidasAnterior;

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
      registrosComSaldo.push({ ...event.ref, saldoCalculado: saldoAtual, isEntrada: true });
    } else {
      saldoAtual -= event.qtd;
      registrosComSaldo.push({ ...event.ref, saldoCalculado: saldoAtual, isEntrada: false });
    }
  });

  // Ordenação final (descendente cronológica + bomba)
  const registros = [...registrosComSaldo].sort((a, b) => {
    const da = a.data_operacao || a.data || '';
    const db = b.data_operacao || b.data || '';
    const dateCmp = db.localeCompare(da);
    if (dateCmp !== 0) return dateCmp;

    const ba = U.parseDecimal(a.bomba_inicial || a.bombaInicial || 0);
    const bb = U.parseDecimal(b.bomba_inicial || b.bombaInicial || 0);
    return bb - ba;
  });

  const columns = ['Data', 'Bomba Inicial', 'Bomba Final', 'Estoque Final', 'Máquina (Marca/Modelo)', 'Litros', 'Início (KM/H)', 'Final (KM/H)', 'Média', 'Custo R$'];

  const data = registros.map((r: any) => {
    if (r.isEntrada) {
      return [
        U.formatDate(r.data),
        '-', '-', // Bomba
        U.formatInt(r.saldoCalculado),
        `ENTRADA: NF ${r.nota_fiscal || r.nf_numero || '-'} (${r.fornecedor || 'Fornecedor'})`,
        U.formatHorimetro(r.litros),
        '-', '-', '-', // Horimetros/Media
        `R$ ${U.formatValue(r.valor_total || 0)}`
      ];
    }

    const isAjuste = r.maquina === "AJUSTE DE ESTOQUE" || r.maquina === "TROCA DE BOMBA";

    const maq = maquinas.find((m: any) => m.nome === r.maquina || m.identificacao === r.maquina);
    const brand = maq?.fabricante || '';
    const model = maq?.descricao || '';
    const maqFull = maq ? `${r.maquina} - ${brand} ${model}`.trim() : r.maquina;
    const isKM = maq?.unidade_medida?.toLowerCase().includes('km');
    const suffix = isKM ? ' KM/L' : ' L/HR';
    const formattedMedia = U.formatMedia(r.media);
    const mediaStr = (formattedMedia === '-' || isAjuste) ? '-' : `${formattedMedia}${suffix}`;

    return [
      U.formatDate(r.data_operacao || r.data),
      U.formatInt(r.bomba_inicial || r.bombaInicial || 0),
      U.formatInt(r.bomba_final || r.bombaFinal || 0),
      U.formatInt(r.saldoCalculado),
      isAjuste ? `** ${r.maquina} **` : maqFull,
      U.formatHorimetro(r.litros || r.qtd || 0),
      isAjuste ? '-' : U.formatHorimetro(r.horimetro_anterior || r.horimetroAnterior || 0),
      isAjuste ? '-' : U.formatHorimetro(r.horimetro_atual || r.horimetroAtual || 0),
      mediaStr,
      isAjuste ? '-' : `R$ ${U.formatValue(r.custo || 0)}`
    ];
  });

  const rawData = registros.map((r: any) => {
    if (r.isEntrada) {
        return {
          'Data': U.formatDate(r.data),
          'Bomba Inicial': '-',
          'Bomba Final': '-',
          'Saldo Estoque': U.formatHorimetro(r.saldoCalculado),
          'Máquina (Marca/Modelo)': `ENTRADA: NF ${r.nota_fiscal || r.nf_numero || '-'}`,
          'Litros': U.formatHorimetro(r.litros),
          'KM/H Inicial': '-',
          'KM/H Final': '-',
          'Média': '-',
          'Custo R$': `R$ ${U.formatValue(r.valor_total || 0)}`
        };
    }

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
      'Média': (formattedMedia === '-' || r.maquina === "AJUSTE") ? '-' : `${formattedMedia}${suffix}`,
      'Custo R$': `R$ ${U.formatValue(U.parseDecimal(r.custo || 0))}`
    };
  });

  // Totais
  const dStart = new Date(dateStart + 'T00:00:00');
  const dEnd = new Date(dateEnd + 'T00:00:00');
  const diffMs = dEnd.getTime() - dStart.getTime();
  const totalDias = Math.max(1, Math.round(diffMs / (1000 * 60 * 60 * 24)) + 1);
  const totalLitros = registros.filter(r => !r.isEntrada).reduce((s: number, r: any) => s + U.parseDecimal(r.litros || r.qtd || 0), 0);
  const totalCusto = registros.filter(r => !r.isEntrada).reduce((s: number, r: any) => s + U.parseDecimal(r.custo || 0), 0);

  const totalsRow = [
    `${totalDias} dias com ${registros.filter(r => !r.isEntrada).length} registros de abastecimento no período`,
    'TOTAIS',
    `${U.formatHorimetro(totalLitros)} Litros`, '', '', '', '', '', '',
    `R$ ${U.formatValue(totalCusto)}`
  ];

  // Resumo por Máquina
  const maquinaMap: Record<string, { litros: number; custo: number; horimInicial: number; horimFinal: number; isKM: boolean }> = {};
  registros.forEach((r: any) => {
    if (r.isEntrada) return;
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
