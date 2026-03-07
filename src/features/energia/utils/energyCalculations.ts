/**
 * energyCalculations.ts — Cálculos financeiros de energia elétrica.
 * Extraído de useEnergia.ts para facilitar manutenção por IA.
 * 
 * Função pura: recebe parâmetros → retorna resultado financeiro.
 * Não depende de React ou hooks.
 */
import { U } from '../../../utils';

// ==========================================
// TIPOS
// ==========================================
export interface EnergyCalcParams {
  consumo: number;
  consumo_04: number;
  consumo_08: number;
  leituraAtual04: string;
  dataLeitura: string;
  mapping: {
    id?: string;
    nome?: string;
    classe_tarifaria?: string;
    funcao_solar?: string;
    ponto_gerador_id?: string;
    percentual_recebido?: number;
    saldo_inicial_solar_kwh?: string;
  };
  parametrosEnergia: Record<string, string>;
  historicoEnergia: any[];
}

export interface EnergyCalcResult {
  total: string;
  totalBruto: string;
  credito: number;
  faturado: number;
  saldoRestante: number;
  saldoAnterior: number;
  creditoDoMes?: number;
  injeçaoMesRegistrada?: boolean;
  isEstimativo: boolean;
}

// ==========================================
// CÁLCULO PRINCIPAL
// ==========================================
export function calcularValorEstimado(params: EnergyCalcParams): EnergyCalcResult {
  const { consumo, consumo_04, consumo_08, leituraAtual04, dataLeitura, mapping, parametrosEnergia, historicoEnergia } = params;
  const p = parametrosEnergia || {};
  const valConsumo = consumo;
  
  const tarifaComercial = U.parseDecimal(p.tarifaComercial || ''); 
  const tusdLiquida = U.parseDecimal(p.tusdSolar || ''); 
  const tusdGD = U.parseDecimal(p.tusdGD || '');
  const tarifaMinimaFixa = U.parseDecimal(p.tarifaMinima || '0');
  const taxaIluminacao = U.parseDecimal(p.taxaIluminacao || '0');
  
  let minKwh = 30;
  if (mapping.classe_tarifaria === 'comercial' || mapping.classe_tarifaria === 'irrigante') minKwh = 100;
  const custoMinimoCalculado = minKwh * tarifaComercial;
  const custoMinimoFinal = tarifaMinimaFixa > 0 ? tarifaMinimaFixa : custoMinimoCalculado;

  const historicoPonto = (historicoEnergia || [])
      .filter((r: any) => r.local_id === mapping.id || r.ponto === mapping.nome)
      .sort((a: any, b: any) => new Date(b.data_leitura || b.data).getTime() - new Date(a.data_leitura || a.data).getTime());

  const ultimoRegistro = historicoPonto[0];
  const saldoAnterior = ultimoRegistro?.info_solar 
      ? U.parseDecimal(ultimoRegistro.info_solar.saldo_restante) 
      : U.parseDecimal(mapping.saldo_inicial_solar_kwh || '0');

  if (!leituraAtual04 && mapping.funcao_solar !== 'gerador') {
      return { total: "0.00", totalBruto: "0.00", credito: 0, faturado: 0, saldoRestante: 0, saldoAnterior, isEstimativo: false };
  }

  let creditoDoMes = 0;
  let injeçaoMesRegistrada = false;
  if (mapping.funcao_solar === 'consumidor_remoto' && mapping.ponto_gerador_id) {
      const mesAtual = dataLeitura.substring(0, 7);
      const leiturasGerador = (historicoEnergia || []).filter((r: any) => 
          (r.local_id === mapping.ponto_gerador_id) && 
          (r.data_leitura || r.data || '').startsWith(mesAtual)
      );

      if (leiturasGerador.length > 0) {
          const l = leiturasGerador[0];
          const injeçaoTotal = (U.parseDecimal(l.leitura_atual_103) - U.parseDecimal(l.leitura_ant_103)) * (U.parseDecimal(l.constante_medidor) || 1);
          creditoDoMes = (injeçaoTotal * (U.parseDecimal(String(mapping.percentual_recebido || '0')) / 100));
          injeçaoMesRegistrada = true;
      }
  }

  const saldoDisponivel = saldoAnterior + creditoDoMes;
  const consumoBruto = valConsumo;
  const consumoCompensado = Math.min(consumoBruto, saldoDisponivel);
  const consumoExtra = Math.max(consumoBruto - consumoCompensado, 0);
  const saldoRestante = Math.max(saldoDisponivel - consumoBruto, 0);

  let total = 0;
  
  const custoConsumoExtra = Math.max(consumoExtra, minKwh) * tarifaComercial; 
  const custoTusdCompensado = consumoCompensado * tusdLiquida;
  const kwhParaAjuste = Math.max(Math.min(minKwh - consumoExtra, consumoCompensado), 0);
  const ajusteDisponibilidade = kwhParaAjuste * 2 * tusdGD;

  if (mapping.classe_tarifaria === 'irrigante') {
      const proporçaoFP = consumo_08 / (valConsumo || 1);
      const extraPonta = consumoExtra * (1 - proporçaoFP);
      const extraFora = consumoExtra * proporçaoFP;
      const custoExtraIrrigante = (extraPonta * tarifaComercial) + (extraFora * tarifaComercial * 0.4);
      total = Math.max(custoExtraIrrigante, custoMinimoFinal) + custoTusdCompensado - ajusteDisponibilidade;
  } else {
      total = custoConsumoExtra + custoTusdCompensado - ajusteDisponibilidade;
  }

  if (mapping.classe_tarifaria === 'comercial') total += taxaIluminacao;

  let custoBrutoBase = 0;
  if (mapping.classe_tarifaria === 'irrigante') {
      custoBrutoBase = (consumo_04 * tarifaComercial) + (consumo_08 * tarifaComercial * 0.4);
  } else {
      custoBrutoBase = valConsumo * tarifaComercial;
  }

  return { 
      total: total.toFixed(2), 
      totalBruto: custoBrutoBase.toFixed(2),
      credito: consumoCompensado, 
      faturado: consumoExtra, 
      saldoRestante,
      saldoAnterior,
      creditoDoMes,
      injeçaoMesRegistrada,
      isEstimativo: mapping.funcao_solar === 'consumidor_remoto' && !injeçaoMesRegistrada
  };
}
