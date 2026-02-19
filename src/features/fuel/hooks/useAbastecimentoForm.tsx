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
    centroCusto: ''
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
    const maq = e.target.value;
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
    const i = U.parseDecimal(form.bombaInicial);
    const f = U.parseDecimal(form.bombaFinal);
    if (f >= i) {
      return (f - i).toFixed(2).replace('.', ',');
    } else {
      // Virada de bomba
      const MODULO = 100000000;
      return ((MODULO + f) - i).toFixed(2).replace('.', ',');
    }
  }, [form.bombaInicial, form.bombaFinal]);

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
    const compras = dados.compras || [];
    const pFinanceiro = ativos.parametros?.financeiro?.precoDiesel;
    const pSafe = pFinanceiro ? String(pFinanceiro).replace('.', ',') : '';
    const precoBase = pSafe !== '' ? U.parseDecimal(pSafe) : 0;

    if (compras.length > 0) {
      const ultimaCompra = compras[compras.length - 1];
      const valSafe = ultimaCompra.valorUnitario ? String(ultimaCompra.valorUnitario).replace('.', ',') : '0';
      const val = U.parseDecimal(valSafe);
      return { val, source: 'Última Compra' };
    }
    return { val: precoBase, source: 'Parâmetro Base' };
  }, [dados.compras, ativos.parametros]);

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
      toast.error("Verifique os dados da Bomba e Máquina");
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

    // Validação Sequencial Estrita (Bomba) - Exceto virada
    const bFinal = U.parseDecimal(form.bombaFinal);
    const bInicial = U.parseDecimal(form.bombaInicial);
    // Se a diferença for negativa e não parecer virada (ex: diferença pequena negativa), bloqueia
    // Virada geralmente é uma diferença grande negativa que se torna positiva com o módulo
    if (bFinal < bInicial) {
        const diff = bInicial - bFinal;
        if (diff < 500000) { // Se a diferença for menor que 500k, provavelmente não é virada de 1M, é erro de digitação
             if (!window.confirm(`A leitura final (${bFinal}) é menor que a inicial (${bInicial}). É uma virada de bomba?`)) {
                 return;
             }
        }
    }

    const novo = {
      ...form,
      data_operacao: form.data,
      data: undefined,
      qtd: litrosCalculados,
      media: mediaConsumo,
      custo: custoEstimado,
      safra_id: ativos.parametros?.safraAtiva || null,
      id: U.id('AB-')
    };

    // Detalhes da OS
    const descOS = `Abastecimento: ${form.maquina} (${litrosCalculados}L)`;
    const detalhesOS: any = {
      "Bomba": `${form.bombaInicial} -> ${form.bombaFinal}`,
      "Consumo": `${mediaConsumo} L/h (Média)`,
      "Custo": `R$ ${U.formatValue(custoEstimado)}`,
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
      id: U.id('OS-'),
      modulo: 'Abastecimento',
      descricao: descOS,
      detalhes: detalhesOS,
      status: 'Concluída',
      data_abertura: new Date().toISOString()
    };

    genericSave('os', novaOS, {
      type: ACTIONS.ADD_RECORD,
      modulo: 'os',
      record: novaOS
    });

    // Verificar estoque crítico
    const litrosUsados = U.parseDecimal(litrosCalculados);
    const estoqueAposAbastecimento = estoqueAtual - litrosUsados;

    if (estoqueAposAbastecimento <= estoqueMinimo) {
      const osPendentes = (os || []).filter((o: any) => o.status === 'Pendente');
      const compraPendentes = osPendentes.some((o: any) => o.descricao.includes('COMPRA URGENTE DE DIESEL'));

      if (!compraPendentes) {
        const alertaDesc = `COMPRA URGENTE DE DIESEL - ESTOQUE CRÍTICO (${U.formatInt(estoqueAposAbastecimento)}L)`;
        const alertaDetalhes = {
          "Alerta": "Automático por Estoque Crítico de Combustível",
          "Estoque Atual": `${U.formatInt(estoqueAposAbastecimento)} L`,
          "Mínimo Configurado": `${U.formatInt(estoqueMinimo)} L`,
          "Prioridade": "URGENTE"
        };

        const alertaOS = {
          id: U.id('OS-ALERT-'),
          modulo: 'Estoque',
          descricao: alertaDesc,
          detalhes: alertaDetalhes,
          status: 'Pendente',
          data: new Date().toISOString()
        };

        genericSave('os', alertaOS, {
          type: ACTIONS.ADD_RECORD,
          modulo: 'os',
          record: alertaOS
        });
        toast.success('ALERTA! OS de Compra de Diesel criada automaticamente.');
      }
    }

    // Reset do formulário
    setForm(prev => ({
      ...prev,
      maquina: '',
      bombaFinal: '',
      horimetroAnterior: '',
      horimetroAtual: '',
      obs: '',
      tanqueCheio: true
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
