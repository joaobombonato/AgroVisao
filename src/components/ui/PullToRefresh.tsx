import React, { useState, useEffect, useRef } from 'react';
import { RefreshCw } from 'lucide-react';

interface PullToRefreshProps {
  onRefresh: () => void;
  children: React.ReactNode;
}

export const PullToRefresh: React.FC<PullToRefreshProps> = ({ onRefresh, children }) => {
  const [pullDist, setPullDist] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [holdProgress, setHoldProgress] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const startY = useRef(0);
  const holdTimer = useRef<any>(null);
  const isAtTop = useRef(false);
  
  const THRESHOLD = 120;
  const MAX_PULL = 160; 
  const HOLD_TIME = 800;

  const handleTouchStart = (e: TouchEvent) => {
    // Verifica se a PÁGINA inteira está no topo (não apenas o container)
    const scrollTop = window.scrollY || document.documentElement.scrollTop;
    const containerScrollTop = containerRef.current?.scrollTop ?? 0;
    
    if (scrollTop === 0 && containerScrollTop === 0) {
      startY.current = e.touches[0].pageY;
      isAtTop.current = true;
      setPullDist(0);
      setHoldProgress(0);
    } else {
      startY.current = -1;
      isAtTop.current = false;
    }
  };

  const handleTouchMove = (e: TouchEvent) => {
    if (startY.current === -1 || refreshing || !isAtTop.current) return;

    const currentY = e.touches[0].pageY;
    const diff = currentY - startY.current;

    // Apenas ativa pull se estiver puxando para BAIXO e scroll está no topo
    if (diff > 0) {
      // Verifica novamente se ainda está no topo
      const scrollTop = window.scrollY || document.documentElement.scrollTop;
      const containerScrollTop = containerRef.current?.scrollTop ?? 0;
      if (scrollTop > 0 || containerScrollTop > 0) {
        isAtTop.current = false;
        return;
      }

      const pull = Math.min(MAX_PULL, diff * 0.4);
      setPullDist(pull);
      
      if (pull >= THRESHOLD && !holdTimer.current) {
        const startTime = Date.now();
        holdTimer.current = setInterval(() => {
          const elapsed = Date.now() - startTime;
          const progress = Math.min(100, (elapsed / HOLD_TIME) * 100);
          setHoldProgress(progress);
          
          if (elapsed >= HOLD_TIME) {
            triggerRefresh();
          }
        }, 50);
      } else if (pull < THRESHOLD && holdTimer.current) {
        clearHold();
      }

      if (pull > 5 && e.cancelable) e.preventDefault();
    } else {
      // Se puxou para cima, desativa
      isAtTop.current = false;
      clearHold();
      setPullDist(0);
    }
  };

  const clearHold = () => {
    if (holdTimer.current) {
      clearInterval(holdTimer.current);
      holdTimer.current = null;
    }
    setHoldProgress(0);
  };

  const triggerRefresh = () => {
    clearHold();
    setRefreshing(true);
    if (window.navigator?.vibrate) window.navigator.vibrate(50);
    onRefresh();
  };

  const handleTouchEnd = () => {
    clearHold();
    setPullDist(0);
    startY.current = -1;
    isAtTop.current = false;
  };

  useEffect(() => {
    const el = containerRef.current;
    if (el) {
      el.addEventListener('touchstart', handleTouchStart, { passive: true });
      el.addEventListener('touchmove', handleTouchMove, { passive: false });
      el.addEventListener('touchend', handleTouchEnd);
      return () => {
        el.removeEventListener('touchstart', handleTouchStart);
        el.removeEventListener('touchmove', handleTouchMove);
        el.removeEventListener('touchend', handleTouchEnd);
      };
    }
  }, [pullDist, refreshing]);

  return (
    <div ref={containerRef} className="flex-1 flex flex-col relative overflow-y-auto">
      {/* Visual Pull Indicator */}
      <div 
        className="absolute w-full flex flex-col items-center pointer-events-none z-50 transition-transform duration-200"
        style={{ 
          transform: `translateY(${pullDist - 60}px)`, 
          opacity: pullDist > 10 ? 1 : 0 
        }}
      >
        <div className={`p-2 rounded-full bg-white shadow-xl border-2 flex items-center justify-center transition-all ${pullDist >= THRESHOLD ? 'border-indigo-200 scale-110' : 'border-gray-100'}`}>
          <div className="relative">
            <RefreshCw 
              className={`w-6 h-6 transition-colors ${holdProgress >= 100 ? 'text-indigo-600' : 'text-gray-400'}`} 
              style={{ transform: `rotate(${pullDist * 2}deg)` }}
            />
            {/* Circular Progress Ring */}
            {pullDist >= THRESHOLD && (
               <svg className="absolute -inset-2 w-10 h-10 -rotate-90">
                  <circle
                    cx="20" cy="20" r="16"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                    className="text-indigo-600"
                    strokeDasharray={100}
                    strokeDashoffset={100 - holdProgress}
                  />
               </svg>
            )}
          </div>
        </div>
        {pullDist >= THRESHOLD && (
          <span className="mt-4 text-[10px] font-black uppercase tracking-widest text-indigo-600 bg-white/80 px-3 py-1 rounded-full backdrop-blur-sm shadow-sm">
            {holdProgress < 100 ? 'Segure para atualizar' : 'Solte para atualizar'}
          </span>
        )}
      </div>

      {children}

      {/* Full Screen Loading Overlay */}
      {refreshing && (
        <div className="fixed inset-0 bg-[#0f172a]/40 backdrop-blur-md z-[9999] flex items-center justify-center animate-in fade-in duration-300">
           <div className="bg-white p-6 rounded-[35px] shadow-2xl flex flex-col items-center gap-4 border border-white/20">
              <div className="relative">
                <div className="w-16 h-16 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin" />
                <RefreshCw className="absolute inset-0 m-auto w-6 h-6 text-indigo-600" />
              </div>
              <span className="font-black text-slate-800 text-xs uppercase tracking-[3px]">Atualizando Sistema</span>
           </div>
        </div>
      )}
    </div>
  );
};
