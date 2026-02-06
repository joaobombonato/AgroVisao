import { useState } from 'react';
import { X, ShieldCheck, ChevronRight, ChevronLeft, Save } from 'lucide-react';
import { useFleetRenewal } from '../hooks/useFleetRenewal';
import RenewalStepSelection from './wizard/RenewalStepSelection';
import RenewalStepPolicyData from './wizard/RenewalStepPolicyData';
import RenewalStepValues from './wizard/RenewalStepValues';

interface FleetRenewalWizardProps {
    selectedMachines: any[];
    onClose: () => void;
}

export default function FleetRenewalWizard({ selectedMachines, onClose }: FleetRenewalWizardProps) {
    const {
        step,
        setStep,
        commonData,
        setCommonData,
        individualData,
        handleIndividualChange,
        handleFinish,
        saving
    } = useFleetRenewal(selectedMachines, onClose);

    return (
        <div className="fixed inset-0 z-[1500] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="bg-indigo-600 p-6 text-white flex justify-between items-center shrink-0 z-30 relative shadow-md">
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
                <div className="flex-1 overflow-y-auto">
                    {step === 1 && <RenewalStepSelection selectedMachines={selectedMachines} />}
                    
                    {step === 2 && (
                        <RenewalStepPolicyData 
                            commonData={commonData} 
                            setCommonData={setCommonData} 
                        />
                    )}

                    {step === 3 && (
                        <RenewalStepValues 
                            selectedMachines={selectedMachines}
                            individualData={individualData}
                            handleIndividualChange={handleIndividualChange}
                        />
                    )}
                </div>

                {/* Footer */}
                <div className="p-6 bg-gray-50 border-t border-gray-100 flex justify-between shrink-0">
                    <button 
                        onClick={() => step > 1 ? setStep(step - 1) : onClose()}
                        disabled={saving}
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
                            disabled={saving}
                            className="bg-green-600 text-white flex items-center gap-2 px-8 py-3 rounded-xl font-black tracking-widest uppercase text-xs hover:bg-green-700 shadow-lg shadow-green-200 transition-all active:scale-95 disabled:opacity-50"
                        >
                            <Save className="w-5 h-5" />
                            {saving ? 'SALVANDO...' : 'CONCLUIR CADASTRO'}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
