import { useState, useEffect, useRef } from 'react';
import { Camera, Scan, Eye, EyeOff, RefreshCw, Download, X, Check, FileText, DollarSign, Hash, QrCode, Truck, Package, User, Building } from 'lucide-react';

interface OCRResult {
  chaveAcesso: string;
  numero: string;
  serie: string;
  dataEmissao: string;
  cnpjEmitente: string;
  nomeEmitente: string;
  cnpjDestinatario: string;
  nomeDestinatario: string;
  valorTotal: string;
  baseIcms: string;
  valorIcms: string;
  valorPis: string;
  valorCofins: string;
  produtos: Array<{
    codigo: string;
    descricao: string;
    ncm: string;
    cst: string;
    quantidade: string;
    unidade: string;
    valorUnitario: string;
    valorTotal: string;
  }>;
}

const sampleOCRResult: OCRResult = {
  chaveAcesso: '3512.0104.4639.6000.1234.5678.9012.3456.7890.1234.5678',
  numero: '004239',
  serie: '001',
  dataEmissao: '15/03/2024 14:30:00',
  cnpjEmitente: '12.345.678/0001-90',
  nomeEmitente: 'INDÚSTRIAS ACME LTDA',
  cnpjDestinatario: '987.654.321-00',
  nomeDestinatario: 'JOÃO DA SILVA',
  valorTotal: 'R$ 1.250,00',
  baseIcms: 'R$ 950,00',
  valorIcms: 'R$ 171,00',
  valorPis: 'R$ 8,13',
  valorCofins: 'R$ 37,50',
  produtos: [
    { codigo: '001', descricao: 'PRODUTO TESTE A', ncm: '8471.30.19', cst: '000', quantidade: '10', unidade: 'UN', valorUnitario: 'R$ 95,00', valorTotal: 'R$ 950,00' },
    { codigo: '002', descricao: 'PRODUTO TESTE B', ncm: '8471.60.00', cst: '000', quantidade: '5', unidade: 'UN', valorUnitario: 'R$ 60,00', valorTotal: 'R$ 300,00' },
  ]
};

export default function NFeScannerOverlay() {
  const [showGuide, setShowGuide] = useState(true);
  const [isScanning, setIsScanning] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [ocrResult, setOcrResult] = useState<OCRResult | null>(null);
  const [flashOn] = useState(false);
  const [scanLinePos, setScanLinePos] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    startCamera();
    return () => {
      if (videoRef.current?.srcObject) {
        const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
        tracks.forEach(track => track.stop());
      }
    };
  }, []);

  useEffect(() => {
    if (isScanning) {
      const interval = setInterval(() => {
        setScanLinePos(prev => (prev + 2) % 100);
      }, 30);
      return () => clearInterval(interval);
    }
  }, [isScanning]);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } }
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.log('Camera not available:', err);
    }
  };

  const captureImage = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0);
        const imageData = canvas.toDataURL('image/jpeg', 0.8);
        setCapturedImage(imageData);
        simulateOCR();
      }
    }
  };

  const simulateOCR = () => {
    setIsScanning(true);
    setTimeout(() => {
      setOcrResult(sampleOCRResult);
      setIsScanning(false);
    }, 2500);
  };

  const reset = () => {
    setCapturedImage(null);
    setOcrResult(null);
    setIsScanning(false);
    setScanLinePos(0);
  };

  const downloadImage = () => {
    if (capturedImage) {
      const link = document.createElement('a');
      link.download = 'nfe-capturada.jpg';
      link.href = capturedImage;
      link.click();
    }
  };

  return (
    <div className="min-h-screen bg-black flex flex-col">
      {/* Header */}
      <div className="bg-black/90 backdrop-blur-sm p-3 flex justify-between items-center z-50">
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-green-400" />
          <span className="text-white font-semibold text-sm">NF-e Scanner</span>
        </div>
        <button
          onClick={() => setShowGuide(!showGuide)}
          className="flex items-center gap-2 px-3 py-1.5 bg-white/10 rounded-full text-white text-xs"
        >
          {showGuide ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
          {showGuide ? 'Ocultar Guia' : 'Mostrar Guia'}
        </button>
      </div>

      {/* Camera Area */}
      <div className="relative flex-1 overflow-hidden">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="absolute inset-0 w-full h-full object-cover"
        />

        {/* Overlay NF-e - MUITO DISCRETO */}
        {showGuide && (
          <div className="absolute inset-0 flex items-center justify-center p-4">
            <div 
              className="relative bg-white/5 backdrop-blur-[0.5px] rounded-lg shadow-2xl"
              style={{ 
                width: '100%', 
                maxWidth: '400px',
                aspectRatio: '1/1.4',
                boxShadow: '0 0 50px rgba(0,0,0,0.8), inset 0 0 30px rgba(255,255,255,0.02)'
              }}
            >
              {/* Cantos de referência - muito sutis */}
              <div className="absolute -top-2 -left-2 w-8 h-8 border-l-2 border-t-2 border-white/30 rounded-tl-lg z-10" />
              <div className="absolute -top-2 -right-2 w-8 h-8 border-r-2 border-t-2 border-white/30 rounded-tr-lg z-10" />
              <div className="absolute -bottom-2 -left-2 w-8 h-8 border-l-2 border-b-2 border-white/30 rounded-bl-lg z-10" />
              <div className="absolute -bottom-2 -right-2 w-8 h-8 border-r-2 border-b-2 border-white/30 rounded-br-lg z-10" />

              {/* Título NF-e */}
              <div className="absolute top-2 left-0 right-0 text-center">
                <span className="text-white/40 text-xs font-light tracking-widest uppercase">
                  Documento Auxiliar da NF-e
                </span>
              </div>

              {/* Campos principais - bordas muito sutis */}
              
              {/* Chave de Acesso */}
              <div 
                className="absolute top-10 left-2 right-2 h-6 border border-white/15 rounded"
                style={{ backgroundColor: 'rgba(255,255,255,0.02)' }}
              >
                <span className="absolute top-0.5 left-2 text-[6px] text-white/25 uppercase">
                  Chave de Acesso
                </span>
                <span className="absolute top-2 left-2 text-[7px] text-white/35 font-mono">
                  0000 0000 0000 0000 0000 0000 0000 0000 0000 0000 0000
                </span>
              </div>

              {/* Emitente */}
              <div 
                className="absolute top-20 left-2 right-2 h-8 border border-white/15 rounded"
                style={{ backgroundColor: 'rgba(255,255,255,0.02)' }}
              >
                <span className="absolute top-0.5 left-2 text-[6px] text-white/25 uppercase flex items-center gap-1">
                  <Building className="w-3 h-3" /> Emitente
                </span>
                <span className="absolute top-3 left-2 text-[8px] text-white/40">
                  Razão Social / CNPJ / IE
                </span>
              </div>

              {/* DANFE - Número, Série, Data */}
              <div 
                className="absolute top-[140px] left-2 right-2 h-10 border border-white/15 rounded"
                style={{ backgroundColor: 'rgba(255,255,255,0.02)' }}
              >
                <span className="absolute top-0.5 left-2 text-[6px] text-white/25 uppercase flex items-center gap-1">
                  <Hash className="w-3 h-3" /> DANFE
                </span>
                <div className="absolute top-3 left-2 right-2 flex justify-between">
                  <span className="text-[7px] text-white/35">Nº: 000000</span>
                  <span className="text-[7px] text-white/35">Série: 000</span>
                  <span className="text-[7px] text-white/35">Data: 00/00/0000</span>
                </div>
              </div>

              {/* Destinatário */}
              <div 
                className="absolute top-[210px] left-2 right-2 h-8 border border-white/15 rounded"
                style={{ backgroundColor: 'rgba(255,255,255,0.02)' }}
              >
                <span className="absolute top-0.5 left-2 text-[6px] text-white/25 uppercase flex items-center gap-1">
                  <User className="w-3 h-3" /> Destinatário
                </span>
                <span className="absolute top-3 left-2 text-[8px] text-white/40">
                  Nome / CPF ou CNPJ
                </span>
              </div>

              {/* Tabela de Produtos */}
              <div 
                className="absolute top-[270px] left-2 right-2 bottom-32 border border-white/15 rounded"
                style={{ backgroundColor: 'rgba(255,255,255,0.02)' }}
              >
                <span className="absolute top-0.5 left-2 text-[6px] text-white/25 uppercase flex items-center gap-1">
                  <Package className="w-3 h-3" /> Produtos / Serviços
                </span>
                {/* Linhas de tabela sutis */}
                {[...Array(5)].map((_, i) => (
                  <div 
                    key={i}
                    className="absolute left-2 right-2 h-4 border-b border-white/8"
                    style={{ top: `${20 + i * 18}%` }}
                  />
                ))}
              </div>

              {/* Totais */}
              <div 
                className="absolute bottom-24 left-2 right-2 h-12 border border-white/15 rounded"
                style={{ backgroundColor: 'rgba(255,255,255,0.02)' }}
              >
                <span className="absolute top-0.5 left-2 text-[6px] text-white/25 uppercase flex items-center gap-1">
                  <DollarSign className="w-3 h-3" /> Totais
                </span>
                <div className="absolute top-3 left-2 right-2 grid grid-cols-3 gap-2">
                  <span className="text-[6px] text-white/35">Base ICMS: R$ 0,00</span>
                  <span className="text-[6px] text-white/35">ICMS: R$ 0,00</span>
                  <span className="text-[6px] text-white/35">Total: R$ 0,00</span>
                </div>
              </div>

              {/* Transportadora */}
              <div 
                className="absolute bottom-12 left-2 right-2 h-6 border border-white/15 rounded"
                style={{ backgroundColor: 'rgba(255,255,255,0.02)' }}
              >
                <span className="absolute top-0.5 left-2 text-[6px] text-white/25 uppercase flex items-center gap-1">
                  <Truck className="w-3 h-3" /> Transportadora
                </span>
                <span className="absolute top-2 left-2 text-[7px] text-white/35">
                  Nome / Placa / UF
                </span>
              </div>

              {/* QR Code e Código de Barras */}
              <div className="absolute bottom-2 left-2 right-2 flex justify-between items-end">
                <div className="w-12 h-12 border border-white/15 rounded flex items-center justify-center" style={{ backgroundColor: 'rgba(255,255,255,0.02)' }}>
                  <QrCode className="w-6 h-6 text-white/20" />
                </div>
                <div className="h-6 border border-white/15 rounded flex-1 ml-2" style={{ backgroundColor: 'rgba(255,255,255,0.02)' }}>
                  <span className="text-[5px] text-white/30 block text-center mt-1">Código de Barras</span>
                </div>
              </div>

              {/* Animação de Scanning */}
              {isScanning && (
                <div 
                  className="absolute inset-0 overflow-hidden rounded-lg pointer-events-none"
                  style={{ boxShadow: 'inset 0 0 20px rgba(0,0,0,0.3)' }}
                >
                  <div 
                    className="absolute left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-green-400 to-transparent"
                    style={{ 
                      top: `${scanLinePos}%`,
                      boxShadow: '0 0 10px #4ade80, 0 0 20px #4ade80',
                      animation: 'pulse 1s infinite'
                    }}
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {/* Scanning Overlay */}
        {isScanning && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="bg-black/70 px-6 py-3 rounded-full flex items-center gap-3">
              <Scan className="w-5 h-5 text-green-400 animate-pulse" />
              <span className="text-white text-sm">Processando OCR...</span>
            </div>
          </div>
        )}

        {/* Canvas oculto para captura */}
        <canvas ref={canvasRef} className="hidden" />
      </div>

      {/* Controls */}
      <div className="bg-black/90 backdrop-blur-sm p-4">
        <div className="flex justify-center items-center gap-6">
          <button className="p-3 rounded-full bg-white/10 text-white">
            {flashOn ? <Scan className="w-5 h-5" /> : <RefreshCw className="w-5 h-5" />}
          </button>
          
          <button
            onClick={captureImage}
            disabled={isScanning}
            className="w-16 h-16 rounded-full bg-white border-4 border-gray-300 flex items-center justify-center hover:bg-gray-100 transition-colors disabled:opacity-50"
          >
            <div className="w-12 h-12 rounded-full bg-white" />
          </button>
          
          <button 
            onClick={reset}
            className="p-3 rounded-full bg-white/10 text-white"
          >
            <Camera className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Result Modal */}
      {ocrResult && (
        <div className="fixed inset-0 bg-black/95 z-50 overflow-y-auto">
          <div className="p-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-white text-lg font-bold flex items-center gap-2">
                <Check className="w-5 h-5 text-green-400" />
                OCR Concluído
              </h2>
              <button onClick={reset} className="text-white/70 hover:text-white">
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Captured Image Preview */}
            {capturedImage && (
              <div className="mb-4 rounded-lg overflow-hidden border border-white/20">
                <img src={capturedImage} alt="Captured" className="w-full h-48 object-cover" />
                <button
                  onClick={downloadImage}
                  className="w-full py-2 bg-white/10 text-white text-sm flex items-center justify-center gap-2 hover:bg-white/20"
                >
                  <Download className="w-4 h-4" /> Baixar Imagem
                </button>
              </div>
            )}

            {/* OCR Results */}
            <div className="space-y-3">
              {/* Chave de Acesso */}
              <div className="bg-gray-900/50 rounded-lg p-3 border border-green-500/30">
                <span className="text-green-400 text-xs font-medium">CHAVE DE ACESSO</span>
                <p className="text-white font-mono text-sm mt-1 break-all">{ocrResult.chaveAcesso}</p>
              </div>

              {/* Header Info */}
              <div className="grid grid-cols-3 gap-2">
                <div className="bg-gray-900/50 rounded-lg p-3 border border-white/10">
                  <span className="text-white/50 text-xs">NÚMERO</span>
                  <p className="text-white font-bold">{ocrResult.numero}</p>
                </div>
                <div className="bg-gray-900/50 rounded-lg p-3 border border-white/10">
                  <span className="text-white/50 text-xs">SÉRIE</span>
                  <p className="text-white font-bold">{ocrResult.serie}</p>
                </div>
                <div className="bg-gray-900/50 rounded-lg p-3 border border-white/10">
                  <span className="text-white/50 text-xs">DATA</span>
                  <p className="text-white font-bold">{ocrResult.dataEmissao}</p>
                </div>
              </div>

              {/* Emitente */}
              <div className="bg-gray-900/50 rounded-lg p-3 border border-white/10">
                <span className="text-blue-400 text-xs font-medium">EMITENTE</span>
                <p className="text-white font-bold text-sm mt-1">{ocrResult.nomeEmitente}</p>
                <p className="text-white/60 text-sm">CNPJ: {ocrResult.cnpjEmitente}</p>
              </div>

              {/* Destinatário */}
              <div className="bg-gray-900/50 rounded-lg p-3 border border-white/10">
                <span className="text-purple-400 text-xs font-medium">DESTINATÁRIO</span>
                <p className="text-white font-bold text-sm mt-1">{ocrResult.nomeDestinatario}</p>
                <p className="text-white/60 text-sm">CPF/CNPJ: {ocrResult.cnpjDestinatario}</p>
              </div>

              {/* Totais */}
              <div className="bg-gray-900/50 rounded-lg p-3 border border-yellow-500/30">
                <span className="text-yellow-400 text-xs font-medium">TOTAIS</span>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  <div>
                    <span className="text-white/50 text-xs">Base ICMS</span>
                    <p className="text-white">{ocrResult.baseIcms}</p>
                  </div>
                  <div>
                    <span className="text-white/50 text-xs">Valor ICMS</span>
                    <p className="text-white">{ocrResult.valorIcms}</p>
                  </div>
                  <div>
                    <span className="text-white/50 text-xs">PIS</span>
                    <p className="text-white">{ocrResult.valorPis}</p>
                  </div>
                  <div>
                    <span className="text-white/50 text-xs">COFINS</span>
                    <p className="text-white">{ocrResult.valorCofins}</p>
                  </div>
                </div>
                <div className="mt-2 pt-2 border-t border-white/10">
                  <span className="text-white/50 text-xs">VALOR TOTAL</span>
                  <p className="text-green-400 font-bold text-lg">{ocrResult.valorTotal}</p>
                </div>
              </div>

              {/* Produtos */}
              <div className="bg-gray-900/50 rounded-lg p-3 border border-white/10">
                <span className="text-orange-400 text-xs font-medium">PRODUTOS ({ocrResult.produtos.length})</span>
                <div className="mt-2 space-y-2">
                  {ocrResult.produtos.map((produto, index) => (
                    <div key={index} className="bg-black/30 rounded p-2">
                      <p className="text-white text-sm font-medium">{produto.descricao}</p>
                      <div className="flex justify-between mt-1 text-xs text-white/60">
                        <span>Cód: {produto.codigo} | NCM: {produto.ncm}</span>
                        <span>{produto.quantidade} {produto.unidade} x {produto.valorUnitario}</span>
                      </div>
                      <p className="text-green-400 text-sm font-bold text-right mt-1">{produto.valorTotal}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="mt-4 flex gap-2">
              <button
                onClick={reset}
                className="flex-1 py-3 bg-green-600 text-white rounded-lg font-medium flex items-center justify-center gap-2"
              >
                <RefreshCw className="w-5 h-5" />
                Nova Leitura
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
