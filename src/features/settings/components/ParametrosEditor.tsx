import React, { useState } from 'react';
import { Save, Sliders, Zap, Fuel, AlertTriangle, Home } from 'lucide-react';
import { PageHeader, Input } from '../../../components/ui/Shared';
import { U } from '../../../data/utils';

export default function ParametrosEditor({ currentParams, onSave, onBack }: any) {
    // Inicialização Defensiva do Estado para evitar crash de undefined
    const [form, setForm] = useState(() => {
        const safeParams = currentParams || {};
        // Se currentParams vier vazio ou incompleto, garantimos a estrutura
        return {
            fazendaNome: safeParams.fazendaNome || '',
            energia: safeParams.energia || { custoKwh: '', metaConsumo: '' },
            estoque: safeParams.estoque || { capacidadeTanque: '', estoqueMinimo: '' },
            manutencao: safeParams.manutencao || { alertaPreventiva: '' },
            ...safeParams // Sobrescreve com o que existir de verdade
        };
    });

    const handleChange = (section: string, field: string, value: string) => {
        if (section === 'root') {
             setForm((prev: any) => ({ ...prev, [field]: value }));
             return;
        }

        setForm((prev: any) => ({
            ...prev,
            [section]: {
                ...(prev[section] || {}), // Garante que prev[section] existe
                [field]: value // Mantemos como string durante a edição para melhor UX (limpar campo, etc)
                               // A conversão para Number pode ser feita no onSave se necessário, mas o Input type="number" já ajuda
            }
        }));
    };
    
    // Função auxiliar para evitar NaN ou Undefined nos values
    const getVal = (section: string, field: string) => {
        if (section === 'root') return form[field] ?? '';
        return form[section]?.[field] ?? '';
    };

    return (
        <div className="space-y-6 p-4 pb-24 max-w-md mx-auto">
            <PageHeader setTela={onBack} title="Parâmetros Globais" icon={Sliders} colorClass="bg-blue-600" backTarget="principal" />
            
            {/* PROPRIEDADE */}
            <div className="bg-white p-4 rounded-xl shadow-sm border-l-4 border-emerald-500 space-y-3">
                <h3 className="font-bold text-gray-700 flex items-center gap-2">
                    <Home className="w-5 h-5 text-emerald-500"/> Identificação
                </h3>
                <Input 
                    label="Nome da Propriedade" 
                    value={getVal('root', 'fazendaNome')} 
                    onChange={(e: any) => handleChange('root', 'fazendaNome', e.target.value)}
                    type="text"
                    placeholder="Ex: Fazenda Santa Maria"
                />
            </div>

            {/* ENERGIA */}
            <div className="bg-white p-4 rounded-xl shadow-sm border-l-4 border-yellow-500 space-y-3">
                <h3 className="font-bold text-gray-700 flex items-center gap-2">
                    <Zap className="w-5 h-5 text-yellow-500"/> Energia Elétrica
                </h3>
                <Input 
                    label="Custo por kWh (R$)" 
                    value={getVal('energia', 'custoKwh')} 
                    onChange={(e: any) => handleChange('energia', 'custoKwh', e.target.value)}
                    type="number"
                    step="0.01"
                />
                <Input 
                    label="Meta de Consumo Mensal (kWh)" 
                    value={getVal('energia', 'metaConsumo')} 
                    onChange={(e: any) => handleChange('energia', 'metaConsumo', e.target.value)}
                    type="number"
                />
            </div>

            {/* DIESEL / ESTOQUE */}
            <div className="bg-white p-4 rounded-xl shadow-sm border-l-4 border-red-500 space-y-3">
                <h3 className="font-bold text-gray-700 flex items-center gap-2">
                    <Fuel className="w-5 h-5 text-red-500"/> Estoque Diesel
                </h3>
                <Input 
                    label="Capacidade do Tanque (Litros)" 
                    value={getVal('estoque', 'capacidadeTanque')} 
                    onChange={(e: any) => handleChange('estoque', 'capacidadeTanque', e.target.value)}
                    type="number"
                />
                <Input 
                    label="Estoque Mínimo (Alerta)" 
                    value={getVal('estoque', 'estoqueMinimo')} 
                    onChange={(e: any) => handleChange('estoque', 'estoqueMinimo', e.target.value)}
                    type="number"
                />
            </div>

            {/* MANUTENÇÃO */}
            <div className="bg-white p-4 rounded-xl shadow-sm border-l-4 border-orange-500 space-y-3">
                <h3 className="font-bold text-gray-700 flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-orange-500"/> Manutenção
                </h3>
                <Input 
                    label="Alerta Preventivo (Horas Antes)" 
                    value={getVal('manutencao', 'alertaPreventiva')} 
                    onChange={(e: any) => handleChange('manutencao', 'alertaPreventiva', e.target.value)}
                    type="number"
                    placeholder="Ex: 50"
                />
            </div>

            <button 
                onClick={() => onSave(form)} 
                className="w-full bg-blue-600 text-white font-bold py-3 rounded-xl hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 shadow-lg"
            >
                <Save className="w-5 h-5"/> Salvar Alterações
            </button>
        </div>
    );
}
