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
    
    // Garantir que o vídeo tem dimensões
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

  // Overlay Calibrado - Espaçamento Aumentado (DANFE Real)
  const NFeOverlay = () => (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10 px-4">
      <div 
        className="relative w-full aspect-[210/297] max-h-[75vh] border-2 border-dashed border-indigo-400/30 rounded-lg shadow-[0_0_100px_rgba(0,0,0,0.7)]"
      >
        {/* Cantos destacados */}
        <div className="absolute -top-1 -left-1 w-10 h-10 border-l-4 border-t-4 border-indigo-400 rounded-tl-xl" />
        <div className="absolute -top-1 -right-1 w-10 h-10 border-r-4 border-t-4 border-indigo-400 rounded-tr-xl" />
        <div className="absolute -bottom-1 -left-1 w-10 h-10 border-l-4 border-b-4 border-indigo-400 rounded-bl-xl" />
        <div className="absolute -bottom-1 -right-1 w-10 h-10 border-r-4 border-b-4 border-indigo-400 rounded-br-xl" />

        {/* --- ZONEAMENTO CALIBRADO --- */}
        
        {/* Emitente (Topo Esquerdo) */}
        <div className="absolute top-[8%] left-[2%] w-[48%] h-[12%] border border-cyan-400/50 rounded-lg flex items-center justify-center bg-cyan-400/5">
           <span className="text-[8px] text-cyan-400 font-black uppercase">Emitente</span>
        </div>

        {/* Chave de Acesso (Topo Direito) */}
        <div className="absolute top-[8%] right-[2%] w-[48%] h-[12%] border-2 border-yellow-400/50 rounded-lg flex items-center justify-center bg-yellow-400/10">
           <span className="text-[9px] text-yellow-400 font-black uppercase">Chave de Acesso</span>
        </div>

        {/* Número NF (Centro Topo) */}
        <div className="absolute top-[21%] left-[30%] w-[40%] h-[6%] border border-blue-400/50 rounded-md flex items-center justify-center bg-blue-400/5">
           <span className="text-[7px] text-blue-400 font-black uppercase">Nº da NF</span>
        </div>

        {/* Vencimento (Fatura - Lateral Esquerda) */}
        <div className="absolute top-[35%] left-[2%] w-[35%] h-[8%] border border-pink-400/50 rounded-lg flex items-center justify-center bg-pink-400/5">
           <span className="text-[7px] text-pink-400 font-black uppercase">Vencimentos</span>
        </div>

        {/* Data Emissão (Middle Right) */}
        <div className="absolute top-[35%] right-[2%] w-[35%] h-[8%] border border-orange-400/50 rounded-lg flex items-center justify-center bg-orange-400/5">
           <span className="text-[7px] text-orange-400 font-black uppercase">Data Emissão</span>
        </div>

        {/* Valor Total (Right Section, above Products) */}
        <div className="absolute top-[48%] right-[2%] w-[40%] h-[8%] border-2 border-red-500/60 rounded-xl flex items-center justify-center bg-red-500/10">
           <span className="text-[10px] text-red-400 font-black uppercase">Valor Total</span>
        </div>

        {/* Produtos Area (Bottom Section - More Space) */}
        <div className="absolute bottom-[4%] inset-x-[2%] h-[38%] border border-indigo-500/30 rounded-xl bg-indigo-500/5 flex flex-col pt-1">
            <div className="text-center">
               <span className="text-[8px] text-indigo-300 font-black uppercase tracking-widest">Produtos / Itens</span>
            </div>
            <div className="flex-1 grid grid-cols-4 divide-x divide-indigo-500/10 mt-2 px-2">
               {[...Array(4)].map((_, i) => <div key={i} className="border-t border-indigo-500/10" />)}
            </div>
        </div>

        {/* Scanning Line Animation */}
        <div className="absolute inset-x-0 h-1 bg-indigo-400/40 shadow-[0_0_20px_rgba(129,140,248,0.5)] animate-scan-y top-0" />
      </div>

      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-20">
         <ScanLine className="w-20 h-20 text-indigo-400/20" />
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-[1500] bg-black flex flex-col overflow-hidden">
      
      {/* Header Fixo (Fora da área da câmera) */}
      <div className="bg-slate-900 border-b border-white/5 p-5 flex justify-between items-center z-[1600]">
        <div className="flex items-center gap-4">
          <div className="bg-indigo-600/20 p-2.5 rounded-2xl">
            <ScanLine className="w-6 h-6 text-indigo-400"/>
          </div>
          <div>
            <h3 className="font-bold text-white text-base tracking-tight">Scanner VisãoAgro</h3>
            <p className="text-[11px] text-gray-500 font-medium">Capture sua NF-e com o melhor ângulo</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
           <button onClick={() => setFlashOn(!flashOn)} className={`p-3 rounded-2xl transition-all ${flashOn ? 'bg-yellow-400 text-black shadow-lg shadow-yellow-400/20' : 'bg-white/5 text-gray-400'}`}>
              <Zap className="w-5 h-5" />
           </button>
           <button onClick={onClose} className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl text-gray-400 transition-colors">
              <X className="w-6 h-6" />
           </button>
        </div>
      </div>

      {/* Viewport Principal */}
      <div className="relative flex-1 bg-black flex items-center justify-center overflow-hidden">
        
        <style>{`
          @keyframes scan-y {
            0% { top: 5%; opacity: 0; }
            10% { opacity: 0.8; }
            90% { opacity: 0.8; }
            100% { top: 95%; opacity: 0; }
          }
          .animate-scan-y { animation: scan-y 4s linear infinite; }
        `}</style>

        {!capturedImage ? (
          <>
            <video 
              ref={videoRef} 
              autoPlay 
              playsInline 
              className="absolute inset-0 w-full h-full object-cover" 
            />
            
            {/* Guide Overlay */}
            <NFeOverlay />

            {/* Shutter Button (Subposto à área inferior da câmera) */}
            <div className="absolute bottom-10 left-0 right-0 z-50 flex flex-col items-center gap-6 pointer-events-none">
              <button 
                onClick={(e) => { e.stopPropagation(); takePhoto(); }}
                className="w-24 h-24 rounded-full bg-indigo-600 flex items-center justify-center p-1 active:scale-95 transition-all shadow-2xl pointer-events-auto border-4 border-white/20"
              >
                <div className="w-20 h-20 rounded-full bg-white flex items-center justify-center border-4 border-slate-950">
                   <Camera className="w-10 h-10 text-slate-950" />
                </div>
              </button>
              <div className="bg-black/60 backdrop-blur-md px-6 py-2 rounded-full border border-white/10">
                 <p className="text-[11px] font-black text-white uppercase tracking-[3px]">Toque para Digitalizar</p>
              </div>
            </div>
          </>
        ) : (
          <div className="w-full h-full relative flex flex-col bg-slate-950">
            <img src={capturedImage} alt="Captura" className="flex-1 w-full object-contain" />
            
            {/* Seletor de Processamento */}
            {!ocrResult && !isProcessing && (
              <div className="absolute inset-x-0 bottom-10 flex flex-col items-center gap-4 px-8 animate-in fade-in slide-in-from-bottom-10">
                <div className="w-full p-5 bg-black/90 backdrop-blur-2xl border border-white/10 rounded-[40px] shadow-2xl flex items-center gap-4">
                   <div className="bg-indigo-600/30 p-3 rounded-2xl">
                      <FileText className="w-8 h-8 text-indigo-400" />
                   </div>
                   <div className="text-left">
                      <p className="text-sm font-black text-white uppercase tracking-tight">Enquadramento OK</p>
                      <p className="text-[11px] text-gray-500 font-medium tracking-tight">Iniciando análise inteligente...</p>
                   </div>
                </div>
                
                <div className="flex w-full gap-4">
                  <button onClick={() => processOCR('fast')} className="flex-1 bg-white text-slate-900 font-black py-6 rounded-[35px] text-xs uppercase tracking-tighter active:scale-95 transition-all">
                    Leitura Rápida
                  </button>
                  <button onClick={() => processOCR('ai')} className="flex-1 bg-indigo-600 text-white font-black py-6 rounded-[35px] text-xs uppercase tracking-tighter active:scale-95 transition-all shadow-xl shadow-indigo-600/20">
                    Leitura com IA
                  </button>
                </div>
                <button onClick={() => { setCapturedImage(null); startCamera(); }} className="text-[11px] text-gray-400 font-black hover:text-white transition-colors py-4 uppercase tracking-[4px]">Tirar nova foto</button>
              </div>
            )}

            {isProcessing && (
              <div className="absolute inset-0 bg-black/90 backdrop-blur-xl flex flex-col items-center justify-center text-white p-8 z-[200]">
                <div className="w-20 h-20 border-[6px] border-indigo-400/20 border-t-indigo-500 rounded-full animate-spin mb-8"></div>
                <h3 className="font-black text-2xl tracking-tighter uppercase">Analisando DANFE</h3>
                <p className="text-gray-500 text-[10px] font-bold mt-2 uppercase tracking-[4px]">Aguarde a extração dos dados</p>
              </div>
            )}

            {/* Conference Screen */}
            {ocrResult && (
              <div className="absolute inset-0 bg-slate-950 flex flex-col z-[300] animate-in fade-in slide-in-from-bottom-10">
                <div className="p-8 pb-4 flex justify-between items-center border-b border-white/5">
                  <div className="flex items-center gap-4">
                    <div className="bg-green-500/10 p-3 rounded-2xl border border-green-500/20">
                      <Check className="w-6 h-6 text-green-400" />
                    </div>
                    <div>
                      <h3 className="font-black text-white text-xl">Conferência</h3>
                      <p className="text-[11px] text-slate-500 font-bold uppercase tracking-widest">Digitalização Concluída</p>
                    </div>
                  </div>
                  <span className="px-3 py-1 bg-indigo-600/20 text-indigo-400 text-[9px] font-black rounded-lg uppercase tracking-widest">
                    {ocrResult.source === 'gemini' ? "IA" : "Local"}
                  </span>
                </div>

                <div className="flex-1 overflow-y-auto px-8 py-6 space-y-6">
                  <div className="grid grid-cols-1 gap-6">
                    <Field label="Emitente / Fornecedor" value={editableFields.emitente} onChange={(v: string) => updateField('emitente', v)} />
                    <div className="grid grid-cols-2 gap-4">
                      <Field label="Nº NF" value={editableFields.numeroNF} onChange={(v: string) => updateField('numeroNF', v)} />
                      <Field label="Data Emissão" value={editableFields.dataEmissao} onChange={(v: string) => updateField('dataEmissao', v)} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <Field label="Valor Total" value={editableFields.total} onChange={(v: string) => updateField('total', v)} prefix="R$" />
                      <Field label="Vencimentos" value={editableFields.vencimentos} onChange={(v: string) => updateField('vencimentos', v)} placeholder="Ex: 20/03/24" />
                    </div>
                    <Field label="Chave de Acesso" value={editableFields.chave} onChange={(v: string) => updateField('chave', v)} rows={2} />
                    <Field label="Produtos" value={editableFields.produtos} onChange={(v: string) => updateField('produtos', v)} rows={2} placeholder="Lista de itens encontrados" />
                  </div>
                </div>

                <div className="p-8 flex gap-4 bg-slate-900/50 backdrop-blur-md">
                  <button onClick={() => { setOcrResult(null); startCamera(); setCapturedImage(null); }} className="flex-1 py-5 bg-white/5 rounded-[30px] font-black uppercase text-xs tracking-widest border border-white/5">Refazer</button>
                  <button onClick={confirmCapture} className="flex-[2] py-5 bg-indigo-600 text-white rounded-[30px] font-black uppercase text-xs tracking-[4px] shadow-xl shadow-indigo-600/20">Confirmar</button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
      
      <canvas ref={canvasRef} className="hidden" />
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
  <div className="space-y-2 group">
    <label className="text-[10px] text-slate-500 uppercase font-black px-1 tracking-widest group-focus-within:text-indigo-400 transition-colors">{label}</label>
    <div className="relative">
      {prefix && <span className="absolute left-5 top-5 text-sm text-indigo-400 font-black">{prefix}</span>}
      {rows > 1 ? (
        <textarea
          value={value}
          onChange={e => onChange(e.target.value)}
          className={`w-full bg-white/5 border border-white/10 rounded-[25px] p-5 text-sm font-bold text-white focus:border-indigo-500/30 focus:bg-white/10 outline-none transition-all font-mono leading-relaxed ${prefix ? 'pl-11' : ''}`}
          rows={rows}
          placeholder={placeholder}
        />
      ) : (
        <input
          type="text"
          value={value}
          onChange={e => onChange(e.target.value)}
          className={`w-full bg-white/5 border border-white/10 rounded-[25px] p-5 text-sm font-bold text-white focus:border-indigo-500/30 focus:bg-white/10 outline-none transition-all ${prefix ? 'pl-11' : ''}`}
          placeholder={placeholder}
        />
      )}
      <Edit2 className="absolute right-5 top-5 w-4 h-4 text-white/5 group-focus-within:text-indigo-400 transition-colors" />
    </div>
  </div>
);
