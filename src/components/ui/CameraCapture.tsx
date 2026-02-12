import { useRef, useState, useEffect } from 'react';
import { Camera, X, Check, FileText, Edit2, Zap, ScanLine } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface CameraCaptureProps {
  onCapture: (file: File, ocrResult?: { text: string, fields: any }) => void;
  onClose: () => void;
}

interface EditableFields {
  emitente: string;
  cnpjEmitente: string;
  numeroNF: string;
  dataEmissao: string;
  total: string;
  chave: string;
  vencimentos: string;
  produtos: string;
}

const HOTSPOTS = {
  emitente: { top: 6, left: 2, width: 38, height: 10 },
  numeroNF: { top: 11.5, left: 40, width: 12, height: 5 },
  chave: { top: 6, left: 53, width: 42, height: 7 },
  cnpjEmitente: { top: 18.5, left: 62, width: 18, height: 2.8 },
  dataEmissao: { top: 23, left: 77, width: 15, height: 5 },
  vencimentos: { top: 30, left: 2, width: 50, height: 5 },
  total: { top: 35.5, left: 78, width: 16, height: 4 },
  produtos: { top: 48, left: 2, width: 96, height: 15 }
};

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
    cnpjEmitente: "",
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
        cnpjEmitente: ocrResult.fields.cnpjEmitente || "",
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
      
      if (type === 'ai') {
        const blob = await (await fetch(capturedImage)).blob();
        const file = new File([blob], "temp.jpg", { type: "image/jpeg" });
        const result = await ocrService.recognizeIntelligent(file);
        setOcrResult(result);
      } else {
        // Fast Zone-based OCR
        const img = new Image();
        img.src = capturedImage;
        await new Promise((resolve) => { img.onload = resolve; });

        const results: any = { fields: {} };
        const cropPromises = Object.entries(HOTSPOTS).map(async ([field, zone]) => {
          const cropCanvas = document.createElement('canvas');
          const ctx = cropCanvas.getContext('2d');
          if (!ctx) return;

          const x = (zone.left / 100) * img.width;
          const y = (zone.top / 100) * img.height;
          const w = (zone.width / 100) * img.width;
          const h = (zone.height / 100) * img.height;

          cropCanvas.width = w;
          cropCanvas.height = h;
          ctx.drawImage(img, x, y, w, h, 0, 0, w, h);

          const cropBlob = await new Promise<Blob | null>((resolve) => cropCanvas.toBlob(resolve, 'image/jpeg', 0.9));
          if (!cropBlob) return;

          const cropFile = new File([cropBlob], `${field}.jpg`, { type: 'image/jpeg' });
          const singleResult = await ocrService.recognize(cropFile);
          
          // Map specific fields back to results with strict validation
          const cleanRaw = singleResult.rawText.trim();
          
          if (field === 'emitente') results.fields.emitente = cleanRaw;
          
          if (field === 'numeroNF') {
            results.fields.numeroNF = cleanRaw.replace(/[^0-9.]/g, '');
          }
          
          if (field === 'chave') {
            results.fields.chave = (singleResult.fields.chave || cleanRaw).replace(/[^0-9 ]/g, '');
          }
          
          if (field === 'cnpjEmitente') {
            const match = cleanRaw.match(/(\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2})/);
            results.fields.cnpjEmitente = match ? match[0] : cleanRaw.replace(/[^0-9./-]/g, '');
          }
          
          if (field === 'dataEmissao') {
            const match = cleanRaw.match(/(\d{2}\/\d{2}\/\d{4})/);
            results.fields.dataEmissao = match ? match[0] : cleanRaw.replace(/[^0-9/]/g, '');
          }
          
          if (field === 'total') {
            const match = cleanRaw.match(/(\d+[,.]\d{2})/);
            results.fields.total = match ? match[0].replace(',', '.') : cleanRaw.replace(/[^0-9.,]/g, '').replace(',', '.');
          }
          
          if (field === 'vencimentos') {
            results.fields.vencimentos = [cleanRaw.replace(/[^0-9.,/ ]/g, '')];
          }
          
          if (field === 'produtos') results.fields.produtos = [cleanRaw];

          // Noise Filter: If numeric field results in just weird symbols or is too short, clear it
          if (['numeroNF', 'chave', 'cnpjEmitente', 'dataEmissao', 'total'].includes(field)) {
            if (results.fields[field].length < 2) results.fields[field] = "";
          }
        });

        await Promise.all(cropPromises);
        setOcrResult(results);
      }
      
      toast.success(type === 'fast' ? "Leitura por Zonas concluída!" : "IA Avançada concluída!");
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

  // Overlay Calibrado (v4.5.16) - Calibração Cirúrgica v4
  const NFeOverlay = () => (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10 px-6">
      <div 
        className="relative w-full aspect-[210/297] max-h-[82vh] border-2 border-dashed border-white/20 rounded-xl shadow-[0_0_150px_rgba(0,0,0,0.85)]"
      >
        {/* Cantos destacados - Estilo Lente */}
        <div className="absolute -top-1 -left-1 w-12 h-12 border-l-4 border-t-4 border-indigo-500 rounded-tl-2xl" />
        <div className="absolute -top-1 -right-1 w-12 h-12 border-r-4 border-t-4 border-indigo-500 rounded-tr-2xl" />
        <div className="absolute -bottom-1 -left-1 w-12 h-12 border-l-4 border-b-4 border-indigo-500 rounded-bl-2xl" />
        <div className="absolute -bottom-1 -right-1 w-12 h-12 border-r-4 border-b-4 border-indigo-500 rounded-br-2xl" />

        {/* --- CALIBRAÇÃO DE PRECISÃO v4 --- */}
        
        {/* 1. Emitente (Pouca coisa maior na vertical) */}
        <div className="absolute top-[6%] left-[2%] w-[38%] h-[10%] border border-cyan-400/60 rounded flex items-center justify-center bg-cyan-400/5 transition-all">
           <span className="text-[7px] text-cyan-400 font-black uppercase tracking-widest">Emitente</span>
        </div>

        {/* 2. Nº da NF (Colar na lateral do emitente e pouco mais para cima) */}
        <div className="absolute top-[11.5%] left-[40%] w-[12%] h-[5%] border border-blue-400/60 rounded flex items-center justify-center bg-blue-400/5">
           <span className="text-[6px] text-blue-400 font-black uppercase text-center leading-tight">Nº da NF</span>
        </div>

        {/* 3. Chave de Acesso (Pouca coisa para a esquerda) */}
        <div className="absolute top-[6%] right-[5%] w-[42%] h-[7%] border-2 border-yellow-400/70 rounded flex items-center justify-center bg-yellow-400/10">
           <span className="text-[8px] text-yellow-400 font-black uppercase tracking-wider">Chave de Acesso</span>
        </div>

        {/* 4. CNPJ Emitente (Pouca coisa pra cima e para a esquerda) */}
        <div className="absolute top-[18.5%] right-[20%] w-[18%] h-[2.8%] border border-cyan-500/50 rounded flex items-center justify-center bg-cyan-400/5">
           <span className="text-[5px] text-cyan-500 font-black uppercase">CNPJ Emitente</span>
        </div>

        {/* 5. Data Emissão (Pouca coisa pra cima e para a esquerda) */}
        <div className="absolute top-[23%] right-[8%] w-[15%] h-[5%] border border-orange-400/60 rounded flex items-center justify-center bg-orange-400/5">
           <span className="text-[6px] text-orange-400 font-black uppercase">Data</span>
        </div>

        {/* 6. Vencimentos (Mesma medida pra cima - era 32%) */}
        <div className="absolute top-[30%] left-[2%] w-[50%] h-[5%] border border-pink-400/60 rounded flex items-center justify-center bg-pink-400/10">
           <span className="text-[7px] text-pink-400 font-black uppercase">Vencimento</span>
        </div>

        {/* 7. Valor Total (Pouca coisa pra cima e para a esquerda) */}
        <div className="absolute top-[35.5%] right-[6%] w-[16%] h-[4%] border-2 border-red-500/80 rounded-lg flex items-center justify-center bg-red-500/15">
           <span className="text-[8px] text-red-500 font-black uppercase">V. Total</span>
        </div>

        {/* 8. Produtos (Pouca coisa pra cima e metade do comprimento) */}
        <div className="absolute top-[48%] h-[25%] inset-x-[2%] border border-indigo-400/20 rounded-xl bg-indigo-500/5 overflow-hidden">
            <div className="w-full h-5 bg-indigo-500/10 flex items-center justify-center">
               <span className="text-[8px] text-indigo-400 font-black uppercase tracking-widest">Tabela de Produtos</span>
            </div>
            <div className="w-full h-full opacity-10 grid grid-cols-4 divide-x divide-indigo-400/30">
               {[...Array(4)].map((_, i) => <div key={i} className="border-t border-indigo-400/30" />)}
            </div>
        </div>

        {/* Laser de Escaneamento Animado */}
        <div className="absolute inset-x-0 h-1 bg-indigo-500/40 shadow-[0_0_15px_rgba(99,102,241,0.6)] animate-laser-scan z-20" />
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-[1500] bg-black flex flex-col overflow-hidden">
      
      {/* Dynamic Header */}
      <div className="bg-[#0f172a] border-b border-white/5 p-5 flex justify-between items-center z-[110] relative">
        <div className="flex items-center gap-3">
          <div className="bg-indigo-600/20 p-2.5 rounded-2xl border border-indigo-500/20">
            <ScanLine className="w-6 h-6 text-indigo-400"/>
          </div>
          <div>
            <h3 className="font-black text-white text-base tracking-tighter uppercase italic">Scanner VisãoAgro</h3>
            <p className="text-[10px] text-indigo-400/60 font-black uppercase tracking-[2px]">Refinamento v4.5.21</p>
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
        
        <style>{`
          @keyframes laser-scan {
            0% { top: 0%; opacity: 0; }
            5% { opacity: 1; }
            95% { opacity: 1; }
            100% { top: 100%; opacity: 0; }
          }
          .animate-laser-scan { animation: laser-scan 4s linear infinite; }
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

            {/* Shutter Button (Simplificado) */}
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
            
            {/* Post-Capture UI */}
            {!ocrResult && !isProcessing && (
              <div className="absolute inset-x-0 bottom-10 flex flex-col items-center gap-4 px-8 animate-in fade-in slide-in-from-bottom-10">
                <div className="flex w-full gap-4">
                  <button onClick={() => processOCR('fast')} className="flex-1 bg-white text-slate-950 font-black py-6 rounded-[35px] text-xs uppercase tracking-widest active:scale-95 transition-all">
                    Rápido
                  </button>
                  <button onClick={() => processOCR('ai')} className="flex-1 bg-indigo-600 text-white font-black py-6 rounded-[35px] text-xs uppercase tracking-widest active:scale-95 transition-all shadow-xl shadow-indigo-600/20">
                    IA Avançada
                  </button>
                </div>
                <button onClick={() => { setCapturedImage(null); startCamera(); }} className="text-[11px] text-gray-500 font-black hover:text-white transition-colors py-4 uppercase tracking-[4px]">Descartar e Refazer</button>
              </div>
            )}

            {isProcessing && (
              <div className="absolute inset-0 bg-slate-950/95 backdrop-blur-3xl flex flex-col items-center justify-center text-white p-8 z-[200]">
                <div className="relative mb-10">
                   <div className="w-24 h-24 border-[6px] border-indigo-500/10 border-t-indigo-500 rounded-full animate-spin" />
                   <div className="absolute inset-0 flex items-center justify-center">
                      <ScanLine className="w-8 h-8 text-indigo-400 animate-pulse" />
                   </div>
                </div>
                <h3 className="font-black text-2xl tracking-tighter uppercase italic">Escaneando</h3>
                <p className="text-gray-600 text-[10px] font-black mt-3 uppercase tracking-[6px]">Arquitetura de Dados NFe</p>
              </div>
            )}

            {/* Conference Screen */}
            {ocrResult && (
              <div className="absolute inset-0 bg-[#020617] flex flex-col z-[300] animate-in fade-in slide-in-from-bottom-10">
                <div className="p-8 pb-4 flex justify-between items-center border-b border-white/5 bg-slate-900/40">
                  <div className="flex items-center gap-4">
                    <div className="bg-emerald-500/10 p-3 rounded-2xl border border-emerald-500/20">
                      <Check className="w-6 h-6 text-emerald-400" />
                    </div>
                    <div>
                      <h3 className="font-black text-white text-xl tracking-tight">Vincular Nota</h3>
                      <p className="text-[11px] text-slate-500 font-bold uppercase tracking-widest">Confirme os dados extraídos</p>
                    </div>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto px-8 py-8 space-y-6">
                  <div className="grid grid-cols-1 gap-6">
                    <Field label="Emitente (RAZÃO SOCIAL)" value={editableFields.emitente} onChange={(v: string) => updateField('emitente', v)} />
                    
                    <div className="grid grid-cols-2 gap-4">
                      <Field label="CNPJ Emitente" value={editableFields.cnpjEmitente} onChange={(v: string) => updateField('cnpjEmitente', v)} />
                      <Field label="Nº NF" value={editableFields.numeroNF} onChange={(v: string) => updateField('numeroNF', v)} />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <Field label="Data de Emissão" value={editableFields.dataEmissao} onChange={(v: string) => updateField('dataEmissao', v)} />
                      <Field label="Valor Total (R$)" value={editableFields.total} onChange={(v: string) => updateField('total', v)} prefix="R$" />
                    </div>

                    <Field label="Vencimentos" value={editableFields.vencimentos} onChange={(v: string) => updateField('vencimentos', v)} placeholder="Ex: 10/06/2024" />
                    <Field label="Chave de Acesso (44 DÍGITOS)" value={editableFields.chave} onChange={(v: string) => updateField('chave', v)} rows={2} />
                    <Field label="Itens / Produtos" value={editableFields.produtos} onChange={(v: string) => updateField('produtos', v)} rows={2} placeholder="Descrição dos itens capturados" />
                  </div>
                </div>

                <div className="p-8 pt-6 flex gap-4 bg-slate-900/80 backdrop-blur-xl border-t border-white/5">
                  <button onClick={() => { setOcrResult(null); startCamera(); setCapturedImage(null); }} className="flex-1 py-6 bg-white/5 rounded-[35px] font-black uppercase text-xs tracking-widest border border-white/5 text-gray-400">Refazer</button>
                  <button onClick={confirmCapture} className="flex-[2] py-6 bg-indigo-600 text-white rounded-[35px] font-black uppercase text-xs tracking-[5px] shadow-2xl shadow-indigo-600/30 active:scale-95 transition-all">Confirmar</button>
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
    <label className="text-[10px] text-slate-600 uppercase font-black px-1 tracking-[2px] group-focus-within:text-indigo-400 transition-colors">{label}</label>
    <div className="relative">
      {prefix && <span className="absolute left-6 top-6 text-sm text-indigo-400 font-black">{prefix}</span>}
      {rows > 1 ? (
        <textarea
          value={value}
          onChange={e => onChange(e.target.value)}
          className={`w-full bg-white/5 border border-white/10 rounded-[30px] p-6 text-sm font-bold text-white focus:border-indigo-500/40 focus:bg-white/10 outline-none transition-all font-mono leading-relaxed ${prefix ? 'pl-12' : ''}`}
          rows={rows}
          placeholder={placeholder}
        />
      ) : (
        <input
          type="text"
          value={value}
          onChange={e => onChange(e.target.value)}
          className={`w-full bg-white/5 border border-white/10 rounded-[30px] p-6 text-sm font-bold text-white focus:border-indigo-500/40 focus:bg-white/10 outline-none transition-all ${prefix ? 'pl-12' : ''}`}
          placeholder={placeholder}
        />
      )}
      <Edit2 className="absolute right-6 top-6 w-4 h-4 text-white/5 group-focus-within:text-indigo-400 transition-colors" />
    </div>
  </div>
);
