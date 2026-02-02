import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Utensils, Search, ChevronDown, Check, X, Coffee, Users, DollarSign, Calendar, ChevronRight, ChevronUp } from 'lucide-react';
import { useAppContext, ACTIONS } from '../context/AppContext';
import { PageHeader, TableWithShowMore, SearchableSelect } from '../components/ui/Shared';
import { U } from '../data/utils';
import { toast } from 'react-hot-toast';

// ==========================================
// Componente: SELECT PESQUISÁVEL
// ==========================================
// ==========================================
// SEARCHABLE SELECT: IMPORTADO DO SHARED
// ==========================================

// ==========================================
// TELA PRINCIPAL: REFEIÇÕES
// ==========================================
export default function RefeicoesScreen() {
  const { dados, dispatch, setTela, ativos, genericSave } = useAppContext();
  
  const [form, setForm] = useState({ 
      data_refeicao: U.todayIso(), 
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

  // Atualiza Valor Unitário ao selecionar o Tipo
  const handleTipoChange = (e: any) => {
      const tipoSelecionado = e.target.value;
      const objetoAtivo = e.target.data; // Pega o objeto completo vindo do Select

      let preco = 0;
      
      // 1. Pega do objeto configurado (agora padrão)
      if (objetoAtivo && typeof objetoAtivo === 'object' && objetoAtivo.valor) {
          preco = objetoAtivo.valor;
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
        safra_id: ativos.parametros?.safraAtiva || null,
        id: U.id('RF-') 
    };
    
    
    const descOS = `Refeição: ${form.tipo} (${form.qtd}x)`;
    const detalheOS = {
            "Centro de Custo": form.centroCusto,
            "Qtd": form.qtd,
            "Unitário": `R$ ${U.formatValue(vUnit)}`,
            "Total": `R$ ${U.formatValue(vTotal)}`,
            "Obs": form.obs || '-'
    };

    genericSave('refeicoes', novo, {
        type: ACTIONS.ADD_RECORD, 
        modulo: 'refeicoes'
    });

    // 2. Persistência Silenciosa da OS
    const novaOS = {
        id: U.id('OS-RF-'),
        modulo: 'Refeições',
        descricao: descOS,
        detalhes: detalheOS,
        status: 'Pendente',
        data_abertura: new Date().toISOString()
    };
    genericSave('refeicoes', { ...novo, data: undefined }, { 
        type: ACTIONS.ADD_RECORD,
        modulo: 'refeicoes',
        record: novo
    });
    
    setForm({ data_refeicao: U.todayIso(), tipo: '', qtd: '', valorUnitario: '', centroCusto: '', obs: '' });
    setShowObs(false);
    toast.success('Refeição lançada!');
  };

  const listFilter = useMemo(() => (dados.refeicoes || []).filter((i:any) => {
      const txt = filterText.toLowerCase();
      return (!filterData || (i.data_refeicao || i.data) === filterData) && 
             (!filterText || i.tipo.toLowerCase().includes(txt) || i.centroCusto.toLowerCase().includes(txt));
  }).reverse(), [dados.refeicoes, filterData, filterText]);

  const getBadgeColor = (tipo: string) => {
    if (tipo.includes('Almoço')) return 'bg-orange-100 text-orange-700 border-orange-200';
    if (tipo.includes('Janta')) return 'bg-indigo-100 text-indigo-700 border-indigo-200';
    return 'bg-gray-100 text-gray-700 border-gray-200';
  };

  const excluir = (id: string) => { dispatch({ type: ACTIONS.SET_MODAL, modal: { isOpen: true, message: 'Excluir lançamento?', onConfirm: () => { dispatch({ type: ACTIONS.REMOVE_RECORD, modulo: 'refeicoes', id }); dispatch({ type: ACTIONS.SET_MODAL, modal: { isOpen: false, message: '', onConfirm: () => {} } }); toast.error('Registro excluído.'); } } }); };

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
                className="text-xs font-bold text-orange-900 bg-white border border-orange-300 rounded px-2 py-1 outline-none focus:ring-2 focus:ring-orange-400 cursor-pointer shadow-sm uppercase" 
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
             <label className="block text-xs font-bold text-gray-700 uppercase">Data do Lançamento (DD/MM/AAAA) <span className="text-red-500">*</span></label>
             <input 
                type="date" 
                value={form.data_refeicao} 
                onChange={(e) => setForm({ ...form, data_refeicao: e.target.value })} 
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
                    color="orange"
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
          {/*
            - [x] Injeção de `safra_id` nas Telas Operacionais
                - [x] `RefeicoesScreen`
                - [x] `AbastecimentoScreen`
                - [x] `EnergiaScreen`
            - [x] Implementação de Setores / Grupos para Refeições
            - [x] Verificação e Testes
          */}
          <SearchableSelect 
              label="Destinação / Setor" 
              placeholder="Para quem? Ex: Operacional" 
              options={ativos.setores || []} 
              value={form.centroCusto} 
              onChange={(e: any) => setForm({ ...form, centroCusto: e.target.value })} 
              required 
              color="orange"
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
                         type="text" 
                         value={form.qtd} 
                         onChange={(e: any) => {
                            const val = e.target.value.replace(/\D/g, '');
                            setForm({...form, qtd: val});
                         }}
                         className="w-full pl-8 pr-2 py-2 border-2 border-orange-300 rounded-lg text-sm font-bold text-gray-900 focus:outline-none focus:bg-orange-50"
                         placeholder="Qtd..."
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
                                <td className="px-3 py-2 text-gray-700 text-xs">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${getBadgeColor(item.tipo)}`}>{item.tipo}</span>
                                        <span className="text-[10px] text-gray-400">{U.formatDate(item.data_refeicao || item.data)}</span>
                                    </div>
                                    <div className="font-bold">{item.centroCusto}</div>
                                </td>
                                <td className="px-3 py-2 text-right">
                                    <div className="font-bold text-orange-600 text-sm">{item.qtd}</div>
                                    <div className="text-[10px] text-gray-500">unid.</div>
                                </td>
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