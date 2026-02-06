import React, { useState } from 'react';
import { X, ShieldCheck, ChevronRight, ChevronLeft, Save, Truck } from 'lucide-react';
import { Input, Select } from '../../../components/ui/Shared';
import { U } from '../../../utils';
import { toast } from 'react-hot-toast';
import { useAppContext, ACTIONS } from '../../../context/AppContext';

interface FleetRenewalWizardProps {
    selectedMachines: any[];
    onClose: () => void;
}

export default function FleetRenewalWizard({ selectedMachines, onClose }: FleetRenewalWizardProps) {
    const { genericUpdate, genericSave, dbAssets, dispatch, fazendaId } = useAppContext();
    const [step, setStep] = useState(1);
    
    // Passo 2: Dados Comuns
    const [commonData, setCommonData] = useState({
        seguradora: '',
        corretora: '',
        numero_apolice: '',
        vencimento_seguro: '',
        classe_bonus: '',
    });

    // Passo 3: Grade de Valores Individuais
    const [individualData, setIndividualData] = useState<any>(
        selectedMachines.reduce((acc, m) => ({
            ...acc,
            [m.id]: {
                valor_seguro_pago: U.formatValue(m.valor_seguro_pago || 0),
                valor_cobertura: U.formatValue(m.valor_cobertura || 0),
                franquia_geral: U.formatValue(m.franquia_geral || 0),
                franquia_geral_porc: U.formatValue(m.franquia_geral_porc || 0),
                cobertura_eletrica: U.formatValue(m.cobertura_eletrica || 0),
                franquia_eletrica: U.formatValue(m.franquia_eletrica || 0),
                franquia_eletrica_porc: U.formatValue(m.franquia_eletrica_porc || 0),
                franquia_vidros: U.formatValue(m.franquia_vidros || 0),
            }
        }), {})
    );

    const handleIndividualChange = (id: string, field: string, value: string) => {
        setIndividualData((prev: any) => ({
            ...prev,
            [id]: { ...prev[id], [field]: value }
        }));
    };

    const handleFinish = async () => {
        try {
            toast.loading("Salvando renovação da frota...", { id: 'fleet-save' });

            for (const machine of selectedMachines) {
                const individual = individualData[machine.id];
                
                // 1. Criar OS de Histórico (Recibo da apólice antiga)
                const osData = {
                    titulo: `HISTÓRICO: Seguro Cadastrado - ${commonData.numero_apolice}`,
                    descricao: `Seguro registrado via Gestão de Frota. Dados anteriores arquivados (se houver).`,
                    status: 'Concluída',
                    modulo: 'Seguro',
                    maquina_id: machine.id,
                    data_abertura: new Date().toISOString().split('T')[0],
                    dados_anteriores: {
                        seguradora: machine.seguradora,
                        corretora: machine.corretora,
                        numero_apolice: machine.numero_apolice,
                        vencimento_seguro: machine.vencimento_seguro,
                        classe_bonus: machine.classe_bonus,
                        valor_seguro_pago: machine.valor_seguro_pago,
                        valor_cobertura: machine.valor_cobertura,
                        franquia_geral: machine.franquia_geral,
                        franquia_geral_porc: machine.franquia_geral_porc,
                        cobertura_eletrica: machine.cobertura_eletrica,
                        franquia_eletrica: machine.franquia_eletrica,
                        franquia_eletrica_porc: machine.franquia_eletrica_porc,
                        franquia_vidros: machine.franquia_vidros
                    }
                };
                await genericSave('os', osData);

                // 2. Atualizar a Máquina com novos dados
                const updates = {
                    ...commonData,
                    classe_bonus: U.parseDecimal(commonData.classe_bonus),
                    valor_seguro_pago: U.parseDecimal(individual.valor_seguro_pago),
                    valor_cobertura: U.parseDecimal(individual.valor_cobertura),
                    franquia_geral: U.parseDecimal(individual.franquia_geral),
                    franquia_geral_porc: U.parseDecimal(individual.franquia_geral_porc),
                    cobertura_eletrica: U.parseDecimal(individual.cobertura_eletrica),
                    franquia_eletrica: U.parseDecimal(individual.franquia_eletrica),
                    franquia_eletrica_porc: U.parseDecimal(individual.franquia_eletrica_porc),
                    franquia_vidros: U.parseDecimal(individual.franquia_vidros),
                };

                const updatedList = (dbAssets.maquinas || []).map((m: any) => m.id === machine.id ? { ...m, ...updates } : m);
                await genericUpdate('maquinas', machine.id, updates, {
                    type: ACTIONS.SET_DB_ASSETS,
                    table: 'maquinas',
                    records: updatedList
                });
            }

            toast.success("Frota renovada com sucesso!", { id: 'fleet-save' });
            onClose();
        } catch (error) {
            console.error(error);
            toast.error("Erro ao renovar frota.");
        }
    };

    return (
        <div className="fixed inset-0 z-[1500] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="bg-indigo-600 p-6 text-white flex justify-between items-center shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-white/20 rounded-xl">
                            <ShieldCheck className="w-6 h-6" />
                        </div>
                        <div>
                            <h2 className="text-xl font-black uppercase tracking-tight">Cadastro de Seguro (Frota)</h2>
                            <p className="text-[10px] text-indigo-100 font-bold opacity-80 uppercase tracking-widest">
                                Passo {step} de 3 • {selectedMachines.length} Ativos Selecionados
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    {step === 1 && (
                        <div className="space-y-4 animate-in slide-in-from-right-5">
                            <h3 className="text-lg font-bold text-gray-800">Verifique os Ativos Selecionados</h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {selectedMachines.map(m => (
                                    <div key={m.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
                                        <Truck className="w-5 h-5 text-indigo-500 shrink-0" />
                                        <div className="min-w-0">
                                            <p className="font-bold text-gray-900 truncate">{m.nome}</p>
                                            <p className="text-[10px] text-gray-500 uppercase font-bold">{m.fabricante} {m.descricao}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {step === 2 && (
                        <div className="space-y-6 animate-in slide-in-from-right-5">
                            <h3 className="text-lg font-bold text-gray-800">Dados Comuns da Apólice</h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <Input 
                                    label="Seguradora" 
                                    placeholder="Ex: Porto Seguro"
                                    value={commonData.seguradora}
                                    onChange={(e: any) => setCommonData({...commonData, seguradora: e.target.value})}
                                />
                                <Input 
                                    label="Corretora" 
                                    placeholder="Ex: Terra Corretora"
                                    value={commonData.corretora}
                                    onChange={(e: any) => setCommonData({...commonData, corretora: e.target.value})}
                                />
                                <Input 
                                    label="Nº da Apólice de Frota" 
                                    placeholder="Ex: 123456789"
                                    value={commonData.numero_apolice}
                                    onChange={(e: any) => setCommonData({...commonData, numero_apolice: e.target.value})}
                                />
                                <Input 
                                    label="Vencimento" 
                                    type="date"
                                    value={commonData.vencimento_seguro}
                                    onChange={(e: any) => setCommonData({...commonData, vencimento_seguro: e.target.value})}
                                />
                                <Input 
                                    label="Classe de Bônus" 
                                    mask="integer"
                                    placeholder="Ex: 10"
                                    value={commonData.classe_bonus}
                                    onChange={(e: any) => setCommonData({...commonData, classe_bonus: e.target.value})}
                                />
                            </div>
                        </div>
                    )}

                    {step === 3 && (
                        <div className="space-y-8 animate-in slide-in-from-right-5 pb-10">
                            <div className="sticky top-0 bg-white/95 backdrop-blur-sm z-10 py-2 border-b border-gray-100 flex justify-between items-center">
                                <h3 className="text-lg font-bold text-gray-800">Valores Individuais</h3>
                                <div className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-100 uppercase tracking-widest">
                                    Ajuste por Máquina
                                </div>
                            </div>
                            
                            <div className="space-y-12 mt-4">
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
                                                        <p className="text-[10px] text-gray-400 font-bold uppercase mt-1">{m.fabricante} • {m.descricao}</p>
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
                    )}
                </div>

                {/* Footer */}
                <div className="p-6 bg-gray-50 border-t border-gray-100 flex justify-between shrink-0">
                    <button 
                        onClick={() => step > 1 ? setStep(step - 1) : onClose()}
                        className="flex items-center gap-2 px-6 py-3 font-bold text-gray-500 hover:text-gray-900 transition-colors"
                    >
                        <ChevronLeft className="w-5 h-5" />
                        {step === 1 ? 'CANCELAR' : 'VOLTAR'}
                    </button>
                    
                    {step < 3 ? (
                        <button 
                            onClick={() => setStep(step + 1)}
                            className="bg-indigo-600 text-white flex items-center gap-2 px-8 py-3 rounded-xl font-black tracking-widest uppercase text-xs hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-all active:scale-95"
                        >
                            PRÓXIMO
                            <ChevronRight className="w-5 h-5" />
                        </button>
                    ) : (
                        <button 
                            onClick={handleFinish}
                            className="bg-green-600 text-white flex items-center gap-2 px-8 py-3 rounded-xl font-black tracking-widest uppercase text-xs hover:bg-green-700 shadow-lg shadow-green-200 transition-all active:scale-95"
                        >
                            <Save className="w-5 h-5" />
                            CONCLUIR CADASTRO
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
