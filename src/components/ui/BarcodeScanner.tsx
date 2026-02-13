import { useEffect, useRef, useState, useCallback } from 'react';
import { X, ScanBarcode, Loader2, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface BarcodeScannerProps {
  onScanSuccess: (decodedText: string) => void;
  onClose: () => void;
}

// Verifica se a BarcodeDetector API nativa está disponível
const hasBarcodeDetector = typeof window !== 'undefined' && 'BarcodeDetector' in window;

export const BarcodeScanner = ({ onScanSuccess, onClose }: BarcodeScannerProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const detectorRef = useRef<any>(null);
  const animationRef = useRef<number>(0);
  const html5ScannerRef = useRef<any>(null);

  const [cameraReady, setCameraReady] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scanMode, setScanMode] = useState<'native' | 'fallback' | null>(null);
  const processingRef = useRef(false);

  // ========== FEEDBACK TÁTIL + SONORO ==========
  const playFeedback = useCallback(() => {
    // Vibração
    if ('vibrate' in navigator) {
      navigator.vibrate([100, 50, 100]);
    }
    // Beep
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 880;
      osc.type = 'sine';
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.15);
    } catch (_) {}
  }, []);

  // ========== RESULTADO DETECTADO ==========
  const handleDetection = useCallback((rawValue: string) => {
    if (processingRef.current) return;
    processingRef.current = true;
    setProcessing(true);

    console.log('[📱 Scanner] Código detectado:', rawValue);
    playFeedback();

    // Delay para feedback visual
    setTimeout(() => {
      cleanup();
      onScanSuccess(rawValue);
    }, 500);
  }, [onScanSuccess, playFeedback]);

  // ========== CLEANUP ==========
  const cleanup = useCallback(() => {
    // Cancela animação
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = 0;
    }
    // Para stream de vídeo
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    // Para html5-qrcode fallback
    if (html5ScannerRef.current) {
      try {
        if (html5ScannerRef.current.isScanning) {
          html5ScannerRef.current.stop().then(() => {
            html5ScannerRef.current?.clear();
          }).catch(() => {});
        }
      } catch (_) {}
      html5ScannerRef.current = null;
    }
  }, []);

  // ========== MODO NATIVO — BarcodeDetector API ==========
  const startNativeScanner = useCallback(async () => {
    try {
      console.log('[Scanner] Usando BarcodeDetector API nativa 🚀');
      setScanMode('native');

      // Formatos suportados pelo BarcodeDetector
      const supportedFormats = await (window as any).BarcodeDetector.getSupportedFormats();
      console.log('[Scanner] Formatos nativos suportados:', supportedFormats);

      // Cria detector com todos os formatos disponíveis para boletos + NF-e
      const wantedFormats = ['itf', 'code_128', 'code_39', 'codabar', 'ean_13', 'ean_8', 'qr_code', 'code_93', 'data_matrix'];
      const formats = wantedFormats.filter(f => supportedFormats.includes(f));

      if (formats.length === 0) {
        throw new Error('Nenhum formato de código de barras suportado');
      }

      detectorRef.current = new (window as any).BarcodeDetector({ formats });

      // Inicia câmera com alta resolução
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1920, min: 1280 },
          height: { ideal: 1080, min: 720 },
        },
        audio: false,
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setCameraReady(true);

        // Loop de detecção
        const detectLoop = async () => {
          if (!videoRef.current || processingRef.current || !detectorRef.current) return;

          try {
            const barcodes = await detectorRef.current.detect(videoRef.current);
            if (barcodes.length > 0) {
              const code = barcodes[0];
              console.log('[Scanner Nativo] Detectou:', code.format, code.rawValue);
              handleDetection(code.rawValue);
              return; // Para o loop
            }
          } catch (err) {
            // Erros de frame — normais, ignora
          }

          animationRef.current = requestAnimationFrame(detectLoop);
        };

        // Começa a detectar
        animationRef.current = requestAnimationFrame(detectLoop);
      }
    } catch (err) {
      console.error('[Scanner Nativo] Erro:', err);
      // Fallback para html5-qrcode
      console.log('[Scanner] Tentando fallback html5-qrcode...');
      startFallbackScanner();
    }
  }, [handleDetection]);

  // ========== MODO FALLBACK — html5-qrcode ==========
  const startFallbackScanner = useCallback(async () => {
    try {
      console.log('[Scanner] Usando html5-qrcode como fallback 📦');
      setScanMode('fallback');

      const { Html5Qrcode, Html5QrcodeSupportedFormats } = await import('html5-qrcode');

      const html5QrCode = new Html5Qrcode("reader-fallback", {
        verbose: false,
        formatsToSupport: [
          Html5QrcodeSupportedFormats.ITF,
          Html5QrcodeSupportedFormats.CODE_128,
          Html5QrcodeSupportedFormats.CODE_39,
          Html5QrcodeSupportedFormats.CODABAR,
          Html5QrcodeSupportedFormats.EAN_13,
          Html5QrcodeSupportedFormats.EAN_8,
          Html5QrcodeSupportedFormats.CODE_93,
          Html5QrcodeSupportedFormats.QR_CODE,
        ]
      });
      html5ScannerRef.current = html5QrCode;

      await html5QrCode.start(
        { facingMode: "environment" },
        {
          fps: 15,
          qrbox: (viewfinderWidth: number) => {
            const width = Math.floor(viewfinderWidth * 0.95);
            const height = Math.floor(width * 0.4);
            return { width, height };
          },
          aspectRatio: 16/9,
          disableFlip: false,
          videoConstraints: {
            height: { ideal: 1080, min: 720 },
            width: { ideal: 1920, min: 1280 },
            facingMode: "environment"
          },
        },
        (decodedText: string) => {
          handleDetection(decodedText);
        },
        () => {}
      );

      setCameraReady(true);
    } catch (err) {
      console.error("[Scanner Fallback] Erro:", err);
      setError("Não foi possível acessar a câmera. Verifique as permissões.");
    }
  }, [handleDetection]);

  // ========== INICIALIZAÇÃO ==========
  useEffect(() => {
    if (hasBarcodeDetector) {
      startNativeScanner();
    } else {
      startFallbackScanner();
    }

    return () => { cleanup(); };
  }, []);

  const handleClose = () => {
    cleanup();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[1500] bg-black/90 flex flex-col items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white w-full max-w-sm rounded-[2.5rem] overflow-hidden shadow-2xl flex flex-col relative">

        {/* Header */}
        <div className="p-4 border-b flex justify-between items-center bg-gradient-to-r from-indigo-50 via-purple-50 to-blue-50">
          <h3 className="font-bold text-gray-800 text-sm flex items-center gap-2">
            <ScanBarcode className="w-5 h-5 text-indigo-600" />
            Scanner de Código de Barras
          </h3>
          <div className="flex items-center gap-2">
            {scanMode && (
              <span className={`text-[8px] font-bold px-2 py-0.5 rounded-full ${
                scanMode === 'native' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
              }`}>
                {scanMode === 'native' ? '⚡ NATIVO' : '📦 COMPAT'}
              </span>
            )}
            <button onClick={handleClose} className="p-1.5 hover:bg-white/60 rounded-full transition-colors" disabled={processing}>
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>

        {/* Viewport da Câmera */}
        <div className="relative bg-black flex items-center justify-center overflow-hidden h-[420px]">
          {/* Modo Nativo — vídeo direto */}
          {scanMode === 'native' && (
            <video
              ref={videoRef}
              className="w-full h-full object-cover"
              playsInline
              muted
              autoPlay
            />
          )}

          {/* Modo Fallback — container html5-qrcode */}
          {scanMode === 'fallback' && (
            <div id="reader-fallback" className="w-full h-full"></div>
          )}

          {/* Canvas oculto para processamento */}
          <canvas ref={canvasRef} className="hidden" />

          {/* Loading */}
          {!cameraReady && !error && (
            <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center gap-4">
              <Loader2 className="w-10 h-10 text-indigo-400 animate-spin" />
              <p className="text-white text-sm font-medium">Iniciando câmera...</p>
              <p className="text-gray-400 text-xs">
                {hasBarcodeDetector ? 'Modo nativo (melhor detecção)' : 'Modo compatibilidade'}
              </p>
            </div>
          )}

          {/* Processing — Código detectado */}
          {processing && (
            <div className="absolute inset-0 bg-gradient-to-b from-green-500/40 to-green-600/40 flex flex-col items-center justify-center gap-4 backdrop-blur-sm">
              <div className="bg-white rounded-full p-5 shadow-2xl animate-bounce">
                <CheckCircle2 className="w-14 h-14 text-green-600" />
              </div>
              <div className="bg-black/60 backdrop-blur-md px-6 py-3 rounded-full">
                <p className="text-white font-bold text-lg">Código detectado! ✅</p>
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="absolute inset-0 bg-red-500/20 flex flex-col items-center justify-center gap-4 backdrop-blur-sm">
              <div className="bg-white rounded-full p-5 shadow-2xl">
                <AlertCircle className="w-14 h-14 text-red-600" />
              </div>
              <div className="bg-black/60 backdrop-blur-md px-6 py-3 rounded-2xl max-w-[85%]">
                <p className="text-white font-semibold text-center">{error}</p>
              </div>
            </div>
          )}

          {/* Visual Guide — Spotlight verde (apenas modo nativo) */}
          {cameraReady && !processing && !error && scanMode === 'native' && (
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              <div
                className="absolute inset-0 bg-black/40"
                style={{
                  clipPath: 'polygon(0% 0%, 0% 100%, 100% 100%, 100% 0%, 0% 0%, 2% 28%, 98% 28%, 98% 68%, 2% 68%, 2% 28%)'
                }}
              ></div>

              <div className="w-[96%] h-[40%] border-2 border-green-400 rounded-xl relative shadow-[0_0_30px_rgba(34,197,94,0.5)] bg-green-400/5">
                <div className="absolute -top-1.5 -left-1.5 w-8 h-8 border-t-4 border-l-4 border-green-400 rounded-tl-xl"></div>
                <div className="absolute -top-1.5 -right-1.5 w-8 h-8 border-t-4 border-r-4 border-green-400 rounded-tr-xl"></div>
                <div className="absolute -bottom-1.5 -left-1.5 w-8 h-8 border-b-4 border-l-4 border-green-400 rounded-bl-xl"></div>
                <div className="absolute -bottom-1.5 -right-1.5 w-8 h-8 border-b-4 border-r-4 border-green-400 rounded-br-xl"></div>

                {/* Linha de scan animada */}
                <div className="absolute top-1/2 left-2 right-2 h-0.5 bg-gradient-to-r from-transparent via-green-400 to-transparent animate-pulse shadow-[0_0_15px_rgba(34,197,94,0.8)]"></div>

                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                  <ScanBarcode className="w-7 h-7 text-green-400/50" />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-white flex flex-col gap-3">
          <div className={`border rounded-xl p-3 transition-all ${
            processing ? 'bg-green-50 border-green-200'
              : error ? 'bg-red-50 border-red-200'
              : !cameraReady ? 'bg-gray-50 border-gray-200'
              : 'bg-blue-50 border-blue-200'
          }`}>
            <p className="text-xs text-center font-medium leading-relaxed">
              {processing ? (
                <span className="text-green-800">✅ <strong>Código detectado! Processando...</strong></span>
              ) : error ? (
                <span className="text-red-800">❌ {error}</span>
              ) : !cameraReady ? (
                <span className="text-gray-700">📷 <strong>Preparando câmera...</strong></span>
              ) : (
                <span className="text-blue-800">
                  <strong>📱 Posicione o código de barras na área verde</strong>
                  <br />
                  <span className="text-[11px]">
                    Funciona com <strong>Boletos</strong>, <strong>DANFE</strong> e <strong>QR Code</strong>
                  </span>
                </span>
              )}
            </p>
          </div>

          <button
            onClick={handleClose}
            disabled={processing}
            className="w-full bg-gradient-to-r from-gray-100 to-gray-200 text-gray-700 font-bold py-3.5 rounded-2xl hover:from-gray-200 hover:to-gray-300 transition-all shadow-sm disabled:opacity-50"
          >
            {processing ? 'Aguarde...' : 'Cancelar'}
          </button>
        </div>
      </div>
    </div>
  );
};
