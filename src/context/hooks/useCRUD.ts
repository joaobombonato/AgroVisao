/**
 * useCRUD - Hook para operações genéricas de banco de dados
 * 
 * Gerencia: fetch, save, update, delete com suporte offline-first
 */
import { useCallback } from 'react';
import { toast } from 'react-hot-toast';
import { dbService } from '../../services';
import { U } from '../../utils';
import { ACTIONS } from '../reducer';

interface UseCRUDParams {
  fazendaId: string | null;
  dispatch: React.Dispatch<any>;
  state: any;
  addToQueue: (item: any) => void;
}

export function useCRUD({ fazendaId, dispatch, state, addToQueue }: UseCRUDParams) {
  
  // ========================================================
  // FETCH (SELECT)
  // ========================================================
  const fetchRecords = useCallback(async (table: string) => {
    if (!fazendaId) return [];
    const { data, error } = await dbService.select(table, fazendaId);
    if (error) return [];
    dispatch({ type: ACTIONS.SET_DB_ASSETS, table, records: data || [] });
    return data || [];
  }, [fazendaId, dispatch]);

  const fetchDados = useCallback(async (table: string, modulo?: string) => {
    if (!fazendaId) return [];
    const targetModulo = modulo || table;
    const { data, error } = await dbService.select(table, fazendaId);
    if (error) return [];
    dispatch({ type: ACTIONS.SET_DADOS, modulo: targetModulo, records: data || [] });
    return data || [];
  }, [fazendaId, dispatch]);

  // ========================================================
  // SAVE (INSERT/UPSERT)
  // ========================================================
  const genericSave = useCallback(async (table: string, record: any, optimisticAction?: any) => {
    const isOff = !navigator.onLine;
    const tempid = record.id || U.id('temp-');
    const payload = { ...record, fazenda_id: fazendaId };

    // LÓGICA DE SEQUENCIAL PARA OS (Padrão: OS-YYYY-NNNN)
    if (table === 'os' && !payload.numero) {
      const ordens = (state.os || []);
      const currentYear = new Date().getFullYear();
      
      const maxNum = ordens.reduce((max: number, o: any) => {
        const match = String(o.numero || '').match(/(\d+)$/);
        const n = match ? parseInt(match[0]) : 0;
        return !isNaN(n) ? Math.max(max, n) : max;
      }, 0);

      const totalPadding = 4;
      const nextSeq = String(maxNum + 1).padStart(totalPadding, '0');
      payload.numero = `OS-${currentYear}-${nextSeq}`;

      if (payload.descricao?.includes('HISTÓRICO') || payload.descricao?.includes('CONFERÊNCIA') || payload.modulo === 'Seguro') {
        payload.numero = `AUT-${payload.numero}`;
      }
    }

    const recordWithId = { ...payload, id: tempid };

    // Limpeza de campos numéricos formatados PT-BR
    Object.keys(payload).forEach(key => {
      const val = payload[key];
      if (typeof val === 'string' && /^-?[\d.]+(,[\d]+)?$/.test(val)) {
        payload[key] = U.parseDecimal(val);
      }
    });

    if (record.id && !String(record.id).startsWith('temp-')) payload.id = record.id;
    if (optimisticAction) dispatch({ ...optimisticAction, record: recordWithId });

    if (!isOff && fazendaId) {
      try {
        const data = await dbService.insert(table, payload);
        if (data && data.id && optimisticAction) {
          dispatch({ ...optimisticAction, record: data, records: optimisticAction.records?.map((r: any) => (r.id === tempid) ? data : r) });
        }
        toast.success(`Salvo Cloud: ${table}`, { id: 'sync-toast' });
        return { success: true, online: true, data };
      } catch (e) { console.warn("Sync Insert Fail", e); }
    }
    // Se falhou online ou está offline, adiciona à fila (sem ID temporário)
    const queuePayload = { ...payload };
    if (queuePayload.id && String(queuePayload.id).startsWith('temp-')) {
      delete queuePayload.id; // Remove ID temporário para que o Supabase gere o UUID
    }
    addToQueue({ id: U.id('sync-ins-'), table, payload: queuePayload, action: 'INSERT', timestamp: Date.now() });
    toast.success('Salvo Local (Offline)');
    return { success: true, online: false, data: recordWithId };
  }, [fazendaId, addToQueue, state.os, dispatch]);

  // ========================================================
  // UPDATE
  // ========================================================
  const genericUpdate = useCallback(async (table: string, id: string, updates: any, optimisticAction?: any) => {
    const isOff = !navigator.onLine;
    if (optimisticAction) dispatch(optimisticAction);
    if (!isOff && fazendaId) {
      try {
        await dbService.update(table, id, updates, fazendaId);
        toast.success(`Atualizado Cloud: ${table}`, { id: 'sync-toast' });
        return { success: true, online: true };
      } catch (e) { console.warn("Sync Update Fail", e); }
    }
    addToQueue({ id: U.id('sync-upd-'), table, payload: { id, ...updates }, action: 'UPDATE', timestamp: Date.now() });
    toast.success('Atualizado Local (Offline)');
    return { success: true, online: false };
  }, [fazendaId, addToQueue, dispatch]);

  // ========================================================
  // DELETE
  // ========================================================
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
  }, [fazendaId, addToQueue, dispatch]);

  // Aliases simples
  const saveRecord = useCallback(async (table: string, record: any) => genericSave(table, record), [genericSave]);
  const deleteRecord = useCallback(async (table: string, id: string) => genericDelete(table, id), [genericDelete]);

  return {
    fetchRecords,
    fetchDados,
    genericSave,
    genericUpdate,
    genericDelete,
    saveRecord,
    deleteRecord
  };
}
