import React, { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { PageHeader, Input } from '../../../components/ui/Shared';
import { useAppContext, ACTIONS } from '../../../context/AppContext';
import { U } from '../../../data/utils';
import { ASSET_DEFINITIONS } from '../../../data/assets';

// ===========================================
// Componente de Edição de Listas (Feature Module)
// ===========================================
export default function AssetListEditor({ assetKey, setView }: any) {
    const { ativos, dbAssets, dispatch, genericSave, genericDelete } = useAppContext();
    const { title, table, color, type, label, fields, placeholder, icon: Icon } = ASSET_DEFINITIONS[assetKey];
    
    const list = table ? (dbAssets[table] || []) : (ativos[assetKey] || []);
    
    const [newItemName, setNewItemName] = useState('');
    const [newItemFields, setNewItemFields] = useState<any>({});
    
    const isDbAsset = !!table;

    // Função de Inserção/Edição
    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        
        let newRecord: any = {};

        if (type === 'simple') {
            if (!newItemName.trim()) return;
            newRecord = { nome: newItemName.trim() };
        } else if (type === 'complex') {
            const requiredFields = fields.filter((f: any) => !f.hidden);
            if (requiredFields.some((f: any) => !newItemFields[f.key]?.trim())) {
                toast.error(`Preencha todos os campos do ${title}.`);
                return;
            }
            newRecord = { ...newItemFields };
        }

        if (isDbAsset) {
            // OFFLINE-FIRST: Usa genericSave com Update Otimista da Lista
            const tempId = U.id('temp-asset-');
            const recordWithId = { ...newRecord, id: tempId };
            
            await genericSave(table, newRecord, {
                 type: ACTIONS.SET_DB_ASSETS,
                 key: table, // O reducer já trata de atualizar 'ativos' também se necessário
                 records: [...list, recordWithId], // CUIDADO: ACTIONS espera 'records' ou 'data'? No reducer estava lendo 'records'. Vou checar.
                 // Verificando reducer Action SET_DB_ASSETS: usa action.records.
                 // O código original usava 'data' no optimistic? 
                 // Vamos padronizar. O reducer usa 'records'.
            });
            
            setNewItemName('');
            setNewItemFields({});

        } else {
            const newRecordId = U.id('local-');
            const updatedList = [...list, type === 'simple' ? newItemName.trim() : { id: newRecordId, ...newRecord }];
            dispatch({ type: ACTIONS.UPDATE_ATIVOS, chave: assetKey, novaLista: updatedList });
            toast.success(`${title} adicionado localmente.`);
            setNewItemName('');
            setNewItemFields({});
        }
    };

    // Função de Exclusão
    const handleDelete = async (item: any) => {
        const idToDelete = isDbAsset ? item.id : type === 'simple' ? item : item.id;

        if (isDbAsset) {
            // OFFLINE-FIRST DELETE
            const newList = list.filter((i:any) => i.id !== idToDelete);
            await genericDelete(table, idToDelete, {
                type: ACTIONS.SET_DB_ASSETS,
                table: table, // Reducer usa action.table e action.records
                records: newList
            });
        } else {
            const updatedList = list.filter((i: any) => 
                isDbAsset ? i.id !== idToDelete : type === 'simple' ? i !== idToDelete : i.id !== idToDelete
            );
            dispatch({ type: ACTIONS.UPDATE_ATIVOS, chave: assetKey, novaLista: updatedList });
            toast.success(`${title} excluído localmente.`);
        }
    };
    

    const listToRender = isDbAsset ? list : list.map((item: any) => ({ 
        id: type === 'simple' ? item : item.id,
        nome: type === 'simple' ? item : item.nome,
        original: item,
        ...(type === 'complex' ? item : {})
    }));

    return (
        <div className="space-y-4">
            <PageHeader setTela={setView} title={title} icon={Icon} colorClass={`bg-${color}-600`} backTarget={'listas'} />
            
            {/* Formulário de Adição */}
            <form onSubmit={handleAdd} className={`bg-white p-4 rounded-xl shadow-md space-y-3 border-l-4 border-${color}-500`}>
                <p className="text-sm font-bold text-gray-700">Novo {label}</p>

                {type === 'simple' && (
                    <Input 
                        label={label} 
                        value={newItemName} 
                        onChange={(e: any) => setNewItemName(e.target.value)} 
                        placeholder={placeholder} 
                        required 
                    />
                )}
                {type === 'complex' && fields.filter((f: any) => !f.hidden).map((f: any) => (
                    <Input 
                        key={f.key}
                        label={f.label} 
                        value={newItemFields[f.key] || ''} 
                        onChange={(e: any) => setNewItemFields({ ...newItemFields, [f.key]: e.target.value })} 
                        type={f.type || 'text'}
                        placeholder={f.placeholder} 
                        required={!f.hidden}
                    />
                ))}
                
                <button type="submit" className={`w-full bg-${color}-600 text-white font-bold py-2 rounded-lg hover:bg-${color}-700 transition-colors flex items-center justify-center gap-2`}>
                    <Plus className="w-5 h-5"/> Adicionar
                </button>
            </form>

            {/* Lista de Itens Existentes */}
            <div className="space-y-2 pt-2">
                <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider">Itens Cadastrados ({listToRender.length})</h3>
                {listToRender.map((item: any) => (
                    <div key={item.id} className="flex justify-between items-center bg-white p-3 rounded-lg shadow-sm border">
                        <div className="flex-1 min-w-0">
                            <p className="font-medium text-gray-800 truncate">{type === 'simple' ? item.nome : item.nome}</p>
                            {type === 'complex' && fields.filter((f: any) => !f.hidden && f.key !== 'nome').map((f: any) => (
                                <p key={f.key} className="text-xs text-gray-500 truncate">
                                    {f.label}: <span className="font-bold">{item[f.key]}</span>
                                </p>
                            ))}
                        </div>
                        <button onClick={() => handleDelete(item.original || item)} className="p-2 text-red-500 hover:bg-red-50 rounded-full transition-colors" title="Excluir">
                            <Trash2 className="w-5 h-5"/>
                        </button>
                    </div>
                ))}
                {listToRender.length === 0 && (
                    <p className="text-center text-gray-400 text-sm italic py-4">Nenhum item cadastrado.</p>
                )}
            </div>
        </div>
    );
}
