import { Session } from '@supabase/supabase-js';
import { dbService, syncService } from '../services'; 
import { DADOS_INICIAIS, ATIVOS_INICIAIS } from '../data/constants';

// Tipos básicos
export type State = {
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
  syncQueue: any[];
};

export const INITIAL_STATE: State = {
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
  syncQueue: syncService.loadQueue(),
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
  ADD_TO_QUEUE: 'ADD_TO_QUEUE',
  REMOVE_FROM_QUEUE: 'REMOVE_FROM_QUEUE',
};

export function appReducer(state: State, action: any) {
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
    case ACTIONS.SET_DB_ASSETS: {
        let ativosKey = '';
        if (action.table === 'maquinas') ativosKey = 'maquinas';
        if (action.table === 'talhoes') ativosKey = 'talhoes';
        if (action.table === 'pessoas') ativosKey = 'pessoas';
        if (action.table === 'produtos') ativosKey = 'produtos';

        const newDbAssets = { ...state.dbAssets, [action.table]: action.records };
        const newAtivos = ativosKey 
            ? { ...state.ativos, [ativosKey]: action.records }
            : state.ativos;

        return { 
            ...state, 
            dbAssets: newDbAssets,
            ativos: newAtivos
        };
    }
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
      if (chave === 'SYNC_FULL') {
          // Restaura todos os ativos persistidos, mesclando com os atuais
          return { ...state, ativos: { ...state.ativos, ...novaLista }};
      }
      return { ...state, ativos: { ...state.ativos, [chave]: novaLista }};
    }
    case ACTIONS.ADD_TO_QUEUE:
        return { ...state, syncQueue: [...state.syncQueue, action.payload] };
    case ACTIONS.REMOVE_FROM_QUEUE:
        return { ...state, syncQueue: state.syncQueue.filter(i => i.id !== action.id) };
    
    default:
      return state;
  }
}
