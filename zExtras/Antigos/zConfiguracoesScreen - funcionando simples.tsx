import React, { useState } from 'react';
import { Settings, Plus, Trash2, Edit2, Check, X, ChevronDown, ListPlus, Save, Sun, Lock, Users, ArrowLeft } from 'lucide-react';
import { PageHeader, Input } from '../components/ui/Shared'; // Importe o Input daqui
import { useAppContext, ACTIONS } from '../context/AppContext';
import { toast } from 'react-hot-toast';

// ===========================================
// Sub-Tela 1: Gerenciamento de Listas (Actives)
// ===========================================

// Componente Reutilizável para Gerenciar UMA Lista
function ListManager({ title, assetKey }: { title: string, assetKey: string }) {
    const { ativos, dispatch } = useAppContext();
    // Verifica se a lista existe, se não, usa um array vazio para não quebrar
    const currentList = ativos[assetKey] || []; 
    const [newItem, setNewItem] = useState('');
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editText, setEditText] = useState('');

    const handleAdd = () => {
        if (newItem.trim() && !currentList.includes(newItem.trim())) {
            const novaLista = [...currentList, newItem.trim()];
            dispatch({ type: ACTIONS.UPDATE_ATIVOS, chave: assetKey, novaLista });
            setNewItem('');
            toast.success(`${title} adicionado!`);
        } else if (currentList.includes(newItem.trim())) {
            toast.error("Item já existe na lista.");
        }
    };

    const handleDelete = (itemToDelete: string) => {
        const novaLista = currentList.filter((item: string) => item !== itemToDelete);
        dispatch({ type: ACTIONS.UPDATE_ATIVOS, chave: assetKey, novaLista });
        toast.error(`${title} removido.`);
    };

    const handleEdit = (originalItem: string) => {
        if (editText.trim() && editText.trim() !== originalItem) {
            const novaLista = currentList.map((item: string) => 
                item === originalItem ? editText.trim() : item
            );
            dispatch({ type: ACTIONS.UPDATE_ATIVOS, chave: assetKey, novaLista });
            setEditingId(null);
            setEditText('');
            toast.success(`${title} atualizado.`);
        } else {
            setEditingId(null); 
        }
    };

    // Define quais listas são editáveis e seus títulos
    const editableAssets = [
        { key: 'tiposRefeicao', title: 'Tipos - Refeições' },
		{ key: 'centrosCusto', title: 'Centro de Custos - Refeições' },
		{ key: 'maquinas', title: 'Máquinas / Veículos - Abastecimento' },
		{ key: 'safras', title: 'Safras - Recomendações' },
        { key: 'talhoes', title: 'Talhão - Recomendações', isComplex: true }, // Complexo pois tem {nome, area}
		{ key: 'culturas', title: 'Culturas - Recomendações' },
		{ key: 'classe', title: 'Classes - Recomendações' },
        { key: 'produtos', title: 'Produtos / Insumos - Recomendações' },
        { key: 'tiposDocumento', title: 'Categorias de Arquivo - Docs' },
        { key: 'locaisEnergia', title: 'Localização - Energia', isComplex: true }, // Complexo {nome, medidor}
        { key: 'talhoesChuva', title: 'Estações - Chuva' },
    ];
    
    // ATENÇÃO: Se for uma lista de objetos (como talhões ou energia), este componente precisaria de mais lógica.
    // Por enquanto, ele só edita listas de strings simples (que é o caso da maioria das suas listas).

    return (
        <div className="bg-white border-2 rounded-xl p-4 shadow-sm space-y-3">
            <h3 className="font-bold text-lg text-gray-700 flex items-center gap-2">
                <ListPlus className="w-5 h-5 text-indigo-600"/> Gerenciar: {title}
            </h3>

            {/* Formulário de Adição */}
            <div className="flex gap-2">
                <input
                    type="text"
                    placeholder={`Inclua aqui um novo(a) ${title.toLowerCase().replace(' / veículos', '')}`}
                    value={newItem}
                    onChange={(e) => setNewItem(e.target.value)}
                    className="flex-1 px-3 py-2 border rounded-lg text-sm"
                />
                <button onClick={handleAdd} className="bg-blue-600 text-white p-2 rounded-lg hover:bg-blue-700 transition-colors"><Plus className="w-5 h-5"/></button>
            </div>

            {/* Lista de Itens Atuais */}
            <div className="space-y-2 max-h-64 overflow-y-auto border p-2 rounded-lg bg-gray-50">
                {currentList.length === 0 && <p className="text-gray-500 text-xs italic text-center py-2">Lista vazia. Adicione um item.</p>}
                {currentList.map((item: string | {nome: string}) => {
                    const itemValue = typeof item === 'string' ? item : item.nome; // Para lidar com objetos (embora as listas complexas precisem de um componente mais robusto)

                    return (
                        <div key={itemValue} className="flex justify-between items-center bg-white p-2 border rounded-md shadow-sm">
                            
                            {editingId === itemValue ? (
                                // Modo Edição
                                <div className="flex flex-1 gap-2">
                                    <input
                                        type="text"
                                        value={editText}
                                        onChange={(e) => setEditText(e.target.value)}
                                        className="flex-1 px-2 py-1 border rounded text-sm"
                                    />
                                    <button onClick={() => handleEdit(itemValue)} className="text-green-600 hover:bg-green-50 p-1 rounded"><Check className="w-4 h-4"/></button>
                                    <button onClick={() => setEditingId(null)} className="text-red-600 hover:bg-red-50 p-1 rounded"><X className="w-4 h-4"/></button>
                                </div>
                            ) : (
                                // Modo Visualização
                                <p className="text-sm font-medium text-gray-800 truncate flex-1">{itemValue}</p>
                            )}

                            {!editingId && (
                                <div className="flex gap-1 ml-2">
                                    <button onClick={() => { setEditingId(itemValue); setEditText(itemValue); }} className="text-blue-500 hover:bg-blue-50 p-1 rounded"><Edit2 className="w-4 h-4"/></button>
                                    <button onClick={() => handleDelete(itemValue)} className="text-red-500 hover:bg-red-50 p-1 rounded"><Trash2 className="w-4 h-4"/></button>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

function ActivesManagerScreen({ setView }: { setView: (view: string) => void }) {
    const [activeList, setActiveList] = useState<string>('maquinas');
    
    // Define quais listas são editáveis e seus títulos
    const editableAssets = [
        { key: 'tiposRefeicao', title: 'Tipos - Refeições', icon: ListPlus },
		{ key: 'centrosCusto', title: 'Centro de Custos - Refeições', icon: ListPlus },
        { key: 'maquinas', title: 'Máquinas / Veículos - Abastecimento', icon: ListPlus },
        { key: 'safras', title: 'Safras - Recomendações', icon: ListPlus },
		{ key: 'culturas', title: 'Culturas - Recomendações', icon: ListPlus },
		{ key: 'classe', title: 'Classes - Recomendações', icon: ListPlus },
		{ key: 'produtos', title: 'Produtos / Insumos - Recomendações', icon: ListPlus },
        { key: 'tiposDocumento', title: 'Categorias de Arquivo - Docs', icon: ListPlus },
		{ key: 'talhoesChuva', title: 'Estações - Chuvas', icon: ListPlus },
        // NOTE: As listas complexas (talhoes de recomendacoes, locais de Energia) foram omitidas para evitar bugs no CRUD simples.
    ];

    return (
        <div className="space-y-4">
            <button onClick={() => setView('main')} className="flex items-center gap-1 text-sm font-medium text-gray-500 hover:text-blue-600 mb-2 p-1"><ArrowLeft className="w-4 h-4" /> Voltar ao Menu</button>
            <h2 className="text-xl font-bold text-gray-800 mb-4 border-b pb-2">Gerenciar Listas</h2>

            {/* Menu de Seleção da Lista */}
            <div className="bg-white border-2 rounded-xl p-4 shadow-sm">
                <h3 className="font-bold mb-3">Selecione o Ativo para Edição:</h3>
                <div className="space-y-2">
                    {editableAssets.map((asset) => (
                        <button
                            key={asset.key}
                            onClick={() => setActiveList(asset.key)}
                            className={`w-full text-left p-3 rounded-lg flex justify-between items-center transition-colors ${
                                activeList === asset.key 
                                    ? 'bg-indigo-600 text-white font-bold shadow-md' 
                                    : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                            }`}
                        >
                            {asset.title}
                            <ChevronDown className={`w-4 h-4 transform ${activeList === asset.key ? 'rotate-180' : 'rotate-0'}`} />
                        </button>
                    ))}
                </div>
            </div>

            {/* Exibição do Gerenciador de Lista Ativa */}
            {activeList && (
                <ListManager
                    key={activeList}
                    title={editableAssets.find(a => a.key === activeList)?.title || 'Lista'}
                    assetKey={activeList}
                />
            )}
        </div>
    );
}

// ===========================================
// Tela Principal de Configurações (Modular)
// ===========================================
export default function ConfiguracoesScreen() {
    const { setTela } = useAppContext();
    const [activeView, setActiveView] = useState<'main' | 'ativos'>('main'); // Estado para controlar sub-telas

    const settingsMenu = [
        { id: 'ativos', title: 'Gerenciamento de Listas do Ativos', icon: ListPlus, description: 'Refeições, Máquinas, Recomendações, Chuva, etc.' },
        { id: 'backup', title: 'Backup / Dados', icon: Save, description: 'Exportar/Importar registros e ativos.' },
        { id: 'theme', title: 'Aparência e Tema', icon: Sun, description: 'Mudar cores e visual do app.' },
        { id: 'security', title: 'Segurança / Permissões', icon: Lock, description: 'Login, senhas e acessos (Próxima Fase).' },
        { id: 'user', title: 'Dados do Usuário', icon: Users, description: 'Configurações pessoais.' },
    ];

    if (activeView === 'ativos') {
        return (
            <div className="p-4 pb-24 max-w-md mx-auto w-full">
                <PageHeader setTela={setTela} title="Configurações" icon={Settings} colorClass="bg-gray-600" />
                <ActivesManagerScreen setView={setActiveView} />
            </div>
        );
    }

    return (
        <div className="space-y-4 p-4 pb-24 max-w-md mx-auto w-full">
            <PageHeader setTela={setTela} title="Configurações" icon={Settings} colorClass="bg-gray-600" />
            
            <h2 className="text-xl font-bold text-gray-800 mb-4 border-b pb-2">Menu Principal</h2>

            <div className="bg-white border-2 rounded-xl p-4 shadow-sm space-y-3">
                {settingsMenu.map((item) => (
                    <button
                        key={item.id}
                        onClick={() => setActiveView(item.id as 'main' | 'ativos')} // Troca a sub-tela
                        className="w-full text-left p-4 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors flex items-center gap-3 border"
                    >
                        <item.icon className="w-6 h-6 text-indigo-600 flex-shrink-0" />
                        <div>
                            <p className="font-bold text-gray-800">{item.title}</p>
                            <p className="text-xs text-gray-500">{item.description}</p>
                        </div>
                    </button>
                ))}
            </div>

            <div className="bg-white p-6 rounded-lg shadow-md text-center border-2"><Settings className="w-12 h-12 text-gray-400 mx-auto mb-4" /><p className="text-gray-600">Versão 3.4 - Módulo Configurações</p></div>
        </div>
    );
}