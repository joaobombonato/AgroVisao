import React, { useState } from 'react';
import { Settings, Plus, Trash2, Edit2, Check, X, ListPlus, Save, Sun, Lock, Users, ArrowLeft, ArrowUp, ArrowDown, Minus } from 'lucide-react';
import { PageHeader } from '../components/ui/Shared';
import { useAppContext, ACTIONS } from '../context/AppContext';
import { toast } from 'react-hot-toast';

// ===========================================
// CONFIGURAÇÃO DOS ATIVOS (CORES E TIPOS)
// ===========================================
const ASSET_DEFINITIONS: any = {
    // --- REFEIÇÕES (Laranja) ---
    tiposRefeicao: { title: 'Tipos de Refeição', color: 'orange', type: 'simple', label: 'Nome da Refeição' },
    centrosCusto:  { title: 'Centros de Custo',  color: 'orange', type: 'simple', label: 'Nome do Centro' },
    
    // --- ABASTECIMENTO (Vermelho) ---
    maquinas:      { title: 'Máquinas / Veículos', color: 'red', type: 'simple', label: 'Identificação da Máquina' },
    
    // --- AGRONÔMICO / RECOMENDAÇÕES (Verde) ---
    safras:        { title: 'Safras', color: 'green', type: 'simple', label: 'Ano Safra (ex: 2024/25)' },
    culturas:      { title: 'Culturas', color: 'green', type: 'simple', label: 'Nome da Cultura' },
    classes:       { title: 'Classes (Defensivos)', color: 'green', type: 'simple', label: 'Nome da Classe (ex: Herbicida)' },
    // Complexos
    talhoes:       { title: 'Talhões (Recomendação)', color: 'green', type: 'talhao', label: 'Nome do Talhão' },
    produtos:      { title: 'Produtos / Insumos', color: 'green', type: 'produto', label: 'Nome Comercial' },
    
    // --- DOCUMENTOS (Roxo) ---
    tiposDocumento:{ title: 'Categorias de Arquivo', color: 'purple', type: 'simple', label: 'Nome da Categoria' },
    
    // --- ENERGIA (Amarelo) ---
    locaisEnergia: { title: 'Locais de Energia', color: 'yellow', type: 'energia', label: 'Nome do Local' },
    
    // --- CHUVA (Ciano) ---
    talhoesChuva:  { title: 'Estações - Chuva', color: 'cyan', type: 'simple', label: 'Nome da Estação/Local' },
};

// Mapa de cores para Tailwind (segurança para não quebrar classes dinâmicas)
const COLOR_MAP: any = {
    orange: { bg: 'bg-orange-500', text: 'text-orange-600', border: 'border-orange-200', bgLight: 'bg-orange-50', hover: 'hover:bg-orange-600' },
    red:    { bg: 'bg-red-500',    text: 'text-red-600',    border: 'border-red-200',    bgLight: 'bg-red-50',    hover: 'hover:bg-red-600' },
    green:  { bg: 'bg-green-500',  text: 'text-green-600',  border: 'border-green-200',  bgLight: 'bg-green-50',  hover: 'hover:bg-green-600' },
    purple: { bg: 'bg-purple-500', text: 'text-purple-600', border: 'border-purple-200', bgLight: 'bg-purple-50', hover: 'hover:bg-purple-600' },
    yellow: { bg: 'bg-yellow-500', text: 'text-yellow-600', border: 'border-yellow-200', bgLight: 'bg-yellow-50', hover: 'hover:bg-yellow-600' },
    cyan:   { bg: 'bg-cyan-500',   text: 'text-cyan-600',   border: 'border-cyan-200',   bgLight: 'bg-cyan-50',   hover: 'hover:bg-cyan-600' },
    gray:   { bg: 'bg-gray-500',   text: 'text-gray-600',   border: 'border-gray-200',   bgLight: 'bg-gray-50',   hover: 'hover:bg-gray-600' },
};

// ===========================================
// GERENCIADOR INTELIGENTE (SmartListManager)
// ===========================================
function SmartListManager({ assetKey }: { assetKey: string }) {
    const { ativos, dispatch } = useAppContext();
    const config = ASSET_DEFINITIONS[assetKey];
    const styles = COLOR_MAP[config.color] || COLOR_MAP.gray;
    
    const currentList = ativos[assetKey] || [];

    // States para Inclusão
    const [name, setName] = useState('');
    const [extra1, setExtra1] = useState(''); // Usado para Area, Medidor ou Classe

    // States para Edição
    const [editingIndex, setEditingIndex] = useState<number | null>(null);
    const [editName, setEditName] = useState('');
    const [editExtra1, setEditExtra1] = useState('');

    // --- FUNÇÕES DE AJUDA ---
    const getItemName = (item: any) => typeof item === 'object' ? item.nome : item;
    const getItemExtra = (item: any) => {
        if (typeof item !== 'object') return '';
        if (config.type === 'talhao') return item.area;
        if (config.type === 'energia') return item.medidor;
        if (config.type === 'produto') return item.classe;
        return '';
    };

    // --- CRUD ---
    const handleAdd = () => {
        if (!name.trim()) return toast.error("Nome é obrigatório");

        let newItem: any = name.trim();

        // Lógica para itens complexos
        if (config.type !== 'simple') {
            if (config.type === 'produto' && !extra1) return toast.error("Selecione uma Classe");
            
            newItem = { nome: name.trim() };
            if (config.type === 'talhao') newItem.area = extra1;
            if (config.type === 'energia') newItem.medidor = extra1;
            if (config.type === 'produto') newItem.classe = extra1;
        }

        const novaLista = [...currentList, newItem];
        dispatch({ type: ACTIONS.UPDATE_ATIVOS, chave: assetKey, novaLista });
        setName(''); setExtra1('');
        toast.success("Item adicionado!");
    };

    const handleDelete = (index: number) => {
        const novaLista = currentList.filter((_: any, i: number) => i !== index);
        dispatch({ type: ACTIONS.UPDATE_ATIVOS, chave: assetKey, novaLista });
        toast.success("Item removido.");
    };

    const handleMove = (index: number, direction: 'up' | 'down') => {
        const newList = [...currentList];
        if (direction === 'up' && index > 0) {
            [newList[index], newList[index - 1]] = [newList[index - 1], newList[index]];
        } else if (direction === 'down' && index < newList.length - 1) {
            [newList[index], newList[index + 1]] = [newList[index + 1], newList[index]];
        }
        dispatch({ type: ACTIONS.UPDATE_ATIVOS, chave: assetKey, novaLista: newList });
    };

    const startEdit = (index: number, item: any) => {
        setEditingIndex(index);
        setEditName(getItemName(item));
        setEditExtra1(getItemExtra(item));
    };

    const saveEdit = () => {
        if (!editName.trim()) return;
        
        const newList = [...currentList];
        let updatedItem: any = editName.trim();

        if (config.type !== 'simple') {
            updatedItem = { nome: editName.trim() };
            if (config.type === 'talhao') updatedItem.area = editExtra1;
            if (config.type === 'energia') updatedItem.medidor = editExtra1;
            if (config.type === 'produto') updatedItem.classe = editExtra1;
        }

        newList[editingIndex!] = updatedItem;
        dispatch({ type: ACTIONS.UPDATE_ATIVOS, chave: assetKey, novaLista: newList });
        setEditingIndex(null);
        toast.success("Item atualizado!");
    };

    // --- RENDER INPUTS ---
    const renderInputs = (isEdit: boolean) => {
        const valName = isEdit ? editName : name;
        const setValName = isEdit ? setEditName : setName;
        const valExtra = isEdit ? editExtra1 : extra1;
        const setValExtra = isEdit ? setEditExtra1 : setExtra1;

        return (
            <div className="flex gap-2 items-center flex-1">
                <input 
                    type="text" 
                    placeholder={config.label} 
                    value={valName} 
                    onChange={e => setValName(e.target.value)} 
                    className="flex-1 px-3 py-2 border rounded-lg text-sm min-w-0"
                />
                
                {/* Inputs Extras Condicionais */}
                {config.type === 'talhao' && (
                    <input type="number" placeholder="Área (ha)" className="w-24 px-3 py-2 border rounded-lg text-sm" value={valExtra} onChange={e => setValExtra(e.target.value)} />
                )}
                {config.type === 'energia' && (
                    <input type="text" placeholder="Nº Medidor" className="w-28 px-3 py-2 border rounded-lg text-sm" value={valExtra} onChange={e => setValExtra(e.target.value)} />
                )}
                {config.type === 'produto' && (
                    <select className="w-32 px-2 py-2 border rounded-lg text-sm bg-white" value={valExtra} onChange={e => setValExtra(e.target.value)}>
                        <option value="">Classe...</option>
                        {(ativos.classes || []).map((c: any) => {
                            const cName = typeof c === 'string' ? c : c.nome;
                            return <option key={cName} value={cName}>{cName}</option>
                        })}
                    </select>
                )}
            </div>
        );
    };

    return (
        <div className={`bg-white border-2 ${styles.border} rounded-xl p-4 shadow-sm space-y-3`}>
            <h3 className={`font-bold text-lg ${styles.text} flex items-center gap-2`}>
                <ListPlus className="w-5 h-5"/> {config.title}
            </h3>

            {/* BARRA DE ADIÇÃO */}
            <div className="flex gap-2">
                {renderInputs(false)}
                <button onClick={handleAdd} className={`${styles.bg} text-white p-2 rounded-lg ${styles.hover} transition-colors flex-shrink-0`}>
                    <Plus className="w-5 h-5"/>
                </button>
            </div>

            {/* LISTA DE ITENS */}
            <div className="space-y-2 max-h-80 overflow-y-auto border p-2 rounded-lg bg-gray-50">
                {currentList.length === 0 && <p className="text-gray-400 text-xs italic text-center py-4">Nenhum item cadastrado.</p>}
                
                {currentList.map((item: any, index: number) => {
                    const isEditing = editingIndex === index;
                    const itemName = getItemName(item);
                    const itemExtra = getItemExtra(item);

                    return (
                        <div key={index} className="flex items-center gap-2 bg-white p-2 border rounded-md shadow-sm group">
                            {/* Ordenação */}
                            {!isEditing && (
                                <div className="flex flex-col gap-0.5 text-gray-300">
                                    <button onClick={() => handleMove(index, 'up')} className="hover:text-blue-500 disabled:opacity-0" disabled={index === 0}><ArrowUp className="w-3 h-3"/></button>
                                    <button onClick={() => handleMove(index, 'down')} className="hover:text-blue-500 disabled:opacity-0" disabled={index === currentList.length - 1}><ArrowDown className="w-3 h-3"/></button>
                                </div>
                            )}

                            {isEditing ? (
                                <div className="flex-1 flex gap-2 items-center">
                                    {renderInputs(true)}
                                    <button onClick={saveEdit} className="text-green-600 bg-green-50 p-1.5 rounded"><Check className="w-4 h-4"/></button>
                                    <button onClick={() => setEditingIndex(null)} className="text-red-600 bg-red-50 p-1.5 rounded"><X className="w-4 h-4"/></button>
                                </div>
                            ) : (
                                <div className="flex-1 min-w-0">
                                    <div className="flex justify-between items-center">
                                        <p className="text-sm font-bold text-gray-700 truncate">{itemName}</p>
                                        {/* Badges para itens extras */}
                                        {config.type === 'talhao' && itemExtra && <span className="text-[10px] bg-green-100 text-green-800 px-2 rounded-full">{itemExtra} ha</span>}
                                        {config.type === 'energia' && itemExtra && <span className="text-[10px] bg-yellow-100 text-yellow-800 px-2 rounded-full">MED: {itemExtra}</span>}
                                        {config.type === 'produto' && itemExtra && <span className="text-[10px] bg-blue-100 text-blue-800 px-2 rounded-full">{itemExtra}</span>}
                                    </div>
                                </div>
                            )}

                            {!isEditing && (
                                <div className="flex gap-1 ml-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => startEdit(index, item)} className="text-blue-500 hover:bg-blue-50 p-1.5 rounded"><Edit2 className="w-4 h-4"/></button>
                                    <button onClick={() => handleDelete(index)} className="text-red-500 hover:bg-red-50 p-1.5 rounded"><Trash2 className="w-4 h-4"/></button>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

// ===========================================
// TELA PRINCIPAL
// ===========================================
export default function ConfiguracoesScreen() {
    const { setTela } = useAppContext();
    const [activeView, setActiveView] = useState<'main' | 'ativos'>('main');

    const settingsMenu = [
        { id: 'ativos', title: 'Gerenciamento de Ativos', icon: ListPlus, description: 'Refeições, Máquinas, Recomendações, Chuva, etc.' },
        { id: 'backup', title: 'Backup / Dados', icon: Save, description: 'Exportar/Importar registros e ativos.' },
        { id: 'theme', title: 'Aparência e Tema', icon: Sun, description: 'Mudar cores e visual do app.' },
        { id: 'security', title: 'Segurança / Permissões', icon: Lock, description: 'Login, senhas e acessos (Próxima Fase).' },
        { id: 'user', title: 'Dados do Usuário', icon: Users, description: 'Configurações pessoais.' },
    ];

    if (activeView === 'ativos') {
        return (
            <div className="p-4 pb-24 max-w-md mx-auto w-full">
                <PageHeader setTela={setTela} title="Configurações" icon={Settings} colorClass="bg-gray-600" />
                <button onClick={() => setActiveView('main')} className="flex items-center gap-1 text-sm font-medium text-gray-500 hover:text-blue-600 mb-4 p-1"><ArrowLeft className="w-4 h-4" /> Voltar ao Menu</button>
                <h2 className="text-xl font-bold text-gray-800 mb-4 border-b pb-2">Gerenciar Listas</h2>

                <div className="space-y-2">
                    {/* Renderiza todos os módulos definidos no ASSET_DEFINITIONS */}
                    {Object.keys(ASSET_DEFINITIONS).map((key) => {
                        const def = ASSET_DEFINITIONS[key];
                        const styles = COLOR_MAP[def.color];
                        
                        return (
                            <details key={key} className={`group border rounded-lg bg-white overflow-hidden shadow-sm ${styles.border}`}>
                                <summary className={`p-4 cursor-pointer flex justify-between items-center font-bold text-gray-700 hover:bg-gray-50 transition-colors`}>
                                    <div className="flex items-center gap-2">
                                        <div className={`w-3 h-3 rounded-full ${styles.bg}`}></div>
                                        {def.title}
                                    </div>
                                    <div className="text-gray-400 group-open:hidden"><Plus className="w-5 h-5" /></div>
                                    <div className="text-gray-400 hidden group-open:block"><Minus className="w-5 h-5" /></div>
                                </summary>
                                <div className="p-4 border-t bg-gray-50 animate-in slide-in-from-top-2 duration-200">
                                    <SmartListManager assetKey={key} />
                                </div>
                            </details>
                        );
                    })}
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-4 p-4 pb-24 max-w-md mx-auto w-full">
            <PageHeader setTela={setTela} title="Configurações" icon={Settings} colorClass="bg-gray-600" />
            <h2 className="text-xl font-bold text-gray-800 mb-4 border-b pb-2">Menu Principal</h2>

            <div className="bg-white border-2 rounded-xl p-4 shadow-sm space-y-3">
                {settingsMenu.map((item) => (
                    <button key={item.id} onClick={() => setActiveView(item.id as 'main' | 'ativos')} className="w-full text-left p-4 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors flex items-center gap-3 border">
                        <item.icon className="w-6 h-6 text-indigo-600 flex-shrink-0" />
                        <div><p className="font-bold text-gray-800">{item.title}</p><p className="text-xs text-gray-500">{item.description}</p></div>
                    </button>
                ))}
            </div>
            <div className="bg-white p-6 rounded-lg shadow-md text-center border-2"><Settings className="w-12 h-12 text-gray-400 mx-auto mb-4" /><p className="text-gray-600">Versão 3.5 - Módulo Configurações</p></div>
        </div>
    );
}