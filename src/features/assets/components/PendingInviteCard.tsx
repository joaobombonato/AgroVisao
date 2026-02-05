import React from 'react';
import { Clock, X } from 'lucide-react';

interface PendingInviteCardProps {
    convite: any;
    onCancel: () => void;
}

export function PendingInviteCard({ convite, onCancel }: PendingInviteCardProps) {
    return (
        <div className="p-5 flex items-center justify-between group hover:bg-gray-50 transition-colors bg-amber-50/10">
            <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-amber-100 text-amber-600 border border-amber-200 border-dashed animate-pulse">
                    <Clock className="w-5 h-5" />
                </div>
                <div>
                    <p className="text-sm font-bold text-gray-800">
                        {convite.email}
                    </p>
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black uppercase text-amber-600/70">{convite.role}</span>
                        <span className="text-[9px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full font-bold uppercase tracking-tighter">Aguardando Cadastro</span>
                    </div>
                </div>
            </div>

            <button 
                onClick={onCancel}
                className="p-2 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
            >
                <X className="w-5 h-5" />
            </button>
        </div>
    );
}
