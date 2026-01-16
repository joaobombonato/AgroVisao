import React, { useState, useEffect, useMemo } from 'react';
// [1] CORREÇÃO: Adicionado Leaf à lista de importações
import { Settings, Plus, Trash2, Edit2, Check, X, ListPlus, Save, Lock, Users, ArrowLeft, ArrowUp, ArrowDown, Minus, Sliders, Fuel, Zap, Utensils, Wrench, Sprout, ShoppingBag, Map, CloudRain, ArrowRight, Leaf } from 'lucide-react'; 
import { PageHeader, Input } from '../components/ui/Shared';
import { useAppContext, ACTIONS } from '../context/AppContext';
import { toast } from 'react-hot-toast';
import { ATIVOS_INICIAIS } from '../data/constants';
import { U } from '../data/utils';

// ===========================================
// 1. DEFINIÇÕES DE ATIVOS
// ===========================================
const ASSET_DEFINITIONS: any = {
    // Tabela: maquinas
    maquinas:      { title: 'Máquinas / Veículos', table: 'maquinas', color: 'red', type: 'simple', label: 'Identificação', placeholder: 'Ex: Trator Valtra A1', icon: Wrench },
    // Tabela: talhoes
    talhoes:       { title: 'Talhões (Áreas)', table: 'talhoes', color: 'green', type: 'complex', label: 'Nome do Talhão', icon: Map, fields: [{ key: 'nome', label: 'Nome' }, { key: 'area_ha', label: 'Área (ha)', type: 'number' }] },
    // Tabela: pessoas (Centros de Custo)
    centrosCusto:  { title: 'Centros de Custo', table: 'pessoas', color: 'orange', type: 'simple', label: 'Nome', placeholder: 'Ex: Administrativo', icon: Users },
    // Tabela: produtos (para estoque e recomendações)
    produtos:      { title: 'Produtos / Insumos', table: 'produtos', color: 'blue', type: 'simple', label: 'Nome do Produto', placeholder: 'Ex: Glifosato', icon: ShoppingBag },
    // Tabela: locais_monitoramento
    locaisChuva:   { title: 'Estações de Chuva', table: 'locais_monitoramento', color: 'cyan', type: 'complex', label: 'Nome da Estação', icon: CloudRain, fields: [{ key: 'nome', label: 'Nome' }, { key: 'tipo', label: 'Tipo', hidden: true, default: 'chuva' }] },
    locaisEnergia: { title: 'Medidores de Energia', table: 'locais_monitoramento', color: 'yellow', type: 'complex', label: 'Local', icon: Zap, fields: [{ key: 'nome', label: 'Local' }, { key: 'identificador_externo', label: 'Nº Medidor' }, { key: 'tipo', label: 'Tipo', hidden: true, default: 'energia' }] },

    // Os itens abaixo continuam usando o `ativos` local (para manter a compatibilidade temporariamente)
    safras:        { title: 'Safras', color: 'green', type: 'simple', label: 'Ano Safra', icon: Sprout },
    culturas:      { title: 'Culturas', color: 'green', type: 'simple', label: 'Nome', icon: Leaf }, // Usando o Leaf corrigido
};


// ===========================================
// 2. Componente de Edição de Listas
// ===========================================
function AssetListEditor({ assetKey, setView }: any) {
    const { ativos, dbAssets, dispatch, saveRecord, deleteRecord } = useAppContext();
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
            const success = await saveRecord(table, newRecord);
            if (success) {
                setNewItemName('');
                setNewItemFields({});
            }
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
            await deleteRecord(table, idToDelete);
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
            <form onSubmit={handleAdd} className="bg-white p-4 rounded-xl shadow-md space-y-3 border-l-4 border-green-500">
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
                
                <button type="submit" className="w-full bg-green-600 text-white font-bold py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-2">
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

// ===========================================
// 3. Componente Principal de Configurações
// ===========================================
export default function ConfiguracoesScreen() {
    const { setTela } = useAppContext();
    const [view, setView] = useState('principal'); // principal, listas, parametros, editor
    const [currentAssetKey, setCurrentAssetKey] = useState('');

    const handleOpenEditor = (key: string) => {
        setCurrentAssetKey(key);
        setView('editor');
    }

    if (view === 'editor') {
        return <AssetListEditor assetKey={currentAssetKey} setView={setView} />;
    }

    if (view === 'parametros') {
        return (
            <div className="space-y-6 p-4 pb-24 max-w-md mx-auto">
                <PageHeader setTela={setView} title="Parâmetros Operacionais" icon={Sliders} colorClass="bg-blue-500" backTarget={'principal'} />
                <p className="text-gray-500 text-sm">Este módulo será atualizado para salvar no banco. Por enquanto, os valores estão salvos localmente.</p>
            </div>
        );
    }
    
    if (view === 'listas') {
        return (
            <div className="space-y-6 p-4 pb-24 max-w-md mx-auto">
                <PageHeader setTela={setView} title="Cadastros & Listas" icon={ListPlus} colorClass="bg-indigo-600" backTarget={'principal'} />
                <div className="space-y-3">
                    <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider ml-1">Ativos Operacionais (Banco)</h2>
                    {Object.entries(ASSET_DEFINITIONS).filter(([key, def]: any) => def.table).map(([key, def]: any) => (
                        <MenuButton 
                            key={key}
                            icon={def.icon} 
                            title={def.title} 
                            desc={`Gerenciar cadastros de ${def.title.toLowerCase()}`} 
                            onClick={() => handleOpenEditor(key)} 
                            color={`bg-${def.color}-50`} 
                        />
                    ))}
                </div>

                <div className="space-y-3 pt-4">
                    <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider ml-1">Listas Fixas (Local)</h2>
                    {Object.entries(ASSET_DEFINITIONS).filter(([key, def]: any) => !def.table).map(([key, def]: any) => (
                        <MenuButton 
                            key={key}
                            icon={def.icon} 
                            title={def.title} 
                            desc={`Gerenciar cadastros de ${def.title.toLowerCase()}`} 
                            onClick={() => handleOpenEditor(key)} 
                            color={`bg-${def.color}-50`} 
                        />
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6 p-4 pb-24 max-w-md mx-auto">
            <PageHeader setTela={setTela} title="Configurações" icon={Settings} colorClass="bg-gray-600" />
            
            <div className="space-y-3">
                <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider ml-1">Sistema</h2>
                <MenuButton icon={Sliders} title="Parâmetros Operacionais" desc="Estoque, Preços, Alertas e Metas" onClick={() => setView('parametros')} color="bg-blue-50" />
                <MenuButton icon={ListPlus} title="Cadastros & Listas" desc="Máquinas, Produtos, Talhões..." onClick={() => setView('listas')} color="bg-indigo-50" />
            </div>

            <div className="space-y-3 pt-2">
                <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider ml-1">Dados & Segurança</h2>
                <MenuButton icon={Save} title="Backup de Dados" desc="Exportar ou Importar JSON" onClick={() => toast("Em breve: Exportação JSON")} />
                <MenuButton icon={Lock} title="Permissões" desc="Controle de Usuários" onClick={() => toast("Em breve: Módulo Usuários")} />
            </div>
            
            <div className="text-center pt-8 opacity-50 text-xs text-gray-400">
                AgroDev v1.0.1 | Arquiteto: Seu Nome
            </div>
        </div>
    );
}

// Componente auxiliar de menu
const MenuButton = ({ icon: Icon, title, desc, onClick, color = 'bg-gray-50' }: any) => (
    <button onClick={onClick} className={`w-full flex items-center p-3 rounded-xl shadow-sm ${color} transition-shadow hover:shadow-md border-l-4 border-green-500 hover:border-green-600`}>
        <div className="mr-3 p-2 bg-white rounded-lg shadow-sm">
             <Icon className="w-5 h-5 text-gray-600" />
        </div>
        <div className="text-left">
            <p className="font-bold text-sm text-gray-800">{title}</p>
            <p className="text-xs text-gray-600">{desc}</p>
        </div>
        <ArrowRight className="w-4 h-4 ml-auto text-gray-400" />
    </button>
);