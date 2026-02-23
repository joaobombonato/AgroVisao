import React, { useState, useMemo } from 'react';
import { Bell, Search, Eye, Filter, MessageCircle, CheckSquare } from 'lucide-react';
import { useAppContext, ACTIONS } from '../context/AppContext';
import { PageHeader } from '../components/ui/Shared';
import { U } from '../utils';
import { toast } from 'react-hot-toast';

// BUILD: 1.0.2

export default function OsScreen() {
  const { state, os, dispatch, setTela, updateOsStatus } = useAppContext();
  const { userRole, permissions } = state;
  const rolePermissions = permissions?.[userRole || ''] || permissions?.['Operador'];
  
  // Estados Locais
  const [filtro, setFiltro] = useState('Pendente');
  const [search, setSearch] = useState('');
  const [filtroModulo, setFiltroModulo] = useState('Todos');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isSelectingBulk, setIsSelectingBulk] = useState(false);
  
  // Lista Filtrada por Permissão (Módulos que o usuário pode ver)
  const osPorPermissao = useMemo(() => {
    return os.filter((o: any) => {
        const moduloKey = o.modulo?.toLowerCase();
        // Se o módulo da OS estiver entre as telas permitidas (ou for a principal)
        if (moduloKey === 'principal') return true;
        if (rolePermissions?.screens?.[moduloKey] === false) return false;
        return true;
    });
  }, [os, rolePermissions]);

  const modulosUnicos = useMemo(() => {
    return Array.from(new Set(osPorPermissao.map((o: any) => o.modulo))).filter(Boolean).sort() as string[];
  }, [osPorPermissao]);

  // Contadores (Baseados na lista permitida)
  const pendentes = osPorPermissao.filter((o:any) => o.status === 'Pendente').length;
  const confirmadas = osPorPermissao.filter((o:any) => o.status === 'Confirmado').length;
  const canceladas = osPorPermissao.filter((o:any) => o.status === 'Cancelado').length;
  
  // Lista Final (Filtros de Status + Busca)
  // Detectar se uma OS é automática (manutenção preventiva, estoque crítico, etc.)
  const isAutoOS = (o: any) => {
    const desc = (o.descricao || '').toUpperCase();
    return desc.includes('MANUTENÇÃO PREVENTIVA') || desc.includes('COMPRA URGENTE') || desc.includes('ALERTA') || desc.includes('CONFERÊNCIA') || (o.numero || '').startsWith('AUT-');
  };

  const osFiltradas = useMemo(() => {
    let l = filtro === 'Todas' ? osPorPermissao : osPorPermissao.filter((o:any) => o.status === filtro);
    if (filtroModulo !== 'Todos') {
      l = l.filter((o:any) => o.modulo === filtroModulo);
    }
    if (search) l = l.filter((o:any) => (o.descricao || '').toLowerCase().includes(search.toLowerCase()) || (o.modulo || '').toLowerCase().includes(search.toLowerCase()));
    // Ordenação
    return [...l].sort((a: any, b: any) => {
      const autoA = isAutoOS(a) ? 0 : 1;
      const autoB = isAutoOS(b) ? 0 : 1;
      
      if (filtro === 'Pendente') {
        if (autoA !== autoB) return autoA - autoB;
        return (a.numero || a.id || '').localeCompare(b.numero || b.id || '');
      } else {
        // Confirmado ou Cancelado: ordem decrescente (mais recentes primeiro)
        return String(b.data_abertura || b.data || b.id).localeCompare(String(a.data_abertura || a.data || a.id));
      }
    });
  }, [osPorPermissao, filtro, filtroModulo, search]);

  const handleBulkConfirm = async () => {
    const selectedOs = osFiltradas.filter((o:any) => selectedIds.includes(o.id));
    if (selectedOs.length === 0) return;

    toast.loading(`Confirmando ${selectedOs.length} OS...`, { id: 'bulk-os' });
    for (const osItem of selectedOs) {
        await updateOsStatus(osItem.id, 'Confirmado');
    }
    toast.success(`${selectedOs.length} OS Confirmadas!`, { id: 'bulk-os' });
    setSelectedIds([]);
    setIsSelectingBulk(false);
    dispatch({ type: ACTIONS.CLOSE_MODAL });
  };

  const getStatusColor = (s:string) => s === 'Pendente' ? 'bg-yellow-500' : s === 'Confirmado' ? 'bg-green-500' : 'bg-red-500';
  const getCardBorder = (s:string) => s === 'Pendente' ? 'border-yellow-400 bg-yellow-50 text-yellow-800' : s === 'Confirmado' ? 'border-green-400 bg-green-50 text-green-800' : 'border-red-400 bg-red-50 text-red-800';

  return (
    <div className="space-y-4 p-4 pb-24 animate-in fade-in duration-300">
      
      {/* Cabeçalho Padrão */}
      <PageHeader setTela={setTela} title="Ordens de Serviço" icon={Bell} colorClass="bg-indigo-600" />
      
      {/* Grid de Cards (Filtros Rápidos) */}
      <div className="grid grid-cols-3 gap-3">
        <button onClick={() => { setFiltro('Pendente'); setSelectedIds([]); setIsSelectingBulk(false); }} className={`border-2 rounded-xl p-2 flex flex-col items-center justify-center shadow-sm transition-all ${getCardBorder('Pendente')} ${filtro === 'Pendente' ? 'ring-2 ring-yellow-500 scale-105' : 'opacity-70 grayscale'}`}>
          <span className="text-[9px] font-bold uppercase mb-1">Pendentes</span>
          <span className="text-2xl font-black">{pendentes}</span>
        </button>
        <button onClick={() => { setFiltro('Confirmado'); setSelectedIds([]); setIsSelectingBulk(false); }} className={`border-2 rounded-xl p-2 flex flex-col items-center justify-center shadow-sm transition-all ${getCardBorder('Confirmado')} ${filtro === 'Confirmado' ? 'ring-2 ring-green-500 scale-105' : 'opacity-70 grayscale'}`}>
          <span className="text-[9px] font-bold uppercase mb-1">Confirmadas</span>
          <span className="text-2xl font-black">{confirmadas}</span>
        </button>
        <button onClick={() => { setFiltro('Cancelado'); setSelectedIds([]); setIsSelectingBulk(false); }} className={`border-2 rounded-xl p-2 flex flex-col items-center justify-center shadow-sm transition-all ${getCardBorder('Cancelado')} ${filtro === 'Cancelado' ? 'ring-2 ring-red-500 scale-105' : 'opacity-70 grayscale'}`}>
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
             <div className="flex items-center gap-3">
                {filtro === 'Pendente' && !isSelectingBulk && osFiltradas.length > 0 && (
                    <button 
                        onClick={() => setIsSelectingBulk(true)}
                        className="bg-indigo-100 hover:bg-indigo-200 text-indigo-700 px-3 py-1.5 rounded-lg text-xs font-bold shadow-sm flex items-center gap-2 transition-colors"
                    >
                        <CheckSquare className="w-4 h-4" />
                        Selecionar Lote
                    </button>
                )}
                {filtro === 'Pendente' && isSelectingBulk && (
                    <div className="flex gap-2 animate-in fade-in">
                        <button 
                            onClick={() => { setIsSelectingBulk(false); setSelectedIds([]); }}
                            className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1.5 rounded-lg text-xs font-bold shadow-sm transition-colors"
                        >
                            Cancelar
                        </button>
                        <button 
                            onClick={() => {
                                if (selectedIds.length === 0) return toast.error('Selecione pelo menos uma OS');
                                dispatch({
                                    type: ACTIONS.SET_MODAL,
                                    modal: {
                                        type: 'confirm',
                                        props: {
                                            title: 'Confirmação em Lote',
                                            message: `Deseja realmente confirmar as ${selectedIds.length} OS selecionadas? Esta ação indicará que o serviço foi validado.`,
                                            confirmText: 'Confirmar OS',
                                            cancelText: 'Voltar',
                                            variant: 'success',
                                            icon: 'check',
                                            onConfirm: handleBulkConfirm
                                        }
                                    }
                                });
                            }}
                            className={`${selectedIds.length > 0 ? 'bg-green-600 hover:bg-green-700 text-white' : 'bg-gray-200 text-gray-400 cursor-not-allowed'} px-3 py-1.5 rounded-lg text-xs font-bold shadow-sm flex items-center gap-2 transition-colors`}
                        >
                            <CheckSquare className="w-4 h-4" />
                            Confirmar ({selectedIds.length})
                        </button>
                    </div>
                )}
                <span className={`text-xs px-2 py-1 rounded-full text-white font-bold ${getStatusColor(filtro)}`}>{osFiltradas.length}</span>
             </div>
        </div>
        
        <div className="flex flex-col md:flex-row gap-3 mb-4">
           <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
              <input type="text" placeholder="Buscar por descrição, módulo..." value={search} onChange={e => setSearch(e.target.value)} className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm bg-gray-50 focus:bg-white transition-colors" />
           </div>
           <select 
              value={filtroModulo} 
              onChange={e => { setFiltroModulo(e.target.value); setSelectedIds([]); }}
              className="px-3 py-2 border rounded-lg text-sm bg-gray-50 flex-1 md:flex-none uppercase font-bold text-gray-700 outline-none focus:ring-2 focus:ring-indigo-500"
           >
              <option value="Todos">TODOS OS MÓDULOS</option>
              {modulosUnicos.map(m => (
                  <option key={m} value={m}>{m}</option>
              ))}
           </select>
        </div>

        <div className="space-y-3">
            {osFiltradas.slice(0, 50).map((item:any) => (
            <div 
                key={item.id} 
                className={`p-3 rounded-lg border hover:shadow-md transition-shadow cursor-pointer group ${
                  isAutoOS(item) ? 'bg-red-50 border-red-200 hover:border-red-400' : 'bg-gray-50 hover:border-indigo-300'
                }`}
                onClick={() => {
                    dispatch({ type: ACTIONS.SET_SELECTED_OS, os: item });
                    dispatch({ type: ACTIONS.SET_MODAL, modal: { isOpen: true, type: 'os-details' } });
                }}
            >
                <div className="flex justify-between items-start mb-1">
                    <div className="flex items-center gap-2">
                        {filtro === 'Pendente' && isSelectingBulk && (
                            <input 
                                type="checkbox" 
                                className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                checked={selectedIds.includes(item.id)}
                                onChange={(e) => {
                                    if (e.target.checked) setSelectedIds([...selectedIds, item.id]);
                                    else setSelectedIds(selectedIds.filter(id => id !== item.id));
                                }}
                                onClick={(e) => e.stopPropagation()}
                            />
                        )}
                        <p className={`font-bold text-xs tracking-wide px-2 py-0.5 rounded-md transition-colors ${
                          isAutoOS(item)
                            ? 'text-red-700 bg-red-100 group-hover:bg-red-600 group-hover:text-white'
                            : 'text-indigo-600 bg-indigo-50 group-hover:bg-indigo-600 group-hover:text-white'
                        }`}>
                            {item.numero ? `#${item.numero}` : (String(item.id).startsWith('temp') ? 'Salvando...' : item.id.slice(0, 8).toUpperCase())}
                        </p>
                    </div>
                    <span className={`w-2 h-2 rounded-full ${getStatusColor(item.status)}`}></span>
                </div>
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-sm font-bold text-gray-800 mb-0.5">{item.modulo}</p>
                        <p className="text-xs text-gray-500">{U.formatDate(item.data_abertura || item.data) || 'Sem data'}</p>
                    </div>
                </div>
                <p className="text-xs text-gray-600 line-clamp-2 mt-2 bg-white p-2 rounded border border-gray-100 italic">"{item.descricao}"</p>
                <div className="mt-2 flex justify-end gap-2 text-[10px] font-bold uppercase">
                    {item.status === 'Pendente' && (
                        <button 
                            onClick={(e) => {
                                e.stopPropagation();
                                const idLabel = item.numero ? `#${item.numero}` : item.id.slice(0, 8).toUpperCase();
                                const texto = encodeURIComponent(`*Fazenda São Caetano - OS ${idLabel}*\n\n*Módulo:* ${item.modulo}\n*Data:* ${U.formatDate(item.data_abertura || item.data) || '-'}\n*Descrição:* ${item.descricao}`);
                                window.open(`https://wa.me/?text=${texto}`, '_blank');
                            }}
                            className="text-green-600 flex items-center gap-1 hover:bg-green-50 p-1 rounded"
                        >
                            WhatsApp <MessageCircle className="w-3 h-3"/>
                        </button>
                    )}
                    <button className="text-gray-400 flex items-center gap-1 group-hover:text-indigo-600 p-1 rounded">
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
