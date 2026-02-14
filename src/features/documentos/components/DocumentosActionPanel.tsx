import { useRef } from 'react';
import { Camera, Paperclip, ScanBarcode } from 'lucide-react';

interface DocumentosActionPanelProps {
  setShowScanSelector: (show: boolean) => void;
  showScanSelector: boolean;
  setScanMode: (mode: 'nfe' | 'boleto') => void;
  setShowScanner: (show: boolean) => void;
  setShowCamera: (show: boolean) => void;
  onAttachClick: () => void;
}

export const DocumentosActionPanel = ({
  setShowScanSelector,
  showScanSelector,
  setScanMode,
  setShowScanner,
  setShowCamera,
  onAttachClick
}: DocumentosActionPanelProps) => {
  return (
    <div className="grid grid-cols-3 gap-2">
      {/* BOTÃO PRINCIPAL: Scanner com Seletor */}
      <div className="relative">
        <button type="button" onClick={() => setShowScanSelector(!showScanSelector)} className="w-full flex flex-col items-center justify-center p-4 bg-gradient-to-b from-blue-50 to-blue-100 border-2 border-blue-300 rounded-xl shadow-md hover:from-blue-100 hover:to-blue-200 active:scale-95 transition-all relative overflow-hidden">
            <div className="absolute top-1 right-1 bg-blue-500 text-white text-[7px] font-bold px-1.5 py-0.5 rounded-full">SMART</div>
            <ScanBarcode className="w-7 h-7 text-blue-600 mb-1" />
            <span className="text-[10px] font-bold text-blue-700 text-center">Ler Cód. Barras</span>
            <span className="text-[8px] text-blue-400 mt-0.5">NF-e • Boleto</span>
        </button>
        
        {/* Seletor NF-e / Boleto */}
        {showScanSelector && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-white border-2 border-blue-200 rounded-xl shadow-xl z-50 overflow-hidden animate-in slide-in-from-top-2">
            <button
              type="button"
              onClick={() => { setScanMode('nfe'); setShowScanSelector(false); setShowScanner(true); }}
              className="w-full flex items-center gap-3 p-3 hover:bg-indigo-50 transition-colors border-b border-gray-100"
            >
              <div className="text-left">
                <p className="text-xs font-bold text-gray-800">NF-e / DANFE</p>
                <p className="text-[9px] text-gray-400">Nota Fiscal Eletrônica</p>
              </div>
            </button>
            <button
              type="button"
              onClick={() => { setScanMode('boleto'); setShowScanSelector(false); setShowScanner(true); }}
              className="w-full flex items-center gap-3 p-3 hover:bg-amber-50 transition-colors"
            >
              <div className="text-left">
                <p className="text-xs font-bold text-gray-800">Boleto Bancário</p>
              </div>
            </button>
          </div>
        )}
      </div>
      
      {/* Foto do Documento (Secundário) */}
      <button type="button" onClick={() => setShowCamera(true)} className="flex flex-col items-center justify-center p-3 bg-white border-2 border-purple-100 rounded-xl shadow-sm hover:bg-purple-50 active:scale-95 transition-all">
           <Camera className="w-6 h-6 text-purple-600 mb-1" />
           <span className="text-[10px] font-bold text-gray-600 text-center">Foto de Docs</span>
           <span className="text-[8px] text-gray-400 mt-0.5">Comprovantes</span>
      </button>

      {/* Anexar Arquivo */}
      <button type="button" onClick={onAttachClick} className="flex flex-col items-center justify-center p-3 bg-white border-2 border-purple-100 rounded-xl shadow-sm hover:bg-purple-50 active:scale-95 transition-all">
          <Paperclip className="w-6 h-6 text-gray-500 mb-1" />
          <span className="text-[10px] font-bold text-gray-600 text-center">Anexar Arquivos</span>
          <span className="text-[8px] text-gray-400 mt-0.5">PDF • Imagens</span>
      </button>
    </div>
  );
};
