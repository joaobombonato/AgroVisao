import React from 'react';
import { Plus, Beaker } from 'lucide-react';
import { SearchableSelect } from '../../../components/ui/Shared';

interface RecItemFormProps {
    item: any;
    setItem: (item: any) => void;
    classesFiltradas: any[];
    produtosFiltrados: any[];
    handleAddItem: () => void;
}

export default function RecItemForm({ 
    item, 
    setItem, 
    classesFiltradas, 
    produtosFiltrados, 
    handleAddItem 
}: RecItemFormProps) {
    return (
        <div className="bg-green-50 p-3 rounded-lg border border-green-200 space-y-3">
            <p className="text-xs font-bold text-green-700 uppercase tracking-widest border-b pb-1 mb-1 mt-1 text-center flex justify-center gap-1">
                <span className="text-red-500">***</span>
                <Beaker className="w-5 h-5"/> Composição da Calda 
                <span className="text-red-500">***</span>
            </p>
            
            <SearchableSelect 
                label="Classe Agronômica (Filtro)" 
                placeholder="Filtrar por Classe... Ex: Herbicida" 
                options={classesFiltradas} 
                value={item.classe} 
                onChange={(e: any) => setItem({ ...item, classe: e.target.value, produto: '' })} 
                color="green" 
            />
            
            <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                    <SearchableSelect 
                        label="Insumo" 
                        placeholder={item.classe ? `Buscar ${item.classe}...` : "Buscar o Insumo... Ex: Glifosato"} 
                        options={produtosFiltrados} 
                        value={item.produto} 
                        onChange={(e: any) => setItem({ ...item, produto: e.target.value })} 
                        color="green" 
                    />
                </div>
                
                <div className="space-y-1">
                    <label className="block text-xs font-bold text-gray-700">Dose / Qtd</label>
                    <input 
                        type="text" 
                        placeholder="Informe... Ex: 2L/ha" 
                        value={item.dose} 
                        onChange={(e: any) => setItem({ ...item, dose: e.target.value })} 
                        className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg text-sm focus:border-green-500 focus:outline-none"
                    />
                </div>

                <button 
                    type="button" 
                    onClick={handleAddItem} 
                    className="bg-green-600 text-white rounded-lg flex items-center justify-center gap-2 shadow-md active:scale-95 font-bold text-sm"
                >
                    <Plus className="w-5 h-5"/> Incluir
                </button>
            </div>
        </div>
    );
}
