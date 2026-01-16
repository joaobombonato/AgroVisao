import React, { useState, useMemo } from 'react';
import { FileCog, Search, Eye, Bell } from 'lucide-react';
import { useAppContext, ACTIONS } from '../context/AppContext';

export default function DashboardScreen() { 
  const { os, setTela, dispatch } = useAppContext();
  const pendentes = os.filter((o:any) => o.status === 'Pendente').length;
  const confirmadas = os.filter((o:any) => o.status === 'Confirmado').length;
  const canceladas = os.filter((o:any) => o.status === 'Cancelado').length;
  const [filtro, setFiltro] = useState('Pendente');
  const [search, setSearch] = useState('');
  
  const osFiltradas = useMemo(() => {
    let l = filtro === 'Todas' ? os : os.filter((o:any) => o.status === filtro);
    if (search) l = l.filter((o:any) => (o.descricao || '').toLowerCase().includes(search.toLowerCase()) || (o.modulo || '').toLowerCase().includes(search.toLowerCase()));
    return [...l].reverse();
  }, [os, filtro, search]);

  const getStatusColor = (s:string) => s === 'Pendente' ? 'bg-yellow-500' : s === 'Confirmado' ? 'bg-green-500' : 'bg-red-500';
  const getCardBorder = (s:string) => s === 'Pendente' ? 'border-yellow-400 bg-yellow-50' : s === 'Confirmado' ? 'border-green-400 bg-green-50' : 'border-red-400 bg-red-50';

  return (
    <div className="space-y-4 p-4 pb-24">
      <div className="flex items-center gap-2 mb-2 pb-2 border-b-2 border-gray-100">
         <FileCog className="w-7 h-7 text-indigo-600" />
         <h1 className="text-2xl font-bold text-gray-800">Dashboard</h1>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <button onClick={() => setFiltro('Pendente')} className={`border-2 rounded-xl p-3 flex flex-col items-center justify-center shadow-sm ${getCardBorder('Pendente')} ${filtro === 'Pendente' ? 'ring-2 ring-yellow-500' : ''}`}>
          <span className="text-xs font-bold text-yellow-700 uppercase">Pendentes</span><span className="text-3xl font-black text-yellow-800">{pendentes}</span>
        </button>
        <button onClick={() => setFiltro('Confirmado')} className={`border-2 rounded-xl p-3 flex flex-col items-center justify-center shadow-sm ${getCardBorder('Confirmado')} ${filtro === 'Confirmado' ? 'ring-2 ring-green-500' : ''}`}>
          <span className="text-xs font-bold text-green-700 uppercase">Confirmadas</span><span className="text-3xl font-black text-green-800">{confirmadas}</span>
        </button>
        <button onClick={() => setFiltro('Cancelado')} className={`border-2 rounded-xl p-3 flex flex-col items-center justify-center shadow-sm ${getCardBorder('Cancelado')} ${filtro === 'Cancelado' ? 'ring-2 ring-red-500' : ''}`}>
          <span className="text-xs font-bold text-red-700 uppercase">Canceladas</span><span className="text-3xl font-black text-red-800">{canceladas}</span>
        </button>
      </div>
      <div className="bg-white rounded-xl border-2 p-4 shadow-sm">
        <div className="flex justify-between items-center border-b pb-3 mb-3">
             <h2 className="font-bold text-lg text-gray-700">OS: {filtro}</h2>
             <span className={`text-xs px-2 py-1 rounded-full text-white font-bold ${getStatusColor(filtro)}`}>{osFiltradas.length}</span>
        </div>
        <div className="relative mb-4">
           <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
           <input type="text" placeholder="Buscar OS..." value={search} onChange={e => setSearch(e.target.value)} className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm bg-gray-50 focus:bg-white transition-colors" />
        </div>
        <div className="space-y-3">
            {osFiltradas.slice(0, 5).map((item:any) => (
            <div key={item.id} className="p-3 rounded-lg border hover:shadow-md transition-shadow cursor-pointer bg-gray-50" onClick={() => dispatch({ type: ACTIONS.SET_SELECTED_OS, os: item })}>
                <div className="flex justify-between items-start mb-1"><p className="font-bold text-xs text-gray-500">{item.id}</p><span className={`w-2 h-2 rounded-full ${getStatusColor(item.status)}`}></span></div>
                <p className="text-sm font-bold text-gray-800 mb-1">{item.modulo}</p><p className="text-xs text-gray-600 line-clamp-2">{item.descricao}</p>
                <div className="mt-2 flex justify-end"><button className="text-xs text-indigo-600 font-medium flex items-center gap-1">Ver Detalhes <Eye className="w-3 h-3"/></button></div>
            </div>
            ))}
            {osFiltradas.length === 0 && <p className="text-gray-400 text-center py-6 italic text-sm">Nenhum registro encontrado.</p>}
        </div>
      </div>
      <button onClick={() => setTela('os')} className="w-full bg-indigo-600 text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg hover:bg-indigo-700 active:scale-95 transition-transform"><Bell className="w-5 h-5" /> Confirmações e Cancelamentos / Histórico</button>
    </div>
  );
}