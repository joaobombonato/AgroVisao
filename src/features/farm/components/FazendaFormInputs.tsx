import React from 'react';
import { Building2, Ruler } from 'lucide-react';

interface FazendaFormInputsProps {
    formData: any;
    setFormData: (data: any) => void;
}

export default function FazendaFormInputs({ formData, setFormData }: FazendaFormInputsProps) {
    return (
        <div className="space-y-4">
            {/* Nome da Fazenda */}
            <div>
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                    <Building2 className="w-4 h-4 text-green-600" />
                    Nome da Propriedade *
                </label>
                <input
                    type="text"
                    required
                    placeholder="Ex: Fazenda Boa Vista"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all"
                    value={formData.nome}
                    onChange={e => setFormData({ ...formData, nome: e.target.value })}
                />
            </div>

            {/* Tamanho */}
            <div>
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                    <Ruler className="w-4 h-4 text-green-600" />
                    Tamanho (hectares)
                </label>
                <input
                    type="text"
                    placeholder="Ex: 500"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all"
                    value={formData.tamanho_ha}
                    onChange={e => setFormData({ ...formData, tamanho_ha: e.target.value.replace('.', ',') })}
                />
            </div>
            
            {/* Proprietário */}
             <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nome do Proprietário</label>
              <input 
                type="text" 
                placeholder="Nome completo"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all"
                value={formData.proprietario}
                onChange={e => setFormData({...formData, proprietario: e.target.value})}
              />
            </div>
        </div>
    );
}
