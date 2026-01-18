import React, { createContext, useContext, useReducer, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../supabaseClient';
import { toast } from 'react-hot-toast';
import { U } from '../data/utils'; 
import { dbService, syncService, authService } from '../services'; 
import { appReducer, INITIAL_STATE, ACTIONS } from './reducer';
import { ATIVOS_INICIAIS } from '../data/constants';

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
  
  const setTela = (t: string) => dispatch({ type: ACTIONS.SET_TELA, tela: t });
  
  // FUNÇÃO UTILITÁRIA: parseNumber
  const parseNumber = useCallback((s: any) => {
      if (U && U.parseDecimal) return U.parseDecimal(s);
      if (typeof s === 'number') return s;
      if (!s) return 0;
      const clean = String(s).replace(/[^\d.,-]/g, '').replace(',', '.');
      return parseFloat(clean) || 0;
  }, []);

  // FUNÇÃO UTILITÁRIA: buscarUltimaLeitura
  const buscarUltimaLeitura = useCallback((modulo: string, filtroChave: string, filtroValor: string) => {
    const lista = state.dados[modulo] || [];
    const listaFiltrada = lista.filter((item:any) => filtroValor === '*' || item[filtroChave] === filtroValor).sort((a:any, b:any) => b.id - a.id);
    return listaFiltrada[0];
  }, [state.dados]);

  // FUNÇÃO UTILITÁRIA: estoqueCalculations
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
    
    const { data, error } = await dbService.select(table, fazendaId); 

    if (error) {
        toast.error(`Erro ao carregar ${table}: ${error.message}`);
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
    // Reutiliza o Generic Save para manter o padrão offline first
    return genericSave(table, record);
  }, [fazendaId]); // Dependência circular com genericSave? Não se genericSave for definido antes ou usamos ref.

  const deleteRecord = useCallback(async (table: string, id: string) => {
    if (!fazendaId) return false;
    // Reutiliza o Generic Delete
    return genericDelete(table, id);
  }, [fazendaId]);


  // ========================================================
  // OFFLINE-FIRST: SYNC QUEUE SYSTEM
  // ========================================================
  
  const addToQueue = useCallback((item: any) => {
      dispatch({ type: ACTIONS.ADD_TO_QUEUE, payload: item });
  }, []);

  // GENERIC SAVE (INSERT)
  const genericSave = useCallback(async (table: string, record: any, optimisticAction?: any) => {
      const isOffline = !navigator.onLine;
      const tempid = record.id || U.id('temp-');
      const recordWithId = { ...record, id: tempid, fazenda_id: fazendaId };
      const payloadToSend = { ...recordWithId };

      if (optimisticAction) {
          dispatch({ ...optimisticAction, record: recordWithId });
      }

      // Online
      if (!isOffline && fazendaId) {
          try {
              const data = await dbService.insert(table, payloadToSend);
              toast.success(`Salvo: ${table}`);
              return { success: true, online: true, data };
          } catch (error) {
              console.warn("Falha online (INSERT), indo para fila...", error);
          }
      }

      // Offline / Falha
      addToQueue({
          id: U.id('sync-ins-'),
          table,
          payload: payloadToSend,
          action: 'INSERT',
          timestamp: Date.now()
      });
      toast.success('Salvo no dispositivo (Offline)');
      return { success: true, online: false, data: recordWithId };
  }, [fazendaId, addToQueue]);

  // GENERIC UPDATE
  const genericUpdate = useCallback(async (table: string, id: string, updates: any, optimisticAction?: any) => {
      const isOffline = !navigator.onLine;

      if (optimisticAction) dispatch(optimisticAction);

      if (!isOffline && fazendaId) {
          try {
              await dbService.update(table, id, updates, fazendaId);
              toast.success(`Atualizado: ${table}`);
              return { success: true, online: true };
          } catch (error) {
              console.warn("Falha online (UPDATE), indo para fila...", error);
          }
      }

      addToQueue({
          id: U.id('sync-upd-'),
          table,
          payload: { id, ...updates },
          action: 'UPDATE',
          timestamp: Date.now()
      });
      toast.success('Atualizado no dispositivo (Offline)');
      return { success: true, online: false };
  }, [fazendaId, addToQueue]);

  // GENERIC DELETE
  const genericDelete = useCallback(async (table: string, id: string, optimisticAction?: any) => {
      const isOffline = !navigator.onLine;

      if (optimisticAction) dispatch(optimisticAction);

      if (!isOffline && fazendaId) {
          try {
              await dbService.delete(table, id, fazendaId);
              toast.success(`Excluído: ${table}`);
              return { success: true, online: true };
          } catch (error) {
              console.warn("Falha online (DELETE), indo para fila...", error);
          }
      }

      addToQueue({
          id: U.id('sync-del-'),
          table,
          payload: { id },
          action: 'DELETE',
          timestamp: Date.now()
      });
      toast.success('Excluído no dispositivo (Offline)');
      return { success: true, online: false };
  }, [fazendaId, addToQueue]);


  // ========================================================
  // EFEITOS DE CARREGAMENTO
  // ========================================================
  
  // EFEITO 1: GERENCIAMENTO DE SESSÃO E AUTH
  useEffect(() => {
    // Carregar parâmetros locais salvos
    const savedParams = localStorage.getItem('agrodev_params');
    if (savedParams) {
        try {
            const parsed = JSON.parse(savedParams);
            // Mescla com estado inicial para garantir estrutura
            dispatch({ type: ACTIONS.UPDATE_ATIVOS, chave: 'SYNC_FULL', novaLista: { ...state.ativos, ...parsed } });
        } catch (e) {
            console.error("Erro ao carregar params locais", e);
        }
    }

    const subscription = authService.onAuthStateChange((session, user) => {
        // Atualiza se houve mudança OU se ainda está carregando (inicialização)
        if (state.loading || state.session?.user?.id !== user?.id) { 
             dispatch({ type: ACTIONS.SET_AUTH, session, profile: user });
             dispatch({ type: ACTIONS.SET_LOADING, loading: false });
        }
    });

    return () => {
        if (subscription && typeof subscription.unsubscribe === 'function') subscription.unsubscribe();
    };
  }, []); 

  // FUNÇÃO DE PERSISTÊNCIA CENTRALIZADA DE ATIVOS (LOCAL + REMOTE)
  const saveAtivos = useCallback(async (novosAtivos: any) => {
      // 1. Atualiza Estado React
      // Se novosAtivos for parcial, teríamos que mesclar. Assumindo que quem chama passa o objeto completo ou usamos chave?
      // Melhor manter a assinatura do dispatch: (chave, valor)
      // Mas para salvar TUDO, precisamos do estado atual.
      // Vamos simplificar: saveAtivos(chave, valor)
      
      // Implementação: wrapper sobre o dispatch que também persiste
      // Mas o dispatch é assíncrono/redutor.
      // Solução: Observar 'state.ativos' no useEffect (como já estava) e disparar o save remoto lá.
      
      // MANTENDO A ESTRATÉGIA DO EFFECT 1.5 MAS MELHORADA
      localStorage.setItem('agrodev_params', JSON.stringify(novosAtivos));
      
      // Tentar salvar no banco se tiver fazenda (Coluna 'config' ou 'ativos' na tabela Fazendas seria o ideal)
      // Como não temos certeza do schema, salvamos apenas no localStorage por garantia,
      // e tentamos update na tabela 'fazendas' se o campo 'config' existir (ignora erro se não existir)
      if (fazendaId) {
          try {
             // Tenta salvar configurações globais da fazenda
             // Isso garante que F5 ou outro dispositivo pegue as configs
             await dbService.update('fazendas', fazendaId, { config: novosAtivos }, fazendaId);
          } catch (e) {
              console.warn("Não foi possível salvar config no banco (provavelmente campo não existe)", e);
          }
      }
  }, [fazendaId]);

  // EFEITO 1.5: SALVAR PARÂMETROS QUANDO MUDAR - AGORA COM DEBOUNCE E REMOTE
  useEffect(() => {
      const handler = setTimeout(() => {
         if (state.ativos && Object.keys(state.ativos).length > 0) {
             localStorage.setItem('agrodev_params', JSON.stringify(state.ativos));
             
             // Opcional: Salvar no banco com debounce maior? POr enquanto só local storage instantâneo (delay 1s)
         }
      }, 1000);
      return () => clearTimeout(handler);
  }, [state.ativos]);
  
  // Função explícita para forçar salvamento (usada ao reordenar menus ou excluir itens)
  const updateAtivos = useCallback((chave: string, valor: any) => {
      dispatch({ type: ACTIONS.UPDATE_ATIVOS, chave, novaLista: valor });
      // O useEffect vai pegar a mudança e salvar no localStorage
      // Se quisermos salvar no banco imediatamente:
      // const stateAtualizado = { ...state.ativos, [chave]: valor };
      // saveAtivos(stateAtualizado);
  }, [saveAtivos, state.ativos]); 

  // EFEITO 2: CARREGAMENTO DE FAZENDA
  useEffect(() => {
    const loadFazenda = async () => {
        if (state.session?.user?.id && !fazendaId) {
            const fazendas = await authService.fetchFazendaMembros(state.session.user.id);
            
            if (fazendas && fazendas.length > 0) {
                const fazendaAtiva = fazendas[0];
                dispatch({ 
                    type: ACTIONS.SET_FAZENDA, 
                    fazendaId: fazendaAtiva.id, 
                    fazendaNome: fazendaAtiva.nome,
                    fazendas: fazendas
                });
                toast.success(`Fazenda selecionada: ${fazendaAtiva.nome}!`, { id: 'fazenda-login', duration: 3000 });
            } else {
                toast.error('Nenhuma fazenda encontrada. Contate o suporte.', { duration: 6000 });
                dispatch({ type: ACTIONS.SET_LOADING, loading: false });
            }
        }
    };
    loadFazenda();
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

  // EFEITO 4: Persistência Automática da Fila
  useEffect(() => {
    syncService.saveQueue(state.syncQueue);
  }, [state.syncQueue]);

  // EFEITO 5: Processador de Fila (Sync Robot)
  useEffect(() => {
      const processQueue = async () => {
          if (!navigator.onLine || state.syncQueue.length === 0 || !fazendaId) return;

          const item = state.syncQueue[0];
          console.log(`Syncing ${item.action} on ${item.table}...`);

          try {
              if (item.action === 'INSERT') {
                   await dbService.insert(item.table, item.payload);
              } 
              else if (item.action === 'UPDATE') {
                   const { id, ...updates } = item.payload;
                   await dbService.update(item.table, id, updates, fazendaId);
              }
              else if (item.action === 'DELETE') {
                   await dbService.delete(item.table, item.payload.id, fazendaId);
              }

              toast.success(`Sincronizado: ${item.action} ${item.table}`, { id: 'sync-ok' });
              dispatch({ type: ACTIONS.REMOVE_FROM_QUEUE, id: item.id });

          } catch (error: any) {
              console.error("Erro Sync:", error);
              dispatch({ type: ACTIONS.REMOVE_FROM_QUEUE, id: item.id });
              toast.error(`Falha ao sincronizar item (removido da fila).`);
          }
      };

      const interval = setInterval(processQueue, 3000); // 3s polling
      return () => clearInterval(interval);
  }, [state.syncQueue, fazendaId]);


  const logout = () => authService.logout();

  const value = useMemo(() => ({ 
      ...state, 
      dispatch, 
      setTela, 
      buscarUltimaLeitura,
      logout,
      fetchRecords,
      saveRecord,
      deleteRecord,
      genericSave, 
      genericUpdate, 
      genericDelete, 
      updateAtivos, // Novo método
      ...estoqueCalculations 
  }), [state, dispatch, setTela, buscarUltimaLeitura, estoqueCalculations, fetchRecords, saveRecord, deleteRecord, logout, genericSave, genericUpdate, genericDelete, updateAtivos]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};