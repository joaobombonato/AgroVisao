import React, { useReducer, useEffect, useContext, useMemo, useState, createContext, useCallback, useRef } from 'react';
import { Toaster, toast } from 'react-hot-toast';
import {
  Home, Droplet, Zap, FolderOpen, Fuel, Leaf, Utensils, Bell, Settings, TrendingUp,
  Trash2, Check, X, Plus, X as XClose, Minus, Tractor, FileCog, ChartNoAxesCombined,
  Truck, Receipt, Copy, Loader2, ArrowLeft, Paperclip, FilePen, Search, Eye, ChevronDown, MoreHorizontal
} from 'lucide-react';

/* ====================================
   🔵 UTILITIES (U)
   ==================================== */
const U = {
  todayIso: () => new Date().toISOString().split('T')[0],
  currentMonthIso: () => new Date().toISOString().slice(0, 7),
  parseDecimal: (v) => {
    if (v === null || v === undefined || v === '') return 0;
    if (typeof v === 'number') return v;
    const s = String(v).replace(/\s/g, '').replace(',', '.');
    const n = parseFloat(s);
    return Number.isFinite(n) ? n : 0;
  },
  formatValue: (v) => {
    const n = typeof v === 'number' ? v : U.parseDecimal(v);
    return n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  },
  formatInt: (v) => {
    const n = typeof v === 'number' ? v : U.parseDecimal(v);
    return n.toLocaleString('pt-BR', { maximumFractionDigits: 0 });
  },
  formatDate: (iso) => {
    if (!iso) return '';
    const parts = iso.split('-');
    if (parts.length !== 3) return iso;
    const [y, m, d] = parts;
    return `${d}/${m}/${y.slice(2)}`;
  },
  id: (prefix = '') => `${prefix}${Date.now()}`,
};

/* ====================================
   🟢 GLOBAL STATE & ATIVOS
   ==================================== */
const DADOS_INICIAIS = {
  chuvas: [], energia: [], documentos: [], abastecimento: [], recomendacoes: [], refeicoes: [], compras: []
};

const ATIVOS_INICIAIS = {
  maquinas: ['Trator Valtra A1', 'Pulverizador Jacto', 'Colheitadeira 03', 'Caminhonete Hilux', 'Caminhão Pipa'],
  medidores: ['Medidor Sede', 'Medidor Talhão 5'],
  produtos: ['Glifosato', 'Inseticida A', 'Fungicida B', 'Adubo Foliar'],
  safras: ['2024/2025', '2025/2026', '2026/2027'],
  culturas: ['Soja', 'Milho', 'Café', 'Cana-de-açúcar', 'Trigo'],
  classes: ['Herbicida', 'Inseticida', 'Fungicida', 'Adubo', 'Acaricida'],
  centrosCusto: ['Operacional', 'Administrativo', 'Técnico', 'Diretoria'],
  tiposDocumento: ['Nota Fiscal', 'Boleto', 'Contrato', 'Recibo', 'Outros'],
  tiposRefeicao: ['Básica - R$ 15', 'Executiva - R$ 25', 'Especial - R$ 35'],
  talhoes: [ // Para Recomendações
    { nome: 'Talhão Principal', area: '50.5' }, 
    { nome: 'Talhão Secundário', area: '30.0' },
    { nome: 'Talhão Baixada', area: '15.2' }
  ],
  talhoesChuva: [ // Para Chuvas (Lista Independente)
    { nome: 'Sede' },
    { nome: 'Retiro' },
    { nome: 'Várzea' },
    { nome: 'Morro Alto' }
  ],
  locaisEnergia: [
    { nome: 'Sede Administrativa', medidor: 'MED-001' },
    { nome: 'Barracão Maquinário', medidor: 'MED-002' },
    { nome: 'Casa Bomba Rio', medidor: 'MED-003' }
  ]
};

const INITIAL = {
  tela: 'principal',
  os: [],
  dados: DADOS_INICIAIS,
  ativos: ATIVOS_INICIAIS,
  loading: true,
  modal: { isOpen: false, message: '', onConfirm: () => {} },
  selectedOS: null
};

const ACTIONS = {
  LOAD: 'LOAD',
  SET_TELA: 'SET_TELA',
  ADD_RECORD: 'ADD_RECORD',
  REMOVE_RECORD: 'REMOVE_RECORD',
  UPDATE_OS_STATUS: 'UPDATE_OS_STATUS',
  SET_MODAL: 'SET_MODAL',
  SET_LOADING: 'SET_LOADING',
  SET_SELECTED_OS: 'SET_SELECTED_OS'
};

function reducer(state, action) {
  switch (action.type) {
    case ACTIONS.LOAD:
      return { ...state, ...action.payload, loading: false };
    case ACTIONS.SET_TELA:
      return { ...state, tela: action.tela };
    case ACTIONS.ADD_RECORD: {
      const { modulo, record, osDescricao, osDetalhes } = action;
      const newDados = { ...state.dados, [modulo]: [...(state.dados[modulo] || []), record] };
      let newOs = state.os;
      if (osDescricao) {
        const osId = `OS-${new Date().getFullYear()}-${String(state.os.length + 1).padStart(4, '0')}`;
        const moduloFormatado = modulo.charAt(0).toUpperCase() + modulo.slice(1);
        newOs = [...state.os, { 
            id: osId, 
            modulo: moduloFormatado, 
            descricao: osDescricao, 
            detalhes: osDetalhes || {},
            status: 'Pendente', 
            data: new Date().toISOString() 
        }];
      }
      return { ...state, dados: newDados, os: newOs };
    }
    case ACTIONS.REMOVE_RECORD: {
      const { modulo, id } = action;
      const newDados = { ...state.dados, [modulo]: (state.dados[modulo] || []).filter(r => r.id !== id) };
      return { ...state, dados: newDados };
    }
    case ACTIONS.UPDATE_OS_STATUS: {
      const { id, status } = action;
      const newOs = state.os.map(o => o.id === id ? { ...o, status } : o);
      return { ...state, os: newOs };
    }
    case ACTIONS.SET_MODAL:
      return { ...state, modal: action.modal };
    case ACTIONS.SET_LOADING:
      return { ...state, loading: action.loading };
    case ACTIONS.SET_SELECTED_OS:
      return { ...state, selectedOS: action.os };
    default:
      return state;
  }
}

const AppContext = createContext(null);
const useAppContext = () => useContext(AppContext);

/* ====================================
   🟣 COMPONENTES REUTILIZÁVEIS
   ==================================== */

// Style Injection para esconder flechas de input number
const GlobalStyles = () => (
    <style>{`
      .no-scrollbar::-webkit-scrollbar { display: none; }
      .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      input[type=number]::-webkit-inner-spin-button, 
      input[type=number]::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
      input[type=number] { -moz-appearance: textfield; }
    `}</style>
);

const ConfirmModal = ({ message, onConfirm, onClose }) => (
  <div className="fixed inset-0 bg-black bg-opacity-50 z-[100] flex items-center justify-center p-4">
    <div className="bg-white rounded-lg w-full max-w-xs shadow-2xl">
      <div className="p-4 border-b"><h3 className="text-lg font-bold text-red-600 flex items-center gap-2"><Trash2 className="w-5 h-5" /> Confirmação</h3></div>
      <div className="p-4"><p className="text-gray-700">{message}</p></div>
      <div className="p-4 flex justify-end gap-3 border-t">
        <button onClick={onClose} className="px-4 py-2 text-gray-700 rounded-lg hover:bg-gray-100 font-medium">Cancelar</button>
        <button onClick={onConfirm} className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 font-medium transition-colors">Confirmar</button>
      </div>
    </div>
  </div>
);

const OSDetailsModal = ({ os, onClose, onUpdateStatus }) => {
    if (!os) return null;
    const getStatusColor = (s) => s === 'Pendente' ? 'bg-yellow-500' : s === 'Confirmado' ? 'bg-green-500' : 'bg-red-500';
    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-[90] flex items-center justify-center p-4">
            <div className="bg-white rounded-xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
                <div className="p-4 border-b flex justify-between items-center bg-gray-50">
                    <h3 className="text-lg font-bold text-gray-800">Detalhes da OS</h3>
                    <button onClick={onClose}><XClose className="w-6 h-6 text-gray-500"/></button>
                </div>
                <div className="p-6 overflow-y-auto">
                    <div className="flex justify-between items-start mb-4">
                        <div><p className="text-2xl font-bold text-gray-800">{os.id}</p><p className="text-sm text-gray-500">{U.formatDate(os.data)}</p></div>
                        <span className={`px-3 py-1 rounded-full text-white text-xs font-bold ${getStatusColor(os.status)}`}>{os.status}</span>
                    </div>
                    <div className="space-y-3">
                        <div className="bg-gray-50 p-3 rounded-lg"><p className="text-xs text-gray-500 uppercase font-bold mb-1">Módulo</p><p className="font-medium">{os.modulo}</p></div>
                        <div className="bg-gray-50 p-3 rounded-lg"><p className="text-xs text-gray-500 uppercase font-bold mb-1">Descrição Resumida</p><p className="font-medium">{os.descricao}</p></div>
                        {os.detalhes && (
                            <div className="border-t pt-3 mt-3">
                                <p className="text-sm font-bold mb-2">Dados Completos:</p>
                                <div className="grid grid-cols-2 gap-2">
                                    {Object.entries(os.detalhes).map(([key, value]) => {
                                        if (key === 'id' || key === 'data' || !value) return null;
                                        return (<div key={key} className="bg-gray-50 p-2 rounded"><p className="text-[10px] text-gray-500 uppercase">{key}</p><p className="text-sm font-medium truncate" title={value}>{String(value)}</p></div>)
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
                <div className="p-4 border-t bg-gray-50 flex gap-3">
                    <button onClick={() => { onUpdateStatus(os.id, 'Cancelado'); onClose(); }} className="flex-1 py-3 bg-red-100 text-red-700 rounded-lg font-bold hover:bg-red-200 flex items-center justify-center gap-2"><X className="w-5 h-5"/> Cancelar</button>
                    <button onClick={() => { onUpdateStatus(os.id, 'Confirmado'); onClose(); }} className="flex-1 py-3 bg-green-600 text-white rounded-lg font-bold hover:bg-green-700 flex items-center justify-center gap-2"><Check className="w-5 h-5"/> Confirmar</button>
                </div>
            </div>
        </div>
    )
};

const PageHeader = ({ setTela, title, icon: Icon, colorClass, backTarget = 'principal' }) => (
  <div className="flex items-center justify-between mb-4 pb-2 border-b">
    <div className="flex items-center gap-2">
       <Icon className={`w-7 h-7 ${colorClass.replace('bg-', 'text-')}`} />
       <h1 className="text-xl font-bold text-gray-800">{title}</h1>
    </div>
    <button onClick={() => setTela(backTarget)} className="flex items-center gap-1 text-sm font-medium text-gray-500 hover:text-blue-600 bg-gray-100 px-3 py-1.5 rounded-full transition-colors"><ArrowLeft className="w-4 h-4 ml-1" /> Voltar</button>
  </div>
);

const Input = ({ label, readOnly, ...props }) => (
  <div className="space-y-1">
    <p className="text-xs font-medium text-gray-600">{label}</p>
    <input {...props} className={`w-full px-3 py-2 border-2 rounded-lg transition-colors ${readOnly ? 'bg-gray-100 text-gray-600 font-semibold border-gray-300 cursor-not-allowed' : 'border-gray-200 focus:border-blue-500 bg-white'}`} readOnly={readOnly} />
  </div>
);

const Select = ({ label, children, ...props }) => (
    <div className="space-y-1">
        <p className="text-xs font-medium text-gray-600">{label}</p>
        <select {...props} className="w-full px-3 py-2 border-2 rounded-lg bg-white border-gray-200 focus:border-blue-500">{children}</select>
    </div>
);

// Row com ação Toggle
const TableRowWithAction = ({ children, onDelete, onEdit }) => {
    const [showActions, setShowActions] = useState(false);
    return (
        <tr className="hover:bg-gray-50 border-t">
            {children}
            <td className="px-3 py-2 text-right relative">
                {showActions ? (
                    <div className="flex justify-end gap-2 animate-in fade-in zoom-in duration-200 absolute right-2 top-2 bg-white shadow-md p-1 rounded border z-10">
                        <button onClick={() => { onEdit && onEdit(); setShowActions(false); }} className="p-1 text-blue-500 hover:bg-blue-50 rounded"><FilePen className="w-4 h-4"/></button>
                        <button onClick={() => { onDelete && onDelete(); setShowActions(false); }} className="p-1 text-red-500 hover:bg-red-50 rounded"><Trash2 className="w-4 h-4"/></button>
                        <button onClick={() => setShowActions(false)} className="p-1 text-gray-400 hover:bg-gray-100 rounded"><X className="w-4 h-4"/></button>
                    </div>
                ) : (
                    <button onClick={() => setShowActions(true)} className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded">
                        <MoreHorizontal className="w-5 h-5" />
                    </button>
                )}
            </td>
        </tr>
    )
}

const TableWithShowMore = ({ children, data, limit = 5 }) => {
    const [visible, setVisible] = useState(limit);
    const hasMore = data.length > visible;
    return (
        <>
            <div className="overflow-x-auto no-scrollbar pb-2">
                <table className="w-full text-sm min-w-[350px]">{children(data.slice(0, visible), TableRowWithAction)}</table>
            </div>
            {hasMore && (<button onClick={() => setVisible(prev => prev + 5)} className="w-full py-2 text-xs font-medium text-gray-500 hover:bg-gray-50 border-t flex items-center justify-center gap-1">Ver mais <ChevronDown className="w-3 h-3"/></button>)}
        </>
    );
};

/* ====================================
   🟠 TELAS (SCREENS)
   ==================================== */

function PrincipalScreen() {
  const { setTela } = useAppContext();
  const menus = [
    { id: 'refeicoes', nome: 'Refeições', icon: Utensils, cor: 'bg-orange-500' },
    { id: 'abastecimento', nome: 'Abastecimento', icon: Fuel, cor: 'bg-red-500' },
    { id: 'recomendacoes', nome: 'Recomendações', icon: Leaf, cor: 'bg-green-500' },
    { id: 'docs', nome: 'Docs', icon: FolderOpen, cor: 'bg-purple-500' },
    { id: 'energia', nome: 'Energia', icon: Zap, cor: 'bg-yellow-500' },
    { id: 'chuvas', nome: 'Chuvas', icon: Droplet, cor: 'bg-cyan-500' },
  ];
  return (
    <div className="space-y-5 p-4 pb-24">
      <div className="flex items-center gap-2 mb-2 pb-2 border-b-2 border-gray-100">
        <Home className="w-7 h-7 text-blue-500" />
        <h1 className="text-2xl font-bold text-gray-800">Módulos Operacionais</h1>
      </div>
      <div className="grid grid-cols-3 gap-4 pt-2">
        {menus.map(menu => {
          const Icon = menu.icon;
          return (
            <button key={menu.id} onClick={() => setTela(menu.id)} className={`flex flex-col items-center justify-center p-4 rounded-xl shadow-lg ${menu.cor} text-white hover:opacity-90 active:scale-95 transition-all aspect-square`}>
              <Icon className="w-8 h-8 mb-2" /><span className="text-xs font-bold text-center leading-tight">{menu.nome}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function DashboardScreen() { 
  const { os, setTela, dispatch } = useAppContext();
  const pendentes = os.filter(o => o.status === 'Pendente').length;
  const confirmadas = os.filter(o => o.status === 'Confirmado').length;
  const canceladas = os.filter(o => o.status === 'Cancelado').length;
  const [filtro, setFiltro] = useState('Pendente');
  const [search, setSearch] = useState('');
  
  const osFiltradas = useMemo(() => {
    let l = filtro === 'Todas' ? os : os.filter(o => o.status === filtro);
    if (search) l = l.filter(o => (o.descricao || '').toLowerCase().includes(search.toLowerCase()) || (o.modulo || '').toLowerCase().includes(search.toLowerCase()));
    return [...l].reverse();
  }, [os, filtro, search]);

  const getStatusColor = (s) => s === 'Pendente' ? 'bg-yellow-500' : s === 'Confirmado' ? 'bg-green-500' : 'bg-red-500';
  const getCardBorder = (s) => s === 'Pendente' ? 'border-yellow-400 bg-yellow-50' : s === 'Confirmado' ? 'border-green-400 bg-green-50' : 'border-red-400 bg-red-50';

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
            {osFiltradas.slice(0, 5).map(item => (
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

function RefeicoesScreen() {
  const { dados, dispatch, setTela, ativos } = useAppContext();
  const [form, setForm] = useState({ tipo: '', qtd: '', centro: '', data: U.todayIso() });
  const [filterDate, setFilterDate] = useState('');
  const [filterText, setFilterText] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(U.currentMonthIso());

  const valores = { 'Básica': 15, 'Executiva': 25, 'Especial': 35 };
  const tipoLimpo = form.tipo.split(' - ')[0];
  const total = (tipoLimpo && form.qtd) ? (valores[tipoLimpo] * U.parseDecimal(form.qtd)).toFixed(2) : '0.00';
  
  const enviar = (e) => { 
      e.preventDefault(); 
      const novo = { tipo: tipoLimpo, qtd: form.qtd, centro: form.centro, total, id: U.id('RF-'), data: form.data }; 
      const detalhes = { "Data": U.formatDate(form.data), "Tipo": tipoLimpo, "Qtd": form.qtd, "Centro de Custo": form.centro, "Valor Total": `R$ ${U.formatValue(total)}` };
      dispatch({ type: ACTIONS.ADD_RECORD, modulo: 'refeicoes', record: novo, osDescricao: `${form.qtd}x ${tipoLimpo} - R$ ${U.formatValue(total)}`, osDetalhes: detalhes }); 
      setForm({ tipo: '', qtd: '', centro: '', data: U.todayIso() }); 
      toast.success('Refeição solicitada!'); 
  };
  const excluir = (id) => { dispatch({ type: ACTIONS.SET_MODAL, modal: { isOpen: true, message: 'Excluir este registro de refeição?', onConfirm: () => { dispatch({ type: ACTIONS.REMOVE_RECORD, modulo: 'refeicoes', id }); dispatch({ type: ACTIONS.SET_MODAL, modal: { isOpen: false, message: '', onConfirm: () => {} } }); toast.error('Registro excluído.'); } } }); };
  
  const totalMes = useMemo(() => (dados.refeicoes || []).filter(i => i.data && i.data.startsWith(selectedMonth)).reduce((s, i) => s + U.parseDecimal(i.total || 0), 0), [dados.refeicoes, selectedMonth]);
  const qtdMes = useMemo(() => (dados.refeicoes || []).filter(i => i.data && i.data.startsWith(selectedMonth)).length, [dados.refeicoes, selectedMonth]);
  const listFilter = useMemo(() => (dados.refeicoes || []).filter(i => (!filterDate || i.data === filterDate) && (!filterText || i.tipo.toLowerCase().includes(filterText.toLowerCase()) || i.centro.toLowerCase().includes(filterText.toLowerCase()))).reverse(), [dados.refeicoes, filterDate, filterText]);

  return (
    <div className="space-y-4 p-4 pb-24">
      <PageHeader setTela={setTela} title="Refeições" icon={Utensils} colorClass="bg-orange-500" />
      <div className="bg-white border-2 rounded-xl p-3 shadow-sm">
          <div className="flex justify-between items-center mb-2"><p className="text-xs font-bold uppercase text-gray-500">Resumo Mensal</p><input type="month" value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} className="text-xs border rounded p-1" /></div>
          <div className="grid grid-cols-2 gap-4"><div><p className="text-2xl font-black text-green-600">R$ {U.formatValue(totalMes)}</p><p className="text-xs text-gray-500">Total Gasto</p></div><div className="border-l pl-4"><p className="text-2xl font-black text-blue-600">{qtdMes}</p><p className="text-xs text-gray-500">Refeições Solicitadas</p></div></div>
      </div>
      <div className="bg-white rounded-lg border-2 p-4">
        <h2 className="font-bold border-b pb-2 mb-3 text-gray-700">Registro de Consumo</h2>
        <form onSubmit={enviar} className="space-y-3">
          <Input label="Data" type="date" value={form.data} onChange={(e) => setForm({ ...form, data: e.target.value })} required />
          <Select label="Refeição" value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })} required>
            <option value="">Selecione...</option>{ativos.tiposRefeicao.map(t => <option key={t}>{t}</option>)}
          </Select>
          <Input label="Quantidade" type="number" min="1" placeholder="Qtd" value={form.qtd} onChange={(e) => setForm({ ...form, qtd: e.target.value })} required />
          <Select label="Centro de Custo" value={form.centro} onChange={(e) => setForm({ ...form, centro: e.target.value })} required>
                 <option value="">Selecione...</option>{ativos.centrosCusto.map(c => <option key={c}>{c}</option>)}
          </Select>
          {tipoLimpo && form.qtd && (<div className="bg-orange-50 border-2 border-orange-300 rounded-lg p-3 text-center"><p className="text-xs text-orange-700">Valor Total</p><p className="text-2xl font-bold text-orange-900">R$ {U.formatValue(total)}</p></div>)}
          <button type="submit" className="w-full bg-orange-500 text-white py-3 rounded-lg font-medium">Registrar</button>
        </form>
      </div>
      <div className="bg-white rounded-lg border-2 overflow-x-auto">
        <div className="p-3 border-b bg-gray-50 rounded-t-lg">
            <h2 className="font-bold text-sm uppercase text-gray-600 mb-2">Histórico de Refeições</h2>
            <div className="flex gap-2"><input type="date" value={filterDate} onChange={e => setFilterDate(e.target.value)} className="text-xs border rounded p-1" /><input type="text" placeholder="Buscar Refeição/Centro..." value={filterText} onChange={e => setFilterText(e.target.value)} className="text-xs border rounded p-1 flex-1" /></div>
        </div>
        <TableWithShowMore data={listFilter}>
            {(items, Row) => (<><thead className="bg-gray-50"><tr><th className="px-3 py-2 text-left text-xs font-bold text-gray-500">Data</th><th className="px-3 py-2 text-left text-xs font-bold text-gray-500">Tipo</th><th className="px-3 py-2 text-left text-xs font-bold text-gray-500">Qtd</th><th className="px-3 py-2 text-left text-xs font-bold text-gray-500">Total</th><th className="px-3 py-2 text-right text-xs font-bold text-gray-500">Ações</th></tr></thead><tbody className="divide-y">{items.map(item => (<Row key={item.id} onDelete={() => excluir(item.id)}><td className="px-3 py-2 text-gray-700">{U.formatDate(item.data)}</td><td className="px-3 py-2 text-gray-700">{item.tipo}</td><td className="px-3 py-2 text-gray-700">{item.qtd}</td><td className="px-3 py-2 font-bold text-orange-600">R$ {U.formatValue(item.total)}</td></Row>))}</tbody></>)}
        </TableWithShowMore>
      </div>
    </div>
  );
}

function AbastecimentoScreen() {
  const { dados, dispatch, buscarUltimaLeitura, setTela, ativos } = useAppContext();
  const [form, setForm] = useState({ maquina: '', horimetro: '', bombaInicial: '', bombaFinal: '', data: U.todayIso() });
  const [showCompraForm, setShowCompraForm] = useState(false);
  const [filterDate, setFilterDate] = useState('');
  const [filterMaq, setFilterMaq] = useState('');

  const qtd = useMemo(() => (U.parseDecimal(form.bombaFinal) - U.parseDecimal(form.bombaInicial)).toFixed(2), [form.bombaFinal, form.bombaInicial]);
  const estoqueInicial = 3000;
  const totalComprado = useMemo(() => (dados.compras || []).reduce((s, i) => s + U.parseDecimal(i.litros), 0), [dados.compras]);
  const totalUsado = useMemo(() => (dados.abastecimento || []).reduce((s, i) => s + U.parseDecimal(i.qtd), 0), [dados.abastecimento]);
  const estoqueAtual = (estoqueInicial + totalComprado - totalUsado);
  const perc = Math.min(((estoqueAtual / 15000) * 100), 100).toFixed(0); 

  useEffect(() => {
     const ultimaBomba = buscarUltimaLeitura('abastecimento', 'bombaFinal', '*');
     setForm(prev => ({ ...prev, bombaInicial: ultimaBomba ? ultimaBomba.bombaFinal : '0.00' }));
  }, [dados.abastecimento, buscarUltimaLeitura]);

  const horimetroAnterior = useMemo(() => {
      if(!form.maquina) return '0';
      const ultima = buscarUltimaLeitura('abastecimento', 'maquina', form.maquina);
      return ultima ? ultima.horimetro : '0';
  }, [form.maquina, buscarUltimaLeitura]);

  const enviar = (e) => {
    e.preventDefault();
    const litrosQtd = U.parseDecimal(qtd);
    if (litrosQtd <= 0) { toast.error("Quantidade deve ser positiva."); return; }
    const novo = { ...form, qtd, id: U.id('AB-') };
    const detalhes = { "Data": U.formatDate(form.data), "Máquina": form.maquina, "Horímetro": form.horimetro, "Bomba Inicial": `${form.bombaInicial} L`, "Bomba Final": `${form.bombaFinal} L`, "Abastecido": `${qtd} L` };
    dispatch({ type: ACTIONS.ADD_RECORD, modulo: 'abastecimento', record: novo, osDescricao: `${form.maquina} - ${qtd}L`, osDetalhes: detalhes });
    setForm({ maquina: '', horimetro: '', bombaInicial: '', bombaFinal: '', data: U.todayIso() });
    toast.success('Abastecimento registrado!');
  };

  const excluir = (id) => { dispatch({ type: ACTIONS.SET_MODAL, modal: { isOpen: true, message: 'Excluir abastecimento? Afeta o estoque.', onConfirm: () => { dispatch({ type: ACTIONS.REMOVE_RECORD, modulo: 'abastecimento', id }); dispatch({ type: ACTIONS.SET_MODAL, modal: { isOpen: false, message: '', onConfirm: () => {} } }); toast.error('Registro excluído.'); } } }); };
  const listFilter = useMemo(() => (dados.abastecimento || []).filter(i => (!filterDate || i.data === filterDate) && (!filterMaq || i.maquina.toLowerCase().includes(filterMaq.toLowerCase()))).reverse(), [dados.abastecimento, filterDate, filterMaq]);

  return (
    <div className="space-y-4 p-4 pb-24">
      <PageHeader setTela={setTela} title="Abastecimento" icon={Fuel} colorClass="bg-red-500" />
      <div className="bg-red-500 rounded-lg p-4 text-center text-white shadow-md">
          <p className="text-sm opacity-90 uppercase font-bold">Estoque Atual</p>
          <p className="text-4xl font-black tracking-tight">{U.formatInt(estoqueAtual)} L</p>
          <div className="w-full bg-red-800 rounded-full h-2 mt-2 overflow-hidden"><div className="bg-white h-2 transition-all duration-500" style={{ width: `${perc}%` }}></div></div>
          <p className="text-xs opacity-75 mt-1 text-right">{perc}% (Tanque 15k)</p>
      </div>
      <div className="bg-white rounded-lg border-2 p-4">
        <h2 className="font-bold border-b pb-2 mb-3 text-gray-700">Registro de Consumo</h2>
        <form onSubmit={enviar} className="space-y-3">
          <Input label="Data" type="date" value={form.data} onChange={(e) => setForm({ ...form, data: e.target.value })} required />
          <div className="space-y-1">
             <p className="text-xs font-medium text-gray-600">Bomba Inicial</p>
             <div className="bg-red-50 border-2 border-red-200 rounded-lg p-2">
                <p className="text-[10px] text-red-800 font-bold mb-1 uppercase">Automático (Último Registro)</p>
                <input type="text" value={form.bombaInicial} readOnly className="w-full bg-transparent font-bold text-gray-800 outline-none" />
             </div>
          </div>
          <Input label="Bomba Final (L)" type="number" step="0.01" placeholder="Informar Bomba Final (L)" value={form.bombaFinal} onChange={(e) => setForm({ ...form, bombaFinal: e.target.value })} required />
          <Select label="Máquina / Veículo" value={form.maquina} onChange={(e) => setForm({ ...form, maquina: e.target.value })} required>
                <option value="">Selecione...</option>{ativos.maquinas.map(m => <option key={m}>{m}</option>)}
          </Select>
          <div className="space-y-1">
             <p className="text-xs font-medium text-gray-600">Horímetro / Km Anterior</p>
             <div className="bg-gray-100 border-2 border-gray-300 rounded-lg p-2">
                 <p className="text-[10px] text-gray-500 mb-1">Leitura anterior preenchimento automaticamente</p>
                 <input type="text" value={horimetroAnterior} readOnly className="w-full bg-transparent text-gray-600 font-bold outline-none" />
             </div>
          </div>
          <Input label="Horímetro / Km Atual" type="number" placeholder="Informar leitura" value={form.horimetro} onChange={(e) => setForm({ ...form, horimetro: e.target.value })} required />
          <div className="px-3 py-2 bg-red-50 border-2 border-red-300 rounded-lg font-bold text-red-700 text-center">Quantidade: {U.formatValue(qtd)} L</div>
          <button type="submit" className="w-full bg-red-500 text-white py-3 rounded-lg font-medium">Registrar Consumo</button>
        </form>
      </div>
      <div className="bg-white rounded-lg border-2 p-4">
        <h2 className="font-bold border-b pb-2 mb-3 text-gray-700">Estoque</h2>
        <button onClick={() => setShowCompraForm(true)} className="w-full bg-green-600 text-white py-3 rounded-lg font-medium flex items-center justify-center gap-2 hover:bg-green-700"><Fuel className="w-5 h-5" /> Nova Compra de Diesel</button>
      </div>
      {showCompraForm && <CompraCombustivelForm onClose={() => setShowCompraForm(false)} />}
      <div className="bg-white rounded-lg border-2">
        <div className="p-3 border-b bg-gray-50 rounded-t-lg">
            <h2 className="font-bold text-sm uppercase text-gray-600 mb-2">Histórico de Abastecimento</h2>
            <div className="flex gap-2"><input type="date" value={filterDate} onChange={e => setFilterDate(e.target.value)} className="text-xs border rounded p-1" /><input type="text" placeholder="Filtrar Máquina" value={filterMaq} onChange={e => setFilterMaq(e.target.value)} className="text-xs border rounded p-1 flex-1" /></div>
        </div>
        <TableWithShowMore data={listFilter}>
            {(items, Row) => (<><thead className="bg-gray-50"><tr><th className="px-3 py-2 text-left text-xs font-bold text-gray-500">Data</th><th className="px-3 py-2 text-left text-xs font-bold text-gray-500">Qtd</th><th className="px-3 py-2 text-left text-xs font-bold text-gray-500">Máq.</th><th className="px-3 py-2 text-left text-xs font-bold text-gray-500">Horím.</th><th className="px-3 py-2 text-right text-xs font-bold text-gray-500">Ações</th></tr></thead><tbody className="divide-y">{items.map(item => (<Row key={item.id} onDelete={() => excluir(item.id)}><td className="px-3 py-2 text-gray-700">{U.formatDate(item.data)}</td><td className="px-3 py-2 font-bold text-red-600">{U.formatValue(item.qtd)}L</td><td className="px-3 py-2 text-gray-700 text-xs">{item.maquina}</td><td className="px-3 py-2 text-gray-700 text-xs">{item.horimetro}</td></Row>))}</tbody></>)}
        </TableWithShowMore>
      </div>
    </div>
  );
}

function CompraCombustivelForm({ onClose }) {
  const { dados, dispatch } = useAppContext();
  const [form, setForm] = useState({ data: U.todayIso(), notaFiscal: '', litros: '', valorUnitario: '', nfFrete: '', valorFrete: '' });
  const [showFrete, setShowFrete] = useState(false);
  const valorTotal = useMemo(() => (U.parseDecimal(form.litros) * U.parseDecimal(form.valorUnitario)).toFixed(2), [form.litros, form.valorUnitario]);
  const enviar = (e) => {
    e.preventDefault();
    const novo = { ...form, litros: form.litros, valorUnitario: form.valorUnitario, valorTotal, id: U.id('CP-') };
    dispatch({ type: ACTIONS.ADD_RECORD, modulo: 'compras', record: novo, osDescricao: `Compra de ${form.litros}L (NF: ${form.notaFiscal})` });
    toast.success('Compra registrada!');
    setForm({ data: U.todayIso(), notaFiscal: '', litros: '', valorUnitario: '', nfFrete: '', valorFrete: '' });
  };
  const ultimasCompras = (dados.compras || []).slice(-5).reverse();
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-[60] flex items-center justify-center p-4">
      <div className="bg-white rounded-lg w-full max-w-sm shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center border-b p-4"><h2 className="text-lg font-bold flex items-center gap-2"><Fuel className="w-5 h-5 text-green-500" /> Nova Compra de Diesel</h2><button onClick={onClose} className="p-1 rounded-full hover:bg-gray-100"><XClose className="w-5 h-5" /></button></div>
        <form onSubmit={enviar} className="p-4 space-y-3">
          <Input label="Data" type="date" value={form.data} onChange={(e) => setForm({ ...form, data: e.target.value })} required />
          <Input label="Nota Fiscal" placeholder="Número da NF" value={form.notaFiscal} onChange={(e) => setForm({ ...form, notaFiscal: e.target.value })} required />
          <Input label="Litros (L)" type="number" step="0.01" placeholder="Informe Litros (L) da Compra" value={form.litros} onChange={(e) => setForm({ ...form, litros: e.target.value })} required />
          <Input label="Valor Unitário (R$)" type="number" step="0.01" placeholder="Informe valor do litro (R$)" value={form.valorUnitario} onChange={(e) => setForm({ ...form, valorUnitario: e.target.value })} required />
          <div className="pt-2 border-t">
              <button type="button" onClick={() => setShowFrete(!showFrete)} className="text-xs text-gray-500 font-bold mb-2 flex items-center gap-1">Frete (Opcional) {showFrete ? <Minus className="w-3 h-3"/> : <Plus className="w-3 h-3"/>}</button>
              {showFrete && (<><Input label="NF Frete" placeholder="Número NF Frete" value={form.nfFrete} onChange={(e) => setForm({ ...form, nfFrete: e.target.value })} /><Input label="Valor Frete (R$)" type="number" step="0.01" placeholder="Informe Valor frete (R$)" value={form.valorFrete} onChange={(e) => setForm({ ...form, valorFrete: e.target.value })} /></>)}
          </div>
          <div className="px-3 py-2 bg-green-50 border-2 border-green-300 rounded-lg font-bold text-green-700 text-center">Total Combustível: R$ {U.formatValue(valorTotal)}</div>
          <button type="submit" className="w-full bg-green-600 text-white py-3 rounded-lg font-medium hover:bg-green-700">Registrar Compra</button>
        </form>
        <div className="p-4 border-t bg-gray-50">
            <p className="text-xs font-bold text-gray-500 mb-2 uppercase">Últimas 5 Compras</p>
            {ultimasCompras.map(c => (<div key={c.id} className="text-xs flex justify-between py-1 border-b last:border-0"><span>{U.formatDate(c.data)}</span><span>{c.litros}L</span><span className="font-bold">R$ {U.formatValue(c.valorTotal)}</span></div>))}
        </div>
      </div>
    </div>
  );
}

function DocumentosScreen() {
  const { dados, dispatch, setTela, ativos } = useAppContext();
  const [form, setForm] = useState({ tipo: '', nome: '', codigo: '', data: U.todayIso() });
  const [filterDate, setFilterDate] = useState('');
  const [filterText, setFilterText] = useState('');
  const [fileSelected, setFileSelected] = useState('');
  const fileInputRef = useRef(null);

  const handleFileSelect = (e) => {
      if (e.target.files && e.target.files[0]) {
          setFileSelected(e.target.files[0].name);
          toast.success("Arquivo selecionado!");
      }
  };

  const enviar = (e) => {
    e.preventDefault();
    const novo = { ...form, id: U.id('DOC-'), arquivo: fileSelected };
    dispatch({ type: ACTIONS.ADD_RECORD, modulo: 'documentos', record: novo, osDescricao: `${form.tipo}: ${form.nome}` });
    setForm({ tipo: '', nome: '', codigo: '', data: U.todayIso() });
    setFileSelected('');
    toast.success('Documento registrado!');
  };
  const excluir = (id) => { dispatch({ type: ACTIONS.SET_MODAL, modal: { isOpen: true, message: 'Excluir documento?', onConfirm: () => { dispatch({ type: ACTIONS.REMOVE_RECORD, modulo: 'documentos', id }); dispatch({ type: ACTIONS.SET_MODAL, modal: { isOpen: false, message: '', onConfirm: () => {} } }); toast.error('Registro excluído.'); } } }); };
  const docsFiltrados = useMemo(() => (dados.documentos || []).filter(i => (!filterDate || i.data === filterDate) && (!filterText || i.nome.toLowerCase().includes(filterText.toLowerCase()) || i.tipo.toLowerCase().includes(filterText.toLowerCase()))).reverse(), [dados.documentos, filterDate, filterText]);
  const getBadgeColor = (tipo) => { if (tipo === 'Nota Fiscal') return 'bg-blue-100 text-blue-800'; if (tipo === 'Boleto') return 'bg-red-100 text-red-800'; return 'bg-gray-100 text-gray-800'; };

  return (
    <div className="space-y-4 p-4 pb-24">
      <PageHeader setTela={setTela} title="Documentos" icon={FolderOpen} colorClass="bg-purple-500" />
      <div className="bg-white rounded-lg border-2 p-4">
        <h2 className="font-bold border-b pb-2 mb-3 text-gray-700">Registro de Documentos</h2>
        <form onSubmit={enviar} className="space-y-3">
          <Input label="Data" type="date" value={form.data} onChange={(e) => setForm({ ...form, data: e.target.value })} required />
          <Select label="Categoria de Arquivo" value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })} required>
             <option value="">Selecione...</option>{ativos.tiposDocumento.map(t => <option key={t}>{t}</option>)}
          </Select>
          <Input label="Nome do Arquivo" placeholder="Informar nome" value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} required />
          <Input label="Código" placeholder="Código de Barras/Identificador" value={form.codigo} onChange={(e) => setForm({ ...form, codigo: e.target.value })} />
          <div onClick={() => fileInputRef.current.click()} className="flex items-center justify-center w-full p-4 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">
              <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileSelect} />
              <div className="text-center">
                  <Paperclip className="mx-auto h-8 w-8 text-gray-400" />
                  <p className="mt-1 text-xs text-gray-500">{fileSelected || "Anexar Arquivo (Foto/PDF)"}</p>
              </div>
          </div>
          <button type="submit" className="w-full bg-purple-500 text-white py-3 rounded-lg font-medium">Registrar</button>
        </form>
      </div>
      <div className="bg-white rounded-lg border-2 overflow-x-auto">
        <div className="p-3 border-b bg-gray-50 rounded-t-lg">
             <h2 className="font-bold text-sm uppercase text-gray-600 mb-2">Histórico de Documentos</h2>
             <div className="flex gap-2"><input type="date" value={filterDate} onChange={e => setFilterDate(e.target.value)} className="text-xs border rounded p-1" /><input type="text" placeholder="Buscar Categoria/Nome..." value={filterText} onChange={e => setFilterText(e.target.value)} className="text-xs border rounded p-1 flex-1" /></div>
        </div>
        <TableWithShowMore data={docsFiltrados}>
            {(items, Row) => (<><thead className="bg-gray-50"><tr><th className="px-3 py-2 text-left text-xs font-bold text-gray-500">Data</th><th className="px-3 py-2 text-left text-xs font-bold text-gray-500">Categoria</th><th className="px-3 py-2 text-left text-xs font-bold text-gray-500">Nome</th><th className="px-3 py-2 text-right text-xs font-bold text-gray-500">Ações</th></tr></thead><tbody className="divide-y">{items.map(item => (<Row key={item.id} onDelete={() => excluir(item.id)}><td className="px-3 py-2 text-gray-700">{U.formatDate(item.data)}</td><td className="px-3 py-2"><span className={`px-2 py-1 rounded-full text-xs font-bold ${getBadgeColor(item.tipo)}`}>{item.tipo}</span></td><td className="px-3 py-2 text-gray-700">{item.nome}</td></Row>))}</tbody></>)}
        </TableWithShowMore>
      </div>
    </div>
  );
}

function RecomendacoesScreen() {
  const { dados, dispatch, setTela, ativos } = useAppContext();
  const [form, setForm] = useState({ data: U.todayIso(), safra: '', talhao: '', area: '', classe: '', cultura: '', produto: '', dose: '' });
  const [filterData, setFilterData] = useState('');
  const [filterText, setFilterText] = useState('');
  
  const handleTalhaoChange = (e) => {
      const tNome = e.target.value;
      const tObj = ativos.talhoes.find(t => t.nome === tNome);
      setForm(prev => ({ ...prev, talhao: tNome, area: tObj ? tObj.area : '' }));
  };

  const enviar = (e) => { e.preventDefault(); const novo = { ...form, id: U.id('RC-') }; dispatch({ type: ACTIONS.ADD_RECORD, modulo: 'recomendacoes', record: novo, osDescricao: `${form.produto} - ${form.cultura}` }); setForm({ data: U.todayIso(), safra: '', talhao: '', area: '', classe: '', cultura: '', produto: '', dose: '' }); toast.success('Recomendação criada!'); };
  const excluir = (id) => { dispatch({ type: ACTIONS.SET_MODAL, modal: { isOpen: true, message: 'Excluir recomendação agronômica?', onConfirm: () => { dispatch({ type: ACTIONS.REMOVE_RECORD, modulo: 'recomendacoes', id }); dispatch({ type: ACTIONS.SET_MODAL, modal: { isOpen: false, message: '', onConfirm: () => {} } }); toast.error('Registro excluído.'); } } }); };
  
  // FIX: Safe navigation for filter
  const listFilter = useMemo(() => (dados.recomendacoes || []).filter(i => {
      const txt = filterText.toLowerCase();
      const matchData = !filterData || i.data === filterData;
      const matchText = !filterText || 
          (i.safra || '').toLowerCase().includes(txt) || 
          (i.talhao || '').toLowerCase().includes(txt) || 
          (i.cultura || '').toLowerCase().includes(txt) || 
          (i.classe || '').toLowerCase().includes(txt) || 
          (i.produto || '').toLowerCase().includes(txt);
      return matchData && matchText;
  }).reverse(), [dados.recomendacoes, filterData, filterText]);

  return (
    <div className="space-y-4 p-4 pb-24">
      <PageHeader setTela={setTela} title="Recomendações" icon={Leaf} colorClass="bg-green-500" />
      <div className="bg-white rounded-lg border-2 p-4">
        <h2 className="font-bold border-b pb-2 mb-3 text-gray-700">Aplicações a Serem Feitas</h2>
        <form onSubmit={enviar} className="space-y-3">
          <Input label="Data" type="date" value={form.data} onChange={(e) => setForm({ ...form, data: e.target.value })} required />
          <Select label="Safra" value={form.safra} onChange={(e) => setForm({ ...form, safra: e.target.value })} required>
             <option value="">Selecione...</option>{ativos.safras.map(s => <option key={s}>{s}</option>)}
          </Select>
          <Select label="Talhão" value={form.talhao} onChange={handleTalhaoChange} required>
            <option value="">Selecione...</option>{ativos.talhoes.map(t => <option key={t.nome} value={t.nome}>{t.nome}</option>)}
          </Select>
          <div className="space-y-1">
             <p className="text-xs font-medium text-gray-600">Área (ha)</p>
             <div className="bg-green-50 border-2 border-green-200 rounded-lg p-2">
                <p className="text-[10px] text-green-800 font-bold mb-1 uppercase">Preenchido Automaticamente do Talhão (Bloqueado)</p>
                <input type="text" value={form.area} readOnly className="w-full bg-transparent font-bold text-gray-800 outline-none" placeholder="Área" />
             </div>
          </div>
          <Select label="Cultura" value={form.cultura} onChange={(e) => setForm({ ...form, cultura: e.target.value })} required>
             <option value="">Selecione...</option>{ativos.culturas.map(c => <option key={c}>{c}</option>)}
          </Select>
          <Select label="Classe" value={form.classe} onChange={(e) => setForm({ ...form, classe: e.target.value })} required>
             <option value="">Selecione...</option>{ativos.classes.map(c => <option key={c}>{c}</option>)}
          </Select>
          <Select label="Produto" value={form.produto} onChange={(e) => setForm({ ...form, produto: e.target.value })} required>
               <option value="">Selecione...</option>{ativos.produtos.map(p => <option key={p} value={p}>{p}</option>)}
          </Select>
          <Input label="Dose" placeholder="Ex: 2L/ha" value={form.dose} onChange={(e) => setForm({ ...form, dose: e.target.value })} required />
          <button type="submit" className="w-full bg-green-500 text-white py-3 rounded-lg font-medium">Criar</button>
        </form>
      </div>
      <div className="bg-white rounded-lg border-2 overflow-x-auto">
        <div className="p-3 border-b bg-gray-50 rounded-t-lg">
            <h2 className="font-bold text-sm uppercase text-gray-600 mb-2">Histórico de Recomendações</h2>
            <div className="flex gap-2"><input type="date" value={filterData} onChange={e => setFilterData(e.target.value)} className="text-xs border rounded p-1" /><input type="text" placeholder="Buscar Safra/Talhão/Cultura..." value={filterText} onChange={e => setFilterText(e.target.value)} className="text-xs border rounded p-1 flex-1" /></div>
        </div>
        <TableWithShowMore data={listFilter}>
            {(items, Row) => (<><thead className="bg-gray-50"><tr><th className="px-3 py-2 text-left text-xs font-bold text-gray-500">Data</th><th className="px-3 py-2 text-left text-xs font-bold text-gray-500">Safra</th><th className="px-3 py-2 text-left text-xs font-bold text-gray-500">Talhão</th><th className="px-3 py-2 text-left text-xs font-bold text-gray-500">Cultura</th><th className="px-3 py-2 text-right text-xs font-bold text-gray-500">Ações</th></tr></thead><tbody className="divide-y">{items.map(item => (<Row key={item.id} onDelete={() => excluir(item.id)}><td className="px-3 py-2 text-gray-700">{U.formatDate(item.data)}</td><td className="px-3 py-2 text-gray-700">{item.safra}</td><td className="px-3 py-2 text-gray-700">{item.talhao}</td><td className="px-3 py-2 text-gray-700">{item.cultura}</td></Row>))}</tbody></>)}
        </TableWithShowMore>
      </div>
    </div>
  );
}

function ChuvaScreen() {
  const { dados, dispatch, setTela, ativos } = useAppContext();
  const [form, setForm] = useState({ data: U.todayIso(), talhao: '', precipitacao: '' });
  const [filterText, setFilterText] = useState('');
  const [filterDate, setFilterDate] = useState('');
  
  const enviar = (e) => {
    e.preventDefault();
    const novo = { ...form, id: U.id('CH-'), usuario: 'João Felipe' };
    const detalhes = { "Data": U.formatDate(form.data), "Talhão": form.talhao, "Precipitação": `${form.precipitacao} mm` };
    dispatch({ type: ACTIONS.ADD_RECORD, modulo: 'chuvas', record: novo, osDescricao: `${form.precipitacao}mm em ${form.talhao}`, osDetalhes: detalhes });
    setForm({ data: U.todayIso(), talhao: '', precipitacao: '' });
    toast.success('Registro de chuvas criado!');
  };
  const excluir = (id) => { dispatch({ type: ACTIONS.SET_MODAL, modal: { isOpen: true, message: 'Excluir este registro de chuvas?', onConfirm: () => { dispatch({ type: ACTIONS.REMOVE_RECORD, modulo: 'chuvas', id }); dispatch({ type: ACTIONS.SET_MODAL, modal: { isOpen: false, message: '', onConfirm: () => {} } }); toast.error('Registro excluído.'); } } }); };
  const chuvasFiltradas = useMemo(() => (dados.chuvas || []).filter(i => (!filterDate || i.data === filterDate) && (!filterText || i.talhao.toLowerCase().includes(filterText.toLowerCase()))).reverse(), [dados.chuvas, filterText, filterDate]);
  
  return (
    <div className="space-y-4 p-4 pb-24">
      <PageHeader setTela={setTela} title="Pluviométrico" icon={Droplet} colorClass="bg-cyan-500" />
      <div className="bg-white rounded-lg border-2 p-4">
        <h2 className="font-bold border-b pb-2 mb-3 text-gray-700">Registro de Precipitações</h2>
        <form onSubmit={enviar} className="space-y-3">
          <Input label="Data" type="date" value={form.data} onChange={(e) => setForm({ ...form, data: e.target.value })} required />
          <Select label="Talhão" value={form.talhao} onChange={(e) => setForm({ ...form, talhao: e.target.value })} required>
             <option value="">Selecione...</option>{ativos.talhoesChuva.map(t => <option key={t.nome} value={t.nome}>{t.nome}</option>)}
          </Select>
          <Input label="Precipitação (mm)" type="number" step="0.1" placeholder="Informar mm" value={form.precipitacao} onChange={(e) => setForm({ ...form, precipitacao: e.target.value })} required />
          <button type="submit" className="w-full bg-cyan-500 text-white py-3 rounded-lg font-medium">Registrar</button>
        </form>
      </div>
      <div className="bg-white rounded-lg border-2">
        <div className="p-3 border-b bg-gray-50 rounded-t-lg">
            <h2 className="font-bold text-sm uppercase text-gray-600 mb-2">Histórico de Chuvas</h2>
            <div className="flex gap-2"><input type="date" value={filterDate} onChange={e => setFilterDate(e.target.value)} className="text-xs border rounded p-1" /><input type="text" placeholder="Buscar Talhão..." value={filterText} onChange={e => setFilterText(e.target.value)} className="w-full text-xs border rounded p-1" /></div>
        </div>
        <TableWithShowMore data={chuvasFiltradas}>
            {(items, Row) => (<><thead className="bg-gray-50"><tr><th className="px-3 py-2 text-left text-xs font-bold text-gray-500">Data</th><th className="px-3 py-2 text-left text-xs font-bold text-gray-500">Talhão</th><th className="px-3 py-2 text-left text-xs font-bold text-gray-500">Precip.</th><th className="px-3 py-2 text-right text-xs font-bold text-gray-500">Ações</th></tr></thead><tbody className="divide-y">{items.map(item => (<Row key={item.id} onDelete={() => excluir(item.id)}><td className="px-3 py-2 text-gray-700">{U.formatDate(item.data)}</td><td className="px-3 py-2 text-gray-700">{item.talhao}</td><td className="px-3 py-2 font-bold text-cyan-600">{item.precipitacao}mm</td></Row>))}</tbody></>)}
        </TableWithShowMore>
      </div>
    </div>
  );
}

function EnergiaScreen() {
  const { dados, dispatch, buscarUltimaLeitura, setTela, ativos } = useAppContext();
  const [form, setForm] = useState({ medidor: '', local: '', anterior: '', atual: '', data: U.todayIso() });
  const [filterDate, setFilterDate] = useState('');
  const [filterText, setFilterText] = useState('');

  const consumo = useMemo(() => {
    const a = U.parseDecimal(form.atual);
    const b = U.parseDecimal(form.anterior);
    return (a - b).toFixed(2);
  }, [form.atual, form.anterior]);

  const handleLocalChange = (e) => {
      const localNome = e.target.value;
      const localObj = ativos.locaisEnergia.find(l => l.nome === localNome);
      const medidor = localObj ? localObj.medidor : '';
      setForm(prev => ({ ...prev, local: localNome, medidor: medidor, anterior: '' }));
      if (medidor) {
          const ultimo = buscarUltimaLeitura('energia', 'medidor', medidor);
          if (ultimo && ultimo.atual) setForm(prev => ({ ...prev, anterior: ultimo.atual }));
      }
  };

  const enviar = (e) => {
    e.preventDefault();
    const novo = { ...form, consumo, id: U.id('EN-') };
    const detalhes = { "Data": U.formatDate(form.data), "Local": form.local, "Medidor": form.medidor, "Anterior": form.anterior, "Atual": form.atual, "Consumo": `${consumo} kWh` };
    dispatch({ type: ACTIONS.ADD_RECORD, modulo: 'energia', record: novo, osDescricao: `Medidor ${form.medidor} - ${consumo} kWh`, osDetalhes: detalhes });
    setForm({ medidor: '', local: '', anterior: '', atual: '', data: U.todayIso() });
    toast.success('Leitura de energia registrada!');
  };

  const excluir = (id) => { dispatch({ type: ACTIONS.SET_MODAL, modal: { isOpen: true, message: 'Excluir este registro de energia?', onConfirm: () => { dispatch({ type: ACTIONS.REMOVE_RECORD, modulo: 'energia', id }); dispatch({ type: ACTIONS.SET_MODAL, modal: { isOpen: false, message: '', onConfirm: () => {} } }); toast.error('Registro excluído.'); } } }); };
  const listFilter = useMemo(() => (dados.energia || []).filter(i => (!filterDate || i.data === filterDate) && (!filterText || i.local.toLowerCase().includes(filterText.toLowerCase()) || i.medidor.toLowerCase().includes(filterText.toLowerCase()))).reverse(), [dados.energia, filterDate, filterText]);

  return (
    <div className="space-y-4 p-4 pb-24">
      <PageHeader setTela={setTela} title="Energia" icon={Zap} colorClass="bg-yellow-500" />
      <div className="bg-white rounded-lg border-2 p-4">
        <h2 className="font-bold border-b pb-2 mb-3 text-gray-700">Registro de Consumo</h2>
        <form onSubmit={enviar} className="space-y-3">
          <Input label="Data" type="date" value={form.data} onChange={(e) => setForm({ ...form, data: e.target.value })} required />
          <Select label="Localização" value={form.local} onChange={handleLocalChange} required>
             <option value="">Selecione...</option>{ativos.locaisEnergia.map(l => <option key={l.nome} value={l.nome}>{l.nome}</option>)}
          </Select>
          <div className="space-y-1">
             <p className="text-xs font-medium text-gray-600">ID Medidor</p>
             <div className="bg-yellow-50 border-2 border-yellow-200 rounded-lg p-2">
                 <p className="text-[10px] text-yellow-800 font-bold mb-1 uppercase">Preenchido automaticamente do Local (Bloqueado)</p>
                 <input type="text" value={form.medidor} readOnly className="w-full bg-transparent font-bold text-gray-800 outline-none" placeholder="ID Medidor" />
             </div>
          </div>
          <div className="space-y-1">
             <p className="text-xs font-medium text-gray-600">Leitura Anterior</p>
             <div className="bg-gray-100 border-2 border-gray-300 rounded-lg p-2">
                 <p className="text-[10px] text-gray-500 mb-1">Leitura anterior preenchimento automaticamente</p>
                 <input type="text" value={form.anterior} readOnly className="w-full bg-transparent text-gray-600 font-bold outline-none" />
             </div>
          </div>
          <Input label="Leitura Atual (kWh)" type="number" placeholder="Informar leitura" value={form.atual} onChange={(e) => setForm({ ...form, atual: e.target.value })} required />
          <div className="px-3 py-2 bg-yellow-50 border-2 border-yellow-300 rounded-lg font-bold text-yellow-700 text-center">Consumo: {consumo} kWh</div>
          <button type="submit" className="w-full bg-yellow-500 text-white py-3 rounded-lg font-medium">Registrar</button>
        </form>
      </div>
      <div className="bg-white rounded-lg border-2">
        <div className="p-3 border-b bg-gray-50 rounded-t-lg">
            <h2 className="font-bold text-sm uppercase text-gray-600 mb-2">Histórico de Energia</h2>
            <div className="flex gap-2"><input type="date" value={filterDate} onChange={e => setFilterDate(e.target.value)} className="text-xs border rounded p-1" /><input type="text" placeholder="Buscar Local/ID..." value={filterText} onChange={e => setFilterText(e.target.value)} className="text-xs border rounded p-1 flex-1" /></div>
        </div>
        <TableWithShowMore data={listFilter}>
            {(items, Row) => (<><thead className="bg-gray-50"><tr><th className="px-3 py-2 text-left text-xs font-bold text-gray-500">Data</th><th className="px-3 py-2 text-left text-xs font-bold text-gray-500">Local</th><th className="px-3 py-2 text-left text-xs font-bold text-gray-500">ID</th><th className="px-3 py-2 text-left text-xs font-bold text-gray-500">Consumo</th><th className="px-3 py-2 text-right text-xs font-bold text-gray-500">Ações</th></tr></thead><tbody className="divide-y">{items.map(item => (<Row key={item.id} onDelete={() => excluir(item.id)}><td className="px-3 py-2 text-gray-700">{U.formatDate(item.data)}</td><td className="px-3 py-2 text-gray-700 text-xs">{item.local}</td><td className="px-3 py-2 text-gray-700 text-xs">{item.medidor}</td><td className="px-3 py-2 font-bold text-yellow-600">{item.consumo} kWh</td></Row>))}</tbody></>)}
        </TableWithShowMore>
      </div>
    </div>
  );
}

function OsScreen() {
  const { os, dispatch, setTela, selectedOS } = useAppContext();
  const pendentes = (os || []).filter(o => o.status === 'Pendente').reverse();
  const outras = (os || []).filter(o => o.status !== 'Pendente').reverse();
  const [historicoAberto, setHistoricoAberto] = useState(false);
  
  // Limpa selectedOS ao entrar na tela para evitar conflito com dashboard
  useEffect(() => {
      // Opcional: dispatch({ type: ACTIONS.SET_SELECTED_OS, os: null });
  }, [dispatch]);

  return (
    <div className="space-y-4 p-4 pb-24">
      <div className="flex items-center gap-2 mb-2 pb-2 border-b-2 border-gray-100">
         <Bell className="w-7 h-7 text-indigo-600" />
         <h1 className="text-xl font-bold text-gray-800">Ordens de Serviço</h1>
      </div>
      <button onClick={() => setTela('home')} className="flex items-center gap-1 text-sm font-medium text-gray-500 hover:text-blue-600 mb-2"><ArrowLeft className="w-4 h-4" /> Voltar ao Dashboard</button>
      
      {selectedOS && <OSDetailsModal os={selectedOS} onClose={() => dispatch({ type: ACTIONS.SET_SELECTED_OS, os: null })} onUpdateStatus={(id, status) => dispatch({ type: ACTIONS.UPDATE_OS_STATUS, id, status })} />}
      <div className="bg-white rounded-lg border-2">
        <h2 className="font-bold p-4 border-b">Pendentes ({pendentes.length})</h2>
        {pendentes.length > 0 ? pendentes.map(item => (
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
        {historicoAberto && outras.length > 0 ? outras.map(item => (<div key={item.id} className="p-3 border-t last:border-b-0" onClick={() => dispatch({ type: ACTIONS.SET_SELECTED_OS, os: item })}><div className="flex justify-between gap-2"><div className="flex-1 min-w-0"><p className="font-bold text-sm">{item.id}</p><p className="text-xs text-gray-600">{item.modulo}</p><p className="text-sm">{item.descricao}</p></div><span className={`px-2 py-1 rounded-full text-xs h-fit ${item.status === 'Confirmado' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{item.status}</span></div></div>)) : historicoAberto && (<p className="text-gray-500 text-center py-4 text-sm">Nenhum histórico</p>)}
      </div>
    </div>
  );
}

function GraficosScreen() {
  const { setTela } = useAppContext();
  return (
    <div className="space-y-4 p-4 pb-24">
      <PageHeader setTela={setTela} title="Gráficos" icon={ChartNoAxesCombined} colorClass="bg-purple-600" />
      <div className="bg-white p-6 rounded-lg shadow-md text-center"><TrendingUp className="w-12 h-12 text-purple-600 mx-auto mb-4" /><p className="text-gray-600">Módulo em desenvolvimento. Em breve visualização de dados.</p></div>
    </div>
  );
}

function ConfiguracoesScreen() {
  const { setTela } = useAppContext();
  return (
    <div className="space-y-4 p-4 pb-24">
      <PageHeader setTela={setTela} title="Configurações" icon={Settings} colorClass="bg-gray-600" />
      <div className="bg-white p-6 rounded-lg shadow-md text-center"><Settings className="w-12 h-12 text-gray-400 mx-auto mb-4" /><p className="text-gray-600">Versão 3.4 - Fazenda São Caetano</p></div>
    </div>
  );
}

/* ====================================
   🟤 APP COMPONENT
   ==================================== */
export default function App() {
  const [state, dispatch] = useReducer(reducer, INITIAL);
  const setTela = (t) => dispatch({ type: ACTIONS.SET_TELA, tela: t });
  const buscarUltimaLeitura = useCallback((modulo, filtroChave, filtroValor) => {
    const lista = state.dados[modulo] || [];
    const listaFiltrada = lista.filter(item => filtroValor === '*' || item[filtroChave] === filtroValor).sort((a, b) => b.id - a.id);
    return listaFiltrada[0];
  }, [state.dados]);

  useEffect(() => {
    dispatch({ type: ACTIONS.SET_LOADING, loading: true });
    setTimeout(() => {
      const salvo = localStorage.getItem('sistemaRural');
      if (salvo) {
        try {
          const parsed = JSON.parse(salvo);
          let loadedAtivos = parsed.ativos || ATIVOS_INICIAIS;
          loadedAtivos = { ...ATIVOS_INICIAIS, ...loadedAtivos };
          // Atualiza as listas que mudaram na estrutura
          loadedAtivos.culturas = ATIVOS_INICIAIS.culturas;
          loadedAtivos.classes = ATIVOS_INICIAIS.classes;
          loadedAtivos.centrosCusto = ATIVOS_INICIAIS.centrosCusto;
          loadedAtivos.tiposDocumento = ATIVOS_INICIAIS.tiposDocumento;
          loadedAtivos.tiposRefeicao = ATIVOS_INICIAIS.tiposRefeicao; 
          loadedAtivos.talhoesChuva = ATIVOS_INICIAIS.talhoesChuva;
          dispatch({ type: ACTIONS.LOAD, payload: { os: parsed.os || [], dados: parsed.dados || DADOS_INICIAIS, ativos: loadedAtivos } });
        } catch (e) { console.error('Erro ao carregar:', e); dispatch({ type: ACTIONS.LOAD, payload: { ...INITIAL, loading: false } }); }
      } else {
        dispatch({ type: ACTIONS.LOAD, payload: { ...INITIAL, loading: false } });
      }
    }, 400);
  }, []);

  useEffect(() => { if (!state.loading) localStorage.setItem('sistemaRural', JSON.stringify({ os: state.os, dados: state.dados, ativos: state.ativos })); }, [state.os, state.dados, state.ativos, state.loading]);

  const contextValue = useMemo(() => ({ ...state, dispatch, setTela, buscarUltimaLeitura }), [state, dispatch, buscarUltimaLeitura]);
  const Screens = { principal: PrincipalScreen, home: DashboardScreen, dashboard: DashboardScreen, graficos: GraficosScreen, config: ConfiguracoesScreen, refeicoes: RefeicoesScreen, abastecimento: AbastecimentoScreen, recomendacoes: RecomendacoesScreen, docs: DocumentosScreen, energia: EnergiaScreen, chuvas: ChuvaScreen, os: OsScreen };
  const ScreenComponent = Screens[state.tela] || PrincipalScreen;
  const pendentes = (state.os || []).filter(o => o.status === 'Pendente').length;
  const menusRodape = [{ id: 'principal', nome: 'Principal', icon: Home, cor: 'bg-blue-500' }, { id: 'home', nome: 'Dashboard', icon: FileCog, cor: 'bg-indigo-600' }, { id: 'graficos', nome: 'Gráficos', icon: ChartNoAxesCombined, cor: 'bg-gradient-to-r from-purple-500 to-pink-500' }, { id: 'config', nome: 'Config.', icon: Settings, cor: 'bg-gray-600' }];

  return (
    <AppContext.Provider value={contextValue}>
      <Toaster position="top-center" />
      <GlobalStyles />
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <header className="bg-white border-b-2 border-gray-200 sticky top-0 z-50">
          <div className="px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2"><div className="w-10 h-10 bg-green-600 rounded-lg flex items-center justify-center"><Tractor className="w-6 h-6 text-white" /></div><div className="min-w-0"><h1 className="text-base font-bold text-gray-800 truncate">Fazenda São Caetano</h1><p className="text-xs text-gray-600 truncate">Gestão Rural v3.4</p></div></div>
            <div className="flex items-center gap-2">
              {state.tela !== 'os' && (<button onClick={() => setTela('os')} className="relative p-2 hover:bg-gray-100 rounded-full transition-colors"><Bell className="w-5 h-5 text-gray-600" />{pendentes > 0 && (<span className="absolute top-0 right-0 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold">{pendentes}</span>)}</button>)}
              <button onClick={() => dispatch({ type: ACTIONS.SET_MODAL, modal: { isOpen: true, message: 'Limpar dados?', onConfirm: () => { localStorage.clear(); window.location.reload(); } } })} className="px-2 py-1 text-xs text-red-600 hover:bg-red-50 rounded font-medium">Limpar</button>
            </div>
          </div>
        </header>
        {state.loading ? (<div className="flex-1 flex flex-col items-center justify-center text-gray-500"><Loader2 className="w-8 h-8 animate-spin text-blue-500" /><p className="mt-4 font-medium">Carregando dados...</p></div>) : (<div className="flex-1 overflow-y-auto no-scrollbar"><ScreenComponent /></div>)}
        {state.modal.isOpen && (<ConfirmModal message={state.modal.message} onConfirm={() => { state.modal.onConfirm(); }} onClose={() => dispatch({ type: ACTIONS.SET_MODAL, modal: { isOpen: false, message: '', onConfirm: () => {} } })} />)}
        
        <nav className="fixed bottom-0 left-0 right-0 bg-white border-t-2 border-gray-200 z-50">
          <div className="grid grid-cols-4 gap-1 p-2">
            {menusRodape.map(menu => {
              const Icon = menu.icon; const ativo = state.tela === menu.id;
              const activeClass = menu.id === 'graficos' && ativo ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white' : ativo ? `${menu.cor} text-white` : 'text-gray-600 hover:bg-gray-100';
              return (<button key={menu.id} onClick={() => setTela(menu.id)} className={`flex flex-col items-center gap-1 px-2 py-2 rounded-lg ${activeClass}`}><div className="flex items-center justify-center gap-1"><Icon className="w-5 h-5" /></div><span className="text-xs font-medium">{menu.nome}</span></button>);
            })}
          </div>
        </nav>
      </div>
    </AppContext.Provider>
  );
}