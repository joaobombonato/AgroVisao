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
import { Copy, Check, Scissors, AlertCircle, Printer } from 'lucide-react';
import type { BoletoData } from '../services/barcodeIntelligence';
import { U } from '../../../utils'; // Import U

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
  isExporting?: boolean; // Se true, renderiza textos estáticos para melhor captura
}

export const BoletoPreview = forwardRef<HTMLDivElement, BoletoPreviewProps>(({ data, onDataChange, isExporting = false }, ref) => {
  const barcodeRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);

  // Estados locais para edição
  const [beneficiario, setBeneficiario] = useState(''); 
  const [pagador, setPagador] = useState('');
  const [vencimento, setVencimento] = useState(data.vencimento !== 'Não informado' ? data.vencimento : '');
  const [valor, setValor] = useState(data.valor !== '0.00' ? data.valor : '');
  const [agenciaCodigo, setAgenciaCodigo] = useState(data.agenciaCodigo || '');
  const [nossoNumero, setNossoNumero] = useState(data.nossoNumero || '');

  // Renderiza código de barras SVG
  useEffect(() => {
    const renderBarcode = async () => {
      // Requer ID para boleto.js (limitação da lib)
      const svgContainer = document.getElementById('boleto-barcode-svg');
      if (!svgContainer) return;

      try {
        const BoletoModule = await import('boleto.js');
        const Boleto = BoletoModule.default || BoletoModule;
        const boleto = new Boleto(data.codigoBarras);
        svgContainer.innerHTML = ''; // Limpa anterior
        boleto.toSVG('#boleto-barcode-svg'); 
      } catch (err) {
        console.warn('[BoletoPreview] SVG barcode fallback:', err);
        svgContainer.innerHTML = `
            <div class="bg-gray-50 p-2 text-center">
              <p class="text-[8px] text-gray-400 font-mono break-all">${data.codigoBarras}</p>
            </div>
          `;
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
  // Input com fundo amarelo suave se for manual
  const cellInput = "w-full text-[10px] text-gray-800 font-semibold bg-transparent border-none p-0 focus:ring-0 placeholder:text-gray-300 outline-none leading-tight";
  const cellBorder = "border-r border-b border-gray-300 p-1.5 relative group";
  const cellBorderLast = "border-b border-gray-300 p-1.5 relative group";
  
  // Destaque para campos manuais
  const manualHighlight = "bg-yellow-50/80 hover:bg-yellow-100 transition-colors";

  return (
    <div
      ref={ref}
      className="bg-white border-[1.5px] border-gray-900 rounded-sm overflow-hidden max-w-[800px] mx-auto shadow-none print:shadow-none print:border-black"
      style={{ fontFamily: "'Inter', sans-serif" }}
    >
      {/* ========== CABEÇALHO: BANCO | CÓDIGO | LINHA DIGITÁVEL ========== */}
      <div className="flex items-stretch border-b-2 border-gray-800 bg-white min-h-[40px]">
        {/* Logo + Nome do banco */}
        <div className="flex items-center justify-center px-4 border-r-2 border-gray-800 min-w-[110px]">
          <span className="text-sm font-black text-gray-900 leading-none">{data.bancoNome}</span>
        </div>
        {/* Código do banco */}
        <div className="flex items-center justify-center px-3 border-r-2 border-gray-800 min-w-[70px]">
          <span className="text-lg font-black text-gray-900">{data.banco}-X</span>
        </div>
        {/* Linha digitável (Direita) */}
        <div className="flex-1 flex items-center justify-end px-3">
          <span className="text-[11px] font-bold text-gray-800 text-right tracking-[1px] font-mono">
            {data.linhaDigitavel}
          </span>
        </div>
      </div>

      {/* ========== CORPO DO BOLETO ========== */}
      <div className="flex">
        {/* COLUNA ESQUERDA (GRANDE) */}
        <div className="flex-[3]">
            {/* LINHA 1: Local de Pagamento */}
            <div className={`border-b border-gray-300 border-r p-1.5 h-[34px]`}>
                <label className={cellLabel}>Local de Pagamento</label>
                <div className="text-[10px] text-gray-900 font-semibold truncate">Pagável em qualquer banco até o vencimento</div>
            </div>

            {/* LINHA 2: Beneficiário (Manual) */}
            <div className={`border-b border-gray-300 border-r p-1.5 h-[34px] ${manualHighlight} relative group`}>
                <label className={cellLabel}>Beneficiário</label>
                <input 
                    type="text" 
                    value={beneficiario}
                    onChange={e => setBeneficiario(e.target.value)}
                    placeholder="Digite o Beneficiário..."
                    className={`${cellInput} font-bold`}
                    data-html2canvas-ignore="true" // Ignora input no print se usarmos span overlay
                />
                {/* Overlay Visual para Exportação (Garante que o texto saia no print) */}
                <div className="absolute inset-0 p-1.5 pt-3.5 pointer-events-none opacity-0 group-[.printing]:opacity-100">
                    <span className="text-[10px] font-bold text-gray-900">{beneficiario}</span>
                </div>
            </div>

            {/* LINHA 3: Dados Úteis (Data Doc, Espécie, Aceite removidos/limpos) */}
            <div className="flex border-b border-gray-300 border-r h-[34px]">
                <div className="w-1/4 p-1.5 border-r border-gray-300">
                    <label className={cellLabel}>Data Doc.</label>
                    <div className="text-[10px] text-gray-500 font-mono">{U.formatDate(new Date().toISOString())}</div>
                </div>
                <div className="w-1/4 p-1.5 border-r border-gray-300">
                    <label className={cellLabel}>Nº Documento</label>
                    <div className="text-[10px] text-gray-500 font-mono">—</div>
                </div>
                 <div className="w-1/4 p-1.5 border-r border-gray-300">
                    <label className={cellLabel}>Espécie Doc.</label>
                    <div className="text-[10px] text-gray-500">DM</div>
                </div>
                <div className="w-1/4 p-1.5 border-r border-gray-300">
                    <label className={cellLabel}>Aceite</label>
                    <div className="text-[10px] text-gray-500">N</div>
                </div>
            </div>

            {/* LINHA 4: Uso Banco / Carteira / Moeda */}
            <div className="flex border-b border-gray-300 border-r h-[34px]">
                 <div className="w-1/4 p-1.5 border-r border-gray-300">
                    <label className={cellLabel}>Uso Banco</label>
                </div>
                <div className="w-1/4 p-1.5 border-r border-gray-300">
                    <label className={cellLabel}>Carteira</label>
                </div>
                 <div className="w-1/4 p-1.5 border-r border-gray-300">
                    <label className={cellLabel}>Espécie</label>
                    <div className="text-[10px] text-gray-900 font-bold">R$</div>
                </div>
                <div className="w-1/4 p-1.5">
                    <label className={cellLabel}>Quantidade</label>
                </div>
            </div>

            {/* ÁREA DE INSTRUÇÕES (Com Marca D'água) */}
            <div className="relative border-b border-gray-300 border-r h-[120px] p-2 overflow-hidden">
                <label className={cellLabel}>Instruções (Texto de Responsabilidade do Beneficiário)</label>
                
                {/* Marca D'água */}
                <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] pointer-events-none select-none overflow-hidden">
                    <div className="transform -rotate-12 text-4xl font-black text-gray-900 whitespace-nowrap">
                        VISÃO AGRO • PAGAMENTO
                    </div>
                </div>

                <div className="relative z-10 mt-2 space-y-1">
                    <p className="text-[10px] font-bold text-gray-800">
                        SR. CAIXA, NÃO RECEBER APÓS O VENCIMENTO.
                    </p>
                    <p className="text-[10px] text-gray-600">
                        Boleto gerado via App AgroVisão.
                    </p>
                    <p className="text-[10px] text-gray-600">
                        Referente a: {data.bancoNome} - {data.valorFormatado}
                    </p>
                    {beneficiario && (
                         <p className="text-[10px] text-gray-600">Beneficiário Original: {beneficiario}</p>
                    )}
                </div>
            </div>
        </div>

        {/* COLUNA DIREITA (VALORES E DATAS) */}
        <div className="flex-1 min-w-[140px]">
            {/* VENCIMENTO */}
            <div className="border-b border-gray-300 p-1.5 h-[34px] bg-red-50/30">
                <label className={cellLabel}>Vencimento</label>
                <input 
                    type="text" 
                    value={vencimento}
                    onChange={e => setVencimento(e.target.value)}
                    className={`${cellInput} text-right font-black text-[11px]`} 
                />
            </div>

            {/* AGÊNCIA / CÓDIGO */}
            <div className="border-b border-gray-300 p-1.5 h-[34px]">
                <label className={cellLabel}>Agência / Código Beneficiário</label>
                <input 
                    type="text" 
                    value={agenciaCodigo}
                    onChange={e => setAgenciaCodigo(e.target.value)}
                    className={`${cellInput} text-right`} 
                />
            </div>

            {/* NOSSO NÚMERO */}
            <div className="border-b border-gray-300 p-1.5 h-[34px]">
                <label className={cellLabel}>Nosso Número</label>
                <input 
                    type="text" 
                    value={nossoNumero}
                    onChange={e => setNossoNumero(e.target.value)}
                    className={`${cellInput} text-right`} 
                />
            </div>

             {/* (=) VALOR DOCUMENTO (PRINCIPAL) */}
             <div className="border-b border-gray-300 p-1.5 h-[34px] bg-indigo-50/30">
                <label className={cellLabel}>(=) Valor Documento</label>
                <div className="flex justify-end items-center gap-1">
                    <span className="text-[10px]">R$</span>
                    <input 
                        type="text" 
                        value={valor}
                        onChange={e => setValor(e.target.value)}
                        className={`${cellInput} text-right font-black text-[11px]`} 
                    />
                </div>
            </div>

            {/* OUTROS VALORES (Desconto, Multa, Cobrado) */}
            <div className="border-b border-gray-300 p-1.5 h-[34px]">
                <label className={cellLabel}>(-) Descontos / Abatimentos</label>
            </div>
             <div className="border-b border-gray-300 p-1.5 h-[34px]">
                <label className={cellLabel}>(+) Juros / Multa</label>
            </div>
             <div className="border-b border-gray-300 p-1.5 h-[52px] bg-gray-50 flex flex-col justify-end">
                <label className={cellLabel}>(=) Valor Cobrado</label>
                 <div className="text-right text-[11px] font-black text-gray-900">
                    {formatCurrency(valor)}
                 </div>
            </div>
        </div>
      </div>

      {/* ========== RODAPÉ: PAGADOR ========== */}
      <div className={`border-b border-gray-900 p-1.5 min-h-[50px] ${manualHighlight} relative`}>
         <label className={cellLabel}>Pagador (Sacado)</label>
         <div className="flex gap-2 items-start mt-1">
             <input 
                 type="text" 
                 value={pagador}
                 onChange={e => setPagador(e.target.value)}
                 placeholder="Nome do Pagador, CPF/CNPJ, Endereço..."
                 className={`${cellInput} font-bold h-full`}
                 data-html2canvas-ignore="true"
             />
             <div className="absolute inset-x-1.5 top-5 pointer-events-none opacity-0 group-[.printing]:opacity-100">
                <span className="text-[10px] font-bold text-gray-900">{pagador}</span>
             </div>
         </div>
      </div>
      <div className="border-b border-gray-900 p-1 text-right">
          <span className="text-[6px] font-bold text-gray-500 uppercase">Autenticação Mecânica / Ficha de Compensação</span>
      </div>

       {/* ========== CÓDIGO DE BARRAS ========== */}
       <div className="p-4 bg-white flex flex-col gap-4">
           {/* Botão Copiar (Escondido no Print/Export) */}
           <div data-html2canvas-ignore="true">
                <button
                type="button"
                onClick={handleCopy}
                className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-xs transition-all active:scale-[0.98] shadow-sm ${
                    copied 
                    ? 'bg-emerald-100 text-emerald-700' 
                    : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100'
                }`}
                >
                {copied ? (
                    <><Check className="w-4 h-4" /> Código Copiado!</>
                ) : (
                    <><Copy className="w-4 h-4" /> Copiar Linha Digitável</>
                )}
                </button>
           </div>
           
           {/* Barcode Visual */}
            <div className="flex items-center gap-4">
                <div className="flex-1 h-[60px] flex items-center justify-start overflow-hidden">
                   <div ref={barcodeRef} style={{ transform: 'scale(1.2)', transformOrigin: 'left center' }} />
                </div>
            </div>
       </div>

    </div>
  );
});

BoletoPreview.displayName = 'BoletoPreview';
