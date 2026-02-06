import { useState } from 'react';
import { toast } from 'react-hot-toast';
import { useAppContext, ACTIONS } from '../../../context/AppContext';
import { U } from '../../../utils';
import { InsuranceCommonData, InsuranceState } from '../types';

export function useFleetRenewal(selectedMachines: any[], onClose: () => void) {
    const { genericUpdate, genericSave, dbAssets } = useAppContext();
    const [step, setStep] = useState(1);
    const [saving, setSaving] = useState(false);
    
    // Passo 2: Dados Comuns
    const [commonData, setCommonData] = useState<InsuranceCommonData>({
        seguradora: '',
        corretora: '',
        numero_apolice: '',
        vencimento_seguro: '',
        classe_bonus: '',
    });

    // Passo 3: Grade de Valores Individuais
    const [individualData, setIndividualData] = useState<InsuranceState>(
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
            setSaving(true);
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
        } finally {
            setSaving(false);
        }
    };

    return {
        step,
        setStep,
        commonData,
        setCommonData,
        individualData,
        handleIndividualChange,
        handleFinish,
        saving
    };
}
