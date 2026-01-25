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
// ===========================================
// Componente de Edição de Listas (Feature Module)
// ===========================================
// ===========================================
// Componente de Edição de Listas (Feature Module)
// ===========================================
// ===========================================
// Componente de Edição de Listas (Feature Module)
// ===========================================
export default function AssetListEditor({ assetKey, setView }: any) {
    const { ativos, dbAssets, dispatch, genericSave, genericDelete, updateAtivos, dados } = useAppContext();
    const { title, table, color, type, label, fields, placeholder, icon: Icon } = ASSET_DEFINITIONS[assetKey];
    
    // Convertendo para array garantido e clonando para evitar mutação direta
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
                 key: table, 
                 records: [...list, recordWithId], 
            });
            
            setNewItemName('');
            setNewItemFields({});

        } else {
            const newRecordId = U.id('local-');
            const updatedList = [...list, type === 'simple' ? newItemName.trim() : { id: newRecordId, ...newRecord }];
            
            // USANDO updateAtivos PARA PERSISTÊNCIA
            updateAtivos(assetKey, updatedList);
            
            toast.success(`${title} adicionado localmente.`);
            setNewItemName('');
            setNewItemFields({});
        }
    };

    // Função para verificar integridade referencial
    const checkIntegrity = (item: any) => {
        const itemId = item.id;
        const itemNome = type === 'simple' ? item : item.nome;

        // 1. CULTURAS
        if (assetKey === 'culturas') {
            const usedInTalhoes = (dbAssets.talhoes || []).some((t: any) => t.cultura === itemNome);
            if (usedInTalhoes) {
                toast.error(`Impossível excluir "${itemNome}": Existem talhões vinculados a esta cultura.`);
                return false;
            }
            const usedInPlantio = (dados.plantios || []).some((p: any) => p.cultura === itemNome);
            if (usedInPlantio) {
                 toast.error(`Impossível excluir "${itemNome}": Existem registros de plantio.`);
                 return false;
            }
        }

        // 2. MÁQUINAS
        if (assetKey === 'maquinas') {
             const usedInAbastecimentos = (dados.abastecimentos || []).some((a: any) => a.veiculo === itemNome || a.maquinaId === itemId);
             const usedInManutencao = (dados.manutencoes || []).some((m: any) => m.maquinaId === itemId);
             if (usedInAbastecimentos || usedInManutencao) {
                toast.error(`Impossível excluir "${itemNome}": Existem registros (abastecimento/manutenção) vinculados.`);
                return false;
             }
        }
        
        // 3. SAFRAS
        if (assetKey === 'safras') {
             const usedInTalhoes = (dbAssets.talhoes || []).some((t: any) => t.safra === itemNome);
             if (usedInTalhoes) {
                toast.error(`Impossível excluir safra "${itemNome}": Existem talhões ativos nesta safra.`);
                return false;
             }
        }

        // 4. CENTROS DE CUSTO
        if (assetKey === 'centrosCusto') {
             const usedInAbastecimentos = (dados.abastecimentos || []).some((a: any) => a.centroCusto === itemNome);
             const usedInRange = (dados.refeicoes || []).some((r: any) => r.centroCusto === itemNome);
             if (usedInAbastecimentos || usedInRange) {
                 toast.error(`Impossível excluir "${itemNome}": Centro de Custo vinculado a registros operacionais.`);
                 return false;
             }
        }

        // 5. TALHÕES
        if (assetKey === 'talhoes') {
            const usedInPlantios = (dados.plantios || []).some((p: any) => p.talhao === itemNome || p.talhaoId === itemId);
            const usedInColheitas = (dados.colheitas || []).some((c: any) => c.talhao === itemNome || c.talhaoId === itemId);
            const usedInAbastecimentos = (dados.abastecimentos || []).some((a: any) => a.talhao === itemNome);
            
            if (usedInPlantios || usedInColheitas || usedInAbastecimentos) {
                toast.error(`Impossível excluir Talhão "${itemNome}": Existem apontamentos (plantio/colheita/diesel) vinculados.`);
                return false;
            }
        }

        // 6. PRODUTOS / INSUMOS
        if (assetKey === 'produtos') {
            const usedInCompras = (dados.compras || []).some((c: any) => c.produto === itemNome || c.produtoId === itemId);
            if (usedInCompras) {
                toast.error(`Impossível excluir "${itemNome}": Item presente em registros de Compras/Estoque.`);
                return false;
            }
        }

        // 7. LOCAIS (CHUVA / ENERGIA)
        if (assetKey === 'locaisChuva') {
            const usedInPrecipitacao = (dados.chuvas || []).some((c: any) => c.local === itemNome);
            if (usedInPrecipitacao) {
                toast.error(`Impossível excluir "${itemNome}": Existem leituras pluviométricas para este local.`);
                return false;
            }
        }
        if (assetKey === 'locaisEnergia') {
            const usedInLeituras = (dados.energia || []).some((e: any) => e.local === itemNome);
            if (usedInLeituras) {
                toast.error(`Impossível excluir "${itemNome}": Existem leituras de energia para este medidor.`);
                return false;
            }
        }

        // 8. TIPOS DE REFEIÇÃO
        if (assetKey === 'tiposRefeicao') {
            const usedInRefeicoes = (dados.refeicoes || []).some((r: any) => r.tipo === itemNome || r.refeicao === itemNome);
            if (usedInRefeicoes) {
                toast.error(`Impossível excluir "${itemNome}": Existem registros de refeições deste tipo.`);
                return false;
            }
        }

        return true;
    };

    // Função de Exclusão
    const handleDelete = async (item: any) => {
        if (!checkIntegrity(item)) return; // Bloqueia se estiver em uso

        const idToDelete = isDbAsset ? item.id : type === 'simple' ? item : item.id;

        if (isDbAsset) {
            // OFFLINE-FIRST DELETE
            const newList = list.filter((i:any) => i.id !== idToDelete);
            await genericDelete(table, idToDelete, {
                type: ACTIONS.SET_DB_ASSETS,
                table: table, 
                records: newList
            });
        } else {
            const updatedList = list.filter((i: any) => 
                isDbAsset ? i.id !== idToDelete : type === 'simple' ? i !== idToDelete : i.id !== idToDelete
            );
            // USANDO updateAtivos PARA PERSISTÊNCIA
            updateAtivos(assetKey, updatedList);
            toast.success(`${title} excluído localmente.`);
        }
    };
    
    // Função de Movimentação (Reordenação)
    const handleMove = (index: number, direction: 'up' | 'down') => {
        const newList = [...list];
        const targetIndex = direction === 'up' ? index - 1 : index + 1;

        if (targetIndex < 0 || targetIndex >= newList.length) return;

        // Swap
        [newList[index], newList[targetIndex]] = [newList[targetIndex], newList[index]];

        if (isDbAsset) {
            // Para DB Assets, atualizamos o estado local para refletir na UI imediatamente via reducer
            // Nota: Isso não persiste a ordem no banco SQL a menos que haja uma coluna 'idx'
            // Para esta versão, permitimos a ordenação visual na sessão atual
             dispatch({
                 type: ACTIONS.SET_DB_ASSETS, // Reutilizando a action correta para DB
                 key: table,
                 records: newList
             });
        } else {
            // Para Ativos Locais (JSON), a ordem SÃO persistida AGORA SIM!
            updateAtivos(assetKey, newList);
        }
    };

    const listToRender = isDbAsset ? list : list.map((item: any) => ({ 
        id: type === 'simple' ? item : item.id,
        nome: type === 'simple' ? item : item.nome,
        original: item,
        ...(type === 'complex' ? item : {})
    }));

    return (
        <div className="space-y-6 p-4 pb-24 max-w-md mx-auto">
            <PageHeader setTela={setView} title={title} icon={Icon} colorClass={`bg-${color}-600`} backTarget={'listas'} />
            
            {/* Formulário de Adição */}
            <form onSubmit={handleAdd} className={`bg-white p-4 rounded-xl shadow-md space-y-3 border-l-4 border-${color}-500`}>
                <p className="text-sm font-bold text-gray-700">Novo {label}</p>

                {type === 'simple' && (
                    <Input 
                        label={label} 
                        value={newItemName} 
                        onChange={(e: any) => setNewItemName(e.target.value)} 
                        placeholder={placeholder || "Ex: Novo item..."} 
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
                        placeholder={f.placeholder || placeholder} 
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
                {listToRender.map((item: any, index: number) => (
                    <div key={item.id || index} className="flex justify-between items-center bg-white p-3 rounded-lg shadow-sm border group">
                       <div className="flex flex-col gap-1 mr-2 opacity-50 group-hover:opacity-100 transition-opacity">
                             <button 
                                 type="button"
                                 disabled={index === 0}
                                 onClick={() => handleMove(index, 'up')}
                                 className="p-1 hover:bg-gray-100 rounded disabled:opacity-20 text-gray-600"
                             >
                                 <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m18 15-6-6-6 6"/></svg>
                             </button>
                             <button 
                                 type="button"
                                 disabled={index === listToRender.length - 1}
                                 onClick={() => handleMove(index, 'down')}
                                 className="p-1 hover:bg-gray-100 rounded disabled:opacity-20 text-gray-600"
                             >
                                 <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
                             </button>
                        </div>

                        <div className="flex-1 min-w-0">
                            <p className="font-medium text-gray-800 truncate">{type === 'simple' ? item.nome : item.nome}</p>
                            {type === 'complex' && fields.filter((f: any) => !f.hidden && f.key !== 'nome').map((f: any) => (
                                <p key={f.key} className="text-xs text-gray-500 truncate">
                                    {f.label}: <span className="font-bold">{item[f.key]}</span>
                                </p>
                            ))}
                        </div>
                        <button onClick={() => handleDelete(item.original || item)} className="p-2 text-red-500 hover:bg-red-50 rounded-full transition-colors ml-2" title="Excluir">
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
