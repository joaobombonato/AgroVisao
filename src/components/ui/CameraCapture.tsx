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
      
      // Captura na maior resolução possível
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        // Usamos qualidade alta (0.9) para o OCR interno
        setCapturedImage(canvas.toDataURL('image/jpeg', 0.9));
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

  // Overlay baseado no layout real de DANFE (A4 proporcional)
  const NFeOverlay = () => (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10 px-4">
      {/* Moldura A4 (Proporção 210x297) */}
      <div 
        className="relative w-full aspect-[210/297] max-h-[85vh] border-2 border-white/20 rounded-md shadow-2xl overflow-hidden shadow-black/80"
      >
        {/* Cantos destacados (High Precision) */}
        <div className="absolute -top-1 -left-1 w-8 h-8 border-l-4 border-t-4 border-emerald-400 rounded-tl-lg" />
        <div className="absolute -top-1 -right-1 w-8 h-8 border-r-4 border-t-4 border-emerald-400 rounded-tr-lg" />
        <div className="absolute -bottom-1 -left-1 w-8 h-8 border-l-4 border-b-4 border-emerald-400 rounded-bl-lg" />
        <div className="absolute -bottom-1 -right-1 w-8 h-8 border-r-4 border-b-4 border-emerald-400 rounded-br-lg" />

        {/* --- ZONEAMENTO REAL DANFE --- */}
        
        {/* Topo (Cabeçalho) */}
        <div className="absolute inset-x-0 h-[10%] border-b border-white/10 flex">
           {/* Canhoto/Identificação (Esquerda) */}
           <div className="flex-1 border-r border-white/10" />
           {/* NF-e / DANFE (Direita) */}
           <div className="w-[40%] border border-cyan-400/30 rounded m-1 flex items-center justify-center">
              <span className="text-[7px] text-cyan-400 font-bold uppercase">NF-e / DANFE</span>
           </div>
        </div>

        {/* Hot-Zone: Emitente (Top Left Section) */}
        <div className="absolute top-[11%] left-[1.5%] w-[58%] h-[12%] border border-sky-400/40 rounded flex items-start p-1">
           <span className="text-[7px] text-sky-400 font-bold uppercase bg-black/40 px-1">Emitente</span>
        </div>

        {/* Hot-Zone: Chave de Acesso (Top Right Section) */}
        <div className="absolute top-[11%] right-[1.5%] w-[38%] h-[12%] border border-yellow-400/60 rounded flex items-center justify-center bg-yellow-400/5 transition-all">
           <span className="text-[8px] text-yellow-400 font-bold uppercase bg-black/50 px-1 border border-yellow-400/20">Chave de Acesso</span>
        </div>

        {/* Dados Adicionais/Middle section */}
        <div className="absolute top-[24%] inset-x-0 h-[12%] border-y border-white/10 flex">
           {/* Destinatário (Esquerda) */}
           <div className="flex-1 border-r border-white/10 p-1">
              <span className="text-[6px] text-white/20">Destinatário</span>
           </div>
           {/* Data Emissão (Direita Hot-Zone) */}
           <div className="w-[30%] border border-orange-400/30 rounded m-1 flex items-center justify-center">
              <span className="text-[7px] text-orange-400 font-bold uppercase bg-black/40 px-1">Data Emissão</span>
           </div>
        </div>

        {/* Cálculo do Imposto (Hot-Zone: Valor Total) */}
        <div className="absolute top-[36.5%] inset-x-0 h-[12%] border-b border-white/10 flex">
           <div className="flex-1 border-r border-white/10" />
           <div className="w-[35%] border-2 border-red-500/50 rounded-lg m-1 flex items-center justify-center bg-red-500/5">
              <span className="text-[9px] text-red-400 font-black uppercase bg-black/60 px-2 py-0.5 rounded border border-red-500/20">Valor Total</span>
           </div>
        </div>

        {/* Tabela de Produtos (Bottom Half) */}
        <div className="absolute top-[49%] bottom-[2%] inset-x-[1.5%] border-2 border-white/5 rounded-md bg-white/5 flex flex-col">
            <div className="h-6 border-b border-white/10 flex items-center px-2 bg-indigo-500/10">
               <span className="text-[8px] text-indigo-300 font-bold uppercase tracking-wider">Produtos / Serviços</span>
            </div>
            {/* Grid simulada */}
            <div className="flex-1 grid grid-cols-6 divide-x divide-white/10">
               {[...Array(6)].map((_, i) => <div key={i} className="h-full border-b border-white/5" />)}
            </div>
        </div>

        {/* Linha de Scanner (Animação Premium) */}
        <div className="absolute inset-x-0 h-[4px] bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_20px_rgba(52,211,153,0.8)] animate-danfe-scan z-20" />
      </div>

      {/* Dica de posicionamento */}
      <div className="absolute bottom-[10%] inset-x-0 flex flex-col items-center gap-3">
         <div className="flex items-center gap-2 bg-black/60 backdrop-blur-xl px-6 py-3 rounded-[30px] border border-white/10 shadow-huge animate-in fade-in slide-in-from-bottom-2">
            <ScanLine className="w-5 h-5 text-emerald-400 animate-pulse" />
            <p className="text-[11px] text-white font-bold uppercase tracking-[2px]">
               Alinhe o DANFE no quadro
            </p>
         </div>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-[1500] bg-black/95 flex flex-col items-center justify-center backdrop-blur-md">
      <div className="bg-[#020617] w-full max-w-lg h-full sm:h-auto sm:max-h-[90vh] sm:rounded-[50px] overflow-hidden shadow-2xl flex flex-col relative border border-white/10">
        
        <style>{`
          @keyframes danfe-scan {
            0% { top: 0%; opacity: 0; }
            10% { opacity: 1; }
            90% { opacity: 1; }
            100% { top: 100%; opacity: 0; }
          }
          .animate-danfe-scan {
            animation: danfe-scan 4s cubic-bezier(0.4, 0, 0.2, 1) infinite;
          }
          .shadow-huge {
            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
          }
        `}</style>

        {/* Action Bar (Top) */}
        <div className="absolute top-0 inset-x-0 z-[60] p-6 flex justify-between items-center bg-gradient-to-b from-black/80 to-transparent pointer-events-none">
          <div className="flex items-center gap-3 pointer-events-auto">
             <div className="bg-white/10 backdrop-blur-md p-2.5 rounded-2xl border border-white/10">
                <ScanLine className="w-5 h-5 text-white" />
             </div>
             <div>
                <h3 className="text-white font-bold text-sm tracking-tight">Scanner NFe</h3>
                <p className="text-[10px] text-gray-400 font-medium">Capture com precisão</p>
             </div>
          </div>
          <div className="flex items-center gap-3 pointer-events-auto">
             <button onClick={() => setFlashOn(!flashOn)} className={`p-3 rounded-2xl transition-all border ${flashOn ? 'bg-yellow-400 border-yellow-500 text-black' : 'bg-black/40 border-white/10 text-white'}`}>
                <Zap className="w-5 h-5" />
             </button>
             <button onClick={onClose} className="p-3 bg-black/40 border border-white/10 rounded-2xl text-white hover:bg-white/10 transition-colors">
                <X className="w-5 h-5" />
             </button>
          </div>
        </div>

        {/* Viewport */}
        <div className="relative bg-black flex-1 min-h-[60vh] flex items-center justify-center overflow-hidden">
          {!capturedImage ? (
            <>
              <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
              <NFeOverlay />
            </>
          ) : (
            <div className="w-full h-full relative flex flex-col">
              <img src={capturedImage} alt="Captura" className="w-full h-full object-contain bg-slate-950" />
              
              {!ocrResult && !isProcessing && (
                <div className="absolute inset-x-0 bottom-10 flex flex-col items-center gap-4 px-8 z-50">
                  <div className="w-full p-5 bg-black/80 backdrop-blur-2xl border border-white/5 rounded-[40px] flex items-center gap-4 shadow-huge">
                     <div className="bg-indigo-600/20 p-3 rounded-3xl">
                        <Check className="w-8 h-8 text-indigo-400" />
                     </div>
                     <div className="text-left">
                        <p className="text-sm font-black text-white uppercase tracking-tight">Foto Digitalizada</p>
                        <p className="text-[11px] text-gray-500 font-medium">Selecione como deseja processar:</p>
                     </div>
                  </div>
                  
                  <div className="flex w-full gap-4">
                    <button onClick={() => processOCR('fast')} className="flex-1 bg-white text-slate-900 font-black py-6 rounded-[35px] flex flex-col items-center justify-center gap-2 shadow-2xl active:scale-95 transition-all text-xs uppercase tracking-tighter">
                      <FileText className="w-6 h-6" /> 
                      Rápido
                    </button>
                    <button onClick={() => processOCR('ai')} className="flex-1 bg-gradient-to-br from-indigo-600 to-indigo-800 text-white font-black py-6 rounded-[35px] flex flex-col items-center justify-center gap-2 shadow-2xl active:scale-95 transition-all text-xs uppercase tracking-tighter border border-white/10">
                      <ScanLine className="w-6 h-6" />
                      Inteligente
                    </button>
                  </div>
                  
                  <button onClick={() => { setCapturedImage(null); startCamera(); }} className="text-[11px] text-gray-500 font-black hover:text-white transition-colors py-4 uppercase tracking-[3px]">Novo Registro</button>
                </div>
              )}

              {isProcessing && (
                <div className="absolute inset-0 bg-black/95 backdrop-blur-3xl flex flex-col items-center justify-center text-white p-8 z-[100]">
                  <div className="relative mb-8">
                    <div className="absolute inset-0 bg-emerald-500/20 rounded-full blur-2xl animate-pulse" />
                    <div className="w-24 h-24 border-[6px] border-emerald-500/10 border-t-emerald-500 rounded-full animate-spin"></div>
                    <FileText className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 text-emerald-400 animate-pulse" />
                  </div>
                  <h2 className="font-black text-3xl tracking-tighter">Processando...</h2>
                  <p className="text-emerald-400/60 text-xs mt-3 font-bold uppercase tracking-[4px]">Extraindo Arquitetura NFe</p>
                </div>
              )}

              {/* Conference Screen */}
              {ocrResult && (
                <div className="absolute inset-0 bg-slate-950 flex flex-col animate-in fade-in slide-in-from-bottom-10 z-[110]">
                  <div className="p-8 pb-4 flex justify-between items-center">
                    <div className="flex items-center gap-4">
                      <div className="bg-emerald-500/10 p-3 rounded-2xl border border-emerald-500/20">
                        <Check className="w-6 h-6 text-emerald-400" />
                      </div>
                      <div>
                        <h3 className="font-black text-white text-xl tracking-tight">Conferência</h3>
                        <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Resultado da Digitalização</p>
                      </div>
                    </div>
                    <div className="px-4 py-2 bg-indigo-500/10 border border-indigo-500/20 rounded-full">
                       <span className="text-indigo-400 text-[9px] font-black uppercase tracking-[2px]">
                          {ocrResult.source === 'gemini' ? "Mecanismo IA" : "Mecanismo Local"}
                       </span>
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto px-8 py-2 space-y-6">
                    <div className="grid grid-cols-1 gap-5">
                      <Field label="Emitente (RAZÃO SOCIAL)" value={editableFields.emitente} onChange={(v: string) => updateField('emitente', v)} />
                      
                      <div className="grid grid-cols-2 gap-4">
                        <Field label="Nº NF" value={editableFields.numeroNF} onChange={(v: string) => updateField('numeroNF', v)} />
                        <Field label="Data Emissão" value={editableFields.dataEmissao} onChange={(v: string) => updateField('dataEmissao', v)} />
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <Field label="Valor Total" value={editableFields.total} onChange={(v: string) => updateField('total', v)} prefix="R$" />
                        <Field label="Vencimentos" value={editableFields.vencimentos} onChange={(v: string) => updateField('vencimentos', v)} placeholder="Ex: 10/02, 20/02" />
                      </div>
                      
                      <Field label="Chave de Acesso (44 Dígitos)" value={editableFields.chave} onChange={(v: string) => updateField('chave', v)} rows={2} />
                      <Field label="Produtos Detectados" value={editableFields.produtos} onChange={(v: string) => updateField('produtos', v)} rows={2} placeholder="Itens na nota..." />
                    </div>

                    <div className="p-5 bg-emerald-500/5 rounded-[30px] border border-emerald-500/10 flex gap-4">
                      <div className="bg-emerald-500/20 h-10 w-10 shrink-0 rounded-2xl flex items-center justify-center">
                         <ScanLine className="w-5 h-5 text-emerald-400" />
                      </div>
                      <p className="text-[11px] text-slate-500 leading-snug font-medium">Os campos em destaque no guia foram priorizados. Por favor, valide se a **chave** e o **valor** batem com a nota física.</p>
                    </div>
                  </div>

                  <div className="p-8 pt-4 flex gap-4 bg-gradient-to-t from-slate-950 via-slate-950 to-transparent">
                    <button onClick={() => { setOcrResult(null); startCamera(); setCapturedImage(null); }} className="flex-1 py-6 bg-slate-900 rounded-[35px] text-xs font-black uppercase tracking-widest border border-white/5 hover:bg-slate-800 transition-all">Descartar</button>
                    <button onClick={confirmCapture} className="flex-[2] py-6 bg-emerald-500 text-slate-950 rounded-[35px] text-xs font-black uppercase tracking-[3px] shadow-2xl shadow-emerald-500/20 active:scale-95 transition-all">
                      Confirmar
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
        
        {/* Shutter Box (Bottom) */}
        {!capturedImage && (
          <div className="bg-[#020617] p-8 pb-12 flex flex-col items-center gap-6">
            <button onClick={takePhoto} className="w-24 h-24 rounded-full bg-indigo-600 flex items-center justify-center p-1 active:scale-90 transition-all shadow-[0_20px_60px_-15px_rgba(79,70,229,0.5)] group relative">
               <div className="absolute inset-0 bg-indigo-400 rounded-full animate-ping opacity-10 group-active:opacity-0" />
               <div className="w-20 h-20 rounded-full bg-white flex items-center justify-center relative z-10 border-[6px] border-slate-950">
                 <Camera className="w-9 h-9 text-slate-950" />
               </div>
            </button>
            <div className="flex flex-col items-center gap-1">
               <p className="text-[12px] font-black text-white uppercase tracking-[4px]">Toque para Scannear</p>
               <p className="text-[10px] text-slate-500 font-bold">POSICIONE A NOTA NO QUADRO</p>
            </div>
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
  <div className="space-y-2 group">
    <label className="text-[10px] text-slate-500 uppercase font-black px-1 leading-none tracking-widest group-focus-within:text-emerald-400 transition-colors">{label}</label>
    <div className="relative">
      {prefix && <span className="absolute left-5 top-5 text-sm text-emerald-400 font-black">{prefix}</span>}
      {rows > 1 ? (
        <textarea
          value={value}
          onChange={e => onChange(e.target.value)}
          className={`w-full bg-slate-900 border border-white/5 rounded-[25px] p-5 text-sm font-bold text-white focus:border-emerald-500/30 focus:bg-slate-800 outline-none transition-all font-mono leading-relaxed placeholder:text-slate-800 ${prefix ? 'pl-11' : ''}`}
          rows={rows}
          placeholder={placeholder}
        />
      ) : (
        <input
          type="text"
          value={value}
          onChange={e => onChange(e.target.value)}
          className={`w-full bg-slate-900 border border-white/5 rounded-[25px] p-5 text-sm font-bold text-white focus:border-emerald-500/30 focus:bg-slate-800 outline-none transition-all placeholder:text-slate-800 ${prefix ? 'pl-11' : ''}`}
          placeholder={placeholder}
        />
      )}
      <Edit2 className="absolute right-5 top-5 w-4 h-4 text-white/5 group-focus-within:text-emerald-400 transition-colors pointer-events-none" />
    </div>
  </div>
);
