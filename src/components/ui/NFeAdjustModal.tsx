import React, { useState } from 'react';
import { X, Check, ZoomIn, ZoomOut, RotateCw, ChevronUp, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';

interface AdjustConfig {
    zoom: number;
    offsetX: number;
    offsetY: number;
    rotation: number;
    rawImage: string;
}

interface NFeAdjustModalProps {
    isOpen: boolean;
    onClose: () => void;
    rawImage: string;
    onApply: (adjustedBase64: string) => void;
}

export function NFeAdjustModal({ isOpen, onClose, rawImage, onApply }: NFeAdjustModalProps) {
    const [config, setConfig] = useState<AdjustConfig>({
        zoom: 0.8,
        offsetX: 0,
        offsetY: 0,
        rotation: 0,
        rawImage
    });
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
    const canvasRef = React.useRef<HTMLCanvasElement>(null);

    if (!isOpen) return null;

    const onStartDrag = (e: any) => {
        setIsDragging(true);
        const touch = e.touches ? e.touches[0] : e;
        setDragStart({
            x: touch.clientX - config.offsetX,
            y: touch.clientY - config.offsetY
        });
    };

    const onMoveDrag = (e: any) => {
        if (!isDragging) return;
        const touch = e.touches ? e.touches[0] : e;
        setConfig(prev => ({
            ...prev,
            offsetX: touch.clientX - dragStart.x,
            offsetY: touch.clientY - dragStart.y
        }));
    };

    const onEndDrag = () => setIsDragging(false);

    const handleApply = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const img = new Image();
        img.onload = () => {
            // Target size for OCR processing (A4 ratio)
            canvas.width = 1240;
            canvas.height = 1754;
            
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            ctx.save();
            ctx.translate(canvas.width / 2 + config.offsetX * 3, canvas.height / 2 + config.offsetY * 3);
            ctx.rotate((config.rotation * Math.PI) / 180);
            ctx.scale(config.zoom * 3, config.zoom * 3);
            ctx.drawImage(img, -img.width / 2, -img.height / 2);
            ctx.restore();

            onApply(canvas.toDataURL('image/jpeg', 0.9));
        };
        img.src = rawImage;
    };

    return (
        <div className="fixed inset-0 z-[2000] bg-black/95 flex flex-col items-center justify-center p-4 backdrop-blur-md">
            <div className="w-full max-w-md flex flex-col h-full max-h-[90vh]">
                <div className="flex items-center justify-between mb-4 px-2">
                    <div>
                        <h2 className="text-white font-black uppercase italic tracking-tighter">Ajuste de Scanner</h2>
                        <p className="text-[10px] text-indigo-400 font-bold uppercase">Posicione a nota no guia</p>
                    </div>
                    <button onClick={onClose} className="p-2 bg-white/10 rounded-full text-white">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <div 
                    className="flex-1 relative bg-gray-900 rounded-2xl border-2 border-white/10 overflow-hidden cursor-move touch-none"
                    onMouseDown={onStartDrag}
                    onMouseMove={onMoveDrag}
                    onMouseUp={onEndDrag}
                    onMouseLeave={onEndDrag}
                    onTouchStart={onStartDrag}
                    onTouchMove={onMoveDrag}
                    onTouchEnd={onEndDrag}
                >
                    {/* Imagem em ajuste */}
                    <div 
                        className="absolute inset-0 flex items-center justify-center pointer-events-none"
                        style={{
                            transform: `translate(${config.offsetX}px, ${config.offsetY}px) scale(${config.zoom}) rotate(${config.rotation}deg)`,
                            transition: isDragging ? 'none' : 'transform 0.2s ease-out'
                        }}
                    >
                        <img src={rawImage} alt="Preview" className="max-w-none w-full" />
                    </div>

                    {/* Guia A4 Mockup */}
                    <div className="absolute inset-0 pointer-events-none flex items-center justify-center p-6">
                        <div className="w-full aspect-[210/297] border-2 border-dashed border-indigo-500/50 rounded-lg shadow-[0_0_0_1000px_rgba(0,0,0,0.4)]">
                             {/* Cantinho Guia */}
                             <div className="absolute -top-1 -left-1 w-8 h-8 border-l-4 border-t-4 border-indigo-500 rounded-tl-xl" />
                             <div className="absolute -top-1 -right-1 w-8 h-8 border-r-4 border-t-4 border-indigo-500 rounded-tr-xl" />
                             <div className="absolute -bottom-1 -left-1 w-8 h-8 border-l-4 border-b-4 border-indigo-500 rounded-bl-xl" />
                             <div className="absolute -bottom-1 -right-1 w-8 h-8 border-r-4 border-b-4 border-indigo-500 rounded-br-xl" />
                        </div>
                    </div>
                </div>

                {/* Controles */}
                <div className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-3xl p-4 mt-4 space-y-4">
                    <div className="grid grid-cols-4 gap-2">
                         <button 
                            onClick={() => setConfig(prev => ({ ...prev, zoom: Math.max(0.2, prev.zoom - 0.1) }))}
                            className="bg-white/5 py-3 rounded-xl flex items-center justify-center text-white active:scale-90 transition-all"
                         >
                            <ZoomOut className="w-5 h-5" />
                         </button>
                         <button 
                            onClick={() => setConfig(prev => ({ ...prev, zoom: Math.min(3, prev.zoom + 0.1) }))}
                            className="bg-white/5 py-3 rounded-xl flex items-center justify-center text-white active:scale-90 transition-all"
                         >
                            <ZoomIn className="w-5 h-5" />
                         </button>
                         <button 
                            onClick={() => setConfig(prev => ({ ...prev, rotation: (prev.rotation - 90) % 360 }))}
                            className="bg-white/5 py-3 rounded-xl flex items-center justify-center text-white active:scale-90 transition-all"
                         >
                            <RotateCw className="w-5 h-5 rotate-180" />
                         </button>
                         <button 
                            onClick={() => setConfig(prev => ({ ...prev, rotation: (prev.rotation + 90) % 360 }))}
                            className="bg-white/5 py-3 rounded-xl flex items-center justify-center text-white active:scale-90 transition-all"
                         >
                            <RotateCw className="w-5 h-5" />
                         </button>
                    </div>

                    <div className="flex gap-2">
                        <button 
                            onClick={() => setConfig({ zoom: 0.8, offsetX: 0, offsetY: 0, rotation: 0, rawImage })}
                            className="flex-1 py-4 text-xs font-black text-white/40 uppercase tracking-widest"
                        >
                            Resetar
                        </button>
                        <button 
                            onClick={handleApply}
                            className="flex-[2] bg-indigo-600 py-4 rounded-2xl text-white font-black uppercase tracking-widest shadow-lg shadow-indigo-500/20 active:scale-95 transition-all flex items-center justify-center gap-2"
                        >
                            <Check className="w-5 h-5" /> Confirmar Ajuste
                        </button>
                    </div>
                </div>
            </div>
            <canvas ref={canvasRef} className="hidden" />
        </div>
    );
}
