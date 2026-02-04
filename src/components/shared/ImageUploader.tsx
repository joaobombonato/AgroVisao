/**
 * ImageUploader - Componente reutilizável para upload e ajuste de imagens
 * 
 * Encapsula o hook useImageCrop com UI para upload, zoom e posicionamento
 */
import React, { useRef } from 'react';
import { Camera, X, ZoomIn, ZoomOut, Move, Check } from 'lucide-react';
import { useImageCrop } from '../../hooks';

interface ImageUploaderProps {
  currentImage?: string | null;
  onImageChange: (base64: string) => void;
  maxFileSizeMB?: number;
  outputSize?: number;
  shape?: 'square' | 'circle';
  color?: string;
  label?: string;
}

export function ImageUploader({
  currentImage,
  onImageChange,
  maxFileSizeMB = 2,
  outputSize = 400,
  shape = 'square',
  color = 'green',
  label = 'Logo'
}: ImageUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const {
    config,
    isAdjusting,
    canvasRef,
    handleImageUpload,
    setZoom,
    setIsAdjusting,
    applyAdjustment,
    onStartDrag,
    onMoveDrag,
    onEndDrag
  } = useImageCrop(maxFileSizeMB);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleImageUpload(file);
    }
  };

  const handleApply = () => {
    const result = applyAdjustment(outputSize);
    if (result) {
      onImageChange(result);
    }
  };

  const handleCancel = () => {
    setIsAdjusting(false);
  };

  const shapeClass = shape === 'circle' ? 'rounded-full' : 'rounded-xl';

  return (
    <div className="space-y-3">
      {/* Preview ou Botão de Upload */}
      {!isAdjusting && (
        <div className="flex flex-col items-center gap-3">
          {currentImage ? (
            <div className="relative group">
              <img 
                src={currentImage} 
                alt={label}
                className={`w-32 h-32 object-cover ${shapeClass} border-4 border-gray-200 shadow-md`}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className={`absolute inset-0 bg-black/50 ${shapeClass} opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center`}
              >
                <Camera className="w-8 h-8 text-white" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className={`w-32 h-32 ${shapeClass} border-2 border-dashed border-${color}-300 bg-${color}-50 flex flex-col items-center justify-center gap-2 hover:border-${color}-500 hover:bg-${color}-100 transition-colors`}
            >
              <Camera className={`w-8 h-8 text-${color}-400`} />
              <span className={`text-xs font-bold text-${color}-600`}>Adicionar {label}</span>
            </button>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
          />
        </div>
      )}

      {/* Modal de Ajuste */}
      {isAdjusting && config.rawImage && (
        <div className="fixed inset-0 bg-black/70 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl animate-in zoom-in-95">
            <div className={`flex items-center justify-between p-4 bg-${color}-50 border-b`}>
              <h3 className={`font-bold text-${color}-800 flex items-center gap-2`}>
                <Move className="w-5 h-5" />
                Ajustar Imagem
              </h3>
              <button
                type="button"
                onClick={handleCancel}
                className={`p-1 rounded-full hover:bg-${color}-100 text-${color}-600`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Área de Preview */}
            <div className="p-6 flex flex-col items-center gap-4">
              <div 
                className={`relative w-44 h-44 ${shapeClass} overflow-hidden border-4 border-gray-200 bg-gray-100 cursor-move touch-none`}
                onMouseDown={onStartDrag}
                onMouseMove={onMoveDrag}
                onMouseUp={onEndDrag}
                onMouseLeave={onEndDrag}
                onTouchStart={onStartDrag}
                onTouchMove={onMoveDrag}
                onTouchEnd={onEndDrag}
              >
                <img
                  src={config.rawImage}
                  alt="Preview"
                  style={{
                    transform: `translate(${config.offsetX}px, ${config.offsetY}px) scale(${config.zoom})`,
                    transformOrigin: 'center center'
                  }}
                  className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none select-none"
                  draggable={false}
                />
              </div>

              <p className="text-xs text-gray-500 text-center flex items-center gap-1">
                <Move className="w-3 h-3" /> Arraste para reposicionar
              </p>

              {/* Controles de Zoom */}
              <div className="flex items-center gap-4 bg-gray-100 p-2 rounded-xl">
                <button
                  type="button"
                  onClick={() => setZoom(Math.max(0.1, config.zoom - 0.1))}
                  className="p-2 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  <ZoomOut className="w-5 h-5 text-gray-600" />
                </button>
                
                <input
                  type="range"
                  min="0.1"
                  max="3"
                  step="0.05"
                  value={config.zoom}
                  onChange={(e) => setZoom(parseFloat(e.target.value))}
                  className="w-32"
                />
                
                <button
                  type="button"
                  onClick={() => setZoom(Math.min(3, config.zoom + 0.1))}
                  className="p-2 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  <ZoomIn className="w-5 h-5 text-gray-600" />
                </button>
              </div>
            </div>

            {/* Canvas oculto para processamento */}
            <canvas 
              ref={canvasRef} 
              width={outputSize} 
              height={outputSize} 
              className="hidden" 
            />

            {/* Botões de Ação */}
            <div className="p-4 border-t bg-gray-50 flex gap-3">
              <button
                type="button"
                onClick={handleCancel}
                className="flex-1 py-3 bg-gray-200 text-gray-700 font-bold rounded-xl hover:bg-gray-300 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleApply}
                className={`flex-1 py-3 bg-${color}-600 text-white font-bold rounded-xl hover:bg-${color}-700 transition-colors flex items-center justify-center gap-2`}
              >
                <Check className="w-5 h-5" />
                Aplicar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
