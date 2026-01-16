import React, { useState, useMemo, useEffect, useRef } from 'react';
import { CloudRain, Search, ChevronDown, Check, Droplets, Calendar, Trash2 } from 'lucide-react';
import { useAppContext, ACTIONS } from '../context/AppContext';
import { PageHeader, TableWithShowMore, SearchableSelect } from '../components/ui/Shared';
import { U } from '../data/utils';
import { toast } from 'react-hot-toast';

// ==========================================
// Componente: SELECT PESQUISÁVEL (Visual Ajustado)
// ==========================================
// ==========================================
// SEARCHABLE SELECT: IMPORTADO DO SHARED
// ==========================================

// ==========================================
// TELA PRINCIPAL: CHUVAS (PLUVIOMETRIA)
// ==========================================
export default function ChuvasScreen() {
  const { dados, dispatch, setTela, ativos, genericSave } = useAppContext();
  
  // Estado do Formulário
  const [form, setForm] = useState({ 
      data: U.todayIso(), 
      local: '', 
      milimetros: '' 
  });
  
  const [filterData, setFilterData] = useState('');
  const [filterText, setFilterText] = useState('');

  const enviar = (e: any) => {
    e.preventDefault();
    if (!form.local || !form.milimetros) { toast.error("Preencha Local e Milímetros"); return; }
    
    const mm = U.parseDecimal(form.milimetros);
    const novo = { ...form, milimetros: mm, id: U.id('CH-') };
    
    
    const descOS = `Chuva: ${form.local} (${mm}mm)`;
    genericSave('chuvas', novo, { type: ACTIONS.ADD_RECORD, modulo: 'chuvas', osDescricao: descOS });

    // 2. Persistência OS
    genericSave('os', {
        id: U.id('OS-CH-'),
        modulo: 'Pluviometria',
        descricao: descOS,
        detalhes: { "Local": form.local, "Volume": `${mm} mm` },
        status: 'Pendente',
        data: new Date().toISOString()
    });
    
    setForm({ data: U.todayIso(), local: '', milimetros: '' });
    toast.success('Registro de chuva salvo!');
  };

  const excluir = (id: string) => { dispatch({ type: ACTIONS.SET_MODAL, modal: { isOpen: true, message: 'Excluir registro?', onConfirm: () => { dispatch({ type: ACTIONS.REMOVE_RECORD, modulo: 'chuvas', id }); dispatch({ type: ACTIONS.SET_MODAL, modal: { isOpen: false, message: '', onConfirm: () => {} } }); toast.error('Registro excluído.'); } } }); };
  
  const listFilter = useMemo(() => (dados.chuvas || []).filter((i:any) => {
      const txt = filterText.toLowerCase();
      return (!filterData || i.data === filterData) && 
             (!filterText || i.local.toLowerCase().includes(txt));
  }).reverse(), [dados.chuvas, filterData, filterText]);

  return (
    <div className="space-y-4 p-4 pb-24">
      <PageHeader setTela={setTela} title="Pluviometria" icon={CloudRain} colorClass="bg-cyan-500" />
      
      <div className="bg-white rounded-lg border-2 p-4 shadow-sm">
        <h2 className="font-bold border-b pb-2 mb-3 text-gray-700 flex items-center gap-2">
            <Droplets className="w-5 h-5 text-cyan-500"/> Novo Registro
        </h2>
        
        <form onSubmit={enviar} className="space-y-4">
          
          {/* Campo Data Manual (Para manter o padrão visual) */}
          <div className="space-y-1">
            <label className="block text-xs font-bold text-gray-700">Data da Coleta <span className="text-red-500">*</span></label>
            <div className="relative">
                <input 
                    type="date" 
                    value={form.data} 
                    onChange={(e) => setForm({ ...form, data: e.target.value })} 
                    className="w-full pl-3 pr-3 py-3 border-2 border-gray-300 rounded-lg text-sm focus:border-cyan-500 focus:outline-none"
                    required
                />
            </div>
          </div>
          
          <SearchableSelect 
              label="Local (Pluviômetro)" 
              placeholder="Onde choveu? Ex: Sede" 
              options={ativos.locais} 
              value={form.local} 
              onChange={(e:any) => setForm({ ...form, local: e.target.value })} 
              required 
              color="cyan"
          />
          
          <div className="space-y-1">
             <label className="block text-xs font-bold text-gray-700">Volume (mm) <span className="text-red-500">*</span></label>
             <div className="relative">
                 <input 
                    type="number" 
                    value={form.milimetros} 
                    onChange={(e) => setForm({...form, milimetros: e.target.value})}
                    className="w-full px-3 py-3 border-2 border-cyan-400 rounded-lg text-lg font-bold text-gray-900 focus:ring-2 focus:ring-cyan-200 focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    placeholder="Preencher..."
                    required
                 />
                 <span className="absolute right-4 top-4 text-sm font-bold text-gray-400">mm</span>
             </div>
          </div>

          <button type="submit" className="w-full bg-cyan-500 text-white py-3 rounded-lg font-bold hover:bg-cyan-600 transition-colors shadow-md flex items-center justify-center gap-2">
              <Check className="w-5 h-5" /> Registrar Chuva
          </button>
        </form>
      </div>

      <div className="bg-white rounded-lg border-2 overflow-hidden shadow-sm">
        <div className="p-3 border-b bg-gray-50">
            <h2 className="font-bold text-sm uppercase text-gray-600 mb-2">Histórico de Chuvas</h2>
            <div className="flex gap-2">
                <input type="date" value={filterData} onChange={e => setFilterData(e.target.value)} className="text-xs border rounded p-2" />
                <div className="relative flex-1">
                    <Search className="absolute left-2 top-2 w-4 h-4 text-gray-400"/>
                    <input type="text" placeholder="Buscar Estação..." value={filterText} onChange={e => setFilterText(e.target.value)} className="w-full pl-8 text-xs border rounded p-2" />
                </div>
            </div>
        </div>
        <TableWithShowMore data={listFilter}>
            {(items:any[], Row:any) => (
                <>
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-3 py-2 text-left text-xs font-bold text-gray-500">Data</th>
                            <th className="px-3 py-2 text-left text-xs font-bold text-gray-500">Estação</th>
                            <th className="px-3 py-2 text-right text-xs font-bold text-gray-500">Volume</th>
                            <th className="px-3 py-2 text-right text-xs font-bold text-gray-500">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y">
                        {items.map(item => (
                            <Row key={item.id} onDelete={() => excluir(item.id)}>
                                <td className="px-3 py-2 text-gray-700 text-xs whitespace-nowrap">{U.formatDate(item.data)}</td>
                                <td className="px-3 py-2 text-gray-700 text-xs font-medium">{item.estacao}</td>
                                <td className="px-3 py-2 text-right">
                                    <div className="font-bold text-cyan-600 text-sm">{item.milimetros} mm</div>
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