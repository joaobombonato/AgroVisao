/**
 * BoletoPreview.tsx — Preview Visual de Boleto Bancário (formato real)
 * 
 * Layout idêntico a um boleto de pagamento real.
 * O usuário pode copiar a linha digitável para pagar diretamente
 * no app do banco, ou escanear o código de barras SVG.
 */
import { forwardRef, useEffect, useRef, useState } from 'react';
import { Copy, Check, Scissors } from 'lucide-react';
import type { BoletoData } from '../../services/barcodeIntelligence';

interface BoletoPreviewProps {
  data: BoletoData;
}

export const BoletoPreview = forwardRef<HTMLDivElement, BoletoPreviewProps>(({ data }, ref) => {
  const barcodeRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const renderBarcode = async () => {
      if (!barcodeRef.current) return;
      try {
        const BoletoModule = await import('boleto.js');
        const Boleto = BoletoModule.default || BoletoModule;
        const boleto = new Boleto(data.codigoBarras);
        barcodeRef.current.innerHTML = '';
        boleto.toSVG('#boleto-barcode-svg');
      } catch (err) {
        console.warn('[BoletoPreview] SVG barcode fallback:', err);
        if (barcodeRef.current) {
          barcodeRef.current.innerHTML = `
            <div class="bg-gray-50 p-2 text-center">
              <p class="text-[8px] text-gray-400 font-mono break-all">${data.codigoBarras}</p>
            </div>
          `;
        }
      }
    };
    renderBarcode();
  }, [data.codigoBarras]);

  const handleCopy = async () => {
    const linhaLimpa = data.linhaDigitavel.replace(/\s/g, '').replace(/\./g, '');
    try {
      await navigator.clipboard.writeText(linhaLimpa);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback para dispositivos que não suportam clipboard
      const input = document.createElement('input');
      input.value = linhaLimpa;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  // Estilo de célula do boleto
  const cellLabel = "text-[7px] text-gray-500 uppercase font-bold leading-none";
  const cellValue = "text-[10px] text-gray-800 font-semibold mt-0.5 leading-tight";
  const cellBorder = "border-r border-b border-gray-300 p-1.5";
  const cellBorderLast = "border-b border-gray-300 p-1.5";

  return (
    <div
      ref={ref}
      className="bg-white border-[1.5px] border-gray-700 rounded overflow-hidden max-w-sm mx-auto shadow-lg"
      style={{ fontFamily: "'Inter', 'Courier New', monospace", fontSize: '10px' }}
    >
      {/* ========== CABEÇALHO: BANCO | CÓDIGO | LINHA DIGITÁVEL ========== */}
      <div className="flex items-stretch border-b-2 border-gray-800 bg-white">
        {/* Logo + Nome do banco */}
        <div className="flex items-center justify-center px-2.5 py-1.5 border-r-2 border-gray-800 min-w-[90px] bg-gray-50">
          <div className="text-center">
            <p className="text-xs font-black text-gray-900 leading-none">{data.bancoNome}</p>
          </div>
        </div>
        {/* Código do banco */}
        <div className="flex items-center justify-center px-2.5 border-r-2 border-gray-800">
          <p className="text-base font-black text-gray-900">{data.banco}-X</p>
        </div>
        {/* Linha digitável */}
        <div className="flex-1 flex items-center justify-center px-2 py-1">
          <p className="text-[9px] font-bold text-gray-800 text-center leading-tight break-all tracking-wide" style={{ fontFamily: "'Courier New', monospace" }}>
            {data.linhaDigitavel}
          </p>
        </div>
      </div>

      {/* ========== LINHA 1: Local de Pagamento | Vencimento ========== */}
      <div className="flex border-b border-gray-300">
        <div className={`flex-1 ${cellBorder}`}>
          <p className={cellLabel}>Local de Pagamento</p>
          <p className={cellValue}>Pagável em qualquer banco até o vencimento</p>
        </div>
        <div className="w-[100px] p-1.5 border-b border-gray-300">
          <p className={cellLabel}>Vencimento</p>
          <p className={`${cellValue} text-right font-bold text-[11px]`}>
            {data.vencimento}
          </p>
        </div>
      </div>

      {/* ========== LINHA 2: Beneficiário | Agência ========== */}
      <div className="flex border-b border-gray-300">
        <div className={`flex-1 ${cellBorder}`}>
          <p className={cellLabel}>Beneficiário</p>
          <p className={`${cellValue} text-gray-400 italic`}>—</p>
        </div>
        <div className="w-[100px] p-1.5 border-b border-gray-300">
          <p className={cellLabel}>Agência / Código</p>
          <p className={`${cellValue} text-right text-gray-400`}>—</p>
        </div>
      </div>

      {/* ========== LINHA 3: Data doc | Nº doc | Espécie | Aceite | Data proc | Nosso Nº ========== */}
      <div className="grid grid-cols-6 border-b border-gray-300">
        <div className={cellBorder}>
          <p className={cellLabel}>Data Doc.</p>
          <p className={`${cellValue} text-gray-400`}>—</p>
        </div>
        <div className={cellBorder}>
          <p className={cellLabel}>Nº Documento</p>
          <p className={`${cellValue} text-gray-400`}>—</p>
        </div>
        <div className={cellBorder}>
          <p className={cellLabel}>Espécie</p>
          <p className={cellValue}>R$</p>
        </div>
        <div className={cellBorder}>
          <p className={cellLabel}>Aceite</p>
          <p className={`${cellValue} text-gray-400`}>—</p>
        </div>
        <div className={cellBorder}>
          <p className={cellLabel}>Data Proc.</p>
          <p className={`${cellValue} text-gray-400`}>—</p>
        </div>
        <div className={cellBorderLast}>
          <p className={cellLabel}>Nosso Nº</p>
          <p className={`${cellValue} text-gray-400`}>—</p>
        </div>
      </div>

      {/* ========== LINHA 4: Uso banco | CIP | Qtde moeda | Valor | (=) Valor Doc ========== */}
      <div className="flex border-b border-gray-300">
        <div className={`w-[55px] ${cellBorder}`}>
          <p className={cellLabel}>Uso Banco</p>
          <p className={cellValue}>&nbsp;</p>
        </div>
        <div className={`w-[35px] ${cellBorder}`}>
          <p className={cellLabel}>CIP</p>
          <p className={cellValue}>&nbsp;</p>
        </div>
        <div className={`flex-1 ${cellBorder}`}>
          <p className={cellLabel}>Quantidade Moeda</p>
          <p className={cellValue}>&nbsp;</p>
        </div>
        <div className={`flex-1 ${cellBorder}`}>
          <p className={cellLabel}>Valor Moeda</p>
          <p className={cellValue}>&nbsp;</p>
        </div>
        <div className="w-[100px] p-1.5 border-b border-gray-300">
          <p className={cellLabel}>(=) Valor Documento</p>
          <p className={`text-[12px] text-gray-900 font-black mt-0.5 text-right`}>
            {data.valorFormatado}
          </p>
        </div>
      </div>

      {/* ========== INSTRUÇÕES (área grande) ========== */}
      <div className="flex border-b border-gray-300">
        <div className={`flex-1 ${cellBorder} min-h-[50px]`}>
          <p className={cellLabel}>Instruções (texto de responsabilidade do beneficiário)</p>
          <p className={`${cellValue} text-gray-400 italic mt-1`}>
            Documento gerado via VisãoAgro
          </p>
        </div>
        <div className="w-[100px] p-1.5 border-b border-gray-300 space-y-1">
          <div>
            <p className={cellLabel}>(-) Desconto</p>
            <p className={`${cellValue} text-right text-gray-400`}>&nbsp;</p>
          </div>
          <div>
            <p className={cellLabel}>(+) Juros / Multa</p>
            <p className={`${cellValue} text-right text-gray-400`}>&nbsp;</p>
          </div>
          <div>
            <p className={cellLabel}>(=) Valor Cobrado</p>
            <p className={`${cellValue} text-right font-bold`}>&nbsp;</p>
          </div>
        </div>
      </div>

      {/* ========== SACADO / PAGADOR ========== */}
      <div className="p-1.5 border-b border-gray-300">
        <p className={cellLabel}>Sacado / Pagador</p>
        <p className={`${cellValue} text-gray-400 italic`}>—</p>
      </div>

      {/* ========== AUTENTICAÇÃO ========== */}
      <div className="p-1.5 border-b border-gray-300 bg-gray-50">
        <p className={`${cellLabel} text-right`}>Autenticação Mecânica — Ficha de Compensação</p>
      </div>

      {/* ========== BOTÃO COPIAR LINHA DIGITÁVEL ========== */}
      <div className="px-3 py-2 bg-blue-50 border-b border-gray-300">
        <button
          type="button"
          onClick={handleCopy}
          className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-lg font-bold text-xs transition-all active:scale-[0.98] ${
            copied 
              ? 'bg-emerald-600 text-white' 
              : 'bg-blue-600 text-white hover:bg-blue-700'
          }`}
        >
          {copied ? (
            <><Check className="w-4 h-4" /> Linha Digitável Copiada!</>
          ) : (
            <><Copy className="w-4 h-4" /> Copiar Linha Digitável para Pagamento</>
          )}
        </button>
        <p className="text-[8px] text-blue-500 text-center mt-1">
          Cole no seu app bancário para pagar diretamente
        </p>
      </div>

      {/* ========== CORTE + CÓDIGO DE BARRAS ========== */}
      <div className="relative">
        {/* Linha de corte */}
        <div className="flex items-center gap-1 px-2 py-0.5">
          <Scissors className="w-2.5 h-2.5 text-gray-300" />
          <div className="flex-1 border-t border-dashed border-gray-300" />
        </div>
        
        {/* Código de barras SVG */}
        <div className="px-3 py-2 bg-white">
          <div 
            id="boleto-barcode-svg"
            ref={barcodeRef} 
            className="flex justify-center items-center min-h-[45px]"
          />
        </div>
      </div>

      {/* ========== RODAPÉ ========== */}
      <div className="p-1.5 bg-gray-100 text-center border-t border-gray-200">
        <p className="text-[7px] text-gray-400">
          Preview gerado por VisãoAgro • Sem validade fiscal
        </p>
      </div>
    </div>
  );
});

BoletoPreview.displayName = 'BoletoPreview';
