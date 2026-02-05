import { useState } from 'react';
import { toast } from 'react-hot-toast';
import { useAppContext, ACTIONS } from '../../../context/AppContext';
import { U } from '../../../utils';

interface UseAssetEditorOptions {
    assetKey: string;
    table: string;
    type: 'simple' | 'complex';
    label: string;
    fields: any[];
    orderBy?: string;
    showPositioner?: boolean;
}

export function useAssetEditor({ assetKey, table, type, label, fields, orderBy, showPositioner }: UseAssetEditorOptions) {
    const { dbAssets, dispatch, genericSave, genericUpdate, genericDelete, dados, fazendaId } = useAppContext();
    
    const [activeTab, setActiveTab] = useState<'cadastro' | 'lista'>('cadastro');
    const [showMap, setShowMap] = useState(false);
    const [newItemName, setNewItemName] = useState('');
    const [newItemFields, setNewItemFields] = useState<any>({});
    const [openSections, setOpenSections] = useState<{[key: string]: boolean}>({});
    const [editingItem, setEditingItem] = useState<any>(null);
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [isWizardOpen, setIsWizardOpen] = useState(false);
    const [formTab, setFormTab] = useState<'dados' | 'historico'>('dados');
    const [itemToDelete, setItemToDelete] = useState<any>(null);

    const list = dbAssets[table] || [];

    const listToRender = list.filter((item: any) => {
        if (table === 'locais_monitoramento') {
            const targetType = assetKey === 'locaisChuva' ? 'chuva' : 'energia';
            return item.tipo === targetType;
        }
        return true;
    }).sort((a: any, b: any) => {
        if (orderBy === 'posicao') {
            const posA = a.posicao || 0;
            const posB = b.posicao || 0;
            return posA - posB;
        }
        return 0;
    });

    const toggleSection = (key: string) => {
        setOpenSections(prev => ({ ...prev, [key]: !prev[key] }));
    };

    const checkIntegrity = (item: any) => {
        const itemId = item.id;
        const itemNome = type === 'simple' ? item : item.nome;
        if (assetKey === 'culturas') {
            if ((dbAssets.talhoes || []).some((t: any) => t.cultura === itemNome)) { toast.error(`Em uso em Talhões.`); return false; }
            if ((dados.plantios || []).some((p: any) => p.cultura === itemNome)) { toast.error(`Em uso em Plantios.`); return false; }
        }
        if (assetKey === 'maquinas') {
             if ((dados.abastecimentos || []).some((a: any) => a.maquina === itemNome)) { toast.error(`Possui abastecimentos.`); return false; }
             if ((dados.manutencoes || []).some((m: any) => m.maquinaId === itemId)) { toast.error(`Possui manutenções.`); return false; }
        }
        return true;
    };

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        
        // --- VERIFICAÇÃO DE DUPLICIDADE AVANÇADA ---
        const fieldsToCheck = type === 'complex' ? newItemFields : { nome: newItemName };
        const jaExisteNome = listToRender.some((item: any) => {
            if (editingItem && item.id === editingItem.id) return false;
            const nomeIn = (item.nome || '').trim().toLowerCase();
            const nomeNew = (fieldsToCheck.nome || '').trim().toLowerCase();
            return nomeIn === nomeNew;
        });

        if (jaExisteNome) {
            toast.error(`Já existe um(a) ${label} com esse Código/Nome.`);
            return;
        }

        // Check Unique Fields (Chassis / Serial)
        if (type === 'complex') {
            const uniqueKeys = ['chassis', 'renavam_serie', 'identificador_externo'];
            for (const key of uniqueKeys) {
                const val = newItemFields[key];
                if (val && val.trim()) {
                    const duplicado = listToRender.find((item: any) => {
                        if (editingItem && item.id === editingItem.id) return false;
                        return String(item[key] || '').trim().toLowerCase() === val.trim().toLowerCase();
                    });
                    if (duplicado) {
                        toast.error(`ALERTA: Este ${key.toUpperCase()} já pertence ao item [${duplicado.nome}].`);
                        return;
                    }
                }
            }
        }
        // ----------------------------------

        let newRecord: any = {};

        if (type === 'simple') {
            if (!newItemName.trim()) return;
            newRecord = { nome: newItemName.trim() };
        } else if (type === 'complex') {
            const requiredFields = fields.filter((f: any) => f.required);
            if (requiredFields.some((f: any) => !String(newItemFields[f.key] || '').trim())) {
                toast.error(`Preencha todos os campos obrigatórios (*) do(a) ${label}.`);
                return;
            }
            newRecord = { ...newItemFields };
            fields.forEach((f: any) => {
                if (f.default !== undefined && (newRecord[f.key] === undefined || newRecord[f.key] === '')) {
                    newRecord[f.key] = f.default;
                }

                // Converte campos numéricos formatados para o formato esperado pelo banco (decimal/numeric)
                const val = newRecord[f.key];
                const isNumericField = f.mask === 'currency' || f.mask === 'decimal' || f.mask === 'metric' || f.mask === 'percentage' || f.type === 'number' || f.numeric;
                
                if (val !== undefined && val !== null && val !== '' && isNumericField) {
                    newRecord[f.key] = U.parseDecimal(val);
                }
            });
        }

        if (editingItem) {
            // Lógica de ATUALIZAÇÃO
            const updatedList = list.map((i: any) => i.id === editingItem.id ? { ...i, ...newRecord } : i);
            
            // Inteligência: Se mudou de Alienado para Quitado, gera histórico financeiro
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
            setEditingItem(null);
        } else {
            // Lógica de INSERÇÃO
            const tempId = U.id('temp-asset-');
            const recordWithId = { ...newRecord, id: tempId, fazenda_id: fazendaId };
            
            // Se tiver ordenação, define a posição como o final da lista
            if (showPositioner) {
                recordWithId.posicao = listToRender.length + 1;
                newRecord.posicao = listToRender.length + 1;
            }

            await genericSave(table, newRecord, {
                type: ACTIONS.SET_DB_ASSETS,
                table: table, 
                records: [...list, recordWithId], 
            });
        }

        setNewItemName('');
        setNewItemFields({});
        setOpenSections({});
        setActiveTab('lista');
    };

    const startEdit = (item: any) => {
        setEditingItem(item);
        if (type === 'simple') {
            setNewItemName(item.nome || item);
        } else {
            // Converte os dados do banco (puros) de volta para o formato de máscara (visual)
            const formattedFields = { ...item };
            fields.forEach((f: any) => {
                const val = item[f.key];
                if (val !== undefined && val !== null) {
                    if (f.type === 'date') {
                        // Mantém ISO para input type date
                    } else if (f.mask === 'currency' || f.mask === 'decimal' || f.mask === 'metric' || f.mask === 'percentage') {
                        formattedFields[f.key] = U.formatValue(val);
                    }
                }
            });

            // Normalização agressiva para Situação Financeira
            if (formattedFields.situacao_financeira) {
                const s = String(formattedFields.situacao_financeira).toLowerCase();
                if (s.includes('liquidado')) formattedFields.situacao_financeira = 'Financiado (liquidado)';
                else if (s.includes('alienado')) formattedFields.situacao_financeira = 'Alienado';
                else if (s.includes('quitado')) formattedFields.situacao_financeira = 'Quitado';
            }

            setNewItemFields(formattedFields);
            
            // Abre todas as seções que contenham dados preenchidos ou obrigatórias
            const sectionsToOpen: any = {};
            fields.filter((f: any) => f.isHeader).forEach((h: any) => {
                sectionsToOpen[h.key] = true;
            });
            setOpenSections(sectionsToOpen);
        }
        setActiveTab('cadastro');
    };

    const handleDelete = async (item: any) => {
        if (!checkIntegrity(item)) return;
        setItemToDelete(item);
    };

    const confirmDelete = async () => {
        if (!itemToDelete) return;
        const idToDelete = itemToDelete.id;
        const newList = list.filter((i:any) => i.id !== idToDelete);
        await genericDelete(table, idToDelete, { type: ACTIONS.SET_DB_ASSETS, table: table, records: newList });
        setItemToDelete(null);
    };

    const handleMove = async (item: any, direction: 'up' | 'down') => {
        const currentIndex = listToRender.findIndex((i: any) => i.id === item.id);
        const swapIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;

        if (swapIndex < 0 || swapIndex >= listToRender.length) return;

        const otherItem = listToRender[swapIndex];
        const currentPos = item.posicao || (currentIndex + 1);
        const otherPos = otherItem.posicao || (swapIndex + 1);

        // Troca as posições
        await genericUpdate(table, item.id, { posicao: otherPos });
        await genericUpdate(table, otherItem.id, { posicao: currentPos });

        // Atualiza estado local
        const updatedList = list.map((i: any) => {
            if (i.id === item.id) return { ...i, posicao: otherPos };
            if (i.id === otherItem.id) return { ...i, posicao: currentPos };
            return i;
        });

        dispatch({ type: ACTIONS.SET_DB_ASSETS, table: table, records: updatedList });
        toast.success("Ordem atualizada!", { id: 'order-toast' });
    };

    const toggleSelect = (id: string) => {
        setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    };

    const toggleSelectAll = () => {
        if (selectedIds.length === listToRender.length) {
            setSelectedIds([]);
        } else {
            setSelectedIds(listToRender.map((i: any) => i.id));
        }
    };

    // Função para pegar sugestões de campos já preenchidos (Autocomplete)
    const getSuggestions = (fieldKey: string) => {
        if (!listToRender.length) return [];
        const values = listToRender
            .map((item: any) => item[fieldKey])
            .filter((v: any) => v && typeof v === 'string' && v.trim().length > 1);
        return Array.from(new Set(values)); // Remove duplicatas
    };

    const cancelEdit = () => {
        setEditingItem(null);
        setNewItemName('');
        setNewItemFields({});
        setActiveTab('lista');
    };

    return {
        // Estados
        activeTab,
        setActiveTab,
        showMap,
        setShowMap,
        newItemName,
        setNewItemName,
        newItemFields,
        setNewItemFields,
        openSections,
        editingItem,
        selectedIds,
        isWizardOpen,
        setIsWizardOpen,
        formTab,
        setFormTab,
        itemToDelete,
        setItemToDelete,
        listToRender,
        dbAssets,
        
        // Handlers
        handleAdd,
        startEdit,
        handleDelete,
        confirmDelete,
        handleMove,
        toggleSelect,
        toggleSelectAll,
        toggleSection,
        getSuggestions,
        cancelEdit,
    };
}
