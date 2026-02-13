/**
 * DanfePreview.tsx — DANFE Simplificada Visual + Campos Editáveis
 * 
 * Preview profissional da NF-e com dados extraídos do scan + campos
 * para o usuário complementar (emissão, valor, vencimentos, produtos).
 * Não tem validade fiscal — resumo visual + formulário de complemento.
 */
import { forwardRef, useState, useEffect, useCallback } from 'react';
import { FileText, Shield, ExternalLink, Plus, Trash2, Package, Calendar, DollarSign, AlertCircle } from 'lucide-react';
import type { NFeData } from '../../services/barcodeIntelligence';

interface DanfePreviewProps {
  data: NFeData;
  onDataChange?: (updatedData: NFeData & DanfeExtraFields) => void;
  productSuggestions?: string[];  // Memória de produtos já usados
}

export interface DanfeExtraFields {
  diaEmissao: string;
  valorTotal: string;
  vencimentos: string[];
  produtos: string[];
}

// Chave para memória local de produtos
const PRODUCTS_MEMORY_KEY = 'visaoagro_nfe_products_memory';

function getProductsMemory(): string[] {
  try {
    const raw = localStorage.getItem(PRODUCTS_MEMORY_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch { return []; }
}

function saveProductsMemory(products: string[]) {
  try {
    const existing = getProductsMemory();
    const all = Array.from(new Set([...existing, ...products].filter(p => p.trim().length > 1)));
    // Mantém no máximo 100 itens
    localStorage.setItem(PRODUCTS_MEMORY_KEY, JSON.stringify(all.slice(-100)));
  } catch {}
}

export const DanfePreview = forwardRef<HTMLDivElement, DanfePreviewProps>(({ data, onDataChange, productSuggestions = [] }, ref) => {
  // ========== CAMPOS EDITÁVEIS ==========
  const [diaEmissao, setDiaEmissao] = useState('');
  const [valorTotal, setValorTotal] = useState('');
  const [vencimentos, setVencimentos] = useState<string[]>(['']);
  const [produtos, setProdutos] = useState<string[]>(['']);

  // Memória local de produtos (combina com suggestions externas)
  const localMemory = getProductsMemory();
  const allSuggestions = Array.from(new Set([...productSuggestions, ...localMemory]));

  // Extrair mês/ano da chave
  const mesAno = data.anoMes; // já formatado como "MM/AAAA"
  const [mes, ano] = mesAno.split('/');
  const maxDia = mes ? new Date(parseInt(ano), parseInt(mes), 0).getDate() : 31;

  // Notificar mudanças ao parent
  const notifyChange = useCallback(() => {
    if (onDataChange) {
      onDataChange({
        ...data,
        diaEmissao,
        valorTotal,
        vencimentos: vencimentos.filter(v => v),
        produtos: produtos.filter(p => p.trim()),
      });
    }
  }, [data, diaEmissao, valorTotal, vencimentos, produtos, onDataChange]);

  useEffect(() => {
    notifyChange();
  }, [diaEmissao, valorTotal, vencimentos, produtos]);

  // Salvar memória quando produtos mudam
  useEffect(() => {
    const validProducts = produtos.filter(p => p.trim().length > 1);
    if (validProducts.length > 0) {
      saveProductsMemory(validProducts);
    }
  }, [produtos]);

  // Formatar valor em R$
  const formatCurrency = (value: string) => {
    const num = parseFloat(value.replace(/[^\d,]/g, '').replace(',', '.'));
    if (isNaN(num)) return '';
    return num.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  // Campos obrigatórios estão preenchidos?
  const isComplete = diaEmissao && valorTotal && vencimentos.some(v => v);

  return (
    <div 
      ref={ref}
      className="bg-white border-2 border-gray-800 rounded-lg overflow-hidden max-w-sm mx-auto shadow-lg"
      style={{ fontFamily: "'Inter', 'Segoe UI', sans-serif" }}
    >
      {/* ========== CABEÇALHO ========== */}
      <div className="bg-gradient-to-r from-gray-800 to-gray-900 text-white p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            <span className="font-bold text-sm tracking-wider">DANFE SIMPLIFICADA</span>
          </div>
          <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded-full">PREVIEW</span>
        </div>
        <p className="text-[9px] text-gray-300 mt-1">Documento Auxiliar da Nota Fiscal Eletrônica</p>
      </div>

      {/* ========== NÚMERO + DATA EMISSÃO ========== */}
      <div className="grid grid-cols-2 border-b border-gray-300">
        <div className="p-2.5 border-r border-gray-300 text-center">
          <p className="text-[8px] text-gray-500 uppercase font-bold">Número NF-e</p>
          <p className="text-lg font-black text-indigo-700">{data.numero}</p>
        </div>
        <div className="p-2.5">
          <p className="text-[8px] text-gray-500 uppercase font-bold flex items-center gap-1">
            <Calendar className="w-2.5 h-2.5" />
            Data Emissão <span className="text-red-500">*</span>
          </p>
          <div className="flex items-center gap-1 mt-0.5">
            <input
              type="number"
              min="1"
              max={maxDia}
              placeholder="Dia"
              value={diaEmissao}
              onChange={(e) => setDiaEmissao(e.target.value)}
              className="w-14 text-center text-sm font-bold border border-gray-300 rounded px-1 py-0.5 focus:border-indigo-400 focus:ring-1 focus:ring-indigo-200 outline-none"
            />
            <span className="text-sm font-bold text-gray-700">/ {mesAno}</span>
          </div>
        </div>
      </div>

      {/* ========== EMITENTE ========== */}
      <div className="p-3 border-b border-gray-300 bg-gray-50">
        <p className="text-[8px] text-gray-500 uppercase font-bold mb-1">Emitente</p>
        {data.emitente ? (
          <>
            <p className="text-sm font-bold text-gray-800 leading-tight">{data.emitente}</p>
            {data.fantasia && data.fantasia !== data.emitente && (
              <p className="text-[11px] text-gray-500 italic">{data.fantasia}</p>
            )}
          </>
        ) : (
          <p className="text-xs text-gray-400 italic">Consulta CNPJ indisponível</p>
        )}
        <div className="flex gap-4 mt-1.5">
          <div>
            <span className="text-[8px] text-gray-400">CNPJ</span>
            <p className="text-[11px] font-mono text-gray-700">{data.cnpjFormatado}</p>
          </div>
          {data.municipio && (
            <div>
              <span className="text-[8px] text-gray-400">Local</span>
              <p className="text-[11px] text-gray-700">{data.municipio}</p>
            </div>
          )}
        </div>
      </div>

      {/* ========== VALOR TOTAL ========== */}
      <div className="p-3 border-b border-gray-300">
        <p className="text-[8px] text-gray-500 uppercase font-bold flex items-center gap-1 mb-1">
          <DollarSign className="w-2.5 h-2.5" />
          Valor Total da NF-e <span className="text-red-500">*</span>
        </p>
        <div className="relative">
          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-sm text-gray-400 font-bold">R$</span>
          <input
            type="text"
            inputMode="decimal"
            placeholder="0,00"
            value={valorTotal}
            onChange={(e) => setValorTotal(e.target.value)}
            className="w-full pl-10 pr-3 py-2 text-lg font-bold border border-gray-300 rounded-lg focus:border-indigo-400 focus:ring-1 focus:ring-indigo-200 outline-none"
          />
        </div>
        {valorTotal && (
          <p className="text-[9px] text-gray-400 mt-0.5 text-right">{formatCurrency(valorTotal)}</p>
        )}
      </div>

      {/* ========== VENCIMENTOS ========== */}
      <div className="p-3 border-b border-gray-300 bg-amber-50/30">
        <p className="text-[8px] text-gray-500 uppercase font-bold flex items-center gap-1 mb-1.5">
          <Calendar className="w-2.5 h-2.5" />
          Vencimento(s) / Fatura <span className="text-red-500">*</span>
        </p>
        <div className="space-y-1.5">
          {vencimentos.map((v, i) => (
            <div key={i} className="flex items-center gap-1.5">
              <input
                type="date"
                value={v}
                onChange={(e) => {
                  const updated = [...vencimentos];
                  updated[i] = e.target.value;
                  setVencimentos(updated);
                }}
                className="flex-1 text-sm border border-gray-300 rounded px-2 py-1.5 focus:border-amber-400 focus:ring-1 focus:ring-amber-200 outline-none"
              />
              {vencimentos.length > 1 && (
                <button
                  type="button"
                  onClick={() => setVencimentos(vencimentos.filter((_, j) => j !== i))}
                  className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ))}
        </div>
        {vencimentos.length < 12 && (
          <button
            type="button"
            onClick={() => setVencimentos([...vencimentos, ''])}
            className="mt-1.5 text-[10px] font-bold text-amber-700 flex items-center gap-1 hover:text-amber-800"
          >
            <Plus className="w-3 h-3" /> Adicionar Parcela
          </button>
        )}
      </div>

      {/* ========== PRODUTOS (opcional) ========== */}
      <div className="p-3 border-b border-gray-300">
        <p className="text-[8px] text-gray-500 uppercase font-bold flex items-center gap-1 mb-1.5">
          <Package className="w-2.5 h-2.5" />
          Produtos / Itens <span className="text-[8px] text-gray-400 font-normal">(opcional)</span>
        </p>
        <div className="space-y-1.5">
          {produtos.map((p, i) => (
            <div key={i} className="flex items-center gap-1.5">
              <input
                type="text"
                placeholder={`Produto ${i + 1}...`}
                value={p}
                onChange={(e) => {
                  const updated = [...produtos];
                  updated[i] = e.target.value;
                  setProdutos(updated);
                }}
                list="nfe-products-suggestions"
                className="flex-1 text-sm border border-gray-300 rounded px-2 py-1.5 focus:border-indigo-400 focus:ring-1 focus:ring-indigo-200 outline-none"
              />
              {produtos.length > 1 && (
                <button
                  type="button"
                  onClick={() => setProdutos(produtos.filter((_, j) => j !== i))}
                  className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ))}
        </div>
        {/* Datalist com sugestões (memória) */}
        {allSuggestions.length > 0 && (
          <datalist id="nfe-products-suggestions">
            {allSuggestions.map(s => <option key={s} value={s} />)}
          </datalist>
        )}
        {produtos.length < 20 && (
          <button
            type="button"
            onClick={() => setProdutos([...produtos, ''])}
            className="mt-1.5 text-[10px] font-bold text-indigo-600 flex items-center gap-1 hover:text-indigo-700"
          >
            <Plus className="w-3 h-3" /> Adicionar Produto
          </button>
        )}
      </div>

      {/* ========== CHAVE DE ACESSO ========== */}
      <div className="p-3 border-b border-gray-300 bg-blue-50/50">
        <div className="flex items-center gap-1 mb-1.5">
          <Shield className="w-3 h-3 text-blue-600" />
          <p className="text-[8px] text-blue-700 uppercase font-bold">Chave de Acesso</p>
        </div>
        <p className="text-[10px] font-mono text-gray-700 leading-relaxed break-all bg-white p-2 rounded border border-blue-200">
          {data.chaveFormatada}
        </p>
      </div>

      {/* ========== STATUS DE COMPLETUDE ========== */}
      {!isComplete && (
        <div className="px-3 py-2 bg-amber-50 border-b border-amber-200 flex items-center gap-2">
          <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
          <p className="text-[9px] text-amber-700 font-medium">
            Preencha os campos obrigatórios (<span className="text-red-500">*</span>) antes de salvar
          </p>
        </div>
      )}

      {/* ========== RODAPÉ ========== */}
      <div className="p-2.5 bg-gray-100 text-center">
        <div className="flex items-center justify-center gap-1 text-[9px] text-gray-500">
          <ExternalLink className="w-3 h-3" />
          <span>Consulte: <strong>nfe.fazenda.gov.br</strong></span>
        </div>
        <p className="text-[7px] text-gray-400 mt-0.5">
          Preview gerado por VisãoAgro • Sem validade fiscal
        </p>
      </div>
    </div>
  );
});

DanfePreview.displayName = 'DanfePreview';
