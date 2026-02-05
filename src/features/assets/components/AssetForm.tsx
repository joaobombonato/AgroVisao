import React from 'react';
import { Plus, ChevronDown, ChevronRight, Map as MapIcon, Pencil, X, Lock } from 'lucide-react';
import { Input, Select, TalhaoThumbnail } from '../../../components/ui/Shared';
import MaquinaTimeline from './MaquinaTimeline';

interface AssetFormProps {
    assetKey: string;
    color: string;
    type: 'simple' | 'complex';
    label: string;
    fields: any[];
    placeholder?: string;
    dbAssets: any;
    
    // Estados
    editingItem: any;
    newItemName: string;
    newItemFields: any;
    openSections: {[key: string]: boolean};
    formTab: 'dados' | 'historico';
    
    // Setters
    setNewItemName: (val: string) => void;
    setNewItemFields: (val: any) => void;
    setFormTab: (tab: 'dados' | 'historico') => void;
    setShowMap: (show: boolean) => void;
    
    // Handlers
    onSubmit: (e: React.FormEvent) => void;
    onCancel: () => void;
    toggleSection: (key: string) => void;
    getSuggestions: (fieldKey: string) => string[];
}

export function AssetForm({
    assetKey,
    color,
    type,
    label,
    fields,
    placeholder,
    dbAssets,
    editingItem,
    newItemName,
    newItemFields,
    openSections,
    formTab,
    setNewItemName,
    setNewItemFields,
    setFormTab,
    setShowMap,
    onSubmit,
    onCancel,
    toggleSection,
    getSuggestions,
}: AssetFormProps) {
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

    const buttonColorClass = editingItem ? colorMap['amber'] : (colorMap[color] || colorMap['green']);

    const renderComplexFields = () => {
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
    };

    return (
        <form onSubmit={onSubmit} className={`bg-white p-4 rounded-xl shadow-md grid grid-cols-2 gap-x-4 gap-y-1 group border-l-4 border-${editingItem ? 'amber' : color}-500 animate-in slide-in-from-left-5`}>
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
                        onClick={onCancel}
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
            
            {type === 'complex' && renderComplexFields()}
            
            <button type="submit" className={`col-span-2 ${buttonColorClass} text-white font-bold py-3 rounded-lg transition-colors flex items-center justify-center gap-2 shadow-sm mt-4 uppercase text-xs tracking-widest`}>
                {editingItem ? <><Pencil className="w-4 h-4"/> Salvar Alterações</> : <><Plus className="w-5 h-5"/> Adicionar {label}</>}
            </button>
        </form>
    );
}
