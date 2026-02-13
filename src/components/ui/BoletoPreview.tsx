/**
 * BoletoPreview.tsx — Preview Visual de Boleto Bancário
 * 
 * Monta um preview profissional do boleto com SVG do código de barras.
 * Layout inspirado em recibo bancário com dados extraídos.
 */
import { forwardRef, useEffect, useRef } from 'react';
import { CreditCard, Calendar, Building2, DollarSign } from 'lucide-react';
import type { BoletoData } from '../../services/barcodeIntelligence';

interface BoletoPreviewProps {
  data: BoletoData;
}

export const BoletoPreview = forwardRef<HTMLDivElement, BoletoPreviewProps>(({ data }, ref) => {
  const barcodeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Renderiza o código de barras SVG via boleto.js
    const renderBarcode = async () => {
      if (!barcodeRef.current) return;
      try {
        const BoletoModule = await import('boleto.js');
        const Boleto = BoletoModule.default || BoletoModule;
        const boleto = new Boleto(data.codigoOriginal);
        barcodeRef.current.innerHTML = '';
        boleto.toSVG('#boleto-barcode-svg');
      } catch (err) {
        console.warn('[BoletoPreview] SVG barcode fallback:', err);
        if (barcodeRef.current) {
          barcodeRef.current.innerHTML = `
            <div class="bg-gray-100 p-2 rounded text-center">
              <p class="text-[10px] text-gray-500 font-mono break-all">${data.codigoOriginal}</p>
            </div>
          `;
        }
      }
    };
    renderBarcode();
  }, [data.codigoOriginal]);

  return (
    <div
      ref={ref}
      className="bg-white border-2 border-gray-700 rounded-lg overflow-hidden max-w-sm mx-auto shadow-lg"
      style={{ fontFamily: "'Inter', 'Segoe UI', sans-serif" }}
    >
      {/* Cabeçalho */}
      <div className="bg-gradient-to-r from-emerald-700 to-emerald-800 text-white p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CreditCard className="w-5 h-5" />
            <span className="font-bold text-sm tracking-wider">BOLETO BANCÁRIO</span>
          </div>
          <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded-full">PREVIEW</span>
        </div>
        <p className="text-[9px] text-emerald-200 mt-1">Comprovante de Documento Fiscal</p>
      </div>

      {/* Banco */}
      <div className="p-3 border-b border-gray-300 bg-gray-50">
        <div className="flex items-center gap-2 mb-1">
          <Building2 className="w-3.5 h-3.5 text-gray-600" />
          <p className="text-[8px] text-gray-500 uppercase font-bold">Banco Emissor</p>
        </div>
        <p className="text-sm font-bold text-gray-800">{data.banco}</p>
      </div>

      {/* Valor + Vencimento */}
      <div className="grid grid-cols-2 border-b border-gray-300">
        <div className="p-3 border-r border-gray-300">
          <div className="flex items-center gap-1 mb-1">
            <DollarSign className="w-3 h-3 text-emerald-600" />
            <p className="text-[8px] text-gray-500 uppercase font-bold">Valor</p>
          </div>
          <p className="text-lg font-bold text-emerald-700">{data.valorFormatado}</p>
        </div>
        <div className="p-3">
          <div className="flex items-center gap-1 mb-1">
            <Calendar className="w-3 h-3 text-orange-500" />
            <p className="text-[8px] text-gray-500 uppercase font-bold">Vencimento</p>
          </div>
          <p className="text-sm font-bold text-gray-800">{data.vencimento}</p>
        </div>
      </div>

      {/* Linha Digitável */}
      <div className="p-3 border-b border-gray-300">
        <p className="text-[8px] text-gray-500 uppercase font-bold mb-1">Linha Digitável</p>
        <p className="text-[10px] font-mono text-gray-700 bg-gray-50 p-2 rounded border border-gray-200 break-all leading-relaxed">
          {data.linhaDigitavel}
        </p>
      </div>

      {/* Código de Barras SVG */}
      <div className="p-3 border-b border-gray-300 bg-white">
        <p className="text-[8px] text-gray-500 uppercase font-bold mb-2">Código de Barras</p>
        <div 
          id="boleto-barcode-svg"
          ref={barcodeRef} 
          className="flex justify-center items-center min-h-[40px]"
        />
      </div>

      {/* Rodapé */}
      <div className="p-2.5 bg-gray-100 text-center">
        <p className="text-[7px] text-gray-400">
          Preview gerado por VisãoAgro • Sem validade fiscal
        </p>
      </div>
    </div>
  );
});

BoletoPreview.displayName = 'BoletoPreview';
