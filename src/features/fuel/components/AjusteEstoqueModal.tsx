
import React, { useState } from 'react';
import { Wrench, AlertCircle } from 'lucide-react';
import { Input } from '../../../components/ui/Shared';
import { U, validateOperationalDate, getOperationalDateLimits } from '../../../utils';
import { useAppContext, ACTIONS } from '../../../context/AppContext';
import { toast } from 'react-hot-toast';

interface AjusteEstoqueModalProps {
    onClose: () => void;
}

export function AjusteEstoqueModal({ onClose }: AjusteEstoqueModalProps) {
    const { genericSave } = useAppContext();
    const [ajusteForm, setAjusteForm] = useState({ data: U.todayIso(), qtd: '', motivo: '' });

    const handleSalvarAjuste = () => {
        // Validação de Data
        const dateCheck = validateOperationalDate(ajusteForm.data);
        if (!dateCheck.valid) {
            toast.error(dateCheck.error || 'Data inválida');
            return;
        }
        if (dateCheck.warning) {
            if (!window.confirm(dateCheck.warning)) return;
        }

        if (!ajusteForm.qtd || !ajusteForm.motivo) {
            toast.error("Preencha quantidade e motivo.");
            return;
        }
        
        // Salva como um abastecimento especial
        const novoAjuste = {
            data_operacao: ajusteForm.data,
            maquina: "AJUSTE DE ESTOQUE",
            bombaFinal: 0,
            horimetroAtual: 0,
            qtd: ajusteForm.qtd,
            litros: U.parseDecimal(ajusteForm.qtd), // Campo obrigatório no banco (SaaS)
            media: 0,
            custo: 0,
            id: U.id('AJUSTE-'),
            obs: ajusteForm.motivo
        };

        genericSave('abastecimentos', novoAjuste, {
            type: ACTIONS.ADD_RECORD,
            modulo: 'abastecimentos'
        });
        
        // Salva OS para registro
        const novaOS = {
          id: U.id('OS-AJUSTE-'),
          modulo: 'Estoque',
          descricao: `AJUSTE ESTOQUE: ${ajusteForm.qtd}L`,
          detalhes: {
              "Motivo": ajusteForm.motivo,
              "Quantidade": `${ajusteForm.qtd} L`,
              "Tipo": "Saída / Correção"
          },
          status: 'Concluída',
          data_abertura: new Date().toISOString()
        };
        
        genericSave('os', novaOS, { type: ACTIONS.ADD_RECORD, modulo: 'os', record: novaOS });

        toast.success("Ajuste de estoque realizado com sucesso!");
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 animate-in zoom-in-95">
                <h3 className="text-lg font-black text-amber-600 flex items-center gap-2 mb-4">
                    <Wrench className="w-6 h-6" /> CONSERTO DE ESTOQUE
                </h3>
                <div className="space-y-4">
                    <div className="bg-amber-50 p-3 rounded-lg border border-amber-100 text-xs text-amber-800">
                        <AlertCircle className="w-4 h-4 inline mr-1" />
                        Use esta função para corrigir diferenças físicas ou perdas. 
                        O valor será <strong>debitado</strong> do estoque como se fosse um consumo.
                    </div>
                    <Input 
                        label="Data do Ajuste" 
                        type="date" 
                        value={ajusteForm.data} 
                        onChange={(e: any) => setAjusteForm({...ajusteForm, data: e.target.value})}
                        max={getOperationalDateLimits().max}
                        min={getOperationalDateLimits().min} 
                    />
                    <Input 
                        label="Quantidade (Litros)" 
                        mask="decimal"
                        value={ajusteForm.qtd} 
                        onChange={(e: any) => setAjusteForm({...ajusteForm, qtd: e.target.value.replace('.', ',')})} 
                        placeholder="Ex: 50"
                    />
                    <Input 
                        label="Motivo / Observação" 
                        value={ajusteForm.motivo} 
                        onChange={(e: any) => setAjusteForm({...ajusteForm, motivo: e.target.value})} 
                        placeholder="Ex: Vazamento na bomba / Diferença de medição"
                    />
                    <div className="flex gap-2 pt-2">
                        <button 
                          onClick={handleSalvarAjuste}
                          className="flex-1 bg-amber-500 text-white py-3 rounded-xl font-bold hover:bg-amber-600"
                        >
                            CONFIRMAR AJUSTE
                        </button>
                        <button 
                          onClick={onClose}
                          className="flex-1 bg-gray-100 text-gray-600 py-3 rounded-xl font-bold hover:bg-gray-200"
                        >
                            CANCELAR
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
