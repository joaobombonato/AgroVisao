import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Zap, Search, ChevronDown, Check, X, History, Calculator } from 'lucide-react';
import { useAppContext, ACTIONS } from '../context/AppContext';
import { PageHeader, Input, TableWithShowMore } from '../components/ui/Shared';
import { U } from '../data/utils';
import { toast } from 'react-hot-toast';

// ==========================================
// Componente: SELECT PESQUISÁVEL (Reutilizado)
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
            <div 
                className="relative"
                onClick={() => { if(!isOpen) setIsOpen(true); }}
            >
                <div className={`w-full border-2 rounded-lg px-3 py-3 text-sm flex justify-between items-center bg-white cursor-pointer ${isOpen ? 'border-yellow-500 ring-1 ring-yellow-200' : 'border-gray-300'}`}>
                    <span className={value ? 'text-gray-900 font-medium' : 'text-gray-400'}>
                        {value || placeholder}
                    </span>
                    <ChevronDown className="w-4 h-4 text-gray-400" />
                </div>

                {isOpen && (
                    <div className="absolute z-50 w-full bg-white border-2 border-yellow-500 rounded-lg mt-1 shadow-xl max-h-60 overflow-hidden flex flex-col">
                        <div className="p-2 border-b bg-yellow-50 sticky top-0">
                            <div className="flex items-center bg-white border rounded px-2">
                                <Search className="w-4 h-4 text-gray-400 mr-2" />
                                <input autoFocus type="text" className="w-full py-2 text-sm outline-none" placeholder="Buscar local..." value={search} onChange={e => setSearch(e.target.value)} />
                            </div>
                        </div>
                        <div className="overflow-y-auto flex-1">
                            {filteredOptions.length === 0 ? <div className="p-4 text-center text-xs text-gray-500">Nada encontrado</div> : 
                                filteredOptions.map((opt: any, idx: number) => {
                                    const text = typeof opt === 'string' ? opt : opt.nome;
                                    const isSelected = text === value;
                                    return (
                                        <button key={idx} type="button" onClick={(e) => { e.stopPropagation(); handleSelect(opt); }} className={`w-full text-left px-4 py-3 text-sm border-b last:border-0 hover:bg-yellow-50 flex justify-between items-center ${isSelected ? 'bg-yellow-50 font-bold text-yellow-800' : 'text-gray-700'}`}>
                                            {text} {isSelected && <Check className="w-4 h-4 text-yellow-600"/>}
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
// TELA PRINCIPAL: ENERGIA
// ==========================================
export default function EnergiaScreen() {
  const { dados, dispatch, setTela, ativos, buscarUltimaLeitura } = useAppContext();
  
  const [form, setForm] = useState({ 
      data: U.todayIso(), 
      local: '', 
      medidor: '', 
      leituraAnterior: '', 
      leituraAtual: '' 
  });
  
  const [filterData, setFilterData] = useState('');
  const [filterText, setFilterText] = useState('');

  // Cálculos Automáticos
  const consumo = useMemo(() => {
      const atual = U.parseDecimal(form.leituraAtual);
      const ant = U.parseDecimal(form.leituraAnterior);
      return atual > ant ? (atual - ant).toFixed(0) : '0';
  }, [form.leituraAtual, form.leituraAnterior]);

  const valorEstimado = useMemo(() => {
      const kwh = U.parseDecimal(consumo);
      const custoMedio = 0.92; // R$ 0,92 por kWh
      return (kwh * custoMedio).toFixed(2);
  }, [consumo]);

  const handleLocalChange = (e: any) => {
      const nomeLocal = e.target.value;
      
      // 1. Busca o Medidor nas Configurações
      const localObj = ativos.locaisEnergia.find((l:any) => (l.nome === nomeLocal) || (l === nomeLocal));
      const medidorAuto = (localObj && typeof localObj === 'object') ? localObj.medidor : '';

      // 2. Busca a Última Leitura no Histórico
      const ultimoRegistro = buscarUltimaLeitura('energia', 'local', nomeLocal);
      const leituraAntAuto = ultimoRegistro ? ultimoRegistro.leituraAtual : '0';

      setForm(prev => ({ 
          ...prev, 
          local: nomeLocal, 
          medidor: medidorAuto || prev.medidor, 
          leituraAnterior: leituraAntAuto 
      }));
  };

  const enviar = (e: any) => {
    e.preventDefault();
    if (U.parseDecimal(consumo) <= 0) { toast.error("Leitura Atual deve ser maior que a Anterior"); return; }
    
    const novo = { ...form, consumo, valorEstimado, id: U.id('EN-') };
    dispatch({ type: ACTIONS.ADD_RECORD, modulo: 'energia', record: novo, osDescricao: `Energia: ${form.local} (${consumo} kWh)` });
    
    setForm({ data: U.todayIso(), local: '', medidor: '', leituraAnterior: '', leituraAtual: '' });
    toast.success('Leitura de energia registrada!');
  };

  const excluir = (id: string) => { dispatch({ type: ACTIONS.SET_MODAL, modal: { isOpen: true, message: 'Excluir leitura?', onConfirm: () => { dispatch({ type: ACTIONS.REMOVE_RECORD, modulo: 'energia', id }); dispatch({ type: ACTIONS.SET_MODAL, modal: { isOpen: false, message: '', onConfirm: () => {} } }); toast.error('Registro excluído.'); } } }); };
  
  const listFilter = useMemo(() => (dados.energia || []).filter((i:any) => {
      const txt = filterText.toLowerCase();
      return (!filterData || i.data === filterData) && 
             (!filterText || i.local.toLowerCase().includes(txt) || i.medidor.toLowerCase().includes(txt) || i.id.toLowerCase().includes(txt));
  }).reverse(), [dados.energia, filterData, filterText]);

  return (
    <div className="space-y-4 p-4 pb-24">
      <PageHeader setTela={setTela} title="Energia Elétrica" icon={Zap} colorClass="bg-yellow-500" />
      
      <div className="bg-white rounded-lg border-2 p-4 shadow-sm">
        <h2 className="font-bold border-b pb-2 mb-3 text-gray-700 flex items-center gap-2">
            <Calculator className="w-5 h-5 text-yellow-500"/> Nova Leitura
        </h2>
        
        <form onSubmit={enviar} className="space-y-3">
		
          {/* Campo Data Manual (Para manter o padrão visual) */}
		  <div className="space-y-1">
            <label className="block text-xs font-bold text-gray-700">Data da Leitura <span className="text-red-500">*</span></label>
                <input 
                    type="date" 
                    value={form.data} 
                    onChange={(e) => setForm({ ...form, data: e.target.value })} 
                    className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg text-sm focus:border-yellow-500 focus:outline-none"
                    required
                />
            </div>
          
          <SearchableSelect 
              label="Local do Padrão" 
              placeholder="Selecione o local..." 
              options={ativos.locaisEnergia} 
              value={form.local} 
              onChange={handleLocalChange} 
              required 
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

          <div className="grid grid-cols-2 gap-3">
              {/* LEITURA ANTERIOR (Altura Ajustada) */}
              <div className="space-y-1">
                 <div className="flex justify-center">
                    <p className="text-xs font-bold text-gray-500 flex items-center gap-1"><History className="w-4 h-4"/> Leitura Anterior</p>
                    <span className="text-[10px] text-yellow-600 bg-yellow-100 px-1 rounded">Auto</span>
                 </div>
                 <div className="bg-yellow-50 border-2 border-yellow-200 rounded-lg">
                     <input 
                        type="number" 
                        value={form.leituraAnterior} 
                        readOnly
                        className="w-full px-1 py-1 bg-transparent font-bold text-yellow-500 outline-none text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        placeholder="-"
                     />
                 </div>
              </div>
              
              {/* LEITURA ATUAL */}
              <div className="space-y-1">
                 <p className="text-xs font-bold text-gray-700 text-center">Leitura Atual<span className="text-red-500">*</span></p>
                 <div className="">
                     <input 
                        type="number" 
                        value={form.leituraAtual} 
                        onChange={(e) => setForm({...form, leituraAtual: e.target.value})}
                        className="w-full px-1 py-1 border-2 border-gray-300 rounded-lg font-bold text-gray-900 focus:border-yellow-200 focus:outline-none text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        placeholder="Preencher..."
                        required
                     />
                 </div>
              </div>
          </div>

          {/* Card de Resultado */}
          <div className="flex items-center justify-between bg-gray-800 text-white p-4 rounded-xl shadow-lg mt-2">
              <div>
                  <p className="text-xs text-gray-400 uppercase font-bold">Consumo Calculado</p>
                  <p className="text-2xl font-bold text-yellow-400">{consumo} <span className="text-sm text-gray-300">kWh</span></p>
              </div>
              <div className="text-right">
                  <p className="text-xs text-gray-400 uppercase font-bold">Estimativa</p>
                  <p className="text-lg font-bold text-green-400">R$ {valorEstimado}</p>
              </div>
          </div>

          <button type="submit" className="w-full bg-yellow-500 text-white py-3 rounded-lg font-bold hover:bg-yellow-600 transition-colors shadow-md flex items-center justify-center gap-2">
              <Check className="w-5 h-5" /> Registrar Leitura
          </button>
        </form>
      </div>

      <div className="bg-white rounded-lg border-2 overflow-hidden shadow-sm">
        <div className="p-3 border-b bg-gray-50">
            <h2 className="font-bold text-sm uppercase text-gray-600 mb-2">Histórico de Energia</h2>
            <div className="flex gap-2">
                <input type="date" value={filterData} onChange={e => setFilterData(e.target.value)} className="text-xs border rounded p-2" />
                <div className="relative flex-1">
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
                            <th className="px-3 py-2 text-left text-xs font-bold text-gray-500">Local</th>
                            <th className="px-3 py-2 text-left text-xs font-bold text-gray-500">ID</th>
                            <th className="px-3 py-2 text-right text-xs font-bold text-gray-500">Consumo</th>
                            <th className="px-3 py-2 text-right text-xs font-bold text-gray-500">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y">
                        {items.map(item => (
                            <Row key={item.id} onDelete={() => excluir(item.id)}>
                                <td className="px-3 py-2 text-gray-700 text-xs whitespace-nowrap">{U.formatDate(item.data)}</td>
                                <td className="px-3 py-2 text-gray-700 text-xs">
                                    <div className="font-bold">{item.local}</div>
                                    <div className="text-[10px] text-gray-500">MED: {item.medidor}</div>
                                </td>
                                <td className="px-3 py-2 text-gray-500 text-[10px]">{item.id}</td>
                                <td className="px-3 py-2 text-right">
                                    <div className="font-bold text-yellow-600 text-sm">{item.consumo} kWh</div>
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