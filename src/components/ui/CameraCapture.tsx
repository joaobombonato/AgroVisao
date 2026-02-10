import { useRef, useState, useEffect } from 'react';
import { Camera, X, Check, FileText, Edit2, Zap, ScanLine } from 'lucide-react';
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
  const [flashOn, setFlashOn] = useState(false);
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

  const NFeOverlay = () => (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10 px-6">
      <div 
        className="relative w-full aspect-[210/297] border-2 border-dashed border-white/30 rounded-lg shadow-[0_0_100px_rgba(0,0,0,0.5)] bg-black/5"
      >
        {/* Cantos destacados */}
        <div className="absolute -top-1 -left-1 w-6 h-6 border-l-4 border-t-4 border-indigo-400 rounded-tl-lg" />
        <div className="absolute -top-1 -right-1 w-6 h-6 border-r-4 border-t-4 border-indigo-400 rounded-tr-lg" />
        <div className="absolute -bottom-1 -left-1 w-6 h-6 border-l-4 border-b-4 border-indigo-400 rounded-bl-lg" />
        <div className="absolute -bottom-1 -right-1 w-6 h-6 border-r-4 border-b-4 border-indigo-400 rounded-br-lg" />

        {/* Marcadores de campos críticos */}
        {/* Chave de Acesso (Topo) */}
        <div className="absolute top-[3%] left-[2%] right-[2%] h-[6%] border border-yellow-400/50 rounded flex items-center justify-center">
            <span className="text-[8px] text-yellow-400 font-bold bg-black/40 px-1 uppercase">Chave de Acesso</span>
        </div>

        {/* Emitente (Base do Cabeçalho) */}
        <div className="absolute top-[10%] left-[2%] w-[60%] h-[10%] border border-cyan-400/30 rounded" />

        {/* Valor Total (Direita Baixo) */}
        <div className="absolute bottom-[4%] right-[2%] w-[35%] h-[6%] border border-green-400/50 rounded flex items-center justify-center">
            <span className="text-[8px] text-green-400 font-bold bg-black/40 px-1 uppercase">Valor Total</span>
        </div>

        {/* Linha de Scanner Animada (Sutil) */}
        <div className="absolute inset-x-0 h-0.5 bg-indigo-400/50 shadow-[0_0_15px_rgba(129,140,248,0.5)] animate-scan-y top-0" />
      </div>

      <div className="absolute bottom-10 left-1/2 -translate-x-1/2 text-center w-full px-10">
        <p className="bg-black/60 backdrop-blur-md px-4 py-2 rounded-full text-[10px] text-white/80 font-bold border border-white/10 uppercase tracking-widest">
           Alinhe a Nota Fiscal no Quadro
        </p>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-[1500] bg-black/90 flex flex-col items-center justify-center p-0 sm:p-4 backdrop-blur-md">
      <div className="bg-slate-900 w-full max-w-lg h-full sm:h-auto sm:max-h-[90vh] sm:rounded-[40px] overflow-hidden shadow-2xl flex flex-col relative border border-white/10">
        
        {/* Adiciona Estilo da Animação do Scanner */}
        <style>{`
          @keyframes scan-y {
            0% { top: 5%; opacity: 0; }
            10% { opacity: 0.8; }
            90% { opacity: 0.8; }
            100% { top: 95%; opacity: 0; }
          }
          .animate-scan-y {
            animation: scan-y 4s linear infinite;
          }
        `}</style>

        {/* Header */}
        <div className="p-4 border-b border-white/5 flex justify-between items-center bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-600/20 p-2 rounded-xl">
              <Camera className="w-5 h-5 text-indigo-400"/>
            </div>
            <div>
              <h3 className="font-bold text-white text-sm">Scanner VisãoAgro</h3>
              <p className="text-[10px] text-gray-500">Capture sua nota com precisão</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
             <button onClick={() => setFlashOn(!flashOn)} className={`p-2 rounded-full transition-all ${flashOn ? 'bg-yellow-400 text-black shadow-[0_0_15px_rgba(250,204,21,0.4)]' : 'text-gray-400 hover:bg-white/5'}`}>
                <Zap className="w-5 h-5" />
             </button>
             <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                <X className="w-5 h-5 text-gray-400" />
             </button>
          </div>
        </div>

        {/* Viewport */}
        <div className="relative bg-[#020617] flex-1 min-h-[50vh] flex items-center justify-center overflow-hidden">
          {!capturedImage ? (
            <>
              <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
              <NFeOverlay />
            </>
          ) : (
            <div className="w-full h-full relative flex flex-col">
              <img src={capturedImage} alt="Captura" className="w-full h-full object-contain bg-slate-950" />
              
              {!ocrResult && !isProcessing && (
                <div className="absolute inset-x-0 bottom-6 flex flex-col items-center gap-3 px-6 animate-in fade-in slide-in-from-bottom-4">
                  <div className="w-full p-4 bg-black/60 backdrop-blur-xl border border-white/10 rounded-2xl mb-4 flex items-center gap-3">
                     <FileText className="w-8 h-8 text-indigo-400" />
                     <div className="text-left">
                        <p className="text-xs font-bold text-white">Foto Capturada!</p>
                        <p className="text-[10px] text-gray-400">Escolha o método de processamento abaixo:</p>
                     </div>
                  </div>
                  <div className="flex w-full gap-3">
                    <button onClick={() => processOCR('fast')} className="flex-1 bg-white text-slate-900 font-bold py-4 rounded-2xl flex flex-col items-center justify-center gap-1 shadow-2xl active:scale-95 transition-transform">
                      <FileText className="w-5 h-5" /> 
                      <span className="text-[9px] uppercase tracking-tighter">Leitura Rápida</span>
                    </button>
                    <button onClick={() => processOCR('ai')} className="flex-1 bg-gradient-to-br from-indigo-600 to-indigo-800 text-white font-bold py-4 rounded-2xl flex flex-col items-center justify-center gap-1 shadow-2xl active:scale-95 transition-transform border border-indigo-400/30">
                      <ScanLine className="w-5 h-5" />
                      <span className="text-[9px] uppercase tracking-tighter">Leitura Inteligente</span>
                    </button>
                  </div>
                  <button onClick={() => { setCapturedImage(null); startCamera(); }} className="text-[11px] text-gray-500 font-bold hover:text-white transition-colors py-2 uppercase tracking-widest">Tirar Outra Foto</button>
                </div>
              )}

              {isProcessing && (
                <div className="absolute inset-0 bg-black/80 backdrop-blur-md flex flex-col items-center justify-center text-white p-6 z-50">
                  <div className="relative">
                    <div className="w-16 h-16 border-4 border-indigo-400/20 border-t-indigo-500 rounded-full animate-spin"></div>
                    <FileText className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 text-indigo-400 animate-pulse" />
                  </div>
                  <p className="font-bold text-lg mt-6 tracking-tight">Analisando Documento...</p>
                  <p className="text-indigo-400/60 text-xs mt-1">Extraindo dados e produtos</p>
                </div>
              )}

              {/* Editable Conference Screen */}
              {ocrResult && (
                <div className="absolute inset-0 bg-slate-950/98 overflow-y-auto p-4 text-white animate-in fade-in slide-in-from-bottom-5 z-[60]">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                      <div className="bg-green-500/20 p-2 rounded-xl">
                        <Check className="w-5 h-5 text-green-400" />
                      </div>
                      <div>
                        <h3 className="font-bold text-sm">Conferência e Ajuste</h3>
                        <p className="text-[10px] text-gray-500">Revise os dados antes de salvar</p>
                      </div>
                    </div>
                    <span className="bg-indigo-600/20 text-indigo-300 text-[8px] px-2 py-1 rounded-full font-bold uppercase tracking-widest">
                        {ocrResult.source === 'gemini' ? "via IA" : "via Local"}
                    </span>
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

                    <div className="mt-4 p-4 bg-indigo-500/10 rounded-2xl border border-indigo-500/20 flex gap-3">
                      <ScanLine className="w-5 h-5 text-indigo-400 shrink-0" />
                      <p className="text-[10px] text-gray-400 leading-relaxed font-medium">Os campos em roxo indicam áreas que o scanner focou. Verifique se o valor e a chave estão corretos.</p>
                    </div>
                  </div>

                  <div className="mt-8 flex gap-3 pb-8">
                    <button onClick={() => { setOcrResult(null); startCamera(); setCapturedImage(null); }} className="flex-1 py-4 bg-white/5 rounded-2xl text-xs font-bold border border-white/5 hover:bg-white/10 transition-colors">Recapturar</button>
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
          <div className="bg-slate-900 px-8 py-10 flex flex-col items-center gap-4">
            <button onClick={takePhoto} className="w-20 h-20 rounded-full bg-indigo-600 flex items-center justify-center p-1 active:scale-90 transition-transform shadow-[0_0_30px_rgba(79,70,229,0.3)] group relative">
               <div className="absolute inset-0 bg-indigo-400 rounded-full animate-ping opacity-20 group-active:opacity-0" />
               <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center relative z-10">
                 <Camera className="w-8 h-8 text-indigo-600" />
               </div>
            </button>
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Toque para Digitalizar</p>
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
  <div className="space-y-1 group">
    <label className="text-[9px] text-gray-400 uppercase font-bold px-1 transition-colors group-focus-within:text-indigo-400">{label}</label>
    <div className="relative">
      {prefix && <span className="absolute left-4 top-4 text-xs text-indigo-400 font-bold">{prefix}</span>}
      {rows > 1 ? (
        <textarea
          value={value}
          onChange={e => onChange(e.target.value)}
          className={`w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-xs focus:border-indigo-500/50 focus:bg-white/10 outline-none transition-all font-mono leading-relaxed ${prefix ? 'pl-10' : ''}`}
          rows={rows}
          placeholder={placeholder}
        />
      ) : (
        <input
          type="text"
          value={value}
          onChange={e => onChange(e.target.value)}
          className={`w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-xs focus:border-indigo-500/50 focus:bg-white/10 outline-none transition-all ${prefix ? 'pl-10' : ''}`}
          placeholder={placeholder}
        />
      )}
      <Edit2 className="absolute right-4 top-4 w-3.5 h-3.5 text-white/10 group-focus-within:text-indigo-400 transition-colors pointer-events-none" />
    </div>
  </div>
);
