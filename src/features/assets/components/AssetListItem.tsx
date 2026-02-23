import React from 'react';
import { Pencil, Trash2, ArrowUp, ArrowDown } from 'lucide-react';
import { TalhaoThumbnail } from '../../../components/ui/Shared';
import { U } from '../../../utils';

interface AssetListItemProps {
    item: any;
    index: number;
    type: 'simple' | 'complex';
    assetKey: string;
    fields: any[];
    dbAssets: any;
    showPositioner?: boolean;
    listLength: number;
    isSelected: boolean;
    isSelectingBulk?: boolean;
    onToggleSelect: (id: string) => void;
    onEdit: (item: any) => void;
    onDelete: (item: any) => void;
    onMove: (item: any, direction: 'up' | 'down') => void;
}

export function AssetListItem({
    item,
    index,
    type,
    assetKey,
    fields,
    dbAssets,
    showPositioner,
    listLength,
    isSelected,
    isSelectingBulk,
    onToggleSelect,
    onEdit,
    onDelete,
    onMove,
}: AssetListItemProps) {
    return (
        <div 
            className={`flex items-center gap-3 bg-white p-4 rounded-xl shadow-sm border transition-all ${isSelected ? 'border-indigo-400 bg-indigo-50/10' : 'border-gray-100'}`}
        >
            {assetKey === 'maquinas' && isSelectingBulk && (
                <div 
                    onClick={() => onToggleSelect(item.id)}
                    className={`w-5 h-5 rounded border-2 flex items-center justify-center cursor-pointer transition-colors ${isSelected ? 'bg-indigo-600 border-indigo-600' : 'border-gray-300 bg-white'}`}
                >
                    {isSelected && <div className="w-2 h-2 bg-white rounded-sm" />}
                </div>
            )}
            
            <div className="flex-1 min-w-0" onClick={() => assetKey === 'maquinas' && isSelectingBulk && onToggleSelect(item.id)}>
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
                            onClick={() => onMove(item, 'up')}
                            disabled={index === 0}
                            className={`p-1.5 rounded-lg transition-colors ${index === 0 ? 'text-gray-200' : 'text-gray-400 hover:bg-gray-100 hover:text-gray-900'}`}
                        >
                            <ArrowUp className="w-4 h-4" />
                        </button>
                        <button 
                            onClick={() => onMove(item, 'down')}
                            disabled={index === listLength - 1}
                            className={`p-1.5 rounded-lg transition-colors ${index === listLength - 1 ? 'text-gray-200' : 'text-gray-400 hover:bg-gray-100 hover:text-gray-900'}`}
                        >
                            <ArrowDown className="w-4 h-4" />
                        </button>
                    </div>
                )}
                <button 
                    onClick={() => onEdit(item)} 
                    className="p-2.5 text-blue-500 hover:bg-blue-50 rounded-xl transition-colors border border-transparent hover:border-blue-100"
                    title="Editar"
                >
                    <Pencil className="w-5 h-5"/>
                </button>
                <button 
                    onClick={() => onDelete(item.original || item)} 
                    className="p-2.5 text-red-500 hover:bg-red-50 rounded-xl transition-colors border border-transparent hover:border-red-100"
                    title="Excluir"
                >
                    <Trash2 className="w-5 h-5"/>
                </button>
            </div>
        </div>
    );
}
