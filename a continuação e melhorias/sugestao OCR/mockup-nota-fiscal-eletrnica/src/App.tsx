import { useState, useRef, useEffect, useCallback } from 'react';
import { Camera, Check, RefreshCw, Download, ScanLine, Zap } from 'lucide-react';

interface NFeData {
  chaveAcesso: string;
  numero: string;
  serie: string;
  dataEmissao: string;
  emitente: {
    cnpj: string;
    razaoSocial: string;
    ie: string;
  };
  destinatario: {
    cpfCnpj: string;
    nome: string;
  };
  valorTotal: string;
  valorICMS: string;
}

const MOCK_NFE_DATA: NFeData = {
  chaveAcesso: '3525 1234 5678 9012 3456 7890 1234 5678 9012 3456 7890',
  numero: '123456',
  serie: '001',
  dataEmissao: '15/01/2025 14:30:00',
  emitente: {
    cnpj: '12.345.678/0001-90',
    razaoSocial: 'EMPRESA EXEMPLO LTDA',
    ie: '123.456.789.012',
  },
  destinatario: {
    cpfCnpj: '987.654.321-00',
    nome: 'JOÃO SILVA',
  },
  valorTotal: 'R$ 1.234,56',
  valorICMS: 'R$ 222,22',
};

export function App() {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [extractedData, setExtractedData] = useState<NFeData | null>(null);
  const [activeHighlight, setActiveHighlight] = useState<string | null>(null);
  const [flashOn, setFlashOn] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Solicitar permissão da câmera
  useEffect(() => {
    const initCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { 
            facingMode: 'environment',
            width: { ideal: 1920 },
            height: { ideal: 1080 }
          },
          audio: false,
        });
        
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          streamRef.current = stream;
        }
        setHasPermission(true);
      } catch (err) {
        console.error('Erro ao acessar câmera:', err);
        setHasPermission(false);
      }
    };

    initCamera();

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  // Simular OCR
  const simulateOCR = useCallback(() => {
    setIsScanning(true);
    const fields = [
      'chaveAcesso',
      'emitenteCNPJ',
      'destinatarioCPF',
      'valorTotal',
      'numeroSerie'
    ];
    
    let delay = 0;
    fields.forEach((field) => {
      setTimeout(() => {
        setActiveHighlight(field);
      }, delay);
      delay += 400;
    });

    setTimeout(() => {
      setIsScanning(false);
      setActiveHighlight(null);
      setExtractedData(MOCK_NFE_DATA);
    }, delay + 500);
  }, []);

  // Capturar imagem
  const captureImage = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');
      
      if (context) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        const imageData = canvas.toDataURL('image/jpeg', 0.9);
        setCapturedImage(imageData);
        simulateOCR();
      }
    }
  };

  // Resetar
  const resetCamera = () => {
    setCapturedImage(null);
    setExtractedData(null);
    setActiveHighlight(null);
  };

  // Salvar imagem
  const saveImage = () => {
    if (capturedImage) {
      const link = document.createElement('a');
      link.href = capturedImage;
      link.download = `nfe_scan_${Date.now()}.jpg`;
      link.click();
    }
  };

  // Componente do Overlay da NF-e - APENAS CONTORNOS SUTIS
  const NFeOverlay = () => (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
      {/* Container do template NF-e - proporção A4 */}
      <div 
        className="relative"
        style={{ 
          width: '90vw',
          maxWidth: '400px',
          aspectRatio: '210/297',
        }}
      >
        {/* Borda externa principal - mais grossa */}
        <div className="absolute inset-0 border-[3px] border-white/60 rounded-sm shadow-2xl" 
             style={{ backdropFilter: 'blur(1px)' }} />
        
        {/* Cantos destacados para alinhamento */}
        <div className="absolute -top-1 -left-1 w-8 h-8 border-l-4 border-t-4 border-green-400 rounded-tl" />
        <div className="absolute -top-1 -right-1 w-8 h-8 border-r-4 border-t-4 border-green-400 rounded-tr" />
        <div className="absolute -bottom-1 -left-1 w-8 h-8 border-l-4 border-b-4 border-green-400 rounded-bl" />
        <div className="absolute -bottom-1 -right-1 w-8 h-8 border-r-4 border-b-4 border-green-400 rounded-br" />

        {/* LINHA 1: CHAVE DE ACESSO */}
        <div 
          className={`absolute left-2 right-2 border rounded transition-all duration-300 ${
            activeHighlight === 'chaveAcesso' 
              ? 'border-green-400 border-2 shadow-lg shadow-green-400/50' 
              : 'border-yellow-400/40'
          }`}
          style={{ top: '3%', height: '4.5%' }}
        >
          <span className="absolute -top-2 left-2 text-[9px] text-yellow-400 bg-black/50 px-1 rounded font-bold">
            CHAVE DE ACESSO
          </span>
        </div>

        {/* LINHA 2: CABEÇALHO (Logo + DANFE) */}
        <div className="absolute left-2 right-2 border-b border-white/20" style={{ top: '8.5%', height: '12%' }}>
          {/* Área Logo/Emitente (Esquerda) */}
          <div 
            className={`absolute left-0 border-r rounded-tl transition-all duration-300 ${
              activeHighlight === 'emitenteCNPJ' 
                ? 'border-green-400 border-2 shadow-lg shadow-green-400/50' 
                : 'border-cyan-400/40'
            }`}
            style={{ top: 0, width: '58%', height: '100%' }}
          >
            <span className="absolute -top-2 left-1 text-[8px] text-cyan-400 bg-black/50 px-1 rounded font-bold">
              EMITENTE
            </span>
            {/* Linhas internas simulando campos */}
            <div className="absolute bottom-8 left-1 right-1 border-b border-white/10" />
            <div className="absolute bottom-5 left-1 right-1 border-b border-white/10" />
            <div className="absolute bottom-2 left-1 right-1 border-b border-white/10" />
          </div>

          {/* Área DANFE (Direita) */}
          <div 
            className={`absolute right-0 border-l rounded-tr transition-all duration-300 ${
              activeHighlight === 'numeroSerie' 
                ? 'border-green-400 border-2 shadow-lg shadow-green-400/50' 
                : 'border-blue-400/40'
            }`}
            style={{ top: 0, width: '40%', height: '100%' }}
          >
            <span className="absolute -top-2 left-1 text-[8px] text-blue-400 bg-black/50 px-1 rounded font-bold">
              NF-e / DANFE
            </span>
            <div className="absolute top-5 left-1 right-1 text-center text-[7px] text-white/30">
              Nº _____ Série ___
            </div>
            <div className="absolute bottom-2 left-1 right-1 border-t border-white/10" />
          </div>
        </div>

        {/* LINHA 3: NATUREZA DA OPERAÇÃO */}
        <div className="absolute left-2 right-2 border-b border-white/15" style={{ top: '21%', height: '3.5%' }}>
          <span className="absolute -top-1.5 left-1 text-[7px] text-white/40 bg-black/50 px-1 rounded">
            NATUREZA DA OPERAÇÃO
          </span>
        </div>

        {/* LINHA 4: INSCRIÇÃO ESTADUAL + ESTADUAL DEST */}
        <div className="absolute left-2 right-2 border-b border-white/15" style={{ top: '25%', height: '3%' }}>
          <div className="absolute left-0 w-1/2 h-full border-r border-white/15">
            <span className="text-[6px] text-white/30">IE</span>
          </div>
          <div className="absolute right-0 w-1/2 h-full">
            <span className="text-[6px] text-white/30">IE DEST</span>
          </div>
        </div>

        {/* LINHA 5: DESTINATÁRIO / REMETENTE */}
        <div 
          className={`absolute left-2 right-2 border rounded transition-all duration-300 ${
            activeHighlight === 'destinatarioCPF' 
              ? 'border-green-400 border-2 shadow-lg shadow-green-400/50' 
              : 'border-purple-400/40'
          }`}
          style={{ top: '29%', height: '9%' }}
        >
          <span className="absolute -top-2 left-1 text-[8px] text-purple-400 bg-black/50 px-1 rounded font-bold">
            DESTINATÁRIO / REMETENTE
          </span>
          {/* Subdivisões */}
          <div className="absolute top-4 left-1 right-1 border-b border-white/10" />
          <div className="absolute top-7 left-1 w-1/3 border-r border-white/10 h-5">
            <span className="text-[6px] text-white/30">CPF/CNPJ</span>
          </div>
          <div className="absolute bottom-1 left-1 right-1 border-t border-white/10" />
        </div>

        {/* LINHA 6: FATURA */}
        <div className="absolute left-2 right-2 border-b border-white/15" style={{ top: '39%', height: '4%' }}>
          <span className="absolute -top-1.5 left-1 text-[7px] text-white/40 bg-black/50 px-1 rounded">
            FATURA / DUPLICATAS
          </span>
        </div>

        {/* LINHA 7: CÁLCULO DO IMPOSTO */}
        <div className="absolute left-2 right-2 border-b border-white/15" style={{ top: '44%', height: '5%' }}>
          <span className="absolute -top-1.5 left-1 text-[7px] text-white/40 bg-black/50 px-1 rounded">
            CÁLCULO DO IMPOSTO
          </span>
          {/* Grid de 6 colunas */}
          <div className="absolute inset-x-0 top-3 flex">
            <div className="flex-1 border-r border-white/10 text-center text-[5px] text-white/20">BC ICMS</div>
            <div className="flex-1 border-r border-white/10 text-center text-[5px] text-white/20">VL ICMS</div>
            <div className="flex-1 border-r border-white/10 text-center text-[5px] text-white/20">BC ICMS ST</div>
            <div className="flex-1 border-r border-white/10 text-center text-[5px] text-white/20">VL ICMS ST</div>
            <div className="flex-1 border-r border-white/10 text-center text-[5px] text-white/20">VL IPI</div>
            <div className="flex-1 text-center text-[5px] text-white/20">VL PIS</div>
          </div>
        </div>

        {/* LINHA 8: TRANSPORTADOR */}
        <div className="absolute left-2 right-2 border-b border-white/15" style={{ top: '50%', height: '5%' }}>
          <span className="absolute -top-1.5 left-1 text-[7px] text-white/40 bg-black/50 px-1 rounded">
            TRANSPORTADOR / VOLUMES
          </span>
        </div>

        {/* LINHA 9: DADOS DOS PRODUTOS (TABELA PRINCIPAL) */}
        <div className="absolute left-2 right-2 border border-orange-400/40 rounded" style={{ top: '56%', height: '23%' }}>
          <span className="absolute -top-2 left-1 text-[8px] text-orange-400 bg-black/50 px-1 rounded font-bold">
            DADOS DOS PRODUTOS / SERVIÇOS
          </span>
          
          {/* Cabeçalho da tabela */}
          <div className="absolute top-2 inset-x-0 flex border-b border-white/20 pb-0.5">
            <div className="w-[8%] border-r border-white/10 text-[6px] text-white/30 px-0.5">CÓD</div>
            <div className="flex-1 border-r border-white/10 text-[6px] text-white/30 px-0.5">DESCRIÇÃO</div>
            <div className="w-[8%] border-r border-white/10 text-[6px] text-white/30 px-0.5">NCM</div>
            <div className="w-[8%] border-r border-white/10 text-[6px] text-white/30 px-0.5">CST</div>
            <div className="w-[8%] border-r border-white/10 text-[6px] text-white/30 px-0.5">CFOP</div>
            <div className="w-[8%] border-r border-white/10 text-[6px] text-white/30 px-0.5">UN</div>
            <div className="w-[8%] border-r border-white/10 text-[6px] text-white/30 px-0.5">QTD</div>
            <div className="w-[10%] border-r border-white/10 text-[6px] text-white/30 px-0.5">VL.UN</div>
            <div className="w-[10%] border-r border-white/10 text-[6px] text-white/30 px-0.5">VL.TOT</div>
            <div className="w-[8%] text-[6px] text-white/30 px-0.5">ICMS</div>
          </div>

          {/* Linhas da tabela (5 linhas de produtos) */}
          {[...Array(5)].map((_, i) => (
            <div 
              key={i}
              className="absolute inset-x-0 border-b border-white/10" 
              style={{ top: `${35 + (i * 13)}%`, height: '13%' }}
            />
          ))}
        </div>

        {/* LINHA 10: CÁLCULO DO ISSQN */}
        <div className="absolute left-2 right-2 border-b border-white/15" style={{ top: '80%', height: '3.5%' }}>
          <span className="absolute -top-1.5 left-1 text-[7px] text-white/40 bg-black/50 px-1 rounded">
            CÁLCULO DO ISSQN
          </span>
        </div>

        {/* LINHA 11: DADOS ADICIONAIS + TOTAIS */}
        <div className="absolute left-2 right-2" style={{ top: '84%', height: '12%' }}>
          {/* Dados Adicionais (Esquerda) */}
          <div className="absolute left-0 border border-white/20 rounded-bl" style={{ width: '60%', height: '100%' }}>
            <span className="absolute -top-2 left-1 text-[7px] text-white/40 bg-black/50 px-1 rounded">
              INFORMAÇÕES COMPLEMENTARES
            </span>
          </div>

          {/* Reservado ao Fisco + Totais (Direita) */}
          <div className="absolute right-0" style={{ width: '38%', height: '100%' }}>
            <div className="border border-white/20 rounded-tr mb-1" style={{ height: '45%' }}>
              <span className="text-[6px] text-white/30 px-0.5">RESERVADO AO FISCO</span>
            </div>
            <div 
              className={`border rounded-br transition-all duration-300 ${
                activeHighlight === 'valorTotal' 
                  ? 'border-green-400 border-2 shadow-lg shadow-green-400/50' 
                  : 'border-red-400/40'
              }`}
              style={{ height: '52%' }}
            >
              <span className="absolute -top-1.5 right-1 text-[8px] text-red-400 bg-black/50 px-1 rounded font-bold">
                VALOR TOTAL
              </span>
              <div className="text-center mt-2 text-[10px] text-white/40 font-bold">
                R$ _____,__
              </div>
            </div>
          </div>
        </div>

        {/* LINHA 12: RECEBIMENTO */}
        <div className="absolute left-2 right-2 bottom-0 border-t border-white/15 pt-1" style={{ height: '3%' }}>
          <span className="text-[6px] text-white/30">DATA DE RECEBIMENTO / ASSINATURA / IDENTIFICAÇÃO</span>
        </div>

        {/* Mensagem de instrução - centralizada */}
        {!isScanning && (
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 pointer-events-none">
            <div className="bg-black/70 text-white text-xs px-4 py-2 rounded-full shadow-lg border border-green-400/50 animate-pulse">
              📄 Alinhe a NF-e aqui
            </div>
          </div>
        )}

        {/* Scanning animation - linha verde */}
        {isScanning && (
          <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-sm">
            <div 
              className="absolute left-0 right-0 h-1 bg-gradient-to-r from-transparent via-green-400 to-transparent"
              style={{
                animation: 'scanMove 2s ease-in-out infinite',
                boxShadow: '0 0 20px rgba(74, 222, 128, 0.8)',
              }}
            />
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <style>{`
        @keyframes scanMove {
          0%, 100% { top: 0%; }
          50% { top: 100%; }
        }
      `}</style>

      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-b from-black/90 to-transparent p-4">
        <div className="flex items-center justify-between max-w-lg mx-auto">
          <div className="flex items-center gap-2">
            <div className="bg-gradient-to-br from-blue-500 to-purple-600 p-2 rounded-lg">
              <ScanLine className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-bold text-lg">Scanner NF-e</h1>
              <p className="text-xs text-gray-300">Posicione a nota no guia</p>
            </div>
          </div>
          <button
            onClick={() => setFlashOn(!flashOn)}
            className={`p-2 rounded-full transition-colors ${flashOn ? 'bg-yellow-400 text-black' : 'bg-white/20'}`}
          >
            <Zap className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Área da Câmera */}
      <div className="relative h-screen overflow-hidden">
        {hasPermission === null && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4" />
              <p className="text-gray-400">Iniciando câmera...</p>
            </div>
          </div>
        )}

        {hasPermission === false && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-900 p-8">
            <div className="text-center max-w-md">
              <div className="bg-red-500/20 p-4 rounded-full w-20 h-20 mx-auto mb-4 flex items-center justify-center">
                <Camera className="w-10 h-10 text-red-400" />
              </div>
              <h2 className="text-xl font-bold mb-2">Permissão Negada</h2>
              <p className="text-gray-400 mb-4">
                Precisamos acessar a câmera para escanear a NF-e. Por favor, permita o acesso nas configurações do navegador.
              </p>
              <button 
                onClick={() => window.location.reload()}
                className="bg-blue-600 hover:bg-blue-700 px-6 py-3 rounded-lg font-medium transition-colors"
              >
                Tentar Novamente
              </button>
            </div>
          </div>
        )}

        {/* Vídeo da Câmera */}
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="absolute inset-0 w-full h-full object-cover"
        />

        {/* Canvas para captura (invisível) */}
        <canvas ref={canvasRef} className="hidden" />

        {/* Overlay da NF-e - APENAS CONTORNOS */}
        {hasPermission === true && !capturedImage && <NFeOverlay />}

        {/* Preview da imagem capturada */}
        {capturedImage && (
          <div className="absolute inset-0 bg-black">
            <img 
              src={capturedImage} 
              alt="Capturada" 
              className="w-full h-full object-contain"
            />
            
            {/* Overlay de OCR */}
            {isScanning && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                <div className="text-center">
                  <div className="relative mb-4">
                    <div className="absolute inset-0 bg-blue-500/30 rounded-full animate-ping" />
                    <ScanLine className="w-16 h-16 text-blue-400 relative z-10 mx-auto animate-pulse" />
                  </div>
                  <p className="text-lg font-medium mb-2">Lendo NF-e...</p>
                  <p className="text-sm text-gray-400">Processando campos</p>
                  
                  {/* Progresso */}
                  <div className="mt-4 w-64 h-2 bg-gray-700 rounded-full overflow-hidden mx-auto">
                    <div 
                      className="h-full bg-gradient-to-r from-blue-500 to-green-500 transition-all duration-300"
                      style={{ 
                        width: activeHighlight === 'valorTotal' ? '100%' : 
                               activeHighlight === 'destinatarioCPF' ? '75%' :
                               activeHighlight === 'emitenteCNPJ' ? '50%' :
                               activeHighlight === 'chaveAcesso' ? '25%' : '0%'
                      }}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Resultado do OCR */}
            {extractedData && (
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black via-black/95 to-transparent p-6 pt-20 max-h-[70vh] overflow-y-auto">
                <div className="max-w-lg mx-auto">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="bg-green-500 p-2 rounded-full">
                      <Check className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h3 className="font-bold text-lg">NF-e Lida com Sucesso!</h3>
                      <p className="text-sm text-gray-400">Dados extraídos via OCR</p>
                    </div>
                  </div>

                  <div className="bg-gray-800/80 rounded-xl p-4 space-y-3 mb-4">
                    <div className="flex justify-between items-center py-2 border-b border-gray-700">
                      <span className="text-gray-400 text-sm">Chave de Acesso</span>
                      <span className="font-mono text-xs text-green-400">{extractedData.chaveAcesso}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-gray-700">
                      <span className="text-gray-400 text-sm">Número/Série</span>
                      <span className="font-mono">{extractedData.numero} / {extractedData.serie}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-gray-700">
                      <span className="text-gray-400 text-sm">Emitente</span>
                      <div className="text-right">
                        <div className="text-sm">{extractedData.emitente.razaoSocial}</div>
                        <div className="text-xs text-gray-500">{extractedData.emitente.cnpj}</div>
                      </div>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-gray-700">
                      <span className="text-gray-400 text-sm">Destinatário</span>
                      <div className="text-right">
                        <div className="text-sm">{extractedData.destinatario.nome}</div>
                        <div className="text-xs text-gray-500">{extractedData.destinatario.cpfCnpj}</div>
                      </div>
                    </div>
                    <div className="flex justify-between items-center py-2">
                      <span className="text-gray-400 text-sm">Valor Total</span>
                      <span className="text-2xl font-bold text-green-400">{extractedData.valorTotal}</span>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={resetCamera}
                      className="flex-1 bg-gray-700 hover:bg-gray-600 py-3 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors"
                    >
                      <RefreshCw className="w-5 h-5" />
                      Nova Leitura
                    </button>
                    <button
                      onClick={saveImage}
                      className="flex-1 bg-blue-600 hover:bg-blue-700 py-3 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors"
                    >
                      <Download className="w-5 h-5" />
                      Salvar
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Controles da câmera */}
        {hasPermission === true && !capturedImage && (
          <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/90 to-transparent">
            <div className="max-w-lg mx-auto flex items-center justify-center">
              {/* Botão de captura */}
              <button
                onClick={captureImage}
                disabled={isScanning}
                className="w-20 h-20 rounded-full border-4 border-white bg-transparent p-1 hover:scale-105 transition-transform active:scale-95"
              >
                <div className="w-full h-full rounded-full bg-white hover:bg-gray-200 transition-colors flex items-center justify-center">
                  <Camera className="w-8 h-8 text-gray-900" />
                </div>
              </button>
            </div>

            {/* Dicas */}
            <div className="text-center mt-4">
              <p className="text-sm text-gray-300">
                📸 Posicione a NF-e dentro do contorno e capture
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
