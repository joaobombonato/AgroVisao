import React, { createContext, useContext, useReducer, useCallback, useMemo, useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { toast } from 'react-hot-toast';
import { U } from '../data/utils'; 
import { dbService, syncService, authService } from '../services'; 
import { ACTIONS, appReducer, INITIAL_STATE } from './reducer';
import { ATIVOS_INICIAIS, DEFAULT_PERMISSIONS } from '../data/constants';

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
  // 1. FUNÇÕES UTILITÁRIAS
  // ========================================================
  const parseNumber = useCallback((s: any) => {
      if (U && U.parseDecimal) return U.parseDecimal(s);
      if (typeof s === 'number') return s;
      if (!s) return 0;
      const clean = String(s).replace(/[^\d.,-]/g, '').replace(',', '.');
      return parseFloat(clean) || 0;
  }, []);

  const buscarUltimaLeitura = useCallback((modulo: string, filtroChave: string, filtroValor: string) => {
    const lista = state.dados[modulo] || [];
    const listaFiltrada = lista.filter((item:any) => filtroValor === '*' || item[filtroChave] === filtroValor).sort((a:any, b:any) => b.id - a.id);
    if (listaFiltrada[0]) return listaFiltrada[0];
    if ((modulo === 'abastecimentos' || modulo === 'manutencoes') && filtroChave === 'maquina') {
        const maq = (state.dbAssets.maquinas || []).find((m: any) => m.nome === filtroValor);
        if (maq && maq.horimetro_inicial) return { horimetroAtual: maq.horimetro_inicial, bombaFinal: '0' };
    }
    return null;
  }, [state.dados, state.dbAssets.maquinas]);

  const estoqueCalculations = useMemo(() => {
    const params = state.ativos.parametros?.estoque || ATIVOS_INICIAIS.parametros.estoque;
    const capacidade = parseNumber(params.capacidadeTanque);
    const minimo = parseNumber(params.estoqueMinimo);
    const ajuste = parseNumber(params.ajusteManual);
    const totalComprado = (state.dados.compras || []).reduce((s:number, i:any) => s + parseNumber(i.litros), 0);
    const totalUsado = (state.dados.abastecimentos || []).reduce((s:number, i:any) => s + parseNumber(i.qtd), 0);
    const atual = (totalComprado - totalUsado) + ajuste;
    return { 
        estoqueAtual: atual, nivelCritico: atual <= minimo, estoqueMinimo: minimo,
        capacidadeTanque: capacidade, percentual: capacidade > 0 ? ((atual / capacidade) * 100).toFixed(1) : "0"
    };
  }, [state.dados.compras, state.dados.abastecimentos, state.ativos.parametros, parseNumber]);

  // ========================================================
  // 2. SISTEMA DE BANCO DE DADOS (SELECT/FETCH)
  // ========================================================
  const fetchRecords = useCallback(async (table: string) => {
    if (!fazendaId) return [];
    const { data, error } = await dbService.select(table, fazendaId); 
    if (error) return [];
    dispatch({ type: ACTIONS.SET_DB_ASSETS, table, records: data || [] });
    return data || [];
  }, [fazendaId]); 

  const fetchDados = useCallback(async (table: string, modulo?: string) => {
    if (!fazendaId) return [];
    const targetModulo = modulo || table;
    const { data, error } = await dbService.select(table, fazendaId); 
    if (error) return [];
    dispatch({ type: ACTIONS.SET_DADOS, modulo: targetModulo, records: data || [] });
    return data || [];
  }, [fazendaId]);

  // ========================================================
  // 3. SISTEMA OFFLINE-FIRST (GENERIC CRUD)
  // ========================================================
  const addToQueue = useCallback((item: any) => dispatch({ type: ACTIONS.ADD_TO_QUEUE, payload: item }), []);

  const genericSave = useCallback(async (table: string, record: any, optimisticAction?: any) => {
      const isOff = !navigator.onLine;
      const tempid = record.id || U.id('temp-');
      const recordWithId = { ...record, id: tempid, fazenda_id: fazendaId };
      const payload = { ...record, fazenda_id: fazendaId };
      if (record.id && !String(record.id).startsWith('temp-')) payload.id = record.id;
      if (optimisticAction) dispatch({ ...optimisticAction, record: recordWithId });

      if (!isOff && fazendaId) {
          try {
              const data = await dbService.insert(table, payload);
              if (data && data.id && optimisticAction) {
                  dispatch({ ...optimisticAction, record: data, records: optimisticAction.records?.map((r: any) => (r.id === tempid) ? data : r) });
              }
              toast.success(`Salvo Cloud: ${table}`);
              return { success: true, online: true, data };
          } catch (e) { console.warn("Sync Insert Fail", e); }
      }
      addToQueue({ id: U.id('sync-ins-'), table, payload, action: 'INSERT', timestamp: Date.now() });
      toast.success('Salvo Local (Offline)');
      return { success: true, online: false, data: recordWithId };
  }, [fazendaId, addToQueue]);

  const genericUpdate = useCallback(async (table: string, id: string, updates: any, optimisticAction?: any) => {
      const isOff = !navigator.onLine;
      if (optimisticAction) dispatch(optimisticAction);
      if (!isOff && fazendaId) {
          try {
              await dbService.update(table, id, updates, fazendaId);
              toast.success(`Atualizado Cloud: ${table}`);
              return { success: true, online: true };
          } catch (e) { console.warn("Sync Update Fail", e); }
      }
      addToQueue({ id: U.id('sync-upd-'), table, payload: { id, ...updates }, action: 'UPDATE', timestamp: Date.now() });
      toast.success('Atualizado Local (Offline)');
      return { success: true, online: false };
  }, [fazendaId, addToQueue]);

  const genericDelete = useCallback(async (table: string, id: string, optimisticAction?: any) => {
      const isOff = !navigator.onLine;
      if (optimisticAction) dispatch(optimisticAction);
      if (!isOff && fazendaId) {
          try {
              await dbService.delete(table, id, fazendaId);
              toast.success(`Excluído Cloud: ${table}`);
              return { success: true, online: true };
          } catch (e) { console.warn("Sync Delete Fail", e); }
      }
      addToQueue({ id: U.id('sync-del-'), table, payload: { id }, action: 'DELETE', timestamp: Date.now() });
      toast.success('Excluído Local (Offline)');
      return { success: true, online: false };
  }, [fazendaId, addToQueue]);

  const saveRecord = useCallback(async (table: string, record: any) => genericSave(table, record), [genericSave]);
  const deleteRecord = useCallback(async (table: string, id: string) => genericDelete(table, id), [genericDelete]);

  // ========================================================
  // 4. ATIVOS & CONFIGURAÇÕES
  // ========================================================
  const saveAtivos = useCallback(async (novosAtivos: any) => {
      localStorage.setItem('agrodev_params', JSON.stringify(novosAtivos));
      if (fazendaId) {
          try { await dbService.update('fazendas', fazendaId, { config: novosAtivos }, fazendaId); } 
          catch (e) { console.warn("Ativos Sync Fail", e); }
      }
  }, [fazendaId]);

  const updateAtivos = useCallback((chave: string, valor: any) => {
      dispatch({ type: ACTIONS.UPDATE_ATIVOS, chave, novaLista: valor });
  }, []);

  // ========================================================
  // 5. GESTÃO DE SESSÃO E PERMISSÕES
  // ========================================================
  const ensureMembroOwner = useCallback(async (fid: string, user: any) => {
      if (!fid || !user?.id) return;
      try {
          const { data } = await supabase.from('fazenda_membros').select('id').eq('fazenda_id', fid).eq('user_id', user.id).maybeSingle();
          if (!data) await supabase.from('fazenda_membros').insert([{ fazenda_id: fid, user_id: user.id, role: 'Proprietário' }]);
      } catch (e) {}
  }, []);

  const checkSession = useCallback(async (session: any) => {
      // Pega a tela atual pelo localStorage ou mantém o estado se possível
      // No React, para acessar o valor atual de 'tela' dentro de um callback estável, 
      // podemos usar uma abordagem de "só redirecionar se estiver em telas de transição"
      
      if (!session?.user?.id) { 
          setTela('auth'); 
          dispatch({ type: ACTIONS.SET_LOADING, loading: false });
          return; 
      }
      
      const lastId = localStorage.getItem('last_fazenda_id');
      if (lastId) {
          const { data, error } = await supabase.from('fazendas').select('*').eq('id', lastId).single();
          if (data && !error) {
              const { data: mb } = await supabase.from('fazenda_membros').select('role').eq('fazenda_id', lastId).eq('user_id', session.user.id).maybeSingle();
              setFazendaSelecionada(data);
              
              const custom = data.config?.permissions || {};
              const merged = JSON.parse(JSON.stringify(DEFAULT_PERMISSIONS));
              Object.keys(custom).forEach(role => {
                  if (merged[role]) {
                      merged[role].screens = { ...merged[role].screens, ...custom[role].screens };
                      merged[role].actions = { ...merged[role].actions, ...custom[role].actions };
                  }
              });

              dispatch({ type: ACTIONS.SET_PERMISSIONS, payload: merged });
              dispatch({ type: ACTIONS.SET_FAZENDA, fazendaId: data.id, fazendaNome: data.nome, userRole: mb?.role || 'Proprietário' });
              if (data.user_id === session.user.id) ensureMembroOwner(data.id, session.user);
              
              // 🛡️ SÓ REDIRECIONA SE ESTIVER NO LOADING/AUTH/SELECTION
              setTela(prev => (prev === 'loading' || prev === 'auth' || prev === 'fazenda_selection') ? 'principal' : prev);
              dispatch({ type: ACTIONS.SET_LOADING, loading: false });
              return;
          }
      }

      // Fluxo de seleção se não houver fazenda anterior
      const { data: own } = await supabase.from('fazendas').select('*').eq('user_id', session.user.id);
      const { data: pt } = await supabase.from('fazenda_membros').select('fazenda_id, fazendas(*)').eq('user_id', session.user.id);
      const all = [...(own || [])];
      (pt || []).forEach((p:any) => { if (p.fazendas && !all.find(f => f.id === p.fazendas.id)) all.push(p.fazendas); });
      
      dispatch({ type: ACTIONS.SET_FAZENDAS_DISPONIVEIS, payload: all });
      
      if (all.length === 1) {
          const f = all[0];
          const { data: mb } = await supabase.from('fazenda_membros').select('role').eq('fazenda_id', f.id).eq('user_id', session.user.id).maybeSingle();
          setFazendaSelecionada(f);
          dispatch({ type: ACTIONS.SET_FAZENDA, fazendaId: f.id, fazendaNome: f.nome, userRole: mb?.role || 'Proprietário' });
          localStorage.setItem('last_fazenda_id', f.id);
          
          // 🛡️ SÓ REDIRECIONA SE ESTIVER NO LOADING/AUTH/SELECTION
          setTela(prev => (prev === 'loading' || prev === 'auth' || prev === 'fazenda_selection') ? 'principal' : prev);
      } else {
          setTela('fazenda_selection');
      }
      dispatch({ type: ACTIONS.SET_LOADING, loading: false });
  }, [ensureMembroOwner]);

  // ========================================================
  // 6. EFEITOS (WATCHERS)
  // ========================================================
  useEffect(() => {
      supabase.auth.getSession().then(({ data: { session } }) => {
          if (session) dispatch({ type: ACTIONS.SET_AUTH, session, profile: session.user });
          checkSession(session);
      });
      const { data: { subscription } } = supabase.auth.onAuthStateChange((ev, sess) => {
          if (ev === 'SIGNED_OUT') { setTela('auth'); setFazendaSelecionada(null); localStorage.removeItem('last_fazenda_id'); }
          else if (ev === 'SIGNED_IN') {
              dispatch({ type: ACTIONS.SET_AUTH, session: sess, profile: sess?.user });
              checkSession(sess);
          }
      });
      return () => subscription.unsubscribe();
  }, [checkSession]);

  // CARREGAR TUDO AO SELECIONAR FAZENDA
  useEffect(() => {
    if (!fazendaId) return;
    // Ativos
    const assets = ['maquinas','talhoes','locais_monitoramento','centros_custos','produtos','safras','culturas','tipos_refeicao','classes_agronomicas','tipos_documento'];
    assets.forEach(t => fetchRecords(t));
    // Dados
    const data = ['abastecimentos','compras','chuvas','energia','recomendacoes','refeicoes','os'];
    data.forEach(t => fetchDados(t));
    fetchDados('documents', 'documentos');
  }, [fazendaId, fetchRecords, fetchDados]);

  // SALVAR CONFIGS COM DEBOUNCE (Evita muitas gravações)
  useEffect(() => {
      const h = setTimeout(() => { if (state.ativos && Object.keys(state.ativos).length > 0) saveAtivos(state.ativos); }, 2000);
      return () => clearTimeout(h);
  }, [state.ativos, saveAtivos]);

  // ROBÔ DE SINCRONIZAÇÃO (OFFLINE -> CLOUD)
  useEffect(() => {
      const proc = async () => {
          if (!navigator.onLine || state.syncQueue.length === 0 || !fazendaId) return;
          const item = state.syncQueue[0];
          try {
              if (item.action === 'INSERT') await dbService.insert(item.table, item.payload);
              else if (item.action === 'UPDATE') await dbService.update(item.table, item.payload.id, item.payload, fazendaId);
              else if (item.action === 'DELETE') await dbService.delete(item.table, item.payload.id, fazendaId);
              dispatch({ type: ACTIONS.REMOVE_FROM_QUEUE, id: item.id });
              toast.success(`Sincronizado: ${item.table}`, { id: 'sync-ok' });
          } catch (e) { 
              console.error("Sync Error:", e);
              dispatch({ type: ACTIONS.REMOVE_FROM_QUEUE, id: item.id }); 
          }
      };
      const i = setInterval(proc, 5000);
      return () => clearInterval(i);
  }, [state.syncQueue, fazendaId]);

  // MONITORAR STATUS DA INTERNET
  useEffect(() => {
      const h = () => setIsOnline(navigator.onLine);
      window.addEventListener('online', h); window.addEventListener('offline', h);
      return () => { window.removeEventListener('online', h); window.removeEventListener('offline', h); };
  }, []);

  // ALERTAS DE SEGURO (MERCADO)
  useEffect(() => {
    if (!fazendaId || state.loading) return;
    const maquinas = (state.dbAssets.maquinas || []);
    const ordens = (state.os || []);
    const hoje = new Date();
    const limiteAlerta = new Date();
    limiteAlerta.setDate(hoje.getDate() + 30);

    maquinas.forEach((m: any) => {
        if (m.vencimento_seguro) {
            const dataVenc = new Date(m.vencimento_seguro);
            if (dataVenc <= limiteAlerta) {
                const descAlerta = `RENOVAÇÃO DE SEGURO - ${m.nome}`;
                if (!ordens.some((o: any) => o.descricao === descAlerta && o.status === 'Pendente')) {
                    genericSave('os', {
                        id: U.id('OS-SEG-'),
                        modulo: 'Seguro',
                        descricao: descAlerta,
                        detalhes: { "Máquina": m.nome, "Vencimento": U.formatDate(m.vencimento_seguro) },
                        status: 'Pendente',
                        data: hoje.toISOString()
                    });
                }
            }
        }
    });
  }, [state.dbAssets.maquinas, fazendaId, state.os.length, genericSave]);

  const logout = async () => { await supabase.auth.signOut(); };
  const trocarFazenda = () => { localStorage.removeItem('last_fazenda_id'); setFazendaSelecionada(null); setTela('fazenda_selection'); };

  // ========================================================
  // 7. EXPORTAÇÃO DO CONTEXTO (VALUE)
  // ========================================================
  const value = useMemo(() => ({
    // Estado completo
    state, dispatch, 
    // Dados explicitos (para compatibilidade com componentes antigos)
    dados: state.dados,
    ativos: state.ativos,
    dbAssets: state.dbAssets,
    os: state.os,
    session: state.session,
    userProfile: state.userProfile,
    fazendaId: state.fazendaId,
    fazendaNome: state.fazendaNome,
    userRole: state.userRole,
    permissions: state.permissions,
    fazendasDisponiveis: state.fazendasDisponiveis,
    syncQueue: state.syncQueue,
    // Funções e UI
    modal: state.modal,
    selectedOS: state.selectedOS,
    saveRecord, genericSave, genericDelete, genericUpdate, fetchRecords, fetchDados, deleteRecord,
    isOnline, logout, trocarFazenda, tela, setTela, buscarUltimaLeitura, updateAtivos, fazendaSelecionada,
    // Cálculos
    ...estoqueCalculations,
    parseNumber,
    ensureMembroOwner
  }), [state, isOnline, estoqueCalculations, buscarUltimaLeitura, updateAtivos, fazendaId, fazendaSelecionada, tela, logout, trocarFazenda, saveRecord, genericSave, genericDelete, genericUpdate, fetchRecords, fetchDados, deleteRecord, parseNumber, ensureMembroOwner]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};