import React from 'react';
import { SearchableSelect, Input } from '../../../components/ui/Shared';
import { U, getOperationalDateLimits } from '../../../utils';

interface RecHeaderFieldsProps {
    header: any;
    setHeader: (header: any) => void;
    ativos: any;
    handleTalhaoChange: (nome: string) => void;
    handleOperacaoChange: (nome: string) => void;
}

export default function RecHeaderFields({ 
    header, 
    setHeader, 
    ativos, 
    handleTalhaoChange, 
    handleOperacaoChange 
}: RecHeaderFieldsProps) {
    return (
        <div className="bg-gray-100 p-3 rounded-lg border space-y-3">
            <p className="text-xs font-bold text-black-800 uppercase tracking-widest border-b pb-1 mb-1 mt-1 text-center">
                <span className="text-red-500">***</span> Definição do Local <span className="text-red-500">***</span>
            </p>
            
            <Input 
                label="Data da Receita" 
                type="date" 
                value={header.data} 
                onChange={(e: any) => setHeader({ ...header, data: e.target.value })} 
                required 
                max={getOperationalDateLimits().max}
                min={getOperationalDateLimits().min}
            />

            <div className="grid grid-cols-2 gap-3">
                <SearchableSelect 
                    label="Safras" 
                    placeholder="Buscar a Safra..." 
                    options={ativos.safras} 
                    value={header.safra} 
                    onChange={(e: any) => setHeader({ ...header, safra: e.target.value })} 
                    color="green" 
                />
                <SearchableSelect 
                    label="Culturas" 
                    placeholder="Selecione..." 
                    options={ativos.culturas} 
                    value={header.cultura} 
                    onChange={(e: any) => setHeader({ ...header, cultura: e.target.value })} 
                    color="green" 
                />
            </div>
            <div className="grid grid-cols-2 gap-3">
                <SearchableSelect 
                    label="Talhões" 
                    placeholder="Ex: Pivo 01" 
                    options={ativos.talhoes} 
                    value={header.talhao} 
                    onChange={(e: any) => handleTalhaoChange(e.target.value)} 
                    color="green" 
                />
                <SearchableSelect 
                    label="Operação" 
                    placeholder="Ex: Plantio..." 
                    options={ativos.operacoesAgricolas} 
                    value={header.operacao} 
                    onChange={(e: any) => handleOperacaoChange(e.target.value)} 
                    color="green" 
                />
            </div>
            {header.area && (
                <div className="text-xs text-right text-green-600 font-bold">
                    Área: {header.area} ha
                </div>
            )}
        </div>
    );
}
