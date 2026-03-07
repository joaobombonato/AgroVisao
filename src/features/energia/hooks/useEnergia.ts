/**
 * useEnergia — Hook de lógica de negócio da tela de Energia.
 * Extraído de EnergiaScreen.tsx para facilitar manutenção por IA.
 * 
 * Responsabilidades:
 * - Estado do formulário e filtros
 * - Cálculos de consumo e valor estimado (solar/irrigante/comercial)
 * - Handlers de envio e exclusão
 * - Lista processada e filtrada
 */
import { useState, useMemo } from 'react';
import { useAppContext, ACTIONS } from '../../../context/AppContext';
import { U, validateOperationalDate, getOperationalDateLimits } from '../../../utils';
import { toast } from 'react-hot-toast';
import { calcularValorEstimado } from '../utils/energyCalculations';

export default function useEnergia() {
  const { dados, dispatch, setTela, ativos, buscarUltimaLeitura, genericSave } = useAppContext();
  
  // ==========================================
  // ESTADO
  // ==========================================
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

  // ==========================================
  // MAPEAMENTO DO PONTO SELECIONADO
  // ==========================================
  const pontoSelecionado = useMemo(() => {
    return ativos.pontosEnergia.find((l:any) => 
        (typeof form.ponto === 'object' && (form.ponto as any)?.id === l.id) || 
        (l.id === form.ponto) ||
        (l.nome === form.ponto) || 
        (l === form.ponto)
    );
  }, [form.ponto, ativos.pontosEnergia]);

  const mapping = useMemo(() => {
    if (!pontoSelecionado) return { constant: 1, label: 'Rural' };

    let autoConstant = 1;
    if (pontoSelecionado.classe_tarifaria === 'comercial') autoConstant = 80;
    if (pontoSelecionado.classe_tarifaria === 'irrigante') autoConstant = 40;
    if (pontoSelecionado.classe_tarifaria === 'gerador_b2' || pontoSelecionado.funcao_solar === 'gerador') autoConstant = 40;

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

  // ==========================================
  // CÁLCULOS DE CONSUMO
  // ==========================================
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

  // ==========================================
  // VALOR ESTIMADO (delegado para função pura)
  // ==========================================
  const valorEstimadoInfo = useMemo(() => {
    return calcularValorEstimado({
      consumo: U.parseDecimal(consumo),
      consumo_04,
      consumo_08,
      leituraAtual04: form.leitura_atual_04,
      dataLeitura: form.data_leitura,
      mapping,
      parametrosEnergia: ativos.parametros?.energia || {},
      historicoEnergia: dados.energia || []
    });
  }, [form.leitura_atual_04, form.leitura_atual_08, form.data_leitura, consumo, mapping, dados.energia, ativos.parametros, consumo_08, consumo_04]);

  const valorEstimado = valorEstimadoInfo.total;

  // ==========================================
  // HANDLERS
  // ==========================================
  const handlePontoChange = (e: any) => {
      const nomePonto = e.target.value;
      
      const pontoObj = ativos.pontosEnergia.find((l:any) => (l.nome === nomePonto) || (l === nomePonto));
      const medidorAuto = (pontoObj && typeof pontoObj === 'object') ? pontoObj.identificador_externo : '';

      const ultimoRegistro = buscarUltimaLeitura('energia', 'ponto', nomePonto);
      
      let leituraAnt04 = '0';
      let leituraAnt08 = '0';
      let leituraAnt103 = '0';

      if (ultimoRegistro) {
          leituraAnt04 = ultimoRegistro.leitura_atual_04 || '0';
          leituraAnt08 = ultimoRegistro.leitura_atual_08 || '0';
          leituraAnt103 = ultimoRegistro.leitura_atual_103 || '0';
      } else if (pontoObj && typeof pontoObj === 'object') {
          leituraAnt04 = pontoObj.leitura_inicial_04 || '0';
          leituraAnt08 = pontoObj.leitura_inicial_08 || '0';
          leituraAnt103 = pontoObj.leitura_inicial_103 || '0';
      }

      setForm(prev => {
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
        
        if (form.leitura_atual_04 && atual04 < ant04) {
            toast.error(`Leitura Atual 04 (${atual04}) não pode ser menor que a anterior (${ant04}).`);
            return;
        }

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
  
  // ==========================================
  // DADOS PROCESSADOS E FILTROS
  // ==========================================
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

  return {
    // State
    form, setForm,
    filterData, setFilterData,
    filterText, setFilterText,
    // Derived
    setTela,
    ativos,
    mapping,
    isHorario,
    constante,
    consumo, consumo_04, consumo_08, consumo_103,
    valorEstimado,
    valorEstimadoInfo,
    leiturasProcessadas,
    listFilter,
    // Handlers
    handlePontoChange,
    enviar,
    excluir,
    // Utils
    getOperationalDateLimits
  };
}
