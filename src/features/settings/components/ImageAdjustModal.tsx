import React from 'react';
import { X, Check, Loader2, ZoomOut, ZoomIn, ChevronUp, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';

interface AdjustConfig {
    zoom: number;
    offsetX: number;
    offsetY: number;
    rawImage: string;
}

interface ImageAdjustModalProps {
    isOpen: boolean;
    onClose: () => void;
    adjustConfig: AdjustConfig;
    setZoom: (zoom: number) => void;
    setOffset: (x: number, y: number) => void;
    onApply: () => void;
    onStartDrag: (e: any) => void;
    onMoveDrag: (e: any) => void;
    onEndDrag: () => void;
    canvasRef: React.RefObject<HTMLCanvasElement>;
}

export function ImageAdjustModal({
    isOpen,
    onClose,
    adjustConfig,
    setZoom,
    setOffset,
    onApply,
    onStartDrag,
    onMoveDrag,
    onEndDrag,
    canvasRef
}: ImageAdjustModalProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[1500] bg-black/80 flex flex-col items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white w-full max-w-sm rounded-[2.5rem] overflow-hidden shadow-2xl flex flex-col">
                <div className="p-5 border-b flex justify-between items-center bg-gray-50/50">
                    <h3 className="font-bold text-gray-800 text-sm">Ajustar Foto de Perfil</h3>
                    <button onClick={onClose} className="p-1 hover:bg-gray-200 rounded-full transition-colors">
                        <X className="w-5 h-5 text-gray-400" />
                    </button>
                </div>
                
                <div className="flex-1 overflow-y-auto p-5 flex flex-col items-center gap-5">
                    <div 
                        className="w-44 h-44 shrink-0 rounded-full border-4 border-dashed border-indigo-500 relative overflow-hidden bg-gray-100 cursor-move select-none flex items-center justify-center"
                        onMouseDown={onStartDrag}
                        onMouseMove={onMoveDrag}
                        onMouseUp={onEndDrag}
                        onMouseLeave={onEndDrag}
                        onTouchStart={onStartDrag}
                        onTouchMove={onMoveDrag}
                        onTouchEnd={onEndDrag}
                    >
                        {adjustConfig.rawImage && (
                            <img 
                                src={adjustConfig.rawImage} 
                                alt="Ajuste" 
                                className="max-w-none transition-all duration-75 block pointer-events-none"
                                style={{
                                    transformOrigin: 'center center',
                                    transform: `translate(${adjustConfig.offsetX}px, ${adjustConfig.offsetY}px) scale(${adjustConfig.zoom})`
                                }}
                            />
                        )}
                        <div className="absolute inset-0 rounded-full shadow-[0_0_0_999px_rgba(255,255,255,0.4)] pointer-events-none"></div>
                    </div>

                    <p className="text-[9px] font-medium text-gray-400 uppercase tracking-widest text-center">
                        Arraste a imagem para centralizar
                    </p>

                    <div className="w-full space-y-4">
                        <div className="space-y-2">
                            <div className="flex justify-between text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1">
                                <span className="flex items-center gap-1"><ZoomOut className="w-3 h-3"/> Zoom Out</span>
                                <span className="text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full">{(adjustConfig.zoom * 100).toFixed(0)}%</span>
                                <span className="flex items-center gap-1"><ZoomIn className="w-3 h-3"/> Zoom In</span>
                            </div>
                            <input 
                                type="range" min="0.01" max="3" step="0.01"
                                className="w-full h-1.5 bg-gray-100 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                                value={adjustConfig.zoom}
                                onChange={e => setZoom(parseFloat(e.target.value))}
                            />
                        </div>

                        <div className="flex flex-col items-center gap-2">
                            <div className="grid grid-cols-3 gap-1.5">
                                <div />
                                <button onClick={() => setOffset(adjustConfig.offsetX, adjustConfig.offsetY - 10)} className="w-14 h-9 flex items-center justify-center bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors shadow-sm"><ChevronUp className="w-4 h-4 text-gray-600" /></button>
                                <div />
                                <button onClick={() => setOffset(adjustConfig.offsetX - 10, adjustConfig.offsetY)} className="w-14 h-9 flex items-center justify-center bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors shadow-sm"><ChevronLeft className="w-4 h-4 text-gray-600" /></button>
                                <button type="button" onClick={() => setOffset(0, 0)} className="w-14 h-9 flex items-center justify-center bg-indigo-600 text-white rounded-lg font-black text-[9px] shadow-md hover:bg-indigo-700 transition-all active:scale-95">RESET</button>
                                <button onClick={() => setOffset(adjustConfig.offsetX + 10, adjustConfig.offsetY)} className="w-14 h-9 flex items-center justify-center bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors shadow-sm"><ChevronRight className="w-4 h-4 text-gray-600" /></button>
                                <div />
                                <button onClick={() => setOffset(adjustConfig.offsetX, adjustConfig.offsetY + 10)} className="w-14 h-9 flex items-center justify-center bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors shadow-sm"><ChevronDown className="w-4 h-4 text-gray-600" /></button>
                                <div />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="p-4 bg-gray-50 border-t flex gap-2">
                    <button onClick={onClose} className="flex-1 py-3 text-xs font-bold text-gray-400">Cancelar</button>
                    <button 
                        onClick={onApply}
                        className="flex-1 bg-indigo-600 text-white py-3 rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-all"
                    >
                        <Check className="w-4 h-4" /> Aplicar
                    </button>
                </div>
            </div>
            <canvas ref={canvasRef} width={400} height={400} className="hidden" />
        </div>
    );
}
