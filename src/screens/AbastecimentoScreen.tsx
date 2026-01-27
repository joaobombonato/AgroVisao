import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Fuel, Search, ChevronDown, Check, X, Gauge, Truck, Droplet, Plus, Minus, AlertTriangle, ChevronUp, Factory } from 'lucide-react';
import { useAppContext, ACTIONS } from '../context/AppContext';
import { PageHeader, Input, TableWithShowMore, SearchableSelect } from '../components/ui/Shared';
import { U } from '../data/utils';
import { toast } from 'react-hot-toast';
import { Abastecimento } from '../types';

// ==========================================
// SEARCHABLE SELECT: IMPORTADO DO SHARED
// ==========================================

// ==========================================
// MODAL: COMPRA DE COMBUSTÍVEL (Estoque)
// ==========================================
function CompraCombustivelForm({ onClose }: any) {
  const { dados, dispatch } = useAppContext();
  const [form, setForm] = useState({ 
      data: U.todayIso(), 
      notaFiscal: '', 
      litros: '', 
      valorUnitario: '', 
      nfFrete: '',
      valorFrete: '',
      valorTotal: '' 
  });
  
  const [showFrete, setShowFrete] = useState(false);

  // Cálculo automático do Total (Combustível + Frete)
  useEffect(() => {
      const l = U.parseDecimal(form.litros);
      const v = U.parseDecimal(form.valorUnitario);
      const frete = showFrete ? U.parseDecimal(form.valorFrete) : 0;
      
      if (l > 0 && v > 0) {
          setForm(prev => ({ ...prev, valorTotal: ((l * v) + frete).toFixed(2) }));
      }
  }, [form.litros, form.valorUnitario, form.valorFrete, showFrete]);

  const enviar = (e: any) => {
    e.preventDefault();
    if (!form.litros || !form.valorUnitario || !form.notaFiscal) {
        toast.error("Preencha Nota Fiscal, Litros e Valor");
        return;
    }
    const novo = { ...form, id: U.id('CP-') };
    
    const descFrete = showFrete ? ` + Frete R$${form.valorFrete}` : '';
    dispatch({ type: ACTIONS.ADD_RECORD, modulo: 'compras', record: novo, osDescricao: `Compra Diesel: ${form.litros}L (NF: ${form.notaFiscal})${descFrete}` });
    
    toast.success('Entrada de estoque registrada!');
    onClose();
  };

  const ultimasCompras = (dados?.compras || []).slice(-5).reverse();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 z-[70] flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white rounded-xl w-full max-w-sm shadow-2xl animate-in fade-in zoom-in duration-200 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center border-b p-4 bg-green-50 rounded-t-xl">
            <h2 className="text-lg font-bold flex items-center gap-2 text-green-800"><Fuel className="w-5 h-5" /> Nova Compra de Diesel</h2>
            <button onClick={onClose} className="p-1 rounded-full hover:bg-green-200 text-green-800"><X className="w-5 h-5" /></button>
        </div>
        
        <form onSubmit={enviar} className="p-4 space-y-3">
          <div className="space-y-1">
             <label className="block text-xs font-bold text-gray-700">Data da Compra <span className="text-red-500">*</span></label>
             <input type="date" value={form.data} onChange={(e) => setForm({ ...form, data: e.target.value })} className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg text-sm focus:border-green-500 focus:outline-none" required />
          </div>
          
          <div className="space-y-1">
             <label className="block text-xs font-bold text-gray-700">Nota Fiscal <span className="text-red-500">*</span></label>
             <input 
                type="text" 
                placeholder="Informe o Nº da NF" 
                value={form.notaFiscal} 
                onChange={(e) => setForm({ ...form, notaFiscal: e.target.value })}
                className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg text-sm focus:border-green-500 focus:bg-green-50 focus:outline-none"
                required
             />
          </div>
          
          <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                 <label className="block text-xs font-bold text-gray-700">Litros (L) <span className="text-red-500">*</span></label>
                 <input 
                    type="text" 
                    placeholder="Ex: 500,0" 
                    value={form.litros} 
                    onChange={(e: any) => {
                       const val = e.target.value;
                       if (/^[0-9]*[.,]?[0-9]*$/.test(val)) {
                           setForm({ ...form, litros: val });
                       }
                    }}
                    className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg text-sm focus:border-green-500 focus:bg-green-50 focus:outline-none"
                    required
                 />
              </div>
              <div className="space-y-1">
                 <label className="block text-xs font-bold text-gray-700">Valor Unitário <span className="text-red-500">*</span></label>
                 <input 
                    type="text" 
                    placeholder="Ex: 6,45" 
                    value={form.valorUnitario} 
                    onChange={(e: any) => {
                       const val = e.target.value;
                       if (/^[0-9]*[.,]?[0-9]*$/.test(val)) {
                           setForm({ ...form, valorUnitario: val });
                       }
                    }}
                    className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg text-sm focus:border-green-500 focus:bg-green-50 focus:outline-none"
                    required
                 />
              </div>
          </div>

          {/* FRETE OPCIONAL */}
          <div className="border-t pt-2">
             <button type="button" onClick={() => setShowFrete(!showFrete)} className="text-xs font-bold text-green-600 flex items-center gap-1 hover:text-green-600 mb-2">
                 Frete (Opcional) {showFrete ? <Minus className="w-3 h-3"/> : <Plus className="w-3 h-3"/>}
             </button>
             {showFrete && (
                 <div className="grid grid-cols-2 gap-3 bg-gray-50 p-2 rounded-lg animate-in slide-in-from-top-1">
                     <Input label="NF Frete" placeholder="Nº da NF Frete" value={form.nfFrete} onChange={(e:any) => setForm({ ...form, nfFrete: e.target.value })} />
                     <Input label="Valor Frete (R$)" type="text" numeric={true} placeholder="Ex: 150,00" value={form.valorFrete} onChange={(e:any) => setForm({ ...form, valorFrete: e.target.value })} />
                 </div>
             )}
          </div>

          <div className="bg-green-100 border border-green-300 p-3 rounded-lg text-center">
              <p className="text-xs font-bold text-green-600 uppercase">Custo Total (Combustível + Frete)</p>
              <p className="text-xl font-black text-green-800">R$ {U.formatValue(form.valorTotal)}</p>
          </div>
          
          <button type="submit" className="w-full bg-green-600 text-white py-3 rounded-lg font-bold hover:bg-green-700">Registrar Compra</button>
        </form>

        {/* HISTÓRICO DE COMPRAS (ÚLTIMAS 5) */}
        <div className="p-4 border-t bg-gray-50">
             <p className="text-xs font-bold text-gray-500 mb-2 uppercase flex items-center gap-1"><Check className="w-3 h-3"/> Últimas 5 Compras</p>
             {ultimasCompras.length === 0 ? <p className="text-xs text-gray-400 italic">Nenhuma compra recente.</p> : 
                ultimasCompras.map((c:any) => (
                    <div key={c.id} className="text-xs flex justify-between py-2 border-b last:border-0 border-gray-200">
                        <span className="text-gray-600">{U.formatDate(c.data)}</span>
                        <span className="font-bold text-gray-800">{c.litros} L</span>
                        <span className="font-bold text-green-700">R$ {U.formatValue(c.valorTotal)}</span>
                    </div>
                ))
             }
        </div>
      </div>
    </div>
  );
}

// ==========================================
// TELA PRINCIPAL: ABASTECIMENTO
// ==========================================
export default function AbastecimentoScreen() {
  // CORREÇÃO 1: Remover duplicatas e garantir que 'os' (lista de OS) venha do contexto
  const { state, dados, os, dispatch, setTela, ativos, buscarUltimaLeitura, genericSave } = useAppContext();
  const { userRole, permissions } = state;
  const rolePermissions = permissions?.[userRole || ''] || permissions?.['Operador'];
  
  const [form, setForm] = useState({ 
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
  
  const [showCompraForm, setShowCompraForm] = useState(false);
  const [showObs, setShowObs] = useState(false);
  const [filterData, setFilterData] = useState('');
  const [filterText, setFilterText] = useState('');

  // 1. CÁLCULO DE ESTOQUE (DINÂMICO PELO BANCO)
  const pEstoque = ativos.parametros?.estoque || {};
  const estoqueInicial = pEstoque.ajusteManual !== '' ? U.parseDecimal(pEstoque.ajusteManual) : 0; 
  const estoqueMinimo = pEstoque.estoqueMinimo !== '' ? U.parseDecimal(pEstoque.estoqueMinimo) : 0;
  const capacidadeTanque = pEstoque.capacidadeTanque !== '' ? U.parseDecimal(pEstoque.capacidadeTanque) : 0;
  
  const totalComprado = useMemo(() => (dados?.compras || []).reduce((s:number, i:any) => s + U.parseDecimal(i.litros), 0), [dados?.compras]);
  const totalUsado = useMemo(() => (dados?.abastecimentos || []).reduce((s:number, i:any) => s + U.parseDecimal(i.qtd), 0), [dados?.abastecimentos]);
  
  const estoqueAtual = (estoqueInicial + totalComprado - totalUsado);
  const percentualTanque = Math.min(((estoqueAtual / capacidadeTanque) * 100), 100).toFixed(0); 
  const nivelCritico = estoqueAtual <= estoqueMinimo;

  // 2. LÓGICA DE BOMBA E MÁQUINA
  useEffect(() => {
     if (typeof buscarUltimaLeitura === 'function') {
         const ultimaBomba = buscarUltimaLeitura('abastecimentos', 'bombaFinal', '*');
         setForm(prev => ({ ...prev, bombaInicial: ultimaBomba ? ultimaBomba.bombaFinal : '0' }));
     }
  }, [dados?.abastecimentos, buscarUltimaLeitura]);

  const handleMaquinaChange = (e: any) => {
      const maq = e.target.value;
      const ultimo = buscarUltimaLeitura('abastecimentos', 'maquina', maq);
      
      // Busca Centro de Custo vinculado a esta máquina
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

  // 3. CÁLCULOS DINÂMICOS (COM VIRADA DE BOMBA)
  const litrosCalculados = useMemo(() => {
      const ini = U.parseDecimal(form.bombaInicial);
      const fim = U.parseDecimal(form.bombaFinal);
      
      if (fim >= ini) {
          return (fim - ini).toFixed(2);
      } else {
          // Virada de Bomba (ex: 99.999.990 -> 00.000.050)
          // Contador de 8 dígitos vai até 99.999.999, então a virada soma 100.000.000
          const MODULO = 100000000;
          return ((MODULO + fim) - ini).toFixed(2);
      }
  }, [form.bombaInicial, form.bombaFinal]);

  const mediaConsumo = useMemo(() => {
      // Só calcula média se o tanque foi cheio
      if (!form.tanqueCheio) return 'N/A';

      const l = U.parseDecimal(litrosCalculados);
      const hAnt = U.parseDecimal(form.horimetroAnterior);
      const hAtu = U.parseDecimal(form.horimetroAtual);
      if (l > 0 && hAtu > hAnt) {
          return (l / (hAtu - hAnt)).toFixed(2);
      }
      return '0.00';
  }, [litrosCalculados, form.horimetroAnterior, form.horimetroAtual, form.tanqueCheio]);

  const precoMedioDiesel = useMemo(() => {
      const compras = dados.compras || [];
      if (compras.length > 0) {
          const ultimaCompra = compras[compras.length - 1];
          return U.parseDecimal(ultimaCompra.valorUnitario || 0);
      }
      const pFinanceiro = ativos.parametros?.financeiro?.precoDiesel;
      return pFinanceiro !== '' ? U.parseDecimal(pFinanceiro) : 0; 
  }, [dados.compras, ativos.parametros]);

  const custoEstimado = (U.parseDecimal(litrosCalculados) * precoMedioDiesel).toFixed(2);
  
  // 4. FUNÇÃO ENVIAR (AGORA COM LÓGICA DE OS AUTOMÁTICA)
  const enviar = (e: any) => {
    e.preventDefault();
    
    // --- TRAVA DE DUPLICIDADE (ABASTECIMENTO) ---
    const jaExiste = (dados.abastecimentos || []).some((a: any) => 
        a.maquina === form.maquina && 
        a.data === form.data && 
        U.parseDecimal(a.horimetroAtual) === U.parseDecimal(form.horimetroAtual)
    );

    if (jaExiste) {
        toast.error("Este abastecimento já foi registrado (Mesma máquina, data e horímetro).");
        return;
    }
    // ---------------------------------------------

    if (!form.maquina || U.parseDecimal(litrosCalculados) <= 0) { toast.error("Verifique os dados da Bomba e Máquina"); return; }
    
    if (!form.horimetroAtual) { toast.error("Informe o Hodômetro Atual"); return; }
    
    if (U.parseDecimal(form.horimetroAtual) <= U.parseDecimal(form.horimetroAnterior)) {
        toast.error("Hodômetro Atual deve ser maior que o Anterior");
        return;
    }

    const novo = { 
        ...form, 
        qtd: litrosCalculados, 
        media: mediaConsumo,
        custo: custoEstimado,
        safra_id: ativos.parametros?.safraAtiva || null,
        id: U.id('AB-') 
    };
    
    // 1. REGISTRO DO ABASTECIMENTO (e sua OS de registro)
    // Usando genericSave para persistência Híbrida
    const descOS = `Abastecimento: ${form.maquina} (${litrosCalculados}L)`;
    const detalhesOS: any = {
            "Bomba": `${form.bombaInicial} -> ${form.bombaFinal}`,
            "Consumo": `${mediaConsumo} L/h (Média)`,
            "Custo": `R$ ${U.formatValue(custoEstimado)}`,
            "Obs": form.obs || '-'
    };

    // --- ALERTA DE MANUTENÇÃO ---
    // Verifica se a máquina excedeu o limite de revisão
    const maquinaObj = (ativos?.maquinas || []).find((m:any) => m.nome === form.maquina);
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
            
            // Opcional: Criar OS Específica de Manutenção aqui
        }
    }
    // ----------------------------

    genericSave('abastecimentos', novo, {
        type: ACTIONS.ADD_RECORD, 
        modulo: 'abastecimentos'
    });

    // 2. Persistência Silenciosa da OS (Best Effort)
    const novaOS = {
        id: U.id('OS-'),
        modulo: 'Abastecimento',
        descricao: `Abastecimento: ${form.maquina} (${litrosCalculados}L)`,
        detalhes: {
            "Bomba": `${form.bombaInicial} -> ${form.bombaFinal}`,
            "Consumo": `${mediaConsumo} L/h (Média)`,
            "Custo": `R$ ${U.formatValue(custoEstimado)}`,
            "Obs": form.obs || '-'
        },
        status: 'Pendente',
        data: new Date().toISOString()
    };

    genericSave('os', novaOS, {
        type: ACTIONS.ADD_RECORD,
        modulo: 'os', 
        record: novaOS
    });
    
    // 2. LÓGICA DE OS AUTOMÁTICA DE ESTOQUE
    const litrosUsados = U.parseDecimal(litrosCalculados);
    const estoqueAposAbastecimento = estoqueAtual - litrosUsados;

    if (estoqueAposAbastecimento <= estoqueMinimo) {
        const osPendentes = (os || []).filter((o:any) => o.status === 'Pendente');
        const compraPendentes = osPendentes.some((o:any) => o.descricao.includes('COMPRA URGENTE DE DIESEL'));

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
    
    // 3. Reset do formulário
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

  const excluir = (id: string) => { dispatch({ type: ACTIONS.SET_MODAL, modal: { isOpen: true, message: 'Excluir registro? O estoque será corrigido.', onConfirm: () => { dispatch({ type: ACTIONS.REMOVE_RECORD, modulo: 'abastecimentos', id }); dispatch({ type: ACTIONS.SET_MODAL, modal: { isOpen: false, message: '', onConfirm: () => {} } }); toast.error('Registro excluído.'); } } }); };
  
  const listFilter = useMemo(() => (dados?.abastecimentos || []).filter((i:any) => {
      const txt = (filterText || '').toLowerCase();
      return (!filterData || i.data === filterData) && 
             (!filterText || (i.maquina || '').toLowerCase().includes(txt));
  }).reverse(), [dados?.abastecimentos, filterData, filterText]);

  return (
    <div className="space-y-4 p-4 pb-24">
      <PageHeader setTela={setTela} title="Abastecimento" icon={Fuel} colorClass="bg-red-500" />
      
      {/* PAINEL DE ESTOQUE (TANQUE) - CENTRALIZADO */}
      <div className={`rounded-xl p-4 text-white shadow-lg transition-colors ${nivelCritico ? 'bg-red-600 animate-pulse' : 'bg-gradient-to-r from-red-500 to-red-600'}`}>
         <div className="flex flex-col items-center justify-center mb-2">
             <p className="text-xs font-bold uppercase opacity-80 mb-1">Estoque Disponível</p>
             <p className="text-4xl font-black tracking-tighter text-center">{U.formatInt(estoqueAtual)} <span className="text-lg font-medium">L</span></p>
         </div>
         
         <div className="w-full bg-black/20 rounded-full h-3 overflow-hidden">
             <div className={`h-full transition-all duration-1000 ${nivelCritico ? 'bg-yellow-300' : 'bg-white'}`} style={{ width: `${percentualTanque}%` }}></div>
         </div>
         
         <p className="text-xs opacity-80 mt-1 text-center font-bold">{percentualTanque}% (Tanque {U.formatInt(capacidadeTanque)}L)</p>

         {nivelCritico && (
             <span className="flex items-center justify-center gap-1 text-xs font-bold bg-yellow-400 text-red-900 px-2 py-1 rounded mt-2 animate-bounce">
                 <AlertTriangle className="w-3 h-3"/> ESTOQUE CRÍTICO
             </span>
         )}
      </div>

      {showCompraForm && <CompraCombustivelForm onClose={() => setShowCompraForm(false)} />}

      {/* ÁREA DE CONTROLE DE ESTOQUE (Estilo Original) */}
      {rolePermissions?.actions?.abastecimento_compra !== false && (
          <div className="bg-white rounded-lg border-2 p-4 shadow-sm">
             <h2 className="font-bold border-b pb-2 mb-3 text-gray-700 text-center uppercase text-sm flex items-center justify-center gap-2">
                <Factory className="w-5 h-5 text-gray-600" /> Controle de Estoque
             </h2>
             <button 
                onClick={() => setShowCompraForm(true)} 
                className="w-full bg-green-600 text-white py-2 rounded-lg font-bold shadow-sm hover:bg-green-700 active:scale-95 flex items-center justify-center gap-2 text-sm"
             >
                <Plus className="w-4 h-4" /> Nova Compra de Diesel
             </button>
          </div>
      )}

      <div className="bg-white rounded-lg border-2 p-4 shadow-sm">
        <h2 className="font-bold border-b pb-2 mb-3 text-gray-700 flex items-center gap-2">
            <Truck className="w-5 h-5 text-red-500"/> Registro de Consumo
        </h2>
        
        <form onSubmit={enviar} className="space-y-4">
          
          <div className="space-y-1">
             <label className="block text-xs font-bold text-gray-700">Data do Consumo <span className="text-red-500">*</span></label>
             <input type="date" value={form.data} onChange={(e) => setForm({ ...form, data: e.target.value })} className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg text-sm focus:border-red-500 focus:outline-none" required />
          </div>

          <SearchableSelect 
              label="Máquina / Veículo" 
              placeholder="Buscar o Maquinas... Ex: Trator" 
              options={ativos?.maquinas || []} 
              value={form.maquina} 
              onChange={handleMaquinaChange} 
              required
              color="red"
          />

          <div className="flex items-center gap-2 p-2 bg-red-50 rounded-lg border border-red-100">
             <input 
                type="checkbox" 
                id="tanqueCheio"
                checked={form.tanqueCheio}
                onChange={(e) => setForm({...form, tanqueCheio: e.target.checked})}
                className="w-5 h-5 text-red-600 rounded focus:ring-red-500 border-gray-300"
             />
             <label htmlFor="tanqueCheio" className="text-xs font-bold text-red-800 cursor-pointer">
                 Tanque foi COMPLETADO? (Para cálculo exato de média)
             </label>
          </div>

          <div>
            <button type="button" onClick={() => setShowObs(!showObs)} className="flex items-center gap-1 text-xs font-bold text-red-600 hover:text-red-700 mb-1">
                {showObs ? <ChevronUp className="w-3 h-3"/> : <ChevronDown className="w-3 h-3"/>}
                {showObs ? 'Ocultar Observação' : 'Adicionar Observação (Opcional)'}
            </button>
            {showObs && (
                <div className="animate-in slide-in-from-top-1">
                    <textarea 
						value={form.obs} 
						onChange={(e) => setForm({...form, obs: e.target.value})} 
						placeholder="Detalhes adicionais..." 
						className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:border-red-500 focus:outline-none h-16 resize-none"
					/>
                </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4 bg-gray-50 p-3 rounded-xl border border-gray-200">
              <div className="col-span-2 text-xs font-bold text-gray-500 uppercase tracking-widest border-b pb-1 mb-1 text-center">Leitura da Bomba</div>
              {/* LEITURA DA BOMBA ANTERIOR COM NOVO ESTILO */}
              <div className="space-y-1">
                 <div className="flex justify-center items-center gap-1">
				 <label className="block text-xs font-bold text-gray-500 text-center">Inicial</label>
                      <span className="text-[10px] text-red-600 bg-red-100 px-1 rounded">Auto</span>
				</div>
                 <div className="bg-red-50 border border-red-100 rounded-lg p-2 relative">
				      <div className="absolute left-2 top-2 w-4 h-4 text-red-400" />
                      <input 
					      type="text" 
						 value={form.bombaInicial} 
						 readOnly
						 className="w-full bg-transparent font-bold text-red-800 outline-none text-center" 
						 placeholder="-" 
					 />
                 </div>
              </div>
              
              <div className="space-y-1">
                 <label className="block text-xs font-bold text-gray-700 text-center">Final <span className="text-red-500">*</span></label>
                 <input 
                    type="text" 
                    value={form.bombaFinal} 
                    onChange={(e: any) => {
                       const val = e.target.value;
                       if (/^[0-9]*[.,]?[0-9]*$/.test(val)) {
                           setForm({...form, bombaFinal: val});
                       }
                    }}
                    className="w-full px-2 py-2 border-2 border-gray-300 rounded-lg font-bold text-gray-900 focus:border-red-500 focus:outline-none text-center"
                    placeholder="Ex: 12550,5"
                    required
                 />
              </div>

              <div className="col-span-2 text-xs font-bold text-gray-500 uppercase tracking-widest border-b pb-1 mb-1 mt-2 text-center">Leitura Hodômetro / Horímetro</div>

              {/* HORIMETRO ANTERIOR COM NOVO ESTILO */}
              <div className="space-y-1">
                 <div className="flex justify-center items-center gap-1">
                      <label className="block text-xs font-bold text-gray-500 text-center">Anterior</label>
                      <span className="text-[10px] text-red-600 bg-red-100 px-1 rounded">Auto</span>
                 </div>
                 <div className="bg-red-50 border border-red-100 rounded-lg p-2 relative">
                      <Gauge className="absolute left-2 top-2 w-4 h-4 text-red-400" />
                      <input 
                          type="text" 
                          value={form.horimetroAnterior} 
                          readOnly 
                          className="w-full pl-6 bg-transparent font-bold text-red-800 outline-none text-center" 
                          placeholder="-" 
                      />
                 </div>
              </div>

              <div className="space-y-1">
                 <label className="block text-xs font-bold text-gray-700 text-center">Atual <span className="text-red-500">*</span></label>
                 <input 
                    type="text" 
                    value={form.horimetroAtual} 
                    onChange={(e: any) => {
                       const val = e.target.value;
                       if (/^[0-9]*[.,]?[0-9]*$/.test(val)) {
                           setForm({...form, horimetroAtual: val});
                       }
                    }}
                    className="w-full px-2 py-2 border-2 border-gray-300 rounded-lg font-bold text-gray-900 focus:border-red-500 focus:outline-none text-center"
                    placeholder="Ex: 501,5"
                    required 
                 />
              </div>
          </div>

          <div className="flex justify-between items-center bg-gray-800 text-white p-4 rounded-xl shadow-lg">
              <div className="text-center">
                  <p className="text-[10px] text-gray-400 uppercase font-bold">Litros</p>
                  <p className="text-xl font-bold text-red-400">{litrosCalculados} <span className="text-xs text-gray-500">L</span></p>
              </div>
              <div className="text-center">
                    <p className="text-[10px] text-gray-400 uppercase font-bold">Média Consumo</p>
                    <p className="text-xl font-bold">{mediaConsumo} <span className="text-xs text-gray-500">Hr/L</span></p>
              </div>
              <div className="text-center">
                  <p className="text-[10px] text-gray-400 uppercase font-bold">Custo Estimado</p>
                  <p className="text-xl font-bold text-green-400">R$ {U.formatValue(custoEstimado)}</p>
              </div>
          </div>

          <button type="submit" className="w-full bg-red-600 text-white py-3 rounded-lg font-bold hover:bg-red-700 transition-colors shadow-md flex items-center justify-center gap-2">
              <Check className="w-5 h-5"/> Confirmar Abastecimento
          </button>
        </form>
      </div>

      <div className="bg-white rounded-lg border-2 overflow-hidden shadow-sm">
        <div className="p-3 border-b bg-gray-50">
            <h2 className="font-bold text-sm uppercase text-gray-600 mb-2">Histórico de Abastecimento</h2>
            <div className="flex gap-2">
                <input type="date" value={filterData} onChange={e => setFilterData(e.target.value)} className="text-xs border rounded p-2" />
                <div className="relative flex-1">
                    <Search className="absolute left-2 top-2 w-4 h-4 text-gray-400"/>
                    <input type="text" placeholder="Máquina..." value={filterText} onChange={e => setFilterText(e.target.value)} className="w-full pl-8 text-xs border rounded p-2" />
                </div>
            </div>
        </div>
        
        {/* TABELA CENTRALIZADA COM COLUNA FINAL */}
        <TableWithShowMore data={listFilter}>
            {(items:any[], Row:any) => (
                <>
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-2 py-2 text-center text-xs font-bold text-gray-500">Data</th>
                            <th className="px-2 py-2 text-center text-xs font-bold text-gray-500">Máquina</th>
                            <th className="px-2 py-2 text-center text-xs font-bold text-gray-500">Lts</th>
                            <th className="px-2 py-2 text-center text-xs font-bold text-gray-500">Méd</th>
                            <th className="px-2 py-2 text-center text-xs font-bold text-gray-500">Final</th>
                            <th className="px-2 py-2 text-center text-xs font-bold text-gray-500">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y">
                        {items.map((item: Abastecimento) => (
                            <Row key={item.id} onDelete={() => excluir(item.id)}>
                                <td className="px-2 py-2 text-center text-gray-700 text-xs whitespace-nowrap">{U.formatDate(item.data).slice(0,5)}</td>
                                <td className="px-2 py-2 text-center text-gray-700 text-xs">
                                    <div className="font-bold truncate max-w-[80px] sm:max-w-none mx-auto">{item.maquina}</div>
                                    <div className="text-[9px] text-gray-400">Km: {item.horimetro}</div>
                                </td>
                                <td className="px-2 py-2 text-center">
                                    <div className="font-bold text-red-600 text-xs">{item.quantidade}</div>
                                </td>
                                <td className="px-2 py-2 text-center text-xs font-bold text-gray-700">
                                    {/* @ts-ignore: media nao esta na interface base, mas existe no runtime */}
                                    {item.media || '-'}
                                </td>
                                <td className="px-2 py-2 text-center text-xs text-gray-700">{(item as any).bombaFinal || '-'}</td>
                                <td className="px-2 py-2 text-center">
                                    <div className="flex justify-center">
                                        {/* Ações como excluir, ver detalhes, etc. */}
                                    </div>
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