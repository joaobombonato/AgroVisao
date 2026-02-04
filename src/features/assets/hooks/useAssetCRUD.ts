/**
 * useAssetCRUD - Hook para operações CRUD genéricas de ativos
 * 
 * Extraído de AssetListEditor para melhor organização
 */
import { useCallback } from 'react';
import { toast } from 'react-hot-toast';
import { useAppContext, ACTIONS } from '../../../context/AppContext';
import { U } from '../../../utils';

interface UseAssetCRUDParams {
  table: string;
  label: string;
  type: 'simple' | 'complex';
  fields?: any[];
  listToRender: any[];
  list: any[];
  fazendaId: string;
  showPositioner?: boolean;
}

export function useAssetCRUD({
  table,
  label,
  type,
  fields = [],
  listToRender,
  list,
  fazendaId,
  showPositioner
}: UseAssetCRUDParams) {
  const { genericSave, genericUpdate, genericDelete, dbAssets, dados, dispatch } = useAppContext();

  /**
   * Valida duplicidade antes de salvar
   */
  const validateDuplicate = useCallback((fieldsToCheck: any, editingItem: any) => {
    // Verificar nome duplicado
    const jaExisteNome = listToRender.some((item: any) => {
      if (editingItem && item.id === editingItem.id) return false;
      const nomeIn = (item.nome || '').trim().toLowerCase();
      const nomeNew = (fieldsToCheck.nome || '').trim().toLowerCase();
      return nomeIn === nomeNew;
    });

    if (jaExisteNome) {
      toast.error(`Já existe um(a) ${label} com esse Código/Nome.`);
      return false;
    }

    // Verificar campos únicos para tipo complexo
    if (type === 'complex') {
      const uniqueKeys = ['chassis', 'renavam_serie', 'identificador_externo'];
      for (const key of uniqueKeys) {
        const val = fieldsToCheck[key];
        if (val && val.trim()) {
          const duplicado = listToRender.find((item: any) => {
            if (editingItem && item.id === editingItem.id) return false;
            return String(item[key] || '').trim().toLowerCase() === val.trim().toLowerCase();
          });
          if (duplicado) {
            toast.error(`ALERTA: Este ${key.toUpperCase()} já pertence ao item [${duplicado.nome}].`);
            return false;
          }
        }
      }
    }

    return true;
  }, [listToRender, label, type]);

  /**
   * Prepara o record para salvar, aplicando defaults e conversões
   */
  const prepareRecord = useCallback((newItemName: string, newItemFields: any) => {
    let newRecord: any = {};

    if (type === 'simple') {
      if (!newItemName.trim()) return null;
      newRecord = { nome: newItemName.trim() };
    } else if (type === 'complex') {
      const requiredFields = fields.filter((f: any) => f.required);
      if (requiredFields.some((f: any) => !String(newItemFields[f.key] || '').trim())) {
        toast.error(`Preencha todos os campos obrigatórios (*) do(a) ${label}.`);
        return null;
      }
      newRecord = { ...newItemFields };
      
      // Aplicar defaults e converter valores numéricos
      fields.forEach((f: any) => {
        if (f.default !== undefined && (newRecord[f.key] === undefined || newRecord[f.key] === '')) {
          newRecord[f.key] = f.default;
        }
        const val = newRecord[f.key];
        const isNumericField = f.mask === 'currency' || f.mask === 'decimal' || f.mask === 'metric' || f.mask === 'percentage' || f.type === 'number' || f.numeric;
        if (val !== undefined && val !== null && val !== '' && isNumericField) {
          newRecord[f.key] = U.parseDecimal(val);
        }
      });
    }

    return newRecord;
  }, [type, fields, label]);

  /**
   * Salva novo registro
   */
  const saveNewRecord = useCallback(async (newRecord: any) => {
    const tempId = U.id('temp-asset-');
    const recordWithId = { ...newRecord, id: tempId, fazenda_id: fazendaId };
    
    if (showPositioner) {
      recordWithId.posicao = listToRender.length + 1;
      newRecord.posicao = listToRender.length + 1;
    }

    await genericSave(table, newRecord, {
      type: ACTIONS.SET_DB_ASSETS,
      table: table,
      records: [...list, recordWithId],
    });
  }, [table, fazendaId, showPositioner, listToRender, list, genericSave]);

  /**
   * Atualiza registro existente
   */
  const updateRecord = useCallback(async (editingItem: any, newRecord: any, assetKey: string) => {
    const updatedList = list.map((i: any) => i.id === editingItem.id ? { ...i, ...newRecord } : i);
    
    // Lógica especial para quitação de máquina
    if (assetKey === 'maquinas' && editingItem.situacao_financeira === 'Alienado' && newRecord.situacao_financeira === 'Quitado') {
      const historyOS = {
        titulo: "HISTÓRICO: Quitação / Liquidação de Alienação",
        descricao: `Máquina quitada em ${U.formatDate(new Date().toISOString())}. Dados da alienação arquivados no histórico.`,
        modulo: 'Financeiro',
        status: 'Concluída',
        maquina_id: editingItem.id,
        data_abertura: new Date().toISOString().split('T')[0],
        detalhes: {
          "Banco Anterior": editingItem.banco_alienacao || '-',
          "Contrato": editingItem.numero_contrato || '-',
          "Previsão Final": U.formatDate(editingItem.data_final_alienacao)
        }
      };
      await genericSave('os', historyOS);
      toast.success("Histórico de quitação registrado!");
    }

    await genericUpdate(table, editingItem.id, newRecord, {
      type: ACTIONS.SET_DB_ASSETS,
      table: table,
      records: updatedList
    });
  }, [table, list, genericSave, genericUpdate]);

  /**
   * Verifica integridade referencial antes de excluir
   */
  const checkIntegrity = useCallback((item: any, assetKey: string) => {
    const itemId = item.id;
    const itemNome = type === 'simple' ? item : item.nome;
    
    if (assetKey === 'culturas') {
      if ((dbAssets.talhoes || []).some((t: any) => t.cultura === itemNome)) {
        toast.error(`Em uso em Talhões.`);
        return false;
      }
      if ((dados.plantios || []).some((p: any) => p.cultura === itemNome)) {
        toast.error(`Em uso em Plantios.`);
        return false;
      }
    }
    
    if (assetKey === 'maquinas') {
      if ((dados.abastecimentos || []).some((a: any) => a.maquina === itemNome)) {
        toast.error(`Possui abastecimentos.`);
        return false;
      }
      if ((dados.manutencoes || []).some((m: any) => m.maquinaId === itemId)) {
        toast.error(`Possui manutenções.`);
        return false;
      }
    }
    
    return true;
  }, [type, dbAssets, dados]);

  /**
   * Confirma exclusão de item
   */
  const confirmDelete = useCallback(async (itemToDelete: any) => {
    if (!itemToDelete) return;
    const idToDelete = itemToDelete.id;
    const newList = list.filter((i: any) => i.id !== idToDelete);
    await genericDelete(table, idToDelete, { type: ACTIONS.SET_DB_ASSETS, table: table, records: newList });
  }, [table, list, genericDelete]);

  /**
   * Move item na lista (para ordenação)
   */
  const handleMove = useCallback(async (item: any, direction: 'up' | 'down') => {
    const currentIndex = listToRender.findIndex((i: any) => i.id === item.id);
    const swapIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;

    if (swapIndex < 0 || swapIndex >= listToRender.length) return;

    const otherItem = listToRender[swapIndex];
    const currentPos = item.posicao || (currentIndex + 1);
    const otherPos = otherItem.posicao || (swapIndex + 1);

    await genericUpdate(table, item.id, { posicao: otherPos });
    await genericUpdate(table, otherItem.id, { posicao: currentPos });

    const updatedList = list.map((i: any) => {
      if (i.id === item.id) return { ...i, posicao: otherPos };
      if (i.id === otherItem.id) return { ...i, posicao: currentPos };
      return i;
    });

    dispatch({ type: ACTIONS.SET_DB_ASSETS, table: table, records: updatedList });
    toast.success("Ordem atualizada!", { id: 'order-toast' });
  }, [table, listToRender, list, genericUpdate, dispatch]);

  /**
   * Obtém sugestões para autocomplete
   */
  const getSuggestions = useCallback((fieldKey: string) => {
    if (!listToRender.length) return [];
    const values = listToRender
      .map((item: any) => item[fieldKey])
      .filter((v: any) => v && typeof v === 'string' && v.trim().length > 1);
    return Array.from(new Set(values));
  }, [listToRender]);

  return {
    validateDuplicate,
    prepareRecord,
    saveNewRecord,
    updateRecord,
    checkIntegrity,
    confirmDelete,
    handleMove,
    getSuggestions
  };
}
