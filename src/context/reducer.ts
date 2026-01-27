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
  modal: { isOpen: boolean; type?: string; props?: any };
  selectedOS: any;
  session: Session | null;
  userProfile: any | null; 
  fazendaId: string | null; 
  fazendaNome: string | null;
  userRole: string | null;
  permissions: any;
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
  modal: { isOpen: false, type: '', props: {} },
  selectedOS: null,
  session: null, 
  userProfile: null,
  fazendaId: null,
  fazendaNome: 'Fazenda SC (Demo)',
  userRole: null,
  permissions: {},
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
  CLOSE_MODAL: 'CLOSE_MODAL',
  SET_LOADING: 'SET_LOADING',
  SET_SELECTED_OS: 'SET_SELECTED_OS',
  UPDATE_ATIVOS: 'UPDATE_ATIVOS',
  SET_AUTH: 'SET_AUTH',
  SET_FAZENDA: 'SET_FAZENDA',
  SET_DB_ASSETS: 'SET_DB_ASSETS',
  ADD_TO_QUEUE: 'ADD_TO_QUEUE',
  REMOVE_FROM_QUEUE: 'REMOVE_FROM_QUEUE',
  SET_FAZENDAS_DISPONIVEIS: 'SET_FAZENDAS_DISPONIVEIS',
  SET_PERMISSIONS: 'SET_PERMISSIONS',
  SET_DADOS: 'SET_DADOS',
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
            userRole: action.userRole || null,
            fazendasDisponiveis: action.fazendas || state.fazendasDisponiveis, 
            loading: false
        };
    case ACTIONS.SET_DB_ASSETS: {
        const { table, records } = action;
        const newDbAssets = { ...state.dbAssets, [table]: records };
        let newAtivos = { ...state.ativos };

        if (table === 'maquinas') newAtivos.maquinas = records;
        if (table === 'talhoes') newAtivos.talhoes = records;
        if (table === 'centros_custos') newAtivos.centrosCusto = records;
        if (table === 'produtos') newAtivos.produtos = records;
        if (table === 'safras') newAtivos.safras = records;
        if (table === 'culturas') newAtivos.culturas = records;
        if (table === 'tipos_refeicao') newAtivos.tiposRefeicao = records;
        if (table === 'classes_agronomicas') newAtivos.classes = records;
        if (table === 'tipos_documento') newAtivos.tiposDocumento = records;
        
        if (table === 'locais_monitoramento') {
            newAtivos.locais = records.filter((r: any) => r.tipo === 'chuva');
            newAtivos.pontosEnergia = records.filter((r: any) => r.tipo === 'energia');
        }

        return { 
            ...state, 
            dbAssets: newDbAssets,
            ativos: newAtivos
        };
    }
    case ACTIONS.SET_DADOS: {
        const { modulo, records } = action;
        if (modulo === 'os') return { ...state, os: records };
        return { 
            ...state, 
            dados: { ...state.dados, [modulo]: records } 
        };
    }
    case ACTIONS.SET_TELA:
      return { ...state, tela: action.tela };
    case ACTIONS.ADD_RECORD: {
      const { modulo, record, osDescricao, osDetalhes } = action;
      const newDados = { ...state.dados, [modulo]: [...(state.dados[modulo] || []), record] };
      
      return { ...state, dados: newDados };
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
    case ACTIONS.CLOSE_MODAL:
      return { ...state, modal: { isOpen: false, message: '', onConfirm: () => {} } };
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
    case ACTIONS.SET_FAZENDAS_DISPONIVEIS:
        return { ...state, fazendasDisponiveis: action.payload };
    case ACTIONS.SET_PERMISSIONS:
        return { ...state, permissions: action.payload };
    
    default:
      return state;
  }
}
