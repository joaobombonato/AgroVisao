/**
 * useImageCrop - Hook para ajuste e recorte de imagens
 * 
 * Encapsula a lógica de:
 * - Upload de imagem com validação de tamanho
 * - Ajuste de zoom, posição (pan) e rotação
 * - Geração de imagem recortada em canvas
 */
import { useState, useCallback, useRef } from 'react';
import { toast } from 'react-hot-toast';

interface ImageAdjustConfig {
  zoom: number;
  offsetX: number;
  offsetY: number;
  rawImage: string;
}

interface UseImageCropReturn {
  config: ImageAdjustConfig;
  isAdjusting: boolean;
  canvasRef: React.RefObject<HTMLCanvasElement>;
  isDragging: boolean;
  // Actions
  handleImageUpload: (file: File | null) => void;
  setZoom: (zoom: number) => void;
  setOffset: (offsetX: number, offsetY: number) => void;
  resetAdjustment: () => void;
  applyAdjustment: (outputSize?: number, aspectRatio?: number) => string | null;
  setIsAdjusting: (v: boolean) => void;
  // Drag handlers
  onStartDrag: (e: React.MouseEvent | React.TouchEvent) => void;
  onMoveDrag: (e: React.MouseEvent | React.TouchEvent) => void;
  onEndDrag: () => void;
}

const INITIAL_CONFIG: ImageAdjustConfig = {
  zoom: 1,
  offsetX: 0,
  offsetY: 0,
  rawImage: ''
};

export function useImageCrop(maxFileSizeMB = 2, uiSize = 176, aspectRatio = 1): UseImageCropReturn {
  const [config, setConfig] = useState<ImageAdjustConfig>(INITIAL_CONFIG);
  const [isAdjusting, setIsAdjusting] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Upload de imagem
  const handleImageUpload = useCallback((file: File | null) => {
    if (!file) return;

    if (file.size > maxFileSizeMB * 1024 * 1024) {
      toast.error(`A imagem deve ter no máximo ${maxFileSizeMB}MB.`);
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      
      const img = new Image();
      img.src = base64String;
      img.onload = () => {
        const initialZoom = Math.max(uiSize / img.width, uiSize / img.height) * 1.2;
        
        setConfig({
          zoom: initialZoom,
          offsetX: 0,
          offsetY: 0,
          rawImage: base64String
        });
        setIsAdjusting(true);
      };
    };
    reader.readAsDataURL(file);
  }, [maxFileSizeMB, uiSize]);

  // Set zoom
  const setZoom = useCallback((zoom: number) => {
    setConfig(prev => ({ ...prev, zoom }));
  }, []);

  // Set offset
  const setOffset = useCallback((offsetX: number, offsetY: number) => {
    setConfig(prev => ({ ...prev, offsetX, offsetY }));
  }, []);

  // Reset
  const resetAdjustment = useCallback(() => {
    if (!config.rawImage) return;
    
    const img = new Image();
    img.src = config.rawImage;
    img.onload = () => {
      const initialZoom = Math.max(uiSize / img.width, uiSize / img.height) * 1.2;
      setConfig(prev => ({ ...prev, offsetX: 0, offsetY: 0, zoom: initialZoom }));
    };
  }, [config.rawImage, uiSize]);

  // Apply adjustment and return base64
  const applyAdjustment = useCallback((outputSize = 400, customAspectRatio?: number): string | null => {
    const canvas = canvasRef.current;
    if (!canvas || !config.rawImage) return null;

    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    const img = new Image();
    img.src = config.rawImage;
    
    // Calcula altura baseada no aspect ratio (default do hook ou customizado no momento da aplicação)
    const activeRatio = customAspectRatio || aspectRatio;
    
    // Synchronous drawing
    canvas.width = outputSize;
    canvas.height = outputSize / activeRatio;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Removido preenchimento branco forçado para suportar transparência em PNGs

    const ratio = outputSize / uiSize;
    const drawW = img.width * config.zoom * ratio;
    const drawH = img.height * config.zoom * ratio;
    
    // Centralização baseada no novo canvas retangular
    const startX = (canvas.width - drawW) / 2 + (config.offsetX * ratio);
    const startY = (canvas.height - drawH) / 2 + (config.offsetY * ratio);

    ctx.drawImage(img, startX, startY, drawW, drawH);

    // Usa PNG para manter transparência, ou JPEG se o usuário preferir (padrão PNG para logos)
    const adjustedBase64 = canvas.toDataURL('image/png');
    
    if (adjustedBase64.length > 250 * 1024) {
      toast.error("A imagem ficou muito pesada. Tente reduzir o zoom.");
      return null;
    }

    setIsAdjusting(false);
    toast.success("Ajuste aplicado!");
    return adjustedBase64;
  }, [config, uiSize]);

  // Drag handlers
  const onStartDrag = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    setIsDragging(true);
    const touch = 'touches' in e ? e.touches[0] : e;
    setDragStart({
      x: touch.clientX - config.offsetX,
      y: touch.clientY - config.offsetY
    });
  }, [config.offsetX, config.offsetY]);

  const onMoveDrag = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (!isDragging) return;
    const touch = 'touches' in e ? e.touches[0] : e;
    const deltaX = touch.clientX - dragStart.x;
    const deltaY = touch.clientY - dragStart.y;
    setConfig(prev => ({ ...prev, offsetX: deltaX, offsetY: deltaY }));
  }, [isDragging, dragStart]);

  const onEndDrag = useCallback(() => {
    setIsDragging(false);
  }, []);

  return {
    config,
    isAdjusting,
    canvasRef,
    isDragging,
    handleImageUpload,
    setZoom,
    setOffset,
    resetAdjustment,
    applyAdjustment,
    setIsAdjusting,
    onStartDrag,
    onMoveDrag,
    onEndDrag
  };
}
