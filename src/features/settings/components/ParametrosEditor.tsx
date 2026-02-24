import React, { useState } from 'react';
import { Save, Sliders, Zap, Fuel, AlertTriangle, Home } from 'lucide-react';
import { PageHeader, Input } from '../../../components/ui/Shared';
import { U } from '../../../utils';

export default function ParametrosEditor({ currentParams, onSave, onBack }: any) {
    // Inicialização Defensiva do Estado para evitar crash de undefined
    const [form, setForm] = useState(() => {
        const safeParams = currentParams || {};
        // Se currentParams vier vazio ou incompleto, garantimos a estrutura
        return {
            energia: safeParams.energia || { 
                custoKwhPadrao: '', 
                custoKwhPonta: '', 
                custoKwhForaPonta: '', 
                diaLeitura: '' 
            },
            estoque: safeParams.estoque || { capacidadeTanque: '', estoqueMinimo: '', ajusteManual: '' },
            financeiro: safeParams.financeiro || { precoDiesel: '' },
            manutencao: safeParams.manutencao || { alertaPreventiva: '' },
            ...safeParams
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
        <div className="space-y-6">
            

            {/* SAFRA ATIVA (GLOBAL) */}
            <div className="bg-white p-4 rounded-xl shadow-md border-l-4 border-blue-600 space-y-3">
                <h3 className="font-bold text-gray-700 flex items-center gap-2">
                    <Sliders className="w-5 h-5 text-blue-600"/> Planejamento de Safra
                </h3>
                <div className="space-y-1">
                    <label className="block text-xs font-bold text-gray-700">Safra Ativa (Contexto Principal)</label>
                    <select 
                        value={form.safraAtiva || ''} 
                        onChange={(e) => setForm({...form, safraAtiva: e.target.value})}
                        className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg text-sm font-bold focus:border-blue-500 outline-none"
                    >
                        <option value="">Nenhuma Safra Selecionada</option>
                        {(currentParams?.safras_lista || []).map((s: any) => (
                            <option key={s.id} value={s.id}>{s.nome || s.titulo}</option>
                        ))}
                    </select>
                    <p className="text-[10px] text-gray-400 leading-tight">Todos os lançamentos de hoje em diante serão vinculados a esta Safra.</p>
                </div>
            </div>
            <div className="bg-white p-4 rounded-xl shadow-sm border-l-4 border-yellow-500 space-y-3">
                <h3 className="font-bold text-gray-700 flex items-center gap-2">
                    <Zap className="w-5 h-5 text-yellow-500"/> Energia Elétrica
                </h3>
                <Input 
                    label="Tarifa Padrão (03 ou Geral) - R$/kWh" 
                    value={getVal('energia', 'custoKwhPadrao')} 
                    onChange={(e: any) => handleChange('energia', 'custoKwhPadrao', e.target.value)}
                    type="text"
                    mask="decimal"
                    precision={3}
                    placeholder="Ex: 0,923"
                />
                <Input 
                    label="Tarifa Ponta (04) - R$/kWh" 
                    value={getVal('energia', 'custoKwhPonta')} 
                    onChange={(e: any) => handleChange('energia', 'custoKwhPonta', e.target.value)}
                    type="text"
                    mask="decimal"
                    precision={3}
                    placeholder="Ex: 1,250"
                />
                <Input 
                    label="Tarifa Fora Ponta (08) - R$/kWh" 
                    value={getVal('energia', 'custoKwhForaPonta')} 
                    onChange={(e: any) => handleChange('energia', 'custoKwhForaPonta', e.target.value)}
                    type="text"
                    mask="decimal"
                    precision={3}
                    placeholder="Ex: 0,460"
                />
                <Input 
                    label="Dia do Fechamento (Leitura)" 
                    value={getVal('energia', 'diaLeitura')} 
                    onChange={(e: any) => handleChange('energia', 'diaLeitura', e.target.value)}
                    type="text"
                    mask="day"
                    placeholder="Ex: 15"
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
                    type="text"
                    mask="metric"
                    placeholder="Ex: 15.000"
                />
                <Input 
                    label="Estoque Mínimo (Alerta)" 
                    value={getVal('estoque', 'estoqueMinimo')} 
                    onChange={(e: any) => handleChange('estoque', 'estoqueMinimo', e.target.value)}
                    type="text"
                    mask="metric"
                    placeholder="Ex: 1.000"
                />
                <Input 
                    label="Ajuste Manual / Saldo Inicial (L)" 
                    value={getVal('estoque', 'ajusteManual')} 
                    onChange={(e: any) => handleChange('estoque', 'ajusteManual', e.target.value)}
                    type="text"
                    mask="metric"
                    placeholder="Ex: 500"
                />
                <Input 
                    label="Bomba Inicial (Leitura)" 
                    value={getVal('estoque', 'bombaInicial')} 
                    onChange={(e: any) => handleChange('estoque', 'bombaInicial', e.target.value)}
                    type="text"
                    mask="decimal"
                    placeholder="Ex: 12500,0"
                />
                <Input 
                    label="Preço de Referência Diesel (R$)" 
                    value={getVal('financeiro', 'precoDiesel')} 
                    onChange={(e: any) => handleChange('financeiro', 'precoDiesel', e.target.value)}
                    type="text"
                    mask="decimal"
                    placeholder="Ex: 6,45"
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
                    type="text"
                    numeric={true}
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
