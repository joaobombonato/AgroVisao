import React from 'react';
import { History, ShieldCheck, CreditCard, ChevronRight, FileText, Calendar } from 'lucide-react';
import { U } from '../../../utils';

interface MaquinaTimelineProps {
    machineId: string;
    osList: any[];
}

export default function MaquinaTimeline({ machineId, osList }: MaquinaTimelineProps) {
    // Filtra OS vinculadas a esta máquina e ordena por data (data_abertura ou data como fallback) e ID decrescente
    const history = osList
        .filter(os => os.maquina_id === machineId)
        .sort((a, b) => {
            const dateA = new Date(a.data_abertura || a.data || 0).getTime();
            const dateB = new Date(b.data_abertura || b.data || 0).getTime();
            if (dateB !== dateA) return dateB - dateA;
            // Desempate por ID (mais recente primeiro)
            return (b.id || '').localeCompare(a.id || '');
        });

    if (history.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center p-8 text-center bg-gray-50 rounded-2xl border-2 border-dashed border-gray-100">
                <History className="w-8 h-8 text-gray-300 mb-2" />
                <p className="text-sm text-gray-400 font-medium">Nenhum evento histórico registrado para esta máquina.</p>
            </div>
        );
    }

    return (
        <div className="space-y-4 animate-in fade-in duration-300">
            <div className="flex items-center gap-2 mb-2 px-1">
                <History className="w-4 h-4 text-indigo-500" />
                <h3 className="text-xs font-black text-gray-500 uppercase tracking-widest">Linha do Tempo / Prontuário</h3>
            </div>

            <div className="relative ml-3 border-l-2 border-gray-100 pl-6 space-y-6">
                {history.map((item, idx) => {
                    const isSeguro = item.modulo === 'Seguro';
                    const isFinan = item.modulo === 'Financeiro';
                    const Icon = isSeguro ? ShieldCheck : (isFinan ? CreditCard : FileText);
                    const colorClass = isSeguro ? 'text-indigo-600 bg-indigo-50' : (isFinan ? 'text-green-600 bg-green-50' : 'text-gray-600 bg-gray-50');

                    return (
                        <div key={item.id || idx} className="relative">
                            {/* Dot on line */}
                            <div className={`absolute -left-[31px] top-1 w-2.5 h-2.5 rounded-full border-2 border-white shadow-sm ${isSeguro ? 'bg-indigo-500' : (isFinan ? 'bg-green-500' : 'bg-gray-400')}`} />
                            
                            <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm hover:shadow-md transition-all group">
                                <div className="flex justify-between items-start mb-2">
                                    <div className="flex items-center gap-2">
                                        <div className={`p-1.5 rounded-lg ${colorClass}`}>
                                            <Icon className="w-3.5 h-3.5" />
                                        </div>
                                        <p className="text-xs font-bold text-gray-900 group-hover:text-indigo-600 transition-colors uppercase tracking-tight line-clamp-1">
                                            {item.titulo || item.descricao}
                                        </p>
                                    </div>
                                    <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest whitespace-nowrap bg-gray-50 px-2 py-0.5 rounded-full">
                                        {U.formatDate(item.data_abertura || item.data || item.data_conclusao)}
                                    </span>
                                </div>

                                {item.detalhes && typeof item.detalhes === 'object' && (
                                    <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-gray-50">
                                        {Object.entries(item.detalhes).map(([key, val]: [string, any]) => (
                                            <div key={key}>
                                                <p className="text-[9px] text-gray-400 font-bold uppercase tracking-tighter">{key}</p>
                                                <p className="text-[11px] text-gray-700 font-semibold truncate">
                                                    {typeof val === 'number' ? U.formatValue(val) : String(val)}
                                                </p>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {item.dados_anteriores && (
                                    <div className="mt-3 p-2 bg-amber-50/50 rounded-xl border border-amber-100/50">
                                        <p className="text-[8px] text-amber-600 font-black uppercase mb-1 tracking-widest">Apólice Anterior Arquivada</p>
                                        <div className="grid grid-cols-3 gap-2">
                                           {item.dados_anteriores.seguradora && (
                                               <div>
                                                   <p className="text-[8px] text-gray-400 font-bold uppercase">Seguradora</p>
                                                   <p className="text-[9px] text-gray-600 font-bold">{item.dados_anteriores.seguradora}</p>
                                               </div>
                                           )}
                                           {item.dados_anteriores.valor_seguro_pago && (
                                               <div>
                                                   <p className="text-[8px] text-gray-400 font-bold uppercase">Prêmio (R$)</p>
                                                   <p className="text-[9px] text-gray-600 font-bold">{U.formatValue(item.dados_anteriores.valor_seguro_pago)}</p>
                                               </div>
                                           )}
                                           {item.dados_anteriores.numero_apolice && (
                                               <div>
                                                   <p className="text-[8px] text-gray-400 font-bold uppercase">Nº Apólice</p>
                                                   <p className="text-[9px] text-gray-600 font-bold">{item.dados_anteriores.numero_apolice}</p>
                                               </div>
                                           )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
