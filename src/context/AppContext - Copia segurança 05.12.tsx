import React, { createContext, useContext, useReducer, useEffect, useCallback, useMemo } from 'react';
import { DADOS_INICIAIS, ATIVOS_INICIAIS } from '../data/constants';

// Tipos básicos para evitar erros de TS (pode ser any se preferir simplificar)
type State = {
  tela: string;
  os: any[];
  dados: any;
  ativos: any;
  loading: boolean;
  modal: { isOpen: boolean; message: string; onConfirm: () => void };
  selectedOS: any;
};

const INITIAL: State = {
  tela: 'principal',
  os: [],
  dados: DADOS_INICIAIS,
  ativos: ATIVOS_INICIAIS,
  loading: true,
  modal: { isOpen: false, message: '', onConfirm: () => {} },
  selectedOS: null
};

export const ACTIONS = {
  LOAD: 'LOAD',
  SET_TELA: 'SET_TELA',
  ADD_RECORD: 'ADD_RECORD',
  REMOVE_RECORD: 'REMOVE_RECORD',
  UPDATE_OS_STATUS: 'UPDATE_OS_STATUS',
  SET_MODAL: 'SET_MODAL',
  SET_LOADING: 'SET_LOADING',
  SET_SELECTED_OS: 'SET_SELECTED_OS',
  UPDATE_ATIVOS: 'UPDATE_ATIVOS' // <--- NOVO: Permite atualizar qualquer lista de ativos
};

function reducer(state: State, action: any) {
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
      const newDados = { ...state.dados, [modulo]: (state.dados[modulo] || []).filter((r:any) => r.id !== id) };
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
	case ACTIONS.UPDATE_ATIVOS: { // <--- NOVO: Atualiza a lista de ativos
      const { chave, novaLista } = action;
      return { ...state, ativos: { ...state.ativos, [chave]: novaLista, }};
    }
    default:
      return state;
  }
}

const AppContext = createContext<any>(null);

export const useAppContext = () => {
    const context = useContext(AppContext);
    if (!context) throw new Error("useAppContext must be used within AppProvider");
    return context;
};

export const AppProvider = ({ children }: { children: React.ReactNode }) => {
  const [state, dispatch] = useReducer(reducer, INITIAL);

  const setTela = (t: string) => dispatch({ type: ACTIONS.SET_TELA, tela: t });
  
  const parseNumber = useCallback((s: any) => parseFloat(s) || 0, []);

  const buscarUltimaLeitura = useCallback((modulo: string, filtroChave: string, filtroValor: string) => {
    const lista = state.dados[modulo] || [];
    const listaFiltrada = lista.filter((item:any) => filtroValor === '*' || item[filtroChave] === filtroValor).sort((a:any, b:any) => b.id - a.id);
    return listaFiltrada[0];
  }, [state.dados]);

  // NEW: Calculate Global Stock Status (for alert in PrincipalScreen)
  const estoqueCalculations = useMemo(() => {
    // NOTE: Hardcoded fallback values (3000 and 750) will be configurable in ConfiguracoesScreen
    const estoqueInicial = parseNumber(state.ativos.estoqueDiesel?.inicial || 3000); 
    const estoqueMinimo = parseNumber(state.ativos.estoqueDiesel?.minimo || 750);
    
    // Abastecimentos (Saídas) e Compras (Entradas)
    const totalComprado = (state.dados.compras || []).reduce((s:number, i:any) => s + parseNumber(i.litros), 0);
    const totalUsado = (state.dados.abastecimentos || []).reduce((s:number, i:any) => s + parseNumber(i.qtd), 0);
    
    const atual = (estoqueInicial + totalComprado - totalUsado);
    const critico = atual <= estoqueMinimo;

    return { estoqueAtual: atual, nivelCritico: critico, estoqueMinimo: estoqueMinimo };
  }, [state.dados.compras, state.dados.abastecimentos, state.ativos.estoqueDiesel, parseNumber]);

  useEffect(() => {
    dispatch({ type: ACTIONS.SET_LOADING, loading: true });
    setTimeout(() => {
      const salvo = localStorage.getItem('sistemaRural');
      if (salvo) {
        try {
          const parsed = JSON.parse(salvo);
          let loadedAtivos = parsed.ativos || ATIVOS_INICIAIS;
          loadedAtivos = { ...ATIVOS_INICIAIS, ...loadedAtivos };
          // Forçar atualização das listas de ativos caso o código mude
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

  useEffect(() => {
    if (!state.loading) localStorage.setItem('sistemaRural', JSON.stringify({ os: state.os, dados: state.dados, ativos: state.ativos }));
  }, [state.os, state.dados, state.ativos, state.loading]);

  const value = useMemo(() => ({ 
      ...state, 
      dispatch, 
      setTela, 
      buscarUltimaLeitura,
      ...estoqueCalculations // NEW: Expose stock status
  }), [state, dispatch, setTela, buscarUltimaLeitura, estoqueCalculations]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};