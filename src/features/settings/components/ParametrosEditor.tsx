import React, { useState } from 'react';
import { Save, Sliders, Zap, Fuel, AlertTriangle, Home, Shield } from 'lucide-react';
import { PageHeader, Input } from '../../../components/ui/Shared';
import { useAppContext, ACTIONS } from '../../../context/AppContext';
import { toast } from 'react-hot-toast';
import { U } from '../../../utils';

export default function ParametrosEditor({ currentParams, onSave, onBack }: any) {
    const { genericSave, rolePermissions } = useAppContext();
    const canEdit = rolePermissions?.actions?.config_sistema !== false;
    
    const [form, setForm] = useState(() => {
        const safeParams = currentParams || {};
        return {
            energia: safeParams.energia || { 
                custoKwhPadrao: '', 
                custoKwhPonta: '', 
                custoKwhForaPonta: '', 
                diaLeitura: '' 
            },
            estoque: safeParams.estoque || { capacidadeTanque: '', estoqueMinimo: '', ajusteManual: '', bombaInicial: '' },
            financeiro: safeParams.financeiro || { precoDiesel: '' },
            manutencao: safeParams.manutencao || { alertaPreventiva: '' },
            ...safeParams
        };
    });
    const [isLocked, setIsLocked] = useState(true);

    const handleTrocarBomba = () => {
        if (!canEdit) return;
        const novaBomba = window.prompt("Digite a nova leitura inicial da BOMBA (Reset):", "0");
        if (novaBomba === null || novaBomba === "") return;

        const val = U.parseDecimal(novaBomba);
        if (window.confirm(`Isso irá resetar as futuras leituras para começar em ${U.formatValue(val)}. Confirma?`)) {
            // ... (resto da lógica mantido)
            handleChange('estoque', 'bombaInicial', novaBomba);
            
            const registroReset = {
                data_operacao: U.todayIso(),
                maquina: "TROCA DE BOMBA",
                bombaFinal: val,
                litros: 0,
                horimetroAtual: 0,
                obs: "Reset manual via Parâmetros Gerais"
            };

            genericSave('abastecimentos', registroReset, { 
                type: ACTIONS.ADD_RECORD, 
                modulo: 'abastecimentos' 
            });

            const novosParams = {
                ...form,
                estoque: {
                    ...form.estoque,
                    bombaInicial: novaBomba
                }
            };
            onSave(novosParams);
            toast.success("Bomba Resetada com Sucesso!");
        }
    };

    const handleChange = (section: string, field: string, value: string) => {
        if (!canEdit) return;
        if (section === 'root') {
             setForm((prev: any) => ({ ...prev, [field]: value }));
             return;
        }

        setForm((prev: any) => ({
            ...prev,
            [section]: {
                ...(prev[section] || {}),
                [field]: value
            }
        }));
    };
    
    const getVal = (section: string, field: string) => {
        if (section === 'root') return form[field] ?? '';
        return form[section]?.[field] ?? '';
    };

    return (
        <div className="space-y-6">
            
            {!canEdit && (
                <div className="bg-blue-50 border-2 border-blue-100 p-4 rounded-xl flex gap-3 animate-in fade-in slide-in-from-top-4">
                    <div className="bg-white p-2 rounded-lg h-fit shadow-sm">
                        <Shield className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                        <h4 className="font-bold text-blue-900 text-xs uppercase tracking-wider">Modo de Visualização</h4>
                        <p className="text-[10px] text-blue-700 mt-0.5 leading-tight font-medium">Você pode conferir as tarifas e configurações de estoque, mas apenas o Proprietário ou Gestor podem realizar alterações.</p>
                    </div>
                </div>
            )}

            {/* SAFRA ATIVA (GLOBAL) */}
            <div className="bg-white p-4 rounded-xl shadow-md border-l-4 border-blue-600 space-y-3">
                <h3 className="font-bold text-gray-700 flex items-center gap-2">
                    <Sliders className="w-5 h-5 text-blue-600"/> Planejamento de Safra
                </h3>
                <div className="space-y-1">
                    <label className="block text-xs font-bold text-gray-700">Safra Ativa (Contexto Principal)</label>
                    <select 
                        disabled={!canEdit}
                        value={form.safraAtiva || ''} 
                        onChange={(e) => setForm({...form, safraAtiva: e.target.value})}
                        className={`w-full px-3 py-2 border-2 rounded-lg text-sm font-bold outline-none transition-all ${!canEdit ? 'bg-gray-50 border-gray-100 text-gray-400 cursor-not-allowed' : 'border-gray-300 focus:border-blue-500'}`}
                    >
                        <option value="">Nenhuma Safra Selecionada</option>
                        {(currentParams?.safras_lista || []).map((s: any) => (
                            <option key={s.id} value={s.id}>{s.nome || s.titulo}</option>
                        ))}
                    </select>
                </div>
            </div>

            <div className="bg-white p-4 rounded-xl shadow-sm border-l-4 border-yellow-500 space-y-3">
                <h3 className="font-bold text-gray-700 flex items-center gap-2">
                    <Zap className="w-5 h-5 text-yellow-500"/> Parâmetros de Energia (CEMIG 2025)
                </h3>
                <div className="grid grid-cols-2 gap-4">
                    <Input 
                        readOnly={!canEdit}
                        label="Tarifa Mínima Fixa (R$)" 
                        value={getVal('energia', 'tarifaMinima')} 
                        onChange={(e: any) => handleChange('energia', 'tarifaMinima', e.target.value)}
                        type="text" mask="decimal" precision={2} placeholder="Ex: 93,20"
                        legend="Valor mínimo cobrado pela CEMIG."
                    />
                    <Input 
                        readOnly={!canEdit}
                        label="Diferença TUSD Solar (R$)" 
                        value={getVal('energia', 'tusdSolar')} 
                        onChange={(e: any) => handleChange('energia', 'tusdSolar', e.target.value)}
                        type="text" mask="decimal" precision={4} placeholder="Ex: 0,1543"
                    />
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <Input 
                        readOnly={!canEdit}
                        label="Tarifa Comercial (R$)" 
                        value={getVal('energia', 'tarifaComercial')} 
                        onChange={(e: any) => handleChange('energia', 'tarifaComercial', e.target.value)}
                        type="text" mask="decimal" precision={4} placeholder="Ex: 1,1256"
                        legend="Valor integral do kWh (Energia + Impostos)."
                    />
                    <Input 
                        readOnly={!canEdit}
                        label="Tarifa GD / Reembolso (R$)" 
                        value={getVal('energia', 'tusdGD')} 
                        onChange={(e: any) => handleChange('energia', 'tusdGD', e.target.value)}
                        type="text" mask="decimal" precision={4} placeholder="Ex: 0,4292"
                        legend="Valor GD II para ajuste de disponibilidade."
                    />
                </div>
            </div>

            {/* DIESEL / ESTOQUE */}
            <div className="bg-white p-4 rounded-xl shadow-sm border-l-4 border-red-500 space-y-3">
                <h3 className="font-bold text-gray-700 flex items-center gap-2">
                    <Fuel className="w-5 h-5 text-red-500"/> Estoque Diesel
                </h3>
                <Input 
                    readOnly={!canEdit}
                    label="Capacidade do Tanque (Litros)" 
                    value={getVal('estoque', 'capacidadeTanque')} 
                    onChange={(e: any) => handleChange('estoque', 'capacidadeTanque', e.target.value)}
                    type="text" mask="metric" placeholder="Ex: 15.000"
                />
                <Input 
                    readOnly={!canEdit}
                    label="Estoque Mínimo (Alerta)" 
                    value={getVal('estoque', 'estoqueMinimo')} 
                    onChange={(e: any) => handleChange('estoque', 'estoqueMinimo', e.target.value)}
                    type="text" mask="metric" placeholder="Ex: 1.000"
                />
                <div className="relative">
                    <Input 
                        label="Ajuste Manual / Saldo Inicial (L)" 
                        value={getVal('estoque', 'ajusteManual')} 
                        onChange={(e: any) => handleChange('estoque', 'ajusteManual', e.target.value)}
                        type="text" mask="metric" placeholder="Ex: 500"
                        readOnly={isLocked || !canEdit}
                        className={(isLocked || !canEdit) ? "bg-gray-50 text-gray-400" : ""}
                    />
                    {(isLocked && canEdit) && (
                        <button 
                            onClick={() => window.confirm("Alterar o Saldo Inicial quebra a lógica FIFO. Use 'Ajuste de Estoque' no menu de Diesel para correções normais. Deseja realmente habilitar a edição?") && setIsLocked(false)}
                            className="absolute right-2 top-8 text-[10px] font-bold text-amber-600 hover:underline"
                        >
                            Destravar
                        </button>
                    )}
                </div>

                <div className="relative">
                    <Input 
                        label="Bomba Inicial (Leitura)" 
                        value={getVal('estoque', 'bombaInicial')} 
                        onChange={(e: any) => handleChange('estoque', 'bombaInicial', e.target.value)}
                        type="text" mask="decimal" placeholder="Ex: 12500,0"
                        readOnly={isLocked || !canEdit}
                        className={(isLocked || !canEdit) ? "bg-gray-50 text-gray-400" : ""}
                    />
                    {canEdit && (
                        <button 
                            onClick={handleTrocarBomba}
                            className="absolute right-2 top-8 text-[10px] font-bold text-blue-600 hover:underline"
                        >
                            Trocar Bomba (Reset)
                        </button>
                    )}
                </div>

                <Input 
                    readOnly={!canEdit}
                    label="Preço de Referência Diesel (R$)" 
                    value={getVal('financeiro', 'precoDiesel')} 
                    onChange={(e: any) => handleChange('financeiro', 'precoDiesel', e.target.value)}
                    type="text" mask="decimal" placeholder="Ex: 6,45"
                />
            </div>

            {/* MANUTENÇÃO */}
            <div className="bg-white p-4 rounded-xl shadow-sm border-l-4 border-orange-500 space-y-3">
                <h3 className="font-bold text-gray-700 flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-orange-500"/> Manutenção
                </h3>
                <Input 
                    readOnly={!canEdit}
                    label="Alerta Preventivo (Horas Antes)" 
                    value={getVal('manutencao', 'alertaPreventiva')} 
                    onChange={(e: any) => handleChange('manutencao', 'alertaPreventiva', e.target.value)}
                    type="text" numeric={true} placeholder="Ex: 50"
                />
            </div>

            {canEdit && (
                <button 
                    onClick={() => onSave(form)} 
                    className="w-full bg-blue-600 text-white font-bold py-4 rounded-2xl hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 shadow-lg active:scale-95"
                >
                    <Save className="w-5 h-5"/> Salvar Alterações
                </button>
            )}
        </div>
    );
}
