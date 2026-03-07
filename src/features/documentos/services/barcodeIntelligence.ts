/**
 * barcodeIntelligence.ts — Serviço de Inteligência de Código de Barras
 * 
 * Orquestrador que detecta, classifica e delega a decodificação:
 * - NF-e → nfeParser.ts
 * - Boleto → boletoParser.ts
 * - CNPJ Lookup → BrasilAPI
 */

// ===================== TIPOS (compartilhados) =====================

export type BarcodeType = 'nfe' | 'boleto_bancario' | 'boleto_convenio' | 'generico';

export interface NFeData {
  type: 'nfe';
  chave: string;
  chaveFormatada: string;
  uf: string;
  ufSigla: string;
  anoMes: string;
  cnpj: string;
  cnpjFormatado: string;
  modelo: string;
  serie: string;
  numero: string;
  emitente?: string;
  fantasia?: string;
  municipio?: string;
  dataEmissaoIso?: string;
}

export interface BoletoData {
  type: 'boleto_bancario' | 'boleto_convenio';
  codigoOriginal: string;
  codigoBarras: string;       // sempre 44 dígitos
  linhaDigitavel: string;     // sempre 47 dígitos formatada
  valor: string;
  valorFormatado: string;
  vencimento: string;
  vencimentoIso?: string;
  banco: string;
  bancoNome: string;
  agencia?: string;
  conta?: string;
  agenciaCodigo?: string;
  nossoNumero?: string;
}

export interface GenericData {
  type: 'generico';
  codigo: string;
}

export type ParsedBarcode = NFeData | BoletoData | GenericData;

// ===================== IMPORTS DOS PARSERS =====================

import { parseNFeKey, UF_MAP } from './nfeParser';
import { parseBoleto } from './boletoParser';

// Re-exporta para manter compatibilidade com quem importa daqui
export { parseNFeKey, parseBoleto };

// ===================== DETECÇÃO DE TIPO =====================

export function detectType(code: string, hint?: 'nfe' | 'boleto'): BarcodeType {
  const clean = code.replace(/\D/g, '');
  
  // Se for uma URL que contém "chNFe=", é quase certo NF-e
  if (code.includes('chNFe=')) return 'nfe';

  // Se o usuário já selecionou um modo, tentamos validar nele primeiro
  if (hint === 'nfe') {
    const match = clean.match(/\d{44}/);
    if (match) {
        const key = match[0];
        const firstTwo = key.substring(0, 2);
        const modelo = key.substring(20, 22);
        if (UF_MAP[firstTwo] && (modelo === '55' || modelo === '65')) return 'nfe';
    }
  }

  if (hint === 'boleto') {
    if (clean.length === 47 || clean.length === 48 || clean.length === 44) return 'boleto_bancario';
  }

  // Se não houver dica ou a dica falhou, tentamos detecção automática rigorosa
  
  // Detecção RIGOROSA de NF-e (44 dígitos, UF válida, Modelo 55/65)
  const nfeMatch = clean.match(/\d{44}/);
  if (nfeMatch) {
    const key = nfeMatch[0];
    const firstTwo = key.substring(0, 2);
    const modelo = key.substring(20, 22);
    const mes = parseInt(key.substring(4, 6), 10);
    
    // Se bater tudo (UF, Modelo e Mês válido 01-12), é NF-e
    if (UF_MAP[firstTwo] && (modelo === '55' || modelo === '65') && mes >= 1 && mes <= 12) {
        return 'nfe';
    }
  }

  // Boletos
  if (clean.length === 47) return 'boleto_bancario'; // Linha digitável bancária
  if (clean.length === 48) return 'boleto_convenio'; // Linha digitável convênio
  if (clean.length === 44) return 'boleto_bancario'; // Código de barras ITF
  
  return 'generico';
}

// ===================== CNPJ LOOKUP =====================

export async function lookupCNPJ(cnpj: string): Promise<{ razaoSocial: string; fantasia: string; municipio: string; uf: string } | null> {
  const clean = cnpj.replace(/\D/g, '');
  
  try {
    const response = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${clean}`);
    if (!response.ok) return null;
    
    const data = await response.json();
    return {
      razaoSocial: data.razao_social || '',
      fantasia: data.nome_fantasia || '',
      municipio: data.municipio || '',
      uf: data.uf || '',
    };
  } catch (err) {
    console.warn('[BarcodeIntelligence] CNPJ lookup failed:', err);
    return null;
  }
}

// ===================== PROCESSO PRINCIPAL =====================

export async function processBarcode(rawCode: string, hint?: 'nfe' | 'boleto'): Promise<ParsedBarcode> {
  const type = detectType(rawCode, hint);
  
  switch (type) {
    case 'nfe': {
      const nfeData = parseNFeKey(rawCode);
      
      const cnpjInfo = await lookupCNPJ(nfeData.cnpj);
      if (cnpjInfo) {
        nfeData.emitente = cnpjInfo.razaoSocial;
        nfeData.fantasia = cnpjInfo.fantasia;
        nfeData.municipio = `${cnpjInfo.municipio}/${cnpjInfo.uf}`;
      }
      
      return nfeData;
    }
    
    case 'boleto_bancario':
    case 'boleto_convenio':
      return await parseBoleto(rawCode);
    
    default:
      return { type: 'generico', codigo: rawCode };
  }
}
