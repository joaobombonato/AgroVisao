import React, { useState, useEffect, useRef } from 'react';
import { RefreshCw } from 'lucide-react';

interface PullToRefreshProps {
  onRefresh: () => void;
  children: React.ReactNode;
}

export const PullToRefresh: React.FC<PullToRefreshProps> = ({ onRefresh, children }) => {
  const [pullDist, setPullDist] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const startY = useRef(0);
  const THRESHOLD = 80; // Pixels to pull before refresh
  const MAX_PULL = 120; // Max visual pull

  const handleTouchStart = (e: TouchEvent) => {
    // Only allow pull if at top of scroll
    if (containerRef.current && containerRef.current.scrollTop === 0) {
      startY.current = e.touches[0].pageY;
      setPullDist(0);
    } else {
      startY.current = -1; // Disable
    }
  };

  const handleTouchMove = (e: TouchEvent) => {
    if (startY.current === -1 || refreshing) return;

    const currentY = e.touches[0].pageY;
    const diff = currentY - startY.current;

    if (diff > 0) {
      // Apply some resistance (damping)
      const pull = Math.min(MAX_PULL, diff * 0.4);
      setPullDist(pull);
      
      // Prevent browser default pull-down refresh if we are handling it
      if (pull > 5) {
        if (e.cancelable) e.preventDefault();
      }
    }
  };

  const handleTouchEnd = () => {
    if (pullDist >= THRESHOLD && !refreshing) {
      setRefreshing(true);
      // Haptic feedback if available
      if (window.navigator && window.navigator.vibrate) {
        window.navigator.vibrate(50);
      }
      onRefresh();
    }
    setPullDist(0);
    startY.current = -1;
  };

  useEffect(() => {
    const el = containerRef.current;
    if (el) {
      el.addEventListener('touchstart', handleTouchStart, { passive: false });
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
        className="absolute w-full flex justify-center pointer-events-none z-50 transition-transform duration-200"
        style={{ 
          transform: `translateY(${pullDist - 40}px)`, 
          opacity: pullDist > 10 ? 1 : 0 
        }}
      >
        <div className={`p-2 rounded-full bg-white shadow-lg border border-gray-100 flex items-center justify-center transition-all ${pullDist >= THRESHOLD ? 'bg-blue-50 border-blue-200 scale-110' : ''}`}>
          <RefreshCw 
            className={`w-5 h-5 ${pullDist >= THRESHOLD ? 'text-blue-600' : 'text-gray-400'}`} 
            style={{ transform: `rotate(${pullDist * 3}deg)` }}
          />
        </div>
      </div>

      {children}

      {/* Full Screen Loading Overlay if refreshing */}
      {refreshing && (
        <div className="fixed inset-0 bg-white/20 backdrop-blur-[2px] z-[9999] flex items-center justify-center animate-in fade-in duration-300">
           <div className="bg-white p-4 rounded-2xl shadow-2xl flex items-center gap-3">
              <RefreshCw className="w-6 h-6 text-blue-600 animate-spin" />
              <span className="font-bold text-gray-700">Atualizando...</span>
           </div>
        </div>
      )}
    </div>
  );
};
