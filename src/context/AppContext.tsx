/**
 * ============================================================
 * AppContext - Contexto Principal do VisãoAgro (LIMPO)
 * ============================================================
 * 
 * ARQUITETURA:
 * A lógica foi extraída para hooks em src/context/hooks/:
 * - useCRUD: Operações de banco de dados offline-first
 * - useAlerts: Sistema de alertas automatizados
 * - useAppUtils: Funções utilitárias
 * - useSession: Gerenciamento de sessão
 * 
 * Este arquivo apenas ORQUESTRA os hooks.
 * ============================================================
 */

import React, { createContext, useContext, useReducer, useCallback, useMemo, useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { toast } from 'react-hot-toast';
import { dbService } from '../services';
import { ACTIONS, appReducer, INITIAL_STATE } from './reducer';

// Hooks extraídos
import { useCRUD } from './hooks/useCRUD';
import { useAlerts } from './hooks/useAlerts';
import { useAppUtils } from './hooks/useAppUtils';
import { useSession } from './hooks/useSession';
import { useSync } from './hooks/useSync';

// Re-exporta ACTIONS para uso nos componentes
export { ACTIONS };

const AppContext = createContext<any>(null);

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error("useAppContext must be used within AppProvider");
  return context;
};

export const AppProvider = ({ children }: { children: React.ReactNode }) => {
  const [state, dispatch] = useReducer(appReducer, INITIAL_STATE);
  const { fazendaId } = state;
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [fazendaSelecionada, setFazendaSelecionada] = useState<any>(null);
  const [tela, setTela] = useState('loading');

  // ========================================================
  // QUEUE (necessário para useCRUD)
  // ========================================================
  const addToQueue = useCallback((item: any) => dispatch({ type: ACTIONS.ADD_TO_QUEUE, payload: item }), []);

  // ========================================================
  // HOOKS
  // ========================================================
  const { parseNumber, buscarUltimaLeitura, estoqueCalculations } = useAppUtils({ state });
  
  const { ensureMembroOwner, checkSession, logout, trocarFazenda } = useSession({ 
    dispatch, 
    setTela, 
    setFazendaSelecionada 
  });

  const { 
    fetchRecords, 
    fetchDados, 
    genericSave, 
    genericUpdate, 
    genericDelete, 
    saveRecord, 
    deleteRecord 
  } = useCRUD({ 
    fazendaId, 
    dispatch, 
    state, 
    addToQueue 
  });

  const { runAllAlerts } = useAlerts({ 
    fazendaId, 
    state, 
    genericSave, 
    estoqueCalculations 
  });

  // ========================================================
  // SYNC (Offline-First)
  // ========================================================
  useSync({ 
    fazendaId, 
    state, 
    dispatch, 
    isOnline 
  });

  // ========================================================
  // UPDATE OS STATUS (regra de negócio específica)
  // ========================================================
  const updateOsStatus = useCallback(async (id: string, status: string) => {
    dispatch({ type: ACTIONS.UPDATE_OS_STATUS, id, status });
    await genericUpdate('os', id, { status });

    // Regra: Quando quitação é confirmada, atualiza máquina
    if (status === 'Confirmado') {
      const ordens = state.os || [];
      const osToUpdate = ordens.find((o: any) => o.id === id);
      
      if (osToUpdate?.modulo === 'Financeiro' && osToUpdate.descricao?.includes('QUITAÇÃO') && osToUpdate.maquina_id) {
        const maquinas = state.dbAssets.maquinas || [];
        const maq = maquinas.find((m: any) => m.id === osToUpdate.maquina_id);
        
        if (maq) {
          const updates = { situacao_financeira: 'Financiado (liquidado)' };
          await genericUpdate('maquinas', maq.id, updates);
          const updatedMaqs = maquinas.map((m: any) => m.id === maq.id ? { ...m, ...updates } : m);
          dispatch({ type: ACTIONS.SET_DB_ASSETS, table: 'maquinas', records: updatedMaqs });
          toast.success(`🚜 ${maq.nome} foi atualizada para LIQUIDADA!`, { icon: '💰', duration: 5000 });
        }
      }
    }
  }, [state.os, state.dbAssets.maquinas, genericUpdate]);

  // ========================================================
  // ATIVOS & CONFIGURAÇÕES
  // ========================================================
  const saveAtivos = useCallback(async (novosAtivos: any) => {
    localStorage.setItem('agrodev_params', JSON.stringify(novosAtivos));
  }, []);

  const updateAtivos = useCallback((chave: string, valor: any) => {
    dispatch({ type: ACTIONS.UPDATE_ATIVOS, chave, novaLista: valor });
  }, []);

  // ========================================================
  // EFEITOS (WATCHERS)
  // ========================================================
  
  // Alertas automáticos (usa hook)
  useEffect(() => {
    const h = setTimeout(runAllAlerts, 12000);
    return () => clearTimeout(h);
  }, [runAllAlerts]);

  // Auth listener
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) dispatch({ type: ACTIONS.SET_AUTH, session, profile: session.user });
      checkSession(session);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((ev, sess) => {
      if (ev === 'SIGNED_OUT') { setTela('auth'); setFazendaSelecionada(null); localStorage.removeItem('last_fazenda_id'); }
      else if (ev === 'SIGNED_IN') { dispatch({ type: ACTIONS.SET_AUTH, session: sess, profile: sess?.user }); checkSession(sess); }
    });
    return () => subscription.unsubscribe();
  }, [checkSession]);

  // Carregar dados ao selecionar fazenda
  useEffect(() => {
    if (!fazendaId) return;
    const assets = ['maquinas','talhoes','estacoes_chuva','pontos_energia','centros_custos','produtos','safras','culturas','tipos_refeicao','classes_agronomicas','tipos_documento', 'colaboradores', 'fazenda_membros', 'setores', 'produtos_manutencao', 'operacoes_agricolas'];
    assets.forEach(t => fetchRecords(t));
    const data = ['abastecimentos','compras','chuvas','energia','recomendacoes','refeicoes','os'];
    data.forEach(t => fetchDados(t));
    fetchDados('documents', 'documentos');
  }, [fazendaId, fetchRecords, fetchDados]);

  // Salvar configs com debounce
  useEffect(() => {
    const h = setTimeout(() => { if (state.ativos && Object.keys(state.ativos).length > 0) saveAtivos(state.ativos); }, 2000);
    return () => clearTimeout(h);
  }, [state.ativos, saveAtivos]);



  // Monitor de internet
  useEffect(() => {
    const h = () => setIsOnline(navigator.onLine);
    window.addEventListener('online', h); window.addEventListener('offline', h);
    return () => { window.removeEventListener('online', h); window.removeEventListener('offline', h); };
  }, []);



  // ========================================================
  // EXPORTAÇÃO DO CONTEXTO
  // ========================================================
  const value = useMemo(() => ({
    state, dispatch,
    dados: state.dados, ativos: state.ativos, dbAssets: state.dbAssets, os: state.os,
    session: state.session, userProfile: state.userProfile,
    fazendaId: state.fazendaId, fazendaNome: state.fazendaNome, userRole: state.userRole,
    permissions: state.permissions, fazendasDisponiveis: state.fazendasDisponiveis, syncQueue: state.syncQueue,
    modal: state.modal, selectedOS: state.selectedOS,
    saveRecord, genericSave, genericDelete, genericUpdate, fetchRecords, fetchDados, deleteRecord, updateOsStatus,
    isOnline, logout, trocarFazenda, tela, setTela, buscarUltimaLeitura, updateAtivos, fazendaSelecionada, setFazendaSelecionada,
    ...estoqueCalculations, parseNumber, ensureMembroOwner
  }), [state, isOnline, estoqueCalculations, buscarUltimaLeitura, updateAtivos, fazendaId, fazendaSelecionada, tela, logout, trocarFazenda, saveRecord, genericSave, genericDelete, genericUpdate, fetchRecords, fetchDados, deleteRecord, parseNumber, ensureMembroOwner, updateOsStatus]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};
