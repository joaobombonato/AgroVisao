import React, { createContext, useContext, useReducer, useEffect, useCallback, useMemo } from 'react';
import { DADOS_INICIAIS, ATIVOS_INICIAIS } from '../data/constants';
import { supabase } from '../supabaseClient';
import { toast } from 'react-hot-toast';
import { Session } from '@supabase/supabase-js';
import { U } from '../data/utils'; // Assumindo que você tem o utils.ts

// Tipos básicos
type State = {
  tela: string;
  os: any[];
  dados: any;
  ativos: any;
  loading: boolean;
  modal: { isOpen: boolean; message: string; onConfirm: () => void };
  selectedOS: any;
  session: Session | null;
  userProfile: any | null; 
  fazendaId: string | null; 
  fazendaNome: string | null;
  fazendasDisponiveis: any[];
  dbAssets: { [key: string]: any[] }; 
};

const INITIAL: State = {
  tela: 'principal',
  os: [],
  dados: DADOS_INICIAIS,
  ativos: ATIVOS_INICIAIS,
  loading: true,
  modal: { isOpen: false, message: '', onConfirm: () => {} },
  selectedOS: null,
  session: null, 
  userProfile: null,
  fazendaId: null,
  fazendaNome: 'Fazenda SC (Demo)',
  fazendasDisponiveis: [],
  dbAssets: {},
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
  UPDATE_ATIVOS: 'UPDATE_ATIVOS',
  SET_AUTH: 'SET_AUTH',
  SET_FAZENDA: 'SET_FAZENDA',
  SET_DB_ASSETS: 'SET_DB_ASSETS', 
};

function reducer(state: State, action: any) {
  switch (action.type) {
    case ACTIONS.LOAD:
      return { ...state, ...action.payload, loading: false };
    case ACTIONS.SET_AUTH:
        if (action.session) {
            return { 
                ...state, 
                session: action.session, 
                userProfile: action.profile, 
                loading: true, 
                fazendaId: null
            };
        }
        return { ...state, session: null, userProfile: null, loading: false, fazendaId: null, fazendaNome: 'Fazenda SC (Demo)' };
        
    case ACTIONS.SET_FAZENDA:
        return { 
            ...state, 
            fazendaId: action.fazendaId, 
            fazendaNome: action.fazendaNome,
            fazendasDisponiveis: action.fazendas, 
            loading: false
        };
    case ACTIONS.SET_DB_ASSETS:
        return { 
            ...state, 
            dbAssets: { ...state.dbAssets, [action.table]: action.records } 
        };
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
    case ACTIONS.UPDATE_ATIVOS: { 
      const { chave, novaLista } = action;
      return { ...state, ativos: { ...state.ativos, [chave]: novaLista }};
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

// ========================================================
// FUNÇÃO CORE: Busca os dados de Perfil e Fazenda
// ========================================================
const fetchFazendaData = async (userId: string, dispatch: React.Dispatch<any>) => {
    await new Promise(resolve => setTimeout(resolve, 100)); 
    
    const { data: membros, error: membrosError } = await supabase
        .from('fazenda_membros')
        .select(`fazenda_id, role, fazendas (nome)`)
        .eq('user_id', userId);
        
    if (membrosError || !membros || membros.length === 0) {
        toast.error('Nenhuma fazenda encontrada. Contate o suporte.', { duration: 6000 });
        console.error("Erro ao buscar membros:", membrosError);
        dispatch({ type: ACTIONS.SET_LOADING, loading: false });
        return;
    }

    const fazendas = membros.map(m => ({
        id: m.fazenda_id,
        nome: (m.fazendas as any)?.nome || 'Fazenda Desconhecida',
        role: m.role
    }));
    
    const fazendaAtiva = fazendas[0];

    dispatch({ 
        type: ACTIONS.SET_FAZENDA, 
        fazendaId: fazendaAtiva.id, 
        fazendaNome: fazendaAtiva.nome,
        fazendas: fazendas
    });

    toast.success(`Fazenda selecionada: ${fazendaAtiva.nome}!`, { duration: 3000 });
}
// ========================================================


export const AppProvider = ({ children }: { children: React.ReactNode }) => {
  const [state, dispatch] = useReducer(reducer, INITIAL);
  const { fazendaId } = state; 
  
  const setTela = (t: string) => dispatch({ type: ACTIONS.SET_TELA, tela: t });
  
  // FUNÇÃO UTILITÁRIA CORRIGIDA: parseNumber (assume U.parseDecimal do utils.ts)
  const parseNumber = useCallback((s: any) => {
      // Usando o helper do utils.ts para garantir a conversão correta
      if (U && U.parseDecimal) return U.parseDecimal(s);

      if (typeof s === 'number') return s;
      if (!s) return 0;
      const clean = String(s).replace(/[^\d.,-]/g, '').replace(',', '.');
      return parseFloat(clean) || 0;
  }, []);

  // FUNÇÃO UTILITÁRIA CORRIGIDA: buscarUltimaLeitura
  const buscarUltimaLeitura = useCallback((modulo: string, filtroChave: string, filtroValor: string) => {
    const lista = state.dados[modulo] || [];
    const listaFiltrada = lista.filter((item:any) => filtroValor === '*' || item[filtroChave] === filtroValor).sort((a:any, b:any) => b.id - a.id);
    return listaFiltrada[0];
  }, [state.dados]);

  // FUNÇÃO UTILITÁRIA CORRIGIDA: estoqueCalculations
  const estoqueCalculations = useMemo(() => {
    const params = state.ativos.parametros?.estoque || ATIVOS_INICIAIS.parametros.estoque;
    
    const capacidade = parseNumber(params.capacidadeTanque);
    const minimo = parseNumber(params.estoqueMinimo);
    const ajuste = parseNumber(params.ajusteManual);

    const totalComprado = (state.dados.compras || []).reduce((s:number, i:any) => s + parseNumber(i.litros), 0);
    const totalUsado = (state.dados.abastecimentos || []).reduce((s:number, i:any) => s + parseNumber(i.qtd), 0);
    
    const atual = (totalComprado - totalUsado) + ajuste;
    
    const percentual = capacidade > 0 ? (atual / capacidade) * 100 : 0;
    const critico = atual <= minimo;

    return { 
        estoqueAtual: atual, 
        nivelCritico: critico, 
        estoqueMinimo: minimo,
        capacidadeTanque: capacidade,
        percentual: percentual.toFixed(1)
    };
  }, [state.dados.compras, state.dados.abastecimentos, state.ativos.parametros, parseNumber]);

  // ========================================================
  // FUNÇÕES UNIVERSAIS DE CRUD
  // ========================================================
  const fetchRecords = useCallback(async (table: string) => {
    if (!fazendaId) return [];
    
    const { data, error } = await supabase
      .from(table)
      .select('*')
      .eq('fazenda_id', fazendaId) 
      .order('nome', { ascending: true }); 

    if (error) {
      if (error.code === '42501') { 
        console.error(`RLS bloqueou a leitura de ${table}. Políticas de acesso incorretas.`);
      } else {
        toast.error(`Erro ao carregar ${table}: ${error.message}`);
      }
      return [];
    }
    
    dispatch({ type: ACTIONS.SET_DB_ASSETS, table, records: data });
    return data;
  }, [fazendaId]); 

  const saveRecord = useCallback(async (table: string, record: any) => {
    if (!fazendaId) {
        toast.error('Nenhuma fazenda ativa. Impossível salvar.');
        return false;
    }
    
    const dataToSave = { 
        ...record, 
        fazenda_id: fazendaId,
        ...(record.id ? { updated_at: new Date().toISOString() } : { created_at: new Date().toISOString() })
    };

    let query: any = supabase.from(table);
    
    if (record.id) {
        query = query.update(dataToSave).eq('id', record.id).select().single();
    } else {
        query = query.insert(dataToSave).select().single();
    }

    const { data, error } = await query;
    
    if (error) {
        toast.error(`Erro ao salvar em ${table}: ${error.message}`);
        console.error(error);
        return false;
    }

    toast.success(`Registro salvo com sucesso em ${table}!`);
    fetchRecords(table);
    return data;
  }, [fazendaId, fetchRecords]);

  const deleteRecord = useCallback(async (table: string, id: string) => {
    if (!fazendaId) return false;
    
    const { error } = await supabase
        .from(table)
        .delete()
        .eq('id', id)
        .eq('fazenda_id', fazendaId);

    if (error) {
        toast.error(`Erro ao excluir em ${table}: ${error.message}`);
        console.error(error);
        return false;
    }

    toast.success(`Registro excluído com sucesso em ${table}!`);
    fetchRecords(table);
    return true;
  }, [fazendaId, fetchRecords]);


  // ========================================================
  // EFEITOS DE CARREGAMENTO (Ordem corrigida)
  // ========================================================
  useEffect(() => {
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
        const isNewSession = session && state.session?.user?.id !== session.user.id;
        const isLogout = event === 'SIGNED_OUT';
        
        if (isNewSession || isLogout) {
             dispatch({ type: ACTIONS.SET_AUTH, session, profile: session?.user || null });
        }
    });
    
    supabase.auth.getSession().then(({ data: { session } }) => {
        if (session && !state.session) {
             dispatch({ type: ACTIONS.SET_AUTH, session, profile: session.user });
        } else if (!session && state.loading) {
             dispatch({ type: ACTIONS.SET_LOADING, loading: false });
        }
    });

    return () => {
        listener.subscription.unsubscribe();
    };
  }, [state.session]); 

  // EFEITO 2: CARREGAMENTO DE FAZENDA 
  useEffect(() => {
    if (state.session?.user?.id && !fazendaId) {
        fetchFazendaData(state.session.user.id, dispatch);
    }
  }, [state.session, fazendaId]);


  // EFEITO 3: CARREGAMENTO DE ATIVOS 
  useEffect(() => {
    if (fazendaId) {
        fetchRecords('maquinas');
        fetchRecords('talhoes');
        fetchRecords('locais_monitoramento');
        fetchRecords('pessoas');
        fetchRecords('produtos');
    }
  }, [fazendaId, fetchRecords]); 


  // EFEITO 4: Lógica de carregamento de localStorage (Apenas para modo Demo)
  useEffect(() => {
    if (!state.session && state.loading) {
        const salvo = localStorage.getItem('sistemaRural');
        if (salvo) {
            try {
                const parsed = JSON.parse(salvo);
                let loadedAtivos = parsed.ativos || ATIVOS_INICIAIS;
                const mergedAtivos = { ...ATIVOS_INICIAIS, ...loadedAtivos, parametros: { ...ATIVOS_INICIAIS.parametros, ...(loadedAtivos.parametros || {}) } };
                dispatch({ type: ACTIONS.LOAD, payload: { os: parsed.os || [], dados: parsed.dados || DADOS_INICIAIS, ativos: mergedAtivos, loading: false } });
            } catch (e) { 
                dispatch({ type: ACTIONS.LOAD, payload: { ...INITIAL, loading: false, session: null } }); 
            }
        } else {
            dispatch({ type: ACTIONS.LOAD, payload: { ...INITIAL, loading: false, session: null } });
        }
    }
  }, [state.session, state.loading]); 

  // Salvamento Automático (AGORA SOMENTE NO MODO OFFLINE/DEMO)
  useEffect(() => { 
    if (!state.loading && !state.session) { 
        localStorage.setItem('sistemaRural', JSON.stringify({ os: state.os, dados: state.dados, ativos: state.ativos }));
    }
  }, [state.os, state.dados, state.ativos, state.loading, state.session]);

  // CORREÇÃO DO LOGOUT: Garante o reset local
  const logout = async () => {
    const { error } = await supabase.auth.signOut(); 
    
    if (error) {
        toast.error('Erro de conexão ao sair. Fazendo logoff local forçado.', { duration: 3000 });
        console.error("Erro ao sair:", error);
    }
    
    localStorage.clear();
    window.location.reload(); 
  };


  const value = useMemo(() => ({ 
      ...state, 
      dispatch, 
      setTela, 
      buscarUltimaLeitura,
      logout,
      fetchRecords,
      saveRecord,
      deleteRecord,
      ...estoqueCalculations 
  }), [state, dispatch, setTela, buscarUltimaLeitura, estoqueCalculations, fetchRecords, saveRecord, deleteRecord, logout]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};