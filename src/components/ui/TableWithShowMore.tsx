import React, { useState } from 'react';
import { FilePen, Trash2, X, MoreHorizontal, ChevronDown } from 'lucide-react';

// --- TABLE ---
const TableRowWithAction = ({ children, onDelete, onEdit }: any) => {
    const [showActions, setShowActions] = useState(false);
    return (
        <tr className="hover:bg-gray-50 border-t">
            {children}
            <td className="px-3 py-2 text-right relative">
                {showActions ? (
                    <div className="flex justify-end gap-2 animate-in fade-in zoom-in duration-200 absolute right-2 top-2 bg-white shadow-md p-1 rounded border z-10">
                        <button onClick={() => { onEdit && onEdit(); setShowActions(false); }} className="p-1 text-blue-500 hover:bg-blue-50 rounded"><FilePen className="w-4 h-4"/></button>
                        <button onClick={() => { onDelete && onDelete(); setShowActions(false); }} className="p-1 text-red-500 hover:bg-red-50 rounded"><Trash2 className="w-4 h-4"/></button>
                        <button onClick={() => setShowActions(false)} className="p-1 text-gray-400 hover:bg-gray-100 rounded"><X className="w-4 h-4"/></button>
                    </div>
                ) : (
                    <button onClick={() => setShowActions(true)} className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded">
                        <MoreHorizontal className="w-5 h-5" />
                    </button>
                )}
            </td>
        </tr>
    )
}

export const TableWithShowMore = ({ children, data, limit = 5 }: any) => {
    const [visible, setVisible] = useState(limit);
    const hasMore = data.length > visible;
    return (
        <>
            <div className="overflow-x-auto no-scrollbar pb-2">
                <table className="w-full text-sm min-w-[350px]">
                    {/* Renderiza passando o Componente de Linha Personalizada */}
                    {children(data.slice(0, visible), TableRowWithAction)}
                </table>
            </div>
            {hasMore && (<button onClick={() => setVisible((prev:number) => prev + 5)} className="w-full py-2 text-xs font-medium text-gray-500 hover:bg-gray-50 border-t flex items-center justify-center gap-1">Ver mais <ChevronDown className="w-3 h-3"/></button>)}
        </>
    );
};
