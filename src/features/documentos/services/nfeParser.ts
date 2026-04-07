/**
 * nfeParser.ts — Parser de Chave de Acesso NF-e (44 dígitos)
 * 
 * Extraído de barcodeIntelligence.ts.
 * Decodifica UF, CNPJ, série, número e data a partir da chave.
 */
import type { NFeData } from './barcodeIntelligence';

// Mapa de códigos IBGE → sigla UF
const UF_MAP: Record<string, string> = {
  '11': 'RO', '12': 'AC', '13': 'AM', '14': 'RR', '15': 'PA', '16': 'AP', '17': 'TO',
  '21': 'MA', '22': 'PI', '23': 'CE', '24': 'RN', '25': 'PB', '26': 'PE', '27': 'AL',
  '28': 'SE', '29': 'BA', '31': 'MG', '32': 'ES', '33': 'RJ', '35': 'SP',
  '41': 'PR', '42': 'SC', '43': 'RS', '50': 'MS', '51': 'MT', '52': 'GO', '53': 'DF'
};

/** Exporta UF_MAP para ser usado na detecção de tipo */
export { UF_MAP };

export function parseNFeKey(code: string): NFeData {
  let clean = '';
  
  // Tenta extrair de URL (chNFe=...)
  if (code.includes('chNFe=')) {
    const match = code.match(/chNFe=(\d{44})/);
    if (match) clean = match[1];
  }
  
  // Se não achou na URL, tenta pegar qualquer sequência de 44 dígitos
  if (!clean) {
    const match = code.replace(/\D/g, '').match(/\d{44}/);
    if (match) clean = match[0];
  }

  // Fallback
  if (!clean) clean = code.replace(/\D/g, '');
  
  const ufCode = clean.substring(0, 2);
  const anoMes = clean.substring(2, 6);
  const cnpj = clean.substring(6, 20);
  const modelo = clean.substring(20, 22);
  const serie = clean.substring(22, 25);
  const numero = clean.substring(25, 34).replace(/^0+/, '') || '0';
  
  const cnpjFmt = cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
  const chaveFmt = clean.replace(/(\d{4})(?=\d)/g, '$1 ');
  const ano = `20${anoMes.substring(0, 2)}`;
  const mes = anoMes.substring(2, 4);
  
  // O código de barras da NF-e só contém mês/ano, não o dia.
  // Se o mês/ano coincidir com o atual, usa o dia de hoje como sugestão.
  // Caso contrário, mantém dia 01 (o usuário deve corrigir manualmente).
  const hoje = new Date();
  const mesAtual = String(hoje.getMonth() + 1).padStart(2, '0');
  const anoAtual = String(hoje.getFullYear());
  const diaDefault = (ano === anoAtual && mes === mesAtual) 
    ? String(hoje.getDate()).padStart(2, '0') 
    : '01';
  
  return {
    type: 'nfe',
    chave: clean,
    chaveFormatada: chaveFmt,
    uf: ufCode,
    ufSigla: UF_MAP[ufCode] || ufCode,
    anoMes: `${mes}/${ano}`,
    cnpj, cnpjFormatado: cnpjFmt,
    modelo,
    serie: serie.replace(/^0+/, '') || '1',
    numero,
    dataEmissaoIso: `${ano}-${mes}-${diaDefault}`,
  };
}
