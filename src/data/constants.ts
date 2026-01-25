// data/constants.ts

// ==========================================
// CONSTANTES GLOBAIS
// ==========================================

export const APP_VERSION = 'v4.0.2'; // Versão centralizada

export const DADOS_INICIAIS = {
  chuvas: [], energia: [], documentos: [], abastecimento: [], recomendacoes: [], refeicoes: [], compras: []
};


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
  centros_custos: [],
  tiposDocumento: ['Nota Fiscal', 'Boleto', 'Contrato', 'Recibo', 'Outros'],
  tiposRefeicao: [
      { nome: 'Básica', valor: 15.00 },
      { nome: 'Executiva', valor: 25.00 },
      { nome: 'Especial', valor: 35.00 }
  ],
};

export const DEFAULT_PERMISSIONS: any = {
  Proprietário: {
    screens: {
      dashboard: true, graficos: true, config: true, os: true, refeicoes: true, 
      abastecimento: true, recomendacoes: true, estoque: true, manutencao: true, 
      docs: true, energia: true, chuvas: true, mapa: true
    },
    actions: {
      abastecimento_compra: true, estoque_compra: true, recomendacao_criar: true, 
      chuvas_registro: true, mapa_edicao: true, excluir_registros: true
    }
  },
  Gerente: {
    screens: {
      dashboard: true, graficos: true, config: false, os: true, refeicoes: true, 
      abastecimento: true, recomendacoes: true, estoque: true, manutencao: true, 
      docs: true, energia: true, chuvas: true, mapa: true
    },
    actions: {
      abastecimento_compra: true, estoque_compra: true, recomendacao_criar: true, 
      chuvas_registro: true, mapa_edicao: true, excluir_registros: false
    }
  },
  Administrativo: {
    screens: {
      dashboard: true, graficos: true, config: false, os: true, refeicoes: true, 
      abastecimento: true, recomendacoes: false, estoque: true, manutencao: false, 
      docs: true, energia: true, chuvas: true, mapa: false
    },
    actions: {
      abastecimento_compra: true, estoque_compra: true, recomendacao_criar: false, 
      chuvas_registro: true, mapa_edicao: false, excluir_registros: false
    }
  },
  Operador: {
    screens: {
      dashboard: false, graficos: false, config: false, os: true, refeicoes: true, 
      abastecimento: true, recomendacoes: true, estoque: true, manutencao: true, 
      docs: true, energia: true, chuvas: true, mapa: true
    },
    actions: {
      abastecimento_compra: false, estoque_compra: false, recomendacao_criar: false, 
      chuvas_registro: true, mapa_edicao: true, excluir_registros: false
    }
  },
  "Consultor Agrícola": {
    screens: {
      dashboard: false, graficos: true, config: false, os: true, refeicoes: false, 
      abastecimento: false, recomendacoes: true, estoque: true, manutencao: false, 
      docs: true, energia: false, chuvas: true, mapa: true
    },
    actions: {
      abastecimento_compra: false, estoque_compra: false, recomendacao_criar: true, 
      chuvas_registro: true, mapa_edicao: true, excluir_registros: false
    }
  }
};