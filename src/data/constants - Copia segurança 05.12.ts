// data/constants.ts

export const DADOS_INICIAIS = {
  chuvas: [], energia: [], documentos: [], abastecimento: [], recomendacoes: [], refeicoes: [], compras: []
};

export const ATIVOS_INICIAIS = {
  // --- NOVO: Cérebro Paramétrico ---
  parametros: {
    estoque: {
      capacidadeTanque: 15000,
      estoqueMinimo: 1000,
      ajusteManual: 0 // Caso precise corrigir saldo sem lançar compra/consumo
    },
    financeiro: {
      precoRefeicao: 18.00 // Valor padrão se não definido no tipo
    },
    energia: {
      diaLeitura: 15, // Dia do mês para alerta de leitura
      metaConsumo: 500 // kWh
    },
    manutencao: {
      alertaPreventiva: 50 // Avisar quando faltar 50h para revisão
    }
  },
  // ---------------------------------

  maquinas: ['Trator Valtra A1', 'Pulverizador Jacto', 'Colheitadeira 03', 'Caminhonete Hilux', 'Caminhão Pipa'],
  medidores: ['Medidor Sede', 'Medidor Talhão 5'],
  produtos: ['Glifosato', 'Inseticida A', 'Fungicida B', 'Adubo Foliar'],
  safras: ['2024/2025', '2025/2026', '2026/2027'],
  culturas: ['Soja', 'Milho', 'Café', 'Cana-de-açúcar', 'Trigo'],
  classes: ['Herbicida', 'Inseticida', 'Fungicida', 'Adubo', 'Acaricida'],
  centrosCusto: ['Operacional', 'Administrativo', 'Técnico', 'Diretoria'],
  tiposDocumento: ['Nota Fiscal', 'Boleto', 'Contrato', 'Recibo', 'Outros'],
  tiposRefeicao: ['Básica', 'Executiva', 'Especial'], // Simplifiquei para strings, pois o preço agora é global ou no objeto complexo
  talhoes: [ 
    { nome: 'Talhão Principal', area: '50.5' }, 
    { nome: 'Talhão Secundário', area: '30.0' },
    { nome: 'Talhão Baixada', area: '15.2' }
  ],
  talhoesChuva: [ 
    { nome: 'Sede' },
    { nome: 'Retiro' },
    { nome: 'Várzea' },
    { nome: 'Morro Alto' }
  ],
  locaisEnergia: [
    { nome: 'Sede Administrativa', medidor: 'MED-001' },
    { nome: 'Barracão Maquinário', medidor: 'MED-002' },
    { nome: 'Casa Bomba Rio', medidor: 'MED-003' }
  ]
};