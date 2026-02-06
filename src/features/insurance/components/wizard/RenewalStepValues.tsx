import React from 'react';
import { Truck } from 'lucide-react';
import { Input } from '../../../../components/ui/Shared';

interface RenewalStepValuesProps {
    selectedMachines: any[];
    individualData: any;
    handleIndividualChange: (id: string, field: string, value: string) => void;
}

export default function RenewalStepValues({ selectedMachines, individualData, handleIndividualChange }: RenewalStepValuesProps) {
    return (
        <div className="animate-in slide-in-from-right-5 pb-10">
            <div className="sticky top-0 bg-white z-20 py-4 px-6 border-b border-gray-100 flex justify-between items-center shadow-sm">
                <h3 className="text-lg font-bold text-gray-800">Valores Individuais</h3>
                <div className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-100 uppercase tracking-widest">
                    Ajuste por Máquina
                </div>
            </div>
            
            <div className="p-6 space-y-12 mt-4">
                {selectedMachines.map(m => {
                    const data = individualData[m.id];
                    return (
                        <div key={m.id} className="bg-white border rounded-2xl overflow-hidden shadow-sm border-gray-100 group">
                            {/* Machine Header */}
                            <div className="bg-gray-50 p-4 border-b border-gray-100 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="p-1.5 bg-indigo-100 text-indigo-600 rounded-lg">
                                        <Truck className="w-4 h-4" />
                                    </div>
                                    <div>
                                        <p className="font-black text-gray-900 leading-none">{m.nome}</p>
                                        <p className="text-[10px] text-gray-500 font-bold uppercase mt-1">{m.fabricante} • {m.descricao}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Field Grid */}
                            <div className="p-4 grid grid-cols-2 gap-x-4 gap-y-3">
                                <div className="col-span-1">
                                    <Input 
                                        label="Prêmio Pago (R$)"
                                        mask="currency"
                                        value={data.valor_seguro_pago}
                                        onChange={(e: any) => handleIndividualChange(m.id, 'valor_seguro_pago', e.target.value)}
                                        className="h-9 text-xs"
                                    />
                                </div>
                                <div className="col-span-1">
                                    <Input 
                                        label="Cobertura Geral (R$)"
                                        mask="currency"
                                        value={data.valor_cobertura}
                                        onChange={(e: any) => handleIndividualChange(m.id, 'valor_cobertura', e.target.value)}
                                        className="h-9 text-xs"
                                    />
                                </div>

                                <div className="col-span-1">
                                    <Input 
                                        label="Franquia Geral (R$)"
                                        mask="currency"
                                        value={data.franquia_geral}
                                        onChange={(e: any) => handleIndividualChange(m.id, 'franquia_geral', e.target.value)}
                                        className="h-9 text-xs"
                                    />
                                </div>
                                <div className="col-span-1">
                                    <Input 
                                        label="ou % Prejuízo"
                                        mask="percentage"
                                        value={data.franquia_geral_porc}
                                        onChange={(e: any) => handleIndividualChange(m.id, 'franquia_geral_porc', e.target.value)}
                                        className="h-9 text-xs"
                                    />
                                </div>

                                <div className="col-span-2 border-t border-gray-50 my-1 pt-3">
                                    <p className="text-[9px] font-black text-indigo-600 uppercase tracking-widest mb-2 opacity-60">Coberturas Adicionais</p>
                                </div>

                                <div className="col-span-2">
                                    <Input 
                                        label="Cobertura Elétrica (R$)"
                                        mask="currency"
                                        value={data.cobertura_eletrica}
                                        onChange={(e: any) => handleIndividualChange(m.id, 'cobertura_eletrica', e.target.value)}
                                        className="h-9 text-xs"
                                    />
                                </div>

                                <div className="col-span-1">
                                    <Input 
                                        label="Franquia Elétrica (R$)"
                                        mask="currency"
                                        value={data.franquia_eletrica}
                                        onChange={(e: any) => handleIndividualChange(m.id, 'franquia_eletrica', e.target.value)}
                                        className="h-9 text-xs"
                                    />
                                </div>
                                <div className="col-span-1">
                                    <Input 
                                        label="ou % Prejuízo"
                                        mask="percentage"
                                        value={data.franquia_eletrica_porc}
                                        onChange={(e: any) => handleIndividualChange(m.id, 'franquia_eletrica_porc', e.target.value)}
                                        className="h-9 text-xs"
                                    />
                                </div>

                                <div className="col-span-2">
                                    <Input 
                                        label="Franquia Vidros/Retrovisores (R$)"
                                        mask="currency"
                                        value={data.franquia_vidros}
                                        onChange={(e: any) => handleIndividualChange(m.id, 'franquia_vidros', e.target.value)}
                                        className="h-9 text-xs"
                                    />
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
