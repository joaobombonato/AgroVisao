import React, { useState, useEffect } from 'react';
import { Settings, Plus, Trash2, Edit2, Check, X, ListPlus, Save, Sun, Lock, Users, ArrowLeft, ArrowUp, ArrowDown, Minus, Sliders, Fuel, Zap, Utensils, Wrench } from 'lucide-react';
import { PageHeader, Input } from '../components/ui/Shared';
import { useAppContext, ACTIONS } from '../context/AppContext';
import { toast } from 'react-hot-toast';
import { ATIVOS_INICIAIS } from '../data/constants';

// ===========================================
// 1. DEFINIÇÕES DE ATIVOS (LISTAS)
// ===========================================
const ASSET_DEFINITIONS: any = {
    tiposRefeicao: { title: 'Tipos de Refeição', color: 'orange', type: 'simple', label: 'Nome' },
    centrosCusto:  { title: 'Centros de Custo',  color: 'orange', type: 'simple', label: 'Nome' },
    maquinas:      { title: 'Máquinas / Veículos', color: 'red', type: 'simple', label: 'Identificação' },
    safras:        { title: 'Safras', color: 'green', type: 'simple', label: 'Ano Safra' },
    culturas:      { title: 'Culturas', color: 'green', type: 'simple', label: 'Nome' },
    classes:       { title: 'Classes (Defensivos)', color: 'green', type: 'simple', label: 'Nome' },
    talhoes:       { title: 'Talhões', color: 'green', type: 'talhao', label: 'Nome' },
    produtos:      { title: 'Produtos / Insumos', color: 'green', type: 'produto', label: 'Nome Comercial' },
    tiposDocumento:{ title: 'Categorias de Docs', color: 'purple', type: 'simple', label: 'Nome' },
    locaisEnergia: { title: 'Locais de Energia', color: 'yellow', type: 'energia', label: 'Nome Local' },
    talhoesChuva:  { title: 'Estações Pluviometria', color: 'cyan', type: 'simple', label: 'Nome Estação' },
};

const COLOR_MAP: any = {
    orange: { bg: 'bg-orange-500', text: 'text-orange-600', border: 'border-orange-200', bgLight: 'bg-orange-50' },
    red:    { bg: 'bg-red-500',    text: 'text-red-600',    border: 'border-red-200',    bgLight: 'bg-red-50' },
    green:  { bg: 'bg-green-500',  text: 'text-green-600',  border: 'border-green-200',  bgLight: 'bg-green-50' },
    purple: { bg: 'bg-purple-500', text: 'text-purple-600', border: 'border-purple-200', bgLight: 'bg-purple-50' },
    yellow: { bg: 'bg-yellow-500', text: 'text-yellow-600', border: 'border-yellow-200', bgLight: 'bg-yellow-50' },
    cyan:   { bg: 'bg-cyan-500',   text: 'text-cyan-600',   border: 'border-cyan-200',   bgLight: 'bg-cyan-50' },
    gray:   { bg: 'bg-gray-500',   text: 'text-gray-600',   border: 'border-gray-200',   bgLight: 'bg-gray-50' },
};

// ===========================================
// 2. SUB-COMPONENTE: EDITOR DE PARÂMETROS
// ===========================================
function ParametrosEditor() {
    const { ativos, dispatch } = useAppContext();
    // Carrega valores atuais ou usa padrão do constants
    const [params, setParams] = useState(ativos.parametros || ATIVOS_INICIAIS.parametros);

    const handleChange = (section: string, key: string, value: any) => {
        setParams((prev: any) => ({
            ...prev,
            [section]: {
                ...prev[section],
                [key]: parseFloat(value) || 0 // Assume que tudo aqui é número por enquanto
            }
        }));
    };

    const salvarParametros = () => {
        // Salva preservando o resto dos ativos
        dispatch({ 
            type: ACTIONS.UPDATE_ATIVOS, 
            chave: 'parametros', 
            novaLista: params // Hack: Usamos 'novaLista' para passar o objeto params inteiro
        });
        toast.success("Parâmetros atualizados!");
    };

    return (
        <div className="space-y-4 animate-in slide-in-from-right-4 duration-300">
            {/* ESTOQUE DIESEL */}
            <div className="bg-white border-l-4 border-red-500 rounded-lg shadow-sm p-4">
                <h3 className="font-bold text-red-700 flex items-center gap-2 mb-3"><Fuel className="w-5 h-5"/> Configuração de Estoque (Diesel)</h3>
                <div className="grid grid-cols-2 gap-3">
                    <Input label="Capacidade Tanque (L)" type="number" value={params.estoque.capacidadeTanque} onChange={(e:any) => handleChange('estoque', 'capacidadeTanque', e.target.value)} />
                    <Input label="Alerta Mínimo (L)" type="number" value={params.estoque.estoqueMinimo} onChange={(e:any) => handleChange('estoque', 'estoqueMinimo', e.target.value)} />
                    <div className="col-span-2">
                        <Input label="Ajuste de Saldo / Saldo Inicial (L)" type="number" value={params.estoque.ajusteManual} onChange={(e:any) => handleChange('estoque', 'ajusteManual', e.target.value)} />
                        <p className="text-[10px] text-gray-500 mt-1">Use este campo para calibrar o estoque caso haja divergência física.</p>
                    </div>
                </div>
            </div>

            {/* FINANCEIRO / REFEIÇÕES */}
            <div className="bg-white border-l-4 border-orange-500 rounded-lg shadow-sm p-4">
                <h3 className="font-bold text-orange-700 flex items-center gap-2 mb-3"><Utensils className="w-5 h-5"/> Custos Padronizados</h3>
                <div className="grid grid-cols-1 gap-3">
                     <Input label="Preço Médio Refeição (R$)" type="number" value={params.financeiro.precoRefeicao} onChange={(e:any) => handleChange('financeiro', 'precoRefeicao', e.target.value)} />
                </div>
            </div>

            {/* ENERGIA */}
            <div className="bg-white border-l-4 border-yellow-500 rounded-lg shadow-sm p-4">
                <h3 className="font-bold text-yellow-700 flex items-center gap-2 mb-3"><Zap className="w-5 h-5"/> Alertas de Energia</h3>
                <div className="grid grid-cols-2 gap-3">
                     <Input label="Dia Fixo de Leitura" type="number" placeholder="Ex: 15" value={params.energia.diaLeitura} onChange={(e:any) => handleChange('energia', 'diaLeitura', e.target.value)} />
                     <Input label="Meta de Consumo (kWh)" type="number" value={params.energia.metaConsumo} onChange={(e:any) => handleChange('energia', 'metaConsumo', e.target.value)} />
                </div>
            </div>

            {/* MANUTENÇÃO */}
            <div className="bg-white border-l-4 border-gray-500 rounded-lg shadow-sm p-4">
                <h3 className="font-bold text-gray-700 flex items-center gap-2 mb-3"><Wrench className="w-5 h-5"/> Manutenção Preventiva</h3>
                <div className="grid grid-cols-1 gap-3">
                     <Input label="Avisar Revisão com antecedência de (Horas)" type="number" value={params.manutencao.alertaPreventiva} onChange={(e:any) => handleChange('manutencao', 'alertaPreventiva', e.target.value)} />
                </div>
            </div>

            <button onClick={salvarParametros} className="w-full bg-indigo-600 text-white py-3 rounded-lg font-bold shadow-lg flex items-center justify-center gap-2 hover:bg-indigo-700 active:scale-95 transition-all sticky bottom-4">
                <Save className="w-5 h-5"/> Salvar Alterações
            </button>
        </div>
    );
}

// ===========================================
// 3. SUB-COMPONENTE: GERENCIADOR DE LISTAS
// ===========================================
function SmartListManager({ assetKey }: { assetKey: string }) {
    const { ativos, dispatch } = useAppContext();
    const config = ASSET_DEFINITIONS[assetKey];
    const styles = COLOR_MAP[config.color] || COLOR_MAP.gray;
    const currentList = ativos[assetKey] || [];

    const [name, setName] = useState('');
    const [extra1, setExtra1] = useState('');
    const [editingIndex, setEditingIndex] = useState<number | null>(null);
    const [editName, setEditName] = useState('');
    const [editExtra1, setEditExtra1] = useState('');

    const getItemName = (item: any) => typeof item === 'object' ? item.nome : item;
    const getItemExtra = (item: any) => {
        if (typeof item !== 'object') return '';
        if (config.type === 'talhao') return item.area;
        if (config.type === 'energia') return item.medidor;
        if (config.type === 'produto') return item.classe;
        return '';
    };

    const handleAdd = () => {
        if (!name.trim()) return toast.error("Nome é obrigatório");
        let newItem: any = name.trim();
        if (config.type !== 'simple') {
            newItem = { nome: name.trim() };
            if (config.type === 'talhao') newItem.area = extra1;
            if (config.type === 'energia') newItem.medidor = extra1;
            if (config.type === 'produto') newItem.classe = extra1;
        }
        const novaLista = [...currentList, newItem];
        dispatch({ type: ACTIONS.UPDATE_ATIVOS, chave: assetKey, novaLista });
        setName(''); setExtra1('');
        toast.success("Adicionado!");
    };

    const handleDelete = (index: number) => {
        const novaLista = currentList.filter((_: any, i: number) => i !== index);
        dispatch({ type: ACTIONS.UPDATE_ATIVOS, chave: assetKey, novaLista });
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
        toast.success("Atualizado!");
    };

    const renderInputs = (isEdit: boolean) => {
        const valName = isEdit ? editName : name;
        const setValName = isEdit ? setEditName : setName;
        const valExtra = isEdit ? editExtra1 : extra1;
        const setValExtra = isEdit ? setEditExtra1 : setExtra1;

        return (
            <div className="flex gap-2 items-center flex-1">
                <input type="text" placeholder={config.label} value={valName} onChange={e => setValName(e.target.value)} className="flex-1 px-3 py-2 border rounded-lg text-sm min-w-0"/>
                {config.type === 'talhao' && <input type="number" placeholder="Área (ha)" className="w-20 px-2 py-2 border rounded-lg text-sm" value={valExtra} onChange={e => setValExtra(e.target.value)} />}
                {config.type === 'energia' && <input type="text" placeholder="Medidor" className="w-24 px-2 py-2 border rounded-lg text-sm" value={valExtra} onChange={e => setValExtra(e.target.value)} />}
                {config.type === 'produto' && (
                    <select className="w-28 px-2 py-2 border rounded-lg text-sm bg-white" value={valExtra} onChange={e => setValExtra(e.target.value)}>
                        <option value="">Classe...</option>
                        {(ativos.classes || []).map((c: any) => <option key={typeof c === 'string' ? c : c.nome} value={typeof c === 'string' ? c : c.nome}>{typeof c === 'string' ? c : c.nome}</option>)}
                    </select>
                )}
            </div>
        );
    };

    return (
        <div className={`bg-white border-2 ${styles.border} rounded-xl p-4 shadow-sm space-y-3`}>
            <h3 className={`font-bold text-sm ${styles.text} flex items-center gap-2 uppercase tracking-wide`}><ListPlus className="w-4 h-4"/> {config.title}</h3>
            <div className="flex gap-2">{renderInputs(false)}<button onClick={handleAdd} className={`${styles.bg} text-white p-2 rounded-lg hover:opacity-90 flex-shrink-0`}><Plus className="w-5 h-5"/></button></div>
            <div className="space-y-2 max-h-60 overflow-y-auto border p-2 rounded-lg bg-gray-50">
                {currentList.map((item: any, index: number) => {
                    const isEditing = editingIndex === index;
                    return (
                        <div key={index} className="flex items-center gap-2 bg-white p-2 border rounded-md shadow-sm group">
                            {!isEditing ? (
                                <>
                                    <div className="flex flex-col"><button onClick={() => handleMove(index, 'up')} disabled={index===0} className="text-gray-300 hover:text-blue-500"><ArrowUp className="w-3 h-3"/></button><button onClick={() => handleMove(index, 'down')} disabled={index===currentList.length-1} className="text-gray-300 hover:text-blue-500"><ArrowDown className="w-3 h-3"/></button></div>
                                    <div className="flex-1 min-w-0"><p className="text-sm font-bold text-gray-700 truncate">{getItemName(item)}</p><p className="text-[10px] text-gray-500">{getItemExtra(item)}</p></div>
                                    <div className="flex gap-1"><button onClick={() => startEdit(index, item)} className="text-blue-500 p-1"><Edit2 className="w-4 h-4"/></button><button onClick={() => handleDelete(index)} className="text-red-500 p-1"><Trash2 className="w-4 h-4"/></button></div>
                                </>
                            ) : (
                                <div className="flex-1 flex gap-2 items-center">{renderInputs(true)}<button onClick={saveEdit} className="text-green-600"><Check className="w-4 h-4"/></button><button onClick={() => setEditingIndex(null)} className="text-red-600"><X className="w-4 h-4"/></button></div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

// ===========================================
// TELA PRINCIPAL: CONFIGURAÇÕES
// ===========================================
export default function ConfiguracoesScreen() {
    const { setTela } = useAppContext();
    const [view, setView] = useState<'menu' | 'parametros' | 'listas'>('menu');

    const MenuButton = ({ icon: Icon, title, desc, onClick, color = 'bg-gray-50' }: any) => (
        <button onClick={onClick} className={`w-full text-left p-4 rounded-xl ${color} hover:brightness-95 transition-all flex items-center gap-4 border-2 border-transparent hover:border-indigo-100 shadow-sm`}>
            <div className="p-3 bg-white rounded-full shadow-sm"><Icon className="w-6 h-6 text-indigo-600" /></div>
            <div><p className="font-bold text-gray-800 text-lg">{title}</p><p className="text-xs text-gray-500">{desc}</p></div>
            <ArrowLeft className="w-5 h-5 text-gray-400 ml-auto rotate-180" />
        </button>
    );

    if (view === 'parametros') {
        return (
            <div className="p-4 pb-24 max-w-md mx-auto">
                <PageHeader setTela={() => setView('menu')} title="Parâmetros" icon={Sliders} colorClass="bg-indigo-600" backTarget="menu" />
                <ParametrosEditor />
            </div>
        );
    }

    if (view === 'listas') {
        return (
            <div className="p-4 pb-24 max-w-md mx-auto">
                <PageHeader setTela={() => setView('menu')} title="Cadastros" icon={ListPlus} colorClass="bg-indigo-600" backTarget="menu" />
                <div className="space-y-3">
                    {Object.keys(ASSET_DEFINITIONS).map((key) => {
                        const def = ASSET_DEFINITIONS[key];
                        const styles = COLOR_MAP[def.color];
                        return (
                            <details key={key} className={`group border rounded-lg bg-white overflow-hidden shadow-sm ${styles.border}`}>
                                <summary className="p-4 cursor-pointer flex justify-between items-center font-bold text-gray-700 hover:bg-gray-50">
                                    <div className="flex items-center gap-2"><div className={`w-3 h-3 rounded-full ${styles.bg}`}></div>{def.title}</div>
                                    <Plus className="w-5 h-5 text-gray-400 group-open:rotate-45 transition-transform" />
                                </summary>
                                <div className="p-4 border-t bg-gray-50"><SmartListManager assetKey={key} /></div>
                            </details>
                        );
                    })}
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
            
            <div className="text-center pt-8 opacity-50">
                <Settings className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                <p className="text-xs">Fazenda São Caetano v3.6</p>
            </div>
        </div>
    );
}