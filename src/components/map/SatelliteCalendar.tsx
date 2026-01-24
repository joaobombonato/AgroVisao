import React from 'react';
import { Calendar, ChevronLeft, ChevronRight, X } from 'lucide-react';

interface SatelliteCalendarProps {
  calendarMonth: Date;
  setCalendarMonth: React.Dispatch<React.SetStateAction<Date>>;
  availableImages: { date: string; cloudCover: number }[];
  selectedImageIndex: number;
  setSelectedImageIndex: React.Dispatch<React.SetStateAction<number>>;
  setShowCalendar: React.Dispatch<React.SetStateAction<boolean>>;
}

/**
 * Componente de calendário para seleção de imagens de satélite.
 * Exibe dias com imagens disponíveis e permite navegação entre meses.
 */
export const SatelliteCalendar: React.FC<SatelliteCalendarProps> = ({
  calendarMonth,
  setCalendarMonth,
  availableImages,
  selectedImageIndex,
  setSelectedImageIndex,
  setShowCalendar,
}) => {
  const year = calendarMonth.getFullYear();
  const month = calendarMonth.getMonth();
  const days = new Date(year, month + 1, 0).getDate();
  const firstDay = new Date(year, month, 1).getDay();
  
  // Limites de navegação (13 meses)
  const today = new Date();
  const minDate = new Date();
  minDate.setMonth(today.getMonth() - 13);
  
  const isAtMax = year >= today.getFullYear() && month >= today.getMonth();
  const isAtMin = year <= minDate.getFullYear() && month <= minDate.getMonth();
  
  const prevMonth = () => !isAtMin && setCalendarMonth(new Date(year, month - 1, 1));
  const nextMonth = () => !isAtMax && setCalendarMonth(new Date(year, month + 1, 1));
  
  const monthName = new Date(year, month).toLocaleString('pt-BR', { month: 'long', year: 'numeric' });
  
  return (
    <div className="absolute inset-0 z-[1001] bg-black/40 backdrop-blur-sm flex items-start justify-center pt-8 p-4">
      <div className="bg-white rounded-[2rem] w-full max-w-sm overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 border border-white/20">
        <div className="bg-green-700 p-6 text-white flex justify-between items-center bg-gradient-to-br from-green-700 to-green-800">
           <div>
              <h3 className="text-lg font-black tracking-tight capitalize">{monthName}</h3>
              <p className="text-[10px] font-bold opacity-80 uppercase tracking-widest flex items-center gap-1">
                <Calendar className="w-3 h-3" /> Selecione uma imagem
              </p>
           </div>
           <div className="flex gap-1">
              <button onClick={prevMonth} disabled={isAtMin} className={`p-2 rounded-xl transition-colors ${isAtMin ? 'opacity-20 cursor-default' : 'hover:bg-white/20'}`}><ChevronLeft className="w-5 h-5" /></button>
              <button onClick={nextMonth} disabled={isAtMax} className={`p-2 rounded-xl transition-colors ${isAtMax ? 'opacity-20 cursor-default' : 'hover:bg-white/20'}`}><ChevronRight className="w-5 h-5" /></button>
              <button onClick={() => setShowCalendar(false)} className="p-2 hover:bg-white/20 rounded-xl transition-colors ml-1"><X className="w-5 h-5" /></button>
           </div>
        </div>
        
        <div className="p-6">
          <div className="grid grid-cols-7 gap-1 text-center mb-4">
             {['D','S','T','Q','Q','S','S'].map((d, i) => <span key={`${d}-${i}`} className="text-[10px] font-black text-gray-400 uppercase">{d}</span>)}
          </div>
          
          <div className="grid grid-cols-7 gap-2 text-center">
             {Array.from({ length: firstDay }).map((_, i) => <div key={`empty-${i}`} />)}
             {Array.from({ length: days }).map((_, i) => {
               const day = i + 1;
               const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
               const imgInfo = availableImages.find(img => img.date === dateStr);
               const hasImage = !!imgInfo;
               const isSelected = availableImages[selectedImageIndex]?.date === dateStr;
               
               return (
                 <button 
                   key={day}
                   disabled={!hasImage}
                   onClick={() => {
                      const idx = availableImages.findIndex(img => img.date === dateStr);
                      if (idx !== -1) {
                         setSelectedImageIndex(idx);
                         setShowCalendar(false);
                      }
                   }}
                   className={`
                     relative aspect-square flex items-center justify-center rounded-xl text-xs font-bold transition-all
                     ${hasImage ? 'hover:scale-110 active:scale-95 shadow-sm' : 'text-gray-200 cursor-default pointer-events-none'}
                     ${isSelected ? 'bg-green-600 text-white shadow-lg shadow-green-200 ring-2 ring-green-100' : hasImage ? 'bg-green-50 text-green-700 border border-green-100' : ''}
                   `}
                 >
                   {day}
                   {hasImage && !isSelected && (
                      <div className="absolute bottom-1 w-1 h-1 bg-green-500 rounded-full animate-pulse" />
                   )}
                 </button>
               );
             })}
          </div>
        </div>
        
        <div className="p-4 bg-gray-50 border-t flex items-center justify-center gap-5 border-dashed">
           <div className="flex items-center gap-1.5 font-bold text-[9px] text-gray-500 uppercase tracking-widest">
              <div className="w-2 h-2 bg-green-500 rounded-full shadow-sm shadow-green-200" /> Disponível
           </div>
           <div className="flex items-center gap-1.5 font-bold text-[9px] text-gray-500 uppercase tracking-widest">
              <div className="w-2 h-2 bg-gray-200 rounded-full" /> Indisponível
           </div>
        </div>
      </div>
    </div>
  );
};
