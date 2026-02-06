import React from 'react';
import { Truck } from 'lucide-react';

interface RenewalStepSelectionProps {
    selectedMachines: any[];
}

export default function RenewalStepSelection({ selectedMachines }: RenewalStepSelectionProps) {
    return (
        <div className="p-6 space-y-4 animate-in slide-in-from-right-5">
            <h3 className="text-lg font-bold text-gray-800">Verifique os Ativos Selecionados</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {selectedMachines.map((m: any) => (
                    <div key={m.id} className="bg-gray-50 p-4 rounded-2xl border border-gray-100 flex items-center gap-4">
                        <div className="p-2 bg-indigo-100 text-indigo-600 rounded-xl">
                            <Truck className="w-5 h-5" />
                        </div>
                        <div className="overflow-hidden">
                            <p className="font-bold text-gray-900 truncate">{m.nome}</p>
                            <p className="text-[10px] text-gray-500 uppercase font-black truncate">{m.fabricante} • {m.descricao}</p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
