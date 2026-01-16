import React, { useState, useEffect } from 'react';
import { Bell, ArrowLeft, Minus, Plus } from 'lucide-react';
import { useAppContext, ACTIONS } from '../context/AppContext';

export default function OsScreen() {
  const { os, dispatch, setTela, selectedOS } = useAppContext();
  const pendentes = (os || []).filter((o:any) => o.status === 'Pendente').reverse();
  const outras = (os || []).filter((o:any) => o.status !== 'Pendente').reverse();
  const [historicoAberto, setHistoricoAberto] = useState(false);
  
  // Limpa selectedOS ao entrar para não abrir o modal de cara
  useEffect(() => {
     // Se quiser limpar: dispatch({ type: ACTIONS.SET_SELECTED_OS, os: null });
  }, [dispatch]);

  return (
    <div className="space-y-4 p-4 pb-24">
      <div className="flex items-center gap-2 mb-2 pb-2 border-b-2 border-gray-100">
         <Bell className="w-7 h-7 text-indigo-600" />
         <h1 className="text-xl font-bold text-gray-800">Ordens de Serviço</h1>
      </div>
      <button onClick={() => setTela('home')} className="flex items-center gap-1 text-sm font-medium text-gray-500 hover:text-blue-600 mb-2"><ArrowLeft className="w-4 h-4" /> Voltar ao Dashboard</button>
      
      <div className="bg-white rounded-lg border-2">
        <h2 className="font-bold p-4 border-b">Pendentes ({pendentes.length})</h2>
        {pendentes.length > 0 ? pendentes.map((item:any) => (
          <div key={item.id} className="border-b last:border-0 p-3 cursor-pointer hover:bg-gray-50" onClick={() => dispatch({ type: ACTIONS.SET_SELECTED_OS, os: item })}>
            <div className="flex justify-between gap-2">
              <div className="flex-1 min-w-0"><p className="font-bold text-sm">{item.id}</p><p className="text-xs text-gray-600">{item.modulo}</p><p className="text-sm">{item.descricao}</p></div>
              <div className="flex flex-col gap-2"><span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded font-bold">Abrir</span></div>
            </div>
          </div>
        )) : (<p className="text-gray-500 text-center py-4 text-sm">Nenhuma OS pendente</p>)}
      </div>
      <div className="bg-white rounded-lg border-2">
        <h2 className="font-bold p-4 border-b flex justify-between items-center cursor-pointer" onClick={() => setHistoricoAberto(!historicoAberto)}>
            Histórico ({outras.length})
            <button className="p-1 text-gray-500 hover:text-gray-800">{historicoAberto ? <Minus className="w-5 h-5" /> : <Plus className="w-5 h-5" />}</button>
        </h2>
        {historicoAberto && outras.length > 0 ? outras.map((item:any) => (<div key={item.id} className="p-3 border-t last:border-b-0" onClick={() => dispatch({ type: ACTIONS.SET_SELECTED_OS, os: item })}><div className="flex justify-between gap-2"><div className="flex-1 min-w-0"><p className="font-bold text-sm">{item.id}</p><p className="text-xs text-gray-600">{item.modulo}</p><p className="text-sm">{item.descricao}</p></div><span className={`px-2 py-1 rounded-full text-xs h-fit ${item.status === 'Confirmado' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{item.status}</span></div></div>)) : historicoAberto && (<p className="text-gray-500 text-center py-4 text-sm">Nenhum histórico</p>)}
      </div>
    </div>
  );
}