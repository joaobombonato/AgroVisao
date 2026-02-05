import React from 'react';
import { Building2, Camera, Move } from 'lucide-react';

interface FazendaLogoHeaderProps {
    logoUrl: string;
    onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onAdjustClick: () => void;
}

export function FazendaLogoHeader({ logoUrl, onFileChange, onAdjustClick }: FazendaLogoHeaderProps) {
    return (
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex flex-col items-center">
            <div className="relative group cursor-pointer">
                <div className="w-32 h-32 rounded-full border-4 border-gray-100 overflow-hidden bg-gray-50 flex items-center justify-center shadow-inner">
                    {logoUrl ? (
                        <img src={logoUrl} alt="Logo Fazenda" className="w-full h-full object-cover" />
                    ) : (
                        <Building2 className="w-12 h-12 text-gray-300" />
                    )}
                </div>
                <label className="absolute bottom-0 right-0 bg-green-600 text-white p-2.5 rounded-full shadow-lg hover:bg-green-700 transition-colors cursor-pointer border-4 border-white">
                    <Camera className="w-5 h-5" />
                    <input type="file" className="hidden" accept="image/*" onChange={onFileChange} />
                </label>
            </div>
            {logoUrl && (
                <button onClick={onAdjustClick} className="mt-5 text-xs font-bold text-green-600 hover:text-green-700 flex items-center gap-1.5 px-3 py-1.5 bg-green-50 rounded-full transition-colors">
                    <Move className="w-3 h-3" /> Ajustar logotipo
                </button>
            )}
            <p className="mt-4 text-[10px] text-gray-400 font-bold uppercase tracking-[0.15em] text-center">Toque para selecionar a logo</p>
        </div>
    );
}
