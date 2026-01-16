import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Leaf, Search, ChevronDown, Check, X, Plus, Trash2, Beaker, ScrollText } from 'lucide-react';
import { useAppContext, ACTIONS } from '../context/AppContext';
import { PageHeader, Input, TableWithShowMore } from '../components/ui/Shared';
import { U } from '../data/utils';
import { toast } from 'react-hot-toast';

// ==========================================
// Componente: SELECT PESQUISÁVEL (Mantido)
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
                <div className={`w-full border-2 rounded-lg px-3 py-3 text-sm flex justify-between items-center bg-white cursor-pointer ${isOpen ? 'border-green-500 ring-1 ring-green-200' : 'border-gray-300'}`}>
                    <span className={value ? 'text-gray-900 font-medium' : 'text-gray-400'}>
                        {value || placeholder}
                    </span>
                    <ChevronDown className="w-4 h-4 text-gray-400" />
                </div>

                {isOpen && (
                    <div className="absolute z-50 w-full bg-white border-2 border-green-500 rounded-lg mt-1 shadow-xl max-h-60 overflow-hidden flex flex-col">
                        <div className="p-2 border-b bg-green-50 sticky top-0">
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
                                        <button key={idx} type="button" onClick={(e) => { e.stopPropagation(); handleSelect(opt); }} className={`w-full text-left px-4 py-3 text-sm border-b last:border-0 hover:bg-green-50 flex justify-between items-center ${isSelected ? 'bg-green-50 font-bold text-green-800' : 'text-gray-700'}`}>
                                            {text} {isSelected && <Check className="w-4 h-4 text-green-600"/>}
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
// TELA PRINCIPAL
// ==========================================
export default function RecomendacoesScreen() {
  const { dados, dispatch, setTela, ativos } = useAppContext();
  
  // Estado do Cabeçalho (Fixo para a receita inteira)
  const [header, setHeader] = useState({ data: U.todayIso(), safra: '', talhao: '', area: '', cultura: '' });
  
  // Estado do Item Atual (Sendo adicionado)
  const [item, setItem] = useState({ classe: '', produto: '', dose: '' });
  
  // Lista de Itens Adicionados (O "Carrinho")
  const [itensAdicionados, setItensAdicionados] = useState<any[]>([]);

  const [filterData, setFilterData] = useState('');
  const [filterText, setFilterText] = useState('');
  
  // 1. AUTO-PREENCHIMENTO DE CABEÇALHO
  useEffect(() => {
      const historico = dados.recomendacoes || [];
      if (historico.length > 0) {
          const ultimo = historico[historico.length - 1]; 
          setHeader(prev => ({
              ...prev,
              safra: ultimo.safra || '',
              talhao: ultimo.talhao || '',
              cultura: ultimo.cultura || '',
              area: '', 
          }));
          if (ultimo.talhao) {
               const tObj = ativos.talhoes.find((t:any) => t.nome === ultimo.talhao || t === ultimo.talhao);
               if(tObj && tObj.area) setHeader(prev => ({ ...prev, area: tObj.area }));
          }
      }
  }, [dados.recomendacoes, ativos.talhoes]);

  // Handler de Talhão
  const handleTalhaoChange = (e: any) => {
      const tNome = e.target.value;
      const tObj = ativos.talhoes.find((t:any) => (t.nome === tNome) || (t === tNome));
      const area = (tObj && typeof tObj === 'object') ? tObj.area : '';
      setHeader(prev => ({ ...prev, talhao: tNome, area }));
  };

  // Handler para Adicionar Item à Lista
  const handleAddItem = (e: any) => {
      e.preventDefault(); // Previne envio do form principal se houver
      if (!item.produto || !item.dose) {
          toast.error("Selecione Produto e Dose");
          return;
      }
      setItensAdicionados([...itensAdicionados, { ...item, id: Date.now() }]);
      setItem({ classe: '', produto: '', dose: '' }); // Limpa apenas os campos de item
      toast.success("Produto adicionado!");
  };

  const handleRemoveItem = (id: number) => {
      setItensAdicionados(itensAdicionados.filter(i => i.id !== id));
  };

  // Enviar Recomendação Unificada
  const enviar = () => { 
      if (!header.safra || !header.talhao || itensAdicionados.length === 0) {
          toast.error("Preencha Definição do Local e adicione pelo menos 1 produto.");
          return;
      }

      const novo = { 
          ...header, 
          itens: itensAdicionados, // Guarda a lista completa
          id: U.id('RC-') 
      }; 
      
      // Cria a descrição da OS Unificada
      const resumoProdutos = itensAdicionados.map(i => i.produto).join(', ');
      const detalhesOS: any = {
          "Talhão": header.talhao,
          "Cultura": header.cultura,
          "Área": `${header.area} ha`,
      };
      // Adiciona cada produto como detalhe na OS
      itensAdicionados.forEach((i, idx) => {
          detalhesOS[`Produto ${idx + 1}`] = `${i.produto} (${i.dose})`;
      });

      dispatch({ 
          type: ACTIONS.ADD_RECORD, 
          modulo: 'recomendacoes', 
          record: novo, 
          osDescricao: `Aplicação: ${header.talhao} (${itensAdicionados.length} produtos)`, 
          osDetalhes: detalhesOS 
      }); 
      
      setItensAdicionados([]); // Limpa a lista
      toast.success('Recomendação unificada criada!'); 
  };

  const excluir = (id: string) => { dispatch({ type: ACTIONS.SET_MODAL, modal: { isOpen: true, message: 'Excluir recomendação?', onConfirm: () => { dispatch({ type: ACTIONS.REMOVE_RECORD, modulo: 'recomendacoes', id }); dispatch({ type: ACTIONS.SET_MODAL, modal: { isOpen: false, message: '', onConfirm: () => {} } }); toast.error('Registro excluído.'); } } }); };
  
  // Produtos Filtrados (Para o select de item)
  const produtosFiltrados = useMemo(() => {
      if (!item.classe) return ativos.produtos;
      return ativos.produtos.filter((p: any) => {
          if (typeof p === 'string') return true;
          return p.classe === item.classe || !p.classe;
      });
  }, [ativos.produtos, item.classe]);

  const listFilter = useMemo(() => (dados.recomendacoes || []).filter((i:any) => {
      const txt = filterText.toLowerCase();
      
      // Verifica nos itens internos também (Busca Universal)
      const itensTexto = i.itens ? i.itens.map((it:any) => it.produto).join(' ') : (i.produto || '');
      
      const matchData = !filterData || i.data === filterData;
      const matchText = !filterText || 
          (i.safra || '').toLowerCase().includes(txt) || 
          (i.talhao || '').toLowerCase().includes(txt) || 
          (i.cultura || '').toLowerCase().includes(txt) || 
          itensTexto.toLowerCase().includes(txt);
          
      return matchData && matchText;
  }).reverse(), [dados.recomendacoes, filterData, filterText]);

  return (
    <div className="space-y-4 p-4 pb-24">
      <PageHeader setTela={setTela} title="Recomendações" icon={Leaf} colorClass="bg-green-500" />
      
      <div className="bg-white rounded-lg border-2 p-4 shadow-sm space-y-4">
        <h2 className="font-bold border-b pb-2 mb-3 text-gray-700 flex items-center gap-2">
            <ScrollText className="w-5 h-5 text-green-500"/> Nova Receita Agronômica
        </h2>
        
        {/* CABEÇALHO (SAFRA, TALHÃO, CULTURA) */}
        <div className="bg-gray-50 p-3 rounded-lg border space-y-3">
            <p className="text-xs font-bold text-gray-700 uppercase">Definição do Local <span className="text-red-500">*</span></p>
            <Input label="Data da Receita" type="date" value={header.data} onChange={(e:any) => setHeader({ ...header, data: e.target.value })} required />
            <div className="grid grid-cols- gap-3">
                <SearchableSelect label="Safras" placeholder="Buscar Safra..." options={ativos.safras} value={header.safra} onChange={(e:any) => setHeader({ ...header, safra: e.target.value })} />
                <SearchableSelect label="Culturas" placeholder="Buscar Cultura..." options={ativos.culturas} value={header.cultura} onChange={(e:any) => setHeader({ ...header, cultura: e.target.value })} />
            </div>
            <SearchableSelect label="Talhões" placeholder="Buscar Talhão..." options={ativos.talhoes} value={header.talhao} onChange={handleTalhaoChange} />
            {header.area && <div className="text-xs text-right text-gray-500 font-bold">Área: {header.area} ha</div>}
        </div>

        {/* ADICIONAR PRODUTOS */}
        <div className="bg-green-50 p-3 rounded-lg border border-green-200 space-y-3">
            <p className="text-xs font-bold text-green-700 uppercase flex items-center gap-1"><Beaker className="w-4 h-4"/>Composição da Calda <span className="text-red-500">*</span></p>
            
            <SearchableSelect label="Classe Agronômica" placeholder="Ex: Herbicida..." options={ativos.classes || []} value={item.classe} onChange={(e:any) => setItem({ ...item, classe: e.target.value, produto: '' })} />
            
            <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                    <SearchableSelect label="Produto" placeholder={item.classe ? `Buscar ${item.classe}...` : "Selecione..."} options={produtosFiltrados} value={item.produto} onChange={(e:any) => setItem({ ...item, produto: e.target.value })} />
                </div>
                <Input label="Dose" placeholder="Ex: 2L/ha" value={item.dose} onChange={(e:any) => setItem({ ...item, dose: e.target.value })} />
                <button type="button" onClick={handleAddItem} className="bg-green-600 text-white rounded-lg flex items-center justify-center shadow-md active:scale-95"><Plus className="w-6 h-6"/></button>
            </div>
        </div>

        {/* LISTA DE ITENS ADICIONADOS (CARRINHO) */}
        {itensAdicionados.length > 0 && (
            <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-sm text-left">
                    <thead className="bg-gray-100 text-gray-600 font-bold">
                        <tr>
                            <th className="p-2">Produto</th>
                            <th className="p-2">Dose</th>
                            <th className="p-2 w-8"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y">
                        {itensAdicionados.map((it, idx) => (
                            <tr key={it.id} className="bg-white">
                                <td className="p-2">{it.produto}</td>
                                <td className="p-2">{it.dose}</td>
                                <td className="p-2"><button onClick={() => handleRemoveItem(it.id)} className="text-red-500"><Trash2 className="w-4 h-4"/></button></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        )}

        {/* BOTÃO FINALIZAR */}
        {itensAdicionados.length > 0 && (
            <button onClick={enviar} className="w-full bg-green-700 text-white py-4 rounded-xl font-bold text-lg shadow-md hover:bg-green-800 transition-transform active:scale-95 flex items-center justify-center gap-2">
                <Check className="w-6 h-6"/> Registrar Recomendação ({itensAdicionados.length} itens)
            </button>
        )}
      </div>

      {/* HISTÓRICO RESTAURADO (Data, Safra, Cultura, Talhão) */}
      <div className="bg-white rounded-lg border-2 overflow-x-auto shadow-sm">
        <div className="p-3 border-b bg-gray-50 rounded-t-lg">
            <h2 className="font-bold text-sm uppercase text-gray-600 mb-2">Histórico</h2>
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
                            <th className="px-3 py-2 text-left text-xs font-bold text-gray-500">Safra</th>
                            <th className="px-3 py-2 text-left text-xs font-bold text-gray-500">Cultura</th>
                            <th className="px-3 py-2 text-left text-xs font-bold text-gray-500">Talhão</th>
                            <th className="px-3 py-2 text-right text-xs font-bold text-gray-500">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y">
                        {items.map(item => {
                            // Lógica para mostrar produtos antigos (string) ou novos (array)
                            const resumoProdutos = item.itens 
                                ? `${item.itens.length} produtos` 
                                : (item.produto || '-');
                            
                            return (
                                <Row key={item.id} onDelete={() => excluir(item.id)}>
                                    <td className="px-3 py-2 text-gray-700 text-xs whitespace-nowrap">{U.formatDate(item.data)}</td>
                                    <td className="px-3 py-2 text-gray-700 text-xs">{item.safra}</td>
                                    <td className="px-3 py-2 text-gray-700 text-xs">
                                        <div className="font-bold">{item.cultura}</div>
                                        <div className="text-[10px] text-gray-500">{resumoProdutos}</div>
                                    </td>
                                    <td className="px-3 py-2 text-gray-700 text-xs font-bold text-green-700">{item.talhao}</td>
                                </Row>
                            );
                        })}
                    </tbody>
                </>
            )}
        </TableWithShowMore>
      </div>
    </div>
  );
}