import React, { useState, useRef, useCallback, useEffect } from 'react';
import { RefreshCw } from 'lucide-react';

interface PullToRefreshProps {
  onRefresh: () => void;
  children: React.ReactNode;
}

/**
 * Verifica se QUALQUER elemento scrollável entre o target e o container
 * está com scrollTop > 0. Se algum estiver scrollado, o pull NÃO deve ativar.
 */
function isAnyParentScrolled(target: HTMLElement, container: HTMLElement): boolean {
  let el: HTMLElement | null = target;
  while (el && el !== container) {
    if (el.scrollTop > 0) return true;
    // Verifica se o elemento é scrollável
    const style = window.getComputedStyle(el);
    const overflowY = style.overflowY;
    if ((overflowY === 'auto' || overflowY === 'scroll') && el.scrollTop > 0) {
      return true;
    }
    el = el.parentElement;
  }
  // Verifica o container também
  if (container.scrollTop > 0) return true;
  return false;
}

export const PullToRefresh: React.FC<PullToRefreshProps> = ({ onRefresh, children }) => {
  const [pullDist, setPullDist] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const startY = useRef(-1);
  const pulling = useRef(false);
  
  const THRESHOLD = 80;
  const MAX_PULL = 130; 

  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (refreshing) return;
    const container = containerRef.current;
    if (!container) return;
    
    const target = e.target as HTMLElement;
    
    // Verifica se window está no topo E se nenhum parent scrollável está scrollado
    const windowAtTop = (window.scrollY || document.documentElement.scrollTop) === 0;
    const parentsScrolled = isAnyParentScrolled(target, container);
    
    if (windowAtTop && !parentsScrolled) {
      startY.current = e.touches[0].clientY;
      pulling.current = false;
    } else {
      startY.current = -1;
    }
  }, [refreshing]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (startY.current === -1 || refreshing) return;

    const currentY = e.touches[0].clientY;
    const diff = currentY - startY.current;

    // Só ativa pull para baixo quando diferença > 10px (evita toques acidentais)
    if (diff > 10) {
      // Re-verifica scrolls (pode ter mudado desde o touchstart)
      const container = containerRef.current;
      const target = e.target as HTMLElement;
      if (container && isAnyParentScrolled(target, container)) {
        startY.current = -1;
        return;
      }
      
      pulling.current = true;
      const pull = Math.min(MAX_PULL, (diff - 10) * 0.45);
      setPullDist(pull);
      
      if (e.cancelable) e.preventDefault();
    } else if (diff < -5) {
      // Puxou para cima = cancelar pull
      startY.current = -1;
      setPullDist(0);
      pulling.current = false;
    }
  }, [refreshing]);

  const handleTouchEnd = useCallback(() => {
    if (pulling.current && pullDist >= THRESHOLD) {
      // Trigger refresh
      setRefreshing(true);
      setPullDist(0);
      if (window.navigator?.vibrate) window.navigator.vibrate(50);
      onRefresh();
    } else {
      setPullDist(0);
    }
    startY.current = -1;
    pulling.current = false;
  }, [pullDist, onRefresh]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    
    el.addEventListener('touchstart', handleTouchStart, { passive: true });
    el.addEventListener('touchmove', handleTouchMove, { passive: false });
    el.addEventListener('touchend', handleTouchEnd);
    
    return () => {
      el.removeEventListener('touchstart', handleTouchStart);
      el.removeEventListener('touchmove', handleTouchMove);
      el.removeEventListener('touchend', handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd]);

  const progress = Math.min(100, (pullDist / THRESHOLD) * 100);
  const pastThreshold = pullDist >= THRESHOLD;

  return (
    <div ref={containerRef} className="flex-1 flex flex-col relative overflow-y-auto">
      {/* Pull Indicator - só aparece quando puxando */}
      {pullDist > 5 && (
        <div 
          className="absolute w-full flex flex-col items-center pointer-events-none z-50"
          style={{ 
            transform: `translateY(${pullDist - 50}px)`, 
            opacity: Math.min(1, pullDist / 30)
          }}
        >
          <div className={`p-2 rounded-full bg-white shadow-xl border-2 flex items-center justify-center transition-all ${pastThreshold ? 'border-green-400 scale-110' : 'border-gray-200'}`}>
            <div className="relative">
              <RefreshCw 
                className={`w-5 h-5 transition-colors ${pastThreshold ? 'text-green-600' : 'text-gray-400'}`} 
                style={{ transform: `rotate(${pullDist * 3}deg)` }}
              />
              {/* Progress ring */}
              <svg className="absolute -inset-1.5 w-8 h-8 -rotate-90">
                <circle
                  cx="16" cy="16" r="12"
                  fill="none"
                  stroke={pastThreshold ? '#16a34a' : '#d1d5db'}
                  strokeWidth="2"
                  strokeDasharray={75}
                  strokeDashoffset={75 - (progress * 0.75)}
                  strokeLinecap="round"
                />
              </svg>
            </div>
          </div>
          {pastThreshold && (
            <span className="mt-2 text-[9px] font-bold uppercase tracking-widest text-green-600 bg-white/90 px-2 py-0.5 rounded-full shadow-sm">
              Solte para atualizar
            </span>
          )}
        </div>
      )}

      {children}

      {/* Loading Overlay */}
      {refreshing && (
        <div className="fixed inset-0 bg-[#0f172a]/40 backdrop-blur-md z-[9999] flex items-center justify-center animate-in fade-in duration-300">
           <div className="bg-white p-6 rounded-[35px] shadow-2xl flex flex-col items-center gap-4 border border-white/20">
              <div className="relative">
                <div className="w-16 h-16 border-4 border-green-100 border-t-green-600 rounded-full animate-spin" />
                <RefreshCw className="absolute inset-0 m-auto w-6 h-6 text-green-600" />
              </div>
              <span className="font-black text-slate-800 text-xs uppercase tracking-[3px]">Atualizando Sistema</span>
           </div>
        </div>
      )}
    </div>
  );
};
