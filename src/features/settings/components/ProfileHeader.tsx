import React from 'react';
import { User, Camera, Move } from 'lucide-react';

interface ProfileHeaderProps {
    previewUrl: string;
    fullName: string;
    funcao: string;
    avatarUrl: string;
    loading: boolean;
    onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onAdjustClick: () => void;
}

export function ProfileHeader({
    previewUrl,
    fullName,
    funcao,
    avatarUrl,
    loading,
    onFileSelect,
    onAdjustClick
}: ProfileHeaderProps) {
    return (
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex flex-col items-center">
            <div className="relative group">
                <div className="w-24 h-24 rounded-full border-4 border-gray-50 overflow-hidden bg-indigo-50 flex items-center justify-center shadow-inner">
                    {previewUrl ? (
                        <img src={previewUrl} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                        <User className="w-10 h-10 text-indigo-200" />
                    )}
                </div>
                <label className="absolute bottom-0 right-0 bg-indigo-600 text-white p-2 rounded-full shadow-lg border-2 border-white cursor-pointer active:scale-90 transition-all">
                    <Camera className="w-4 h-4" />
                    <input type="file" className="hidden" accept="image/*" onChange={onFileSelect} disabled={loading} />
                </label>
            </div>
            {avatarUrl && !avatarUrl.startsWith('http') && (
                <button 
                    onClick={onAdjustClick}
                    className="mt-3 text-[10px] font-black text-indigo-600 flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 rounded-full hover:bg-indigo-100 transition-colors uppercase tracking-widest"
                >
                    <Move className="w-3 h-3"/> Ajustar Foto
                </button>
            )}
            <h3 className="mt-4 font-bold text-gray-800 text-lg">{fullName || 'Seu Nome'}</h3>
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{funcao || 'Membro da Equipe'}</p>
        </div>
    );
}
