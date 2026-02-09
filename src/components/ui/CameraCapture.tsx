import { useRef, useState, useEffect } from 'react';
import { Camera, X, Check, FileText } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface CameraCaptureProps {
  onCapture: (file: File, ocrResult?: { text: string, fields: any }) => void;
  onClose: () => void;
}

export const CameraCapture = ({ onCapture, onClose }: CameraCaptureProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [ocrResult, setOcrResult] = useState<any>(null);

  // Iniciar Câmera ao montar
  useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, []);

  const startCamera = async () => {
    try {
      const constraints = {
        video: {
          facingMode: 'environment',
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        }
      };
      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      console.error("Erro ao acessar câmera:", err);
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
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
        setCapturedImage(dataUrl);
        stopCamera();
      }
    }
  };

  const retakePhoto = () => {
    setCapturedImage(null);
    setOcrResult(null);
    startCamera();
  };

  const processTesseract = async () => {
      if (!capturedImage) return;
      try {
          setIsProcessing(true);
          const { ocrService } = await import('../../services/ocrService');
          const res = await fetch(capturedImage);
          const blob = await res.blob();
          const file = new File([blob], "temp_ocr.jpg", { type: "image/jpeg" });
          const result = await ocrService.recognize(file);
          setOcrResult(result);
          toast.success("Leitura concluída!", { icon: '📄' });
      } catch (error) {
          toast.error("Erro na leitura rápida.");
      } finally {
          setIsProcessing(false);
      }
  };

  const processGemini = async () => {
    if (!capturedImage) return;
    try {
        setIsProcessing(true);
        const { ocrService } = await import('../../services/ocrService');
        const res = await fetch(capturedImage);
        const blob = await res.blob();
        const file = new File([blob], "temp_ocr.jpg", { type: "image/jpeg" });
        const result = await ocrService.recognizeIntelligent(file);
        setOcrResult(result);
        toast.success("Leitura Inteligente concluída!", { icon: '✨' });
    } catch (error: any) {
        console.error("Erro na leitura inteligente:", error);
        toast.error("Erro na leitura inteligente: " + (error.message || "Verifique sua conexão ou chave de API"));
    } finally {
        setIsProcessing(false);
    }
  };

  const confirmCapture = () => {
      if (!capturedImage) return;
      fetch(capturedImage)
          .then(res => res.blob())
          .then(blob => {
              const file = new File([blob], `foto_doc_${Date.now()}.jpg`, { type: 'image/jpeg' });
              onCapture(file, ocrResult); 
              onClose();
          });
  };

  return (
    <div className="fixed inset-0 z-[1500] bg-black/80 flex flex-col items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-slate-900 w-full max-w-sm rounded-[2.5rem] overflow-hidden shadow-2xl flex flex-col relative border border-white/10">
        
        {/* Header */}
        <div className="p-5 border-b border-white/5 flex justify-between items-center bg-slate-900/50">
            <h3 className="font-bold text-white text-sm flex items-center gap-2">
                <Camera className="w-5 h-5 text-indigo-400"/> 
                Digitalizar Documento
            </h3>
            <button onClick={onClose} className="p-1 hover:bg-white/10 rounded-full transition-colors">
                <X className="w-5 h-5 text-gray-400" />
            </button>
        </div>

        {/* Viewport da Câmera */}
        <div className="relative bg-black flex items-center justify-center overflow-hidden h-[600px]">
            {!capturedImage ? (
                <>
                    <video ref={videoRef} autoPlay playsInline className="w-full h-full object-contain bg-black" />
                    <div className="absolute inset-x-0 bottom-4 flex flex-col items-center gap-2 pointer-events-none opacity-90">
                        <div className="bg-black/60 px-4 py-2 rounded-full text-[10px] text-white backdrop-blur-md border border-white/20 flex items-center gap-2">
                             <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
                             Boa luz • Sem sombra
                        </div>
                    </div>
                </>
            ) : (
                <div className="w-full h-full relative flex flex-col">
                    <img src={capturedImage} alt="Captura" className="w-full h-full object-contain bg-slate-800" />
                    
                    {/* Botões de Leitura (Floating) */}
                    {!ocrResult && !isProcessing && (
                        <div className="absolute inset-x-0 bottom-6 flex flex-col items-center gap-3 px-6 animate-in fade-in slide-in-from-bottom-4">
                            <button
                                onClick={processTesseract}
                                className="w-full bg-white text-slate-900 font-bold py-4 rounded-2xl flex items-center justify-center gap-3 shadow-2xl active:scale-95 transition-transform"
                            >
                                <FileText className="w-5 h-5 text-indigo-600" />
                                Leitura Rápida
                            </button>
                            <button
                                onClick={processGemini}
                                className="w-full bg-gradient-to-r from-indigo-600 to-blue-700 text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-3 shadow-2xl active:scale-95 transition-transform border border-indigo-400/30"
                            >
                                <div className="w-2 h-2 bg-indigo-200 rounded-full animate-pulse"></div>
                                Leitura Inteligente (AI)
                            </button>
                        </div>
                    )}

                    {isProcessing && (
                         <div className="absolute inset-0 bg-black/40 backdrop-blur-sm flex flex-center flex-col items-center justify-center text-white p-6 z-50">
                            <div className="w-12 h-12 border-4 border-white/20 border-t-white rounded-full animate-spin mb-4"></div>
                            <p className="font-bold text-lg animate-pulse">Lendo Documento...</p>
                            <p className="text-xs text-white/70 mt-2 text-center">Isso pode levar alguns segundos dependendo da conexão.</p>
                         </div>
                    )}

                    {/* Conference Screen Overlay */}
                    {ocrResult && (
                        <div className="absolute inset-0 bg-slate-900/95 overflow-y-auto p-5 text-white animate-in fade-in slide-in-from-bottom-5 z-[60]">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="font-bold text-sm flex items-center gap-2">
                                    {ocrResult.source === 'gemini' ? <span className="text-indigo-400">✨ IA</span> : '📄 Rápida'} 
                                    - Conferência
                                </h3>
                                <button onClick={() => setOcrResult(null)} className="text-[10px] text-gray-400 underline">Editar</button>
                            </div>

                            <div className="space-y-3">
                                {!ocrResult.fields.total && !ocrResult.fields.emitente && (
                                    <div className="bg-amber-500/10 border border-amber-500/30 p-3 rounded-lg mb-4">
                                        <p className="text-[10px] text-amber-200 font-bold flex items-center gap-2">
                                            <FileText className="w-3 h-3" />
                                            Nenhum campo detectado automaticamente.
                                        </p>
                                        <p className="text-[8px] text-amber-200/70 mt-1">
                                            Abaixo está o texto bruto que conseguimos ler:
                                        </p>
                                    </div>
                                )}

                                <div>
                                    <label className="text-[8px] text-gray-500 uppercase font-bold">Emitente</label>
                                    <div className="bg-white/5 p-2 rounded-lg border border-white/10 text-xs truncate">
                                        {ocrResult.fields.emitente || (ocrResult.source === 'tesseract' ? "Não Identificado" : "---")}
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-[8px] text-gray-500 uppercase font-bold">Valor</label>
                                        <div className="bg-white/5 p-2 rounded-lg border border-white/10 text-xs font-bold text-indigo-300">
                                            {ocrResult.fields.total ? `R$ ${ocrResult.fields.total}` : "---"}
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-[8px] text-gray-500 uppercase font-bold">Data</label>
                                        <div className="bg-white/5 p-2 rounded-lg border border-white/10 text-xs">
                                            {ocrResult.fields.data || "---"}
                                        </div>
                                    </div>
                                </div>
                                
                                {ocrResult.rawText && (!ocrResult.fields.total || ocrResult.source === 'tesseract') && (
                                    <div>
                                        <label className="text-[8px] text-gray-500 uppercase font-bold">Leitura Bruta (Debug)</label>
                                        <div className="bg-white/5 p-2 rounded-lg border border-white/10 text-[9px] h-20 overflow-y-auto font-mono opacity-50 whitespace-pre-wrap">
                                            {ocrResult.rawText}
                                        </div>
                                    </div>
                                )}

                                <div>
                                    <label className="text-[8px] text-gray-500 uppercase font-bold">Chave de Acesso</label>
                                    <div className="bg-white/5 p-2 rounded-lg border border-white/10 text-[9px] break-all font-mono opacity-80">
                                        {ocrResult.fields.chave || ocrResult.fields.cnpj || "---"}
                                    </div>
                                </div>
                            </div>

                            <div className="mt-6 flex gap-2">
                                <button onClick={retakePhoto} className="flex-1 py-3 bg-white/5 rounded-xl text-xs font-bold">Recapturar</button>
                                <button 
                                    onClick={confirmCapture} 
                                    className="flex-[2] py-3 bg-indigo-600 rounded-xl text-xs font-bold shadow-lg"
                                >
                                    Confirmar
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
        
        <canvas ref={canvasRef} className="hidden" />
        
        {/* Action Bar */}
        {!capturedImage && (
            <div className="bg-slate-900 p-6 flex justify-center items-center">
                <button 
                    onClick={takePhoto}
                    className="w-16 h-16 rounded-full bg-white flex items-center justify-center p-0.5 active:scale-90 transition-transform shadow-2xl"
                >
                    <div className="w-full h-full rounded-full border-4 border-slate-900 bg-white flex items-center justify-center">
                        <div className="w-10 h-10 rounded-full bg-indigo-600"></div>
                    </div>
                </button>
            </div>
        )}
      </div>
    </div>
  );
};
