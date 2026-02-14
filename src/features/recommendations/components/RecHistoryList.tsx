import React, { useState, useMemo } from 'react';
import { Search, MessageCircle } from 'lucide-react';
import { TableWithShowMore, Input } from '../../../components/ui/Shared';
import { U } from '../../../utils';
import { useAppContext, ACTIONS } from '../../../context/AppContext';
import { toast } from 'react-hot-toast';

export default function RecHistoryList() {
    const { dados, dispatch } = useAppContext();
    const [filterData, setFilterData] = useState('');
    const [filterText, setFilterText] = useState('');

    const listFilter = useMemo(() => (dados.recomendacoes || []).filter((i: any) => {
        const txt = filterText.toLowerCase();
        
        // Verifica nos itens internos também (Busca Universal)
        const itensTexto = i.itens ? i.itens.map((it: any) => it.produto).join(' ') : (i.produto || '');
        
        const matchData = !filterData || (i.data_recomendacao || i.data) === filterData;
        const matchText = !filterText || 
            (i.safra || '').toLowerCase().includes(txt) || 
            (i.talhao || '').toLowerCase().includes(txt) || 
            (i.cultura || '').toLowerCase().includes(txt) || 
            itensTexto.toLowerCase().includes(txt);
            
        return matchData && matchText;
    }).reverse(), [dados.recomendacoes, filterData, filterText]);

    const handleExcluir = (id: string) => { 
        dispatch({ 
            type: ACTIONS.SET_MODAL, 
            modal: { 
                isOpen: true, 
                message: 'Excluir recomendação?', 
                onConfirm: () => { 
                    dispatch({ type: ACTIONS.REMOVE_RECORD, modulo: 'recomendacoes', id }); 
                    dispatch({ type: ACTIONS.SET_MODAL, modal: { isOpen: false, message: '', onConfirm: () => {} } }); 
                    toast.error('Registro excluído.'); 
                } 
            } 
        }); 
    };

    const handleShareWhatsApp = (item: any) => {
        const prodList = item.itens 
            ? item.itens.map((it: any) => `- ${it.produto} (${it.dose})`).join('\n') 
            : item.produto;
            
        const texto = encodeURIComponent(
            `*Fazenda São Caetano - RECEITA*\n\n` +
            `*Talhão:* ${item.talhao}\n` +
            `*Cultura:* ${item.cultura}\n` +
            `*Data:* ${U.formatDate(item.data_recomendacao || item.data)}\n\n` +
            `*Produtos:*\n${prodList}`
        );
        window.open(`https://wa.me/?text=${texto}`, '_blank');
    };

    return (
        <div className="bg-white rounded-lg border-2 overflow-x-auto shadow-sm">
            <div className="p-3 border-b bg-gray-50 rounded-t-lg">
                <h2 className="font-bold text-sm uppercase text-gray-600 mb-2">Histórico de Recomendações</h2>
                <div className="flex flex-wrap gap-2">
                    <Input 
                        type="date" 
                        value={filterData} 
                        onChange={(e: any) => setFilterData(e.target.value)} 
                        className="text-xs border rounded p-2 min-w-[140px]" 
                    />
                    <div className="relative flex-1 min-w-[120px]">
                        <Search className="absolute left-2 top-2 w-4 h-4 text-gray-400"/>
                        <input 
                            type="text" 
                            placeholder="Filtrar por safra, talhão, insumo..." 
                            value={filterText} 
                            onChange={e => setFilterText(e.target.value)} 
                            className="w-full pl-8 text-xs border rounded p-2 focus:ring-1 focus:ring-green-500 outline-none" 
                        />
                    </div>
                </div>
            </div>
            <TableWithShowMore data={listFilter}>
                {(items: any[], Row: any) => (
                    <>
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-3 py-2 text-left text-xs font-bold text-gray-500">Data</th>
                                <th className="px-3 py-2 text-left text-xs font-bold text-gray-500">Safra</th>
                                <th className="px-3 py-2 text-left text-xs font-bold text-gray-500">Talhão / Operação</th>
                                <th className="px-3 py-2 text-left text-xs font-bold text-gray-500">Cultura</th>
                                <th className="px-3 py-2 text-right text-xs font-bold text-gray-500">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {items.map(item => {
                                const resumoProdutos = item.itens 
                                    ? `${item.itens.length} produtos` 
                                    : (item.produto || '-');
                                
                                return (
                                    <Row key={item.id} onDelete={() => handleExcluir(item.id)}>
                                        <td className="px-3 py-2 text-gray-700 text-xs whitespace-nowrap">
                                            {U.formatDate(item.data_recomendacao || item.data)}
                                        </td>
                                        <td className="px-3 py-2 text-gray-700 text-xs">{item.safra}</td>
                                        <td className="px-3 py-2 text-xs">
                                            <div className="font-bold text-green-700">{item.talhao}</div>
                                            <div className="text-[10px] text-gray-400 uppercase font-black">{item.operacao}</div>
                                        </td>
                                        <td className="px-3 py-2 text-gray-700 text-xs">
                                            <div className="font-bold">{item.cultura}</div>
                                            <div className="text-[10px] text-gray-500">{resumoProdutos}</div>
                                        </td>
                                        <td className="px-3 py-2 text-right">
                                            <button 
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleShareWhatsApp(item);
                                                }}
                                                className="text-green-600 hover:text-green-800 p-2 transition-transform active:scale-90"
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
    );
}
