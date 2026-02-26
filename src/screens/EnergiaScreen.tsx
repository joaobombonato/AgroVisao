import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Zap, Search, ChevronDown, Check, X, History, Calculator } from 'lucide-react';
import { useAppContext, ACTIONS } from '../context/AppContext';
import { PageHeader, Input, TableWithShowMore, SearchableSelect } from '../components/ui/Shared';

import { U, validateOperationalDate, getOperationalDateLimits } from '../utils';
import { toast } from 'react-hot-toast';

// ==========================================
// Componente: SELECT PESQUISÁVEL (Reutilizado)
// ==========================================
// ==========================================
// SEARCHABLE SELECT: IMPORTADO DO SHARED
// ==========================================

// ==========================================
// TELA PRINCIPAL: ENERGIA
// ==========================================
export default function EnergiaScreen() {
  const { dados, dispatch, setTela, ativos, buscarUltimaLeitura, genericSave } = useAppContext();
  
  const [form, setForm] = useState({ 
      data_leitura: U.todayIso(), 
      ponto: '', 
      medidor: '', 
      leitura_ant_04: '', 
      leitura_atual_04: '',
      leitura_ant_08: '', 
      leitura_atual_08: '',
      leitura_ant_103: '',
      leitura_atual_103: '',
      centroCusto: ''
  });
  
  const [filterData, setFilterData] = useState(U.todayIso());
  const [filterText, setFilterText] = useState('');

  // 1. Busca Dados do Ponto Selecionado
  const pontoSelecionado = useMemo(() => {
    return ativos.pontosEnergia.find((l:any) => (l.nome === form.ponto) || (l === form.ponto));
  }, [form.ponto, ativos.pontosEnergia]);

  // Lógica de Mapeamento Técnico 2026
  const mapping = useMemo(() => {
    if (!pontoSelecionado) return { constant: 1, label: 'Rural' };

    // Constantes Automáticas conforme regras anteriores
    let autoConstant = 1;
    if (pontoSelecionado.classe_tarifaria === 'comercial') autoConstant = 80;
    if (pontoSelecionado.classe_tarifaria === 'irrigante') autoConstant = 40;
    if (pontoSelecionado.classe_tarifaria === 'gerador_b2' || pontoSelecionado.funcao_solar === 'gerador') autoConstant = 40;

    // Busca o label amigável da classe tarifária
    const labelsClasses: Record<string, string> = {
        rural: "Rural (B2)",
        comercial: "Comercial (B3)",
        irrigante: "Irrigante Noturno",
        residencial: "Residencial (B1)",
        gerador_b2: "Gerador (B2)"
    };

    return { 
        id: pontoSelecionado.id,
        nome: pontoSelecionado.nome,
        constant: autoConstant,
        label: pontoSelecionado.nome,
        classe_label: labelsClasses[pontoSelecionado.classe_tarifaria] || 'Rural (B2)',
        classe_tarifaria: pontoSelecionado.classe_tarifaria || 'rural',
        funcao_solar: pontoSelecionado.funcao_solar || 'nenhum',
        ponto_gerador_id: pontoSelecionado.ponto_gerador_id,
        percentual_recebido: U.parseDecimal(pontoSelecionado.percentual_recebido || '0'),
        saldo_inicial_solar_kwh: pontoSelecionado.saldo_inicial_solar_kwh
    };
  }, [pontoSelecionado]);

  const isHorario = mapping.classe_tarifaria === 'irrigante';
  const constante = mapping.constant;

  // Cálculos Automáticos
  const consumo_04 = useMemo(() => {
      const atual = U.parseDecimal(form.leitura_atual_04);
      const ant = U.parseDecimal(form.leitura_ant_04);
      return atual > ant ? (atual - ant) * constante : 0;
  }, [form.leitura_atual_04, form.leitura_ant_04, constante]);

  const consumo_08 = useMemo(() => {
      if (!isHorario) return 0;
      const atual = U.parseDecimal(form.leitura_atual_08);
      const ant = U.parseDecimal(form.leitura_ant_08);
      return atual > ant ? (atual - ant) * constante : 0;
  }, [form.leitura_atual_08, form.leitura_ant_08, isHorario, constante]);

  const consumo_103 = useMemo(() => {
      if (mapping.funcao_solar !== 'gerador') return 0;
      const atual = U.parseDecimal(form.leitura_atual_103);
      const ant = U.parseDecimal(form.leitura_ant_103);
      return atual > ant ? (atual - ant) * constante : 0;
  }, [form.leitura_atual_103, form.leitura_ant_103, mapping.funcao_solar, constante]);

  const consumo = (consumo_04 + consumo_08).toFixed(0);

  const valorEstimadoInfo = useMemo(() => {
    const params = ativos.parametros?.energia || {};
    const valConsumo = U.parseDecimal(consumo);
    
    // 1. Configurações Dinâmicas (Lidas dos Parâmetros Gerais)
    const tarifaComercial = U.parseDecimal(params.tarifaComercial || ''); 
    const tusdLiquida = U.parseDecimal(params.tusdSolar || ''); 
    const tusdGD = U.parseDecimal(params.tusdGD || ''); // Novo: Usado para o Ajuste de Disponibilidade
    const tarifaMinimaFixa = U.parseDecimal(params.tarifaMinima || '0');
    const taxaIluminacao = U.parseDecimal(params.taxaIluminacao || '0');
    
    // 2. Definição de Taxa Mínima (Custo de Disponibilidade)
    let minKwh = 30;
    if (mapping.classe_tarifaria === 'comercial' || mapping.classe_tarifaria === 'irrigante') minKwh = 100;
    const custoMinimoCalculado = minKwh * tarifaComercial;
    const custoMinimoFinal = tarifaMinimaFixa > 0 ? tarifaMinimaFixa : custoMinimoCalculado;

    // 3. Busca Saldo Anterior no Histórico
    const historicoPonto = (dados.energia || [])
        .filter((r: any) => r.local_id === mapping.id || r.ponto === mapping.nome)
        .sort((a: any, b: any) => new Date(b.data_leitura || b.data).getTime() - new Date(a.data_leitura || a.data).getTime());

    const ultimoRegistro = historicoPonto[0];
    const saldoAnterior = ultimoRegistro?.info_solar 
        ? U.parseDecimal(ultimoRegistro.info_solar.saldo_restante) 
        : U.parseDecimal(mapping.saldo_inicial_solar_kwh || '0');

    if (!form.leitura_atual_04 && mapping.funcao_solar !== 'gerador') {
        return { total: "0.00", totalBruto: "0.00", credito: 0, faturado: 0, saldoRestante: 0, saldoAnterior, isEstimativo: false };
    }

    // 4. Crédito Solar do Mês
    let creditoDoMes = 0;
    let injeçaoMesRegistrada = false;
    if (mapping.funcao_solar === 'consumidor_remoto' && mapping.ponto_gerador_id) {
        const mesAtual = form.data_leitura.substring(0, 7);
        const leiturasGerador = (dados.energia || []).filter((r: any) => 
            (r.local_id === mapping.ponto_gerador_id) && 
            (r.data_leitura || r.data || '').startsWith(mesAtual)
        );

        if (leiturasGerador.length > 0) {
            const l = leiturasGerador[0];
            const injeçaoTotal = (U.parseDecimal(l.leitura_atual_103) - U.parseDecimal(l.leitura_ant_103)) * (U.parseDecimal(l.constante_medidor) || 1);
            creditoDoMes = (injeçaoTotal * (U.parseDecimal(mapping.percentual_recebido || '0') / 100));
            injeçaoMesRegistrada = true;
        }
    }

    const saldoDisponivel = saldoAnterior + creditoDoMes;
    const consumoBruto = valConsumo;
    const consumoCompensado = Math.min(consumoBruto, saldoDisponivel);
    const consumoExtra = Math.max(consumoBruto - consumoCompensado, 0);
    const saldoRestante = Math.max(saldoDisponivel - consumoBruto, 0);

    // 5. Cálculo Financeiro Preciso (Modelo CEMIG GD II)
    let total = 0;
    
    // Custo base do consumo que ultrapassou o saldo (Minimo respeitado)
    const custoConsumoExtra = Math.max(consumoExtra, minKwh) * tarifaComercial; 
    
    // Custo do uso da rede (TUSD) sobre o que foi compensado
    const custoTusdCompensado = consumoCompensado * tusdLiquida;
    
    // Ajuste de Disponibilidade: Reembolso da TUSD já paga no mínimo para não cobrar dobrado
    // Se extra < min, parte do compensado está "dentro" do mínimo já pago. Ajustamos essa parte.
    const kwhParaAjuste = Math.max(Math.min(minKwh - consumoExtra, consumoCompensado), 0);
    const ajusteDisponibilidade = kwhParaAjuste * 2 * tusdGD;

    if (mapping.classe_tarifaria === 'irrigante') {
        const proporçaoFP = consumo_08 / (valConsumo || 1);
        const extraPonta = consumoExtra * (1 - proporçaoFP);
        const extraFora = consumoExtra * proporçaoFP;
        // Irrigante: 60% de desconto no consumo extra fora de ponta
        const custoExtraIrrigante = (extraPonta * tarifaComercial) + (extraFora * tarifaComercial * 0.4);
        total = Math.max(custoExtraIrrigante, custoMinimoFinal) + custoTusdCompensado - ajusteDisponibilidade;
    } else {
        total = custoConsumoExtra + custoTusdCompensado - ajusteDisponibilidade;
    }

    // Adiciona Taxa de Iluminação se for Comercial/Tri
    if (mapping.classe_tarifaria === 'comercial') total += taxaIluminacao;

    // Custo Bruto (Sem Compensação Solar)
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
  }, [form.leitura_atual_04, form.leitura_atual_08, form.data_leitura, consumo, mapping, dados.energia, ativos.parametros, consumo_08, consumo_04]);

  const valorEstimado = valorEstimadoInfo.total;

  const handlePontoChange = (e: any) => {
      const nomePonto = e.target.value;
      
      // 1. Busca o Medidor nas Configurações
      const pontoObj = ativos.pontosEnergia.find((l:any) => (l.nome === nomePonto) || (l === nomePonto));
      const medidorAuto = (pontoObj && typeof pontoObj === 'object') ? pontoObj.identificador_externo : '';

      // 2. Busca a Última Leitura no Histórico
      const ultimoRegistro = buscarUltimaLeitura('energia', 'ponto', nomePonto);
      
      let leituraAnt04 = '0';
      let leituraAnt08 = '0';
      let leituraAnt103 = '0';

      if (ultimoRegistro) {
          leituraAnt04 = ultimoRegistro.leitura_atual_04 || '0';
          leituraAnt08 = ultimoRegistro.leitura_atual_08 || '0';
          leituraAnt103 = ultimoRegistro.leitura_atual_103 || '0';
      } else if (pontoObj && typeof pontoObj === 'object') {
          // Fallback para leitura inicial do cadastro
          leituraAnt04 = pontoObj.leitura_inicial_04 || '0';
          leituraAnt08 = pontoObj.leitura_inicial_08 || '0';
          leituraAnt103 = pontoObj.leitura_inicial_103 || '0';
      }

      setForm(prev => {
          // Busca Centro de Custo vinculado a este medidor/ponto
          const ccVinculado = (ativos.centros_custos || []).find((cc: any) => 
            cc.tipo_vinculo === 'Medidor de Energia' && cc.vinculo_id === nomePonto
          );

          return { 
              ...prev, 
              ponto: nomePonto, 
              medidor: medidorAuto || prev.medidor, 
              leitura_ant_04: leituraAnt04,
              leitura_ant_08: leituraAnt08,
              leitura_ant_103: leituraAnt103,
              leitura_atual_103: '',
              centroCusto: ccVinculado ? ccVinculado.nome : prev.centroCusto
          };
      });
  };

  const enviar = (e: any) => {
    e.preventDefault();
    try {
        const valConsumo = U.parseDecimal(consumo);
        
        const dateCheck = validateOperationalDate(form.data_leitura);
        if (!dateCheck.valid) { 
            toast.error(dateCheck.error || 'Data Inválida'); 
            return; 
        }
        
        const atual04 = U.parseDecimal(form.leitura_atual_04);
        const ant04 = U.parseDecimal(form.leitura_ant_04);
        
        // Se houver leitura de consumo (04), valida
        if (form.leitura_atual_04 && atual04 < ant04) {
            toast.error(`Leitura Atual 04 (${atual04}) não pode ser menor que a anterior (${ant04}).`);
            return;
        }

        // Se for gerador e não preencheu nem consumo nem injeção, bloqueia
        if (mapping.funcao_solar === 'gerador' && !form.leitura_atual_04 && !form.leitura_atual_103) {
            toast.error("Informe ao menos uma leitura (04 ou 103).");
            return;
        }

        if (isHorario) {
            const atual08 = U.parseDecimal(form.leitura_atual_08);
            const ant08 = U.parseDecimal(form.leitura_ant_08);
            if (atual08 < ant08) {
                toast.error(`Leitura Atual 08 (${atual08}) não pode ser menor que a anterior (${ant08}).`);
                return;
            }
        }

        const mesAtual = form.data_leitura.substring(0, 7); 
        const jaExisteMes = (dados.energia || []).some((r: any) => 
            (r.ponto === form.ponto || r.medidor === form.medidor) && 
            (r.data_leitura || r.data).startsWith(mesAtual)
        );

        if (jaExisteMes) {
            toast.error(`Já existe uma leitura registrada para este medidor em ${mesAtual}.`);
            return;
        }

        const proceed = () => {
            const dbPayload = {
                id: U.id('temp-EN-'), 
                local_id: pontoSelecionado?.id,
                data_leitura: form.data_leitura,
                leitura_ant_04: U.parseDecimal(form.leitura_ant_04),
                leitura_atual_04: U.parseDecimal(form.leitura_atual_04),
                leitura_ant_08: U.parseDecimal(form.leitura_ant_08),
                leitura_atual_08: U.parseDecimal(form.leitura_atual_08),
                leitura_ant_103: U.parseDecimal(form.leitura_ant_103),
                leitura_atual_103: U.parseDecimal(form.leitura_atual_103),
                consumo_04: U.parseDecimal(consumo_04),
                consumo_08: U.parseDecimal(consumo_08),
                consumo_103: U.parseDecimal(consumo_103),
                valor_estimado: U.parseDecimal(valorEstimado),
                info_solar: {
                    credito_kwh: valorEstimadoInfo.credito,
                    faturado_kwh: valorEstimadoInfo.faturado,
                    saldo_restante: valorEstimadoInfo.saldoRestante
                },
                safra_id: ativos.parametros?.safraAtiva || null
            };

            const uiRecord = { 
                ...dbPayload, 
                ponto: form.ponto, 
                medidor: form.medidor 
            };

            const descOS = `Energia: ${form.ponto} (${consumo} kWh)`;
            
            genericSave('energia', dbPayload, { 
                type: ACTIONS.ADD_RECORD, 
                modulo: 'energia', 
                record: uiRecord 
            });

            const novaOS = {
                id: U.id('temp-OS-'),
                modulo: 'Energia',
                descricao: descOS,
                detalhes: { 
                    "Ponto": form.ponto, 
                    "Consumo": `${consumo} kWh`,
                    "Estimativa": `R$ ${valorEstimado}`,
                    "Ponta (04)": `${consumo_04} kWh`,
                    "Fora Ponta (08)": isHorario ? `${consumo_08} kWh` : 'N/A'
                },
                status: 'Pendente',
                data_abertura: form.data_leitura
            };

            genericSave('os', novaOS, {
                type: ACTIONS.ADD_RECORD,
                modulo: 'os',
                record: novaOS
            });
            
            setForm({ 
                data_leitura: U.todayIso(), 
                ponto: '', 
                medidor: '', 
                leitura_ant_04: '', 
                leitura_atual_04: '', 
                leitura_ant_08: '', 
                leitura_atual_08: '', 
                leitura_ant_103: '',
                leitura_atual_103: '',
                centroCusto: '' 
            });
            toast.success('Leitura de energia registrada!');
        };

        if (valConsumo === 0) {
            dispatch({
                type: ACTIONS.SET_MODAL,
                modal: {
                    isOpen: true,
                    type: 'confirm',
                    props: {
                        title: 'Atenção',
                        message: `Consumo zero detectado para ${form.ponto}. Deseja registrar assim mesmo?`,
                        onConfirm: () => proceed()
                    }
                }
            });
        } else {
            proceed();
        }
    } catch (err: any) {
        toast.error("Erro ao registrar. Verifique os dados.");
    }
  };

  const excluir = (id: string) => { 
    dispatch({ 
      type: ACTIONS.SET_MODAL, 
      modal: { 
        isOpen: true, 
        type: 'confirm',
        props: {
          title: 'Excluir Registro',
          message: 'Tem certeza que deseja excluir esta leitura de energia?',
          onConfirm: () => {
            dispatch({ type: ACTIONS.REMOVE_RECORD, modulo: 'energia', id });
            toast.error('Registro excluído.');
          }
        }
      } 
    }); 
  };
  
  // Memo para enriquecer os dados com nomes dos pontos (evita IDs esquisitos na UI)
  const leiturasProcessadas = useMemo(() => {
    const raw = dados?.energia || [];
    return raw.map((r: any) => {
      const pontoObj = ativos.pontosEnergia.find((p: any) => p.id === r.local_id || p.nome === r.ponto);
      return {
        ...r,
        ponto: pontoObj?.nome || r.ponto || 'Desconhecido',
        medidor: pontoObj?.identificador_externo || r.medidor || '-'
      };
    });
  }, [dados.energia, ativos.pontosEnergia]);

  const listFilter = useMemo(() => {
    const lista = leiturasProcessadas.filter((i: any) => {
      const txt = filterText.toLowerCase();
      const matchText = (i.ponto || '').toLowerCase().includes(txt) || 
                        (i.medidor || '').toLowerCase().includes(txt) || 
                        (i.id || '').toLowerCase().includes(txt);
      const matchData = !filterData || (i.data_leitura || i.data) === filterData;
      return matchText && matchData;
    });
    return [...lista].reverse();
  }, [leiturasProcessadas, filterData, filterText]);

  return (
    <div className="space-y-4 p-4 pb-24">
      <PageHeader setTela={setTela} title="Energia Elétrica" icon={Zap} colorClass="bg-yellow-500" />
      
      <div className="bg-white rounded-lg border-2 p-4 shadow-sm">
        <h2 className="font-bold border-b pb-2 mb-3 text-gray-700 flex items-center gap-2">
            <Calculator className="w-5 h-5 text-yellow-500"/> Nova Leitura
        </h2>
        
        <form onSubmit={enviar} className="space-y-3">
		
          {/* Campo Data Manual (Para manter o padrão visual) */}
            <Input 
                label="Data da Leitura" 
                type="date" 
                value={form.data_leitura} 
                onChange={(e: any) => setForm({ ...form, data_leitura: e.target.value })} 
                required 
                max={getOperationalDateLimits().max}
                min={getOperationalDateLimits().min}
            />
          
          <SearchableSelect 
              label="Ponto de Energia" 
              placeholder="Buscar ponto... Ex: Sede" 
              options={ativos.pontosEnergia} 
              value={form.ponto} 
              onChange={handlePontoChange} 
              required 
              color="yellow"
          />
          
          {/* MEDIDOR AUTOMÁTICO (AMARELO RESTAURADO) */}
          <div className="space-y-1">
             <div className="flex gap-1">
                <p className="text-xs font-bold text-gray-500">Numeração CEMIG</p>
                <span className="text-[10px] text-yellow-600 bg-yellow-100 px-1 rounded">Auto</span>
             </div>
             <div className="bg-yellow-50 border-2 border-yellow-200 rounded-lg p-2">
                <input 
                    type="text" 
                    value={form.medidor} 
                    readOnly
                    className="w-full bg-transparent font-bold text-yellow-800 outline-none text-sm"
                    placeholder="Nº do Medidor"
                />
             </div>
          </div>

          {form.ponto && (
            <div className="space-y-2">
                <div className="flex gap-2">
                    <div className="flex-1 min-w-[80px] bg-yellow-50 border border-yellow-100 p-2 rounded flex flex-col items-center shadow-sm text-center">
                        <span className="text-[10px] uppercase font-bold text-yellow-600">Classe</span>
                        <span className="text-[11px] font-bold text-yellow-800 leading-tight">{mapping.classe_label}</span>
                    </div>
                    <div className="flex-1 min-w-[80px] bg-yellow-50 border border-yellow-100 p-2 rounded flex flex-col items-center shadow-sm">
                        <span className="text-[10px] uppercase font-bold text-yellow-600">Tipo</span>
                        <span className="text-[11px] font-bold text-yellow-800">{isHorario ? 'Horário' : 'Padrao'}</span>
                    </div>
                    <div className="flex-1 min-w-[80px] bg-yellow-50 border border-yellow-100 p-2 rounded flex flex-col items-center shadow-sm">
                        <span className="text-[10px] uppercase font-bold text-yellow-600">Constante</span>
                        <span className="text-[11px] font-bold text-yellow-800">x {constante}</span>
                    </div>
                </div>
                
                {/* Linha 2: Saldo Solar */}
                {mapping.funcao_solar === 'consumidor_remoto' && (
                    <div className="flex gap-2 animate-in slide-in-from-left-2">
                        <div className="flex-1 bg-blue-50 border border-blue-100 p-2 rounded flex flex-col items-center shadow-sm">
                            <span className="text-[10px] uppercase font-bold text-blue-600">Saldo Anterior</span>
                            <span className="text-[11px] font-bold text-blue-800">{U.formatInt(valorEstimadoInfo.saldoAnterior)} <span className="text-[8px] font-normal">kWh</span></span>
                        </div>
                        <div className={`flex-1 p-2 rounded flex flex-col items-center shadow-sm border transition-colors ${form.leitura_atual_04 ? 'bg-indigo-100 border-indigo-200' : 'bg-gray-50 border-gray-100 opacity-50'}`}>
                            <span className={`text-[10px] uppercase font-bold ${form.leitura_atual_04 ? 'text-indigo-700' : 'text-gray-400'}`}>Saldo Final</span>
                            <span className={`text-[11px] font-bold ${form.leitura_atual_04 ? 'text-indigo-900' : 'text-gray-400'}`}>
                                {form.leitura_atual_04 ? `${U.formatInt(valorEstimadoInfo.saldoRestante)} kWh` : '--'}
                            </span>
                        </div>
                    </div>
                )}
            </div>
          )}

          {/* Aviso de Pendência de Gerador (VERMELHO) */}
          {valorEstimadoInfo.isEstimativo && (
              <div className="bg-red-50 text-red-600 text-[10px] p-2 rounded-lg border border-red-100 font-bold flex items-center gap-2 animate-pulse">
                  <span>⚠️</span> Aguardando leitura do gerador para crédito do mês (usando saldo acumulado).
              </div>
          )}


              <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                      <Input 
                        label={isHorario ? "Anterior Ponta (04)" : "Leitura Anterior"}
                        type="text" 
                        value={U.formatInt(form.leitura_ant_04)} 
                        readOnly
                        className="w-full px-1 py-1 bg-gray-50 font-bold text-yellow-600 outline-none text-center border-2 border-yellow-200 rounded-lg"
                        placeholder="-"
                      />
                  </div>
                  <div className="space-y-1">
                      <Input 
                        label={isHorario ? "Atual Ponta (04)" : "Leitura Atual"}
                        type="text" 
                        value={form.leitura_atual_04} 
                        onChange={(e: any) => setForm({...form, leitura_atual_04: e.target.value})}
                        numeric={true}
                        className="w-full px-1 py-1 border-2 border-gray-300 rounded-lg font-bold text-gray-900 focus:border-yellow-200 focus:outline-none text-center"
                        placeholder="Ex: 1250"
                        required={mapping.funcao_solar !== 'gerador'}
                      />
                  </div>
              </div>

              {isHorario && (
                <div className="grid grid-cols-2 gap-4 animate-in slide-in-from-top-2">
                    <div className="space-y-1">
                        <Input 
                            label="Anterior Fora de Ponta (08)"
                            type="text" 
                            value={U.formatInt(form.leitura_ant_08)} 
                            readOnly
                            className="w-full px-1 py-1 bg-gray-50 font-bold text-green-600 outline-none text-center border-2 border-green-200 rounded-lg"
                            placeholder="-"
                        />
                    </div>
                    <div className="space-y-1">
                        <Input 
                            label="Atual Fora de Ponta (08)"
                            type="text" 
                            value={form.leitura_atual_08} 
                            onChange={(e: any) => setForm({...form, leitura_atual_08: e.target.value})}
                            numeric={true}
                            className="w-full px-1 py-1 border-2 border-gray-300 rounded-lg font-bold text-gray-900 focus:border-green-200 focus:outline-none text-center"
                            placeholder="Ex: 5000"
                            required
                        />
                    </div>
                </div>
              )}


          {mapping.funcao_solar === 'gerador' && (
              <div className="grid grid-cols-2 gap-4 animate-in slide-in-from-top-2 border-l-4 border-blue-400 pl-3 py-1">
                  <div className="space-y-1">
                      <Input 
                        label="Anterior Injetada (103)"
                        type="text" 
                        value={U.formatInt(form.leitura_ant_103)} 
                        readOnly
                        className="w-full px-1 py-1 bg-gray-50 font-bold text-blue-600 outline-none text-center border-2 border-blue-200 rounded-lg"
                        placeholder="-"
                      />
                  </div>
                  <div className="space-y-1">
                      <Input 
                        label="Atual Injetada (103)"
                        type="text" 
                        value={form.leitura_atual_103} 
                        onChange={(e: any) => setForm({...form, leitura_atual_103: e.target.value})}
                        numeric={true}
                        className="w-full px-1 py-1 border-2 border-gray-300 rounded-lg font-bold text-gray-900 focus:border-blue-200 focus:outline-none text-center"
                        placeholder="Ex: 10500"
                        required
                      />
                  </div>
              </div>
          )}

          {/* Card de Resultado */}
          <div className="flex items-center justify-between bg-gray-800 text-white p-4 rounded-xl shadow-lg mt-2 relative overflow-hidden">
              <div className="relative z-10">
                  <p className="text-xs text-gray-400 uppercase font-bold mb-1">Consumo Bruto</p>
                  <p className="text-3xl font-bold text-yellow-400 leading-none">
                     {U.formatInt(consumo)} <span className="text-sm text-gray-400 font-normal">kWh</span>
                  </p>
                  
                  {/* Info Solar */}
                  {mapping.funcao_solar === 'consumidor_remoto' && (
                      <div className="text-[10px] bg-blue-500/20 text-blue-300 px-2 py-1 rounded-lg mt-2 font-bold flex items-center gap-1">
                          ☀️ Consumo Compensado: -{U.formatInt(valorEstimadoInfo.credito)} kWh ({mapping.percentual_recebido}%)
                      </div>
                  )}
                  {mapping.funcao_solar === 'gerador' && (
                      <div className="text-[10px] bg-blue-500/20 text-blue-300 px-2 py-1 rounded-lg mt-2 font-bold flex items-center gap-1">
                          ⚡ Geração Injetada: {U.formatInt(consumo_103)} kWh
                      </div>
                  )}

                  {/* Comparativo de Tendência */}
                  {(() => {
                      const valConsumo = valorEstimadoInfo.faturado;
                      const pontoObj = ativos.pontosEnergia.find((p: any) => p.nome === form.ponto || p === form.ponto);
                      const metaLocal = pontoObj && typeof pontoObj === 'object' ? U.parseDecimal(pontoObj.meta_consumo) : 0;
                      
                      if (metaLocal > 0 && valConsumo > 0) {
                          const isHigh = valConsumo > metaLocal;
                          const diff = Math.abs(valConsumo - metaLocal);
                          return (
                              <div className={`flex items-center gap-1 text-[10px] mt-2 px-2 py-0.5 rounded-full w-fit ${isHigh ? 'bg-red-500/20 text-red-300' : 'bg-green-500/20 text-green-300'}`}>
                                  {isHigh ? '▲' : '▼'} {diff.toFixed(0)} kWh da Meta ({metaLocal})
                              </div>
                          );
                      }
                      return null;
                  })()}
              </div>

              <div className="text-right relative z-10">
                  <p className="text-xs text-gray-400 uppercase font-bold mb-1">Custo Estimado</p>
                  <p className="text-xl font-bold text-green-400 leading-tight">R$ {U.formatValue(valorEstimado)}</p>
                  
                  {/* Custo Bruto (Sem Solar) */}
                  {U.parseDecimal(valorEstimadoInfo.totalBruto) > U.parseDecimal(valorEstimado) && (
                      <div className="mt-1 flex flex-col items-end">
                          <p className="text-[9px] text-gray-400 font-medium">Sem solar: R$ {U.formatValue(valorEstimadoInfo.totalBruto)}</p>
                          <p className="text-[8px] text-green-300 font-bold bg-green-500/10 px-1 rounded">
                             Economia: R$ {(U.parseDecimal(valorEstimadoInfo.totalBruto) - U.parseDecimal(valorEstimado)).toFixed(2)}
                          </p>
                      </div>
                  )}

                  {valorEstimadoInfo.faturado > 0 && valorEstimadoInfo.credito > 0 && (
                      <p className="text-[9px] text-gray-500 italic mt-1">Pos abate: {valorEstimadoInfo.faturado.toFixed(0)} kWh</p>
                  )}
              </div>
              
              {/* Sparkline Decorativo de Fundo */}
              <div className="absolute right-0 bottom-0 opacity-10">
                 <Zap className="w-24 h-24 text-yellow-500 transform rotate-12 translate-x-4 translate-y-4"/>
              </div>
          </div>

          <button type="submit" className="w-full bg-yellow-500 text-white py-3 rounded-lg font-bold hover:bg-yellow-600 transition-colors shadow-md flex items-center justify-center gap-2">
              <Check className="w-5 h-5" /> Registrar Leitura
          </button>
        </form>
      </div>

      {/* LANÇAMENTOS RECENTES (Últimos 5) */}
      <div className="bg-white rounded-lg border-2 p-4 shadow-sm">
        <h2 className="text-xs font-bold text-gray-400 mb-3 uppercase flex items-center gap-1">
          <Check className="w-3 h-3 text-yellow-500"/> Últimas 5 Leituras
        </h2>
        {(() => {
          // Ordenação rigorosa por inserção (id temp tem timestamp ou created_at)
          const recentes = [...leiturasProcessadas]
            .sort((a, b) => {
              // Primeiro por data de leitura
              const da = a.data_leitura || a.data || '';
              const db = b.data_leitura || b.data || '';
              if (db !== da) return db.localeCompare(da);
              
              // Empate na data: Usa o created_at ou ID (timestamp) para garantir a ordem exata do banco
              const ta = a.created_at || a.id || '';
              const tb = b.created_at || b.id || '';
              return String(tb).localeCompare(String(ta));
            })
            .slice(0, 5);

          if (recentes.length === 0) return <p className="text-xs text-gray-400 italic">Nenhum registro recente.</p>;
          return (
            <div className="space-y-3">
              {recentes.map((r: any) => (
                <div key={r.id} className="text-xs flex justify-between items-start py-2 border-b last:border-0 border-gray-100 gap-3">
                  <div className="flex flex-col min-w-0" style={{ maxWidth: '65%' }}>
                    <span className="font-bold text-gray-800 truncate">{r.ponto}</span>
                    <span className="text-[10px] text-gray-500 truncate">Med: {r.medidor}</span>
                    <span className="text-[10px] text-gray-400">{U.formatDate(r.data_leitura || r.data)}</span>
                    {r.info_solar && (
                        <div className="flex gap-2 text-[9px] text-blue-500 font-bold mt-0.5">
                            <span>Comp: {U.formatInt(r.info_solar?.credito_kwh)}</span>
                            <span>Saldo: {U.formatInt(r.info_solar?.saldo_restante)}</span>
                        </div>
                    )}
                  </div>
                  <div className="flex flex-col items-end shrink-0">
                    <span className="font-bold text-yellow-600">{U.formatInt((r.consumo_04 || 0) + (r.consumo_08 || 0))} kWh</span>
                    <span className="text-[10px] font-bold text-green-600">R$ {U.formatValue(r.valor_estimado || 0)}</span>
                  </div>
                </div>
              ))}
            </div>
          );
        })()}
      </div>

      <div className="bg-white rounded-lg border-2 overflow-hidden shadow-sm">
        <div className="p-3 border-b bg-gray-50">
            <h2 className="font-bold text-sm uppercase text-gray-600 mb-2">Histórico de Energia</h2>
            <div className="flex flex-col sm:flex-row gap-2">
                <Input 
                    type="date" 
                    value={filterData} 
                    onChange={(e: any) => setFilterData(e.target.value)} 
                    className="text-xs border rounded p-2 min-w-[140px]" 
                />
                <div className="relative flex-1 min-w-[120px]">
                    <Search className="absolute left-2 top-2 w-4 h-4 text-gray-400"/>
                    <input type="text" placeholder="Local ou ID..." value={filterText} onChange={e => setFilterText(e.target.value)} className="w-full pl-8 text-xs border rounded p-2" />
                </div>
            </div>
        </div>
        <TableWithShowMore data={listFilter}>
            {(items:any[], Row:any) => (
                <>
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-3 py-2 text-left text-xs font-bold text-gray-500">Data</th>
                            <th className="px-3 py-2 text-left text-xs font-bold text-gray-500">Ponto / Medidor</th>
                            <th className="px-3 py-2 text-right text-xs font-bold text-gray-500">Consumo</th>
                            <th className="px-3 py-2 text-right text-xs font-bold text-gray-500">R$ Estimado</th>
                            <th className="px-3 py-2 text-right text-xs font-bold text-gray-500">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y">
                        {items.map(item => (
                            <Row key={item.id} onDelete={() => excluir(item.id)}>
                                <td className="px-3 py-2 text-gray-600 text-xs whitespace-nowrap">
                                    {U.formatDate(item.data_leitura || item.data).slice(0,5)}
                                </td>
                                <td className="px-3 py-2 text-gray-700 text-xs">
                                    <div className="font-bold truncate max-w-[120px]">{item.ponto}</div>
                                    <div className="text-[10px] text-gray-500">{item.medidor}</div>
                                    {item.info_solar && (
                                        <div className="flex border-t pt-2 gap-4 text-[10px] text-blue-500 font-bold italic">
                                            <span>Comp: {U.formatInt(item.info_solar?.credito_kwh)}</span>
                                            <span>Fat: {U.formatInt(item.info_solar?.faturado_kwh)}</span>
                                            <span>Saldo: {U.formatInt(item.info_solar?.saldo_restante)}</span>
                                        </div>
                                    )}
                                </td>
                                <td className="px-3 py-2 text-right">
                                    <div className="font-bold text-yellow-600 text-sm">{U.formatInt((item.consumo_04 || 0) + (item.consumo_08 || 0))} <span className="text-[10px] font-normal">kWh</span></div>
                                    {(U.parseDecimal(item.consumo_08) > 0) && (
                                        <div className="text-[9px] text-gray-400">P:{U.formatInt(item.consumo_04)} / FP:{U.formatInt(item.consumo_08)}</div>
                                    )}
                                </td>
                                <td className="px-3 py-2 text-right text-xs font-bold text-green-600">
                                    R$ {U.formatValue(item.valor_estimado || 0)}
                                </td>
                            </Row>
                        ))}
                    </tbody>
                </>
            )}
        </TableWithShowMore>
      </div>
    </div>
  );
}
