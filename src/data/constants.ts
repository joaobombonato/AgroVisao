// data/constants.ts

export const DADOS_INICIAIS = {
  chuvas: [], energia: [], documentos: [], abastecimento: [], recomendacoes: [], refeicoes: [], compras: []
};

export const APP_VERSION = 'v1.0.1-SaaS'; 

export const ATIVOS_INICIAIS = {
  // --- Cérebro Paramétrico (Local, será migrado) ---
  parametros: {
    estoque: {
      capacidadeTanque: 15000,
      estoqueMinimo: 1000,
      ajusteManual: 0 
    },
    financeiro: {
      precoRefeicao: 18.00 
    },
    energia: {
      diaLeitura: 15,
      metaConsumo: 500,
      custoKwh: 0.92 // Valor inicial (será editável)
    },
    manutencao: {
      alertaPreventiva: 50
    }
  },
  // ---------------------------------
  // Listas locais que AINDA NÃO migraram para o banco
  safras: ['2024/2025', '2025/2026', '2026/2027'],
  culturas: ['Soja', 'Milho', 'Trigo', 'Café', 'Cana-de-açúcar'],
  classes: ['Herbicida', 'Inseticida', 'Fungicida', 'Adubo', 'Acaricida'],
  centrosCusto: ['Operacional', 'Administrativo', 'Técnico', 'Diretoria'],
  tiposDocumento: ['Nota Fiscal', 'Boleto', 'Contrato', 'Recibo', 'Outros'],
  tiposRefeicao: [
      { label: 'Básica', valor: 15.00 },
      { label: 'Executiva', valor: 25.00 },
      { label: 'Especial', valor: 35.00 }
  ],
};