/**
 * barcodeIntelligence.ts — Serviço de Inteligência de Código de Barras
 * 
 * Detecta, classifica e enriquece códigos de barras de NF-e e Boletos
 * - NF-e: Decodifica chave de acesso (44 dígitos) + BrasilAPI CNPJ
 * - Boleto: Parseia linha digitável (47-48 dígitos) via boleto-utils
 */

// Tabela UF IBGE
const UF_MAP: Record<string, string> = {
  '11': 'RO', '12': 'AC', '13': 'AM', '14': 'RR', '15': 'PA', '16': 'AP', '17': 'TO',
  '21': 'MA', '22': 'PI', '23': 'CE', '24': 'RN', '25': 'PB', '26': 'PE', '27': 'AL',
  '28': 'SE', '29': 'BA', '31': 'MG', '32': 'ES', '33': 'RJ', '35': 'SP',
  '41': 'PR', '42': 'SC', '43': 'RS', '50': 'MS', '51': 'MT', '52': 'GO', '53': 'DF'
};

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
}

export interface BoletoData {
  type: 'boleto_bancario' | 'boleto_convenio';
  codigoOriginal: string;
  valor: string;
  valorFormatado: string;
  vencimento: string;
  banco: string;
  linhaDigitavel: string;
}

export interface GenericData {
  type: 'generico';
  codigo: string;
}

export type ParsedBarcode = NFeData | BoletoData | GenericData;

/**
 * Detecta o tipo de código de barras pela quantidade de dígitos
 */
export function detectType(code: string): BarcodeType {
  const clean = code.replace(/\D/g, '');
  
  if (clean.length === 44) {
    // Pode ser NF-e ou código de barras de boleto bancário
    // NFe começa com código UF (11-53), boleto começa com código banco (001-999)
    const firstTwo = clean.substring(0, 2);
    if (UF_MAP[firstTwo]) {
      return 'nfe';
    }
    // Se não for UF válida, é código de barras de boleto (44 dígitos sem espaço)
    return 'boleto_bancario';
  }
  
  if (clean.length === 47) return 'boleto_bancario';
  if (clean.length === 48) return 'boleto_convenio';
  
  return 'generico';
}

/**
 * Decodifica a Chave de Acesso da NF-e (44 dígitos)
 * Posições: UF(2) + AAMM(4) + CNPJ(14) + MOD(2) + SERIE(3) + NUM(9) + ...
 */
export function parseNFeKey(code: string): NFeData {
  const clean = code.replace(/\D/g, '');
  
  const ufCode = clean.substring(0, 2);
  const anoMes = clean.substring(2, 6);
  const cnpj = clean.substring(6, 20);
  const modelo = clean.substring(20, 22);
  const serie = clean.substring(22, 25);
  const numero = clean.substring(25, 34).replace(/^0+/, '') || '0';
  
  // Formata CNPJ: 00.000.000/0000-00
  const cnpjFmt = cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
  
  // Formata chave: blocos de 4
  const chaveFmt = clean.replace(/(\d{4})(?=\d)/g, '$1 ');
  
  // Formata AAMM → MM/20AA
  const ano = `20${anoMes.substring(0, 2)}`;
  const mes = anoMes.substring(2, 4);
  
  return {
    type: 'nfe',
    chave: clean,
    chaveFormatada: chaveFmt,
    uf: ufCode,
    ufSigla: UF_MAP[ufCode] || ufCode,
    anoMes: `${mes}/${ano}`,
    cnpj: cnpj,
    cnpjFormatado: cnpjFmt,
    modelo: modelo,
    serie: serie.replace(/^0+/, '') || '1',
    numero: numero,
  };
}

/**
 * Parseia boleto (linha digitável ou código de barras)
 */
export async function parseBoleto(code: string): Promise<BoletoData> {
  const clean = code.replace(/\D/g, '');
  
  let valor = '0.00';
  let vencimento = '';
  let banco = '';
  let tipo: 'boleto_bancario' | 'boleto_convenio' = 'boleto_bancario';
  let linhaDigitavel = clean;
  
  try {
    // Tenta usar boleto-utils
    const boletoUtils = await import('@mrmgomes/boleto-utils');
    const validacao = boletoUtils.validarBoleto(clean);
    
    if (validacao) {
      if (validacao.valor) valor = String(validacao.valor);
      if (validacao.vencimento) vencimento = validacao.vencimento;
      if (validacao.linhaDigitavel) linhaDigitavel = validacao.linhaDigitavel;
      if (validacao.codigoBarras) banco = validacao.codigoBarras.substring(0, 3);
      if (validacao.tipoBoleto === 'CONVENIO') tipo = 'boleto_convenio';
    }
  } catch (err) {
    console.warn('[BarcodeIntelligence] boleto-utils fallback:', err);
    // Fallback manual para boleto bancário (47 dígitos)
    if (clean.length === 47) {
      banco = clean.substring(0, 3);
      // Valor nos últimos 10 dígitos do código de barras
      const valorRaw = clean.substring(37, 47);
      const valorNum = parseInt(valorRaw, 10) / 100;
      if (valorNum > 0) valor = valorNum.toFixed(2);
    }
  }
  
  // Formata valor
  const valorNum = parseFloat(valor);
  const valorFmt = valorNum > 0 
    ? valorNum.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) 
    : 'Não informado';
  
  // Nome do banco
  const BANCOS: Record<string, string> = {
    '001': 'Banco do Brasil', '033': 'Santander', '104': 'Caixa Econômica',
    '237': 'Bradesco', '341': 'Itaú', '356': 'Real', '389': 'Mercantil',
    '399': 'HSBC', '422': 'Safra', '453': 'Rural', '633': 'Rendimento',
    '652': 'Itaú Unibanco', '745': 'Citibank', '748': 'Sicredi', '756': 'Sicoob'
  };
  
  return {
    type: tipo,
    codigoOriginal: clean,
    valor: valor,
    valorFormatado: valorFmt,
    vencimento: vencimento || 'Não informado',
    banco: BANCOS[banco] || `Banco ${banco}`,
    linhaDigitavel: linhaDigitavel.replace(/(\d{5})(\d{5})(\d{5})(\d{6})(\d{5})(\d{6})(\d)(\d{14})/,
      '$1.$2 $3.$4 $5.$6 $7 $8'),
  };
}

/**
 * Consulta CNPJ na BrasilAPI (gratuita, sem auth)
 */
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

/**
 * Função principal: Detecta, parseia e enriquece o código escaneado
 */
export async function processBarcode(rawCode: string): Promise<ParsedBarcode> {
  const type = detectType(rawCode);
  
  switch (type) {
    case 'nfe': {
      const nfeData = parseNFeKey(rawCode);
      
      // Tenta enriquecer com BrasilAPI
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
