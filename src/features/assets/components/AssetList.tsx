import React from 'react';
import { Info } from 'lucide-react';
import { AssetListItem } from './AssetListItem';

interface AssetListProps {
    title: string;
    assetKey: string;
    type: 'simple' | 'complex';
    fields: any[];
    dbAssets: any;
    showPositioner?: boolean;
    listToRender: any[];
    selectedIds: string[];
    isSelectingBulk: boolean;
    setIsSelectingBulk: (v: boolean) => void;
    onToggleSelect: (id: string) => void;
    onToggleSelectAll: () => void;
    onEdit: (item: any) => void;
    onDelete: (item: any) => void;
    onMove: (item: any, direction: 'up' | 'down') => void;
    setSelectedIds: (ids: string[]) => void;
}

export function AssetList({
    title,
    assetKey,
    type,
    fields,
    dbAssets,
    showPositioner,
    listToRender,
    selectedIds,
    isSelectingBulk,
    setIsSelectingBulk,
    onToggleSelect,
    onToggleSelectAll,
    onEdit,
    onDelete,
    onMove,
    setSelectedIds
}: AssetListProps) {
    return (
        <div className="space-y-3 animate-in fade-in zoom-in-95 duration-200">
            {assetKey === 'maquinas' && isSelectingBulk && listToRender.length > 0 && (
                <div className="bg-indigo-50 border border-indigo-100 p-3 rounded-lg flex items-start gap-2 mb-2 animate-in fade-in">
                    <Info className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
                    <p className="text-[10px] text-indigo-700 font-medium leading-tight">
                        💡 **Dica**: Selecione uma ou mais máquinas na lista abaixo caso queira cadastrar ou atualizar os dados de seguro da frota.
                    </p>
                </div>
            )}
            
            <div className="flex justify-between items-center px-1">
                <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider">{title} Cadastrados</h3>
                {listToRender.length > 0 && assetKey === 'maquinas' && (
                    <div className="flex items-center gap-3">
                        {!isSelectingBulk ? (
                            <button 
                                onClick={() => setIsSelectingBulk(true)}
                                className="text-xs font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 px-3 py-1.5 rounded-lg border border-indigo-200 transition-colors"
                            >
                                Selecionar Lote
                            </button>
                        ) : (
                            <div className="flex items-center gap-2 animate-in fade-in">
                                <button 
                                    onClick={() => { setIsSelectingBulk(false); setSelectedIds([]); }}
                                    className="text-[10px] font-bold text-gray-500 hover:text-gray-700 hover:bg-gray-100 px-2 py-1 rounded transition-colors"
                                >
                                    CANCELAR
                                </button>
                                <button 
                                    onClick={onToggleSelectAll}
                                    className="text-[10px] font-bold text-indigo-600 hover:underline px-2 py-1"
                                >
                                    {selectedIds.length === listToRender.length ? 'DESMARCAR TUDO' : 'SELECIONAR TUDO'}
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>
            
            {listToRender.map((item: any, index: number) => (
                <AssetListItem
                    key={item.id || index}
                    item={item}
                    index={index}
                    type={type}
                    assetKey={assetKey}
                    fields={fields}
                    dbAssets={dbAssets}
                    showPositioner={showPositioner}
                    listLength={listToRender.length}
                    isSelected={selectedIds.includes(item.id)}
                    isSelectingBulk={isSelectingBulk}
                    onToggleSelect={onToggleSelect}
                    onEdit={onEdit}
                    onDelete={onDelete}
                    onMove={onMove}
                />
            ))}
            
            {listToRender.length === 0 && (
                <div className="bg-white p-8 rounded-xl border-2 border-dashed border-gray-200 text-center">
                    <p className="text-gray-400 italic text-sm">Nenhum registro encontrado.</p>
                </div>
            )}
        </div>
    );
}
