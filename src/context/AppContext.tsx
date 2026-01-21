import React, { createContext, useContext, useReducer, useEffect, useCallback, useMemo, useState } from 'react';
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

  // EFEITO 2: Removido (Lógica consolidada no checkSession abaixo)


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




    // Estado para controlar a navegação "fora" das rotas principais (ex: Seleção de Fazenda)
    const [tela, setTela] = useState('loading'); // 'loading', 'auth', 'fazenda_selection', 'create_fazenda', 'dashboard'
    const [fazendaSelecionada, setFazendaSelecionada] = useState<any>(null);
    const [isOnline, setIsOnline] = useState(navigator.onLine);

    useEffect(() => {
        const handleStatusChange = () => {
            setIsOnline(navigator.onLine);
        };
        window.addEventListener('online', handleStatusChange);
        window.addEventListener('offline', handleStatusChange);
        return () => {
            window.removeEventListener('online', handleStatusChange);
            window.removeEventListener('offline', handleStatusChange);
        };
    }, []);

    // Efeito para checar sessão e fazenda salva
    useEffect(() => {
        const checkSession = async (session: any) => {
            if (!session) {
                setTela('auth');
                return;
            }

            // Se o usuário acabou de logar e estamos na tela de auth ou loading, precisamos decidir pra onde ir
            // Verificamos se já existe uma fazenda no state ou storage
            if (!session?.user?.id) {
                setTela('auth');
                return;
            }

            const lastFazendaId = localStorage.getItem('last_fazenda_id');
            
            if (lastFazendaId) {
                 const { data, error } = await supabase.from('fazendas').select('*').eq('id', lastFazendaId).single();
                 if (data && !error) {
                     setFazendaSelecionada(data);
                     dispatch({ 
                        type: ACTIONS.SET_FAZENDA, 
                        fazendaId: data.id, 
                        fazendaNome: data.nome 
                     });
                     setTela('principal'); 
                     return;
                 }
            }

            // Se não tem fazenda salva, vai para tela de seleção
            setTela('fazenda_selection');
            dispatch({ type: ACTIONS.SET_LOADING, loading: false });
        };

        // Check inicial
        supabase.auth.getSession().then(({ data: { session } }) => {
            checkSession(session);
        });

        // Listener de Mudanças
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            if (event === 'SIGNED_OUT' || !session) {
                setTela('auth');
                setFazendaSelecionada(null);
                localStorage.removeItem('last_fazenda_id');
                // Limpa dados sensíveis do estado se necessário
            } else if (event === 'SIGNED_IN') {
                 // Login aconteceu. Verificar fazenda.
                 checkSession(session);
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    // Atualiza o Título do Navegador dinamicamente
    useEffect(() => {
        if (fazendaSelecionada?.nome) {
            document.title = `${fazendaSelecionada.nome} | AgroVisão`;
        } else {
            document.title = 'AgroVisão - Gestão Rural Inteligente';
        }
        
        // Se tiver favicon customizado, poderíamos atualizar aqui também, mas é mais complexo.
        // Por enquanto, ficamos com o título.
    }, [fazendaSelecionada]);

    const logout = async () => {
        await supabase.auth.signOut();
        setTela('auth');
        setFazendaSelecionada(null);
        localStorage.removeItem('last_fazenda_id');
    };

    const trocarFazenda = () => {
        setFazendaSelecionada(null);
        localStorage.removeItem('last_fazenda_id');
        setTela('fazenda_selection');
    };

    const value = useMemo(() => ({
        state,
        dispatch,
        saveRecord,
        genericSave,
        genericDelete,
        genericUpdate,
        fetchRecords,
        deleteRecord,
        syncQueue: state.syncQueue,
        isOnline, 
        updateAtivos,
        ...estoqueCalculations,
        // Novos exports
        session: state.session,
        tela,
        setTela,
        fazendaSelecionada,
        setFazendaSelecionada,
        logout,
        trocarFazenda,
        modal: state.modal,
        os: state.os,
        dados: state.dados,
        ativos: state.ativos,
        dbAssets: state.dbAssets,
        buscarUltimaLeitura,
        parseNumber
    }), [
        state, 
        dispatch, 
        tela, 
        fazendaSelecionada, 
        saveRecord, 
        genericSave, 
        genericDelete, 
        genericUpdate,
        fetchRecords,
        deleteRecord, 
        estoqueCalculations,
        isOnline,
        buscarUltimaLeitura,
        parseNumber,
        trocarFazenda
    ]);

    return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};