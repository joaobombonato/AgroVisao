import { useState, useEffect } from 'react';
import { Share, PlusSquare, X } from 'lucide-react';

export const IOSInstallBanner = () => {
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    // Detect if it's iOS
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    
    // Check if it's already in standalone mode (installed)
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone;

    if (isIOS && !isStandalone) {
      // Check if user dismissed it in this session
      const dismissed = sessionStorage.getItem('ios-pwa-dismissed');
      if (!dismissed) {
        setShowBanner(true);
      }
    }
  }, []);

  if (!showBanner) return null;

  return (
    <div className="mx-4 mt-4 p-4 bg-gradient-to-r from-blue-600 to-indigo-700 rounded-2xl shadow-lg border border-indigo-500/20 animate-in slide-in-from-top-4 duration-500 relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute -right-4 -top-4 w-24 h-24 bg-white/5 rounded-full blur-2xl"></div>
      
      <div className="relative z-10">
        <div className="flex justify-between items-start mb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 backdrop-blur-md rounded-xl flex items-center justify-center">
               <img src="/icon.png" alt="AgroVisão" className="w-7 h-7 object-contain" />
            </div>
            <div>
              <h3 className="text-white font-bold text-sm">Instalar AgroVisão</h3>
              <p className="text-[10px] text-blue-100 opacity-90">Tenha acesso rápido na tela de início</p>
            </div>
          </div>
          <button 
            onClick={() => {
              setShowBanner(false);
              sessionStorage.setItem('ios-pwa-dismissed', 'true');
            }}
            className="text-white/60 hover:text-white p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 border border-white/10">
          <p className="text-[10px] text-white font-medium mb-3 flex items-center gap-2">
            Siga os passos abaixo para instalar no seu iPhone:
          </p>
          
          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-center gap-2 bg-black/20 p-2 rounded-lg">
              <div className="w-6 h-6 bg-blue-500 rounded text-[10px] flex items-center justify-center font-bold text-white shadow-sm">1</div>
              <div className="flex flex-col">
                <span className="text-[9px] text-white/70">Toque em</span>
                <div className="flex items-center gap-1">
                  <span className="text-[10px] text-white font-bold">Compartilhar</span>
                  <Share className="w-3 h-3 text-blue-300" />
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-2 bg-black/20 p-2 rounded-lg">
              <div className="w-6 h-6 bg-blue-500 rounded text-[10px] flex items-center justify-center font-bold text-white shadow-sm">2</div>
              <div className="flex flex-col">
                <span className="text-[9px] text-white/70">Escolha</span>
                <div className="flex items-center gap-1">
                  <span className="text-[10px] text-white font-bold">Tela de Início</span>
                  <PlusSquare className="w-3 h-3 text-blue-300" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
