import React from 'react';
import { ListPlus, ChevronRight } from 'lucide-react';
import { ASSET_DEFINITIONS } from '../../../config/assetsDefinitions';
import { EditorContainer, getColorClasses } from './SettingsShared';

interface SettingsListasProps {
    setView: (view: any) => void;
    handleOpenEditor: (key: string) => void;
}

export default function SettingsListas({ setView, handleOpenEditor }: SettingsListasProps) {
    const categories = [
        {
            title: "Módulo Refeição",
            color: "text-orange-600",
            barColor: "bg-orange-500",
            items: ['tiposRefeicao', 'setores']
        },
        {
            title: "Módulo Abastecimento & Manutenção",
            color: "text-red-700",
            barColor: "bg-red-600",
            items: ['maquinas', 'produtosManutencao']
        },
        {
            title: "Módulo Recomendações & Campo",
            color: "text-green-700",
            barColor: "bg-green-600",
            items: ['safras', 'culturas', 'talhoes', 'operacoesAgricolas', 'classes', 'produtos']
        },
        {
            title: "Módulo Monitoramento & Outros",
            color: "text-blue-700",
            barColor: "bg-blue-600",
            items: ['tiposDocumento', 'locaisEnergia', 'locaisChuva']
        },
        {
            title: "Recursos Humanos & Equipe",
            color: "text-indigo-700",
            barColor: "bg-indigo-600",
            items: ['colaboradores']
        }
    ];

    return (
        <EditorContainer title="Cadastros & Listas" icon={ListPlus} color="bg-indigo-600" onBack={() => setView('menu')}>
            <div className="space-y-8">
                {categories.map((cat, idx) => (
                    <div key={idx} className="space-y-3">
                        <div className="flex items-center gap-2 px-1 border-b border-gray-100 pb-2">
                            <div className={`w-1 h-4 rounded-full ${cat.barColor}`}></div>
                            <h2 className={`text-xs font-black uppercase tracking-widest ${cat.color}`}>{cat.title}</h2>
                        </div>

                        <div className="space-y-2">
                            {cat.items.map((key: string) => {
                                const def: any = ASSET_DEFINITIONS[key];
                                if (!def) return null;
                                
                                return (
                                    <div 
                                        key={key} 
                                        className="flex items-center gap-4 bg-white p-3 rounded-2xl shadow-sm border border-gray-100 group hover:border-indigo-200 transition-all active:scale-95 cursor-pointer"
                                        onClick={() => handleOpenEditor(key)}
                                    >
                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${getColorClasses(def.color)} group-hover:text-white`}>
                                            <def.icon className="w-5 h-5" />
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-sm font-bold text-gray-800 group-hover:text-indigo-900 transition-colors uppercase tracking-tight">{def.title}</p>
                                            <p className="text-[10px] text-gray-400 font-medium">{def.label || 'Gerenciar itens'}</p>
                                        </div>
                                        <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-indigo-400 group-hover:translate-x-1 transition-all" />
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </div>
        </EditorContainer>
    );
}
