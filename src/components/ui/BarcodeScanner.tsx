import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { X, Camera } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface BarcodeScannerProps {
  onScanSuccess: (decodedText: string) => void;
  onClose: () => void;
}

export const BarcodeScanner = ({ onScanSuccess, onClose }: BarcodeScannerProps) => {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [isScanning, setIsScanning] = useState(true);

  useEffect(() => {
    // Inicializar o scanner
    const startScanner = async () => {
        try {
            const html5QrCode = new Html5Qrcode("reader-custom", {
                verbose: false,
                formatsToSupport: [
                    Html5QrcodeSupportedFormats.CODE_128,
                    Html5QrcodeSupportedFormats.EAN_13,
                    Html5QrcodeSupportedFormats.CODE_39,
                    Html5QrcodeSupportedFormats.ITF,
                    Html5QrcodeSupportedFormats.QR_CODE
                ]
            });
            scannerRef.current = html5QrCode;

            await html5QrCode.start(
                { 
                    facingMode: "environment" 
                },
                {
                    fps: 10, // Reduzido levemente para dar mais tempo de processamento por frame
                    qrbox: (viewfinderWidth, viewfinderHeight) => {
                        // Aumentei a área de leitura para garantir que pegue o código inteiro mesmo se tremer
                        const width = Math.floor(viewfinderWidth * 0.90);
                        const height = Math.floor(width * 0.50); 
                        return { width, height };
                    },
                    aspectRatio: undefined, 
                    disableFlip: false,
                    videoConstraints: {
                        height: { min: 720 }, // Força resolução HD
                        width: { min: 1280 },
                        facingMode: "environment"
                    }
                },
                (decodedText) => {
                    onScanSuccess(decodedText);
                    stopScanner();
                },
                (errorMessage) => {
                    // Ignora
                }
            );
        } catch (err) {
            console.error("Erro ao iniciar câmera", err);
            toast.error("Não foi possível acessar a câmera.");
            setIsScanning(false);
        }
    };

    if (isScanning) {
        startScanner();
    }

    // Cleanup
    return () => {
        stopScanner();
    };
  }, []);

  const stopScanner = async () => {
      if (scannerRef.current && scannerRef.current.isScanning) {
          try {
              await scannerRef.current.stop();
              scannerRef.current.clear();
          } catch (err) {
              console.error("Erro ao parar", err);
          }
      }
  };

  return (
    <div className="fixed inset-0 z-[1500] bg-black/80 flex flex-col items-center justify-center p-4 backdrop-blur-sm">
        <div className="bg-white w-full max-w-sm rounded-[2.5rem] overflow-hidden shadow-2xl flex flex-col relative">
            
            {/* Header */}
            <div className="p-5 border-b flex justify-between items-center bg-gray-50/50">
                <h3 className="font-bold text-gray-800 text-sm flex items-center gap-2">
                    <Camera className="w-5 h-5 text-indigo-600"/> 
                    Leitor de Código
                </h3>
                <button onClick={onClose} className="p-1 hover:bg-gray-200 rounded-full transition-colors">
                    <X className="w-5 h-5 text-gray-400" />
                </button>
            </div>

            {/* Viewport da Câmera */}
            <div className="relative bg-black flex items-center justify-center overflow-hidden h-[350px]">
                <div id="reader-custom" className="w-full h-full object-cover"></div>
                
                {/* Visual Guide (Static) */}
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                    <div className="w-[85%] h-[35%] border-2 border-white/70 rounded-lg shadow-[0_0_0_9999px_rgba(0,0,0,0.5)] relative">
                         <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-red-500/80 animate-pulse"></div>
                    </div>
                </div>
            </div>
            
            {/* Footer */}
            <div className="p-5 bg-white flex flex-col gap-3">
                <p className="text-center text-xs text-gray-400 font-medium uppercase tracking-wider">
                    Centralize o código de barras
                </p>
                <button 
                    onClick={onClose} 
                    className="w-full bg-gray-100 text-gray-600 font-bold py-3 rounded-2xl hover:bg-gray-200 transition-colors"
                >
                    Cancelar
                </button>
            </div>
        </div>
    </div>
  );
};
