import React from 'react';
import type { OverlayType } from '../utils/mapHelpers';

interface AnalysisControlBarProps {
    overlayType: OverlayType;
    setOverlayType: (type: OverlayType) => void;
}

const INDICES = [
    { id: 'savi', label: 'SAVI' },
    { id: 'ndvi', label: 'NDVI' },
    { id: 'evi', label: 'EVI' },
    { id: 'ndre', label: 'NDRE' },
    { id: 'ndmi', label: 'NDMI' },
    { id: 'truecolor', label: 'REAL' }
];

export function AnalysisControlBar({ overlayType, setOverlayType }: AnalysisControlBarProps) {
    return (
        <div className="flex flex-col w-full gap-1.5">
            <div className="flex items-center justify-between px-1">
                <span className="text-[8px] font-black text-gray-400 uppercase tracking-[0.2em]">Índices Visuais</span>
                <div className="h-px flex-1 bg-gray-100 ml-3 hidden sm:block" />
            </div>
            <div className="flex bg-gray-100 rounded-xl p-0.5 gap-0.5 overflow-x-auto no-scrollbar">
                {INDICES.map(idx => (
                    <button 
                        key={idx.id} 
                        onClick={() => setOverlayType(idx.id as OverlayType)} 
                        className={`flex-1 min-w-[48px] px-1 py-1.5 text-[9px] font-black rounded-lg transition-all whitespace-nowrap ${overlayType === idx.id ? 'bg-green-600 shadow-sm text-white' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        {idx.label}
                    </button>
                ))}
            </div>
        </div>
    );
}
