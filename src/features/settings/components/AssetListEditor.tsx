import React, { useState } from 'react';
import { Plus, Trash2, ChevronDown, ChevronRight, List, FormInput, Map as MapIcon } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { PageHeader, Input, Select } from '../../../components/ui/Shared';
import { useAppContext, ACTIONS } from '../../../context/AppContext';
import { U } from '../../../data/utils';
import { ASSET_DEFINITIONS } from '../../../data/assets';
import TalhaoMapEditor from './TalhaoMapEditor';

export default function AssetListEditor({ assetKey, setView }: any) {
    const { ativos, dbAssets, dispatch, genericSave, genericDelete, updateAtivos, dados, fazendaId, fazendaSelecionada } = useAppContext();
    const { title, table, color, type, label, fields, placeholder, icon: Icon } = ASSET_DEFINITIONS[assetKey];
    
    // ABA ATIVA (novo)
    const [activeTab, setActiveTab] = useState<'cadastro' | 'lista'>('cadastro');
    const [showMap, setShowMap] = useState(false);
    
    const list = dbAssets[table] || [];
    
    const [newItemName, setNewItemName] = useState('');
    const [newItemFields, setNewItemFields] = useState<any>({});
    const [openSections, setOpenSections] = useState<{[key: string]: boolean}>({});
    
    const isDbAsset = !!table;

    const toggleSection = (key: string) => {
        setOpenSections(prev => ({ ...prev, [key]: !prev[key] }));
    };

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        
        // --- VERIFICAÇÃO DE DUPLICIDADE ---
        const nomeParaCheck = (type === 'simple' ? newItemName : newItemFields.nome || '').trim().toLowerCase();
        const jaExiste = listToRender.some((item: any) => item.nome?.toLowerCase() === nomeParaCheck || (type === 'simple' && String(item.id || item).toLowerCase() === nomeParaCheck));
        
        if (jaExiste) {
            toast.error(`Já existe um(a) ${label} com este nome/código.`);
            return;
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
            });
        }

        const tempId = U.id('temp-asset-');
        const recordWithId = { ...newRecord, id: tempId, fazenda_id: fazendaId };
        await genericSave(table, newRecord, {
             type: ACTIONS.SET_DB_ASSETS,
             table: table, 
             records: [...list, recordWithId], 
        });
        setNewItemName('');
        setNewItemFields({});
        setOpenSections({});
        setActiveTab('lista');
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

    const handleDelete = async (item: any) => {
        if (!checkIntegrity(item)) return;
        const idToDelete = item.id;
        const newList = list.filter((i:any) => i.id !== idToDelete);
        await genericDelete(table, idToDelete, { type: ACTIONS.SET_DB_ASSETS, table: table, records: newList });
    };

    const listToRender = list.filter((item: any) => {
        if (table === 'locais_monitoramento') {
            const targetType = assetKey === 'locaisChuva' ? 'chuva' : 'energia';
            return item.tipo === targetType;
        }
        return true;
    });

    return (
        <div className="space-y-4 p-4 pb-24 max-w-md mx-auto">
            <PageHeader setTela={setView} title={title} icon={Icon} colorClass={`bg-${color}-600`} backTarget={'listas'} />
            
            {/* ABAS ESTILO CHUVAS */}
            <div className="flex bg-gray-100 p-1 rounded-xl shadow-inner mb-4">
                <button 
                   onClick={() => setActiveTab('cadastro')}
                   className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-bold transition-all ${activeTab === 'cadastro' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                >
                    <FormInput className="w-4 h-4" /> Cadastro
                </button>
                <button 
                   onClick={() => setActiveTab('lista')}
                   className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-bold transition-all ${activeTab === 'lista' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                >
                    <List className="w-4 h-4" /> Registros ({listToRender.length})
                </button>
            </div>

            {activeTab === 'cadastro' ? (
                <form onSubmit={handleAdd} className={`bg-white p-4 rounded-xl shadow-md space-y-4 border-l-4 border-${color}-500 animate-in slide-in-from-left-5`}>
                    <p className="text-sm font-bold text-gray-700 uppercase tracking-tight">Novo(a) {label}</p>

                    {type === 'simple' && (
                        <Input 
                            label={<>{label} <span className="text-red-500">*</span></>}
                            value={newItemName} 
                            onChange={(e: any) => setNewItemName(e.target.value)} 
                            placeholder={placeholder || "Ex: Novo item..."} 
                            required 
                        />
                    )}
                    
                    {type === 'complex' && (() => {
                        let isCurrentVisible = true;

                        return fields.filter((f: any) => !f.hidden).map((f: any) => {
                            if (f.isHeader) {
                                const sectionId = f.key;
                                isCurrentVisible = !f.isCollapsible || openSections[sectionId];
                                const SectionIcon = f.icon;
                                return (
                                    <div key={f.key} className="pt-2">
                                        <div 
                                            onClick={() => f.isCollapsible && toggleSection(sectionId)}
                                            className={`flex items-center justify-between p-2 rounded-lg transition-colors ${f.isCollapsible ? 'cursor-pointer hover:bg-gray-50 bg-gray-50/50' : ''}`}
                                        >
                                            <div className="flex items-center gap-2">
                                            {SectionIcon && <SectionIcon className={`w-4 h-4 ${f.isMandatory ? 'text-red-600' : `text-${color}-500`}`} />}
                                            <p className={`text-[10px] font-black uppercase tracking-widest ${f.isMandatory ? 'text-red-600' : 'text-gray-500'}`}>{f.label}</p>
                                        </div>
                                            {f.isCollapsible && (isCurrentVisible ? <ChevronDown className="w-3 h-3 text-gray-400" /> : <ChevronRight className="w-3 h-3 text-gray-400" />)}
                                        </div>
                                        {f.legend && <p className="text-[9px] text-gray-400 italic mt-1 px-2">{f.legend}</p>}
                                    </div>
                                );
                            }

                            if (!isCurrentVisible) return null;
                            if (f.dependsOn) {
                                const val = newItemFields[f.dependsOn.key];
                                if (val !== f.dependsOn.value) return null;
                            }

                            if (f.type === 'select') {
                                let finalOptions = f.options || [];
                                
                                // Lógica de Opções Dinâmicas (ex: Centros de Custo vincular a Ativos)
                                if (f.optionsFrom && f.dependsOn) {
                                    const parentVal = newItemFields[f.dependsOn.key];
                                    const sourceTable = f.optionsFrom[parentVal];
                                    if (sourceTable) {
                                        let sourceList = dbAssets[sourceTable] || [];
                                        // Filtro especial para locais de monitoramento
                                        if (sourceTable === 'locais_monitoramento') {
                                            const typeMap: any = { "Medidor de Energia": "energia" };
                                            const subType = typeMap[parentVal];
                                            if (subType) sourceList = sourceList.filter((i: any) => i.tipo === subType);
                                        }
                                        finalOptions = sourceList.map((i: any) => i.nome || i.titulo || i.id);
                                    }
                                }

                                return (
                                    <Select
                                        key={f.key}
                                        label={<>{f.label} {f.required && <span className="text-red-500">*</span>}</>}
                                        value={newItemFields[f.key] || f.default || ''}
                                        onChange={(e: any) => setNewItemFields({ ...newItemFields, [f.key]: e.target.value })}
                                        required={f.required}
                                    >
                                        <option value="">Selecione...</option>
                                        {finalOptions?.map((opt: string) => <option key={opt} value={opt}>{opt}</option>)}
                                    </Select>
                                );
                            }

                            if (f.key === 'area_ha' && assetKey === 'talhoes') {
                                return (
                                    <div key={f.key} className="space-y-2">
                                        <div className="flex items-end gap-2">
                                            <div className="flex-1">
                                                <Input 
                                                    label={<>{f.label} {f.required && <span className="text-red-500">*</span>}</>}
                                                    value={newItemFields[f.key] || ''} 
                                                    onChange={(e: any) => setNewItemFields({ ...newItemFields, [f.key]: e.target.value })} 
                                                    type="text" 
                                                    numeric
                                                    placeholder={f.placeholder || placeholder} 
                                                    required={f.required}
                                                />
                                            </div>
                                            <button 
                                                type="button"
                                                onClick={() => setShowMap(true)}
                                                className="mb-0.5 p-3 bg-indigo-50 text-indigo-600 rounded-2xl border border-indigo-100 hover:bg-indigo-100 transition-all active:scale-95 flex items-center gap-2 font-bold text-xs"
                                            >
                                                <MapIcon className="w-4 h-4" />
                                                MAPA
                                            </button>
                                        </div>
                                        {f.legend && <p className="text-[9px] text-gray-400 italic px-1">{f.legend}</p>}
                                    </div>
                                );
                            }

                            return (
                                <Input 
                                    key={f.key}
                                    label={<>{f.label} {f.required && <span className="text-red-500">*</span>}</>}
                                    value={newItemFields[f.key] || ''} 
                                    onChange={(e: any) => setNewItemFields({ ...newItemFields, [f.key]: e.target.value })} 
                                    type={f.type === 'number' ? 'text' : f.type || 'text'} 
                                    numeric={f.type === 'number' || f.numeric}
                                    placeholder={f.placeholder || placeholder} 
                                    required={f.required}
                                />
                            );
                        });
                    })()}
                    
                    <button type="submit" className={`w-full bg-${color}-600 text-white font-bold py-3 rounded-lg hover:bg-${color}-700 transition-colors flex items-center justify-center gap-2 shadow-sm mt-4`}>
                        <Plus className="w-5 h-5"/> Adicionar {label}
                    </button>
                </form>
            ) : (
                <div className="space-y-3 animate-in fade-in zoom-in-95 duration-200">
                    <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider px-1">{title} Cadastrados</h3>
                    {listToRender.map((item: any, index: number) => (
                        <div key={item.id || index} className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-gray-100 hover:border-gray-300 transition-all">
                            <div className="flex-1 min-w-0">
                                <p className="font-bold text-gray-900 truncate text-base">{item.nome}</p>
                                {type === 'complex' && fields.filter((f: any) => f.showInList && f.key !== 'nome').map((f: any) => (
                                    <p key={f.key} className="text-xs text-gray-500 truncate mt-0.5">{f.label}: <span className="font-semibold text-gray-700">{item[f.key] || '-'}</span></p>
                                ))}
                            </div>
                            <button 
                                onClick={() => handleDelete(item.original || item)} 
                                className="p-2.5 text-red-500 hover:bg-red-50 rounded-xl transition-colors ml-3 border border-transparent hover:border-red-100"
                            >
                                <Trash2 className="w-5 h-5"/>
                            </button>
                        </div>
                    ))}
                    {listToRender.length === 0 && (
                        <div className="bg-white p-8 rounded-xl border-2 border-dashed border-gray-200 text-center">
                            <p className="text-gray-400 italic text-sm">Nenhum registro encontrado.</p>
                        </div>
                    )}
                </div>
            )}

            {showMap && (
                <TalhaoMapEditor 
                    farmGeoJSON={fazendaSelecionada?.geojson}
                    initialGeoJSON={newItemFields.geometry}
                    onSave={(data) => {
                        setNewItemFields({
                            ...newItemFields,
                            geometry: data.geojson,
                            area_ha: String(data.areaHectares).replace('.', ',')
                        });
                        toast.success("Área integrada com sucesso!");
                    }}
                    onClose={() => setShowMap(false)}
                />
            )}
        </div>
    );
}
