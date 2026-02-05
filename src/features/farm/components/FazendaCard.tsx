import React from 'react';
import { Building2, MapPin, ChevronRight } from 'lucide-react';

interface FazendaCardProps {
    fazenda: any;
    onClick: () => void;
}

export function FazendaCard({ fazenda, onClick }: FazendaCardProps) {
    return (
        <div 
            onClick={onClick}
            className="group bg-white rounded-3xl p-6 shadow-sm border-2 border-transparent hover:border-indigo-500 hover:shadow-xl transition-all text-left flex flex-col gap-4 relative overflow-hidden cursor-pointer active:scale-95"
        >
            <div className="bg-indigo-50 w-14 h-14 rounded-2xl flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-all overflow-hidden shadow-inner">
                {fazenda.config?.logo_base64 ? (
                    <img src={fazenda.config.logo_base64} alt="Logo" className="w-full h-full object-cover" />
                ) : (
                    <Building2 className="w-7 h-7 text-indigo-700 group-hover:text-white" />
                )}
            </div>
            
            <div>
                <h3 className="text-xl font-black text-gray-900 group-hover:text-indigo-700 transition-colors leading-tight">
                    {fazenda.nome || 'Fazenda Sem Nome'}
                </h3>
                <div className="flex items-center gap-1 text-gray-400 text-[10px] font-bold uppercase tracking-wider mt-1">
                    <MapPin className="w-3 h-3 text-indigo-400" />
                    {fazenda.cidade || 'Localização'} - {fazenda.estado || 'UF'}
                </div>
            </div>

            <div className="mt-auto pt-4 border-t border-gray-50 flex justify-between items-center w-full">
                <span className="text-[10px] font-black text-indigo-600/50 uppercase tracking-widest">
                    {fazenda.tamanho_ha ? `${fazenda.tamanho_ha} ha` : 'Área n/d'}
                </span>
                <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-all">
                    <ChevronRight className="w-4 h-4" />
                </div>
            </div>
        </div>
    );
}
