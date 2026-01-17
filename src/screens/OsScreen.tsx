import React, { useState, useMemo } from 'react';
import { Bell, Search, Eye, Filter } from 'lucide-react';
import { useAppContext, ACTIONS } from '../context/AppContext';
import { PageHeader } from '../components/ui/Shared';

export default function OsScreen() {
  const { os, dispatch, setTela } = useAppContext();
  
  // Estados Locais
  const [filtro, setFiltro] = useState('Pendente');
  const [search, setSearch] = useState('');
  
  // Contadores
  const pendentes = os.filter((o:any) => o.status === 'Pendente').length;
  const confirmadas = os.filter((o:any) => o.status === 'Confirmado').length;
  const canceladas = os.filter((o:any) => o.status === 'Cancelado').length;
  
  // Lista Filtrada
  const osFiltradas = useMemo(() => {
    let l = filtro === 'Todas' ? os : os.filter((o:any) => o.status === filtro);
    if (search) l = l.filter((o:any) => (o.descricao || '').toLowerCase().includes(search.toLowerCase()) || (o.modulo || '').toLowerCase().includes(search.toLowerCase()));
    return [...l].reverse();
  }, [os, filtro, search]);

  const getStatusColor = (s:string) => s === 'Pendente' ? 'bg-yellow-500' : s === 'Confirmado' ? 'bg-green-500' : 'bg-red-500';
  const getCardBorder = (s:string) => s === 'Pendente' ? 'border-yellow-400 bg-yellow-50 text-yellow-800' : s === 'Confirmado' ? 'border-green-400 bg-green-50 text-green-800' : 'border-red-400 bg-red-50 text-red-800';

  return (
    <div className="space-y-4 p-4 pb-24 animate-in fade-in duration-300">
      
      {/* Cabeçalho Padrão */}
      <PageHeader setTela={setTela} title="Ordens de Serviço" icon={Bell} colorClass="bg-indigo-600" />
      
      {/* Grid de Cards (Filtros Rápidos) */}
      <div className="grid grid-cols-3 gap-3">
        <button onClick={() => setFiltro('Pendente')} className={`border-2 rounded-xl p-2 flex flex-col items-center justify-center shadow-sm transition-all ${getCardBorder('Pendente')} ${filtro === 'Pendente' ? 'ring-2 ring-yellow-500 scale-105' : 'opacity-70 grayscale'}`}>
          <span className="text-[9px] font-bold uppercase mb-1">Pendentes</span>
          <span className="text-2xl font-black">{pendentes}</span>
        </button>
        <button onClick={() => setFiltro('Confirmado')} className={`border-2 rounded-xl p-2 flex flex-col items-center justify-center shadow-sm transition-all ${getCardBorder('Confirmado')} ${filtro === 'Confirmado' ? 'ring-2 ring-green-500 scale-105' : 'opacity-70 grayscale'}`}>
          <span className="text-[9px] font-bold uppercase mb-1">Confirmadas</span>
          <span className="text-2xl font-black">{confirmadas}</span>
        </button>
        <button onClick={() => setFiltro('Cancelado')} className={`border-2 rounded-xl p-2 flex flex-col items-center justify-center shadow-sm transition-all ${getCardBorder('Cancelado')} ${filtro === 'Cancelado' ? 'ring-2 ring-red-500 scale-105' : 'opacity-70 grayscale'}`}>
          <span className="text-[9px] font-bold uppercase mb-1">Canceladas</span>
          <span className="text-2xl font-black">{canceladas}</span>
        </button>
      </div>

      {/* Lista de Resultados */}
      <div className="bg-white rounded-xl border-2 p-4 shadow-sm min-h-[400px]">
        <div className="flex justify-between items-center border-b pb-3 mb-3">
             <div className="flex items-center gap-2">
                 <Filter className="w-4 h-4 text-gray-400"/>
                 <h2 className="font-bold text-sm text-gray-700 uppercase">Lista: {filtro}</h2>
             </div>
             <span className={`text-xs px-2 py-1 rounded-full text-white font-bold ${getStatusColor(filtro)}`}>{osFiltradas.length}</span>
        </div>
        
        <div className="relative mb-4">
           <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
           <input type="text" placeholder="Buscar por descrição, módulo..." value={search} onChange={e => setSearch(e.target.value)} className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm bg-gray-50 focus:bg-white transition-colors" />
        </div>

        <div className="space-y-3 max-h-[50vh] overflow-y-auto no-scrollbar">
            {osFiltradas.slice(0, 50).map((item:any) => (
            <div key={item.id} className="p-3 rounded-lg border hover:shadow-md transition-shadow cursor-pointer bg-gray-50 group hover:border-indigo-300" onClick={() => dispatch({ type: ACTIONS.SET_SELECTED_OS, os: item })}>
                <div className="flex justify-between items-start mb-1">
                    <p className="font-bold text-xs text-indigo-600 tracking-wide bg-indigo-50 px-2 py-0.5 rounded-md group-hover:bg-indigo-600 group-hover:text-white transition-colors">{item.id}</p>
                    <span className={`w-2 h-2 rounded-full ${getStatusColor(item.status)}`}></span>
                </div>
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-sm font-bold text-gray-800 mb-0.5">{item.modulo}</p>
                        <p className="text-xs text-gray-500">{item.data || 'Sem data'}</p>
                    </div>
                </div>
                <p className="text-xs text-gray-600 line-clamp-2 mt-2 bg-white p-2 rounded border border-gray-100 italic">"{item.descricao}"</p>
                <div className="mt-2 flex justify-end">
                    <button className="text-[10px] text-gray-400 font-bold flex items-center gap-1 group-hover:text-indigo-600">
                        Abrir Detalhes <Eye className="w-3 h-3"/>
                    </button>
                </div>
            </div>
            ))}
            {osFiltradas.length === 0 && (
                <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                    <Search className="w-8 h-8 mb-2 opacity-20"/>
                    <p className="text-sm italic">Nenhum registro encontrado.</p>
                </div>
            )}
        </div>
      </div>
    </div>
  );
}