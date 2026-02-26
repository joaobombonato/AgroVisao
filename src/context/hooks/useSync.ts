/**
 * useSync - Hook para sincronização offline-first
 * 
 * Gerencia: Fila de sincronização e processamento em background
 */
import { useCallback, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { ACTIONS } from '../reducer';

interface UseSyncParams {
  fazendaId: string | null;
  state: any;
  dispatch: React.Dispatch<any>;
  isOnline: boolean;
}

export function useSync({ fazendaId, state, dispatch, isOnline }: UseSyncParams) {

  // Adicionar item à fila de sincronização
  const addToQueue = useCallback((item: any) => {
    dispatch({ type: ACTIONS.ADD_TO_QUEUE, payload: item });
  }, [dispatch]);

  // Processar fila quando voltar online
  const processQueue = useCallback(async () => {
    if (!isOnline || !fazendaId) return;
    
    const queue = state.syncQueue || [];
    if (queue.length === 0) return;


    for (const item of queue) {
      try {
        // Processa cada item baseado na ação
        if (item.action === 'INSERT') {
          await import('../../services').then(m => m.dbService.insert(item.table, item.payload));
        } else if (item.action === 'UPDATE') {
          await import('../../services').then(m => m.dbService.update(item.table, item.payload.id, item.payload, fazendaId));
        } else if (item.action === 'DELETE') {
          await import('../../services').then(m => m.dbService.delete(item.table, item.payload.id, fazendaId));
        }
        dispatch({ type: ACTIONS.REMOVE_FROM_QUEUE, id: item.id });
      } catch (e: any) {
        console.error(`[Sync] Erro ao processar item ${item.id}:`, e);
        // Lógica de segurança: Se o erro for irrecuperável (ex: violação de constraint, erro de sintaxe),
        // remove o item da fila para não travar a sincronização dos próximos.
        const isUnrecoverable = (e.code && (e.code.startsWith('22') || e.code.startsWith('P'))) || e.status === 400;
        if (isUnrecoverable) {
            dispatch({ type: ACTIONS.REMOVE_FROM_QUEUE, id: item.id });
            // Rollback: remove registro fantasma do state se era INSERT
            if (item.action === 'INSERT' && item.payload?.id) {
              dispatch({ type: ACTIONS.REMOVE_RECORD, modulo: item.table, id: item.payload.id });
            }
            toast.error(`Falha ao sincronizar ${item.table} (Erro fatal). Item removido.`);
        }
      }
    }

    const remaining = queue.length;
    if (remaining === 0) {
      toast.success('Sincronização concluída!', { id: 'sync-complete' });
    }
  }, [isOnline, fazendaId, state.syncQueue, dispatch]);

  // Efeito para processar fila quando voltar online
  useEffect(() => {
    if (isOnline && state.syncQueue?.length > 0) {
      const timer = setTimeout(processQueue, 2000);
      return () => clearTimeout(timer);
    }
  }, [isOnline, state.syncQueue?.length, processQueue]);

  return {
    addToQueue,
    processQueue,
    queueLength: state.syncQueue?.length || 0
  };
}
