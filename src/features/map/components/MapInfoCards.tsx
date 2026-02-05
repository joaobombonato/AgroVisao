import React from 'react';
import { Maximize2, Calendar, ChevronDown, Loader2, Undo2 } from 'lucide-react';

interface MapInfoCardsProps {
    areaHectares: number | null;
    availableImages: { date: string, cloudCover: number }[];
    selectedImageIndex: number;
    loadingImages: boolean;
    dateError: boolean;
    onOpenCalendar: () => void;
    onLoadDates: () => void;
}

export function MapInfoCards({
    areaHectares,
    availableImages,
    selectedImageIndex,
    loadingImages,
    dateError,
    onOpenCalendar,
    onLoadDates
}: MapInfoCardsProps) {
    const hasImages = availableImages.length > 0;
    const selectedDate = availableImages[selectedImageIndex]?.date;

    return (
        <div className="grid grid-cols-2 gap-3">
            {/* 1. AREA CARD */}
            <div className="bg-white h-12 rounded-xl border border-gray-100 shadow-sm flex flex-col items-center justify-center px-3">
                <div className="flex items-center gap-1 text-green-600 mb-0.5">
                    <Maximize2 className="w-2.5 h-2.5" />
                    <span className="text-[7.5px] font-black uppercase tracking-widest">Área Monitorada</span>
                </div>
                <div className="flex items-center gap-1">
                    <span className="text-[13px] font-black text-gray-800">
                        {areaHectares ? areaHectares.toLocaleString('pt-BR', { maximumFractionDigits: 2 }) : '--'}
                    </span>
                    <span className="text-[8px] font-black text-green-600/70 uppercase">ha</span>
                </div>
            </div>

            {/* 2. DATE SELECTOR CARD */}
            <div 
                onClick={() => {
                    if (hasImages) onOpenCalendar();
                    else if (!loadingImages) onLoadDates();
                }}
                className={`bg-white h-12 rounded-xl border border-gray-100 shadow-sm flex flex-col items-center justify-center relative transition-all active:scale-95 px-3 cursor-pointer ${hasImages ? 'hover:bg-green-50/50 hover:border-green-100' : 'hover:bg-orange-50/50'}`}
            >
                {hasImages ? (
                    <>
                        <div className="flex flex-col items-center justify-center w-full">
                            <div className="flex items-center gap-1 text-green-600 mb-0.5">
                                <Calendar className="w-2.5 h-2.5" />
                                <span className="text-[7.5px] font-black uppercase tracking-widest">Histórico</span>
                            </div>
                            <div className="flex items-center gap-1">
                                <span className="text-[13px] font-black text-gray-800">
                                    {selectedDate ? selectedDate.split('-').reverse().join('/') : '--/--/----'}
                                </span>
                                <div className="bg-green-50 rounded-full p-0.5">
                                    <ChevronDown className="w-2.5 h-2.5 text-green-700" />
                                </div>
                            </div>
                        </div>
                        {loadingImages && <div className="absolute top-1 right-1"><Loader2 className="w-2 h-2 animate-spin text-green-500" /></div>}
                    </>
                ) : (
                    <div className="flex flex-col items-center justify-center">
                        <div className="flex items-center gap-1 text-gray-400 mb-0.5">
                            {loadingImages ? <Loader2 className="w-2.5 h-2.5 animate-spin" /> : <Calendar className="w-2.5 h-2.5" />}
                            <span className="text-[7.5px] font-black uppercase tracking-widest">{loadingImages ? 'Buscando...' : 'Sem Datas'}</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <span className="text-[10px] font-bold text-gray-500">{loadingImages ? 'Aguarde' : (dateError ? 'Tentar Novamente' : 'Vazio')}</span>
                            {!loadingImages && dateError && <Undo2 className="w-2.5 h-2.5 text-orange-500" />}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
