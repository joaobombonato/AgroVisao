/**
 * BoletoPreview.tsx — Preview Visual de Boleto Bancário (formato real)
 * 
 * Layout idêntico a um boleto de pagamento real.
 * O usuário pode copiar a linha digitável para pagar diretamente
 * no app do banco, ou escanear o código de barras SVG.
 * 
 * AGORA COM CAMPOS EDITÁVEIS PARA DADOS NÃO EXTRAÍDOS (Beneficiário, Pagador, etc.)
 */
import { forwardRef, useEffect, useRef, useState, useCallback } from 'react';
import { Copy, Check, Scissors, AlertCircle } from 'lucide-react';
import type { BoletoData } from '../services/barcodeIntelligence';

export interface BoletoExtraFields {
  beneficiario: string;
  pagador: string;
  vencimento: string;
  valor: string;
  agenciaCodigo: string;
  nossoNumero: string;
}

interface BoletoPreviewProps {
  data: BoletoData;
  onDataChange?: (updatedData: BoletoData & BoletoExtraFields) => void;
}

export const BoletoPreview = forwardRef<HTMLDivElement, BoletoPreviewProps>(({ data, onDataChange }, ref) => {
  const barcodeRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);

  // Estados locais para edição
  const [beneficiario, setBeneficiario] = useState(''); // Inicialmente vazio, aguardando input manual ou OCR futuro
  const [pagador, setPagador] = useState('');
  const [vencimento, setVencimento] = useState(data.vencimento !== 'Não informado' ? data.vencimento : '');
  const [valor, setValor] = useState(data.valor !== '0.00' ? data.valor : '');
  const [agenciaCodigo, setAgenciaCodigo] = useState(data.agenciaCodigo || '');
  const [nossoNumero, setNossoNumero] = useState(data.nossoNumero || '');

  // Renderiza código de barras SVG
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

  // Notificar mudanças ao pai
  useEffect(() => {
    if (onDataChange) {
      onDataChange({
        ...data,
        beneficiario,
        pagador,
        vencimento,
        valor,
        agenciaCodigo,
        nossoNumero
      });
    }
  }, [beneficiario, pagador, vencimento, valor, agenciaCodigo, nossoNumero, data, onDataChange]);

  const handleCopy = async () => {
    const linhaLimpa = data.linhaDigitavel.replace(/\s/g, '').replace(/\./g, '');
    try {
      await navigator.clipboard.writeText(linhaLimpa);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback
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

  // Formata valor para exibição BRL
  const formatCurrency = (val: string) => {
    const num = parseFloat(val);
    if (isNaN(num)) return '';
    return num.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  // Estilo de célula do boleto
  const cellLabel = "text-[7px] text-gray-500 uppercase font-bold leading-none mb-0.5 block";
  const cellInput = "w-full text-[10px] text-gray-800 font-semibold bg-transparent border-none p-0 focus:ring-0 placeholder:text-gray-300 outline-none leading-tight";
  const cellBorder = "border-r border-b border-gray-300 p-1.5 relative group";
  const cellBorderLast = "border-b border-gray-300 p-1.5 relative group";

  return (
    <div
      ref={ref}
      className="bg-white border-[1.5px] border-gray-700 rounded overflow-hidden max-w-sm mx-auto shadow-lg"
      style={{ fontFamily: "'Inter', 'Courier New', sans-serif" }}
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
          <p className="text-[9px] font-bold text-gray-800 text-center leading-tight break-all tracking-wide font-mono">
            {data.linhaDigitavel}
          </p>
        </div>
      </div>

      {/* ========== LINHA 1: Local de Pagamento | Vencimento ========== */}
      <div className="flex border-b border-gray-300">
        <div className={`flex-1 ${cellBorder}`}>
          <label className={cellLabel}>Local de Pagamento</label>
          <p className="text-[10px] text-gray-800 font-semibold leading-tight">Pagável em qualquer banco até o vencimento</p>
        </div>
        <div className={`w-[100px] bg-amber-50/50 ${cellBorderLast}`}>
          <label className={cellLabel}>Vencimento <span className="text-red-500">*</span></label>
          <input 
            type="text" 
            value={vencimento}
            onChange={e => setVencimento(e.target.value)}
            placeholder="DD/MM/AAAA"
            className={`${cellInput} text-right font-bold`}
          />
        </div>
      </div>

      {/* ========== LINHA 2: Beneficiário | Agência ========== */}
      <div className="flex border-b border-gray-300">
        <div className={`flex-1 bg-gray-50/50 ${cellBorder} hover:bg-gray-100 transition-colors`}>
          <label className={cellLabel}>Beneficiário</label>
          <input 
            type="text" 
            value={beneficiario}
            onChange={e => setBeneficiario(e.target.value)}
            placeholder="Digite o Beneficiário..."
            className={cellInput}
          />
          {!beneficiario && <EditIndicator />}
        </div>
        <div className={`w-[100px] ${cellBorderLast}`}>
          <label className={cellLabel}>Agência / Código</label>
          <input 
            type="text" 
            value={agenciaCodigo}
            onChange={e => setAgenciaCodigo(e.target.value)}
            placeholder="0000 / 00000"
            className={`${cellInput} text-right`}
          />
        </div>
      </div>

      {/* ========== LINHA 3: Data doc | Nº doc | Espécie | Aceite | Data proc | Nosso Nº ========== */}
      <div className="grid grid-cols-6 border-b border-gray-300">
        <div className={cellBorder}>
          <label className={cellLabel}>Data Doc.</label>
          <input type="text" placeholder="—" className={cellInput} />
        </div>
        <div className={cellBorder}>
          <label className={cellLabel}>Nº Doc.</label>
          <input type="text" placeholder="—" className={cellInput} />
        </div>
        <div className={cellBorder}>
          <label className={cellLabel}>Espécie</label>
          <p className="text-[10px] font-semibold">R$</p>
        </div>
        <div className={cellBorder}>
          <label className={cellLabel}>Aceite</label>
          <p className="text-[10px] text-gray-400">N</p>
        </div>
        <div className={cellBorder}>
          <label className={cellLabel}>Data Proc.</label>
          <input type="text" placeholder="—" className={cellInput} />
        </div>
        <div className={cellBorderLast}>
          <label className={cellLabel}>Nosso Nº</label>
          <input 
            type="text" 
            value={nossoNumero}
            onChange={e => setNossoNumero(e.target.value)}
            placeholder="—"
            className={`${cellInput} text-right`}
          />
        </div>
      </div>

      {/* ========== LINHA 4: Uso banco | CIP | Qtde moeda | Valor | (=) Valor Doc ========== */}
      <div className="flex border-b border-gray-300">
        <div className={`w-[55px] ${cellBorder}`}>
          <label className={cellLabel}>Uso Banco</label>
        </div>
        <div className={`w-[35px] ${cellBorder}`}>
          <label className={cellLabel}>CIP</label>
        </div>
        <div className={`flex-1 ${cellBorder}`}>
          <label className={cellLabel}>Qtd Moeda</label>
        </div>
        <div className={`flex-1 ${cellBorder}`}>
          <label className={cellLabel}>Valor</label>
        </div>
        <div className={`w-[100px] bg-amber-50/50 ${cellBorderLast}`}>
          <label className={cellLabel}>(=) Valor Documento <span className="text-red-500">*</span></label>
          <div className="flex items-center justify-end">
            <span className="text-[9px] mr-1">R$</span>
            <input 
              type="number" 
              step="0.01"
              value={valor}
              onChange={e => setValor(e.target.value)}
              placeholder="0.00"
              className={`${cellInput} text-right font-black text-[11px]`}
            />
          </div>
        </div>
      </div>

      {/* ========== INSTRUÇÕES (área grande) ========== */}
      <div className="flex border-b border-gray-300">
        <div className={`flex-1 ${cellBorder} min-h-[50px]`}>
          <label className={cellLabel}>Instruções</label>
          <p className="text-[9px] text-gray-400 italic mt-1 leading-tight">
            Documento gerado automaticamente pelo VisãoAgro.
            Verifique os dados antes de efetuar o pagamento.
          </p>
        </div>
        <div className="w-[100px] p-1.5 border-b border-gray-300 space-y-1">
          <div>
            <label className={cellLabel}>(-) Desconto</label>
            <input type="text" className={`${cellInput} text-right`} placeholder="—" />
          </div>
          <div>
            <label className={cellLabel}>(+) Juros / Multa</label>
            <input type="text" className={`${cellInput} text-right`} placeholder="—" />
          </div>
          <div>
            <label className={cellLabel}>(=) Valor Cobrado</label>
            <p className="text-[10px] text-right font-bold text-gray-800">
              {valor && !isNaN(parseFloat(valor)) ? formatCurrency(valor) : '—'}
            </p>
          </div>
        </div>
      </div>

      {/* ========== SACADO / PAGADOR ========== */}
      <div className={`p-1.5 border-b border-gray-300 bg-gray-50/50 hover:bg-gray-100 transition-colors group relative`}>
        <label className={cellLabel}>Pagador (Sacado)</label>
        <div className="flex gap-2">
            <input 
                type="text" 
                value={pagador}
                onChange={e => setPagador(e.target.value)}
                placeholder="Nome do Pagador / CPF / CNPJ..."
                className={`${cellInput} text-[11px]`}
            />
            {!pagador && <EditIndicator />}
        </div>
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

// Indicador visual de campo editável
const EditIndicator = () => (
    <span className="absolute right-2 top-2 text-[9px] text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 pointer-events-none">
        <AlertCircle className="w-3 h-3" /> Digite aqui
    </span>
);

BoletoPreview.displayName = 'BoletoPreview';
