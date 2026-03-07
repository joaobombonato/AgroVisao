/**
 * CameraCapture — Componente simples de captura de foto.
 * Simplificado: OCR foi removido pois o código de barras resolve.
 * 
 * Responsabilidades:
 * - Abrir câmera traseira
 * - Tirar foto
 * - Confirmar ou refazer
 * - Retornar File ao componente pai
 */
import { useRef, useState, useEffect } from 'react';
import { Camera, X, Check, RotateCw, Zap } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface CameraCaptureProps {
  onCapture: (file: File) => void;
  onClose: () => void;
}

export const CameraCapture = ({ onCapture, onClose }: CameraCaptureProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [flashOn, setFlashOn] = useState(false);

  useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, []);

  // ==========================================
  // CÂMERA
  // ==========================================
  const startCamera = async () => {
    try {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      const constraints = {
        video: { 
          facingMode: 'environment', 
          width: { ideal: 1920 }, 
          height: { ideal: 1080 } 
        }
      };
      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      setStream(mediaStream);
      if (videoRef.current) videoRef.current.srcObject = mediaStream;
    } catch (err) {
      console.error("Camera error:", err);
      toast.error("Não foi possível acessar a câmera.");
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  };

  const takePhoto = () => {
    if (!videoRef.current || !canvasRef.current) {
        toast.error("Erro técnico: Câmera não inicializada.");
        return;
    }
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    if (video.videoWidth === 0) {
        toast.error("Aguardando carregamento da câmera...");
        return;
    }

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    
    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
      setCapturedImage(dataUrl);
      stopCamera();
    }
  };

  // ==========================================
  // CONFIRMAÇÃO
  // ==========================================
  const confirmCapture = () => {
    if (!capturedImage) return;
    fetch(capturedImage)
      .then(res => res.blob())
      .then(blob => {
        const file = new File([blob], `foto_doc_${Date.now()}.jpg`, { type: 'image/jpeg' });
        onCapture(file);
        onClose();
      });
  };

  const retakePhoto = () => {
    setCapturedImage(null);
    startCamera();
  };

  return (
    <div className="fixed inset-0 z-[1500] bg-black flex flex-col overflow-hidden">
      
      {/* Header */}
      <div className="bg-[#0f172a] border-b border-white/5 p-5 flex justify-between items-center z-[110] relative">
        <div className="flex items-center gap-3">
          <div className="bg-indigo-600/20 p-2.5 rounded-2xl border border-indigo-500/20">
            <Camera className="w-6 h-6 text-indigo-400"/>
          </div>
          <div>
            <h3 className="font-black text-white text-base tracking-tighter uppercase italic">Câmera VisãoAgro</h3>
            <p className="text-[10px] text-indigo-400/60 font-black uppercase tracking-[2px]">Captura de Documento</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
           <button onClick={() => setFlashOn(!flashOn)} className={`p-3 rounded-2xl transition-all ${flashOn ? 'bg-yellow-400 text-black' : 'bg-white/5 text-gray-400 border border-white/5'}`}>
              <Zap className="w-5 h-5" />
           </button>
           <button onClick={onClose} className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl text-gray-400 border border-white/5 transition-colors">
              <X className="w-6 h-6" />
           </button>
        </div>
      </div>

      {/* Main Viewport */}
      <div className="relative flex-1 bg-black flex items-center justify-center overflow-hidden">
        
        {!capturedImage ? (
          <>
            <video 
              ref={videoRef} 
              autoPlay 
              playsInline 
              className="absolute inset-0 w-full h-full object-cover" 
            />
            
            {/* Guide Frame */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10 px-6">
              <div className="relative w-full aspect-[4/3] max-h-[70vh] border-2 border-dashed border-white/30 rounded-xl">
                <div className="absolute -top-1 -left-1 w-12 h-12 border-l-4 border-t-4 border-indigo-500 rounded-tl-2xl" />
                <div className="absolute -top-1 -right-1 w-12 h-12 border-r-4 border-t-4 border-indigo-500 rounded-tr-2xl" />
                <div className="absolute -bottom-1 -left-1 w-12 h-12 border-l-4 border-b-4 border-indigo-500 rounded-bl-2xl" />
                <div className="absolute -bottom-1 -right-1 w-12 h-12 border-r-4 border-b-4 border-indigo-500 rounded-br-2xl" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-white/30 text-xs font-bold uppercase tracking-widest">Posicione o documento</span>
                </div>
              </div>
            </div>

            {/* Shutter Button */}
            <div className="absolute bottom-10 left-0 right-0 z-50 flex justify-center pointer-events-none">
              <button 
                onClick={(e) => { e.stopPropagation(); takePhoto(); }}
                className="w-24 h-24 rounded-full bg-white flex items-center justify-center p-1 active:scale-90 transition-all shadow-[0_0_50px_rgba(255,255,255,0.3)] pointer-events-auto group"
              >
                <div className="w-20 h-20 rounded-full bg-slate-100 flex items-center justify-center border-[6px] border-slate-950 relative overflow-hidden">
                   <div className="absolute inset-0 bg-indigo-600 opacity-0 group-active:opacity-20 transition-opacity" />
                   <Camera className="w-10 h-10 text-slate-900" />
                </div>
              </button>
            </div>
          </>
        ) : (
          <div className="w-full h-full relative flex flex-col bg-[#020617]">
            <img src={capturedImage} alt="Captura" className="flex-1 w-full object-contain" />
            
            {/* Post-Capture Actions */}
            <div className="absolute inset-x-0 bottom-10 flex flex-col items-center gap-4 px-8 animate-in fade-in slide-in-from-bottom-10">
              <div className="flex w-full gap-4">
                <button onClick={retakePhoto} className="flex-1 bg-white/10 backdrop-blur text-white font-black py-6 rounded-[35px] text-xs uppercase tracking-widest active:scale-95 transition-all flex items-center justify-center gap-2 border border-white/10">
                  <RotateCw className="w-5 h-5" /> Refazer
                </button>
                <button onClick={confirmCapture} className="flex-[2] bg-green-600 text-white font-black py-6 rounded-[35px] text-xs uppercase tracking-widest active:scale-95 transition-all shadow-xl shadow-green-600/20 flex items-center justify-center gap-2">
                  <Check className="w-5 h-5" /> Usar Foto
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
      
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
};
