import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Utensils, Search, ChevronDown, Check, X, Coffee, Users, DollarSign, Calendar, ChevronRight, ChevronUp } from 'lucide-react';
import { useAppContext, ACTIONS } from '../context/AppContext';
import { PageHeader, TableWithShowMore } from '../components/ui/Shared';
import { U } from '../data/utils';
import { toast } from 'react-hot-toast';

// ==========================================
// Componente: SELECT PESQUISÁVEL
// ==========================================
function SearchableSelect({ label, value, onChange, options, placeholder, required = false }: any) {
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
        // Passa o objeto inteiro se for complexo, ou string se for simples
        const val = typeof opt === 'string' ? opt : opt.nome;
        // Evento simulado para manter compatibilidade
        onChange({ target: { value: val, data: opt } }); 
        setIsOpen(false);
        setSearch('');
    };

    return (
        <div className="space-y-1 relative" ref={wrapperRef}>
            <label className="block text-xs font-bold text-gray-700">
                {label} {required && <span className="text-red-500">*</span>}
            </label>
            <div 
                className="relative"
                onClick={() => { if(!isOpen) setIsOpen(true); }}
            >
                <div className={`w-full border-2 rounded-lg px-3 py-3 text-sm flex justify-between items-center bg-white cursor-pointer ${isOpen ? 'border-orange-500 ring-1 ring-orange-200' : 'border-gray-300'}`}>
                    <span className={value ? 'text-gray-900 font-medium' : 'text-gray-400'}>
                        {value || placeholder}
                    </span>
                    <ChevronDown className="w-4 h-4 text-gray-400" />
                </div>

                {isOpen && (
                    <div className="absolute z-50 w-full bg-white border-2 border-orange-500 rounded-lg mt-1 shadow-xl max-h-60 overflow-hidden flex flex-col">
                        <div className="p-2 border-b bg-orange-50 sticky top-0">
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
                                        <button key={idx} type="button" onClick={(e) => { e.stopPropagation(); handleSelect(opt); }} className={`w-full text-left px-4 py-3 text-sm border-b last:border-0 hover:bg-orange-50 flex justify-between items-center ${isSelected ? 'bg-orange-50 font-bold text-orange-800' : 'text-gray-700'}`}>
                                            {text} {isSelected && <Check className="w-4 h-4 text-orange-600"/>}
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
// TELA PRINCIPAL: REFEIÇÕES
// ==========================================
export default function RefeicoesScreen() {
  const { dados, dispatch, setTela, ativos } = useAppContext();
  
  const [form, setForm] = useState({ 
      data: U.todayIso(), 
      tipo: '', 
      qtd: '', 
      valorUnitario: '', 
      centroCusto: '', 
      obs: '' 
  });
  
  const [showObs, setShowObs] = useState(false);
  const [filterData, setFilterData] = useState('');
  const [filterText, setFilterText] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(U.currentMonthIso());

  // TABELA DE PREÇOS PADRÃO (Caso não venha do Ativo)
  const valoresPadrao: any = { 'Básica': 15, 'Executiva': 25, 'Especial': 35 };

  // Atualiza Valor Unitário ao selecionar o Tipo
  const handleTipoChange = (e: any) => {
      const tipoSelecionado = e.target.value;
      const objetoAtivo = e.target.data; // Pega o objeto completo vindo do Select (se existir)

      let preco = 0;
      
      // 1. Tenta pegar do objeto do Configurações (Futuro: { nome: 'Básica', valor: 15 })
      if (objetoAtivo && typeof objetoAtivo === 'object' && objetoAtivo.valor) {
          preco = objetoAtivo.valor;
      } 
      // 2. Se não achar, tenta pegar da tabela padrão hardcoded
      else if (valoresPadrao[tipoSelecionado]) {
          preco = valoresPadrao[tipoSelecionado];
      }

      setForm(prev => ({ 
          ...prev, 
          tipo: tipoSelecionado,
          valorUnitario: preco > 0 ? preco.toString() : '' 
      }));
  };

  // Cálculo automático do Total (Memoizado)
  const valorTotalCalculado = useMemo(() => {
      const q = U.parseDecimal(form.qtd);
      const v = U.parseDecimal(form.valorUnitario);
      if (q > 0 && v > 0) {
          return (q * v).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      }
      return '0,00';
  }, [form.qtd, form.valorUnitario]);

  // Cálculos do Resumo Mensal
  const totalMes = useMemo(() => (dados.refeicoes || []).filter((i:any) => i.data && i.data.startsWith(selectedMonth)).reduce((s:number, i:any) => {
      return s + U.parseDecimal(i.valorTotal || 0);
  }, 0), [dados.refeicoes, selectedMonth]);

  const qtdMes = useMemo(() => (dados.refeicoes || []).filter((i:any) => i.data && i.data.startsWith(selectedMonth)).length, [dados.refeicoes, selectedMonth]);

  const enviar = (e: any) => {
    e.preventDefault();
    if (!form.tipo || !form.qtd || !form.centroCusto) { toast.error("Preencha todos os campos obrigatórios"); return; }
    
    // Calcula valor numérico final
    const vUnit = U.parseDecimal(form.valorUnitario);
    const vTotal = U.parseDecimal(form.qtd) * vUnit;
    
    const novo = { 
        ...form, 
        valorTotal: vTotal, 
        id: U.id('RF-') 
    };
    
    dispatch({ 
        type: ACTIONS.ADD_RECORD, 
        modulo: 'refeicoes', 
        record: novo, 
        osDescricao: `Refeição: ${form.tipo} (${form.qtd}x)`,
        osDetalhes: {
            "Centro de Custo": form.centroCusto,
            "Qtd": form.qtd,
            "Unitário": `R$ ${U.formatValue(vUnit)}`,
            "Total": `R$ ${U.formatValue(vTotal)}`,
            "Obs": form.obs || '-'
        }
    });
    
    setForm({ data: U.todayIso(), tipo: '', qtd: '', valorUnitario: '', centroCusto: '', obs: '' });
    setShowObs(false);
    toast.success('Refeição lançada!');
  };

  const excluir = (id: string) => { dispatch({ type: ACTIONS.SET_MODAL, modal: { isOpen: true, message: 'Excluir lançamento?', onConfirm: () => { dispatch({ type: ACTIONS.REMOVE_RECORD, modulo: 'refeicoes', id }); dispatch({ type: ACTIONS.SET_MODAL, modal: { isOpen: false, message: '', onConfirm: () => {} } }); toast.error('Registro excluído.'); } } }); };
  
  const listFilter = useMemo(() => (dados.refeicoes || []).filter((i:any) => {
      const txt = filterText.toLowerCase();
      return (!filterData || i.data === filterData) && 
             (!filterText || i.tipo.toLowerCase().includes(txt) || i.centroCusto.toLowerCase().includes(txt));
  }).reverse(), [dados.refeicoes, filterData, filterText]);

  return (
    <div className="space-y-4 p-4 pb-24">
      <PageHeader setTela={setTela} title="Refeições" icon={Utensils} colorClass="bg-orange-500" />
      
      {/* CARD DE RESUMO MENSAL */}
      <div className="bg-orange-50 border-2 border-orange-200 rounded-xl p-4 shadow-md">
          <div className="flex justify-between items-center mb-3 border-b border-orange-200 pb-2">
              <p className="text-xs font-bold uppercase text-orange-700 flex items-center gap-1"><Calendar className="w-7 h-7"/> Resumo Mensal</p>
              <input 
                type="month" 
                value={selectedMonth} 
                onChange={e => setSelectedMonth(e.target.value)} 
                className="text-xs font-bold text-orange-900 bg-white border border-orange-300 rounded px-2 py-1 outline-none focus:ring-2 focus:ring-orange-400 cursor-pointer shadow-sm" 
              />
          </div>
          <div className="grid grid-cols-2 gap-4">
              <div>
                  <p className="text-3xl font-black text-gray-800 tracking-tight">R$ {U.formatValue(totalMes)}</p>
                  <p className="text-xs text-orange-600 font-bold uppercase">Gasto Total</p>
              </div>
              <div className="border-l-2 pl-4 border-orange-200">
                  <p className="text-3xl font-black text-orange-500 tracking-tight">{qtdMes}</p>
                  <p className="text-xs text-orange-600 font-bold uppercase">Refeições</p>
              </div>
          </div>
      </div>

      {/* FORMULÁRIO */}
      <div className="bg-white rounded-lg border-2 p-4 shadow-sm">
        <h2 className="font-bold border-b pb-2 mb-3 text-gray-700 flex items-center gap-2">
            <Coffee className="w-5 h-5 text-orange-500"/> Novo Lançamento
        </h2>
        
        <form onSubmit={enviar} className="space-y-3">
          
          <div className="space-y-1">
             <label className="block text-xs font-bold text-gray-700">Data do Lançamento <span className="text-red-500">*</span></label>
             <input 
                type="date" 
                value={form.data} 
                onChange={(e) => setForm({ ...form, data: e.target.value })} 
                className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg text-sm focus:border-orange-500 focus:outline-none" 
                required 
             />
          </div>

          <div className="flex gap-10">
              <div className="flex-1">
                <SearchableSelect 
                    label="Tipo de Refeição" 
                    placeholder="Selecione..." 
                    options={ativos.tiposRefeicao} 
                    value={form.tipo} 
                    onChange={handleTipoChange} 
                    required 
                />
              </div>
              <div className="w-24 space-y-1">
                 <div className="flex justify-between">
				 <label className="block text-xs font-bold text-gray-500">Unitário</label>
				 <span className="text-[10px] text-gray-400 bg-gray-100 px-1 rounded">Auto</span>
				 </div>
                 <div className="bg-gray-100 border-2 border-gray-200 rounded-lg p-2.5 h-[46px] flex items-center justify-center">
                    <span className="text-sm font-bold text-gray-600">
                        {form.valorUnitario ? `R$ ${form.valorUnitario}` : '-'}
                    </span>
                 </div>
              </div>
          </div>

          <SearchableSelect 
              label="Centro de Custo" 
              placeholder="Buscar quem consumiu? Ex: Operacional" 
              options={ativos.centrosCusto} 
              value={form.centroCusto} 
              onChange={(e:any) => setForm({ ...form, centroCusto: e.target.value })} 
              required 
          />
          
          {/* OBSERVAÇÃO */}
          <div>
            <button type="button" onClick={() => setShowObs(!showObs)} className="flex items-center gap-1 text-xs font-bold text-orange-600 hover:text-orange-700 mb-1">
                {showObs ? <ChevronUp className="w-3 h-3"/> : <ChevronDown className="w-3 h-3"/>}
                {showObs ? 'Ocultar Observação' : 'Adicionar Observação (Opcional)'}
            </button>
            {showObs && (
                <div className="animate-in slide-in-from-top-1">
                    <textarea 
                        value={form.obs}
                        onChange={(e) => setForm({...form, obs: e.target.value})}
                        placeholder="Detalhes adicionais..."
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:border-orange-500 focus:outline-none h-16 resize-none"
                    />
                </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                 <label className="block text-xs font-bold text-gray-700">Quantidade <span className="text-red-500">*</span></label>
                 <div className="relative">
                     <Users className="absolute left-2 top-2.5 w-4 h-4 text-orange-400" />
                     <input 
                        type="number" 
                        value={form.qtd} 
                        onChange={(e) => setForm({...form, qtd: e.target.value})}
                        className="w-full pl-8 pr-2 py-2 border-2 border-orange-300 rounded-lg text-sm font-bold text-gray-900 focus:outline-none focus:bg-orange-50 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        placeholder="Informe a Qtd..."
                        required
                     />
                 </div>
              </div>
              
              <div className="space-y-1">
                 <label className="block text-xs font-bold text-gray-700">Valor Total</label>
                 <div className="relative">
                     <DollarSign className="absolute left-2 top-2.5 w-4 h-4 text-green-600" />
                     <input 
                        type="text" 
                        value={valorTotalCalculado} 
                        readOnly
                        className="w-full pl-8 pr-2 py-2 border-2 border-green-200 bg-green-50 rounded-lg text-sm font-bold text-green-700 focus:outline-none"
                        placeholder="0,00"
                     />
                 </div>
              </div>
          </div>

          <button type="submit" className="w-full bg-orange-500 text-white py-3 rounded-lg font-bold hover:bg-orange-600 transition-colors shadow-md flex items-center justify-center gap-2">
              <Check className="w-5 h-5"/> Salvar Lançamento de Refeição
          </button>
        </form>
      </div>

      <div className="bg-white rounded-lg border-2 overflow-hidden shadow-sm">
        <div className="p-3 border-b bg-gray-50">
            <h2 className="font-bold text-sm uppercase text-gray-600 mb-2">Histórico de Refeições</h2>
            <div className="flex gap-2">
                <input type="date" value={filterData} onChange={e => setFilterData(e.target.value)} className="text-xs border rounded p-2" />
                <div className="relative flex-1">
                    <Search className="absolute left-2 top-2 w-4 h-4 text-gray-400"/>
                    <input type="text" placeholder="Filtrar..." value={filterText} onChange={e => setFilterText(e.target.value)} className="w-full pl-8 text-xs border rounded p-2" />
                </div>
            </div>
        </div>
        <TableWithShowMore data={listFilter}>
            {(items:any[], Row:any) => (
                <>
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-3 py-2 text-left text-xs font-bold text-gray-500">Data</th>
                            <th className="px-3 py-2 text-left text-xs font-bold text-gray-500">Tipo</th>
                            <th className="px-3 py-2 text-right text-xs font-bold text-gray-500">Qtd</th>
                            <th className="px-3 py-2 text-right text-xs font-bold text-gray-500">Total</th>
                            <th className="px-3 py-2 text-right text-xs font-bold text-gray-500">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y">
                        {items.map(item => (
                            <Row key={item.id} onDelete={() => excluir(item.id)}>
                                <td className="px-3 py-2 text-gray-700 text-xs whitespace-nowrap">{U.formatDate(item.data)}</td>
                                <td className="px-3 py-2 text-gray-700 text-xs">
                                    <div className="font-bold text-orange-700">{item.tipo}</div>
                                    <div className="text-[10px] text-gray-400">{item.centroCusto}</div>
                                </td>
                                <td className="px-3 py-2 text-right text-xs font-bold text-gray-700">{item.qtd}</td>
                                <td className="px-3 py-2 text-right text-xs font-bold text-green-600">R$ {U.formatValue(item.valorTotal)}</td>
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