import React, { useRef } from 'react';
import { Camera, X, Building2 } from 'lucide-react';
import { useImageCrop } from '../../../hooks';
import { toast } from 'react-hot-toast';
import { LogoAdjustModal } from './LogoAdjustModal';

interface FazendaLogoUploaderProps {
    logoBase64: string;
    onLogoChange: (base64: string) => void;
}

export default function FazendaLogoUploader({ logoBase64, onLogoChange }: FazendaLogoUploaderProps) {
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Hook para ajuste de imagem
    const {
        config: adjustConfig,
        isAdjusting,
        canvasRef,
        handleImageUpload,
        setZoom,
        setOffset,
        setIsAdjusting,
        applyAdjustment,
        onStartDrag,
        onMoveDrag,
        onEndDrag
    } = useImageCrop(2); // maxSizeMB = 2

    // Handle image file selection
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            handleImageUpload(file);
        }
    };

    // Apply image adjustment
    const handleApplyImage = () => {
        const result = applyAdjustment(400); // outputSize only
        if (result) {
            onLogoChange(result);
            toast.success('Logo aplicado!');
            setIsAdjusting(false); // Garante que fecha o modal
        }
    };

    return (
        <div className="flex flex-col items-center mb-8">
             {/* Modal de Ajuste de Imagem Reutilizado */}
            <LogoAdjustModal 
                isOpen={isAdjusting}
                onClose={() => setIsAdjusting(false)}
                adjustConfig={adjustConfig}
                setZoom={setZoom}
                setOffset={setOffset}
                onApply={handleApplyImage}
                onStartDrag={onStartDrag}
                onMoveDrag={onMoveDrag}
                onEndDrag={onEndDrag}
                canvasRef={canvasRef}
            />

            <div className="relative group">
                <div className="w-28 h-28 rounded-full border-4 border-gray-100 overflow-hidden bg-gray-50 flex items-center justify-center shadow-inner">
                    {logoBase64 ? (
                        <img src={logoBase64} alt="Logo" className="w-full h-full object-cover" />
                    ) : (
                        <Building2 className="w-10 h-10 text-gray-300" />
                    )}
                </div>
                <label className="absolute bottom-0 right-0 bg-green-600 text-white p-2 rounded-full shadow-lg border-2 border-white cursor-pointer hover:bg-green-700 transition-colors">
                    <Camera className="w-4 h-4" />
                    <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
                </label>
            </div>
            {logoBase64 && (
                <button
                    type="button"
                    onClick={() => onLogoChange('')}
                    className="text-xs text-red-500 hover:text-red-700 mt-2 flex items-center gap-1 font-medium"
                >
                    <X className="w-3 h-3" /> Remover
                </button>
            )}
        </div>
    );
}
