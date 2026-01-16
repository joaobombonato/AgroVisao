import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Fuel, Search, ChevronDown, Check, X, Gauge, Truck, Droplet, Plus, Minus, AlertTriangle, ChevronUp, Factory } from 'lucide-react';
import { useAppContext, ACTIONS } from '../context/AppContext';
import { PageHeader, Input, TableWithShowMore } from '../components/ui/Shared';
import { U } from '../data/utils';
import { toast } from 'react-hot-toast';

// ==========================================
// Componente: SELECT PESQUISÁVEL (Vermelho)
// ==========================================
function SearchableSelect({ label, value, onChange, options = [], placeholder, required = false }: any) {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState('');
    const wrapperRef = useRef<any>(null);

    useEffect(() => {
        function handleClickOutside(event: any) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [wrapperRef]);

    const filteredOptions = options.filter((opt: any) => {
        const text = typeof opt === 'string' ? opt : opt.nome || '';
        return text.toLowerCase().includes(search.toLowerCase());
    });

    const handleSelect = (opt: any) => {
        const val = typeof opt === 'string' ? opt : opt.nome;
        onChange({ target: { value: val } });
        setIsOpen(false);
        setSearch('');
    };

    return (
        <div className="space-y-1 relative" ref={wrapperRef}>
            <label className="block text-xs font-bold text-gray-700">
                {label} {required && <span className="text-red-500">*</span>}
            </label>
            <div className="relative" onClick={() => { if(!isOpen) setIsOpen(true); }}>
                <div className={`w-full border-2 rounded-lg px-3 py-3 text-sm flex justify-between items-center bg-white cursor-pointer ${isOpen ? 'border-red-500 ring-1 ring-red-200' : 'border-gray-300'}`}>
                    <span className={value ? 'text-gray-900 font-medium' : 'text-gray-400'}>
                        {value || placeholder}
                    </span>
                    <ChevronDown className="w-4 h-4 text-gray-400" />
                </div>
                {isOpen && (
                    <div className="absolute z-50 w-full bg-white border-2 border-red-500 rounded-lg mt-1 shadow-xl max-h-60 overflow-hidden flex flex-col">
                        <div className="p-2 border-b bg-red-50 sticky top-0">
                            <div className="flex items-center bg-white border rounded px-2">
                                <Search className="w-4 h-4 text-gray-400 mr-2" />
                                <input autoFocus type="text" className="w-full py-2 text-sm outline-none" placeholder="Buscar..." value={search} onChange={e => setSearch(e.target.value)} />
                            </div>
                        </div>
                        <div className="overflow-y-auto flex-1">
                            {filteredOptions.length === 0 ? <div className="p-4 text-center text-xs text-gray-500">Nada encontrado</div> : 
                                filteredOptions.map((opt: any, idx: number) => {
                                    const text = typeof opt === 'string' ? opt : opt.nome;
                                    const isSelected = text === value;
                                    return (
                                        <button key={idx} type="button" onClick={(e) => { e.stopPropagation(); handleSelect(opt); }} className={`w-full text-left px-4 py-3 text-sm border-b last:border-0 hover:bg-red-50 flex justify-between items-center ${isSelected ? 'bg-red-50 font-bold text-red-800' : 'text-gray-700'}`}>
                                            {text} {isSelected && <Check className="w-4 h-4 text-red-600"/>}
                                        </button>
                                    );
                                })
                            }
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

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

  const ultimasCompras = (dados.compras || []).slice(-5).reverse();

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
                    type="number" 
                    placeholder="Informe quantidade..." 
                    value={form.litros} 
                    onChange={(e) => setForm({ ...form, litros: e.target.value })}
                    className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg text-sm focus:border-green-500 focus:bg-green-50 focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    required
                 />
              </div>
              <div className="space-y-1">
                 <label className="block text-xs font-bold text-gray-700">Valor Unitário <span className="text-red-500">*</span></label>
                 <input 
                    type="number" 
                    placeholder="Informe o valor..." 
                    value={form.valorUnitario} 
                    onChange={(e) => setForm({ ...form, valorUnitario: e.target.value })}
                    className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg text-sm focus:border-green-500 focus:bg-green-50 focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
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
                     <Input label="Valor Frete (R$)" type="number" placeholder="Informe o valor..." value={form.valorFrete} onChange={(e:any) => setForm({ ...form, valorFrete: e.target.value })} />
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
  const { dados, os, dispatch, setTela, ativos, buscarUltimaLeitura } = useAppContext();
  
  const [form, setForm] = useState({ 
      data: U.todayIso(), 
      maquina: '', 
      combustivel: 'Diesel S10', 
      bombaInicial: '', 
      bombaFinal: '', 
      horimetroAnterior: '', 
      horimetroAtual: '',
      obs: '' 
  });
  
  const [showCompraForm, setShowCompraForm] = useState(false);
  const [showObs, setShowObs] = useState(false);
  const [filterData, setFilterData] = useState('');
  const [filterText, setFilterText] = useState('');

  // 1. CÁLCULOS DE ESTOQUE (TANQUE) - LOCAL
  // Definindo aqui para evitar conflito com Contexto e garantir atualização rápida
  const estoqueInicial = U.parseDecimal(ativos.estoqueDiesel?.inicial || 3000); 
  const estoqueMinimo = U.parseDecimal(ativos.estoqueDiesel?.minimo || 750);
  
  const totalComprado = useMemo(() => (dados.compras || []).reduce((s:number, i:any) => s + U.parseDecimal(i.litros), 0), [dados.compras]);
  const totalUsado = useMemo(() => (dados.abastecimentos || []).reduce((s:number, i:any) => s + U.parseDecimal(i.qtd), 0), [dados.abastecimentos]);
  
  const estoqueAtual = (estoqueInicial + totalComprado - totalUsado);
  const percentualTanque = Math.min(((estoqueAtual / 15000) * 100), 100).toFixed(0); 
  const nivelCritico = estoqueAtual <= estoqueMinimo;

  // 2. LÓGICA DE BOMBA E MÁQUINA
  useEffect(() => {
     const ultimaBomba = buscarUltimaLeitura('abastecimentos', 'bombaFinal', '*');
     setForm(prev => ({ ...prev, bombaInicial: ultimaBomba ? ultimaBomba.bombaFinal : '0' }));
  }, [dados.abastecimentos, buscarUltimaLeitura]);

  const handleMaquinaChange = (e: any) => {
      const maq = e.target.value;
      const ultimo = buscarUltimaLeitura('abastecimentos', 'maquina', maq);
      setForm(prev => ({ 
          ...prev, 
          maquina: maq, 
          horimetroAnterior: ultimo ? ultimo.horimetroAtual : '' 
      }));
  };

  // 3. CÁLCULOS DINÂMICOS
  const litrosCalculados = useMemo(() => {
      const ini = U.parseDecimal(form.bombaInicial);
      const fim = U.parseDecimal(form.bombaFinal);
      return fim > ini ? (fim - ini).toFixed(2) : '0';
  }, [form.bombaInicial, form.bombaFinal]);

  const mediaConsumo = useMemo(() => {
      const l = U.parseDecimal(litrosCalculados);
      const hAnt = U.parseDecimal(form.horimetroAnterior);
      const hAtu = U.parseDecimal(form.horimetroAtual);
      if (l > 0 && hAtu > hAnt) {
          return (l / (hAtu - hAnt)).toFixed(2);
      }
      return '0.00';
  }, [litrosCalculados, form.horimetroAnterior, form.horimetroAtual]);

  const precoMedioDiesel = useMemo(() => {
      const compras = dados.compras || [];
      if (compras.length > 0) {
          const ultimaCompra = compras[compras.length - 1];
          return U.parseDecimal(ultimaCompra.valorUnitario || 0);
      }
      return 6.00; 
  }, [dados.compras]);

  const custoEstimado = (U.parseDecimal(litrosCalculados) * precoMedioDiesel).toFixed(2);
  
  // 4. FUNÇÃO ENVIAR (AGORA COM LÓGICA DE OS AUTOMÁTICA)
  const enviar = (e: any) => {
    e.preventDefault();
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
        id: U.id('AB-') 
    };
    
    // 1. REGISTRO DO ABASTECIMENTO (e sua OS de registro)
    dispatch({ 
        type: ACTIONS.ADD_RECORD, 
        modulo: 'abastecimentos', 
        record: novo, 
        osDescricao: `Abastecimento: ${form.maquina} (${litrosCalculados}L)`,
        osDetalhes: {
            "Bomba": `${form.bombaInicial} -> ${form.bombaFinal}`,
            "Consumo": `${mediaConsumo} L/h (Média)`,
            "Custo": `R$ ${U.formatValue(custoEstimado)}`,
            "Obs": form.obs || '-'
        }
    });
    
    // 2. LÓGICA DE OS AUTOMÁTICA DE ESTOQUE
    const litrosUsados = U.parseDecimal(litrosCalculados);
    const estoqueAposAbastecimento = estoqueAtual - litrosUsados;

    if (estoqueAposAbastecimento <= estoqueMinimo) {
        // CORREÇÃO 2: Verificar na lista 'os' (raiz) e não em 'dados.os'
        const osPendentes = (os || []).filter((o:any) => o.status === 'Pendente');
        const compraPendentes = osPendentes.some((o:any) => o.descricao.includes('COMPRA URGENTE DE DIESEL'));

        if (!compraPendentes) {
            // Cria a OS de alerta de estoque crítico
            dispatch({ 
                type: ACTIONS.ADD_RECORD, 
                modulo: 'os_alert_estoque', // Módulo fictício para registrar apenas a OS
                record: {}, 
                osDescricao: `COMPRA URGENTE DE DIESEL - ESTOQUE CRÍTICO (${U.formatInt(estoqueAposAbastecimento)}L)`,
                osDetalhes: {
                    "Alerta": "Automático por Estoque Crítico de Combustível",
                    "Estoque Atual": `${U.formatInt(estoqueAposAbastecimento)} L`,
                    "Mínimo Configurado": `${U.formatInt(estoqueMinimo)} L`,
                    "Prioridade": "URGENTE"
                }
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
        obs: '' 
    }));
    setShowObs(false);
    toast.success('Abastecimento registrado!');
  };

  const excluir = (id: string) => { dispatch({ type: ACTIONS.SET_MODAL, modal: { isOpen: true, message: 'Excluir registro? O estoque será corrigido.', onConfirm: () => { dispatch({ type: ACTIONS.REMOVE_RECORD, modulo: 'abastecimentos', id }); dispatch({ type: ACTIONS.SET_MODAL, modal: { isOpen: false, message: '', onConfirm: () => {} } }); toast.error('Registro excluído.'); } } }); };
  
  const listFilter = useMemo(() => (dados.abastecimentos || []).filter((i:any) => {
      const txt = filterText.toLowerCase();
      return (!filterData || i.data === filterData) && 
             (!filterText || i.maquina.toLowerCase().includes(txt));
  }).reverse(), [dados.abastecimentos, filterData, filterText]);

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
         
         <p className="text-xs opacity-80 mt-1 text-center font-bold">{percentualTanque}% (Tanque 15k)</p>

         {nivelCritico && (
             <span className="flex items-center justify-center gap-1 text-xs font-bold bg-yellow-400 text-red-900 px-2 py-1 rounded mt-2 animate-bounce">
                 <AlertTriangle className="w-3 h-3"/> ESTOQUE CRÍTICO
             </span>
         )}
      </div>

      {showCompraForm && <CompraCombustivelForm onClose={() => setShowCompraForm(false)} />}

      {/* ÁREA DE CONTROLE DE ESTOQUE (Estilo Original) */}
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
              options={ativos.maquinas} 
              value={form.maquina} 
              onChange={handleMaquinaChange} 
              required 
          />

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
                    type="number" 
                    value={form.bombaFinal} 
                    onChange={(e) => setForm({...form, bombaFinal: e.target.value})}
                    className="w-full px-2 py-2 border-2 border-gray-300 rounded-lg font-bold text-gray-900 focus:border-red-500 focus:outline-none text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    placeholder="Preencher..."
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
                    type="number" 
                    value={form.horimetroAtual} 
                    onChange={(e) => setForm({...form, horimetroAtual: e.target.value})}
                    className="w-full px-2 py-2 border-2 border-gray-300 rounded-lg font-bold text-gray-900 focus:border-red-500 focus:outline-none text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    placeholder="Preencher..."
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
                        {items.map(item => (
                            <Row key={item.id} onDelete={() => excluir(item.id)}>
                                <td className="px-2 py-2 text-center text-gray-700 text-xs whitespace-nowrap">{U.formatDate(item.data).slice(0,5)}</td>
                                <td className="px-2 py-2 text-center text-gray-700 text-xs">
                                    <div className="font-bold truncate max-w-[80px] sm:max-w-none mx-auto">{item.maquina}</div>
                                    <div className="text-[9px] text-gray-400">Km: {item.horimetroAtual}</div>
                                </td>
                                <td className="px-2 py-2 text-center">
                                    <div className="font-bold text-red-600 text-xs">{item.qtd}</div>
                                </td>
                                <td className="px-2 py-2 text-center text-xs font-bold text-gray-700">
                                    {item.media !== '0.00' ? item.media : '-'}
                                </td>
                                <td className="px-2 py-2 text-center text-xs text-gray-700">{item.bombaFinal}</td>
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