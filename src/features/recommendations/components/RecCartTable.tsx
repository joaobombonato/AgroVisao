import React from 'react';
import { Trash2 } from 'lucide-react';

interface RecCartTableProps {
    itens: any[];
    onRemove: (id: number) => void;
}

export default function RecCartTable({ itens, onRemove }: RecCartTableProps) {
    if (itens.length === 0) return null;

    return (
        <div className="border rounded-lg overflow-hidden">
            <table className="w-full text-sm text-left">
                <thead className="bg-gray-100 text-gray-600 font-bold">
                    <tr>
                        <th className="p-2">Insumo</th>
                        <th className="p-2">Dose</th>
                        <th className="p-2 w-8"></th>
                    </tr>
                </thead>
                <tbody className="divide-y">
                    {itens.map((it) => (
                        <tr key={it.id} className="bg-white">
                            <td className="p-2">{it.produto}</td>
                            <td className="p-2">{it.dose}</td>
                            <td className="p-2">
                                <button 
                                    onClick={() => onRemove(it.id)} 
                                    className="text-red-500 hover:scale-110 transition-transform"
                                >
                                    <Trash2 className="w-4 h-4"/>
                                </button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
