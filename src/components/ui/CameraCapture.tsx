import { useRef, useState, useEffect } from 'react';
import { Camera, X, Check, FileText, Edit2 } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface CameraCaptureProps {
  onCapture: (file: File, ocrResult?: { text: string, fields: any }) => void;
  onClose: () => void;
}

interface EditableFields {
  emitente: string;
  numeroNF: string;
  dataEmissao: string;
  total: string;
  chave: string;
  vencimentos: string;
  produtos: string;
}

export const CameraCapture = ({ onCapture, onClose }: CameraCaptureProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [ocrResult, setOcrResult] = useState<any>(null);
  const [editableFields, setEditableFields] = useState<EditableFields>({
    emitente: "",
    numeroNF: "",
    dataEmissao: "",
    total: "",
    chave: "",
    vencimentos: "",
    produtos: ""
  });

  useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, []);

  useEffect(() => {
    if (ocrResult?.fields) {
      setEditableFields({
        emitente: ocrResult.fields.emitente || "",
        numeroNF: ocrResult.fields.numeroNF || "",
        dataEmissao: ocrResult.fields.dataEmissao || "",
        total: ocrResult.fields.total || "",
        chave: ocrResult.fields.chave || "",
        vencimentos: (ocrResult.fields.vencimentos || []).join(", "),
        produtos: (ocrResult.fields.produtos || []).join(", ")
      });
    }
  }, [ocrResult]);

  const startCamera = async () => {
    try {
      const constraints = {
        video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } }
      };
      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      setStream(mediaStream);
      if (videoRef.current) videoRef.current.srcObject = mediaStream;
    } catch (err) {
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
        setCapturedImage(canvas.toDataURL('image/jpeg', 0.8));
        stopCamera();
      }
    }
  };

  const processOCR = async (type: 'fast' | 'ai') => {
    if (!capturedImage) return;
    try {
      setIsProcessing(true);
      const { ocrService } = await import('../../services/ocrService');
      const blob = await (await fetch(capturedImage)).blob();
      const file = new File([blob], "temp.jpg", { type: "image/jpeg" });
      const result = type === 'fast' ? await ocrService.recognize(file) : await ocrService.recognizeIntelligent(file);
      setOcrResult(result);
      toast.success(type === 'fast' ? "Leitura Rápida concluída!" : "Leitura Inteligente concluída!");
    } catch (error: any) {
      toast.error("Erro na leitura: " + (error.message || "Falha"));
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
        const finalFields = {
          ...editableFields,
          vencimentos: (editableFields.vencimentos || "").split(",").map((s: string) => s.trim()).filter(Boolean),
          produtos: (editableFields.produtos || "").split(",").map((s: string) => s.trim()).filter(Boolean)
        };
        onCapture(file, { ...ocrResult, fields: finalFields });
        onClose();
      });
  };

  const updateField = (name: keyof EditableFields, value: string) => {
    setEditableFields(prev => ({ ...prev, [name]: value }));
  };

  return (
    <div className="fixed inset-0 z-[1500] bg-black/90 flex flex-col items-center justify-center p-0 sm:p-4 backdrop-blur-md">
      <div className="bg-slate-900 w-full max-w-lg h-full sm:h-auto sm:max-h-[90vh] sm:rounded-[2.5rem] overflow-hidden shadow-2xl flex flex-col relative border border-white/10">
        
        <div className="p-4 border-b border-white/5 flex justify-between items-center bg-slate-900/50">
          <h3 className="font-bold text-white text-sm flex items-center gap-2">
            <Camera className="w-5 h-5 text-indigo-400"/> 
            Digitalizar Documento
          </h3>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        <div className="relative bg-black flex-1 min-h-[40vh] flex items-center justify-center overflow-hidden">
          {!capturedImage ? (
            <video ref={videoRef} autoPlay playsInline className="w-full h-full object-contain" />
          ) : (
            <div className="w-full h-full relative flex flex-col">
              <img src={capturedImage} alt="Captura" className="w-full h-full object-contain bg-slate-800" />
              
              {!ocrResult && !isProcessing && (
                <div className="absolute inset-x-0 bottom-6 flex flex-col items-center gap-3 px-6 animate-in fade-in slide-in-from-bottom-4">
                  <button onClick={() => processOCR('fast')} className="w-full bg-white text-slate-900 font-bold py-4 rounded-2xl flex items-center justify-center gap-3 shadow-2xl active:scale-95 transition-transform">
                    <FileText className="w-5 h-5 text-indigo-600" /> Leitura Rápida
                  </button>
                  <button onClick={() => processOCR('ai')} className="w-full bg-gradient-to-r from-indigo-600 to-blue-700 text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-3 shadow-2xl active:scale-95 transition-transform border border-indigo-400/30">
                    <div className="w-2 h-2 bg-indigo-200 rounded-full animate-pulse"></div> Leitura Inteligente (AI)
                  </button>
                </div>
              )}

              {isProcessing && (
                <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center text-white p-6 z-50">
                  <div className="w-12 h-12 border-4 border-white/20 border-t-white rounded-full animate-spin mb-4"></div>
                  <p className="font-bold text-lg animate-pulse">Lendo Documento...</p>
                </div>
              )}

              {ocrResult && (
                <div className="absolute inset-0 bg-slate-900/95 overflow-y-auto p-4 text-white animate-in fade-in slide-in-from-bottom-5 z-[60]">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold text-sm flex items-center gap-2">
                       <Check className="w-4 h-4 text-green-400" /> Conferência e Ajuste
                    </h3>
                    <span className="text-[10px] text-gray-500">{ocrResult.source === 'gemini' ? "via IA" : "via Local"}</span>
                  </div>

                  <div className="space-y-4">
                    <div className="grid grid-cols-1 gap-4">
                      <Field label="Emitente" value={editableFields.emitente} onChange={(v: string) => updateField('emitente', v)} />
                      <div className="grid grid-cols-2 gap-3">
                        <Field label="Nº NF" value={editableFields.numeroNF} onChange={(v: string) => updateField('numeroNF', v)} />
                        <Field label="Data Emissão" value={editableFields.dataEmissao} onChange={(v: string) => updateField('dataEmissao', v)} />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <Field label="Valor Total" value={editableFields.total} onChange={(v: string) => updateField('total', v)} prefix="R$" />
                        <Field label="Vencimentos" value={editableFields.vencimentos} onChange={(v: string) => updateField('vencimentos', v)} placeholder="Separados por vírgula" />
                      </div>
                      <Field label="Chave de Acesso" value={editableFields.chave} onChange={(v: string) => updateField('chave', v)} rows={2} />
                      <Field label="Produtos" value={editableFields.produtos} onChange={(v: string) => updateField('produtos', v)} rows={2} placeholder="Lista de produtos" />
                    </div>

                    <div className="mt-4 p-3 bg-white/5 rounded-xl border border-white/5">
                      <label className="text-[8px] text-gray-500 uppercase font-bold block mb-1">Dica</label>
                      <p className="text-[9px] text-gray-400">Você pode editar os campos acima para corrigir qualquer leitura imprecisa do scanner.</p>
                    </div>
                  </div>

                  <div className="mt-6 flex gap-3 pb-8">
                    <button onClick={() => { setOcrResult(null); startCamera(); setCapturedImage(null); }} className="flex-1 py-4 bg-white/5 rounded-2xl text-xs font-bold border border-white/10">Recapturar</button>
                    <button onClick={confirmCapture} className="flex-[2] py-4 bg-indigo-600 rounded-2xl text-xs font-bold shadow-lg shadow-indigo-600/20 active:scale-95 transition-all">
                      Confirmar Dados
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
        
        <canvas ref={canvasRef} className="hidden" />
        
        {!capturedImage && (
          <div className="bg-slate-900 p-8 flex justify-center items-center">
            <button onClick={takePhoto} className="w-20 h-20 rounded-full bg-white flex items-center justify-center p-1 active:scale-90 transition-transform shadow-2xl border-4 border-slate-800">
               <div className="w-full h-full rounded-full bg-indigo-600 flex items-center justify-center">
                 <Camera className="w-8 h-8 text-white" />
               </div>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

interface FieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  prefix?: string;
  rows?: number;
  placeholder?: string;
}

const Field = ({ label, value, onChange, prefix, rows = 1, placeholder }: FieldProps) => (
  <div className="space-y-1">
    <label className="text-[9px] text-gray-400 uppercase font-bold px-1">{label}</label>
    <div className="relative group">
      {prefix && <span className="absolute left-3 top-3 text-xs text-indigo-400 font-bold">{prefix}</span>}
      {rows > 1 ? (
        <textarea
          value={value}
          onChange={e => onChange(e.target.value)}
          className={`w-full bg-white/5 border border-white/10 rounded-xl p-3 text-xs focus:border-indigo-500/50 focus:bg-white/10 outline-none transition-all font-mono ${prefix ? 'pl-9' : ''}`}
          rows={rows}
          placeholder={placeholder}
        />
      ) : (
        <input
          type="text"
          value={value}
          onChange={e => onChange(e.target.value)}
          className={`w-full bg-white/5 border border-white/10 rounded-xl p-3 text-xs focus:border-indigo-500/50 focus:bg-white/10 outline-none transition-all ${prefix ? 'pl-9' : ''}`}
          placeholder={placeholder}
        />
      )}
      <Edit2 className="absolute right-3 top-3 w-3 h-3 text-white/20 group-focus-within:text-indigo-400 transition-colors" />
    </div>
  </div>
);
