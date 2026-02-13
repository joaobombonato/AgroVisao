/**
 * barcodeIntelligence.ts — Serviço de Inteligência de Código de Barras
 * 
 * Detecta, classifica e enriquece códigos de barras de NF-e e Boletos.
 * - NF-e: Decodifica chave de acesso (44 dígitos) + BrasilAPI CNPJ
 * - Boleto (44 dígitos = barcode, 47 dígitos = linha digitável):
 *   Parser manual com conversão barcode↔linha digitável,
 *   banco, valor, vencimento com tratamento do reset do fator (fev/2025).
 */

// ===================== MAPAS DE REFERÊNCIA =====================

const UF_MAP: Record<string, string> = {
  '11': 'RO', '12': 'AC', '13': 'AM', '14': 'RR', '15': 'PA', '16': 'AP', '17': 'TO',
  '21': 'MA', '22': 'PI', '23': 'CE', '24': 'RN', '25': 'PB', '26': 'PE', '27': 'AL',
  '28': 'SE', '29': 'BA', '31': 'MG', '32': 'ES', '33': 'RJ', '35': 'SP',
  '41': 'PR', '42': 'SC', '43': 'RS', '50': 'MS', '51': 'MT', '52': 'GO', '53': 'DF'
};

const BANCOS: Record<string, string> = {
  '001': 'Banco do Brasil', '003': 'Banco da Amazônia', '004': 'BNB',
  '021': 'Banestes', '033': 'Santander', '041': 'Banrisul',
  '047': 'Banese', '070': 'BRB', '077': 'Inter', '084': 'Uniprime',
  '104': 'Caixa Econômica', '136': 'Unicred', '197': 'Stone',
  '208': 'BTG Pactual', '212': 'Banco Original', '218': 'BS2',
  '237': 'Bradesco', '260': 'Nu Pagamentos', '290': 'PagSeguro',
  '318': 'BMG', '336': 'C6 Bank', '341': 'Itaú', '356': 'Real',
  '389': 'Mercantil', '399': 'HSBC', '422': 'Safra', '453': 'Rural',
  '633': 'Rendimento', '652': 'Itaú Unibanco', '707': 'Daycoval',
  '739': 'Cetelem', '741': 'Ribeirão Preto', '743': 'Semear',
  '745': 'Citibank', '746': 'Modal', '748': 'Sicredi', '756': 'Sicoob',
};

// ===================== TIPOS =====================

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
  codigoBarras: string;       // sempre 44 dígitos
  linhaDigitavel: string;     // sempre 47 dígitos formatada
  valor: string;
  valorFormatado: string;
  vencimento: string;
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

// ===================== DETECÇÃO DE TIPO =====================

export function detectType(code: string): BarcodeType {
  const clean = code.replace(/\D/g, '');
  
  if (clean.length === 44) {
    // NF-e começa com UF IBGE (11-53); Boleto começa com banco (001-999)
    const firstTwo = clean.substring(0, 2);
    if (UF_MAP[firstTwo]) return 'nfe';
    return 'boleto_bancario';
  }
  
  if (clean.length === 47) return 'boleto_bancario';
  if (clean.length === 48) return 'boleto_convenio';
  
  return 'generico';
}

// ===================== NF-e =====================

export function parseNFeKey(code: string): NFeData {
  const clean = code.replace(/\D/g, '');
  
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
  };
}

// ===================== BOLETO — HELPERS =====================

/**
 * Módulo 10 (DAC dos campos da linha digitável)
 */
function mod10(block: string): number {
  let sum = 0;
  let weight = 2;
  for (let i = block.length - 1; i >= 0; i--) {
    let prod = parseInt(block[i]) * weight;
    if (prod >= 10) prod = Math.floor(prod / 10) + (prod % 10);
    sum += prod;
    weight = weight === 2 ? 1 : 2;
  }
  const remainder = sum % 10;
  return remainder === 0 ? 0 : 10 - remainder;
}

/**
 * Módulo 11 (DAC geral do código de barras)
 */
function mod11Barcode(barcode43: string): number {
  // barcode43 = posições 1-4 + 6-44 (sem o dígito verificador na pos 5)
  let sum = 0;
  let weight = 2;
  for (let i = barcode43.length - 1; i >= 0; i--) {
    sum += parseInt(barcode43[i]) * weight;
    weight = weight >= 9 ? 2 : weight + 1;
  }
  const remainder = 11 - (sum % 11);
  if (remainder === 0 || remainder === 10 || remainder === 11) return 1;
  return remainder;
}

/**
 * Converte código de barras (44 dígitos) → linha digitável (47 dígitos formatada)
 *
 * Barcode: BBB M D FFFF VVVVVVVVVV CCCCCCCCCCCCCCCCCCCCCCCCC
 *          1-3 4 5 6-9  10-19      20-44 (campo livre 25 dígitos)
 * 
 * Linha Digitável:
 *   Campo 1: BBBMC₁C₂C₃C₄C₅ .DAC₁  (banco+moeda+campo_livre[1-5]+dac)
 *   Campo 2: C₆C₇C₈C₉C₁₀C₁₁C₁₂C₁₃C₁₄C₁₅ .DAC₂
 *   Campo 3: C₁₆C₁₇C₁₈C₁₉C₂₀C₂₁C₂₂C₂₃C₂₄C₂₅ .DAC₃
 *   Campo 4: D (DAC geral, posição 5 do barcode)
 *   Campo 5: FFFF VVVVVVVVVV (fator + valor)
 */
function barcodeToLinhaDigitavel(barcode: string): string {
  const banco = barcode.substring(0, 3);   // BBB
  const moeda = barcode.substring(3, 4);   // M
  const dac = barcode.substring(4, 5);     // D (DAC geral)
  const fator = barcode.substring(5, 9);   // FFFF
  const valor = barcode.substring(9, 19);  // VVVVVVVVVV
  const campoLivre = barcode.substring(19, 44); // 25 dígitos
  
  // Campo 1: banco + moeda + campoLivre[0-4] + DAC1
  const campo1Sem = banco + moeda + campoLivre.substring(0, 5);
  const dac1 = mod10(campo1Sem);
  const campo1 = campo1Sem + dac1;
  
  // Campo 2: campoLivre[5-14] + DAC2
  const campo2Sem = campoLivre.substring(5, 15);
  const dac2 = mod10(campo2Sem);
  const campo2 = campo2Sem + dac2;
  
  // Campo 3: campoLivre[15-24] + DAC3
  const campo3Sem = campoLivre.substring(15, 25);
  const dac3 = mod10(campo3Sem);
  const campo3 = campo3Sem + dac3;
  
  // Formata: XXXXX.XXXXX XXXXX.XXXXXX XXXXX.XXXXXX X XXXXXXXXXXXXXX
  const formatted = 
    `${campo1.substring(0,5)}.${campo1.substring(5)} ` +
    `${campo2.substring(0,5)}.${campo2.substring(5)} ` +
    `${campo3.substring(0,5)}.${campo3.substring(5)} ` +
    `${dac} ` +
    `${fator}${valor}`;
  
  return formatted;
}

/**
 * Converte linha digitável (47 dígitos) → código de barras (44 dígitos)
 */
function linhaDigitavelToBarcode(linha: string): string {
  const clean = linha.replace(/\D/g, '');
  if (clean.length !== 47) return clean;
  
  // Campo 1 (10 dígitos + 1 DAC = chars 0-9, DAC em char 9)
  const banco = clean.substring(0, 3);
  const moeda = clean.substring(3, 4);
  const campoLivre1 = clean.substring(4, 9);         // 5 dígitos
  // DAC1 = clean[9] — descartado
  
  // Campo 2 (10 dígitos + 1 DAC = chars 10-20, DAC em char 20)
  const campoLivre2 = clean.substring(10, 20);       // 10 dígitos
  // DAC2 = clean[20] — descartado
  
  // Campo 3 (10 dígitos + 1 DAC = chars 21-31, DAC em char 31)
  const campoLivre3 = clean.substring(21, 31);       // 10 dígitos
  // DAC3 = clean[31] — descartado
  
  // Campo 4: DAC geral (char 32)
  const dacGeral = clean.substring(32, 33);
  
  // Campo 5: fator vencimento + valor (chars 33-46, 14 dígitos)
  const fator = clean.substring(33, 37);
  const valor = clean.substring(37, 47);
  
  // Barcode: BBB M D FFFF VVVVVVVVVV + campo livre (25)
  const campoLivre = campoLivre1 + campoLivre2 + campoLivre3;
  return banco + moeda + dacGeral + fator + valor + campoLivre;
}

/**
 * Calcula data de vencimento a partir do fator de vencimento.
 * 
 * Base original: 07/10/1997 (fator 1000)
 * RESET em 22/02/2025: fator voltou para 1000
 * 
 * Janela deslizante: se a data calculada for anterior a 2020, 
 * usa o ciclo de 2025+ (base = 22/02/2025 com fator 1000).
 */
function calcVencimento(fatorStr: string): string {
  const fator = parseInt(fatorStr, 10);
  
  if (fator === 0) return ''; // Sem vencimento
  
  // Ciclo original: base = 07/10/1997
  const baseOriginal = new Date(1997, 9, 7); // mês 0-indexed
  const dataOriginal = new Date(baseOriginal);
  dataOriginal.setDate(dataOriginal.getDate() + fator);
  
  // Se a data cair antes de 2020, é provável ciclo 2025+
  // Base do novo ciclo: 22/02/2025 = fator 10000 do ciclo antigo,
  // que resetou para 1000
  if (dataOriginal.getFullYear() < 2020) {
    // Novo ciclo: 22/02/2025 é quando fator 9999 vira 1000
    const base2025 = new Date(2025, 1, 22); // 22/fev/2025
    const data2025 = new Date(base2025);
    data2025.setDate(data2025.getDate() + (fator - 1000));
    return data2025.toLocaleDateString('pt-BR');
  }
  
  return dataOriginal.toLocaleDateString('pt-BR');
}

// ===================== BOLETO — PARSER PRINCIPAL =====================

// ===================== PARSERS DE CAMPO LIVRE =====================

/**
 * Tenta extrair Agência, Conta e Nosso Número do Campo Livre (25 dígitos)
 * Baseado nos padrões dos principais bancos.
 */
function parseCampoLivre(banco: string, campoLivre: string): Partial<BoletoData> {
  const dados: Partial<BoletoData> = {};

  try {
    switch (banco) {
      case '001': // Banco do Brasil
        // Convênio de 6 posições: CCCCCC NNNNNNNNNNNNNNNNN
        // Convênio de 7 posições: CCCCCCC NNNNNNNNNNNNNNNNN
        // Convênio de 8 posições: CCCCCCCC NNNNNNNNNNNNNNN
        // Difícil determinar sem saber qual é. Tentativa genérica:
        dados.agenciaCodigo = 'Verificar no Boleto';
        break;

      case '237': // Bradesco
        // Agência(4) Carteira(2) NossoNumero(11) Conta(7) 0
        dados.agencia = campoLivre.substring(0, 4);
        dados.conta = campoLivre.substring(17, 24);
        dados.agenciaCodigo = `${dados.agencia} / ${dados.conta}`;
        dados.nossoNumero = campoLivre.substring(6, 17);
        break;

      case '341': // Itaú
        // Carteira(3) NossoNumero(8) Agência(4) Conta(5) DAC(1)
        dados.agencia = campoLivre.substring(11, 15);
        dados.conta = campoLivre.substring(15, 20);
        dados.agenciaCodigo = `${dados.agencia} / ${dados.conta}-${campoLivre.substring(20, 21)}`;
        dados.nossoNumero = campoLivre.substring(3, 11);
        break;

      case '756': // Sicoob
        // Carteira(1) Agência(4) Modalidade(2) Cliente(7) NossoNumero(8) Parcela(3)
        // Ex: 1 3214 01 3156206 0076158 300 1
        dados.agencia = campoLivre.substring(1, 5);
        const codigoCedente = campoLivre.substring(7, 14);
        dados.conta = codigoCedente; // No Sicoob chamam de Código do Cliente
        dados.agenciaCodigo = `${dados.agencia} / ${codigoCedente}`;
        dados.nossoNumero = campoLivre.substring(14, 21); // Ajuste fino pode variar
        break;
      
      default:
        break;
    }
  } catch (e) {
    console.warn('Erro ao fazer parse do campo livre', e);
  }

  return dados;
}

export async function parseBoleto(code: string): Promise<BoletoData> {
  const clean = code.replace(/\D/g, '');
  
  let barcode44: string;
  let linhaFormatada: string;
  
  if (clean.length === 47) {
    // Entrada é linha digitável → converter para barcode
    barcode44 = linhaDigitavelToBarcode(clean);
    linhaFormatada = barcodeToLinhaDigitavel(barcode44);
  } else if (clean.length === 44) {
    // Entrada é código de barras direto
    barcode44 = clean;
    linhaFormatada = barcodeToLinhaDigitavel(clean);
  } else {
    // Fallback genérico
    return {
      type: 'boleto_bancario',
      codigoOriginal: clean,
      codigoBarras: clean,
      linhaDigitavel: clean,
      valor: '0.00',
      valorFormatado: 'Não informado',
      vencimento: 'Não informado',
      banco: '000',
      bancoNome: 'Desconhecido',
    };
  }
  
  // Extrai campos do barcode (44 dígitos)
  const bancoCode = barcode44.substring(0, 3);
  const fatorStr = barcode44.substring(5, 9);
  const valorRaw = barcode44.substring(9, 19);
  const campoLivre = barcode44.substring(19, 44);
  
  // Valor em centavos → reais
  const valorNum = parseInt(valorRaw, 10) / 100;
  const valor = valorNum > 0 ? valorNum.toFixed(2) : '0.00';
  const valorFmt = valorNum > 0
    ? valorNum.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
    : 'Não informado';
  
  // Vencimento via fator
  const vencimento = calcVencimento(fatorStr) || 'Não informado';
  
  // Nome do banco
  const bancoNome = BANCOS[bancoCode] || `Banco ${bancoCode}`;

  // Extrair campo livre (Agência, Conta)
  const extras = parseCampoLivre(bancoCode, campoLivre);
  
  return {
    type: 'boleto_bancario',
    codigoOriginal: clean,
    codigoBarras: barcode44,
    linhaDigitavel: linhaFormatada,
    valor,
    valorFormatado: valorFmt,
    vencimento,
    banco: bancoCode,
    bancoNome,
    ...extras
  };
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

export async function processBarcode(rawCode: string): Promise<ParsedBarcode> {
  const type = detectType(rawCode);
  
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
