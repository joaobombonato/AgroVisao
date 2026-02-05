import React from 'react';
import { Shield, Crown, X } from 'lucide-react';

interface MemberCardProps {
    membro: any;
    isCurrentUser: boolean;
    onRemove: () => void;
}

export function MemberCard({ membro, isCurrentUser, onRemove }: MemberCardProps) {
    return (
        <div className={`p-5 flex items-center justify-between group hover:bg-gray-50 transition-colors ${isCurrentUser ? 'bg-indigo-50/20' : ''}`}>
            <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    membro.role === 'Proprietário' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-400'
                }`}>
                    {membro.role === 'Proprietário' ? <Crown className="w-5 h-5" /> : <Shield className="w-5 h-5" />}
                </div>
                <div>
                    <p className="text-sm font-bold text-gray-800">
                        {membro.profiles?.email || 'Membro Externo'}
                    </p>
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black uppercase text-indigo-600/70">{membro.role}</span>
                        <span className="text-[9px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full font-bold uppercase tracking-tighter">Ativo</span>
                    </div>
                </div>
            </div>

            {membro.role !== 'Proprietário' && (
                <button 
                    onClick={onRemove}
                    className="p-2 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                >
                    <X className="w-5 h-5" />
                </button>
            )}
        </div>
    );
}
