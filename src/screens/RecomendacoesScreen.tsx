import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Leaf, Search, ChevronDown, Check, X, Plus, Trash2, Beaker, ScrollText, MessageCircle } from 'lucide-react';
import { useAppContext, ACTIONS } from '../context/AppContext';
import { PageHeader, TableWithShowMore, SearchableSelect } from '../components/ui/Shared';
import { U } from '../data/utils';
import { toast } from 'react-hot-toast';

// ==========================================
// TELA PRINCIPAL
// ==========================================
export default function RecomendacoesScreen() {
  const { state, dados, dispatch, setTela, ativos } = useAppContext();
  const { userRole, permissions } = state;
  const rolePermissions = permissions?.[userRole || ''] || permissions?.['Operador'];
  
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
          toast.error("Preencha Definição do Local.");
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
      
      {rolePermissions?.actions?.recomendacao_criar === false ? (
        <div className="bg-amber-50 rounded-lg border-2 border-amber-200 p-8 shadow-sm text-center">
            <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <ScrollText className="w-6 h-6 text-amber-600" />
            </div>
            <h3 className="text-amber-900 font-bold mb-1">Acesso Direcionado</h3>
            <p className="text-sm text-amber-700 leading-relaxed">
                Neste nível de acesso (**Operador**), você pode apenas **consultar e compartilhar** as recomendações já registradas.
            </p>
        </div>
      ) : (
        <div className="bg-white rounded-lg border-2 p-4 shadow-sm space-y-4">
            <h2 className="font-bold border-b pb-2 mb-3 text-gray-700 flex items-center gap-2">
                <ScrollText className="w-5 h-5 text-green-500"/> Nova Receita Agronômica
            </h2>
            
            {/* CABEÇALHO (SAFRA, TALHÃO, CULTURA) */}
            <div className="bg-gray-100 p-3 rounded-lg border space-y-3">
                <p className="text-xs font-bold text-black-800 uppercase tracking-widest border-b pb-1 mb-1 mt-1 text-center"><span className="text-red-500">***</span> Definição do Local <span className="text-red-500">***</span></p>
                
                {/* Campo Data Manual (Padronizado) */}
                <div className="space-y-1">
                    <label className="block text-xs font-bold text-gray-700">Data da Receita </label>
                    <input 
                        type="date" 
                        value={header.data} 
                        onChange={(e:any) => setHeader({ ...header, data: e.target.value })} 
                        className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg text-sm focus:border-green-500 focus:outline-none"
                        required 
                    />
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <SearchableSelect label="Safras" placeholder="Buscar a Safra..." options={ativos.safras} value={header.safra} onChange={(e:any) => setHeader({ ...header, safra: e.target.value })} color="green" />
                    <SearchableSelect label="Culturas" placeholder="Selecione..." options={ativos.culturas} value={header.cultura} onChange={(e:any) => setHeader({ ...header, cultura: e.target.value })} color="green" />
                </div>
                <SearchableSelect label="Talhões" placeholder="Buscar o Talhão/Pivo... Ex: Pivo 01" options={ativos.talhoes} value={header.talhao} onChange={handleTalhaoChange} color="green" />
                {header.area && <div className="text-xs text-right text-green-600 font-bold">Área: {header.area} ha</div>}
            </div>

            {/* ADICIONAR PRODUTOS */}
            <div className="bg-green-50 p-3 rounded-lg border border-green-200 space-y-3">
                <p className="text-xs font-bold text-green-700 uppercase tracking-widest border-b pb-1 mb-1 mt-1 text-center flex justify-center gap-1"><span className="text-red-500">***</span><Beaker className="w-5 h-5"/>Composição da Calda <span className="text-red-500">***</span></p>
                
                <SearchableSelect label="Classe Agronômica" placeholder="Buscar... Ex: Herbicida" options={ativos.classes || []} value={item.classe} onChange={(e:any) => setItem({ ...item, classe: e.target.value, produto: '' })} color="green" />
                
                <div className="grid grid-cols-2 gap-3">
                    <div className="col-span-2">
                        <SearchableSelect label="Produto" placeholder={item.classe ? `Buscar ${item.classe}...` : "Buscar o Produto... Ex: Glifosato"} options={produtosFiltrados} value={item.produto} onChange={(e:any) => setItem({ ...item, produto: e.target.value })} color="green" />
                    </div>
                    
                    {/* Campo Dose Manual (Padronizado) */}
                    <div className="space-y-1">
                        <label className="block text-xs font-bold text-gray-700">Dose</label>
                        <input 
                            type="text" 
                            placeholder="Informe... Ex: 2L/ha" 
                            value={item.dose} 
                            onChange={(e:any) => setItem({ ...item, dose: e.target.value })} 
                            className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg text-sm focus:border-green-500 focus:outline-none"
                        />
                    </div>

                    {/* Botão Incluir com Texto */}
                    <button type="button" onClick={handleAddItem} className="bg-green-600 text-white rounded-lg flex items-center justify-center gap-2 shadow-md active:scale-95 font-bold text-sm">
                        <Plus className="w-5 h-5"/> Incluir
                    </button>
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
      )}

      {/* HISTÓRICO RESTAURADO (Data, Safra, Cultura, Talhão) */}
      <div className="bg-white rounded-lg border-2 overflow-x-auto shadow-sm">
        <div className="p-3 border-b bg-gray-50 rounded-t-lg">
            <h2 className="font-bold text-sm uppercase text-gray-600 mb-2">Histórico de Recomendações</h2>
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
                                    <td className="px-3 py-2 text-xs font-bold text-green-700">{item.talhao}</td>
                                    <td className="px-3 py-2 text-right">
                                        <button 
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                const prodList = item.itens ? item.itens.map((it:any) => `- ${it.produto} (${it.dose})`).join('\n') : item.produto;
                                                const texto = encodeURIComponent(`*Fazenda São Caetano - RECEITA*\n\n*Talhão:* ${item.talhao}\n*Cultura:* ${item.cultura}\n*Data:* ${item.data}\n\n*Produtos:*\n${prodList}`);
                                                window.open(`https://wa.me/?text=${texto}`, '_blank');
                                            }}
                                            className="text-green-600 hover:text-green-800 p-2"
                                            title="Enviar via WhatsApp"
                                        >
                                            <MessageCircle className="w-4 h-4"/>
                                        </button>
                                    </td>
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