/**
 * AbastecimentoHistorico - Tabela de histórico de abastecimentos
 * 
 * Extraído de AbastecimentoScreen para reutilização
 */
import React, { useState, useMemo } from 'react';
import { Search } from 'lucide-react';
import { useAppContext, ACTIONS } from '../../../context/AppContext';
import { Input, TableWithShowMore } from '../../../components/ui/Shared';
import { U } from '../../../utils';
import { toast } from 'react-hot-toast';

export function AbastecimentoHistorico() {
  const { dados, dispatch } = useAppContext();
  const [filterData, setFilterData] = useState('');
  const [filterText, setFilterText] = useState('');

  const excluir = (id: string) => { 
    dispatch({ 
      type: ACTIONS.SET_MODAL, 
      modal: { 
        isOpen: true, 
        message: 'Excluir registro? O estoque será corrigido.', 
        onConfirm: () => { 
          dispatch({ type: ACTIONS.REMOVE_RECORD, modulo: 'abastecimentos', id }); 
          dispatch({ type: ACTIONS.SET_MODAL, modal: { isOpen: false, message: '', onConfirm: () => {} } }); 
          toast.error('Registro excluído.'); 
        } 
      } 
    }); 
  };

  const listFilter = useMemo(() => (dados.abastecimentos || []).filter((i:any) => {
    const txt = filterText.toLowerCase();
    const matchText = i.maquina.toLowerCase().includes(txt) || i.id.toLowerCase().includes(txt);
    const matchData = !filterData || (i.data_operacao || i.data) === filterData;
    return matchText && matchData;
  }).reverse(), [dados.abastecimentos, filterData, filterText]);

  return (
    <div className="bg-white rounded-lg border-2 overflow-hidden shadow-sm">
      <div className="p-3 border-b bg-gray-50">
        <h2 className="font-bold text-sm uppercase text-gray-600 mb-2">Histórico de Abastecimento</h2>
        <div className="flex flex-col sm:flex-row gap-2">
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
              placeholder="Máquina..." 
              value={filterText} 
              onChange={e => setFilterText(e.target.value)} 
              className="w-full pl-8 text-xs border rounded p-2" 
            />
          </div>
        </div>
      </div>
      
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
              {items.map((item: any) => (
                <Row key={item.id} onDelete={() => excluir(item.id)}>
                  <td className="px-3 py-2 text-gray-700 text-xs whitespace-nowrap">
                    {U.formatDate(item.data_operacao || item.data).slice(0,5)}
                  </td>
                  <td className="px-2 py-2 text-center text-gray-700 text-xs">
                    <div className="font-bold truncate max-w-[80px] sm:max-w-none mx-auto">{item.maquina}</div>
                    <div className="text-[9px] text-gray-400">Km: {item.horimetro}</div>
                  </td>
                  <td className="px-2 py-2 text-center">
                    <div className="font-bold text-red-600 text-xs">{item.quantidade}</div>
                  </td>
                  <td className="px-2 py-2 text-center text-xs font-bold text-gray-700">
                    {item.media || '-'}
                  </td>
                  <td className="px-2 py-2 text-center text-xs text-gray-700">
                    {(item as any).bombaFinal || '-'}
                  </td>
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
  );
}
