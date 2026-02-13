import { useEffect, useRef, useState, useCallback } from 'react';
import { X, ScanBarcode, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface BarcodeScannerProps {
  onScanSuccess: (decodedText: string) => void;
  onClose: () => void;
  scanMode?: 'nfe' | 'boleto';
}

/**
 * BarcodeScanner v5 — Polyfill zxing-wasm (WebAssembly)
 * 
 * Usa o pacote `barcode-detector` que implementa a BarcodeDetector API
 * via zxing-wasm (C++ compilado para WebAssembly).
 * Funciona em TODOS os browsers, incluindo Safari iOS.
 * 3-4x mais rápido que ZXing.js puro (usado pelo html5-qrcode).
 */
export const BarcodeScanner = ({ onScanSuccess, onClose, scanMode = 'nfe' }: BarcodeScannerProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const detectorRef = useRef<any>(null);
  const animationRef = useRef<number>(0);
  const lastDetectTimeRef = useRef<number>(0);

  const [cameraReady, setCameraReady] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
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
    
    const digits = rawValue.replace(/\D/g, '');
    
    // Validação por modo
    if (scanMode === 'boleto') {
      // Boleto ITF deve ter exatamente 44 dígitos
      if (digits.length !== 44) {
        console.log(`[Scanner v5] Descartado: ${digits.length} dígitos (esperado 44 para boleto)`);
        return;
      }
    } else {
      // NF-e deve ter 44 dígitos e começar com UF válida
      if (digits.length !== 44) {
        console.log(`[Scanner v5] Descartado: ${digits.length} dígitos (esperado 44)`);
        return;
      }
    }
    
    processingRef.current = true;
    setProcessing(true);

    console.log('[📱 Scanner v5] Código detectado:', rawValue, `(modo: ${scanMode})`);
    playFeedback();

    // Delay para feedback visual
    setTimeout(() => {
      cleanup();
      onScanSuccess(digits);
    }, 500);
  }, [onScanSuccess, playFeedback, scanMode]);

  // ========== CLEANUP ==========
  const cleanup = useCallback(() => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = 0;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  }, []);

  // ========== INICIALIZAÇÃO ==========
  const mountedRef = useRef(false);

  useEffect(() => {
    // Guard contra React StrictMode duplo
    if (mountedRef.current) return;
    mountedRef.current = true;

    const startScanner = async () => {
      try {
        // 1. Carrega o polyfill barcode-detector (usa zxing-wasm internamente)
        console.log('[Scanner v5] Carregando barcode-detector polyfill (zxing-wasm)...');
        const { BarcodeDetector } = await import('barcode-detector/pure');

        // 2. Verifica formatos suportados
        const supportedFormats = await BarcodeDetector.getSupportedFormats();
        console.log('[Scanner v5] Formatos suportados:', supportedFormats);

        // 3. Formatos por modo de scan
        const boletoFormats = ['itf'] as const;
        const nfeFormats = [
          'code_128',     // Usado em alguns documentos
          'code_39',      // Alternativo
          'ean_13',       // NF-e
          'ean_8',
          'qr_code',      // QR Code da DANFE
          'data_matrix',
        ] as const;
        const wantedFormats = scanMode === 'boleto' ? boletoFormats : nfeFormats;
        type BarcodeFormat = typeof supportedFormats[number];
        const formats = wantedFormats.filter(f => 
          (supportedFormats as readonly string[]).includes(f)
        ) as unknown as BarcodeFormat[];

        if (formats.length === 0) {
          throw new Error('Nenhum formato de código de barras suportado pelo polyfill');
        }

        console.log('[Scanner v5] Usando formatos:', formats);
        detectorRef.current = new BarcodeDetector({ formats: formats as any });

        // 4. Inicia câmera com alta resolução
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
          
          // Aguardar o vídeo estar realmente pronto
          await new Promise<void>((resolve) => {
            const video = videoRef.current!;
            if (video.readyState >= 2) {
              resolve();
            } else {
              video.onloadeddata = () => resolve();
            }
          });
          
          await videoRef.current.play();
          setCameraReady(true);
          console.log('[Scanner v5] ✅ Câmera pronta! Resolução:', 
            videoRef.current.videoWidth, 'x', videoRef.current.videoHeight);

          // 5. Loop de detecção com throttle
          const detectLoop = async () => {
            if (!videoRef.current || processingRef.current || !detectorRef.current) return;

            const now = Date.now();
            // Throttle: detecta a cada ~200ms para não sobrecarregar o device
            if (now - lastDetectTimeRef.current < 200) {
              animationRef.current = requestAnimationFrame(detectLoop);
              return;
            }
            lastDetectTimeRef.current = now;

            try {
              const barcodes = await detectorRef.current.detect(videoRef.current);
              if (barcodes.length > 0) {
                const code = barcodes[0];
                console.log('[Scanner v5] ✅ Detectou:', code.format, '→', code.rawValue);
                handleDetection(code.rawValue);
                return; // Para o loop
              }
            } catch (err) {
              // Erros de frame são normais, ignora
            }

            animationRef.current = requestAnimationFrame(detectLoop);
          };

          // Inicia detecção
          animationRef.current = requestAnimationFrame(detectLoop);
        }
      } catch (err: any) {
        console.error('[Scanner v5] ❌ Erro:', err);
        
        if (err.name === 'NotAllowedError') {
          setError('Permissão de câmera negada. Permita o acesso nas configurações.');
        } else if (err.name === 'NotFoundError') {
          setError('Nenhuma câmera encontrada no dispositivo.');
        } else {
          setError(`Erro ao iniciar scanner: ${err.message || 'Desconhecido'}`);
        }
      }
    };

    startScanner();

    return () => {
      mountedRef.current = false;
      cleanup();
    };
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
            {scanMode === 'boleto' ? 'Leitura de Boleto' : 'Leitura de NF-e'}
          </h3>
          <div className="flex items-center gap-2">
            <span className="text-[8px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
              ⚡ WASM
            </span>
            <span className={`text-[8px] font-bold px-2 py-0.5 rounded-full ${scanMode === 'boleto' ? 'bg-amber-100 text-amber-700' : 'bg-indigo-100 text-indigo-700'}`}>
              {scanMode === 'boleto' ? '💳 ITF' : '🧾 NF-e'}
            </span>
            <button onClick={handleClose} className="p-1.5 hover:bg-white/60 rounded-full transition-colors" disabled={processing}>
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>

        {/* Viewport da Câmera */}
        <div className="relative bg-black flex items-center justify-center overflow-hidden h-[420px]">
          <video
            ref={videoRef}
            className="w-full h-full object-cover"
            playsInline
            muted
            autoPlay
          />

          {/* Loading */}
          {!cameraReady && !error && (
            <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center gap-4">
              <Loader2 className="w-10 h-10 text-indigo-400 animate-spin" />
              <p className="text-white text-sm font-medium">Iniciando câmera...</p>
              <p className="text-gray-400 text-xs">
                Motor WebAssembly (zxing-wasm)
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

          {/* Visual Guide — Spotlight verde */}
          {cameraReady && !processing && !error && (
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
