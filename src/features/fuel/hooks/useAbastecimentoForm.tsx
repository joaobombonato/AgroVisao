/**
 * useAbastecimentoForm - Hook para gerenciar formulário de abastecimento
 * 
 * Encapsula toda a lógica de:
 * - Estado do formulário
 * - Cálculos (litros, média, custo)
 * - Validação e envio
 * - Criação de OS automáticas
 */
import { useState, useMemo, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { AlertTriangle } from 'lucide-react';
import React from 'react';
import { useAppContext, ACTIONS } from '../../../context/AppContext';
import { U, validateOperationalDate } from '../../../utils';
import { useEstoqueDiesel } from '../../../hooks';

interface AbastecimentoFormState {
  data: string;
  maquina: string;
  combustivel: string;
  bombaInicial: string;
  bombaFinal: string;
  horimetroAnterior: string;
  horimetroAtual: string;
  obs: string;
  tanqueCheio: boolean;
  centroCusto: string;
  isExterno: boolean;
  litrosManuais: string;
}

export function useAbastecimentoForm() {
  const { dados, os, ativos, buscarUltimaLeitura, genericSave, dispatch } = useAppContext();
  const { estoqueAtual, estoqueMinimo } = useEstoqueDiesel();

  const [form, setForm] = useState<AbastecimentoFormState>({
    data: U.todayIso(),
    maquina: '',
    combustivel: 'Diesel S10',
    bombaInicial: '',
    bombaFinal: '',
    horimetroAnterior: '',
    horimetroAtual: '',
    obs: '',
    tanqueCheio: true,
    centroCusto: '',
    isExterno: false,
    litrosManuais: ''
  });

  const [showObs, setShowObs] = useState(false);

  // Buscar última leitura da bomba ao montar
  useEffect(() => {
    if (typeof buscarUltimaLeitura === 'function') {
      const ultimaBomba = buscarUltimaLeitura('abastecimentos', 'bombaFinal', '*');
      // Fix: Se não houver histórico, usar o parâmetro "Bomba Inicial" configurado
      const paramBombaInicial = ativos?.parametros?.estoque?.bombaInicial || '0';
      setForm(prev => ({ ...prev, bombaInicial: ultimaBomba ? ultimaBomba.bombaFinal : paramBombaInicial }));
    }
  }, [dados?.abastecimentos, buscarUltimaLeitura, ativos?.parametros]);

  // Handler ao mudar máquina
  const handleMaquinaChange = (e: any) => {
    // Fix: Se vier do SearchableSelect com label customizada, pegar o nome original do objeto data
    const maq = e.target.data ? (e.target.data.nome || e.target.value) : e.target.value;
    const ultimo = buscarUltimaLeitura('abastecimentos', 'maquina', maq);
    
    const ccVinculado = (ativos.centros_custos || []).find((cc: any) =>
      cc.tipo_vinculo === 'Máquina' && cc.vinculo_id === maq
    );

    setForm(prev => ({
      ...prev,
      maquina: maq,
      horimetroAnterior: ultimo ? ultimo.horimetroAtual : '',
      centroCusto: ccVinculado ? ccVinculado.nome : prev.centroCusto
    }));
  };

  // Cálculos dinâmicos
  const litrosCalculados = useMemo(() => {
    // MODO EXTERNO: litros informados manualmente
    if (form.isExterno) {
      if (!form.litrosManuais) return '0,00';
      const val = U.parseDecimal(form.litrosManuais);
      return val > 0 ? val.toFixed(2).replace('.', ',') : '0,00';
    }

    // MODO BOMBA (padrão): calcula pela diferença da bomba
    // Se a bomba final ainda não foi preenchida, não calcula nada (UX)
    if (!form.bombaFinal) return '0,00';

    const i = U.parseDecimal(form.bombaInicial);
    const f = U.parseDecimal(form.bombaFinal);
    
    // Se digitou algo mas resultou em 0 (ex: "0,0"), vamos mostrar 0
    if (f === 0 && form.bombaFinal !== '0' && form.bombaFinal !== '0,0') return '0,00';

    if (f >= i) {
      return (f - i).toFixed(2).replace('.', ',');
    } else {
      // Virada de bomba
      const MODULO = 100000000;
      return ((MODULO + f) - i).toFixed(2).replace('.', ',');
    }
  }, [form.bombaInicial, form.bombaFinal, form.isExterno, form.litrosManuais]);

  const getUnidadeMedida = () => {
    const maquinaObj = (ativos?.maquinas || []).find((m: any) => m.nome === form.maquina);
    return maquinaObj?.unidade_medida?.includes("Km") ? "Km" : "Horas";
  };

  const mediaConsumo = useMemo(() => {
    if (!form.tanqueCheio) return 'N/A';

    const l = U.parseDecimal(litrosCalculados);
    const hAnt = U.parseDecimal(form.horimetroAnterior);
    const hAtu = U.parseDecimal(form.horimetroAtual);
    const diff = hAtu - hAnt;

    if (l > 0 && diff > 0) {
      const unidade = getUnidadeMedida();
      // Se for Km (Veículo): Km / Litros = Km/L
      if (unidade === 'Km') {
          return (diff / l).toFixed(2);
      }
      // Se for Horas (Máquina): Litros / Horas = L/h
      return (l / diff).toFixed(2);
    }
    return '0.00';
  }, [litrosCalculados, form.horimetroAnterior, form.horimetroAtual, form.tanqueCheio, form.maquina, ativos.maquinas]);


  const precoInfo = useMemo(() => {
    // 1. Configurações Iniciais da Fazenda
    const estoque = ativos?.parametros?.estoque || {};
    const financeiro = ativos?.parametros?.financeiro || {};
    
    const qtdInicial = U.parseDecimal(estoque.ajusteManual || 0);
    const precoInicial = U.parseDecimal(financeiro.precoDiesel || 0);

    // 2. Compras (Ordenadas por data e criação)
    const compras = [...(dados.compras || [])]
      .filter(c => c.tipo === 'combustivel')
      .sort((a, b) => (a.data || '').localeCompare(b.data || '') || (a.id || '').localeCompare(b.id || ''));

    // 3. Consumo Total (Abastecimentos já realizados)
    const abastecimentos = dados.abastecimentos || [];
    const totalConsumido = abastecimentos.reduce((acc: number, cur: any) => acc + U.parseDecimal(cur.litros || cur.qtd || 0), 0);

    // 4. Montar Fila FIFO de Inventário
    const filaEstoque = [
      { qtd: qtdInicial, preco: precoInicial, label: 'Estoque Inicial' },
      ...compras.map(c => ({ 
        qtd: U.parseDecimal(c.litros || 0), 
        preco: U.parseDecimal(c.valor_unitario || (c.valor_total / U.parseDecimal(c.litros || 1)) || 0), 
        label: `Compra NF ${c.nota_fiscal}` 
      }))
    ].filter(lote => lote.qtd > 0);

    // 5. Cálculo de Preço Médio Ponderado para o Abastecimento Atual (FIFO Real)
    const litrosAbastecimento = U.parseDecimal(litrosCalculados);
    
    // Se não estiver digitando litros, mostrar o preço do "próximo litro" disponível
    if (litrosAbastecimento <= 0) {
      let acumulado = 0;
      for (const lote of filaEstoque) {
        acumulado += lote.qtd;
        if (totalConsumido < acumulado) return { val: lote.preco, source: lote.label };
      }
      return filaEstoque.length > 0 
        ? { val: filaEstoque[filaEstoque.length - 1].preco, source: filaEstoque[filaEstoque.length - 1].label }
        : { val: precoInicial, source: 'Parâmetro Base' };
    }

    // Calcular custo total para estes X litros
    let custoTotalAbastecimento = 0;
    let litrosPendentes = litrosAbastecimento;
    let consumoVirtual = totalConsumido;
    let sourcetext = '';

    for (const lote of filaEstoque) {
        if (litrosPendentes <= 0) break;

        const litrosJaConsumidosDesteLote = Math.max(0, Math.min(lote.qtd, consumoVirtual));
        const litrosDisponiveisDesteLote = lote.qtd - litrosJaConsumidosDesteLote;

        if (litrosDisponiveisDesteLote > 0) {
            const consumoDesteLote = Math.min(litrosPendentes, litrosDisponiveisDesteLote);
            custoTotalAbastecimento += consumoDesteLote * lote.preco;
            litrosPendentes -= consumoDesteLote;
            
            if (!sourcetext) sourcetext = lote.label;
            else if (!sourcetext.includes('vários')) sourcetext += ' + Próximo Lote';
        }
        consumoVirtual = Math.max(0, consumoVirtual - lote.qtd);
    }

    // Se acabaram os lotes e ainda tem litros, usar o preço do último lote conhecido
    if (litrosPendentes > 0 && filaEstoque.length > 0) {
        const ultimoPreco = filaEstoque[filaEstoque.length - 1].preco;
        custoTotalAbastecimento += litrosPendentes * ultimoPreco;
        if (!sourcetext) sourcetext = 'Fim de Estoque';
    }

    const precoMedio = custoTotalAbastecimento / litrosAbastecimento;

    return { 
        val: precoMedio, 
        source: sourcetext || 'Parâmetro Base' 
    };
  }, [dados.compras, dados.abastecimentos, ativos.parametros, litrosCalculados]);

  const custoEstimado = U.parseDecimal(litrosCalculados) * precoInfo.val;

  // Função de envio
  const enviar = (e: any) => {
    e.preventDefault();

    // Validação de duplicidade
    const jaExiste = (dados.abastecimentos || []).some((a: any) =>
      a.maquina === form.maquina &&
      (a.data_operacao || a.data) === form.data &&
      U.parseDecimal(a.horimetroAtual) === U.parseDecimal(form.horimetroAtual)
    );

    if (jaExiste) {
      toast.error("Este abastecimento já foi registrado (Mesma máquina, data e horímetro).");
      return;
    }

    // Validação de Data (Nova Lógica Global)
    const dateCheck = validateOperationalDate(form.data);
    if (!dateCheck.valid) {
        toast.error(dateCheck.error || 'Data inválida.');
        return;
    }
    if (dateCheck.warning) {
        if (!window.confirm(dateCheck.warning)) return;
    }

    if (!form.maquina || U.parseDecimal(litrosCalculados) <= 0) {
      toast.error(form.isExterno 
        ? "Verifique a Máquina e os Litros informados" 
        : "Verifique os dados da Bomba e Máquina");
      return;
    }

    if (!form.horimetroAtual) {
      toast.error("Informe o Hodômetro Atual");
      return;
    }

    // Validação Sequencial Estrita (Horímetro)
    const hAtual = U.parseDecimal(form.horimetroAtual);
    const hAnt = U.parseDecimal(form.horimetroAnterior);
    
    // Aceita igual apenas se for o primeiro registro ou ajuste, mas no geral deve ser maior
    if (hAtual <= hAnt && hAnt > 0) {
       toast.error(`Hodômetro Atual (${hAtual}) deve ser MAIOR que o Anterior (${hAnt})`);
       return;
    }

    // Validação Sequencial Estrita (Bomba) - Apenas no modo via bomba
    if (!form.isExterno) {
      const bFinal = U.parseDecimal(form.bombaFinal);
      const bInicial = U.parseDecimal(form.bombaInicial);
      if (bFinal < bInicial) {
          const diff = bInicial - bFinal;
          if (diff < 500000) {
               if (!window.confirm(`A leitura final (${bFinal}) é menor que a inicial (${bInicial}). É uma virada de bomba?`)) {
                   return;
               }
          }
      }
    }

    const novo: any = {
      data_operacao: form.data,
      maquina: form.maquina,
      combustivel: form.combustivel,
      qtd: U.parseDecimal(litrosCalculados),
      litros: U.parseDecimal(litrosCalculados),
      media: U.parseDecimal(mediaConsumo === 'N/A' ? '0' : mediaConsumo),
      custo: custoEstimado || 0,
      safra_id: ativos.parametros?.safraAtiva || null,
      obs: form.isExterno ? `[EXTERNO] ${form.obs || ''}`.trim() : form.obs,
      centro_custo: form.centroCusto,
      
      // Campos mapeados para snake_case (banco de dados)
      bomba_inicial: form.isExterno ? 0 : U.parseDecimal(form.bombaInicial),
      bomba_final: form.isExterno ? 0 : U.parseDecimal(form.bombaFinal),
      horimetro_anterior: U.parseDecimal(form.horimetroAnterior),
      horimetro_atual: U.parseDecimal(form.horimetroAtual),
      
      // Flag para identificar abastecamento externo
      tipo: form.isExterno ? 'externo' : 'bomba',
    };

    // Detalhes da OS
    const tipoLabel = form.isExterno ? '[EXTERNO] ' : '';
    const descOS = `${tipoLabel}Abastecimento: ${form.maquina} (${litrosCalculados}L)`;
    const maqInfo = (ativos?.maquinas || []).find((m: any) => m.nome === form.maquina);
    const maqLabel = [form.maquina, maqInfo?.fabricante, maqInfo?.descricao].filter(Boolean).join(' - ');
    const detalhesOS: any = {
      "Máquina": maqLabel,
      ...(form.isExterno 
        ? { "Tipo": "Abastecimento Externo (Direto)" }
        : { "Bomba": `${form.bombaInicial} -> ${form.bombaFinal}` }
      ),
      "Horímetro": `${form.horimetroAnterior} -> ${form.horimetroAtual}`,
      "Litros": `${litrosCalculados}L${form.isExterno ? ' (Manual)' : ''}`,
      "Consumo": `${mediaConsumo} L/h (Média)`,
      "Custo": `R$ ${U.formatValue(custoEstimado || 0)}`,
      "Obs": form.obs || '-'
    };

    // Verificar alerta de manutenção
    const maquinaObj = (ativos?.maquinas || []).find((m: any) => m.nome === form.maquina);
    const horimetroAlvo = U.parseDecimal(maquinaObj?.ultima_revisao || 0) + U.parseDecimal(maquinaObj?.intervalo_revisao || 0);

    if (maquinaObj && horimetroAlvo > 0) {
      const horasAtuais = U.parseDecimal(form.horimetroAtual);

      if (horasAtuais >= horimetroAlvo) {
        detalhesOS["ALERTA MANUTENÇÃO"] = `VENCIDA! (${horasAtuais}h >= ${horimetroAlvo}h)`;
        toast((t) => (
          <div className="flex items-center gap-2 text-red-600 font-bold">
            <AlertTriangle className="w-5 h-5" />
            <span>ALERTA: Manutenção da {form.maquina} Vencida!</span>
          </div>
        ), { duration: 6000, icon: '🔧' });
      }
    }

    // Salvar abastecimento
    genericSave('abastecimentos', novo, {
      type: ACTIONS.ADD_RECORD,
      modulo: 'abastecimentos'
    });

    // Criar OS de registro
    const novaOS = {
      // id: REMOVIDO (UUID Automático)
      modulo: 'Abastecimento',
      descricao: descOS,
      detalhes: detalhesOS,
      status: 'Pendente',
      data_abertura: form.data
      // created_at / updated_at: REMOVIDOS (O Supabase gerencia automaticamente)
    };

    genericSave('os', novaOS, {
      type: ACTIONS.ADD_RECORD,
      modulo: 'os', // Nome da tabela no reducer/sync
      record: novaOS
    });

    // Alerta de estoque removido daqui - Centralizado no useAlerts.ts (checkStockAlerts)

    // Reset do formulário
    setForm(prev => ({
      ...prev,
      maquina: '',
      bombaFinal: '',
      horimetroAnterior: '',
      horimetroAtual: '',
      obs: '',
      tanqueCheio: true,
      isExterno: false,
      litrosManuais: ''
    }));
    setShowObs(false);
    toast.success('Abastecimento registrado!');
  };

  return {
    form,
    setForm,
    showObs,
    setShowObs,
    handleMaquinaChange,
    litrosCalculados,
    mediaConsumo,
    custoEstimado,
    precoInfo,
    enviar,
    getUnidadeMedida
  };
}
