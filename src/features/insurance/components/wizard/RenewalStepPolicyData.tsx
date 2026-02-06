import React from 'react';
import { Input } from '../../../../components/ui/Shared';

interface RenewalStepPolicyDataProps {
    commonData: any;
    setCommonData: (data: any) => void;
}

export default function RenewalStepPolicyData({ commonData, setCommonData }: RenewalStepPolicyDataProps) {
    return (
        <div className="p-6 space-y-6 animate-in slide-in-from-right-5">
            <h3 className="text-lg font-bold text-gray-800">Dados Comuns da Apólice</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input 
                    label="Nº da Apólice"
                    value={commonData.numero_apolice}
                    onChange={(e: any) => setCommonData({ ...commonData, numero_apolice: e.target.value })}
                    placeholder="000.000.000"
                />
                <Input 
                    label="Vencimento"
                    type="date"
                    value={commonData.vencimento_seguro}
                    onChange={(e: any) => setCommonData({ ...commonData, vencimento_seguro: e.target.value })}
                />
                <Input 
                    label="Seguradora"
                    value={commonData.seguradora}
                    onChange={(e: any) => setCommonData({ ...commonData, seguradora: e.target.value })}
                    placeholder="Ex: Porto Seguro"
                />
                <Input 
                    label="Corretora"
                    value={commonData.corretora}
                    onChange={(e: any) => setCommonData({ ...commonData, corretora: e.target.value })}
                    placeholder="Ex: Seguros S.A."
                />
                <Input 
                    label="Classe de Bônus"
                    value={commonData.classe_bonus}
                    mask="decimal"
                    onChange={(e: any) => setCommonData({ ...commonData, classe_bonus: e.target.value })}
                />
            </div>
        </div>
    );
}
