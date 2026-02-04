import React, { useState } from 'react';
import { Plus, Trash2, ChevronDown, ChevronRight, List, FormInput, Map as MapIcon, Pencil, X, Lock, ShieldCheck, Info, ArrowUp, ArrowDown } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { PageHeader, Input, Select, TalhaoThumbnail, ConfirmModal } from '../../../components/ui/Shared';
import { useAppContext, ACTIONS } from '../../../context/AppContext';
import { U } from '../../../data/utils';
import { ASSET_DEFINITIONS } from '../../../data/assets';
import TalhaoMapEditor from './TalhaoMapEditor';
import FleetRenewalWizard from './FleetRenewalWizard';
import MaquinaTimeline from './MaquinaTimeline';

export default function AssetListEditor({ assetKey, setView }: any) {
    const { ativos, dbAssets, dispatch, genericSave, genericUpdate, genericDelete, updateAtivos, dados, fazendaId, fazendaSelecionada } = useAppContext();
    const { title, table, color, type, label, fields, placeholder, icon: Icon, orderBy, showPositioner } = ASSET_DEFINITIONS[assetKey];
    
    // Mapeamento de cores para evitar purge do Tailwind em classes dinâmicas
    const colorMap: any = {
        green: 'bg-green-600 hover:bg-green-700',
        red: 'bg-red-600 hover:bg-red-700',
        blue: 'bg-blue-600 hover:bg-blue-700',
        orange: 'bg-orange-600 hover:bg-orange-700',
        cyan: 'bg-cyan-600 hover:bg-cyan-700',
        yellow: 'bg-yellow-500 hover:bg-yellow-600',
        purple: 'bg-purple-600 hover:bg-purple-700',
        amber: 'bg-amber-600 hover:bg-amber-700',
        indigo: 'bg-indigo-600 hover:bg-indigo-700'
    };

    
    // ABA ATIVA (novo)
    const [activeTab, setActiveTab] = useState<'cadastro' | 'lista'>('cadastro');
    const [showMap, setShowMap] = useState(false);
    
    const list = dbAssets[table] || [];
    
    const [newItemName, setNewItemName] = useState('');
    const [newItemFields, setNewItemFields] = useState<any>({});
    const [openSections, setOpenSections] = useState<{[key: string]: boolean}>({});
    const [editingItem, setEditingItem] = useState<any>(null);
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [isWizardOpen, setIsWizardOpen] = useState(false);
    const [formTab, setFormTab] = useState<'dados' | 'historico'>('dados');
    const [itemToDelete, setItemToDelete] = useState<any>(null);

    const buttonColorClass = editingItem ? colorMap['amber'] : (colorMap[color] || colorMap['green']);
    
    const isDbAsset = !!table;

    const toggleSection = (key: string) => {
        setOpenSections(prev => ({ ...prev, [key]: !prev[key] }));
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
                <form onSubmit={handleAdd} className={`bg-white p-4 rounded-xl shadow-md grid grid-cols-2 gap-x-4 gap-y-1 group border-l-4 border-${editingItem ? 'amber' : color}-500 animate-in slide-in-from-left-5`}>
                    <div className="col-span-2 flex justify-between items-center mb-2">
                        <p className="text-sm font-bold text-gray-700 uppercase tracking-tight">
                            {editingItem ? `Editando: ${editingItem.nome || label}` : `Novo(a) ${label}`}
                        </p>
                        
                        {editingItem && assetKey === 'maquinas' && (
                            <div className="flex bg-gray-50 p-0.5 rounded-lg border border-gray-100 mb-2">
                                <button 
                                    type="button"
                                    onClick={() => setFormTab('dados')}
                                    className={`px-3 py-1 text-[10px] font-bold rounded-md transition-all ${formTab === 'dados' ? 'bg-white shadow-sm text-gray-900 border border-gray-100' : 'text-gray-400'}`}
                                >
                                    DADOS
                                </button>
                                <button 
                                    type="button"
                                    onClick={() => setFormTab('historico')}
                                    className={`px-3 py-1 text-[10px] font-bold rounded-md transition-all ${formTab === 'historico' ? 'bg-white shadow-sm text-gray-900 border border-gray-100' : 'text-gray-400'}`}
                                >
                                    HISTÓRICO
                                </button>
                            </div>
                        )}

                        {editingItem && (
                            <button 
                                type="button"
                                onClick={() => { setEditingItem(null); setNewItemName(''); setNewItemFields({}); setActiveTab('lista'); }}
                                className="flex items-center gap-1 text-[10px] font-bold text-amber-600 hover:text-amber-700"
                            >
                                <X className="w-3 h-3" /> CANCELAR
                            </button>
                        )}
                    </div>

                    {type === 'simple' && (
                        <div className="col-span-2">
                            <Input 
                                label={<>{label} <span className="text-red-500">*</span></>}
                                value={newItemName} 
                                onChange={(e: any) => setNewItemName(e.target.value)} 
                                placeholder={placeholder || "Ex: Novo item..."} 
                                required 
                                readOnly={!!editingItem}
                                className={editingItem ? 'bg-gray-50 opacity-70' : ''}
                            />
                            {editingItem && (
                                <p className="text-[10px] text-amber-600 mt-1 flex items-center gap-1 font-medium">
                                    <Lock className="w-2 h-2" /> O código de identificação não pode ser alterado para preservar o histórico.
                                </p>
                            )}
                        </div>
                    )}
                    
                    {type === 'complex' && (() => {
                        if (editingItem && assetKey === 'maquinas' && formTab === 'historico') {
                            const osList = dbAssets.os || [];
                            return <div className="col-span-2"><MaquinaTimeline machineId={editingItem.id} osList={osList} /></div>;
                        }

                        let isCurrentVisible = true;
                        const situacaoAtual = newItemFields['situacao_financeira'] || '';
                        const isFormLiquidado = String(situacaoAtual).toLowerCase().includes('liquidado');
                        const financeKeys = ['banco_alienacao', 'data_final_alienacao', 'numero_contrato'];

                        return fields.filter((f: any) => !f.hidden).map((f: any) => {
                            if (f.isHeader) {
                                const sectionId = f.key;
                                isCurrentVisible = !f.isCollapsible || openSections[sectionId];
                                const SectionIcon = f.icon;
                                return (
                                    <div key={f.key} className="col-span-2 pt-2 mb-1">
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

                            if (f.type === 'info') {
                                return (
                                    <div key={f.key} className="col-span-2 bg-blue-50 border border-blue-100 p-3 rounded-lg flex items-start gap-2 my-2 animate-pulse-subtle">
                                        <div className="flex-1">
                                            <p className="text-[10px] font-bold text-blue-700 uppercase mb-0.5">{f.label}</p>
                                            <p className="text-[10px] text-blue-600 leading-relaxed font-medium">{f.legend}</p>
                                        </div>
                                    </div>
                                );
                            }

                            if (!isCurrentVisible) return null;
                            if (f.dependsOn) {
                                const val = newItemFields[f.dependsOn.key] || '';
                                const target = f.dependsOn.value;
                                const isVisible = Array.isArray(target) 
                                    ? target.includes(val) 
                                    : val === target;
                                if (!isVisible) return null;
                            }

                            const gridClass = f.half ? 'col-span-1' : 'col-span-2';

                            if (f.type === 'select') {
                                let finalOptions = f.options || [];
                                
                                 if (f.optionsFrom) {
                                     let sourceTable = '';
                                     if (typeof f.optionsFrom === 'string') {
                                         sourceTable = f.optionsFrom;
                                     } else if (f.dependsOn) {
                                         const parentVal = newItemFields[f.dependsOn.key];
                                         sourceTable = f.optionsFrom[parentVal];
                                     }

                                     if (sourceTable) {
                                         let sourceList = dbAssets[sourceTable] || [];
                                         if (sourceTable === 'locais_monitoramento' && f.dependsOn) {
                                             const parentVal = newItemFields[f.dependsOn.key];
                                             const typeMap: any = { "Medidor de Energia": "energia" };
                                             const subType = typeMap[parentVal];
                                             if (subType) sourceList = sourceList.filter((i: any) => i.tipo === subType);
                                         }
                                         finalOptions = sourceList.map((i: any) => ({
                                             value: i.id || i.nome || i.titulo,
                                             label: i.nome || i.titulo || i.id
                                         }));
                                     }
                                 }

                                 const currentVal = newItemFields[f.key] || f.default || '';
                                const isLocked = editingItem && (financeKeys.includes(f.key) || f.key === 'situacao_financeira') && isFormLiquidado;

                                return (
                                    <div key={f.key} className={gridClass}>
                                        <Select
                                            label={<>{f.label} {f.required && <span className="text-red-500">*</span>}</>}
                                            value={currentVal}
                                            onChange={(e: any) => !isLocked && setNewItemFields({ ...newItemFields, [f.key]: e.target.value })}
                                            required={f.required}
                                            disabled={isLocked}
                                            className={isLocked ? 'bg-gray-100 font-bold border-gray-300 opacity-90 cursor-not-allowed text-gray-700 pointer-events-none select-none' : ''}
                                        >
                                             <option value="">Selecione...</option>
                                             {finalOptions?.map((opt: any) => {
                                                 const val = typeof opt === 'object' ? opt.value : opt;
                                                 const lab = typeof opt === 'object' ? opt.label : opt;
                                                 return <option key={val} value={val}>{lab}</option>;
                                             })}
                                        </Select>
                                    </div>
                                );
                            }

                            if (f.key === 'area_ha' && assetKey === 'talhoes') {
                                return (
                                    <div key={f.key} className="col-span-2 space-y-2">
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
                                        
                                        {newItemFields.geometry && (
                                            <div className="mt-4 flex flex-col items-center justify-center bg-gray-50/30 rounded-2xl p-4 border border-dashed border-gray-200 animate-in zoom-in-95 duration-500">
                                                <TalhaoThumbnail 
                                                    geometry={newItemFields.geometry} 
                                                    size={180} 
                                                    color="#10b981"
                                                />
                                                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-3">Visualização do Talhão</p>
                                            </div>
                                        )}
                                    </div>
                                );
                            }

                            const suggestions = getSuggestions(f.key);

                                    const isFinanceLocked = editingItem && financeKeys.includes(f.key) && isFormLiquidado;
                                    const isIdLocked = !!editingItem && f.key === 'nome';
                                    const isLocked = isIdLocked || isFinanceLocked;

                                    return (
                                        <div key={f.key} className={`${gridClass} relative`}>
                                            <Input 
                                                label={<>{f.label} {f.required && <span className="text-red-500">*</span>}</>}
                                                value={newItemFields[f.key] || ''} 
                                                onChange={(e: any) => !isLocked && setNewItemFields({ ...newItemFields, [f.key]: e.target.value })} 
                                                type={f.type === 'number' ? 'text' : f.type || 'text'} 
                                                numeric={f.type === 'number' || f.numeric}
                                                mask={f.mask}
                                                placeholder={f.placeholder || placeholder} 
                                                required={f.required}
                                                readOnly={isLocked}
                                                className={isLocked ? 'bg-gray-100 font-bold border-gray-300 opacity-90 cursor-not-allowed text-gray-700 pointer-events-none select-none' : ''}
                                                list={suggestions.length > 0 ? `list-${f.key}` : undefined}
                                            />
                                    {suggestions.length > 0 && (
                                        <datalist id={`list-${f.key}`}>
                                            {suggestions.map((s: any) => <option key={s} value={s} />)}
                                        </datalist>
                                    )}
                                    {f.mask === 'percentage' && (
                                        <span className="absolute right-3 top-[34px] text-xs font-bold text-gray-400">
                                            %
                                        </span>
                                    )}
                                    {editingItem && f.key === 'nome' && (
                                        <p className="text-[9px] text-amber-600 mt-1 flex items-center gap-1 font-semibold leading-tight px-1">
                                            <Lock className="w-2 h-2 shrink-0" /> Chave de identificação bloqueada.
                                        </p>
                                    )}
                                </div>
                            );
                        });
                    })()}
                    
                    
                    <button type="submit" className={`col-span-2 ${buttonColorClass} text-white font-bold py-3 rounded-lg transition-colors flex items-center justify-center gap-2 shadow-sm mt-4 uppercase text-xs tracking-widest`}>
                        {editingItem ? <><Pencil className="w-4 h-4"/> Salvar Alterações</> : <><Plus className="w-5 h-5"/> Adicionar {label}</>}
                    </button>

                </form>
            ) : (
                <div className="space-y-3 animate-in fade-in zoom-in-95 duration-200">
                    {assetKey === 'maquinas' && listToRender.length > 0 && (
                        <div className="bg-indigo-50 border border-indigo-100 p-3 rounded-lg flex items-start gap-2 mb-2">
                            <Info className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
                            <p className="text-[10px] text-indigo-700 font-medium leading-tight">
                                💡 **Dica**: Selecione uma ou mais máquinas na lista abaixo caso queira cadastrar ou atualizar os dados de seguro da frota.
                            </p>
                        </div>
                    )}
                    <div className="flex justify-between items-center px-1">
                        <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider">{title} Cadastrados</h3>
                        {listToRender.length > 0 && assetKey === 'maquinas' && (
                            <button 
                                onClick={toggleSelectAll}
                                className="text-[10px] font-bold text-indigo-600 hover:underline"
                            >
                                {selectedIds.length === listToRender.length ? 'DESMARCAR TUDO' : 'SELECIONAR TUDO'}
                            </button>
                        )}
                    </div>
                    {listToRender.map((item: any, index: number) => {
                        const isSelected = selectedIds.includes(item.id);
                        return (
                            <div 
                                key={item.id || index} 
                                className={`flex items-center gap-3 bg-white p-4 rounded-xl shadow-sm border transition-all ${isSelected ? 'border-indigo-400 bg-indigo-50/10' : 'border-gray-100'}`}
                            >
                                {assetKey === 'maquinas' && (
                                    <div 
                                        onClick={() => toggleSelect(item.id)}
                                        className={`w-5 h-5 rounded border-2 flex items-center justify-center cursor-pointer transition-colors ${isSelected ? 'bg-indigo-600 border-indigo-600' : 'border-gray-300 bg-white'}`}
                                    >
                                        {isSelected && <div className="w-2 h-2 bg-white rounded-sm" />}
                                    </div>
                                )}
                                <div className="flex-1 min-w-0" onClick={() => assetKey === 'maquinas' && toggleSelect(item.id)}>
                                <p className="font-bold text-gray-900 truncate text-base">{item.nome}</p>
                                {type === 'complex' && fields.filter((f: any) => f.showInList && f.key !== 'nome').map((f: any) => {
                                    let displayVal = item[f.key] || '-';

                                    if (f.type === 'date') {
                                        displayVal = U.formatDate(item[f.key]);
                                    } else if (f.mask === 'currency' || f.mask === 'decimal' || f.mask === 'metric' || f.mask === 'percentage') {
                                        displayVal = U.formatValue(item[f.key]);
                                    } else if (f.type === 'select' && f.optionsFrom) {
                                        // Tenta resolver o nome a partir do ID se for uma relação
                                        const sourceTable = typeof f.optionsFrom === 'string' ? f.optionsFrom : (f.dependsOn ? f.optionsFrom[item[f.dependsOn.key]] : null);
                                        if (sourceTable) {
                                            const related = (dbAssets[sourceTable] || []).find((r: any) => r.id === item[f.key] || r.nome === item[f.key]);
                                            if (related) displayVal = related.nome || related.titulo || related.id;
                                        }
                                    }

                                    return (
                                        <p key={f.key} className="text-xs text-gray-500 truncate mt-0.5">
                                            {f.label}: <span className="font-semibold text-gray-700">{displayVal}</span>
                                        </p>
                                    );
                                })}
                                
                                {assetKey === 'talhoes' && item.geometry && (
                                    <div className="mt-4 pt-3 border-t border-gray-100 flex justify-center bg-gray-50/50 rounded-xl p-2 animate-in fade-in slide-in-from-top-2 duration-500">
                                        <TalhaoThumbnail 
                                            geometry={item.geometry} 
                                            size={160} 
                                            color="#10b981"
                                        />
                                    </div>
                                )}
                            </div>
                            <div className="flex items-center gap-1 ml-3">
                                {showPositioner && (
                                    <div className="flex flex-col gap-1 mr-2 border-r pr-2 border-gray-100">
                                        <button 
                                            onClick={() => handleMove(item, 'up')}
                                            disabled={index === 0}
                                            className={`p-1.5 rounded-lg transition-colors ${index === 0 ? 'text-gray-200' : 'text-gray-400 hover:bg-gray-100 hover:text-gray-900'}`}
                                        >
                                            <ArrowUp className="w-4 h-4" />
                                        </button>
                                        <button 
                                            onClick={() => handleMove(item, 'down')}
                                            disabled={index === listToRender.length - 1}
                                            className={`p-1.5 rounded-lg transition-colors ${index === listToRender.length - 1 ? 'text-gray-200' : 'text-gray-400 hover:bg-gray-100 hover:text-gray-900'}`}
                                        >
                                            <ArrowDown className="w-4 h-4" />
                                        </button>
                                    </div>
                                )}
                                <button 
                                    onClick={() => startEdit(item)} 
                                    className="p-2.5 text-blue-500 hover:bg-blue-50 rounded-xl transition-colors border border-transparent hover:border-blue-100"
                                    title="Editar"
                                >
                                    <Pencil className="w-5 h-5"/>
                                </button>
                                <button 
                                    onClick={() => handleDelete(item.original || item)} 
                                    className="p-2.5 text-red-500 hover:bg-red-50 rounded-xl transition-colors border border-transparent hover:border-red-100"
                                    title="Excluir"
                                >
                                    <Trash2 className="w-5 h-5"/>
                                </button>
                                </div>
                            </div>
                        );
                    })}
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
                    initialGeoJSON={editingItem ? { ...newItemFields.geometry, id: editingItem.id, talhao_id: editingItem.id } : newItemFields.geometry}
                    existingTalhoes={listToRender}
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

            {/* BOTÃO FLUTUANTE DE AÇÃO EM MASSA */}
            {selectedIds.length > 0 && assetKey === 'maquinas' && (
                <div className="fixed bottom-24 left-1/2 -translate-x-1/2 w-[90%] max-w-md z-[1100] animate-in slide-in-from-bottom-5">
                    <button 
                        onClick={() => setIsWizardOpen(true)}
                        className="w-full bg-indigo-600 text-white font-black py-4 rounded-2xl shadow-2xl flex items-center justify-center gap-3 hover:bg-indigo-700 transition-all active:scale-95 border-2 border-indigo-400/30"
                    >
                        <ShieldCheck className="w-5 h-5" />
                        CADASTRAR SEGURO DA FROTA ({selectedIds.length})
                    </button>
                </div>
            )}

            {isWizardOpen && (
                <FleetRenewalWizard 
                    selectedMachines={listToRender.filter((m: any) => selectedIds.includes(m.id))}
                    onClose={() => {
                        setIsWizardOpen(false);
                        setSelectedIds([]);
                        setActiveTab('lista');
                    }}
                />
            )}

            <ConfirmModal 
                isOpen={!!itemToDelete}
                onClose={() => setItemToDelete(null)}
                onConfirm={confirmDelete}
                title={`Excluir ${label}`}
                message={`Tem certeza que deseja excluir "${itemToDelete?.nome || label}"? Esta ação não pode ser desfeita.`}
                confirmText="Excluir"
                variant="danger"
            />

            {/* BOTÃO FLUTUANTE PARA ADICIONAR (Quando na aba de lista) */}
            {activeTab === 'lista' && (
                <div className="fixed bottom-24 right-6 z-[1200] animate-in zoom-in duration-300">
                    <button 
                        onClick={() => setActiveTab('cadastro')}
                        className={`w-14 h-14 ${colorMap[color] || colorMap['green']} text-white rounded-full shadow-2xl flex items-center justify-center hover:scale-110 active:scale-95 transition-all outline-none border-4 border-white`}
                        title={`Adicionar Novo(a) ${label}`}
                    >
                        <Plus className="w-8 h-8" />
                    </button>
                </div>
            )}
        </div>

    );
}
