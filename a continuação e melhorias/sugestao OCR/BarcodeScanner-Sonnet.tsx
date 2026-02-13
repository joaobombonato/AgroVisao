import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { X, Camera, AlertCircle, CheckCircle2, Loader2, ScanBarcode } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { processBarcode, type ParsedBarcode } from '../../services/barcodeIntelligence';

interface BarcodeScannerProps {
  onScanSuccess: (data: ParsedBarcode, rawCode: string) => void;
  onClose: () => void;
}

export const BarcodeScanner = ({ onScanSuccess, onClose }: BarcodeScannerProps) => {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [isScanning, setIsScanning] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [lastScanned, setLastScanned] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const processingRef = useRef(false);

  useEffect(() => {
    // Inicializar o scanner
    const startScanner = async () => {
      try {
        const html5QrCode = new Html5Qrcode("reader-barcode-pro", {
          verbose: false,
          formatsToSupport: [
            // Formatos para BOLETOS (ordem de prioridade)
            Html5QrcodeSupportedFormats.ITF,      // Interleaved 2 of 5 - PRINCIPAL para boletos
            Html5QrcodeSupportedFormats.CODE_128, // Código 128 - usado em alguns boletos
            Html5QrcodeSupportedFormats.CODE_39,  // Código 39 - alternativo
            
            // Formatos para DANFE/NFe
            Html5QrcodeSupportedFormats.EAN_13,
            Html5QrcodeSupportedFormats.EAN_8,
            
            // Outros úteis
            Html5QrcodeSupportedFormats.QR_CODE,
            Html5QrcodeSupportedFormats.CODE_93,
            Html5QrcodeSupportedFormats.CODABAR,
          ]
        });
        scannerRef.current = html5QrCode;

        await html5QrCode.start(
          { facingMode: "environment" },
          {
            fps: 10, // 10 frames por segundo
            qrbox: (viewfinderWidth, viewfinderHeight) => {
              // Área MAIOR e retangular para códigos de barras horizontais
              const width = Math.floor(viewfinderWidth * 0.96);
              const height = Math.floor(width * 0.35); // Mais largo que alto
              return { width, height };
            },
            aspectRatio: 16/9, // Aspecto widescreen
            disableFlip: false,
            videoConstraints: {
              // Força ALTA resolução para melhor leitura
              height: { ideal: 1080, min: 720 },
              width: { ideal: 1920, min: 1280 },
              facingMode: "environment"
            },
            // Recursos experimentais para melhor detecção
            experimentalFeatures: {
              useBarCodeDetectorIfSupported: true
            }
          },
          async (decodedText, decodedResult) => {
            // IMPORTANTE: Evita processar o mesmo código múltiplas vezes
            if (processingRef.current || decodedText === lastScanned) {
              return;
            }

            console.log('[📱 Scanner] Código detectado:', decodedText);
            processingRef.current = true;
            setProcessing(true);
            setLastScanned(decodedText);

            // 🎯 FEEDBACK TÁTIL (vibração)
            if ('vibrate' in navigator) {
              navigator.vibrate([100, 50, 100]); // Padrão: curto, pausa, curto
            }

            // 🔊 FEEDBACK SONORO (beep)
            playBeepSound();

            try {
              // 🧠 Processa o código usando a inteligência existente
              const parsedData = await processBarcode(decodedText);
              
              console.log('[✅ Scanner] Dados processados:', parsedData);
              
              // Pequeno delay para dar tempo do feedback visual
              await new Promise(resolve => setTimeout(resolve, 400));
              
              // Para o scanner ANTES de chamar o callback
              await stopScanner();
              
              // 🎉 Chama o callback com os dados JÁ PROCESSADOS
              onScanSuccess(parsedData, decodedText);
              
              // Toast de sucesso
              if (parsedData.type === 'nfe') {
                toast.success('📄 DANFE detectada!', { duration: 2000 });
              } else if (parsedData.type === 'boleto_bancario' || parsedData.type === 'boleto_convenio') {
                toast.success('💰 Boleto detectado!', { duration: 2000 });
              } else {
                toast.success('✅ Código escaneado!', { duration: 2000 });
              }
              
            } catch (err) {
              console.error('[❌ Scanner] Erro ao processar:', err);
              setError('Código não reconhecido');
              toast.error('Código de barras inválido ou não suportado');
              
              // Permite tentar novamente após 2 segundos
              setTimeout(() => {
                processingRef.current = false;
                setProcessing(false);
                setLastScanned(null);
                setError(null);
              }, 2000);
            }
          },
          (errorMessage) => {
            // Ignora erros de leitura contínua (são normais durante o scan)
          }
        );
        
        setCameraReady(true);
        console.log('[✅ Scanner] Câmera iniciada com sucesso');
        
      } catch (err) {
        console.error("[❌ Scanner] Erro ao iniciar câmera:", err);
        setError("Não foi possível acessar a câmera");
        toast.error("Verifique as permissões de câmera no navegador");
        setIsScanning(false);
      }
    };

    if (isScanning) {
      startScanner();
    }

    // Cleanup ao desmontar
    return () => {
      stopScanner();
    };
  }, []);

  const stopScanner = async () => {
    if (scannerRef.current && scannerRef.current.isScanning) {
      try {
        await scannerRef.current.stop();
        scannerRef.current.clear();
        console.log('[🛑 Scanner] Scanner parado');
      } catch (err) {
        console.error("[❌ Scanner] Erro ao parar:", err);
      }
    }
  };

  const playBeepSound = () => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.value = 800; // Frequência do beep
      oscillator.type = 'sine';
      
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.15);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.15);
    } catch (err) {
      console.warn('[Scanner] Não foi possível reproduzir som:', err);
    }
  };

  const handleClose = async () => {
    await stopScanner();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[1500] bg-black/90 flex flex-col items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white w-full max-w-sm rounded-[2.5rem] overflow-hidden shadow-2xl flex flex-col relative">
        
        {/* Header */}
        <div className="p-5 border-b flex justify-between items-center bg-gradient-to-r from-indigo-50 via-purple-50 to-blue-50">
          <h3 className="font-bold text-gray-800 text-sm flex items-center gap-2">
            <ScanBarcode className="w-5 h-5 text-indigo-600" /> 
            Scanner de Código de Barras
          </h3>
          <button 
            onClick={handleClose} 
            className="p-1.5 hover:bg-white/60 rounded-full transition-colors"
            disabled={processing}
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Viewport da Câmera */}
        <div className="relative bg-black flex items-center justify-center overflow-hidden h-[420px]">
          <div id="reader-barcode-pro" className="w-full h-full object-cover"></div>
          
          {/* Loading Overlay - Câmera iniciando */}
          {!cameraReady && !error && (
            <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center gap-4">
              <Loader2 className="w-10 h-10 text-indigo-400 animate-spin" />
              <p className="text-white text-sm font-medium">Iniciando câmera...</p>
              <p className="text-gray-400 text-xs">Aguarde alguns segundos</p>
            </div>
          )}

          {/* Processing Overlay - Código detectado */}
          {processing && (
            <div className="absolute inset-0 bg-gradient-to-b from-green-500/30 to-green-600/30 flex flex-col items-center justify-center gap-4 backdrop-blur-sm animate-pulse">
              <div className="bg-white rounded-full p-5 shadow-2xl">
                <CheckCircle2 className="w-14 h-14 text-green-600" />
              </div>
              <div className="bg-black/60 backdrop-blur-md px-6 py-3 rounded-full">
                <p className="text-white font-bold text-lg">Processando...</p>
              </div>
            </div>
          )}

          {/* Error Overlay */}
          {error && (
            <div className="absolute inset-0 bg-red-500/20 flex flex-col items-center justify-center gap-4 backdrop-blur-sm">
              <div className="bg-white rounded-full p-5 shadow-2xl">
                <AlertCircle className="w-14 h-14 text-red-600" />
              </div>
              <div className="bg-black/60 backdrop-blur-md px-6 py-3 rounded-2xl max-w-[85%]">
                <p className="text-white font-semibold text-center leading-relaxed">
                  {error}
                </p>
              </div>
            </div>
          )}
          
          {/* Visual Guide - Área de Scan */}
          {cameraReady && !processing && !error && (
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              {/* Overlay escuro ao redor (efeito spotlight) */}
              <div 
                className="absolute inset-0 bg-black/50" 
                style={{
                  clipPath: 'polygon(0% 0%, 0% 100%, 100% 100%, 100% 0%, 0% 0%, 2% 30%, 98% 30%, 98% 65%, 2% 65%, 2% 30%)'
                }}
              ></div>
              
              {/* Box de scan - área iluminada */}
              <div className="w-[96%] h-[35%] border-2 border-green-400 rounded-xl relative shadow-[0_0_25px_rgba(34,197,94,0.6)] bg-green-400/5">
                {/* Cantos decorativos animados */}
                <div className="absolute -top-1.5 -left-1.5 w-7 h-7 border-t-4 border-l-4 border-green-400 rounded-tl-xl animate-pulse"></div>
                <div className="absolute -top-1.5 -right-1.5 w-7 h-7 border-t-4 border-r-4 border-green-400 rounded-tr-xl animate-pulse"></div>
                <div className="absolute -bottom-1.5 -left-1.5 w-7 h-7 border-b-4 border-l-4 border-green-400 rounded-bl-xl animate-pulse"></div>
                <div className="absolute -bottom-1.5 -right-1.5 w-7 h-7 border-b-4 border-r-4 border-green-400 rounded-br-xl animate-pulse"></div>
                
                {/* Linha de scan animada - horizontal */}
                <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-green-400 to-transparent shadow-[0_0_12px_rgba(34,197,94,0.9)] animate-pulse"></div>
                
                {/* Mini ícone no centro */}
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                  <ScanBarcode className="w-6 h-6 text-green-400/60" />
                </div>
              </div>
            </div>
          )}
        </div>
        
        {/* Footer com Instruções */}
        <div className="p-5 bg-white flex flex-col gap-3">
          {/* Status/Dicas */}
          <div className={`border rounded-xl p-3.5 transition-all ${
            processing 
              ? 'bg-green-50 border-green-200' 
              : error 
                ? 'bg-red-50 border-red-200' 
                : !cameraReady 
                  ? 'bg-gray-50 border-gray-200' 
                  : 'bg-blue-50 border-blue-200'
          }`}>
            <p className="text-xs text-center font-medium leading-relaxed">
              {processing ? (
                <span className="text-green-800">
                  🔄 <strong>Processando código...</strong>
                  <br />Aguarde um momento
                </span>
              ) : error ? (
                <span className="text-red-800">
                  ❌ {error}
                  <br />Tente novamente
                </span>
              ) : !cameraReady ? (
                <span className="text-gray-700">
                  📷 <strong>Preparando câmera...</strong>
                  <br />Aguarde
                </span>
              ) : (
                <span className="text-blue-800">
                  <strong className="text-sm">📱 Posicione o código de barras</strong>
                  <br />
                  <span className="text-[11px]">
                    na área verde destacada.
                    <br />
                    Funciona com <strong>Boletos</strong> e <strong>Notas Fiscais (DANFE)</strong>
                  </span>
                </span>
              )}
            </p>
          </div>
          
          {/* Botão Cancelar */}
          <button 
            onClick={handleClose} 
            disabled={processing}
            className="w-full bg-gradient-to-r from-gray-100 to-gray-200 text-gray-700 font-bold py-4 rounded-2xl hover:from-gray-200 hover:to-gray-300 transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {processing ? 'Aguarde...' : 'Cancelar'}
          </button>
        </div>
      </div>
    </div>
  );
};
